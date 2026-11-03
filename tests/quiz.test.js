const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreQuiz, BASE_TYPES, TIE_ORDER } = require('../quiz.js');
const EBIKE_HINT = 'hint from content';

// Synthetic quiz: rows[q] = list of answers; an answer is a pts object, or {pts, motor, note}.
function mk(rows) {
  return rows.map((answers, qi) => ({
    q: `q${qi}`,
    answers: answers.map((a, ai) => {
      const x = a.pts ? a : { pts: a };
      return { text: `a${qi}-${ai}`, reason: `r${qi}-${ai}`, ...x };
    }),
  }));
}
const FILL = [{}, {}, {}, {}, {}];
const ALL0 = [0, 0, 0, 0, 0, 0];

test('constants', () => {
  assert.deepEqual(BASE_TYPES, ['city', 'hybrid', 'gravel', 'mtb', 'road', 'folding']);
  assert.deepEqual(TIE_ORDER, ['hybrid', 'city', 'gravel', 'road', 'mtb', 'folding']);
});

test('winner is max sum', () => {
  const r = scoreQuiz(ALL0, mk([[{ road: 3, gravel: 2 }], [{ road: 3, gravel: 2 }], [{ road: 3, gravel: 2 }], FILL, FILL, FILL]));
  assert.equal(r.complete, true);
  assert.equal(r.type, 'road');
  assert.equal(r.scores.road, 9);
  assert.equal(r.scores.gravel, 6);
  assert.equal(r.runnerUp, null);
});

test('runner-up at 75% boundary', () => {
  const r = scoreQuiz(ALL0, mk([[{ road: 3, gravel: 2 }], [{ road: 3, gravel: 2 }], [{ road: 2, gravel: 2 }], FILL, FILL, FILL]));
  assert.equal(r.type, 'road');
  assert.equal(r.runnerUp, 'gravel');
});

test('tie broken by question 3', () => {
  const r = scoreQuiz(ALL0, mk([[{ city: 3, hybrid: 2 }], [{ hybrid: 2 }], [{ city: 3, hybrid: 2 }], FILL, FILL, FILL]));
  assert.deepEqual([r.scores.city, r.scores.hybrid], [6, 6]);
  assert.equal(r.type, 'city');
});

test('tie broken by order', () => {
  const r = scoreQuiz(ALL0, mk([[{ city: 3, hybrid: 3 }], [{ city: 3, hybrid: 3 }], FILL, FILL, FILL, FILL]));
  assert.equal(r.type, 'hybrid');
  assert.equal(r.runnerUp, 'city');
});

test('motor flag', () => {
  const r = scoreQuiz([0, 0, 0, 0, 0, 1], mk([[{ city: 3 }], FILL, FILL, FILL, FILL, [{}, { pts: {}, motor: true }]]));
  assert.equal(r.motor, true);
  assert.ok(BASE_TYPES.includes(r.type));
});

test('ebike hint', () => {
  const rows = [[{ city: 3 }], FILL, FILL, FILL, FILL, FILL];
  const hint = scoreQuiz([0, 0, 0, 0, 0, 3], mk(rows), EBIKE_HINT);
  assert.equal(hint.notes.at(-1), EBIKE_HINT);
  const none = scoreQuiz([0, 1, 0, 0, 0, 3], mk(rows), EBIKE_HINT);
  assert.ok(!none.notes.includes(EBIKE_HINT));
  const withMotor = scoreQuiz([0, 0, 0, 0, 0, 3], mk([[{ pts: { city: 3 }, motor: true }], FILL, FILL, FILL, FILL, FILL]), EBIKE_HINT);
  assert.ok(!withMotor.notes.includes(EBIKE_HINT));
});

test('notes follow question order', () => {
  const r = scoreQuiz([0, 1, 0, 0, 0, 0], mk([[{ pts: { city: 3 }, note: 'n0' }], FILL, [{ pts: {}, note: 'n2' }], FILL, FILL, FILL]));
  assert.deepEqual(r.notes, ['n0', 'n2']);
});

test('reasons ordered and capped', () => {
  const r = scoreQuiz(ALL0, mk([[{ road: 1 }], [{ road: 3 }], [{ road: 2 }], [{ road: 3 }], FILL, FILL]));
  assert.deepEqual(r.reasons, ['r1-0', 'r3-0', 'r2-0']);
});

test('incomplete', () => {
  const r = scoreQuiz([0, 1, null, 0, 0, 0], mk([FILL, FILL, FILL, FILL, FILL, FILL]));
  assert.deepEqual(r, { complete: false, firstMissing: 2 });
});

test('dont-know plus motor with a tie', () => {
  const r = scoreQuiz([0, 0, 0, 0, 0, 1], mk([[{ city: 2, hybrid: 2 }], [{ city: 1, hybrid: 1 }], FILL, FILL, FILL, [{}, { pts: {}, motor: true }]]));
  assert.equal(r.type, 'hybrid');
  assert.equal(r.motor, true);
  assert.ok(r.reasons.length >= 1);
});

test('all zero falls back to hybrid', () => {
  const r = scoreQuiz(ALL0, mk([FILL, FILL, FILL, FILL, FILL, FILL]));
  assert.equal(r.type, 'hybrid');
  assert.deepEqual(r.reasons, []);
});

test('motor reason is one of at most three reasons', () => {
  const rows = [[{ road: 3 }], [{ road: 3 }], [{ road: 2 }], [{ road: 1 }], FILL, [{}, { pts: {}, motor: true, reason: 'motor' }]];
  const r = scoreQuiz([0, 0, 0, 0, 0, 1], mk(rows));
  assert.deepEqual(r.reasons, ['r0-0', 'r1-0', 'motor']);
  const few = scoreQuiz([0, 0, 0, 0, 0, 1], mk([[{ road: 3 }], FILL, FILL, FILL, FILL, [{}, { pts: {}, motor: true, reason: 'motor' }]]));
  assert.deepEqual(few.reasons, ['r0-0', 'motor']);
});

test('no hint text given, no hint note', () => {
  const r = scoreQuiz([0, 0, 0, 0, 0, 3], mk([[{ city: 3 }], FILL, FILL, FILL, FILL, FILL]));
  assert.deepEqual(r.notes, []);
});
