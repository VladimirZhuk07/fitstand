const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');

const PRESETS = [{ H: 160, I: 74, A: 54, W: 37 }, { H: 178, I: 83, A: 61, W: 42 }, { H: 195, I: 92, A: 67, W: 46 }];
const EXPECT = { // снято с версии e898492
  road: [['XS', 70, 10, 638, 380, 170], ['M', 100, 50, 733, 420, 172.5], ['XXL', 100, 40, 826, 460, 175]],
  gravel: [['XS', 50, 40, 638, 420, 170], ['L', 70, 45, 733, 460, 172.5], ['XXL', 90, 50, 826, 500, 175]],
  city: [['XS', 100, 0, 633, 560, 170], ['XL', 80, 5, 729, 600, 170], ['XXL', 100, 45, 824, 640, 170]],
};

for (const [style, rows] of Object.entries(EXPECT)) {
  test(`model unchanged: ${style}`, () => {
    PRESETS.forEach((p, i) => {
      const F = M.fit({ ...p, flex: 3, style });
      assert.deepEqual(
        [F.best.sz.n, F.g.stemL, F.g.sp, Math.round(F.g.saddleH), F.barW, F.g.crank], rows[i]);
    });
  });
}

const IDX = n => ['XS', 'S', 'M', 'L', 'XL', 'XXL'].indexOf(n);
for (const style of ['hybrid', 'mtb']) {
  test(`${style}: size grows with height`, () => {
    const [a, b, c] = PRESETS.map(p => IDX(M.fit({ ...p, flex: 3, style }).best.sz.n));
    assert.ok(a <= 1, `160 → XS/S, got ${a}`);
    assert.ok(b === 2 || b === 3, `178 → M/L, got ${b}`);
    assert.ok(c >= 4, `195 → XL/XXL, got ${c}`);
  });
}

test('folding: one size, 20-inch wheel, finite numbers', () => {
  assert.equal(M.sizesFor('folding').length, 1);
  for (const p of PRESETS) {
    const F = M.fit({ ...p, flex: 3, style: 'folding' });
    assert.equal(F.best.sz.wheel, '20');
    assert.ok(Number.isFinite(F.g.saddleH) && Number.isFinite(F.knee) && Number.isFinite(F.alpha));
  }
  assert.deepEqual(M.FOLDING_RANGE, [150, 195]);
});

test('style flags reach geometry', () => {
  const g = M.fit({ ...PRESETS[1], flex: 3, style: 'mtb' }).g;
  assert.deepEqual([g.brake, g.susp, g.hinge], ['disc', true, false]);
  const r = M.fit({ ...PRESETS[1], flex: 3, style: 'road' }).g;
  assert.deepEqual([r.brake, r.susp, r.hinge], ['rim', false, false]);
});

// ---------- health adjustments (Task 5) ----------
test('fit without health equals baseline', () => {
  for (const [style, rows] of Object.entries(EXPECT)) PRESETS.forEach((p, i) => {
    const F = M.fit({ ...p, flex: 3, style, health: null });
    assert.deepEqual([F.best.sz.n, F.g.stemL, F.g.sp, Math.round(F.g.saddleH), F.barW, F.g.crank], rows[i], `${style} ${p.H}`);
    assert.equal(F.upright, 0);
    assert.equal(F.crankCut, false);
  });
});

const HEALTH0 = { upright: 0, barUp: 0, crankMax: null, stepThrough: false, gear: [] };
const P178 = { ...PRESETS[1], flex: 3 };

test('upright raises the back', () => {
  const a = M.fit({ ...P178, style: 'city' }), b = M.fit({ ...P178, style: 'city', health: { ...HEALTH0, upright: 6 } });
  const d = b.alpha - a.alpha;
  assert.ok(d >= 4 && d <= 8, `delta ${d}`);
  assert.equal(b.upright, 6);
});

test('barUp raises the bar', () => {
  const y = F => M.cockpit(F.g).G.y;
  const a = M.fit({ ...P178, style: 'hybrid' }), b = M.fit({ ...P178, style: 'hybrid', health: { ...HEALTH0, barUp: 30 } });
  assert.ok(y(b) - y(a) >= 15, `bar up ${y(b) - y(a)}`);
});

