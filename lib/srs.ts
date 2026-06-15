/**
 * SM-2 spaced-repetition algorithm.
 * quality: 0–2 = fail, 3–5 = pass (0 = blackout, 5 = perfect recall).
 */
export interface SrsState {
  interval: number; // days until next review
  easeFactor: number; // 2.5 default, floor 1.3
  repetitions: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function updateSrs(
  card: SrsState,
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): SrsState & { nextReview: number } {
  if (quality < 3) {
    return {
      repetitions: 0,
      interval: 1,
      easeFactor: card.easeFactor,
      nextReview: Date.now() + DAY_MS,
    };
  }

  const newEf = Math.max(
    1.3,
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  let interval: number;
  if (card.repetitions === 0) interval = 1;
  else if (card.repetitions === 1) interval = 6;
  else interval = Math.round(card.interval * newEf);

  return {
    interval,
    easeFactor: newEf,
    repetitions: card.repetitions + 1,
    nextReview: Date.now() + interval * DAY_MS,
  };
}

/** Map a flashcard swipe gesture to an SM-2 quality score. */
export type SwipeAction = 'again' | 'hard' | 'good' | 'easy';

export const SWIPE_QUALITY: Record<SwipeAction, 0 | 2 | 4 | 5> = {
  again: 0, // swipe left
  hard: 2, // swipe up
  good: 4, // swipe right
  easy: 5, // tap star
};
