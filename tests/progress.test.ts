import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateStreak, localDateKey } from '../lib/date.ts';

test('localDateKey uses the device local calendar date', () => {
  const local = new Date(2026, 6, 18, 23, 59, 59);
  assert.equal(localDateKey(local), '2026-07-18');
});

test('streak crosses month and year boundaries', () => {
  const active = new Set(['2025-12-30', '2025-12-31', '2026-01-01']);
  assert.equal(calculateStreak(active, new Date(2026, 0, 1, 8)), 3);
});

test('streak keeps yesterday active before the first study today', () => {
  const active = new Set(['2026-03-07', '2026-03-08']);
  assert.equal(calculateStreak(active, new Date(2026, 2, 9, 1, 30)), 2);
});

test('streak steps by local calendar days around DST-sensitive dates', () => {
  const active = new Set(['2026-03-07', '2026-03-08', '2026-03-09']);
  assert.equal(calculateStreak(active, new Date(2026, 2, 9, 12)), 3);
});
