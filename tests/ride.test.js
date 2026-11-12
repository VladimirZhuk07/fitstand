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
  assert.ok(road[1] <= groundY && road[1] + road[3] >= groundY, 'the road runs under the wheels'); // the verge below it: see the band test
  assert.doesNotMatch(m, /(fill|stroke|stop-color)="#/, 'colours come from CSS variables');
});

test('applyRide shifts the four patterns', () => {
  const set = {};
  const svg = { querySelector: sel => ({ setAttribute: (k, v) => { set[sel] = [k, v]; } }) };
  R.applyRide(svg, { far: -10, mid: -20.5, near: -30, road: -40 });
  assert.deepEqual(Object.keys(set).sort(), ['#rb-far', '#rb-mid', '#rb-near', '#rb-road']);
  assert.deepEqual(set['#rb-mid'], ['patternTransform', 'translate(-20.5 0)']);
});

// ---------- review fixes ----------
test('the head holds steady: only the breath moves it', () => {
  const M = require('../model.js'); Object.assign(globalThis, M); const Dr = require('../draw.js');
  for (const style of ['road', 'hybrid', 'city']) {
    const G = M.fit({ H: 178, I: 83, A: 61, W: 42, flex: 3, style }).g, { hip, ck } = Dr.geomPts(G), base = M.upperOf(G, hip, ck.hand);
    for (let t = 0; t < R.RIDE.PERIOD; t += 1 / 30) {
      const p = R.ridePose(t, 311), u = M.upperAt(G, hip, ck, p);
      assert.ok(Math.abs(u.head.x - base.head.x) < 0.5 && Math.abs(u.head.y - base.head.y - p.breath) < 0.5, `${style} t=${t}`);
      assert.ok(M.len(M.sub(u.shoulder, M.add(base.shoulder, M.V(0, p.breath)))) < 25, `${style}: shoulder sways up to 2 degrees`);
    }
  }
});

test('the scene speed follows the target wheel, not the tweening one', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /ridePose\(rideT,target\.wheelR,sceneId\(\)\)/);
  assert.match(html, /layerShift\(id,rideT,target\.wheelR,sceneId\(\)\)/);
});

