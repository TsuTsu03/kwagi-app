import test from 'node:test';
import assert from 'node:assert/strict';
import { ANSWER_LABEL, inviteLine, studyLine } from '../constants/studyLines.ts';

test('reactions exist in every language and pick deterministically from a seed', () => {
  for (const language of ['taglish', 'filipino', 'english'] as const) {
    for (const kind of ['correct', 'wrong', 'streak'] as const) {
      assert.ok(studyLine(language, kind, 0).length > 0);
      assert.equal(studyLine(language, kind, 0.999), studyLine(language, kind, 0.999));
    }
    assert.ok(ANSWER_LABEL[language].endsWith(':'));
  }
});

test('the Study tab invitation matches what is ready', () => {
  assert.match(inviteLine('english', 1, 5), /1 card is ready/);
  assert.match(inviteLine('english', 12, 30), /12 cards are ready/);
  assert.match(inviteLine('english', 0, 30), /quick quiz/i);
  assert.match(inviteLine('english', 0, 1), /Add a few cards/);
  assert.match(inviteLine('taglish', 3, 10), /May 3 cards ka na due/);
  assert.match(inviteLine('filipino', 0, 0), /Magdagdag/);
});
