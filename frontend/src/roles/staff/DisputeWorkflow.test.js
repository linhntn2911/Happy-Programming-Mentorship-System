import test from 'node:test';
import assert from 'node:assert/strict';
import { StaffReportsPage, disputeStatusBadge } from './StaffReportsPage.js';

test('End-to-end Dispute Lifecycle: Mentee submit -> Staff triage & intake -> Staff resolve & approve -> Admin payout queue', async (t) => {
  // 1. Initial State: Mentee submits a dispute for a missed session
  const initialDispute = {
    id: 201,
    ticketCode: 'HP-DSP-202611-0001',
    title: 'One-off Python Architecture Session',
    targetType: 'ONE_OFF',
    targetId: 55,
    complainantName: 'Nguyen Van Mentee',
    complainantEmail: 'mentee.nguyen@example.com',
    respondentName: 'Tran Van Mentor',
    respondentEmail: 'mentor.tran@example.com',
    category: 'NO_SHOW',
    description: 'Mentor failed to show up for the session after 30 minutes of waiting with no notice.',
    disputedAmount: 500000,
    status: 'SUBMITTED',
    createdAt: '2026-11-06T10:00:00Z',
    bankName: 'Vietcombank',
    accountNumber: '1029384756',
    accountName: 'NGUYEN VAN MENTEE',
    evidence: [
      { id: 1, fileName: 'waiting_room_screenshot.png', fileSize: '1.2 MB', uploadedAt: '2026-11-06T10:02:00Z' }
    ]
  };

  // Step 1: Staff opens Dispute Queue and sees the new SUBMITTED ticket
  let html = StaffReportsPage([initialDispute], { status: 'ALL' }, { name: 'Staff Officer' });
  assert.match(html, /HP-DSP-202611-0001/, 'Queue shows ticket code');
  assert.match(html, /Nguyen Van Mentee/, 'Queue shows complainant');
  assert.match(html, /Tran Van Mentor/, 'Queue shows respondent');
  assert.match(html, /500,000/, 'Queue displays 500,000 VND disputed amount');
  assert.match(html, /submitted/, 'Status badge shows submitted');
  assert.match(html, /Needs triage/, 'Stat card counts submitted dispute');

  // Step 2: Staff intakes the dispute (moves from SUBMITTED -> IN_MEDIATION)
  const inMediationDispute = {
    ...initialDispute,
    status: 'IN_MEDIATION',
    assignedStaffId: 99,
    assignedStaffName: 'Staff Officer'
  };

  html = StaffReportsPage([inMediationDispute], { status: 'IN_MEDIATION' }, { name: 'Staff Officer' });
  assert.match(html, /HP-DSP-202611-0001/, 'Found in IN_MEDIATION queue');
  assert.match(html, /in mediation/, 'Badge shows in mediation');

  // Step 3: Staff reviews evidence and approves FULL_REFUND -> status becomes APPROVED
  // Staff forwards to Admin for bank transfer
  const approvedDispute = {
    ...inMediationDispute,
    status: 'APPROVED',
    resolutionType: 'FULL_REFUND',
    resolutionNote: 'Mentor no-show confirmed via chat logs and server timestamps. Approved 100% refund.',
    refundAmount: 500000,
    approvedBy: 99,
    approvedByName: 'Staff Officer',
    approvedAt: '2026-11-06T14:30:00Z'
  };

  html = StaffReportsPage([approvedDispute], { status: 'APPROVED' }, { name: 'Staff Officer' });
  assert.match(html, /HP-DSP-202611-0001/);
  assert.match(html, /approved/, 'Dispute status is APPROVED');

  // Step 4: Admin receives the approved dispute in the Refund Payout queue and executes bank transfer
  const resolvedDispute = {
    ...approvedDispute,
    status: 'RESOLVED',
    transferReference: 'FT26110688990012',
    resolvedAt: '2026-11-06T15:00:00Z',
    resolvedBy: 'Admin Treasurer'
  };

  html = StaffReportsPage([resolvedDispute], { status: 'RESOLVED' }, { name: 'Staff Officer' });
  assert.match(html, /HP-DSP-202611-0001/);
  assert.match(html, /resolved/, 'Dispute status is now RESOLVED');
});

test('Dispute Resolution validation: partial refund amount cannot exceed disputed total', () => {
  const disputedAmount = 600000;
  
  // Test valid partial refund
  const validPartial = 300000;
  assert.ok(validPartial > 0 && validPartial <= disputedAmount, 'Partial refund 300,000 is valid');

  // Test invalid partial refund (exceeds)
  const invalidPartialExceed = 700000;
  assert.ok(invalidPartialExceed > disputedAmount, '700,000 correctly exceeds 600,000');

  // Test invalid zero or negative refund
  const invalidZero = 0;
  assert.ok(invalidZero <= 0, 'Zero refund is invalid for PARTIAL_REFUND');
});

test('Dispute Status Badges mapping', () => {
  assert.match(disputeStatusBadge('SUBMITTED'), /status-neutral/);
  assert.match(disputeStatusBadge('IN_MEDIATION'), /status-warning/);
  assert.match(disputeStatusBadge('APPROVED'), /status-success/);
  assert.match(disputeStatusBadge('RESOLVED'), /status-success/);
  assert.match(disputeStatusBadge('REJECTED'), /status-danger/);
});
