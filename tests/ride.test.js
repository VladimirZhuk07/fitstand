const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../ride.js');

const P = R.RIDE.PERIOD;
const WHEELS = [311, 292, 203, 152.5]; // 700c, 27.5″, 20″, 16″
const frames = () => { const r = []; for (let t = 0; t < P; t += 1 / 60) r.push(t); return r; };
const angleGap = (a, b) => { const d = (((a - b) % 360) + 540) % 360 - 180; return Math.abs(d); };

test('whole revolutions per loop', () => {
  assert.equal(R.RIDE.CRANK_REVS, 12);
  for (const r of WHEELS) {
    assert.ok(Number.isInteger(R.wheelRevs(r)) && R.wheelRevs(r) >= 1, `R=${r}`);
    // the last frame is one frame short of a whole turn
    const end = R.ridePose(P - 1e-9, r);
    assert.ok(Math.abs(end.crank - 360 * 12) < 1e-3, 'crank');
    assert.ok(Math.abs(end.wheel - 360 * R.wheelRevs(r)) < 1e-3, 'wheel');
  }
  const kmh = R.speedOf(311) * 3.6 / 1000;
  assert.ok(kmh > 20 && kmh < 24, `speed ${kmh}`);
});

test('road matches the wheel', () => {
  for (const r of WHEELS) for (const t of frames()) {
    const p = R.ridePose(t, r);
    assert.ok(Math.abs(p.ground - (p.wheel / 360) * 2 * Math.PI * r) < 0.5, `R=${r} t=${t}`);
  }
});

test('loop seam', () => {
  for (const r of WHEELS) {
    const a = R.ridePose(P - 1 / 60, r), b = R.ridePose(0, r), step = R.ridePose(1 / 60, r);
    assert.ok(angleGap(a.crank, b.crank) <= angleGap(step.crank, b.crank) + 1, 'crank');
    assert.ok(angleGap(a.wheel, b.wheel) <= angleGap(step.wheel, b.wheel) + 1, 'wheel');
    // the jump over the seam is no bigger than an ordinary frame-to-frame step
    for (const k of ['torso', 'bar', 'breath', 'bounce']) {
      const ts = frames(), step = Math.max(...ts.map(t => Math.abs(R.ridePose(t + 1 / 60, r)[k] - R.ridePose(t, r)[k])));
      assert.ok(Math.abs(a[k] - b[k]) <= step + 1e-6, `${k}: seam ${Math.abs(a[k] - b[k])} vs step ${step}`);
    }
    for (const k of ['crank', 'wheel', 'torso', 'bar', 'breath', 'bounce']) assert.ok(Math.abs(R.ridePose(2, r)[k] - R.ridePose(2 + P, r)[k]) < 1e-6, `period ${k}`);
  }
});

test('limits', () => {
  for (const t of frames()) {
    const p = R.ridePose(t, 311);
    assert.ok(Math.abs(p.torso) <= 2 && Math.abs(p.bar) <= 1.5 && p.breath >= 0 && p.breath <= 6 && Math.abs(p.bounce) <= 3, `t=${t}`);
  }
});

test('bar is irregular', () => {
  const b = frames().map(t => R.ridePose(t, 311).bar), peaks = [];
  for (let i = 1; i < b.length - 1; i++) if (b[i] > b[i - 1] && b[i] >= b[i + 1]) peaks.push(b[i]);
  assert.ok(peaks.length > 4, `peaks ${peaks.length}`);
  assert.ok(Math.max(...peaks) - Math.min(...peaks) > 0.1, 'peaks differ');
});

test('layers', () => {
  const speed = id => { const a = R.layerShift(id, 1, 311), b = R.layerShift(id, 1.01, 311); return ((a.x - b.x + a.tile) % a.tile) / 0.01; };
  for (const { id, k } of R.LAYERS) for (const r of WHEELS) {
    const { tile } = R.layerShift(id, 0, r), n = (R.speedOf(r) * P * k) / tile;
    assert.ok(Math.abs(n - Math.round(n)) < 1e-9, `${id} R=${r}: ${n} tiles a loop`);
    assert.ok(tile >= 2500 && tile <= 4500, `${id} tile ${tile}`);
    for (const t of [0.3, 4.1]) assert.ok(Math.abs(R.layerShift(id, t, r).x - R.layerShift(id, t + P, r).x) < 1e-6, `${id} period`);
  }
  assert.ok(Math.abs(speed('road') - R.speedOf(311)) < 1, 'road moves with the wheel');
  assert.ok(speed('near') > speed('road') && speed('road') > speed('mid') && speed('mid') > speed('far') && speed('far') > 0);
});

// ---------- background ----------
test('background covers the view', () => {
  const b = { x: -900, y: -1900, w: 2400, h: 2300 }, groundY = 241, r = 311;
  const m = R.rideBgMarkup(b, groundY, r);
  assert.match(m, /^<g id="rideBg"/);
  for (const { id } of R.LAYERS) {
    const tile = R.layerShift(id, 0, r).tile;
    assert.match(m, new RegExp(`<pattern id="rb-${id}"[^>]*width="${tile.toFixed(1)}"`), id);
    assert.ok(m.includes(`fill="url(#rb-${id})"`), `${id} used`);
  }
  // the sky reaches past every edge of the view and down to the ground
  const sky = m.match(/<rect class="rb-sky" x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/).slice(1).map(Number);
  assert.ok(sky[0] < b.x && sky[0] + sky[2] > b.x + b.w && sky[1] < b.y && sky[1] + sky[3] >= groundY, 'sky');
  const road = m.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="url\(#rb-road\)"/).slice(1).map(Number);
  assert.ok(road[1] <= groundY + 1 && road[1] + road[3] >= b.y + b.h, 'road from the ground to the bottom');
  assert.doesNotMatch(m, /(fill|stroke|stop-color)="#/, 'colours come from CSS variables');
});

test('applyRide shifts the four patterns', () => {
  const set = {};
  const svg = { querySelector: sel => ({ setAttribute: (k, v) => { set[sel] = [k, v]; } }) };
  R.applyRide(svg, { far: -10, mid: -20.5, near: -30, road: -40 });
  assert.deepEqual(Object.keys(set).sort(), ['#rb-far', '#rb-mid', '#rb-near', '#rb-road']);
  assert.deepEqual(set['#rb-mid'], ['patternTransform', 'translate(-20.5 0)']);
});
