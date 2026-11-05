const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
Object.assign(globalThis, M);
const Dr = require('../draw.js');
const Rd = require('../ride.js');
const R = require('../rider.js');

const HEIGHTS = [[150, 70, 51, 36], [165, 77, 56, 39], [178, 83, 61, 42], [195, 92, 67, 46]];
function joints(style, [H, I, A, W], t) {
  const g = M.fit({ H, I, A, W, flex: 3, style }).g, pts = Dr.geomPts(g), pose = Rd.ridePose(t, g.wheelR), th = -30 - pose.crank;
  return { g, j: { hip: pts.hip, near: M.legAt(g, pts.hip, th), far: M.legAt(g, pts.hip, th + 180), up: M.upperAt(g, pts.hip, pts.ck, pose) } };
}
const nums = attrs => Object.values(attrs).join(' ').match(/-?\d+(\.\d+)?(e-?\d+)?|NaN|Infinity/g) || [];
const pt = s => s.trim().split(/[ ,]+/).map(Number);

test('limbPath ends have the given widths', () => {
  const a = M.V(0, 0), b = M.V(0, -400), d = R.limbPath(a, b, 100, 60, 10, 0.4);
  assert.match(d, /Z$/);
  const start = pt(d.slice(1, d.indexOf('Q')));                 // first point: a + n·wa/2
  assert.ok(Math.abs(Math.hypot(start[0] - a.x, start[1] + a.y) - 50) < 1, `start ${start}`);
  const arcs = [...d.matchAll(/A([\d.]+) ([\d.]+)/g)].map(m => Number(m[1]));
  assert.deepEqual(arcs, [30, 50]);
});

test('shapes for every style and height', () => {
  let ids = null;
  for (const style of M.FIT_STYLES) for (const h of HEIGHTS) for (let k = 0; k < 12; k++) {
    const { g, j } = joints(style, h, k * 0.75), shapes = R.riderShapes(g, j, { t: k * 0.75 });
    const these = shapes.map(s => s.id).join(',');
    if (ids === null) ids = these;
    assert.equal(these, ids, `${style} ${h[0]}: same shapes`);
    for (const s of shapes) for (const n of nums(s.attrs)) assert.ok(Number.isFinite(Number(n)), `${style} ${h[0]} ${s.id}: ${n}`);
  }
  for (const id of ['rd-torso', 'rd-thigh', 'rd-shin', 'rd-shoe', 'rd-helmet', 'rd-strap', 'rd-fist', 'rd-far-thigh']) assert.ok(ids.split(',').includes(id), id);
});

test('fist on the grip, shoe on the pedal', () => {
  for (const style of ['road', 'city', 'mtb', 'folding']) for (const h of HEIGHTS) for (let k = 0; k < 12; k++) {
    const { g, j } = joints(style, h, k * 0.75), shapes = R.riderShapes(g, j, {}), by = id => shapes.find(s => s.id === id);
    const fist = by('rd-fist').attrs;
    assert.ok(Math.hypot(fist.cx - j.up.hand.x, -fist.cy - j.up.hand.y) < 0.4 * g.headR, `${style} ${h[0]} fist`);
    const sole = by('rd-sole').attrs.d.match(/-?[\d.]+ -?[\d.]+/g).map(pt);
    const mid = [(sole[0][0] + sole[1][0]) / 2, -(sole[0][1] + sole[1][1]) / 2];
    assert.ok(Math.hypot(mid[0] - j.near.pedal.x, mid[1] - j.near.pedal.y) < 0.5 * g.headR, `${style} ${h[0]} shoe ${mid} vs ${j.near.pedal.x},${j.near.pedal.y}`);
  }
});

test('cloth moves a little and loops', () => {
  const { g, j } = joints('hybrid', HEIGHTS[2], 0);
  const still = R.riderShapes(g, j, {}), at = t => R.riderShapes(g, j, { t });
  const hemOf = shapes => pt(shapes.find(s => s.id === 'rd-torso').attrs.d.slice(1).split(/[QLA]/)[0]);
  const strapOf = shapes => Number((shapes.find(s => s.id === 'rd-strap').attrs.transform.match(/rotate\((-?[\d.]+)/) || [0, 0])[1]);
  const h0 = hemOf(still);
  for (let t = 0; t < 9; t += 0.1) {
    const h = hemOf(at(t));
    assert.ok(Math.hypot(h[0] - h0[0], h[1] - h0[1]) <= 8.01, `hem at ${t}`);
    assert.ok(Math.abs(strapOf(at(t)) - strapOf(still)) <= 3.01, `strap at ${t}`);
    assert.deepEqual(at(t).map(s => s.attrs), at(t + 9).map(s => s.attrs), `loop at ${t}`);
  }
});

// ---------- markup ----------
test('markup has every shape once', () => {
  const { g, j } = joints('hybrid', HEIGHTS[2], 0), shapes = R.riderShapes(g, j, {});
  const far = R.riderMarkup(g, j, {}, 'far'), near = R.riderMarkup(g, j, {}, 'near');
  for (const s of shapes) {
    const n = (far.match(new RegExp(`id="${s.id}"`, 'g')) || []).length + (near.match(new RegExp(`id="${s.id}"`, 'g')) || []).length;
    assert.equal(n, 1, s.id);
    assert.ok((s.id.startsWith('rd-far-') ? far : near).includes(`id="${s.id}"`), `${s.id} on its side`);
  }
  assert.ok(near.includes('<defs>') && !far.includes('<defs>'), 'gradients once, with the near side');
  assert.match(near, /^<g class="rider rider-v">/);
});

test('rider colours come from CSS variables', () => {
  const { g, j } = joints('hybrid', HEIGHTS[2], 0), m = R.riderMarkup(g, j, {}, 'near') + R.riderMarkup(g, j, {}, 'far');
  assert.doesNotMatch(m, /(fill|stroke|stop-color)="#/);
  assert.match(m, /var\(--frame\)/);
});

test('applyRider sets attributes by id', () => {
  const { g, j } = joints('hybrid', HEIGHTS[2], 0), shapes = R.riderShapes(g, j, { t: 1 }), got = {};
  const svg = { querySelector: sel => ({ setAttribute: (k, v) => { (got[sel] = got[sel] || {})[k] = v; } }) };
  R.applyRider(svg, shapes);
  for (const s of shapes) assert.deepEqual(got['#' + s.id], s.attrs, s.id);
});
