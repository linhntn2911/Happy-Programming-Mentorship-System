import test from 'node:test';
import assert from 'node:assert/strict';
import { filterSavedMentors } from './wishlistFilters.js';

const mentors = [
  { name: 'Thảo Linh', role: 'Frontend Developer', company: 'NashTech', specialty: 'Frontend', skills: ['React', 'TypeScript'], monthlyPrice: 1800000 },
  { name: 'Minh An', role: 'Backend Engineer', company: 'FPT', specialty: 'Backend', skills: ['Java', 'SQL Server'], monthlyPrice: 2500000 },
];

test('wishlist filters saved mentors by accent-insensitive search and skill', () => {
  assert.deepEqual(filterSavedMentors(mentors, { query: 'thao', skill: 'React' }).map(m => m.name), ['Thảo Linh']);
  assert.deepEqual(filterSavedMentors(mentors, { skill: 'Java' }).map(m => m.name), ['Minh An']);
  assert.deepEqual(filterSavedMentors(mentors, { query: 'Python' }), []);
});

test('wishlist sort changes display order without modifying saved order', () => {
  assert.deepEqual(filterSavedMentors(mentors, { sort: 'name' }).map(m => m.name), ['Minh An', 'Thảo Linh']);
  assert.deepEqual(mentors.map(m => m.name), ['Thảo Linh', 'Minh An']);
});
