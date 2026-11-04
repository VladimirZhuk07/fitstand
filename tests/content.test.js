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

test('menu items', () => {
  assert.deepEqual(CONTENT.menu.map(m => m.id), ['quiz', 'fit', 'types', 'parts', 'erase']);
  for (const m of CONTENT.menu) assert.ok(nonEmpty(m.title) && nonEmpty(m.short), m.id);
});

// ---------- health (spec 2026-11-04) ----------
const H = CONTENT.health;
const HQ_IDS = ['back1', 'back2', 'knee1', 'knee2', 'upper1', 'cushion'];
const healthQuestions = () => [...H.blocks.flatMap(b => b.questions), H.cushion];
const TEXTS = {
  back1: ['Есть ли у вас диагностированные проблемы со спиной?', ['Грыжа или протрузия поясничного отдела', 'Грыжа или протрузия шейного отдела', 'Компрессионный перелом, остеопороз', 'Сколиоз, нестабильность позвонков', 'Хроническая боль без точного диагноза', 'Острой боли нет, но был эпизод/операция в прошлом']],
  back2: ['Какая посадка была бы комфортнее для спины?', ['Максимально вертикальная, как на прогулочном велосипеде', 'Умеренно вертикальная, с легким наклоном', 'Готов(а) к лёгкому наклону, если есть амортизация', 'Не знаю, нужна рекомендация']],
  knee1: ['Были ли травмы или операции на коленях/тазобедренных суставах?', ['Да, мениск/связки', 'Да, замена коленного сустава', 'Да, перелом ноги/таза', 'Хроническая боль в колене при нагрузке', 'Ограничение сгибания колена или бедра', 'Нет, но есть дискомфорт после длительной езды']],
  knee2: ['Насколько комфортно вы переносите высокий каденс и нагрузку на колено?', ['Врач рекомендовал низкую нагрузку и высокий каденс', 'Могу крутить умеренно, но резкие усилия болезненны', 'Ограничений по нагрузке нет']],
  upper1: ['Есть ли боль/ограничения в шее, плечах или запястьях?', ['Боль в шее при запрокидывании головы', 'Боль/нестабильность плеча', 'Онемение или боль в запястьях/кистях', 'Туннельный синдром', 'Нет, но руки устают/немеют на неровностях']],
  cushion: ['Насколько важна для вас амортизация?', ['Критична, готов(а) на дополнительный вес', 'Желательна, но не любой ценой', 'Достаточно широких шин', 'Не важна']],
};
// spec 3.1: [pts, fit, gear, warnTypes|null, rehab]
const EXPECTED_HEALTH = {
  back1: [
    [{ road: -3, mtb: -1, hybrid: 2, city: 1 }, { upright: 6 }, ['suspPost', 'wideTyres'], ['road'], false],
    [{ road: -3, gravel: -1, city: 2, hybrid: 1 }, { upright: 6, barUp: 30 }, ['riseBar'], ['road', 'gravel'], false],
    [{ mtb: -2, road: -2, city: 2, hybrid: 1 }, { upright: 4 }, ['suspFork', 'suspPost', 'wideTyres'], ['mtb'], true],
    [{ road: -1, hybrid: 1 }, { upright: 3 }, ['suspPost'], null, false],
    [{ road: -1, hybrid: 1 }, { upright: 3 }, ['wideTyres'], null, false],
    [{}, { upright: 2 }, [], null, true],
  ],
  back2: [
    [{ city: 2, road: -2 }, { upright: 6 }, [], null, false],
    [{ hybrid: 2 }, { upright: 3 }, [], null, false],
    [{ gravel: 1, mtb: 1 }, {}, ['suspFork'], null, false],
    [{}, {}, [], null, false],
  ],
  knee1: [
    [{}, { crankMax: 165 }, ['lowGears'], ['mtb'], true],
    [{ city: 2, hybrid: 1, road: -2, mtb: -2 }, { crankMax: 155, stepThrough: true }, ['lowGears'], null, true],
    [{ city: 1 }, { crankMax: 165, stepThrough: true }, [], null, true],
    [{}, { crankMax: 165 }, ['lowGears'], null, false],
    [{}, { crankMax: 155 }, ['lowGears'], null, false],
    [{}, {}, [], null, false],
  ],
  knee2: [
    [{ road: -1 }, { crankMax: 165 }, ['lowGears'], null, false],
    [{}, {}, ['lowGears'], null, false],
    [{}, {}, [], null, false],
  ],
  upper1: [
    [{ road: -2 }, { upright: 3, barUp: 30 }, ['riseBar'], ['road', 'gravel'], false],
    [{ road: -1 }, { barUp: 20 }, ['riseBar'], null, false],
    [{}, {}, ['ergoGrips', 'suspFork'], null, false],
    [{}, {}, ['ergoGrips', 'altGrips', 'suspFork'], null, false],
    [{}, {}, ['suspFork', 'wideTyres', 'ergoGrips'], null, false],
  ],
  cushion: [
    [{ mtb: 1, hybrid: 1 }, {}, ['suspFork', 'suspPost'], null, false],
    [{}, {}, ['suspPost'], null, false],
    [{}, {}, ['wideTyres'], null, false],
    [{}, {}, [], null, false],
  ],
};
const GEAR = ['fullSusp', 'suspFork', 'suspPost', 'wideTyres', 'riseBar', 'stepThrough', 'shortCranks', 'lowGears', 'ergoGrips', 'altGrips'];

