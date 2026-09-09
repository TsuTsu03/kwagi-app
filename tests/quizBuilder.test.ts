import test from 'node:test';
import assert from 'node:assert/strict';
import { buildQuiz } from '../lib/quizBuilder.ts';

const card = (id: string, front: string, back: string, suspended = 0) => ({
  id, front, back, suspended, note_id: null, subject_id: 'subject', board: null, subject: 'Biology',
  interval: 1, ease_factor: 2.5, repetitions: 0, next_review: 0, updated_at: 0, created_at: 0,
});

test('builds questions only from active cards and retains the correct answer', () => {
  const questions = buildQuiz([
    card('1', 'Cell powerhouse', 'Mitochondrion'),
    card('2', 'Genetic material', 'DNA'),
    card('3', 'Paused card', 'Ignore me', 1),
  ], 10, () => 0.5);
  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.ok(question.choices[question.answer]);
    assert.notEqual(question.choices[question.answer], 'Ignore me');
  }
});

test('requires at least two active cards', () => {
  assert.deepEqual(buildQuiz([card('1', 'Only', 'One')], 5), []);
});

test('rejects quizzes with only one distinct answer', () => {
  assert.deepEqual(buildQuiz([card('1', 'First', ' Same '), card('2', 'Second', 'same')], 5), []);
});

test('rejects invalid session sizes', () => {
  const cards = [card('1', 'First', 'One'), card('2', 'Second', 'Two')];
  for (const count of [-1, 0, NaN, Infinity]) assert.deepEqual(buildQuiz(cards, count), []);
});

test('does not offer a duplicate answer as a wrong choice', () => {
  const questions = buildQuiz([
    card('1', 'First wording', 'Same answer'),
    card('2', 'Second wording', 'same answer'),
    card('3', 'Different fact', 'Distinct answer'),
  ], 3, () => 0.5);
  for (const question of questions) {
    const normalized = question.choices.map((choice) => choice.trim().toLocaleLowerCase());
    assert.equal(new Set(normalized).size, normalized.length);
  }
});
