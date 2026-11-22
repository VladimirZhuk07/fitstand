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
  assert.doesNotMatch(src, /Блокировка|Кочка/);
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

test('type cards and pages show a photo, the drawing stays as a fallback', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.match(src, /img\/types\/\$\{id\}\.webp/);
  assert.match(src, /type-thumb/);
  assert.match(src, /type-photo/);
});

test('parseRoute: part details (spec 5)', () => {
  assert.deepEqual(r('#parts/drivetrain/chain'), { view: 'detail', part: 'drivetrain', id: 'chain' });
  assert.deepEqual(r('#parts/drivetrain/shifters'), { view: 'detail', part: 'drivetrain', id: 'shifters' });
  for (const h of ['#parts/drivetrain/xyz', '#parts/drivetrain/constructor', '#parts/drivetrain/__proto__', '#parts/drivetrain/'])
    assert.deepEqual(r(h), { view: 'part', id: 'drivetrain' }, h);
  assert.deepEqual(r('#parts/brakes/chain'), { view: 'part', id: 'brakes' });
  assert.deepEqual(r('#parts/xyz/chain'), { view: 'parts' });
  for (const h of ['#types/mtb/x', '#acc/helmet/x', '#parts/drivetrain/chain/x']) assert.deepEqual(r(h), { view: 'fit' }, h);
});

test('detail page plumbing: details flag reaches the drawing', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.match(src, /details: svg\.dataset\.details === '1'/);
  assert.match(src, /r\.view === 'detail'/);
});

test('detail picture names (feedback 4: pictures for every list)', () => {
  const { detailImg } = require('../guide.js');
  assert.equal(detailImg('chain'), 'img/details/chain.webp');
  assert.equal(detailImg('shifters', 1), 'img/details/shifters-1.webp');
  assert.equal(detailImg('cranks', 0), 'img/details/cranks-0.webp');
});

// ---------- suspension pages (feedback 5) ----------
test('schema picture name and a fork detail route', () => {
  const { schemaImg, parseRoute } = require('../guide.js');
  assert.equal(schemaImg('springFork'), 'img/details/springFork-schema.svg');
  const content = { parts: { fork: { details: [{ id: 'rearShock' }] } } };
  assert.deepEqual(parseRoute('#parts/fork/rearShock', content), { view: 'detail', part: 'fork', id: 'rearShock' });
});

test('detail page plumbing: usage, schema, terrain, highlight and style overrides', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  for (const s of ['d.usage', 'd.schema', 'd.hl', 'd.style', 'k.terrain']) assert.ok(src.includes(s), s);
});

test('a missing schema file removes its whole section, not just the picture', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.match(src, /data-opt-sec/);
  assert.match(src, /closest\('section'\)/);
});

test('the schema opens full size on tap (the labels are tiny on a phone)', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.match(src, /<a class="schema-link" href="\$\{schemaImg\(id\)\}"/);
});

// ---------- lockout on the suspension pages (feedback 6) ----------
{
  const { detailSections } = require('../guide.js');
  const h = { pic: () => '', more: () => '' };
  const page = (pid, id) => detailSections(CONTENT.parts[pid].details.find(d => d.id === id), id, h);
  const at = (html, s) => { const i = html.indexOf(`<h2>${s}</h2>`); assert.ok(i >= 0, `no section «${s}»`); return i; };

  test('a suspension detail: sections in order, the lockout block on top', () => {
    for (const id of ['springFork', 'airFork', 'rearShock']) {
      const html = page('fork', id);
      const order = ['Принцип работы', 'Виды', 'Как пользоваться блокировкой', 'Уход', 'Поломки и как устранить', 'Как использовать'].map(s => at(html, s));
      assert.deepEqual(order, [...order].sort((a, b) => a - b), `${id}: order`);
      assert.match(html, /class="lock-anim"/, id);
      assert.ok(html.indexOf('lock-anim') > order[0] && html.indexOf('lock-anim') < order[1], `${id}: the block sits in «Принцип работы»`);
      const link = html.indexOf('Схема целиком');
      assert.ok(link > html.indexOf('lock-anim') && link < order[1], `${id}: the link is below the animation`);
      assert.ok(html.includes(`href="img/details/${id}-schema.svg"`), id);
      assert.doesNotMatch(html, /Частые поломки/, id);
    }
    assert.match(page('fork', 'rearShock'), /data-lock-kind="shock"/);
  });

  test('a detail without lock renders as before', () => {
    const html = page('drivetrain', 'chain');
    assert.doesNotMatch(html, /lock-anim/);
    assert.doesNotMatch(html, /Схема целиком|Как пользоваться блокировкой|Поломки и как устранить/);
    for (const s of ['Что это', 'Виды', 'Уход']) at(html, s);
    const fd = page('drivetrain', 'fd');
    at(fd, 'Частые поломки и как их избежать');
    assert.doesNotMatch(fd, /Как устранить/);
  });

  test('breakdowns show how to fix', () => {
    for (const id of ['springFork', 'airFork', 'rearShock']) {
      const d = CONTENT.parts.fork.details.find(x => x.id === id), html = page('fork', id);
      for (const b of d.breaks) {
        assert.ok(html.includes(`<b>${b.name}</b>`) && html.includes(b.text), `${id}: ${b.name}`);
        assert.ok(html.includes(`Как устранить:</b> ${b.fix}`) || html.includes(`Как устранить: ${b.fix}`), `${id}: fix of ${b.name}`);
      }
    }
  });

  test('guide.js starts the lock loop after rendering and stops the previous one', () => {
    const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
    assert.match(src, /querySelector\('\.lock-anim'\)/);
    assert.match(src, /startLockAnim\(el, d\.lock\)/);
    assert.match(src, /lockCtl\.stop\(\)/);
  });
}