test('health gate', () => {
  assert.equal(H.gate.id, 'gate');
  assert.equal(H.gate.multi, true);
  assert.equal(H.gate.q, 'Есть ли у вас травмы или ограничения, которые нужно учесть?');
  assert.deepEqual(H.gate.answers.map(a => a.id), ['back', 'knees', 'upper', 'none']);
  assert.deepEqual(H.blocks.map(b => [b.id, b.title]), [['back', 'Спина'], ['knees', 'Колени и бёдра'], ['upper', 'Шея, плечи, руки']]);
});

test('health questions', () => {
  const qs = healthQuestions();
  assert.deepEqual(qs.map(q => q.id), HQ_IDS);
  assert.deepEqual(qs.map(q => q.multi), [true, false, true, false, true, false]);
  for (const q of qs) {
    assert.equal(q.q, TEXTS[q.id][0], q.id);
    assert.deepEqual(q.answers.map(a => a.text), TEXTS[q.id][1], q.id);
  }
});

test('health effects shape', () => {
  const KEYS = ['text', 'pts', 'fit', 'gear', 'warn', 'explain', 'reason', 'note', 'rehab', 'offroadGear'];
  assert.deepEqual(H.gearOrder, GEAR);
  for (const id of GEAR) assert.ok(nonEmpty(H.gear[id]), `gear name ${id}`);
  assert.match(H.gear.shortCranks, /\{mm\}/);
  for (const q of healthQuestions()) q.answers.forEach((a, i) => {
    const at = `${q.id}[${i}]`;
    for (const k of Object.keys(a)) assert.ok(KEYS.includes(k), `${at}.${k}`);
    for (const [t, v] of Object.entries(a.pts || {})) {
      assert.ok(BASE_TYPES.includes(t), `${at} type ${t}`);
      assert.ok(Number.isInteger(v) && v >= -3 && v <= 3 && v !== 0, `${at} pts ${t}`);
    }
    for (const k of Object.keys(a.fit || {})) assert.ok(['upright', 'barUp', 'crankMax', 'stepThrough'].includes(k), `${at} fit ${k}`);
    for (const g of [...(a.gear || []), ...(a.offroadGear || [])]) assert.ok(GEAR.includes(g), `${at} gear ${g}`);
    if (a.warn) {
      for (const t of a.warn.types) assert.ok(BASE_TYPES.includes(t), `${at} warn ${t}`);
      assert.ok(nonEmpty(a.warn.text), `${at} warn text`);
    }
  });
  assert.deepEqual(H.cushion.answers[0].offroadGear, ['fullSusp']);
});

test('health matrix matches spec', () => {
  for (const q of healthQuestions()) q.answers.forEach((a, i) => {
    const [pts, fit, gear, warnTypes, rehab] = EXPECTED_HEALTH[q.id][i];
    const at = `${q.id}[${i}]`;
    assert.deepEqual(a.pts || {}, pts, `${at} pts`);
    assert.deepEqual(a.fit || {}, fit, `${at} fit`);
    assert.deepEqual(a.gear || [], gear, `${at} gear`);
    assert.deepEqual(a.warn ? a.warn.types : null, warnTypes, `${at} warn`);
    assert.equal(a.rehab === true, rehab, `${at} rehab`);
  });
  const blockQ = id => H.blocks.flatMap(b => b.questions).find(x => x.id === id);
  for (const [q, i] of [['knee1', 4], ['knee1', 5], ['knee2', 0]]) assert.ok(nonEmpty(blockQ(q).answers[i].note), `${q}[${i}] note`);
});

test('every health answer explains itself', () => {
  for (const q of healthQuestions()) q.answers.forEach((a, i) => {
    if (a.pts || a.fit || a.gear) {
      assert.ok(nonEmpty(a.explain), `${q.id}[${i}] explain`);
      assert.ok(nonEmpty(a.reason), `${q.id}[${i}] reason`);
    }
  });
});

test('health texts', () => {
  assert.equal(H.disclaimer, 'Приложение не заменяет консультацию врача и профессионального байкфиттера. При серьёзных травмах и после операций окончательное решение лучше принимать вместе с ортопедом или реабилитологом и после примерки у специалиста.');
  assert.equal(H.privacy, 'Ответы хранятся только на этом устройстве и никуда не отправляются.');
  assert.equal(H.rehabText, 'Перед большими нагрузками посоветуйтесь со своим лечащим врачом или реабилитологом.');
  assert.ok(H.geometryWarning.startsWith('Если взять раму меньше нужного и поднять седло, руль окажется слишком низко'));
  assert.deepEqual(H.geometryRows.map(r => r.key), ['stack', 'reach', 'crank', 'bar', 'tyre', 'frame']);
  for (const r of H.geometryRows) assert.ok(nonEmpty(r.name) && nonEmpty(r.what) && nonEmpty(r.injury), r.key);
  assert.deepEqual(H.variantNames, { balance: 'Баланс', comfort: 'Максимальный комфорт', simple: 'Проще и дешевле' });
});

test('menu does not promise a fixed number of questions', () => {
  assert.doesNotMatch(CONTENT.menu.find(m => m.id === 'quiz').short, /\d+ вопрос/);
});