test('crankMax limits cranks', () => {
  const tall = { ...PRESETS[2], flex: 3, style: 'road' };
  const cut = M.fit({ ...tall, health: { ...HEALTH0, crankMax: 155 } });
  assert.equal(cut.g.crank, 155);
  assert.equal(cut.crankCut, true);
  const free = M.fit(tall);
  assert.equal(free.g.crank, 175);
  assert.equal(free.crankCut, false);
  assert.equal(M.fit({ ...tall, health: { ...HEALTH0, crankMax: 175 } }).crankCut, false);
});

test('gear flags reach geometry', () => {
  const g = M.fit({ ...P178, style: 'hybrid', health: { ...HEALTH0, stepThrough: true, gear: ['suspFork', 'suspPost', 'wideTyres'] } }).g;
  assert.deepEqual([g.susp, g.suspPost, g.stepThrough, g.tyre], [true, true, true, 46]);
  const plain = M.fit({ ...P178, style: 'hybrid' }).g;
  assert.deepEqual([plain.susp, plain.suspPost, plain.stepThrough, plain.tyre], [false, false, false, 38]);
  assert.equal(M.fit({ ...P178, style: 'mtb', health: { ...HEALTH0, gear: ['wideTyres'] } }).g.tyre, 58);
});

test('health never changes the frame size', () => {
  const heavy = { upright: 12, barUp: 60, crankMax: 155, stepThrough: true, gear: ['riseBar', 'suspFork', 'suspPost', 'wideTyres'] };
  for (const style of ['road', 'gravel', 'city', 'hybrid', 'mtb', 'folding']) for (const p of PRESETS) {
    const a = M.fit({ ...p, flex: 3, style }), b = M.fit({ ...p, flex: 3, style, health: heavy });
    assert.equal(b.best.sz.n, a.best.sz.n, `${style} ${p.H}`);
  }
});

test('riser bar lifts the hands more than spacers alone', () => {
  const up = { upright: 6, barUp: 30, crankMax: null, stepThrough: false };
  const p = { ...PRESETS[1], flex: 3, style: 'hybrid' };
  const without = M.fit({ ...p, health: { ...up, gear: [] } }), withBar = M.fit({ ...p, health: { ...up, gear: ['riseBar'] } });
  assert.ok(withBar.best.err < without.best.err, `err ${withBar.best.err} vs ${without.best.err}`);
  assert.ok(withBar.g.rise > 0);
});

test('summary bar height includes the riser bar rise', () => {
  const h = { upright: 6, barUp: 30, crankMax: null, stepThrough: false, gear: ['riseBar'] };
  const F = M.fit({ ...PRESETS[1], flex: 3, style: 'hybrid', health: h });
  const s = M.summaryOf(F);
  assert.equal(s.bar, F.g.stack + F.g.sp + 30);
  assert.deepEqual([s.size, s.stack, s.reach, s.crank, s.tyre, s.stepThrough], [F.best.sz.n, F.g.stack, F.g.reach, F.g.crank, F.g.tyre, false]);
  const plain = M.summaryOf(M.fit({ ...PRESETS[1], flex: 3, style: 'hybrid' }));
  assert.equal(plain.bar, plain.stack + M.fit({ ...PRESETS[1], flex: 3, style: 'hybrid' }).g.sp);
});

// ---------- bike types (sub-project A, Task 1) ----------
const CATALOG = ['cx', 'track', 'trike', 'cargo', 'bmx', 'special', 'kidTrike', 'balance', 'kidTraining', 'kid', 'teen'];

test('FIT_STYLES', () => {
  assert.deepEqual(M.FIT_STYLES, ['city', 'hybrid', 'women', 'gravel', 'cx', 'road', 'track', 'mtb', 'fullsus', 'folding']);
  for (const s of M.FIT_STYLES) assert.ok(M.STYLES[s], s);
});

test('women: low frame, short cranks, hybrid sizes', () => {
  assert.equal(M.STYLES.women.name, 'Женский');
  assert.deepEqual(M.sizesFor('women'), M.sizesFor('hybrid'));
  const F = M.fit({ H: 195, I: 92, A: 67, W: 46, flex: 3, style: 'women' });
  assert.equal(F.g.stepThrough, true);
  assert.ok(F.g.crank <= 170, `crank ${F.g.crank}`);
  assert.ok(F.barW >= 540 && F.barW <= 640, `bar ${F.barW}`);
  assert.equal(M.fit({ ...PRESETS[1], flex: 3, style: 'hybrid' }).g.stepThrough, false);
});

