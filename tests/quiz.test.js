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

// ---------- health flow (Task 2) ----------
const { CONTENT: REAL } = require('../content.js');
const Q = require('../quiz.js');
const SIX = { q1: 0, q2: 1, q3: 0, q4: 1, q5: 1, q6: 1 };
const ids = steps => steps.map(s => (s.kind === 'q' ? s.id : `explain:${s.block}`));

test('flow without injuries', () => {
  const f = Q.quizFlow({ ...SIX, gate: ['none'] }, REAL);
  assert.deepEqual(ids(f), ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'gate']);
});

test('flow with back', () => {
  const f = Q.quizFlow({ ...SIX, gate: ['back'] }, REAL);
  assert.deepEqual(ids(f).slice(6), ['gate', 'back1', 'back2', 'explain:back', 'cushion']);
  assert.equal(f.length, 11);
});

test('flow with all blocks', () => {
  const f = Q.quizFlow({ ...SIX, gate: ['upper', 'back', 'knees'] }, REAL);
  assert.deepEqual(ids(f).slice(6), ['gate', 'back1', 'back2', 'explain:back', 'knee1', 'knee2', 'explain:knees', 'upper1', 'explain:upper', 'cushion']);
  assert.equal(f.length, Q.MAX_STEPS);
  assert.equal(Q.MAX_STEPS, 16);
});

test('none wins in a corrupt gate', () => {
  assert.equal(Q.quizFlow({ ...SIX, gate: ['none', 'back'] }, REAL).length, 7);
  assert.deepEqual(Q.gateBlocks({ gate: ['none', 'back'] }), []);
  assert.deepEqual(Q.gateBlocks({ gate: ['upper', 'back'] }), ['back', 'upper']);
  assert.deepEqual(Q.gateBlocks(null), []);
});

test('getQuestion', () => {
  assert.equal(Q.getQuestion('q3', REAL).q, REAL.quiz[2].q);
  assert.equal(Q.getQuestion('q3', REAL).multi, false);
  assert.equal(Q.getQuestion('gate', REAL).multi, true);
  assert.equal(Q.getQuestion('knee2', REAL).id, 'knee2');
  assert.equal(Q.getQuestion('cushion', REAL).id, 'cushion');
});

test('firstMissingStep after old six', () => {
  assert.equal(Q.firstMissingStep({ ...SIX }, REAL), 6);
  assert.equal(Q.firstMissingStep({}, REAL), 0);
  assert.equal(Q.firstMissingStep(null, REAL), 0);
  const full = { ...SIX, gate: ['back'], back1: [0], back2: 1, cushion: 2 };
  assert.equal(Q.firstMissingStep(full, REAL), -1);
  assert.equal(Q.firstMissingStep({ ...full, back2: undefined }, REAL), 8);
});

test('isAnswered', () => {
  const step = id => ({ kind: 'q', id });
  assert.equal(Q.isAnswered(step('back1'), { back1: [] }, REAL), false);
  assert.equal(Q.isAnswered(step('back1'), { back1: [0, 9] }, REAL), false);
  assert.equal(Q.isAnswered(step('back1'), { back1: [0, 5] }, REAL), true);
  assert.equal(Q.isAnswered(step('back2'), { back2: 1 }, REAL), true);
  assert.equal(Q.isAnswered(step('back2'), { back2: 4 }, REAL), false);
  assert.equal(Q.isAnswered(step('gate'), { gate: ['back', 'x'] }, REAL), false);
  assert.equal(Q.isAnswered(step('gate'), { gate: ['knees'] }, REAL), true);
  assert.equal(Q.isAnswered(step('q5'), { q5: 3 }, REAL), true);
  assert.equal(Q.isAnswered(step('q5'), { q5: 4 }, REAL), false);
  assert.equal(Q.isAnswered({ kind: 'explain', block: 'back' }, {}, REAL), true);
});

test('pruneAnswers drops unchecked blocks', () => {
  const p = Q.pruneAnswers({ ...SIX, gate: ['knees'], back1: [0], back2: 1, knee1: [2], cushion: 0 }, REAL);
  assert.equal('back1' in p, false);
  assert.equal('back2' in p, false);
  assert.deepEqual(p.knee1, [2]);
  assert.equal(p.cushion, 0);
  assert.equal(p.q1, 0);
  const none = Q.pruneAnswers({ ...SIX, gate: ['none'], cushion: 0, upper1: [1] }, REAL);
  assert.equal('cushion' in none, false);
  assert.equal('upper1' in none, false);
});