test('the road is a band under the wheels, the grass is on the verge below it', () => {
  const b = { x: -900, y: -1900, w: 2400, h: 2300 }, groundY = 241, m = R.rideBgMarkup(b, groundY, 311);
  const road = m.match(/<rect x="([-\d.]+)" y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)" fill="url\(#rb-road\)"/).slice(1).map(Number);
  assert.ok(road[1] < groundY && road[1] + road[3] > groundY && road[3] <= 200, `road band ${road[1]}..${road[1] + road[3]}`);
  const verge = m.match(/<rect class="rb-verge" x="[-\d.]+" y="([-\d.]+)" width="[\d.]+" height="([\d.]+)"/).slice(1).map(Number);
  assert.ok(Math.abs(verge[0] - (road[1] + road[3])) < 1 && verge[0] + verge[1] >= b.y + b.h, 'verge from the road down to the bottom');
  const near = Number(m.match(/<pattern id="rb-near"[^>]* y="([-\d.]+)"/)[1]);
  assert.ok(near >= road[1] + road[3] - 1, 'grass and posts stand on the verge');
});

test('pattern content stays inside its tile (no seams, no clipped crowns)', () => {
  const m = R.rideBgMarkup({ x: -900, y: -1900, w: 2400, h: 2300 }, 241, 311);
  for (const id of ['mid', 'near']) {
    const p = m.match(new RegExp(String.raw`<pattern id="rb-${id}"[^>]* height="([\d.]+)">(.*?)</pattern>`)), h = Number(p[1]);
    for (const e of p[2].matchAll(/<ellipse[^>]* cy="([-\d.]+)"[^>]* ry="([\d.]+)"/g)) assert.ok(Number(e[1]) - Number(e[2]) >= 2 && Number(e[1]) + Number(e[2]) <= h, `${id}: ellipse ${e[1]}±${e[2]} in ${h}`);
    for (const e of p[2].matchAll(/<rect class="rb-(?:trunk|post)" x="[-\d.]+" y="([-\d.]+)"/g)) assert.ok(Number(e[1]) >= 2, `${id}: rect at ${e[1]}`);
  }
});

// ---------- scenes (feedback 5) ----------
const SCENE_IDS = ['default', 'road', 'city', 'mtb'];
const KMH = { road: [30, 35], city: [15, 18], mtb: [20, 28], default: [20, 24] };
const R2 = [...WHEELS, 203, 152.5];

test('sceneOf: a scene per style, unknown styles fall back to default', () => {
  const want = { road: 'road', city: 'city', mtb: 'mtb', fullsus: 'mtb', women: 'default', track: 'default', undefined: 'default', __proto__: 'default' };
  for (const k of ['road', 'city', 'mtb', 'fullsus', 'women', 'track']) assert.equal(R.sceneOf(k), want[k], k);
  for (const k of [undefined, '__proto__', 'constructor', null]) assert.equal(R.sceneOf(k), 'default', String(k));
});

test('scene speeds are in the seller ranges', () => {
  for (const id of SCENE_IDS) {
    const kmh = (R.speedOf(311, id) * 3.6) / 1000, [lo, hi] = KMH[id];
    assert.ok(kmh >= lo * 0.99 && kmh <= hi * 1.01, `${id}: ${kmh}`);
  }
  assert.equal(R.speedOf(311), R.speedOf(311, 'default'));
});

test('every scene keeps the wheel, the road and the layers in step', () => {
  for (const id of SCENE_IDS) for (const r of R2) {
    assert.ok(Number.isInteger(R.wheelRevs(r, id)) && R.wheelRevs(r, id) >= 1, `${id} R=${r}`);
    for (const t of frames().filter((_, i) => i % 6 === 0)) {
      const p = R.ridePose(t, r, id);
      assert.ok(Math.abs(p.ground - (p.wheel / 360) * 2 * Math.PI * r) < 0.5, `${id} road R=${r} t=${t}`);
      assert.ok(Math.abs(p.crank - 360 * 12 * (t / P)) < 1e-6);
    }
    const end = R.ridePose(P - 1e-9, r, id);
    assert.ok(Math.abs(end.wheel - 360 * R.wheelRevs(r, id)) < 1e-3, `${id} wheel loop`);
    for (const { id: lid, k } of R.LAYERS) {
      const { tile } = R.layerShift(lid, 0, r, id), n = (R.speedOf(r, id) * P * k) / tile;
      assert.ok(Math.abs(n - Math.round(n)) < 1e-9, `${id} ${lid} R=${r}`);
      assert.ok(tile >= 2400 && tile <= 5000, `${id} ${lid} tile ${tile}`);
    }
  }
});

test('roughness: bounded by the scene table, mtb rougher than road, seams invisible', () => {
  const peak = id => Math.max(...frames().map(t => Math.abs(R.ridePose(t, 311, id).bounce)));
  for (const id of SCENE_IDS) {
    const amp = R.SCENES[id].bounce.reduce((s, [a]) => s + a, 0);
    assert.ok(peak(id) <= amp + 0.01, id);
    const bn = t => R.ridePose(t, 311, id).bounce, step = Math.max(...frames().map(t => Math.abs(bn(t + 1 / 60) - bn(t))));
    assert.ok(Math.abs(bn(P - 1 / 60) - bn(0)) <= step + 1e-6, `${id} seam`);
  }
  assert.ok(peak('mtb') > peak('road') * 3);
});

test('changing the scene between frames never gives NaN', () => {
  for (const from of SCENE_IDS) for (const to of SCENE_IDS) for (const t of [0, 1.3, 4.4, 8.9]) {
    for (const id of [from, to]) {
      const p = R.ridePose(t, 311, id);
      for (const v of Object.values(p)) assert.ok(Number.isFinite(v), `${id} ${t}`);
      for (const { id: lid } of R.LAYERS) assert.ok(Number.isFinite(R.layerShift(lid, t, 311, id).x));
    }
  }
});

test('torso sway reaches 2 degrees, the head still holds', () => {
  const peak = Math.max(...frames().map(t => Math.abs(R.ridePose(t, 311).torso)));
  assert.ok(peak >= 1.9 && peak <= 2.0, `peak ${peak}`);
});

test('slowFrames: a slow device is detected after 60 frames', () => {
  assert.equal(R.slowFrames(Array(60).fill(0.016)), false);
  assert.equal(R.slowFrames(Array(60).fill(0.04)), true);
  assert.equal(R.slowFrames(Array(59).fill(0.04)), false);
  assert.equal(R.slowFrames([...Array(100).fill(0.04), ...Array(60).fill(0.016)]), false, 'only the last 60 count');
});

test('depth blur and the slow-device guard are wired in the page', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /\.rb-midlayer\{filter:blur\(\d+px\)\} \.rb-nearlayer\{filter:blur\(\d+px\)\}/);
  assert.match(html, /#bike\.no-blur \.rb-midlayer,#bike\.no-blur \.rb-nearlayer\{filter:none\}/);
  assert.match(html, /slowFrames\(frameDts\)/);
  assert.match(html, /classList\.toggle\('no-blur',blurOff\|\|!state\.playing\)/);
});

