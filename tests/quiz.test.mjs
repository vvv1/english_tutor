// Подсчёт баллов и чтение сохранённого прогресса: node --test tests/quiz.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCorrect, scoreQuiz, readSaved } from '../site/quiz.js';

test('один правильный ответ', () => {
  assert.equal(isCorrect(['b'], ['b']), true);
  assert.equal(isCorrect(['b'], ['a']), false);
  assert.equal(isCorrect(['b'], []), false, 'пустой выбор');
});

test('несколько правильных ответов — только точный набор', () => {
  assert.equal(isCorrect(['a', 'c'], ['c', 'a']), true, 'порядок выбора не важен');
  assert.equal(isCorrect(['a', 'c'], ['a']), false, 'неполный набор');
  assert.equal(isCorrect(['a', 'c'], ['a', 'c', 'd']), false, 'лишний вариант');
  assert.equal(isCorrect(['a', 'c'], ['a', 'd']), false, 'та же длина, другой набор');
});

test('итоговый балл без частичных баллов', () => {
  assert.equal(scoreQuiz([
    { correct: ['b'], chosen: ['b'] },
    { correct: ['a', 'c'], chosen: ['a', 'c'] },
    { correct: ['a', 'c'], chosen: ['a'] },
    { correct: ['d'], chosen: [] },
  ]), 2);
  assert.equal(scoreQuiz([]), 0);
});

test('сохранённый прогресс: корректные, чужие и повреждённые данные', () => {
  const ids = ['lesson-1', 'lesson-2'];
  const empty = { lessons: [], quiz: null };
  assert.deepEqual(readSaved(JSON.stringify({ lessons: ['lesson-2', 'lesson-2', 'x'], quiz: { score: 7, total: 9 } }), ids, 9),
    { lessons: ['lesson-2'], quiz: { score: 7, total: 9 } });
  for (const text of [null, '', '{', 'null', '[]', '42', '{"lessons":"lesson-1"}']) {
    assert.deepEqual(readSaved(text, ids, 9), empty, String(text));
  }
  for (const quiz of [{ score: 10, total: 9 }, { score: 3, total: 12 }, { score: 1.5, total: 9 }, { score: -1, total: 9 }]) {
    assert.equal(readSaved(JSON.stringify({ quiz }), ids, 9).quiz, null, JSON.stringify(quiz));
  }
});
