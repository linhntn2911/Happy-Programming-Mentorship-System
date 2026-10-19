import test from 'node:test';
import assert from 'node:assert/strict';
import { StaffReportsPage } from './StaffReportsPage.js';

test('Staff reports page renders metrics, table rows and escapes untrusted fields', () => {
  const html = StaffReportsPage([
    {
      id: 101,
      ticketCode: 'DSP-202610-001',
      title: '<script>alert("xss")</script>Problem with session',
      targetType: 'SESSION',
      complainantName: 'Mentee <foo>',
      complainantEmail: 'mentee@test.com',
      respondentName: 'Mentor <bar>',
      respondentEmail: 'mentor@test.com',
      category: 'NO_SHOW',
      disputedAmount: 450000,
      createdAt: '2026-10-18T10:00:00Z',
      status: 'SUBMITTED'
    },
    {
      id: 102,
      ticketCode: 'DSP-202610-002',
      title: 'Monthly mentorship dispute',
      targetType: 'MONTHLY_SUBSCRIPTION',
      complainantName: 'Alice',
      complainantEmail: 'alice@test.com',
      respondentName: 'Bob',
      respondentEmail: 'bob@test.com',
      category: 'QUALITY_MISMATCH',
      disputedAmount: 2200000,
      createdAt: '2026-10-17T10:00:00Z',
      status: 'RESOLVED'
    }
  ], {}, { name: 'Staff Officer' });

  assert.match(html, /DSP-202610-001/);
  assert.match(html, /DSP-202610-002/);
  assert.match(html, /data-review-report="101"/);
  assert.match(html, /data-review-report="102"/);
  assert.match(html, /&lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /Mentee &lt;foo&gt;/);
  assert.match(html, /Mentor &lt;bar&gt;/);
  assert.match(html, /450,000/);
  assert.match(html, /2,200,000/);
  assert.match(html, /Needs triage/);
  assert.match(html, /Resolved &amp; closed/);
});

test('Staff reports page filters by status and search query', () => {
  const sampleReports = [
    {
      id: 1,
      ticketCode: 'DSP-001',
      title: 'Mentor missed scheduled call',
      complainantName: 'John',
      complainantEmail: 'john@test.com',
      respondentName: 'David',
      respondentEmail: 'david@test.com',
      category: 'NO_SHOW',
      disputedAmount: 300000,
      status: 'SUBMITTED',
      createdAt: '2026-10-19T00:00:00Z'
    },
    {
      id: 2,
      ticketCode: 'DSP-002',
      title: 'Unresponsive communication',
      complainantName: 'Sara',
      complainantEmail: 'sara@test.com',
      respondentName: 'Mike',
      respondentEmail: 'mike@test.com',
      category: 'UNRESPONSIVE',
      disputedAmount: 500000,
      status: 'IN_MEDIATION',
      createdAt: '2026-10-18T00:00:00Z'
    }
  ];

  // Filter by status SUBMITTED
  const htmlSubmitted = StaffReportsPage(sampleReports, { status: 'SUBMITTED' }, { name: 'Staff User' });
  assert.match(htmlSubmitted, /DSP-001/);
  assert.doesNotMatch(htmlSubmitted, /DSP-002/);

  // Filter by query 'Sara'
  const htmlQuery = StaffReportsPage(sampleReports, { query: 'Sara' }, { name: 'Staff User' });
  assert.match(htmlQuery, /DSP-002/);
  assert.doesNotMatch(htmlQuery, /DSP-001/);
});

test('Staff reports page renders empty state when no disputes match criteria', () => {
  const html = StaffReportsPage([], {}, { name: 'Staff User' });
  assert.match(html, /No reports or disputes found/);
  assert.match(html, /No complaints match the selected filter criteria/);
});