// ---------- scene backgrounds (feedback 5) ----------
const VIEW = { x: -900, y: -1900, w: 2400, h: 2300 };
const bg = (id, r = 311) => R.rideBgMarkup(VIEW, 241, r, id);
const patterns = m => [...m.matchAll(/<pattern id="rb-(\w+)"[^>]* width="([\d.]+)" height="([\d.]+)">(.*?)<\/pattern>/g)].map(x => ({ id: x[1], tile: +x[2], h: +x[3], inner: x[4] }));

test('every scene: patterns stay inside their tile, the scene is named, colours come from CSS', () => {
  for (const id of SCENE_IDS) for (const r of [311, 203]) {
    const m = bg(id, r);
    assert.match(m, new RegExp(`^<g id="rideBg" data-scene="${id}"`), id);
    assert.doesNotMatch(m, /(fill|stroke|stop-color)="#/, `${id}: colours from CSS variables`);
    for (const p of patterns(m)) {
      for (const e of p.inner.matchAll(/<rect[^>]* x="([-\d.]+)"[^>]* y="([-\d.]+)" width="([\d.]+)" height="([\d.]+)"/g))
        assert.ok(+e[1] >= -0.05 && +e[1] + +e[3] <= p.tile + 0.05 && +e[2] >= -0.05 && +e[2] + +e[4] <= p.h + 0.05, `${id}/${p.id}: rect ${e[0].slice(0, 70)}`);
      for (const e of p.inner.matchAll(/<ellipse[^>]* cx="([-\d.]+)" cy="([-\d.]+)" rx="([\d.]+)" ry="([\d.]+)"/g))
        if (p.id !== 'far') assert.ok(+e[2] - +e[4] >= 2 && +e[2] + +e[4] <= p.h && +e[1] - +e[3] >= -0.05 && +e[1] + +e[3] <= p.tile + 0.05, `${id}/${p.id}: ellipse ${e[0].slice(0, 70)}`);
    }
  }
});

test('road scene: open horizon, guardrail, signs, a dashed centre line; not the default trees', () => {
  const m = bg('road');
  for (const c of ['rb-barrier', 'rb-sign', 'rb-marking', 'rb-treeline']) assert.ok(m.includes(`class="${c}"`), c);
  assert.ok(!m.includes('class="rb-speck"') && !m.includes('class="rb-house"'));
  assert.ok(bg('default').includes('class="rb-tree"') && !bg('default').includes('rb-barrier'), 'the default scene is unchanged');
});

test('road scene: the tint is set per scene in CSS', () => {
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /#bike\[data-scene="road"\]\{--tint:#[0-9A-Fa-f]{6};--tk:\d+%\}/);
  assert.match(html, /\.rb-hill\{fill:color-mix\(in srgb,var\(--hill\),var\(--tint,transparent\) var\(--tk,0%\)\)\}/);
  assert.match(html, /bikeSvg\.dataset\.scene\s*=\s*sceneId\(\)/);
});

test('city scene: houses with windows, lamps, benches, flower beds, paving; not the road or default props', () => {
  const m = bg('city');
  for (const c of ['rb-house', 'rb-window', 'rb-lamp', 'rb-bench', 'rb-flower', 'rb-tile', 'rb-treeline']) assert.ok(m.includes(`class="${c}"`), c);
  assert.ok(!m.includes('class="rb-barrier"') && !m.includes('class="rb-speck"'));
  assert.ok(!bg('road').includes('rb-house'), 'the road scene has no houses');
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /#bike\[data-scene="city"\]\{--tint:#[0-9A-Fa-f]{6};--tk:\d+%\}/);
});

test('mtb scene: forest, dark trunks, boulders, roots, dappled light', () => {
  const m = bg('mtb');
  for (const c of ['rb-trunk-dark', 'rb-boulder', 'rb-root', 'rb-fern', 'rb-light', 'rb-treeline']) assert.ok(m.includes(`class="${c}"`), c);
  assert.ok(!m.includes('class="rb-barrier"') && !m.includes('class="rb-house"'));
  assert.deepEqual(R.SCENES.mtb.layers, { far: 'forest', mid: 'trunks', near: 'roots', road: 'dirt' });
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /#bike\[data-scene="mtb"\]\{--tint:#[0-9A-Fa-f]{6};--tk:\d+%\}/);
});

test('dust behind the rear wheel: six puffs, they drift back and fade, the loop is whole', () => {
  const key = ps => ps.map(p => `${p.dx.toFixed(4)}|${p.dy.toFixed(4)}|${p.r.toFixed(4)}|${p.o.toFixed(4)}`).sort().join();
  for (const t of [0, 0.7, 3.3, 8.8]) {
    const ps = R.effectPuffs(t, 'mtb');
    assert.equal(ps.length, 6);
    for (const p of ps) assert.ok(p.o >= 0 && p.o <= 0.65 + 1e-9 && p.r > 0 && p.dx < 0 && p.dy >= 0, JSON.stringify(p));
    assert.equal(key(ps), key(R.effectPuffs(t + P, 'mtb')), 'nine seconds');
    assert.equal(key(ps), key(R.effectPuffs(t + P / 6, 'mtb')), 'a puff lives a sixth of the loop');
  }
  // at t = 0 puff i is at i/6 of its life: further back, higher, bigger, fainter
  const ps = R.effectPuffs(0, 'mtb');
  for (let i = 1; i < 6; i++) assert.ok(ps[i].dx < ps[i - 1].dx && ps[i].dy > ps[i - 1].dy && ps[i].r > ps[i - 1].r && ps[i].o < ps[i - 1].o, `puff ${i}`);
  for (const id of ['road', 'city', 'default', 'nope']) assert.deepEqual(R.effectPuffs(1, id), []);
});

test('fx markup and applyFx', () => {
  assert.equal(R.fxMarkup('road'), '');
  const m = R.fxMarkup('mtb');
  assert.match(m, /^<g id="fx"/);
  assert.equal((m.match(/class="fx-dust"/g) || []).length, 6);
  const set = {};
  const el = sel => ({ setAttribute: (k, v) => { (set[sel] = set[sel] || {})[k] = v; } });
  R.applyFx({ querySelector: el }, R.effectPuffs(1, 'mtb'), { x: -400, y: 311 });
  assert.equal(Object.keys(set).filter(k => /^#fx-\d$/.test(k)).length, 6);
  assert.ok(Number.isFinite(+set['#fx-0'].cx) && +set['#fx-0'].cx < -400, 'behind the rear wheel');
  assert.equal(set['#fx'].display, 'inline');
  R.applyFx({ querySelector: el }, [], { x: -400, y: 311 });
  assert.equal(set['#fx'].display, 'none');
  const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(html, /fxMarkup\(sceneId\(\)\)/);
  assert.match(html, /applyFx\(bikeSvg,state\.playing\?effectPuffs\(rideT,sceneId\(\)\):\[\]/);
});
