import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getExperienceValidationMessage,
  getLearningGoalsValidationMessage,
} from './MonthlyMentorshipApplicationPage.js';

test('learning goals validation reports how many characters are missing', () => {
  assert.equal(
    getLearningGoalsValidationMessage('Short goal'),
    'Please enter at least 50 characters. 40 more characters required.',
  );
});

test('learning goals validation clears at fifty trimmed characters', () => {
  assert.equal(getLearningGoalsValidationMessage('a'.repeat(50)), '');
  assert.equal(getLearningGoalsValidationMessage(`  ${'a'.repeat(50)}  `), '');
});

test('experience validation appears after a goal is selected', () => {
  assert.equal(
    getExperienceValidationMessage('I need mentorship for a personal project.', ''),
    'Please select your current experience level.',
  );
  assert.equal(getExperienceValidationMessage('', ''), '');
  assert.equal(getExperienceValidationMessage('Career growth', 'BEGINNER'), '');
});
