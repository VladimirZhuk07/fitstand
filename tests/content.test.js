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
  assert.equal(CONTENT.typeOrder.length, 21);
  for (const id of CONTENT.typeOrder) {
    const t = CONTENT.types[id];
    for (const k of ['name', 'short', 'purpose', 'forWhom']) assert.ok(nonEmpty(t[k]), `${id}.${k}`);
    assert.ok(t.short.length <= 60, `${id}.short too long`);
    assert.ok(t.pros.length >= 3 && t.pros.length <= 5, `${id}.pros`);
    assert.ok(t.cons.length >= 3 && t.cons.length <= 5, `${id}.cons`);
    assert.deepEqual(t.program.map(s => s.title), ['Первая неделя', 'Первый месяц', 'Дальше']);
    t.program.forEach(s => assert.ok(nonEmpty(s.text)));
  }
});

test('parts complete', () => {
  assert.deepEqual(CONTENT.partOrder, ['frame', 'fork', 'brakes', 'drivetrain', 'rims', 'tyres', 'cockpit', 'saddle', 'pedals']);
  assert.deepEqual(Object.keys(CONTENT.parts).sort(), [...CONTENT.partOrder].sort());
  for (const id of CONTENT.partOrder) {
    const p = CONTENT.parts[id];
    assert.ok(nonEmpty(p.name) && nonEmpty(p.short), id);
    assert.ok(p.variants.length >= 2 && p.variants.length <= 6, `${id}.variants`);
    for (const m of p.more || []) {
      assert.ok(nonEmpty(m.title), `${id}.more`);
      assert.ok(nonEmpty(m.text) || (m.list && m.list.length) || m.table, `${id}.${m.title}: empty`);
      if (m.list) m.list.forEach(x => assert.ok(nonEmpty(x), `${id}.${m.title}.list`));
      if (m.table) m.table.rows.forEach(r => assert.equal(r.length, m.table.head.length, `${id}.${m.title}.row`));
    }
    for (const v of p.variants) {
      assert.ok(nonEmpty(v.name) && nonEmpty(v.text), `${id}.${v.name}`);
      assert.ok(v.pros.length >= 1 && v.pros.length <= 3, `${id}.${v.name}.pros`);
      assert.ok(v.cons.length >= 1 && v.cons.length <= 3, `${id}.${v.name}.cons`);
    }
  }
});

test('fork, rims, tyres per spec', () => {
  const P = CONTENT.parts;
  for (const i of [1, 2]) assert.ok(nonEmpty(P.fork.variants[i].how), `fork ${i}.how`);
  assert.deepEqual(P.fork.more.map(m => m.title), ['Блокировка']);
  assert.equal(P.rims.variants.length, 4);
  assert.equal(P.tyres.variants.length, 6);
  for (const id of ['rims', 'tyres']) P[id].variants.forEach(v => assert.ok(nonEmpty(v.terrain), `${id}.${v.name}.terrain`));
  assert.deepEqual(P.rims.more.map(m => m.title), ['Размеры', 'Ширина обода', 'Высокий профиль']);
  assert.equal(P.rims.more[0].table.head.length, 3);
  assert.equal(P.rims.more[0].table.rows.length, 9);
  assert.deepEqual(P.tyres.more.map(m => m.title), ['На что влияет рисунок протектора', 'Материал: от худшего к лучшему', 'Камерные, бескамерные, трубки', 'Ширина и давление']);
  assert.equal(P.tyres.more[1].ordered, true);
  assert.ok(P.tyres.more[1].list.length >= 4);
});

test('no brands', () => {
  const s = JSON.stringify(CONTENT).toLowerCase();
  for (const b of ['Shimano', 'SRAM', 'Trek', 'Giant', 'Merida', 'Stels', 'Cube', 'Specialized', 'Twin', 'Fox', 'RockShox', 'MIPS', 'BOA'])
    assert.ok(!s.includes(b.toLowerCase()), b);
});

