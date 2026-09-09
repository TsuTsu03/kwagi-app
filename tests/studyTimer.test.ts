import test from 'node:test';
import assert from 'node:assert/strict';
import { StudyTimer } from '../lib/studyTimer.ts';

test('counts first-question thinking time and excludes background intervals', () => {
  const timer = new StudyTimer();
  timer.resume(1000);
  assert.equal(timer.elapsed(6000), 5000);
  timer.pause(6000);
  assert.equal(timer.elapsed(60000), 5000);
  timer.resume(60000);
  timer.resume(61000);
  assert.equal(timer.elapsed(62000), 7000);
  timer.pause(62000);
  timer.pause(70000);
  assert.equal(timer.elapsed(70000), 7000);
});