// ---------- buildResult (Task 3) ----------
const ROADIE = { q1: 3, q2: 3, q3: 1, q4: 0, q5: 2, q6: 2 };
const kinds = r => r.variants.map(v => v.kind);
const V = (r, kind) => r.variants.find(v => v.kind === kind);
const healthAnswer = (id, i) => Q.getQuestion(id, REAL).answers[i];

test('rankTypes keeps scoreQuiz ordering', () => {
  const s = { city: 6, hybrid: 6, gravel: 1, mtb: 0, road: 0, folding: 0 };
  assert.deepEqual(Q.rankTypes(s, { pts: { city: 3, hybrid: 2 } }).slice(0, 2), ['city', 'hybrid']);
  assert.deepEqual(Q.rankTypes(s, { pts: {} }).slice(0, 2), ['hybrid', 'city']);
});

test('no injuries: balance and comfort', () => {
  const r = Q.buildResult({ ...SIX, gate: ['none'] }, REAL);
  assert.equal(r.complete, true);
  assert.deepEqual(kinds(r), ['balance', 'comfort']);
  assert.deepEqual(V(r, 'balance').gear, []);
  for (const g of ['suspFork', 'suspPost', 'wideTyres', 'riseBar']) assert.ok(V(r, 'comfort').gear.includes(g), g);
  assert.equal(r.rehab, false);
  assert.deepEqual(r.health, { upright: 0, barUp: 0, crankMax: null, stepThrough: false });
});

test('health points and warnings; comfort follows comfort order and 50% rule', () => {
  const plain = Q.buildResult({ ...ROADIE, gate: ['none'] }, REAL);
  const r = Q.buildResult({ ...ROADIE, gate: ['back'], back1: [1], back2: 3, cushion: 3 }, REAL);
  assert.equal(r.scores.road, plain.scores.road - 3);
  assert.equal(V(r, 'balance').type, 'road');
  assert.deepEqual(V(r, 'balance').warn, [healthAnswer('back1', 1).warn.text]);
  // city 4 and hybrid 1 are below 50% of road 13, gravel 7 is not
  assert.equal(V(r, 'comfort').type, 'gravel');
  assert.equal(V(r, 'comfort').warn.length, 1);
});

test('health points change the winner', () => {
  const base = { q1: 0, q2: 1, q3: 1, q4: 2, q5: 1, q6: 2 };
  assert.equal(Q.buildResult({ ...base, gate: ['none'] }, REAL).variants[0].type, 'gravel');
  const r = Q.buildResult({ ...base, gate: ['knees'], knee1: [1], knee2: 2, cushion: 3 }, REAL);
  assert.equal(V(r, 'balance').type, 'hybrid');
  assert.equal(r.scores.hybrid, 9);
  assert.equal(r.scores.gravel, 8);
});

test('caps', () => {
  const r = Q.buildResult({ ...SIX, gate: ['back', 'upper'], back1: [0, 1, 2, 3, 4, 5], back2: 0, upper1: [0, 1], cushion: 3 }, REAL);
  assert.equal(r.health.upright, 12);
  assert.equal(r.health.barUp, 60);
  assert.equal(V(r, 'comfort').fit.upright, 12);
  assert.equal(V(r, 'comfort').fit.barUp, 60);
});

test('crank and step-through', () => {
  const r = Q.buildResult({ ...SIX, gate: ['knees'], knee1: [1, 4], knee2: 2, cushion: 3 }, REAL);
  assert.equal(r.health.crankMax, 155);
  assert.equal(r.health.stepThrough, true);
  for (const g of ['stepThrough', 'shortCranks', 'lowGears']) assert.ok(V(r, 'balance').gear.includes(g), g);
  const order = REAL.health.gearOrder;
  const g = V(r, 'balance').gear;
  assert.deepEqual(g, [...g].sort((a, b) => order.indexOf(a) - order.indexOf(b)));
});

test('simple variant drops suspension', () => {
  const r = Q.buildResult({ ...SIX, gate: ['upper'], upper1: [2], cushion: 3 }, REAL);
  const s = V(r, 'simple');
  assert.ok(s, 'simple exists');
  assert.equal(s.type, V(r, 'balance').type);
  assert.ok(!s.gear.includes('suspFork'));
  assert.ok(s.gear.includes('wideTyres'));
  assert.equal(V(Q.buildResult({ ...SIX, gate: ['none'] }, REAL), 'simple'), undefined);
});

