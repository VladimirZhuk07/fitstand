const test = require('node:test');
const assert = require('node:assert/strict');
const { parseRoute, backTarget, answerAllowed, ANSWER_GUARD_MS } = require('../guide.js');
const { CONTENT } = require('../content.js');

const r = h => parseRoute(h, CONTENT);

test('parseRoute: fitstand', () => {
  for (const h of ['', '#', '#junk', '#types/mtb/extra/x', '#quizzz']) assert.deepEqual(r(h), { view: 'fit' }, h);
});

test('parseRoute: quiz', () => {
  assert.deepEqual(r('#quiz/3'), { view: 'quiz', n: 3 });
  assert.deepEqual(r('#quiz/6'), { view: 'quiz', n: 6 });
  for (const h of ['#quiz', '#quiz/0', '#quiz/17', '#quiz/x']) assert.deepEqual(r(h), { view: 'quiz', n: 1 }, h);
  assert.deepEqual(r('#quiz/9'), { view: 'quiz', n: 9 });
  assert.deepEqual(r('#quiz/16'), { view: 'quiz', n: 16 });
});

test('parseRoute: result', () => assert.deepEqual(r('#result'), { view: 'result' }));

test('parseRoute: types', () => {
  assert.deepEqual(r('#types'), { view: 'types' });
  assert.deepEqual(r('#types/mtb'), { view: 'type', id: 'mtb' });
  assert.deepEqual(r('#types/ebike'), { view: 'type', id: 'ebike' });
  assert.deepEqual(r('#types/xyz'), { view: 'types' });
  assert.deepEqual(r('#types/constructor'), { view: 'types' });
});

test('parseRoute: parts', () => {
  assert.deepEqual(r('#parts'), { view: 'parts' });
  assert.deepEqual(r('#parts/brakes'), { view: 'part', id: 'brakes' });
  assert.deepEqual(r('#parts/xyz'), { view: 'parts' });
  assert.deepEqual(r('#parts/wheels'), { view: 'part', id: 'rims' });
  assert.deepEqual(r('#parts/tyres'), { view: 'part', id: 'tyres' });
  assert.deepEqual(r('#types/mountain'), { view: 'type', id: 'mountain' });
});

test('backTarget', () => {
  for (const s of [null, undefined, {}, { fs: 0 }, { fs: -1 }, { fs: 1.5 }, { fs: '2' }]) assert.deepEqual(backTarget(s), { kind: 'replace' }, JSON.stringify(s));
  assert.deepEqual(backTarget({ fs: 3 }), { kind: 'back', steps: 3 });
});

test('answer taps right after a new question are ignored (double tap)', () => {
  assert.equal(ANSWER_GUARD_MS, 350);
  assert.equal(answerAllowed(1000, 1120), false);
  assert.equal(answerAllowed(1000, 1349), false);
  assert.equal(answerAllowed(1000, 1350), true);
  assert.equal(answerAllowed(0, 5), true, 'first screen after load is not guarded');
});

test('guide texts live in content.js, not in code', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.doesNotMatch(src, /электровелосипед/i);
  assert.doesNotMatch(src, /'ebike'/);
  assert.doesNotMatch(src, /Хардтейл/i);
  const q = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'quiz.js'), 'utf8');
  assert.doesNotMatch(q, /Присмотритесь/);
});

test('parseRoute: menu', () => {
  assert.deepEqual(r('#menu'), { view: 'menu' });
  assert.deepEqual(r('#menu/x'), { view: 'fit' });
});

test('menu «Подобрать велосипед» opens the quiz or the saved result', () => {
  const { quizTarget } = require('../guide.js');
  const six = { q1: 0, q2: 1, q3: 0, q4: 2, q5: 1, q6: 4 };
  assert.equal(quizTarget(null, CONTENT), '#quiz/1');
  assert.equal(quizTarget({ v: 2, a: {} }, CONTENT), '#quiz/1');
  assert.equal(quizTarget({ v: 2, a: { q1: 0, q2: 1, q4: 2 } }, CONTENT), '#quiz/3');
  assert.equal(quizTarget({ v: 2, a: six }, CONTENT), '#quiz/7');
  assert.equal(quizTarget({ v: 2, a: { ...six, gate: ['none'] } }, CONTENT), '#result');
  assert.equal(quizTarget({ v: 2, a: { ...six, gate: ['back'], back1: [0] } }, CONTENT), '#quiz/9');
});

test('parseRoute acc', () => {
  assert.deepEqual(r('#acc'), { view: 'acc' });
  assert.deepEqual(r('#acc/helmet'), { view: 'accItem', id: 'helmet' });
  assert.deepEqual(r('#acc/xyz'), { view: 'acc' });
  assert.deepEqual(r('#acc/safety'), { view: 'accGroup', id: 'safety' });
  assert.deepEqual(r('#acc/kids'), { view: 'accGroup', id: 'kids' });
});
