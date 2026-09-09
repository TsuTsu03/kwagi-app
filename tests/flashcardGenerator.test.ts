import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFlashcards } from '../lib/flashcardGenerator.ts';

test('generates cards from supported note formats and removes duplicates', () => {
  const cards = generateFlashcards(`
Active recall :: Retrieve before checking
Spacing effect: Reviews work better over time
Q: What is interleaving?
A: Mixing related problem types
active recall :: duplicate
  `);
  assert.deepEqual(cards, [
    { front: 'Active recall', back: 'Retrieve before checking' },
    { front: 'Spacing effect', back: 'Reviews work better over time' },
    { front: 'What is interleaving?', back: 'Mixing related problem types' },
  ]);
});

test('respects the requested card limit', () => {
  assert.equal(generateFlashcards('A :: 1\nB :: 2\nC :: 3', 2).length, 2);
});