test('cx and track fit with finite numbers', () => {
  for (const style of ['cx', 'track', 'women']) for (const p of PRESETS) {
    const F = M.fit({ ...p, flex: 3, style });
    assert.ok(F.best && F.best.sz, style);
    for (const [k, v] of Object.entries(F.g)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${style}.${k}`);
  }
});

test('fullsus uses mtb sizes', () => {
  assert.deepEqual(M.sizesFor('fullsus'), M.sizesFor('mtb'));
  for (const p of PRESETS) {
    const a = M.fit({ ...p, flex: 3, style: 'mtb' }), b = M.fit({ ...p, flex: 3, style: 'fullsus' });
    assert.equal(b.best.sz.n, a.best.sz.n);
    assert.equal(b.g.rearShock, true);
    assert.ok(!a.g.rearShock);
  }
});

test('catalog styles give finite geometry', () => {
  for (const style of CATALOG) {
    const st = M.STYLES[style];
    assert.ok(st, style);
    const body = st.rider || PRESETS[1];
    const F = M.fit({ ...body, flex: 3, style });
    for (const v of [F.g.saddleH, F.knee, F.alpha, F.g.wheelR]) assert.ok(Number.isFinite(v), `${style}: ${v}`);
    if (!st.unicycle) assert.ok(F.best.err < 60, `${style}: reach error ${Math.round(F.best.err)}`); // a unicycle has no handlebar
    if (st.crankMax < 170) assert.ok(F.g.crank <= st.crankMax, `${style} crank`);
  }
  const flags = { track: ['brake', 'none'], trike: ['trike', true], cargo: ['cargoBox', true], balance: ['noPedals', true], kidTraining: ['trainingWheels', true], kidTrike: ['frontPedals', true], special: ['unicycle', true] };
  for (const [style, [k, v]] of Object.entries(flags)) {
    const st = M.STYLES[style];
    assert.equal(M.fit({ ...(st.rider || PRESETS[1]), flex: 3, style }).g[k], v, `${style}.${k}`);
  }
  assert.equal(M.fit({ ...M.STYLES.kidTrike.rider, flex: 3, style: 'kidTrike' }).g.trike, true);
  assert.equal(M.sizesFor('cx').length, 6);
  assert.equal(M.sizesFor('balance').length, 1);
  assert.equal(M.sizesFor('balance')[0].wheel, '12');
});

const KID_ROWS = [[95,0.421,0.316,0.253,0.080],[110,0.427,0.318,0.245,0.076],[125,0.440,0.328,0.240,0.072],[145,0.455,0.338,0.234,0.067],[178,0.466,0.343,0.236,0.062]];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} vs ${b}`);

test('kidBody hits the anchor rows', () => {
  for (const [H, i, a, w, hk] of KID_ROWS) {
    const k = M.kidBody(H);
    near(k.I / H, i); near(k.A / H, a); near(k.W / H, w); near(k.headK, hk);
  }
  near(M.kidBody(110).I, 0.427 * 110);
});

test('kidBody is linear between anchors and clamped outside', () => {
  const k = M.kidBody(117.5);
  near(k.I / 117.5, (0.427 + 0.440) / 2);
  near(k.A / 117.5, (0.318 + 0.328) / 2);
  near(k.W / 117.5, (0.245 + 0.240) / 2);
  near(k.headK, (0.076 + 0.072) / 2);
  const lo = M.kidBody(80);
  near(lo.I / 80, 0.421); near(lo.headK, 0.080);
  const hi = M.kidBody(200);
  near(hi.I / 200, 0.466); near(hi.W / 200, 0.236); near(hi.headK, 0.062);
});

test('bodyOf: adults unchanged, a child gets a larger head', () => {
  const b = M.bodyOf({ H: 178, I: 83, A: 61, W: 42 });
  near(b.headR, 0.062 * 1780);
  near(b.torso, 0.818 * 1780 - (830 + 0.06 * 1780));
  near(b.thigh, (830 + 0.06 * 1780 - 0.039 * 1780) / 2);
  near(b.arm, 680); near(b.foot, 0.15 * 1780);
  assert.deepEqual(Object.keys(b).sort(), ['arm', 'foot', 'headR', 'shin', 'thigh', 'torso']);
  const c = M.bodyOf({ H: 110, ...M.kidBody(110) });
  near(c.headR, 0.076 * 1100);
});

test('wheel radii for 18 and 26 inch', () => {
  assert.equal(M.WHEEL_R['18'], 177.5);
  assert.equal(M.WHEEL_R['26'], 279.5);
});

// ---------- kids' bikes sized by the child's height (feedback 6, Task 3) ----------
test('kidSizeFor picks by the middle of the height range', () => {
  const k = h => M.kidSizeFor('kidTraining', h), t = h => M.kidSizeFor('teen', h);
  assert.deepEqual([85, 100, 105, 112, 120, 125].map(k), [0, 1, 1, 2, 3, 3]);
  assert.equal(k(97.5), 0); // exactly between 92.5 and 102.5: the smaller size
  assert.deepEqual([125, 146, 147, 165].map(t), [0, 0, 1, 1]);
  assert.equal(M.sizesFor('kidTraining').length, 4);
  assert.equal(M.sizesFor('teen').length, 2);
  assert.deepEqual(M.STYLES.kidTraining.kidFit, { range: [85, 125], def: 110 });
  assert.deepEqual(M.STYLES.teen.kidFit, { range: [125, 165], def: 145 });
});

test('kid fit: size, wheel and crank follow the height', () => {
  const run = (style, H) => { const F = M.fit({ H, style, flex: 3 }); return [F.best.sz.wheel, F.g.crank]; };
  assert.deepEqual([90, 100, 112, 122].map(H => run('kidTraining', H)), [['12', 85], ['14', 89], ['16', 95], ['18', 102]]);
  assert.deepEqual(run('teen', 135), ['24', 152]);
  assert.deepEqual(run('teen', 160), ['26', 160]);
  const F = M.fit({ H: 112, style: 'kidTraining', flex: 3 });
  assert.equal(F.best.i, 2);
  assert.deepEqual(F.near, []);
});

test('kid fit at the edges: no NaN, saddle above the crank, knee sane', () => {
  for (const [style, H] of [['kidTraining', 85], ['teen', 165]]) {
    const F = M.fit({ H, style, flex: 3 });
    for (const [k, v] of Object.entries(F.g)) if (typeof v === 'number') assert.ok(Number.isFinite(v), `${style} g.${k}`);
    assert.ok(F.g.saddleH > F.g.crank, `${style} saddle`);
    assert.ok(Number.isFinite(F.knee) && F.knee >= 0 && F.knee <= 90, `${style} knee ${F.knee}`);
    console.log(`kid knee ${style} H=${H}: ${F.knee.toFixed(1)}`);
  }
});

test('kid fit ignores the health limits', () => {
  const a = M.fit({ H: 110, style: 'kidTraining', flex: 3 });
  const b = M.fit({ H: 110, style: 'kidTraining', flex: 3, health: { crankMax: 60, upright: 20, gear: ['riseBar'] } });
  assert.deepEqual(a.g, b.g);
});

test('catalog dummies keep their wheels', () => {
  for (const [style, wheel] of [['kidTraining', '16'], ['teen', '24'], ['bmx', '20']]) {
    assert.equal(M.fit({ ...M.STYLES[style].rider, style, flex: 3 }).best.sz.wheel, wheel, style);
  }
});

test('rear tyre clears the bottom bracket on every size of every style', () => {
  for (const style of [...M.FIT_STYLES, 'kidTraining', 'teen']) {
    const st = M.STYLES[style];
    M.sizesFor(style).forEach((sz, i) => {
      const H = st.kidFit ? (st.kidSizes[i].h[0] + st.kidSizes[i].h[1]) / 2 : 178;
      const F = M.fit({ H, I: 83, A: 61, W: 42, style, flex: 3 });
      // for adults fit picks the size itself; evaluate this size directly so none is skipped
      const body = st.kidFit ? { H, flex: 3, ...M.kidBody(H) } : { H, I: 83, A: 61, W: 42, flex: 3 };
      const e = M.evalSize({ ...body, style }, st, M.bodyOf(body), sz, i, st.alpha, Math.min(175, st.crankMax));
      assert.ok(e.g.cs > e.g.wheelR + 25, `${style} ${sz.n}: cs ${e.g.cs} wheelR ${e.g.wheelR}`);
      assert.ok(F.g.cs > F.g.wheelR + 25, `${style} fit: cs ${F.g.cs} wheelR ${F.g.wheelR}`);
    });
  }
});
