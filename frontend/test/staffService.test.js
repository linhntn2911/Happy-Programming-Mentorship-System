import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staffService } from '../src/services/staffService.js';

test('all staff reads propagate denied and unavailable responses without sample fallbacks', async () => {
  const original=globalThis.fetch;
  try {
    for (const status of [401,403,500]) {
      globalThis.fetch=async()=>({ok:false,status,json:async()=>({message:'Denied or unavailable'})});
      for (const name of ['access','getDashboard','getMentors','getMentees','getRequests','getSkills','getApplications'])
        await assert.rejects(staffService[name](),e=>e.status===status);
    }
  } finally { globalThis.fetch=original; }
});
test('staff decisions fail closed when CSRF retrieval fails',async()=>{
  const original=globalThis.fetch; const calls=[];
  globalThis.fetch=async url=>{calls.push(url);return {ok:false,status:403,json:async()=>({message:'CSRF unavailable'})};};
  try { await assert.rejects(staffService.approveApplication(1)); assert.deepEqual(calls,['/api/auth/csrf']); }
  finally {globalThis.fetch=original;}
});
