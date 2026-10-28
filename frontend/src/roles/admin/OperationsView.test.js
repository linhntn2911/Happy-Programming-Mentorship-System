import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationsView } from './OperationsView.js';
import { announcementText } from '../../shared/systemOperations.js';
test('operational form escapes announcement and labels inputs',()=>{
 const html=OperationsView({maintenance:true,announcement:'</textarea><script>bad()</script>'});
 assert.ok(!html.includes('<script>'));assert.match(html,/checked/);assert.match(html,/for="operations-reason"/);assert.match(html,/maxlength="2000"/);
});
test('system notice covers normal, maintenance and empty states',()=>{
 assert.equal(announcementText({maintenance:false,announcement:''}),'');
 assert.equal(announcementText({maintenance:false,announcement:'News'}),'News');
 assert.match(announcementText({maintenance:true,announcement:'News'}),/maintenance.*News/);
});
