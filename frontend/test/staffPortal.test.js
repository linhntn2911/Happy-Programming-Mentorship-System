import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffService } from '../src/roles/staff/staffService.js';
import { canStaffResolveDispute, mountStaffDashboard, mountStaffApplications, mountStaffMentors, mountStaffMentees, mountStaffList, mountStaffPayouts } from '../src/roles/staff/StaffPortal.js';

test('Staff can decide only after intake and mentor response or response timeout', () => {
  const future = '2099-01-01T00:00:00Z';
  const past = '2020-01-01T00:00:00Z';

  assert.equal(canStaffResolveDispute({ status: 'SUBMITTED', mentorStatement: 'Responded', responseDeadlineAt: past }), false);
  assert.equal(canStaffResolveDispute({ status: 'IN_MEDIATION', mentorStatement: '', responseDeadlineAt: future }), false);
  assert.equal(canStaffResolveDispute({ status: 'IN_MEDIATION', mentorStatement: 'Mentor evidence', responseDeadlineAt: future }), true);
  assert.equal(canStaffResolveDispute({ status: 'IN_MEDIATION', mentorStatement: '', responseDeadlineAt: past }), true);
});

test('Staff pages render request failures as alerts, never as empty successful lists', async () => {
  const originals = { ...staffService };
  const previousDocument = globalThis.document, previousLocation = globalThis.location;
  globalThis.document = {title:''};
  const cases = [
    ['dashboard','getDashboard',mountStaffDashboard],
    ['mentor-applications','getApplications',mountStaffApplications],
    ['mentors','getMentors',mountStaffMentors],
    ['mentees','getMentees',mountStaffMentees],
    ['skills','getSkills',r=>mountStaffList(r,'skills')],
    ['requests','getRequests',r=>mountStaffList(r,'requests')],
    ['payouts','getPayoutRequests',mountStaffPayouts]
  ];
  try {
    staffService.access = async()=>({user:{name:'Staff'},permissions:['MENTOR_APPLICATION_MANAGE','MENTEE_MANAGE','MENTORSHIP_REQUEST_MANAGE','SKILL_MANAGE']});
    for (const [route,method,mount] of cases) {
      globalThis.location={hash:`#/staff/${route}`};
      staffService[method]=async()=>{throw Object.assign(new Error('Access was revoked'),{status:403});};
      const root={isConnected:true,innerHTML:'',querySelector:()=>({addEventListener(){}})};
      await mount(root);
      assert.match(root.innerHTML,/Access denied/);
      assert.match(root.innerHTML,/role="alert"/);
      assert.match(root.innerHTML,/Access was revoked/);
      assert.doesNotMatch(root.innerHTML,/No records found/);
    }
  } finally { Object.assign(staffService,originals); globalThis.document=previousDocument;globalThis.location=previousLocation; }
});