test('offroad comfort is full suspension', () => {
  const r = Q.buildResult({ ...SIX, q1: 2, gate: ['back'], back1: [0], back2: 1, cushion: 0 }, REAL);
  assert.equal(Q.isOffroad({ q1: 2 }), true);
  assert.equal(Q.isOffroad({ q1: 0, q4: 4 }), true);
  assert.equal(Q.isOffroad({ q1: 0, q4: 1 }), false);
  assert.equal(V(r, 'comfort').type, 'mtb');
  assert.ok(V(r, 'comfort').gear.includes('fullSusp'));
  assert.ok(V(r, 'balance').gear.includes('fullSusp'));
});

test('rehab', () => {
  assert.equal(Q.buildResult({ ...SIX, gate: ['knees'], knee1: [1], knee2: 2, cushion: 3 }, REAL).rehab, true);
  assert.equal(Q.buildResult({ ...SIX, gate: ['none'] }, REAL).rehab, false);
});

test('reasons: health first, max 4', () => {
  const r = Q.buildResult({ ...SIX, gate: ['back', 'knees'], back1: [0, 1], back2: 3, knee1: [1], knee2: 2, cushion: 3 }, REAL);
  assert.ok(r.reasons.length <= 4);
  assert.deepEqual(r.reasons.slice(0, 2), [healthAnswer('back1', 0).reason, healthAnswer('back1', 1).reason]);
});

test('notes: base, then health, then e-bike hint', () => {
  const r = Q.buildResult({ q1: 0, q2: 0, q3: 0, q4: 1, q5: 0, q6: 3, gate: ['knees'], knee1: [4], knee2: 2, cushion: 3 }, REAL);
  assert.equal(r.notes.at(-1), REAL.ebikeHint);
  assert.ok(r.notes.indexOf(healthAnswer('knee1', 4).note) < r.notes.length - 1);
  assert.equal(r.notes[0], REAL.quiz[5].answers[3].note);
});

test('answers of unchecked block are ignored', () => {
  const a = Q.buildResult({ ...SIX, gate: ['knees'], back1: [1], knee1: [3], knee2: 2, cushion: 3 }, REAL);
  const b = Q.buildResult({ ...SIX, gate: ['knees'], knee1: [3], knee2: 2, cushion: 3 }, REAL);
  assert.deepEqual(a.scores, b.scores);
  assert.deepEqual(a.health, b.health);
});

test('incomplete', () => {
  assert.deepEqual(Q.buildResult({ ...SIX }, REAL), { complete: false, firstMissing: 6 });
});

test('a more upright back brings a riser bar', () => {
  const r = Q.buildResult({ ...SIX, gate: ['back'], back1: [0], back2: 3, cushion: 3 }, REAL);
  assert.equal(r.health.upright, 6);
  assert.ok(V(r, 'balance').gear.includes('riseBar'));
  const small = Q.buildResult({ ...SIX, gate: ['back'], back1: [5], back2: 3, cushion: 3 }, REAL);
  assert.equal(small.health.upright, 2);
  assert.ok(!V(small, 'balance').gear.includes('riseBar'));
});

test('reasons describe the final winner when health changes it', () => {
  const base = { q1: 0, q2: 4, q3: 4, q4: 0, q5: 0, q6: 2 };
  assert.equal(Q.buildResult({ ...base, gate: ['none'] }, REAL).variants[0].type, 'folding');
  const r = Q.buildResult({ ...base, gate: ['back'], back1: [0], back2: 0, cushion: 3 }, REAL);
  const type = r.variants[0].type;
  assert.equal(type, 'city');
  // every reason from the first six answers must belong to an answer that gives the winner points
  const ok = new Set();
  ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].forEach((id, i) => { const a = REAL.quiz[i].answers[base[id]]; if ((a.pts[type] || 0) > 0) ok.add(a.reason); });
  const healthReasons = new Set([healthAnswer('back1', 0).reason, healthAnswer('back2', 0).reason]);
  for (const reason of r.reasons) assert.ok(ok.has(reason) || healthReasons.has(reason), `foreign reason: ${reason}`);
  assert.ok(!r.reasons.includes(REAL.quiz[2].answers[4].reason), 'no «важна компактность» for a city bike');
});
