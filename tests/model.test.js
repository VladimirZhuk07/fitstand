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
