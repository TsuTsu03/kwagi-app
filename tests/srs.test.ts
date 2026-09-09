import test from 'node:test';
import assert from 'node:assert/strict';
import { SWIPE_QUALITY, updateSrs } from '../lib/srs.ts';

const DAY = 86_400_000;
const NOW = 1_700_000_000_000;

test('Again resets repetition while Hard remains a passing review', () => {
  const state = { interval: 6, easeFactor: 2.5, repetitions: 2 };
  assert.equal(updateSrs(state, SWIPE_QUALITY.again, NOW).repetitions, 0);
  assert.equal(updateSrs(state, SWIPE_QUALITY.hard, NOW).repetitions, 3);
});

test('first successful review schedules one day later', () => {
  const next = updateSrs({ interval: 1, easeFactor: 2.5, repetitions: 0 }, 4, NOW);
  assert.equal(next.interval, 1);
  assert.equal(next.nextReview, NOW + DAY);
});