test('real data scores', () => {
  assert.equal(scoreQuiz([1, 2, 0, 2, 1, 1], CONTENT.quiz).type, 'gravel');
  assert.equal(scoreQuiz([0, 0, 0, 1, 0, 3], CONTENT.quiz).type, 'city');
  assert.equal(scoreQuiz([2, 2, 2, 3, 1, 2], CONTENT.quiz).type, 'mtb');
});

test('menu items', () => {
  assert.deepEqual(CONTENT.menu.map(m => m.id), ['quiz', 'fit', 'types', 'parts', 'acc', 'erase']);
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

// ---------- bike types (sub-project A, Task 3) ----------
const GROUPS = {
  adult: ['city', 'hybrid', 'women', 'gravel', 'cx', 'road', 'track', 'mountain', 'folding', 'ebike', 'trike', 'cargo'],
  kids: ['kidTrike', 'balance', 'kidTraining', 'kid', 'teen'],
  special: ['bmx', 'special'],
};
const BRANCHES = ['mtb', 'fullsus']; // reached from the MTB card, not listed in a group
const ALL_TYPES = [...GROUPS.adult.flatMap(id => (id === 'mountain' ? [id, ...BRANCHES] : [id])), ...GROUPS.kids, ...GROUPS.special];

test('groups cover every type once', () => {
  assert.deepEqual(CONTENT.typeGroups.map(g => [g.id, g.title]), [['adult', 'Взрослые'], ['kids', 'Детские'], ['special', 'Трюковые и специальные']]);
  for (const g of CONTENT.typeGroups) assert.deepEqual(g.ids, GROUPS[g.id], g.id);
  assert.deepEqual(CONTENT.typeOrder, ALL_TYPES);
  assert.deepEqual(Object.keys(CONTENT.types).sort(), [...ALL_TYPES].sort());
  const listed = CONTENT.typeGroups.flatMap(g => g.ids);
  for (const id of ALL_TYPES) {
    const t = CONTENT.types[id];
    const inGroup = listed.filter(x => x === id).length;
    const asBranch = t.parent ? CONTENT.types[t.parent].branches.includes(id) : false;
    assert.equal(inGroup + (asBranch ? 1 : 0), 1, `${id}: one group or one parent`);
  }
});

test('new fields per spec', () => {
  const T = CONTENT.types;
  for (const [gid, ids] of Object.entries(GROUPS)) for (const id of ids) assert.equal(T[id].group, gid, `${id}.group`);
  for (const id of BRANCHES) assert.equal(T[id].group, 'adult', `${id}.group`);
  for (const id of ['mtb', 'fullsus', 'cx', 'bmx']) assert.ok(nonEmpty(T[id].terrain), `${id}.terrain`);
  assert.ok(nonEmpty(T.cx.compare));
  for (const id of GROUPS.kids) {
    assert.ok(nonEmpty(T[id].age), `${id}.age`);
    assert.ok(Array.isArray(T[id].wheels) && T[id].wheels.length >= 1, `${id}.wheels`);
  }
  assert.deepEqual(GROUPS.kids.map(id => T[id].wheels), [['12'], ['12'], ['12', '14', '16'], ['16', '20'], ['24']]);
  for (const id of ['balance', 'kidTraining', 'kid']) assert.ok(T[id].teach.length >= 3 && T[id].teach.length <= 4, `${id}.teach`);
  assert.ok(T.kidTraining.fear.length >= 3 && T.kidTraining.fear.length <= 4);
  for (const id of ['teen', 'kid', 'special']) assert.ok(T[id].variants.length >= 2, `${id}.variants`);
  assert.match(T.trike.note, /электр/i);
  assert.equal(T.mtb.name, 'MTB хардтейл');
  assert.equal(T.fullsus.name, 'MTB двухподвес');
  const FIT_AS = { city: 'city', hybrid: 'hybrid', gravel: 'gravel', cx: 'cx', road: 'road', track: 'track', women: 'women', mountain: 'mtb', mtb: 'mtb', fullsus: 'fullsus', folding: 'folding', ebike: 'city', trike: 'city', cargo: 'city' };
  for (const id of ALL_TYPES) assert.equal(T[id].fitAs, FIT_AS[id] ?? null, `${id}.fitAs`);
});

test('MTB overview and women per spec', () => {
  const T = CONTENT.types;
  const { STYLES } = require('../model.js');
  assert.equal(T.mountain.name, 'MTB');
  assert.ok(nonEmpty(T.mountain.terrain));
  assert.deepEqual(T.mountain.branches, BRANCHES);
  for (const id of BRANCHES) assert.equal(T[id].parent, 'mountain', `${id}.parent`);
  for (const id of ['mountain', 'women']) {
    assert.ok(T[id].specs.length >= 5 && T[id].specs.length <= 7, `${id}.specs`);
    T[id].specs.forEach(x => assert.ok(nonEmpty(x), `${id}.specs`));
  }
  assert.equal(T.women.name, 'Женский');
  assert.ok(T.women.variants.length >= 3);
  assert.ok(nonEmpty(T.women.note));
  assert.match(T.women.specs.join(' '), /передач/, 'women: light gears (spec 2.2)');
  assert.deepEqual([T.mountain.drawAs, T.women.drawAs, T.ebike.drawAs, T.ebike.motor], ['mtb', 'women', 'city', true]);
  for (const id of ALL_TYPES) if (T[id].drawAs !== undefined) assert.ok(STYLES[T[id].drawAs], `${id}.drawAs`);
  for (const id of ALL_TYPES) if (!T[id].drawAs) assert.ok(STYLES[id], `${id}: drawn by its id`);
});

test('kids wheel table', () => {
  assert.deepEqual(CONTENT.kidsWheels, [
    { from: 85, to: 100, wheel: '12' }, { from: 95, to: 110, wheel: '14' }, { from: 105, to: 120, wheel: '16' },
    { from: 115, to: 135, wheel: '20' }, { from: 130, to: 150, wheel: '24' }]);
});

// ---------- accessories (sub-project B, Task 1) ----------
const ACC_GROUPS = [
  ['safety', '🦺', 'Безопасность и видимость'], ['repair', '🔧', 'Ремонт в дороге'], ['theft', '🔒', 'Защита от кражи'],
  ['cargo', '🎒', 'Груз и туринг'], ['weather', '🌧️', 'Погода и одежда'], ['comfort', '🪑', 'Комфорт и посадка'],
  ['electronics', '📱', 'Электроника и навигация'], ['care', '🧴', 'Уход и хранение'], ['transport', '🚗', 'Перевозка'],
  ['kids', '🧒', 'Детские аксессуары']];
const SITUATIONS = ['city', 'commute', 'rain', 'touring', 'long', 'offroad', 'kids', 'back', 'wrists', 'knees'];
const ACC_KEYS = ['name', 'short', 'text', 'kinds', 'choose', 'check', 'weather', 'priority', 'when', 'why'];

test('acc groups', () => {
  assert.deepEqual(CONTENT.accGroups.map(g => [g.id, g.icon, g.title]), ACC_GROUPS);
  const titles = id => CONTENT.accGroups.find(g => g.id === id).sections.map(s => s.title);
  assert.deepEqual(titles('safety'), ['Обязательные', 'Дополнительные']);
  assert.deepEqual(titles('repair'), ['Минимальный набор', 'Дополнительные']);
});

test('acc items', () => {
  const A = CONTENT.accessories, seen = new Map();
  for (const g of CONTENT.accGroups) for (const s of g.sections) for (const id of s.ids) {
    assert.ok(!seen.has(id), `${id} in two sections`);
    seen.set(id, g.id);
    assert.ok(A[id], `${id} has data`);
  }
  assert.deepEqual([...seen.keys()].sort(), Object.keys(A).sort());
  assert.ok(seen.size >= 65, `items: ${seen.size}`);
  for (const [id, a] of Object.entries(A)) {
    for (const k of Object.keys(a)) assert.ok(ACC_KEYS.includes(k), `${id}.${k}`);
    for (const k of ['name', 'short', 'text', 'why']) assert.ok(nonEmpty(a[k]), `${id}.${k}`);
    assert.ok(a.short.length <= 70, `${id}.short too long`);
    assert.ok([1, 2, 3].includes(a.priority), `${id}.priority`);
    assert.ok(a.when === 'always' || (Array.isArray(a.when) && a.when.length && a.when.every(w => SITUATIONS.includes(w))), `${id}.when`);
    if (a.kinds) for (const k of a.kinds) assert.ok(nonEmpty(k.name) && nonEmpty(k.text), `${id} kind`);
    if (a.choose) assert.ok(a.choose.length >= 2 && a.choose.every(nonEmpty), `${id}.choose`);
  }
  assert.deepEqual(Object.keys(A).filter(id => A[id].when === 'always').sort(), ['frontLight', 'helmet', 'rearLight']);
  for (const id of ['helmet', 'frontLight', 'rearLight', 'bell', 'gloves', 'glasses', 'pump', 'bags', 'bottle', 'fenders', 'pedals', 'shoes', 'computer', 'lube', 'rack', 'childSeat', 'roofRack', 'hitchRack'])
    assert.ok(A[id].kinds && A[id].kinds.length >= 2, `${id}.kinds`);
  for (const id of ['helmet', 'frontLight', 'rearLight', 'shoes', 'pedals', 'childSeat', 'kidsHelmet']) assert.ok(A[id].choose, `${id}.choose`);
  for (const id of ['rainJacket', 'overshoes', 'thermal', 'jersey', 'gilet', 'buff', 'shorts', 'windJacket', 'tights', 'winterGloves']) assert.ok(nonEmpty(A[id].weather), `${id}.weather`);
  for (const id of ['suspPost', 'rack', 'pedals', 'fenders', 'tube', 'childSeat', 'roofRack', 'hitchRack']) assert.ok(nonEmpty(A[id].check), `${id}.check`);
  assert.deepEqual(Object.keys(CONTENT.accSituationTitles), ['city', 'rain', 'touring', 'offroad', 'kids', 'back', 'wrists', 'knees', 'long']);
});

test('kids types list their own accessories', () => {
  const T = CONTENT.types, A = CONTENT.accessories;
  for (const id of ['kidTrike', 'balance', 'kidTraining', 'kid', 'teen']) {
    assert.ok(Array.isArray(T[id].acc) && T[id].acc.length >= 2, `${id}.acc`);
    for (const a of T[id].acc) assert.ok(A[a], `${id}: ${a}`);
  }
  assert.ok(!T.balance.acc.includes('trainingWheels'), 'no training wheels on a balance bike');
  assert.ok(T.kidTraining.acc.includes('trainingWheels'));
  for (const id of ['kidTrike', 'balance', 'kidTraining', 'kid']) assert.ok(T[id].acc.includes('kidsHelmet'), `${id} helmet`);
});

test('acc ids do not clash with group ids', () => {
  for (const g of CONTENT.accGroups) assert.ok(!Object.prototype.hasOwnProperty.call(CONTENT.accessories, g.id), g.id);
});

test('fork animation texts', () => {
  const A = CONTENT.parts.fork.anim;
  for (const v of [A.title, A.kinds.spring, A.kinds.air, A.modes.bump, A.modes.climb, A.lock, A.play, A.pause, ...Object.values(A.labels)]) assert.ok(nonEmpty(v));
  assert.deepEqual(Object.keys(A.labels).sort(), ['air', 'hands', 'oil', 'spring']);
  assert.deepEqual(Object.keys(A.captions).sort(), ['bump', 'climb']);
  for (const m of ['bump', 'climb']) {
    assert.deepEqual(Object.keys(A.captions[m]).sort(), ['off', 'on']);
    for (const k of ['off', 'on']) assert.ok(nonEmpty(A.captions[m][k]), `${m}.${k}`);
  }
  assert.match(A.captions.bump.on, /рук/);
  assert.match(A.captions.climb.on, /подъём/i);
  assert.match(A.captions.bump.off, /Недорогая пружинная/, 'only cheap spring forks have almost no damping');
});

test('drivetrain variants and usage per spec 2, 4', () => {
  const T = CONTENT.parts.drivetrain;
  T.variants.forEach(v => {
    assert.ok(nonEmpty(v.forWhom), `${v.name}.forWhom`);
    assert.ok(nonEmpty(v.terrain), `${v.name}.terrain`);
  });
  assert.deepEqual(T.more.map(m => m.title), ['Как переключать на разных трассах', 'Как не испортить трансмиссию', 'Частые ошибки новичков', 'Как выбрать трансмиссию новичку', 'Уход за трансмиссией']);
  T.more.forEach(m => assert.ok(m.list && m.list.length >= 3, m.title));
});

const DETAILS = [
  ['bb', 'Каретка', ['text', 'breaks', 'care'], []],
  ['cranks', 'Шатуны и звёзды', ['text', 'kinds'], ['Из чего делают', 'Какие для каких целей']],
  ['chain', 'Цепь', ['text', 'kinds', 'care'], []],
  ['fd', 'Передний переключатель', ['text', 'how', 'breaks', 'care'], []],
  ['rd', 'Задний переключатель', ['text', 'how', 'breaks', 'care'], []],
  ['cassette', 'Кассета / трещотка', ['text', 'kinds'], ['Под какие трассы', 'Что надёжнее']],
  ['shifters', 'Манетки', ['text', 'kinds'], ['Манетка или велошифт']],
  ['cables', 'Тросики и рубашки', ['text'], ['Как проводят тросики', 'Какая проводка лучше']],
];
const strs = (a, n, label) => { assert.ok(Array.isArray(a) && a.length >= n, label); a.forEach(x => assert.ok(nonEmpty(x), label)); };

test('drivetrain details per spec 3', () => {
  const D = CONTENT.parts.drivetrain.details;
  assert.deepEqual(D.map(d => [d.id, d.name]), DETAILS.map(([id, name]) => [id, name]));
  assert.deepEqual(CONTENT.parts.drivetrain.related, ['pedals']);
  for (const [id, , req, more] of DETAILS) {
    const d = D.find(x => x.id === id);
    assert.ok(nonEmpty(d.short) && d.short.length <= 60, `${id}.short`);
    for (const k of req) assert.ok(d[k] !== undefined, `${id}.${k} required`);
    for (const k of ['text', 'how']) if (d[k] !== undefined) assert.ok(nonEmpty(d[k]), `${id}.${k}`);
    if (d.kinds) {
      assert.ok(d.kinds.length >= 2, `${id}.kinds`);
      d.kinds.forEach(k => {
        assert.ok(nonEmpty(k.name) && nonEmpty(k.text), `${id}.kinds.${k.name}`);
        assert.ok(k.pros.length >= 1 && k.pros.length <= 3 && k.cons.length >= 1 && k.cons.length <= 3, `${id}.kinds.${k.name} pros/cons`);
      });
    }
    if (d.breaks) { assert.ok(d.breaks.length >= 2, `${id}.breaks`); d.breaks.forEach(b => assert.ok(nonEmpty(b.name) && nonEmpty(b.text), `${id}.breaks`)); }
    if (d.care) strs(d.care, 2, `${id}.care`);
    const titles = (d.more || []).map(m => m.title);
    for (const t of more) assert.ok(titles.includes(t), `${id}: ${t}`);
    for (const m of d.more || []) {
      assert.ok(nonEmpty(m.text) || (m.list && m.list.length) || m.table, `${id}.${m.title}: empty`);
      if (m.list) strs(m.list, 1, `${id}.${m.title}`);
      if (m.table) m.table.rows.forEach(r => assert.equal(r.length, m.table.head.length, `${id}.${m.title}.row`));
    }
  }
  const S = D.find(x => x.id === 'shifters');
  for (const n of ['Триггерные манетки', 'Велошифт (поворотная ручка)']) assert.ok(S.kinds.some(k => k.name === n), n);
  const cmp = S.more.find(m => m.title === 'Манетка или велошифт').table;
  assert.deepEqual(cmp.head, ['', 'Манетка', 'Велошифт']);
  assert.ok(cmp.rows.length >= 4);
});

test('pedals: combined variant and how to choose (spec 3)', () => {
  const P = CONTENT.parts.pedals;
  assert.deepEqual(P.variants.map(v => v.name), ['Платформы', 'Контактные', 'Комбинированные']);
  const m = P.more.find(x => x.title === 'Как подобрать педали');
  assert.ok(m && m.list.length >= 3);
});

// ---------- suspension pages (feedback 5) ----------
const forkDetail = id => CONTENT.parts.fork.details.find(d => d.id === id);
const USAGE5 = ['Рекомендации по использованию', 'Зачем нужна блокировка', 'Настройки', 'Возможные поломки', 'Ремонт'];
const okKind = (k, label) => {
  assert.ok(nonEmpty(k.name) && nonEmpty(k.text) && nonEmpty(k.terrain), label);
  assert.ok(k.pros.length >= 1 && k.pros.length <= 3 && k.cons.length >= 1 && k.cons.length <= 3, `${label} pros/cons`);
};

test('fork details: spring fork page', () => {
  const d = forkDetail('springFork');
  assert.ok(nonEmpty(d.short) && nonEmpty(d.text));
  assert.equal(d.hl, 'fork');
  assert.equal(d.schema, true);
  assert.deepEqual(d.kinds.map(k => k.name), ['Пружинно-эластомерная', 'Пружинно-масляная', 'Простая пружинная']);
  d.kinds.forEach(k => okKind(k, k.name));
  assert.deepEqual(d.usage.map(u => u.title), USAGE5);
  d.usage.forEach(u => assert.ok(u.list.length >= 2, u.title));
  const lock = d.usage[1].list.join(' ').toLowerCase();
  assert.ok(lock.includes('эластомер'));
  assert.ok(!lock.includes('отключ'), 'the lockout clamps the elastomer, the spring stays');
});

test('fork details: air fork page; settings moved from the overview', () => {
  assert.deepEqual(CONTENT.parts.fork.more.map(m => m.title), ['Блокировка']);
  const d = forkDetail('airFork');
  assert.ok(nonEmpty(d.short) && nonEmpty(d.text));
  assert.equal(d.hl, 'fork');
  assert.equal(d.schema, true);
  assert.ok(d.kinds.length >= 2 && d.kinds.length <= 3);
  d.kinds.forEach(k => okKind(k, k.name));
  assert.ok(d.breaks.length >= 3);
  d.breaks.forEach(b => assert.ok(nonEmpty(b.name) && nonEmpty(b.text), b.name));
  assert.deepEqual(d.usage.map(u => u.title), ['Рекомендации по использованию', 'Зачем нужна блокировка', 'Настройки', 'Ремонт своими руками']);
  assert.ok(d.usage[2].list.length >= 5);
  const lock = d.usage[1].list.join(' ').toLowerCase();
  assert.ok(lock.includes('демпфер') && lock.includes('воздух'));
});

test('fork details: rear shock page', () => {
  const d = forkDetail('rearShock');
  assert.ok(nonEmpty(d.short) && nonEmpty(d.text) && nonEmpty(d.how));
  assert.equal(d.style, 'fullsus');
  assert.equal(d.hl, 'fork:rearShock');
  assert.equal(d.schema, true);
  assert.deepEqual(d.kinds.map(k => k.name), ['Пружинный', 'Воздушный', 'Эластомерный']);
  d.kinds.forEach(k => { okKind(k, k.name); assert.ok(/велосипед/i.test(k.text + k.terrain), `${k.name}: for which bikes`); });
  assert.deepEqual(d.usage.map(u => u.title), USAGE5);
  d.usage.forEach(u => assert.ok(u.list.length >= 2, u.title));
});

test('twist shifter: how to use it', () => {
  const sh = CONTENT.parts.drivetrain.details.find(d => d.id === 'shifters');
  assert.equal(sh.usage[0].title, 'Как пользоваться велошифтом');
  assert.ok(sh.usage[0].list.length >= 3);
});
