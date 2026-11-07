import test from 'node:test';
import assert from 'node:assert/strict';
import { StaffReportsPage, disputeStatusBadge } from './StaffReportsPage.js';
import { RefundsView, filterRefunds } from '../admin/AdminViews.js';
import { validateDisputeDraft } from '../mentee/MenteeDisputesPage.js';

test('TC-SYS-DSP-01: Mentee draft validation enforces mandatory evidence, length, and terms', () => {
  // Empty draft
  assert.equal(
    validateDisputeDraft({}),
    'Select the booking or mentorship affected.'
  );

  // Missing category
  assert.equal(
    validateDisputeDraft({ target: 'ONE_OFF:10' }),
    'Select a dispute category.'
  );

  // Short description (<30 characters)
  assert.equal(
    validateDisputeDraft({ target: 'ONE_OFF:10', category: 'NO_SHOW', description: 'Too short' }),
    'Description must contain between 30 and 2,000 characters.'
  );

  // Missing evidence
  assert.equal(
    validateDisputeDraft({
      target: 'ONE_OFF:10',
      category: 'NO_SHOW',
      description: 'The mentor never showed up to the meeting and did not reply to any workspace messages.',
      evidence: []
    }),
    'Attach between 1 and 5 evidence images.'
  );

  // Invalid file type
  assert.equal(
    validateDisputeDraft({
      target: 'ONE_OFF:10',
      category: 'NO_SHOW',
      description: 'The mentor never showed up to the meeting and did not reply to any workspace messages.',
      evidence: [{ type: 'application/pdf', size: 1024 }]
    }),
    'Evidence must be PNG, JPG, or WEBP and no larger than 5 MB per image.'
  );

  // Unconfirmed terms
  assert.equal(
    validateDisputeDraft({
      target: 'ONE_OFF:10',
      category: 'NO_SHOW',
      description: 'The mentor never showed up to the meeting and did not reply to any workspace messages.',
      evidence: [{ type: 'image/png', size: 1024 }],
      termsAccepted: false
    }),
    'Confirm that your complaint and evidence are authentic.'
  );

  // Valid draft passes
  assert.equal(
    validateDisputeDraft({
      target: 'ONE_OFF:10',
      category: 'NO_SHOW',
      description: 'The mentor never showed up to the meeting and did not reply to any workspace messages.',
      evidence: [{ type: 'image/png', size: 1024 }],
      termsAccepted: true
    }),
    ''
  );
});

