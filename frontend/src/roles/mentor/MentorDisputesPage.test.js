import test from 'node:test';
import assert from 'node:assert/strict';
import { MentorDisputesPage, renderDisputeDetail, statusLabel, reasonLabel, resolutionLabel } from './MentorDisputesPage.js';

test('mentor disputes page renders the list shell with status filter and empty state', () => {
  const html = MentorDisputesPage();
  assert.match(html, /DISPUTE MANAGEMENT/);
  assert.match(html, /id="dispute-loading"/);
  assert.match(html, /id="dispute-error"/);
  assert.match(html, /id="dispute-retry"/);
  assert.match(html, /id="dispute-list"/);
  assert.match(html, /id="dispute-pagination"/);
  assert.match(html, /id="dispute-empty"[^>]*hidden/);
  assert.match(html, /id="dispute-detail-view"[^>]*hidden/);
  assert.match(html, /<option value="ALL">All disputes<\/option>/);
  assert.match(html, /<option value="IN_MEDIATION">In mediation<\/option>/);
});

test('mentor disputes page marks the disputes nav item as the current section', () => {
  const html = MentorDisputesPage();
  assert.match(html, /href="#\/mentor\/disputes"[^>]*aria-current="page"/);
  assert.match(html, /MENTOR WORKSPACE/);
});

test('mentor disputes page states that staff decide the outcome', () => {
  const html = MentorDisputesPage();
  assert.match(html, /HappyProgramming staff decide the outcome\./);
});

test('status and reason labels are human readable', () => {
  assert.equal(statusLabel({ status: 'SUBMITTED' }), 'Submitted');
  assert.equal(statusLabel({ status: 'IN_MEDIATION' }), 'In mediation');
  assert.equal(statusLabel({ status: 'RESOLVED', resolution: 'FULL_REFUND' }), 'Resolved – Full refund');
  assert.equal(statusLabel({ status: 'RESOLVED', resolution: 'PARTIAL_REFUND' }), 'Resolved – Partial refund');
  assert.equal(statusLabel({ status: 'RESOLVED' }), 'Resolved');
  assert.equal(statusLabel({ status: 'REJECTED' }), 'Rejected');
  assert.equal(reasonLabel('NO_SHOW'), 'Mentor no-show');
  assert.equal(reasonLabel(null), 'Other');
  assert.equal(resolutionLabel('FULL_REFUND'), 'Full refund');
});

test('open dispute detail offers a response form and never a refund or close action', () => {
  const html = renderDisputeDetail({
    id: 7, status: 'SUBMITTED', reasonCode: 'NO_SHOW', targetLabel: 'BK-1001',
    complainantName: 'Mentee A', description: 'Mentor never joined the session.',
    createdAt: '2026-11-01T02:00:00Z',
    evidence: [{ id: 31, fileName: 'screenshot.png', sizeBytes: 2048, uploadedSide: 'MENTEE' }],
    responses: [],
  });
  assert.match(html, /id="dispute-response-form"/);
  assert.match(html, /id="dispute-response-message"[^>]*maxlength="2000"/);
  assert.match(html, /id="dispute-response-files"[^>]*multiple/);
  assert.match(html, /Submit response for review/);
  assert.match(html, /you cannot approve a refund or close this dispute\./);
  assert.match(html, /screenshot\.png/);
  assert.match(html, /\/api\/mentors\/me\/disputes\/7\/evidence\/31\/file/);
  assert.doesNotMatch(html, /data-resolve/i);
  assert.doesNotMatch(html, /Approve refund/i);
  assert.doesNotMatch(html, /Close dispute/i);
});

test('closed dispute detail hides the response form and shows the staff decision', () => {
  const html = renderDisputeDetail({
    id: 9, status: 'RESOLVED', resolution: 'FULL_REFUND', reasonCode: 'QUALITY',
    targetLabel: 'BK-2002', complainantName: 'Mentee B', description: 'Sessions did not match the plan.',
    resolutionNote: 'Full refund issued after mediation.', resolvedAt: '2026-11-02T09:30:00Z',
    createdAt: '2026-10-28T09:30:00Z', evidence: [],
    responses: [{ id: 4, authorSide: 'MENTOR', message: 'I offered a make-up session.', createdAt: '2026-10-29T04:00:00Z', evidence: [] }],
  });
  assert.doesNotMatch(html, /id="dispute-response-form"/);
  assert.match(html, /This dispute is closed\. Responses are no longer accepted\./);
  assert.match(html, /Staff decision/);
  assert.match(html, /Resolved – Full refund/);
  assert.match(html, /Full refund issued after mediation\./);
  assert.match(html, />You</);
});

test('dispute detail escapes user supplied text', () => {
  const html = renderDisputeDetail({
    id: 11, status: 'SUBMITTED', reasonCode: 'OTHER', targetLabel: '<script>alert(1)</script>',
    complainantName: 'Mentee <b>C</b>', description: '<img src=x onerror=alert(1)>',
    createdAt: null, evidence: [], responses: [],
  });
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.doesNotMatch(html, /<img src=x onerror=alert\(1\)>/);
  assert.match(html, /&lt;script&gt;/);
});
