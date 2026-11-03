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