test('TC-SYS-DSP-02: Branch 1 - Fast-track Direct Refund (SUBMITTED -> Staff APPROVED -> Admin RESOLVED)', () => {
  const baseTicket = {
    id: 301,
    ticketCode: 'HP-DSP-202611-0101',
    title: 'Full-stack System Architecture Review',
    targetType: 'ONE_OFF',
    targetId: 88,
    complainantName: 'Le Van Mentee',
    complainantEmail: 'mentee.le@example.test',
    respondentName: 'Pham Van Mentor',
    respondentEmail: 'mentor.pham@example.test',
    category: 'NO_SHOW',
    description: 'Mentor was absent throughout the scheduled hour. Link was invalid.',
    disputedAmount: 750000,
    status: 'SUBMITTED',
    createdAt: '2026-11-07T08:00:00Z',
    bankName: 'Techcombank',
    accountNumber: '190283746501',
    accountName: 'LE VAN MENTEE',
    evidence: [{ id: 10, fileName: 'session_call_error.png', fileSize: '850 KB', uploadedAt: '2026-11-07T08:05:00Z' }]
  };

  // 1. Staff sees SUBMITTED ticket in queue
  let staffHtml = StaffReportsPage([baseTicket], { status: 'ALL' }, { name: 'Staff Examiner' });
  assert.match(staffHtml, /HP-DSP-202611-0101/);
  assert.match(staffHtml, /Le Van Mentee/);
  assert.match(staffHtml, /750,000/);
  assert.match(staffHtml, /submitted/);

  // 2. Staff Fast-tracks directly to APPROVED without opening mediation room
  const approvedTicket = {
    ...baseTicket,
    status: 'APPROVED',
    resolutionType: 'FULL_REFUND',
    resolutionNote: 'Direct verification confirmed mentor was completely absent. Approved 100% refund.',
    refundAmount: 750000,
    approvedBy: 50,
    approvedByName: 'Staff Examiner',
    approvedAt: '2026-11-07T09:00:00Z'
  };

  staffHtml = StaffReportsPage([approvedTicket], { status: 'APPROVED' }, { name: 'Staff Examiner' });
  assert.match(staffHtml, /HP-DSP-202611-0101/);
  assert.match(staffHtml, /approved/);

  // 3. Admin sees the APPROVED refund in the Admin Mentee Refunds view
  let adminHtml = RefundsView([approvedTicket], false, {});
  assert.match(adminHtml, /HP-DSP-202611-0101/);
  assert.match(adminHtml, /750,000/);
  assert.match(adminHtml, /Techcombank/);
  assert.match(adminHtml, /190283746501/);
  assert.match(adminHtml, /Staff Examiner/);
  assert.match(adminHtml, /data-refund-paid="301"/, 'Admin has Record transfer button');

  // 4. Admin executes transfer outside and confirms payment with reference -> RESOLVED
  const resolvedTicket = {
    ...approvedTicket,
    status: 'RESOLVED',
    transferReference: 'TCB-REF-99882233',
    resolvedByName: 'Admin Treasurer',
    resolvedAt: '2026-11-07T10:15:00Z'
  };

  adminHtml = RefundsView([resolvedTicket], false, {});
  assert.match(adminHtml, /TCB-REF-99882233/);
  assert.match(adminHtml, /Completed · read only/, 'Admin cannot re-process resolved refund');
});

test('TC-SYS-DSP-03 & 04: Branch 2 - Mediation Room Lifecycle (SUBMITTED -> IN_MEDIATION -> Staff APPROVED -> Admin RESOLVED)', () => {
  const dispute = {
    id: 302,
    ticketCode: 'HP-DSP-202611-0102',
    title: 'Spring Cloud Microservices Mentorship',
    targetType: 'MONTHLY',
    targetId: 12,
    complainantName: 'Hoang Thi Mentee',
    complainantEmail: 'mentee.hoang@example.test',
    respondentName: 'Do Van Mentor',
    respondentEmail: 'mentor.do@example.test',
    category: 'QUALITY_MISMATCH',
    description: 'Mentor only provided basic Java concepts instead of agreed Spring Cloud topics.',
    disputedAmount: 1200000,
    status: 'SUBMITTED',
    createdAt: '2026-11-07T11:00:00Z',
    bankName: 'MB Bank',
    accountNumber: '0987654321',
    accountName: 'HOANG THI MENTEE'
  };

  // Step 1: Staff opens 3-party mediation room
  const inMediationDispute = {
    ...dispute,
    status: 'IN_MEDIATION',
    assignedStaffId: 50,
    assignedStaffName: 'Staff Arbitrator',
    responseDeadlineAt: '2026-11-08T11:00:00Z'
  };

  let staffHtml = StaffReportsPage([inMediationDispute], { status: 'IN_MEDIATION' }, { name: 'Staff Arbitrator' });
  assert.match(staffHtml, /HP-DSP-202611-0102/);
  assert.match(staffHtml, /in mediation/);

  // Step 2: Mentee & Mentor negotiate. Staff agrees on a PARTIAL_REFUND (600,000 VND)
  const mediatedApproval = {
    ...inMediationDispute,
    status: 'APPROVED',
    resolutionType: 'PARTIAL_REFUND',
    resolutionNote: 'Parties agreed to 50% partial refund for completed intro lectures. Remaining 50% released to mentor.',
    refundAmount: 600000,
    approvedBy: 50,
    approvedByName: 'Staff Arbitrator',
    approvedAt: '2026-11-07T15:00:00Z'
  };

  staffHtml = StaffReportsPage([mediatedApproval], { status: 'APPROVED' }, { name: 'Staff Arbitrator' });
  assert.match(staffHtml, /HP-DSP-202611-0102/);

  // Step 3: Admin settles partial refund
  const settledDispute = {
    ...mediatedApproval,
    status: 'RESOLVED',
    transferReference: 'MB-PARTIAL-443322',
    resolvedByName: 'Admin Treasurer',
    resolvedAt: '2026-11-07T16:00:00Z'
  };

  const adminHtml = RefundsView([settledDispute], false, {});
  assert.match(adminHtml, /600,000/);
  assert.match(adminHtml, /MB-PARTIAL-443322/);
  assert.match(adminHtml, /Completed · read only/);
});

