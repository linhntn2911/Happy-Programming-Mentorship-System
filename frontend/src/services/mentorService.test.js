import test from 'node:test';
import assert from 'node:assert/strict';
import { mentorService } from './mentorService.js';

test('mentor profile and active-skill requests use the matching backend routes', async () => {
  const originalFetch = globalThis.fetch;
  const requestedUrls = [];
  globalThis.fetch = async url => {
    requestedUrls.push(url);
    const data = url.endsWith('/profile')
      ? { userId: 42, fullName: 'Mentor Example', skills: [] }
      : [{ id: 1, name: 'Java' }];
    return {
      ok: true,
      json: async () => ({ success: true, data }),
    };
  };

  try {
    const [profile, skills] = await Promise.all([
      mentorService.getMyProfile(),
      mentorService.getActiveSkills(),
    ]);
    assert.deepEqual(requestedUrls.sort(), [
      '/api/mentors/me/profile',
      '/api/skills?active=true',
    ]);
    assert.equal(profile.data.userId, 42);
    assert.equal(skills.data[0].name, 'Java');
    assert.equal(profile.isMock || skills.isMock, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
