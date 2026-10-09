import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatVnd,
  formatSlaRemaining,
  summarizeLearningGoals,
} from './MentorDashboardPage.js';
import { DashboardMetricCard } from './DashboardMetricCard.js';

test('formats VND earnings without losing fractional database values', () => {
  assert.match(formatVnd(1_250_000), /1,250,000/);
  assert.match(formatVnd(1_250_000.25), /1,250,000\.25/);
});

test('formats remaining SLA time against an injectable current time', () => {
  assert.equal(
    formatSlaRemaining('2026-10-07T12:30:00Z', Date.parse('2026-10-07T11:00:00Z')),
    '1h 30m remaining'
  );
  assert.equal(
    formatSlaRemaining('2026-10-07T10:59:00Z', Date.parse('2026-10-07T11:00:00Z')),
    'Expired'
  );
});

test('bounds long learning goal summaries and handles empty goals', () => {
  const longGoals = 'Learn reliable backend engineering practices. '.repeat(8);
  const summary = summarizeLearningGoals(longGoals);

  assert.equal(summary.length, 140);
  assert.ok(summary.endsWith('…'));
  assert.equal(summarizeLearningGoals(' \n\t '), 'No goals provided.');
});

test('metric card escapes text that may originate in dashboard data', () => {
  const markup = DashboardMetricCard({
    label: '<img src=x>',
    value: '1 < 2',
    description: '" onmouseover="alert(1)',
    icon: '&',
  });

  assert.ok(!markup.includes('<img src=x>'));
  assert.ok(markup.includes('&lt;img src=x&gt;'));
  assert.ok(markup.includes('1 &lt; 2'));
  assert.ok(markup.includes('&amp;'));
});
