import test from 'node:test';
import assert from 'node:assert/strict';
import { PayoutsView, filterPayouts } from './AdminViews.js';

test('payout admin view escapes mentor and bank fields and offers explicit transfer decisions for approved payouts', () => {
  const htmlApproved = PayoutsView([{
    id: 12, mentorId: 8, mentorName: '<img src=x onerror=alert(1)>', mentorEmail: 'mentor@example.test',
    amount: 300000, bankName: '<script>bad()</script>', accountName: 'Mentor Name',
    accountNumber: '1234567890', status: 'APPROVED', requestedAt: '2026-10-11T00:00:00Z',
  }]);
  assert.match(htmlApproved, /data-payout-paid="12"/);
  assert.match(htmlApproved, /data-payout-reject="12"/);
  assert.match(htmlApproved, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(htmlApproved, /&lt;script&gt;bad\(\)&lt;\/script&gt;/);
  assert.doesNotMatch(htmlApproved, /<img src=x/);
  assert.doesNotMatch(htmlApproved, /<script>bad/);

  const htmlRequested = PayoutsView([{
    id: 13, mentorId: 8, mentorName: 'Mentor Name', mentorEmail: 'mentor@example.test',
    amount: 300000, bankName: 'Bank', accountName: 'Mentor Name',
    accountNumber: '1234567890', status: 'REQUESTED', requestedAt: '2026-10-11T00:00:00Z',
  }]);
  assert.match(htmlRequested, /Awaiting staff review/);
  assert.doesNotMatch(htmlRequested, /data-payout-paid="13"/);
});

test('history filters status, reference and inclusive UTC request dates', () => {
  const rows = [
    {id:1,mentorName:'A',mentorEmail:'a@test',status:'PAID',transferReference:'BANK-9',requestedAt:'2026-10-01T23:59:59Z'},
    {id:2,mentorName:'B',mentorEmail:'b@test',status:'REJECTED',requestedAt:'2026-10-02T00:00:00Z'},
  ];
  assert.deepEqual(filterPayouts(rows,{status:'PAID',query:'bank-9',from:'2026-10-01',to:'2026-10-01'}),[rows[0]]);
  assert.equal(filterPayouts(rows,{status:'REQUESTED'}).length,0);
  assert.equal(filterPayouts(rows,{}).length,2);
  assert.deepEqual(filterPayouts(rows,{query:'b@test'}),[rows[1]]);
});
test('completed decisions remain visible, escaped and cannot be processed again', () => {
  const html = PayoutsView([{id:3,status:'PAID',mentorName:'Mentor',mentorEmail:'m@test',amount:20000,feeAmount:1000,netAmount:19000,accountNumber:'**** 1234',requestedAt:'2026-10-01T00:00:00Z',reviewedAt:'2026-10-02T00:00:00Z',reviewedBy:'Admin',transferReference:'<script>x</script>',rejectionReason:'<b>reason</b>'}]);
  assert.doesNotMatch(html,/data-payout-paid|data-payout-reject/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/&lt;b&gt;reason/);
  assert.match(html,/Admin/);
  assert.match(html,/Completed · read only/);
});
test('history is paginated and empty filters show feedback', () => {
  const rows = Array.from({length:25},(_,i)=>({id:i+1,status:'REQUESTED',amount:20000,requestedAt:'2026-10-01T00:00:00Z'}));
  assert.doesNotMatch(PayoutsView(rows,false,{page:1}),/data-payout-paid="25"/);
  assert.match(PayoutsView(rows,false,{status:'PAID'}),/No payouts found/);
  assert.doesNotMatch(PayoutsView(rows,true),/data-payout-paid/);
});
