const test = require('node:test');
const assert = require('node:assert/strict');
const { CONTENT } = require('../content.js');
const { BASE_TYPES, scoreQuiz } = require('../quiz.js');

// Матрица из спецификации 4.1: [city, hybrid, gravel, mtb, road, folding]
const EXPECTED = [
  [[3, 1, 0, 0, 0, 1], [0, 2, 3, 1, 0, 0], [0, 0, 1, 3, 0, 0], [0, 0, 1, 0, 3, 0], [0, 3, 2, 0, 0, 0]],
  [[3, 0, 0, 0, 0, 2], [1, 3, 1, 1, 0, 0], [0, 0, 2, 2, 2, 0], [0, 0, 2, 0, 3, 0], [1, 0, 0, 0, 0, 3]],
  [[3, 2, 0, 0, 0, 0], [0, 0, 2, 0, 3, 0], [0, 0, 1, 3, 0, 0], [0, 3, 2, 0, 0, 0], [0, 0, 0, 0, 0, 3]],
  [[2, 0, 0, 0, 2, 1], [1, 2, 0, 0, 0, 0], [0, 1, 3, 1, 0, 0], [0, 0, 0, 3, 0, 0], [0, 0, 0, 3, 0, 0]],
  [[3, 0, 0, 0, 0, 1], [0, 3, 1, 1, 0, 0], [0, 0, 2, 0, 3, 0], [0, 0, 0, 0, 0, 0]],
  [[2, 2, 1, 0, 0, 0], [1, 1, 1, 0, 0, 0], [0, 0, 1, 1, 2, 0], [3, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]],
];
const nonEmpty = s => typeof s === 'string' && s.trim().length > 0;

test('quiz shape', () => {
  const Q = CONTENT.quiz;
  assert.equal(Q.length, 6);
  assert.deepEqual(Q.map(q => q.answers.length), [5, 5, 5, 5, 4, 5]);
  Q.forEach((q, qi) => {
    assert.ok(nonEmpty(q.q));
    q.answers.forEach((a, ai) => {
      assert.ok(nonEmpty(a.text), `text ${qi}.${ai}`);
      for (const [k, v] of Object.entries(a.pts)) {
        assert.ok(BASE_TYPES.includes(k), `type ${k}`);
        assert.ok(Number.isInteger(v) && v >= 1 && v <= 3, `pts ${qi}.${ai}.${k}`);
      }
      if (Object.keys(a.pts).length) assert.ok(nonEmpty(a.reason), `reason ${qi + 1}.${ai + 1}`);
    });
  });
  assert.equal(Q[5].answers[4].motor, true);
  assert.ok(nonEmpty(Q[5].answers[4].reason), 'reason 6.5 (motor)');
  assert.ok(nonEmpty(CONTENT.ebikeHint), 'ebikeHint');
  for (const [q, a] of [[1, 4], [3, 4], [5, 0], [5, 3]]) assert.ok(nonEmpty(Q[q].answers[a].note), `note ${q + 1}.${a + 1}`);
});

test('matrix matches spec', () => {
  CONTENT.quiz.forEach((q, qi) => q.answers.forEach((a, ai) => {
    assert.deepEqual(BASE_TYPES.map(t => a.pts[t] || 0), EXPECTED[qi][ai], `answer ${qi + 1}.${ai + 1}`);
  }));
});

test('types complete', () => {
  assert.deepEqual(CONTENT.typeOrder, ['city', 'hybrid', 'gravel', 'mtb', 'road', 'folding', 'ebike']);
  for (const id of CONTENT.typeOrder) {
    const t = CONTENT.types[id];
    for (const k of ['name', 'short', 'purpose', 'forWhom']) assert.ok(nonEmpty(t[k]), `${id}.${k}`);
    assert.ok(t.short.length <= 60, `${id}.short too long`);
    assert.ok(t.pros.length >= 3 && t.pros.length <= 4, `${id}.pros`);
    assert.ok(t.cons.length >= 3 && t.cons.length <= 4, `${id}.cons`);
    assert.deepEqual(t.program.map(s => s.title), ['Первая неделя', 'Первый месяц', 'Дальше']);
    t.program.forEach(s => assert.ok(nonEmpty(s.text)));
  }
});

test('parts complete', () => {
  assert.deepEqual(CONTENT.partOrder, ['frame', 'fork', 'brakes', 'drivetrain', 'wheels', 'cockpit', 'saddle', 'pedals']);
  for (const id of CONTENT.partOrder) {
    const p = CONTENT.parts[id];
    assert.ok(nonEmpty(p.name) && nonEmpty(p.short), id);
    assert.ok(p.variants.length >= 2 && p.variants.length <= 4, `${id}.variants`);
    for (const v of p.variants) {
      assert.ok(nonEmpty(v.name) && nonEmpty(v.text), `${id}.${v.name}`);
      assert.ok(v.pros.length >= 1 && v.pros.length <= 3, `${id}.${v.name}.pros`);
      assert.ok(v.cons.length >= 1 && v.cons.length <= 3, `${id}.${v.name}.cons`);
    }
  }
});

test('no brands', () => {
  const s = JSON.stringify(CONTENT).toLowerCase();
  for (const b of ['Shimano', 'SRAM', 'Trek', 'Giant', 'Merida', 'Stels', 'Cube', 'Specialized', 'Twin', 'Fox', 'RockShox'])
    assert.ok(!s.includes(b.toLowerCase()), b);
});

test('real data scores', () => {
  assert.equal(scoreQuiz([1, 2, 0, 2, 1, 1], CONTENT.quiz).type, 'gravel');
  assert.equal(scoreQuiz([0, 0, 0, 1, 0, 3], CONTENT.quiz).type, 'city');
  assert.equal(scoreQuiz([2, 2, 2, 3, 1, 2], CONTENT.quiz).type, 'mtb');
});