test('TC-SYS-DSP-05: Staff Rejection after mediation (IN_MEDIATION -> REJECTED)', () => {
  const rejectedDispute = {
    id: 303,
    ticketCode: 'HP-DSP-202611-0103',
    title: 'One-off React Debug Session',
    targetType: 'ONE_OFF',
    targetId: 44,
    complainantName: 'Nguyen Mentee',
    complainantEmail: 'mentee.nguyen@example.test',
    respondentName: 'Vu Mentor',
    respondentEmail: 'mentor.vu@example.test',
    category: 'NO_SHOW',
    description: 'Claimed mentor did not show up.',
    disputedAmount: 400000,
    status: 'REJECTED',
    resolutionType: 'REJECTED',
    resolutionNote: 'Mentor provided timestamped video call attendance logs proving mentee arrived 50 mins late. Claim dismissed.',
    refundAmount: 0,
    resolvedBy: 'Staff Arbitrator',
    resolvedAt: '2026-11-07T14:00:00Z'
  };

  const staffHtml = StaffReportsPage([rejectedDispute], { status: 'REJECTED' }, { name: 'Staff Arbitrator' });
  assert.match(staffHtml, /HP-DSP-202611-0103/);
  assert.match(staffHtml, /rejected/);
});

test('TC-SYS-DSP-06: Admin Rejection of an Approved Refund', () => {
  const adminRejected = {
    id: 304,
    ticketCode: 'HP-DSP-202611-0104',
    title: 'Vue Architecture Mentorship',
    targetType: 'ONE_OFF',
    targetId: 65,
    complainantName: 'Tran Mentee',
    complainantEmail: 'mentee.tran@example.test',
    respondentName: 'Dao Mentor',
    respondentEmail: 'mentor.dao@example.test',
    category: 'TECHNICAL_FAILURE',
    disputedAmount: 500000,
    refundAmount: 500000,
    bankName: 'FakeBank',
    accountNumber: '000000000',
    accountName: 'UNKNOWN',
    status: 'REJECTED',
    resolutionNote: 'Bank account details are fictitious and could not be verified by banking switch.',
    createdAt: '2026-11-07T10:00:00Z',
    approvedAt: '2026-11-07T11:00:00Z'
  };

  const adminHtml = RefundsView([adminRejected], false, {});
  assert.match(adminHtml, /HP-DSP-202611-0104/);
  assert.match(adminHtml, /Completed · read only/);
});

test('TC-SYS-DSP-07: Admin Refunds filters by status, query, and date', () => {
  const refunds = [
    { ticketCode: 'HP-DSP-01', complainantName: 'Alice', respondentName: 'Bob', status: 'APPROVED', approvedAt: '2026-11-05T10:00:00Z' },
    { ticketCode: 'HP-DSP-02', complainantName: 'Charlie', respondentName: 'David', status: 'RESOLVED', transferReference: 'REF99', approvedAt: '2026-11-06T10:00:00Z' },
    { ticketCode: 'HP-DSP-03', complainantName: 'Eve', respondentName: 'Frank', status: 'REJECTED', approvedAt: '2026-11-07T10:00:00Z' }
  ];

  assert.equal(filterRefunds(refunds, { status: 'APPROVED' }).length, 1);
  assert.equal(filterRefunds(refunds, { query: 'Alice' }).length, 1);
  assert.equal(filterRefunds(refunds, { query: 'REF99' }).length, 1);
  assert.equal(filterRefunds(refunds, { from: '2026-11-06' }).length, 2);
  assert.equal(filterRefunds(refunds, { to: '2026-11-05' }).length, 1);
});
