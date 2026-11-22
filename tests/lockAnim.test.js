const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../lockAnim.js');

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test('steps follow the timeline', () => {
  const ts = [0, 2.99, 3, 4.99, 5, 6.99, 7, 9.99], want = [1, 1, 2, 2, 3, 3, 4, 4];
  ts.forEach((t, i) => assert.equal(L.lockState(t).step, want[i], `t=${t}`));
  assert.equal(L.LOCK_PERIOD, 10);
});

test('the loop closes without a jump', () => {
  const a = L.lockState(9.999), b = L.lockState(0);
  // flow is a direction sign (+1 on step 1, 0 at the end of step 4): it steps by design, so it is not in the seam check
  for (const k of ['c', 'lever', 'valve', 'hitD', 'hitA']) assert.ok(Math.abs(a[k] - b[k]) <= 0.01, k);
});

test('time wraps around the period', () => {
  assert.deepEqual(L.lockState(-1), L.lockState(9));
  assert.deepEqual(L.lockState(23), L.lockState(3));
});

test('compression: 0.7 at the end of step 1, almost none when locked', () => {
  near(L.lockState(3).c, 0.7);
  for (let i = 0; i < 300; i++) assert.ok(L.lockState(7 + i * 0.01).c <= 0.04 + 1e-9, `t=${7 + i * 0.01}`);
  assert.equal(L.lockState(5).c, 0);
});

test('the valve closes after the lever and both open at the end', () => {
  assert.ok(L.lockState(6).valve < L.lockState(6).lever);
  assert.equal(L.lockState(8).lever, 1);
  assert.equal(L.lockState(8).valve, 1);
  assert.ok(L.lockState(9.999).lever < 0.01);
});

test('oil flows only while the fork moves freely', () => {
  assert.equal(L.lockState(1).flow, 1);
  assert.equal(L.lockState(4).flow, -1);
  assert.equal(L.lockState(6).flow, 0);
  assert.equal(L.lockState(8).flow, 0);
});

test('the impact arrow comes, bounces, fades', () => {
  assert.equal(L.lockState(6.9).hitA, 0);
  near(L.lockState(7.8).hitD, 0, 1e-3);
  near(L.lockState(8.6).hitD, 0.6, 1e-3);
  assert.equal(L.lockState(9.5).hitA, 0);
});

test('sw caches lockAnim.js', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./lockAnim.js'"));
});

// ---- Task 2: the spring fork drawing and its frames ----
// the viewBox of the first drawing in the markup as [x0, y0, x1, y1]
const viewBoxOf = html => { const v = /viewBox="(-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+)"/.exec(html).slice(1).map(Number); return [v[0], v[1], v[0] + v[2], v[1] + v[3]]; };
const ids = html => [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
// inner markup of the <g> that carries the given id (balanced <g> … </g>)
function groupInner(html, id) {
  const start = html.indexOf(`<g id="${id}"`);
  assert.ok(start >= 0, `group ${id} not found`);
  const re = /<g\b|<\/g>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0] === '</g>' ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  throw new Error('unbalanced <g>');
}

test('spring cutaway: labelled parts and moving ids', () => {
  const svg = L.lockMarkup('spring');
  assert.ok(svg.includes('class="la-svg"') && svg.includes('data-lock="spring"') && svg.includes('viewBox="-6 10 912 890"'));
  const have = ids(svg);
  for (const id of ['la-lever', 'la-ind', 'la-needle', 'la-cross', 'la-flow', 'la-hit', 'la-move', 'la-spring']) assert.ok(have.includes(id), id);
  const labels = [...svg.matchAll(/<text class="la-label"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
  for (const w of ['Корона', 'Пружина', 'Демпфер', 'Клапан', 'Игла', 'Рычаг блокировки', 'Сальник', 'Нижняя нога']) assert.ok(labels.includes(w), w);
});

test('every id lockPose touches exists in the markup', () => {
  const have = new Set(ids(L.lockMarkup('spring')));
  let first = null;
  for (let t = 0; t <= 10; t += 0.25) {
    const list = L.lockPose('spring', L.lockState(t));
    const keys = list.map(p => p.id).join();
    if (first === null) first = keys;
    assert.equal(keys, first, `the id list is stable (t=${t})`);
    for (const p of list) assert.ok(have.has(p.id), `${p.id} at t=${t}`);
  }
});

test('the indicator always matches the lever', () => {
  for (let i = 0; i <= 200; i++) {
    const t = i * 0.05, s = L.lockState(t);
    const ind = L.lockPose('spring', s).find(p => p.id === 'la-ind');
    assert.equal(ind.attrs.class.includes('la-closed'), s.lever >= 0.5, `t=${t}`);
    assert.equal(ind.attrs.class.includes('la-open'), s.lever < 0.5, `t=${t}`);
  }
});

test('front view: two legs, the lever above the damper leg', () => {
  const svg = L.lockMarkup('spring');
  const move = groupInner(svg, 'la-move');
  assert.ok(move.includes('id="la-leg-l"') && move.includes('id="la-leg-r"'));
  const cx = id => Number(new RegExp('id="' + id + '"[^>]*data-cx="([0-9.]+)"').exec(svg)[1]);
  const lever = Number(/id="la-lever"[^>]*transform="translate\(([\d.]+)/.exec(svg)[1]);
  assert.ok(cx('la-leg-l') < cx('la-leg-r'));
  assert.ok(Math.abs(lever - cx('la-leg-r')) < Math.abs(lever - cx('la-leg-l')));
  // the lever keeps its pivot while it turns
  const pose = L.lockPose('spring', L.lockState(8)).find(p => p.id === 'la-lever');
  assert.equal(Number(/translate\(([\d.]+)/.exec(pose.attrs.transform)[1]), lever);
});

test('the lower legs rise with the compression', () => {
  const y = c => Number(/translate\(0 (-?[\d.]+)\)/.exec(L.lockPose('spring', { ...L.lockState(0), c }).find(p => p.id === 'la-move').attrs.transform)[1]);
  assert.equal(y(0) + 0, 0);
  near(y(0.7), -0.7 * 160, 0.01);
});

test('the spring shortens as the fork compresses', () => {
  const len = c => {
    const pts = L.lockPose('spring', { ...L.lockState(0), c }).find(p => p.id === 'la-spring').attrs.points.trim().split(/\s+/).map(q => q.split(',').map(Number));
    return Math.abs(pts[pts.length - 1][1] - pts[0][1]);
  };
  assert.ok(len(0.7) < len(0), `${len(0.7)} < ${len(0)}`);
});

test('the needle drops and the cross shows only while locked and hit', () => {
  const pose = t => Object.fromEntries(L.lockPose('spring', L.lockState(t)).map(p => [p.id, p.attrs]));
  assert.match(pose(2)['la-needle'].transform, /translate\(0 0\)/);
  assert.ok(!/translate\(0 0\)/.test(pose(8)['la-needle'].transform));
  assert.equal(pose(8)['la-cross'].opacity, 1);
  assert.equal(pose(2)['la-cross'].opacity, 0);
  assert.equal(pose(6)['la-cross'].opacity, 0);
  assert.equal(pose(1)['la-flow'].opacity, 1);
  assert.equal(pose(8)['la-flow'].opacity, 0);
  assert.notEqual(pose(1)['la-flow'].transform, pose(4)['la-flow'].transform);
});

test('applyLock sets the attributes on existing elements only', () => {
  const calls = [];
  const el = id => ({ setAttribute: (k, v) => calls.push([id, k, v]) });
  const svg = { querySelector: sel => (sel === '#la-move' ? el('la-move') : null) };
  L.applyLock(svg, [{ id: 'la-move', attrs: { transform: 'translate(0 -5)' } }, { id: 'la-none', attrs: { x: 1 } }]);
  assert.deepEqual(calls, [['la-move', 'transform', 'translate(0 -5)']]);
});

test('no Math.random in lockAnim.js', () => {
  assert.ok(!fs.readFileSync(path.join(__dirname, '..', 'lockAnim.js'), 'utf8').includes('Math.random'));
});

// ---- Task 3, step 0: shared parts and the review fixes ----
const flowSegments = svg => [...groupInner(svg, 'la-flow').matchAll(/<line x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)].map(m => m.slice(1).map(Number));
const mirrorOf = (kind, t) => Number(/translate\(0 ([\d.]+)\) scale\(1 -1\)/.exec(L.lockPose(kind, L.lockState(t)).find(p => p.id === 'la-flow').attrs.transform)[1]);

test('flow arrows keep clear of the needle, mirrored or not', () => {
  for (const kind of ['spring', 'air']) {
    const svg = L.lockMarkup(kind), segs = flowSegments(svg), m = mirrorOf(kind, 4);
    assert.ok(segs.length >= 4);
    const all = [...segs, ...segs.map(([x1, y1, x2, y2]) => [x1, m - y1, x2, m - y2])];
    for (const [x1, y1, x2, y2] of all) {
      // not clipped under the stanchion walls (the damper column is x 580…620)
      for (const x of [x1, x2]) assert.ok(Math.abs(x - 600) <= 17.5, `arrow end x=${x} too far out`);
      // no point of the arrow is on the needle cone (half-width 9 at y 234 down to 0 at y 264, 2 px of air)
      for (let u = 0; u <= 1; u += 0.05) {
        const x = x1 + (x2 - x1) * u, y = y1 + (y2 - y1) * u;
        if (y >= 234 && y <= 264) assert.ok(Math.abs(x - 600) >= 9 * (1 - (y - 234) / 30) + 2, `arrow point (${x},${y}) is on the needle`);
      }
    }
    // the upper pair starts at the valve seat (the gap between the plate pieces), not on the solid plate
    const upper = all.filter(s => s[1] >= 250 && s[1] <= 262);
    assert.ok(upper.length >= 2);
    for (const s of upper) assert.ok(Math.abs(s[0] - 600) <= 9, `starts at x=${s[0]}`);
    // the mirror axis is the sum of the group's extreme y: the mirrored group lands on the same spots, reversed
    const ys = segs.flatMap(s => [s[1], s[3]]);
    assert.equal(m, Math.min(...ys) + Math.max(...ys));
    const key = ([a, b, c, d]) => [a, b, c, d].join();
    const mirrored = new Set(segs.map(([x1, y1, x2, y2]) => key([x2, m - y2, x1, m - y1])));
    for (const s of segs) assert.ok(mirrored.has(key(s)), `${s} has no mirror partner`);
  }
});

test('the lever label line stays above the lever arc', () => {
  const svg = L.lockMarkup('spring');
  const m = /<text class="la-label"[^>]*y="([\d.]+)"[^>]*>Рычаг блокировки</.exec(svg);
  assert.ok(Number(m[1]) < 157 - 72 - 8, `label baseline ${m[1]}`);
  const line = /<path class="la-leader"[^>]*d="([^"]+)"[^>]*\/><circle class="la-leader-dot"[^>]*\/><text class="la-label"[^>]*>Рычаг блокировки</.exec(svg);
  assert.ok(line, 'the lever leader is a polyline that goes up first');
});

test('the hit arrow stays inside the picture even when far', () => {
  for (const kind of ['spring', 'air']) {
    const svg = L.lockMarkup(kind);
    const poly = /<g id="la-hit"[^>]*><polygon points="([^"]+)"/.exec(svg)[1];
    const maxY = Math.max(...poly.trim().split(/\s+/).map(p => Number(p.split(',')[1])));
    const far = L.lockPose(kind, { ...L.lockState(0), hitD: 1 }).find(p => p.id === 'la-hit');
    const dy = Number(/translate\(0 ([\d.]+)\)/.exec(far.attrs.transform)[1]);
    assert.ok(maxY + dy + 1.5 <= viewBoxOf(svg)[3], `tail at ${maxY + dy}`);
    assert.ok(/translate\(0 [\d.]+\)/.test(/<g id="la-hit"[^>]*transform="([^"]+)"/.exec(svg)[1]));
  }
});

test('the seal leader points at a part that does not move', () => {
  const svg = L.lockMarkup('spring');
  const move = groupInner(svg, 'la-move');
  const dot = /<circle class="la-leader-dot" cx="([\d.]+)" cy="([\d.]+)"[^>]*\/><text class="la-label"[^>]*>Сальник</.exec(svg);
  assert.ok(dot, 'seal dot');
  assert.ok(!move.includes('la-leader-dot'), 'the dot is not inside la-move');
  // the dot is static (no pose entry belongs to a leader) and sits on the stanchion bushing (y 520…536) whatever the compression
  for (const c of [0, 0.35, 0.7]) assert.ok(L.lockPose('spring', { ...L.lockState(0), c }).every(p => !p.id.includes('lead')), `c=${c}`);
  assert.ok(Number(dot[2]) >= 520 && Number(dot[2]) <= 536, `dot y ${dot[2]}`);
});

// ---- Task 3: the air fork ----
const particles = (c, cls = 'p') => {
  const pose = L.lockPose('air', { ...L.lockState(0), c });
  return pose.filter(p => new RegExp('^la-' + cls + '[0-9]+$').test(p.id)).map(p => [p.attrs.cx, p.attrs.cy]);
};
const meanDist = pts => {
  let s = 0, n = 0;
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { s += Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]); n++; }
  return s / n;
};

test('air cutaway: two chambers of particles, a bypass, labels', () => {
  const svg = L.lockMarkup('air'), have = ids(svg);
  assert.ok(svg.includes('data-lock="air"') && svg.includes('viewBox="-6 10 912 890"'));
  for (const id of ['la-lever', 'la-ind', 'la-needle', 'la-cross', 'la-flow', 'la-hit', 'la-move', 'la-bypass', 'la-leg-l', 'la-leg-r']) assert.ok(have.includes(id), id);
  for (let i = 0; i < 18; i++) assert.ok(have.includes('la-p' + i), 'la-p' + i);
  for (let i = 0; i < 12; i++) assert.ok(have.includes('la-n' + i), 'la-n' + i);
  assert.equal([...svg.matchAll(/class="la-pos"/g)].length, 18);
  assert.equal([...svg.matchAll(/class="la-neg"/g)].length, 12);
  const labels = [...svg.matchAll(/<text class="la-label"[^>]*>([^<]+)<\/text>/g)].map(m => m[1]);
  for (const w of ['Ниппель', 'Позитивная камера', 'Поршень', 'Негативная камера', 'Байпас', 'Демпфер', 'Клапан', 'Игла', 'Рычаг блокировки', 'Корона', 'Сальник', 'Нижняя нога']) assert.ok(labels.includes(w), w);
  assert.ok(svg.includes('#5EB8F0') && svg.includes('#F29A4A'));
});

test('air front view: two legs inside la-move, the lever above the damper leg', () => {
  const svg = L.lockMarkup('air'), move = groupInner(svg, 'la-move');
  assert.ok(move.includes('id="la-leg-l"') && move.includes('id="la-leg-r"'));
  const cx = id => Number(new RegExp('id="' + id + '"[^>]*data-cx="([0-9.]+)"').exec(svg)[1]);
  const lever = Number(/id="la-lever"[^>]*transform="translate\(([\d.]+)/.exec(svg)[1]);
  assert.ok(cx('la-leg-l') < cx('la-leg-r') && Math.abs(lever - cx('la-leg-r')) < Math.abs(lever - cx('la-leg-l')));
  // the nipple is above the left leg
  assert.ok(Number(/<text class="la-label" x="[\d.]+" y="([\d.]+)"[^>]*>Ниппель</.exec(svg)[1]) < 130);
});

test('positive chamber gets denser under compression', () => {
  assert.equal(particles(0).length, 18);
  const pist = 400 - 0.7 * 160;
  const left = particles(0.7).filter(([, y]) => y < pist); // the particles still in the shrunk chamber
  assert.equal(left.length, 14);
  assert.ok(meanDist(left) < meanDist(particles(0)), `${meanDist(left)} < ${meanDist(particles(0))}`);
});

test('bypass: four blue particles go from the positive to the negative chamber, the orange ones stay', () => {
  const blue = c => particles(c, 'p'), orange = c => particles(c, 'n');
  assert.equal(orange(0).length, 12);
  // at rest all blue are above the piston (y < 400), all orange below it (y > 414), inside the cavity (x 280…320)
  for (const [x, y] of blue(0)) assert.ok(x >= 280 && x <= 320 && y < 400, `blue (${x},${y})`);
  for (const [x, y] of orange(0)) assert.ok(x >= 280 && x <= 320 && y > 414, `orange (${x},${y})`);
  // at full compression four blue ones are below the piston, in the negative chamber, 14 stay above it
  const pist = 400 - 0.7 * 160;
  assert.equal(blue(0.7).filter(([, y]) => y > pist + 14).length, 4);
  assert.equal(blue(0.7).filter(([, y]) => y < pist).length, 14);
  // the orange ones never leave their chamber
  for (const c of [0, 0.1, 0.3, 0.5, 0.7]) for (const [x, y] of orange(c)) assert.ok(x >= 280 && x <= 320 && y > 400 - c * 160 + 14, `orange c=${c} (${x},${y})`);
  // on the way the travellers stand in the bypass tube outside the left stanchion wall (x 262…270)
  assert.ok(blue(0.3).some(([x]) => x >= 262 && x <= 270), 'someone is in the tube at c=0.3');
});

test('particles do not overlap at rest and at full compression', () => {
  for (const c of [0, 0.04, 0.7]) {
    const all = [...particles(c, 'p'), ...particles(c, 'n')];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const d = Math.hypot(all[i][0] - all[j][0], all[i][1] - all[j][1]);
      assert.ok(d >= 7.6, `c=${c}: ${i} and ${j} are ${d.toFixed(1)} px apart`);
    }
  }
});

test('chambers are light, particles have a dark outline, the bypass is a light tube outside the stanchion', () => {
  const svg = L.lockMarkup('air');
  assert.match(svg, /id="la-pos-bg"[^>]*fill="#D4ECFB"/);
  assert.match(svg, /id="la-neg-bg"[^>]*fill="#FDE3CC"/);
  assert.match(svg, /id="la-p0"[^>]*stroke="#1c2630"/);
  const tube = groupInner(svg, 'la-bypass');
  assert.ok(tube.includes('#B9C8D4'));
  assert.ok(Number(/<rect x="([\d.]+)"/.exec(tube)[1]) < 272, 'the tube is left of the stanchion wall (x 272)');
  // the Байпас leader dot is on the tube
  const dot = /<circle class="la-leader-dot" cx="([\d.]+)" cy="([\d.]+)"[^>]*\/><text class="la-label"[^>]*>Байпас</.exec(svg);
  assert.ok(dot && Number(dot[1]) >= 262 && Number(dot[1]) <= 270, 'bypass dot x');
});

test('particles depend only on the compression, not on the time', () => {
  const a = L.lockPose('air', { ...L.lockState(1.5) }), b = L.lockPose('air', { ...L.lockState(1.5), step: 3, flow: 0, hitD: 0.2, lever: 1 });
  const key = p => JSON.stringify(p.attrs);
  const pick = list => list.filter(p => /^la-[pn]\d+$/.test(p.id)).map(key);
  assert.deepEqual(pick(a), pick(b));
});

test('particles stand still while the lockout is closed', () => {
  const at = t => Object.fromEntries(L.lockPose('air', L.lockState(t)).filter(p => /^la-[pn]\d+$/.test(p.id)).map(p => [p.id, p.attrs]));
  for (let t = 7; t < 9.4 - 1e-9; t += 0.1) {
    const a = at(t), b = at(t + 0.1);
    for (const id of Object.keys(a)) {
      const d = Math.hypot(a[id].cx - b[id].cx, a[id].cy - b[id].cy);
      assert.ok(d <= 0.6, `${id} moved ${d} at t=${t.toFixed(1)}`);
    }
  }
});

test('air: the loop closes', () => {
  const at = t => Object.fromEntries(L.lockPose('air', L.lockState(t)).filter(p => /^la-[pn]\d+$/.test(p.id)).map(p => [p.id, p.attrs]));
  const a = at(9.999), b = at(0);
  for (const id of Object.keys(a)) assert.ok(Math.hypot(a[id].cx - b[id].cx, a[id].cy - b[id].cy) <= 1, id);
});

test('air: every id lockPose touches exists', () => {
  const have = new Set(ids(L.lockMarkup('air')));
  let first = null;
  for (let t = 0; t <= 10; t += 0.25) {
    const list = L.lockPose('air', L.lockState(t)), keys = list.map(p => p.id).join();
    if (first === null) first = keys;
    assert.equal(keys, first, `the id list is stable (t=${t})`);
    for (const p of list) assert.ok(have.has(p.id), `${p.id} at t=${t}`);
  }
  assert.ok(first.includes('la-lever') && first.includes('la-needle') && first.includes('la-move'));
});

test('air: the legs rise with the compression and the piston with them', () => {
  const y = (id, c) => Number(/translate\(0 (-?[\d.]+)\)/.exec(L.lockPose('air', { ...L.lockState(0), c }).find(p => p.id === id).attrs.transform)[1]);
  for (const id of ['la-move', 'la-apiston', 'la-piston']) near(y(id, 0.7), -0.7 * 160, 0.01);
});

test('the damper piston is posed once per kind, with the shared parts', () => {
  for (const kind of ['spring', 'air']) {
    const list = L.lockPose(kind, L.lockState(2)).map(p => p.id);
    assert.equal(list.filter(id => id === 'la-piston').length, 1, kind);
    assert.ok(list.indexOf('la-piston') < list.indexOf('la-hit'), 'la-piston belongs to the shared part');
  }
});

test('the bypass travellers are drawn over the tube and the wall, not under them', () => {
  const svg = L.lockMarkup('air');
  const tube = svg.indexOf('id="la-bypass"');
  assert.ok(tube > 0);
  for (const i of [0, 2, 3, 5]) assert.ok(svg.indexOf(`id="la-p${i}"`) > svg.indexOf('<g id="la-bypass"'), `la-p${i} is drawn after the tube`);
  // and the wall (the stanchion is drawn in forkTop, before the "after" slot)
  assert.ok(svg.indexOf('id="la-p0"') > svg.indexOf('id="la-lever"'));
  // at c=0.3 a traveller stands inside the tube's x range
  const pts = L.lockPose('air', { ...L.lockState(0), c: 0.3 }).filter(p => /^la-p(0|2|3|5)$/.test(p.id)).map(p => p.attrs.cx);
  assert.ok(pts.some(x => x >= 262 && x <= 270), `traveller x: ${pts}`);
});

test('the lower oil arrows end above the damper piston head at full compression', () => {
  const segs = flowSegments(L.lockMarkup('air'));
  const lowest = Math.max(...segs.flatMap(s => [s[1], s[3]]));
  assert.ok(lowest + 2 <= 430 - 0.7 * 160, `lowest arrow y ${lowest}`);
});

// ---- Task 4: the rear shock (side view, horizontal body; the shaft and the far eye slide left) ----
const poseOf = (kind, st) => Object.fromEntries(L.lockPose(kind, st).map(p => [p.id, p.attrs]));
const labelsOf = svg => [...svg.matchAll(/<text class="la-label" x="([\d.]+)" y="([\d.]+)" text-anchor="(\w+)"[^>]*font-size="(\d+)"[^>]*>([^<]+)<\/text>/g)]
  .map(m => ({ x: Number(m[1]), y: Number(m[2]), anchor: m[3], fs: Number(m[4]), text: m[5] }));
// a rough box of a label: Arial, about 0.58 em per letter (measured in a browser: the widest label is 0.57 em per letter), 0.8 em above the baseline, 0.2 em below
const boxOf = (l, dx = 0) => {
  const w = l.text.length * l.fs * 0.58, x0 = l.anchor === 'middle' ? l.x - w / 2 : l.anchor === 'end' ? l.x - w : l.x;
  return [x0 + dx, l.y - l.fs * 0.8, x0 + w + dx, l.y + l.fs * 0.2];
};
const overlap = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const SH = L.SHOCK_LAYOUT, SHOCK_CY = SH.cy, TS = L.TRAVEL_SHOCK;
const AIR_X0 = SH.bodyR + 12;          // the inner face of the left can cap
const hitTip = SH.eye2 + SH.eyeR + 6;  // the tip of the impact arrow when it touches the far eye

test('shock cutaway: two eyes, a shaft, labels, moving ids', () => {
  const svg = L.lockMarkup('shock'), have = ids(svg);
  assert.ok(svg.includes('class="la-svg"') && svg.includes('data-lock="shock"') && svg.includes('viewBox="10 44 984 438"'));
  for (const id of ['la-eye1', 'la-eye2', 'la-shaft', 'la-move', 'la-piston', 'la-lever', 'la-ind', 'la-needle', 'la-flow', 'la-cross', 'la-hit']) assert.ok(have.includes(id), id);
  // the far eye and the shaft slide inside la-move, the near eye (frame side) stays out of it
  const move = groupInner(svg, 'la-move');
  assert.ok(move.includes('id="la-eye2"') && move.includes('id="la-shaft"') && !move.includes('id="la-eye1"'));
  const labels = labelsOf(svg).map(l => l.text);
  for (const w of ['Проушина', 'Воздушная камера', 'Шток', 'Демпфер', 'Клапан', 'Игла', 'Рычаг блокировки']) assert.ok(labels.includes(w), w);
  assert.ok(svg.includes('#D4ECFB'), 'the air can is a pastel chamber');
  // eye1 is on the left, eye2 on the right, the lever sits on the body between them
  const eyeX = id => Number(new RegExp('<g id="' + id + '"[^>]*>(?:<[^>]*>)*?<circle cx="([\\d.]+)"').exec(svg)[1]);
  const lever = Number(/id="la-lever"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)/.exec(svg)[1]);
  assert.ok(eyeX('la-eye1') < lever && lever < eyeX('la-eye2'));
});

test('shock: every id lockPose touches exists', () => {
  const have = new Set(ids(L.lockMarkup('shock')));
  let first = null;
  for (let t = 0; t <= 10; t += 0.25) {
    const list = L.lockPose('shock', L.lockState(t)), keys = list.map(p => p.id).join();
    if (first === null) first = keys;
    assert.equal(keys, first, `the id list is stable (t=${t})`);
    for (const p of list) assert.ok(have.has(p.id), `${p.id} at t=${t}`);
  }
  assert.equal(first.split(',').filter(id => id === 'la-piston').length, 1);
});

test('shock: the shaft moves horizontally', () => {
  assert.equal(L.TRAVEL_SHOCK, 120);
  const tr = (id, c) => poseOf('shock', { ...L.lockState(0), c })[id].transform;
  for (const id of ['la-move', 'la-piston', 'la-lead-eye2']) {
    for (const c of [0, 0.04, 0.35, 0.7, 1]) {
      const m = /^translate\((-?[\d.]+) (-?[\d.]+)\)$/.exec(tr(id, c));
      assert.ok(m, `${id} c=${c}: ${tr(id, c)}`);
      near(Number(m[1]), -c * 120, 0.01);   // only x changes, to the left
      assert.equal(Number(m[2]), 0);
      assert.ok(!/(^|[ (])-0([ )]|$)/.test(tr(id, c)), 'no negative zero');
    }
  }
  assert.equal(tr('la-move', 0), 'translate(0 0)');
  // the hit arrow is held back to the right (away from the eye)
  assert.match(poseOf('shock', { ...L.lockState(0), hitD: 1 })['la-hit'].transform, /^translate\(60 0\)$/);
  assert.match(poseOf('shock', { ...L.lockState(0), hitD: 0 })['la-hit'].transform, /^translate\(0 0\)$/);
});

test('shock: the oil flow mirrors about a vertical axis and keeps clear of the valve and the piston', () => {
  const svg = L.lockMarkup('shock'), segs = flowSegments(svg), px = SH.px, cy = SHOCK_CY;
  assert.ok(segs.length >= 4);
  const fwd = poseOf('shock', L.lockState(1))['la-flow'], back = poseOf('shock', L.lockState(4))['la-flow'];
  assert.equal(fwd.transform, 'translate(0 0)');
  const m = Number(/^translate\(([\d.]+) 0\) scale\(-1 1\)$/.exec(back.transform)[1]);
  const xs = segs.flatMap(s => [s[0], s[2]]);
  assert.equal(m, Math.min(...xs) + Math.max(...xs), 'the axis is the sum of the extreme x');
  assert.equal(m, 2 * px, 'the axis is the valve partition');
  // compression: every arrow points left (the shaft goes left, the oil goes through the valve to the left)
  for (const [x1, , x2] of segs) assert.ok(x2 < x1, `arrow ${x1}->${x2} points left`);
  // the mirrored arrows land on the same spots, reversed
  const key = a => a.join();
  const have = new Set(segs.map(key));
  for (const [x1, y1, x2, y2] of segs) assert.ok(have.has(key([m - x2, y2, m - x1, y1])), `no partner for ${x1},${y1}`);
  for (const [x1, y1, x2, y2] of segs) {
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      assert.ok(Math.abs(x - px) >= 14, `arrow end x=${x} is on the valve partition or the needle bore`);
      assert.ok(y >= cy - 42 + 6 && y <= cy + 42 - 6, `arrow end y=${y} is outside the oil`);
    }
  }
  // the right-hand tails stop short of the piston head at c = 0.7 (left face pistX - 0.7 * travel)
  assert.ok(Math.max(...xs) + 2 <= SH.pistX - 0.7 * TS, `rightmost arrow x ${Math.max(...xs)}`);
  assert.equal(poseOf('shock', L.lockState(8))['la-flow'].opacity, 0);
});

test('shock: the needle plug fills the orifice when it drops, the cross shows only then', () => {
  const svg = L.lockMarkup('shock'), cy = SHOCK_CY;
  const needle = groupInner(svg, 'la-needle');
  const poly = /<polygon points="([^"]+)"/.exec(needle)[1].trim().split(/\s+/).map(p => p.split(',').map(Number));
  const bottom = Math.max(...poly.map(p => p[1])), orifice = [cy - 14, cy + 14];
  assert.equal(bottom, orifice[0], 'the plug sits right above the orifice when the valve is open');
  const drop = Number(/translate\(0 ([\d.]+)\)/.exec(poseOf('shock', L.lockState(8))['la-needle'].transform)[1]);
  assert.equal(bottom + drop, orifice[1], 'the closed plug reaches the bottom of the orifice');
  assert.equal(poseOf('shock', L.lockState(8))['la-cross'].opacity, 1);
  assert.equal(poseOf('shock', L.lockState(2))['la-cross'].opacity, 0);
  assert.equal(poseOf('shock', L.lockState(6))['la-cross'].opacity, 0);
});

test('shock: the hit arrow comes from the right and stays inside the picture even when far', () => {
  const svg = L.lockMarkup('shock');
  const poly = /<g id="la-hit"[^>]*><polygon points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map(p => p.split(',').map(Number));
  const tip = poly.reduce((a, p) => (p[0] < a[0] ? p : a)), tail = Math.max(...poly.map(p => p[0]));
  assert.equal(tip[1], SHOCK_CY, 'the tip is on the axis');
  assert.equal(tip[0], hitTip, 'the tip touches the far eye');
  assert.ok(tail + 60 + 1.5 <= viewBoxOf(svg)[2], `tail at ${tail + 60}`);
  assert.ok(/translate\(60 0\)/.test(/<g id="la-hit"[^>]*transform="([^"]+)"/.exec(svg)[1]));
});

test('shock: the lever label line stays above the lever arc', () => {
  const svg = L.lockMarkup('shock');
  const lever = /id="la-lever"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)/.exec(svg);
  const lab = /<text class="la-label"[^>]*y="([\d.]+)"[^>]*>Рычаг блокировки</.exec(svg);
  assert.ok(Number(lab[1]) < Number(lever[2]) - 72 - 8, `label baseline ${lab[1]}`);
  assert.ok(/<path class="la-leader"[^>]*d="M [\d.]+ [\d.]+ V [\d.]+ H [\d.]+"[^>]*\/><circle class="la-leader-dot"[^>]*\/><text class="la-label"[^>]*>Рычаг блокировки</.test(svg), 'goes up first');
  // the lever swings above the body: even closed (+30 degrees) its tip stays above the body top
  assert.ok(Number(lever[2]) + 72 * Math.sin(Math.PI / 6) + 8 <= SHOCK_CY - 50, 'closed lever clears the body');
});

test('shock: labels stay clear of every moving part through the whole travel', () => {
  const svg = L.lockMarkup('shock'), cy = SHOCK_CY, eye2Group = groupInner(svg, 'la-lead-eye2');
  const all = labelsOf(svg), movingText = labelsOf(eye2Group)[0], vb = viewBoxOf(svg);
  const hit = /<g id="la-hit"[^>]*><polygon points="([^"]+)"/.exec(svg)[1].trim().split(/\s+/).map(p => p.split(',').map(Number));
  const farShift = Number(/translate\(([\d.]+) 0\)/.exec(poseOf('shock', { ...L.lockState(0), hitD: 1 })['la-hit'].transform)[1]);
  const hitBox = [hitTip, cy - 20, Math.max(...hit.map(p => p[0])) + farShift, cy + 20];
  assert.ok(movingText && movingText.text === 'Проушина');
  const still = all.filter(l => !(l.x === movingText.x && l.y === movingText.y && l.text === movingText.text));
  assert.equal(still.length, all.length - 1);
  for (let c = 0; c <= 1.0001; c += 0.1) {
    const d = -c * TS;
    const moving = [
      [SH.eye2 - SH.eyeR + d, cy - SH.eyeR, SH.eye2 + SH.eyeR + d, cy + SH.eyeR],   // the far eye
      [SH.pistX + d, cy - 38, SH.pistX + SH.pistW + d, cy + 38],                    // the damper piston head
      [SH.pistX + SH.pistW + d, cy - 6, SH.eye2 + d, cy + 6],                       // the shaft
      [SH.airPist + d, cy - 67, SH.airPist + SH.airW + d, cy + 67],                 // the air piston
      hitBox,                                                                       // the impact arrow (near … far)
    ];
    for (const l of still) for (const b of moving) assert.ok(!overlap(boxOf(l), b), `${l.text} meets a moving part at c=${c.toFixed(1)}`);
    for (const l of still) assert.ok(!overlap(boxOf(l), boxOf(movingText, d)), `${l.text} meets the moving label at c=${c.toFixed(1)}`);
    const mb = boxOf(movingText, d);
    assert.ok(mb[0] >= vb[0] && mb[2] <= vb[2], 'the moving label stays inside the picture');
  }
  for (const l of all) { const b = boxOf(l); assert.ok(b[0] >= vb[0] && b[2] <= vb[2] && b[1] >= vb[1] && b[3] <= vb[3], `${l.text} inside the viewBox`); }
  // no label sits on another
  for (let i = 0; i < still.length; i++) for (let j = i + 1; j < still.length; j++) assert.ok(!overlap(boxOf(still[i]), boxOf(still[j])), `${still[i].text} / ${still[j].text}`);
  // the static leader lines (after their first 8 px) never enter the swept area of the far eye, the shaft or the hit arrow
  const sweep = [[SH.eye2 - TS - SH.eyeR, cy - SH.eyeR, SH.eye2 + SH.eyeR, cy + SH.eyeR], hitBox];
  const stripped = svg.replace(eye2Group, '');
  for (const m of stripped.matchAll(/<line class="la-leader" x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)) {
    const [x1, y1, x2, y2] = m.slice(1).map(Number), len = Math.hypot(x2 - x1, y2 - y1);
    for (let s = 8; s <= len; s += 2) {
      const x = x1 + (x2 - x1) * s / len, y = y1 + (y2 - y1) * s / len;
      for (const b of sweep) assert.ok(!(x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3]), `leader (${x1},${y1}) passes through a moving part at (${x},${y})`);
    }
  }
});

test('shock: the leader dots sit on their parts', () => {
  const svg = L.lockMarkup('shock'), cy = SHOCK_CY;
  const dotOf = name => { const m = new RegExp('<circle class="la-leader-dot" cx="([\\d.]+)" cy="([\\d.]+)"[^>]*/><text class="la-label"[^>]*>' + name + '<').exec(svg); assert.ok(m, name); return [Number(m[1]), Number(m[2])]; };
  const [sx, sy] = dotOf('Шток');
  assert.equal(sy, cy);
  assert.ok(sx > SH.canR && sx < SH.eye2 - TS - SH.eyeR, 'the shaft dot is on the part of the shaft that is always outside the can');
  const [nx, ny] = dotOf('Игла');
  assert.equal(nx, SH.px);
  assert.ok(ny > cy - 78 && ny < cy - 50, 'the needle dot is on the stem between the lever housing and the body');
  const [vx, vy] = dotOf('Клапан');
  assert.equal(vx, SH.px);
  assert.ok(vy >= cy + 14 && vy <= cy + 42, 'the valve dot is on the lower half of the partition');
  const [dx, dy] = dotOf('Демпфер');
  assert.ok(dx > SH.pistX + SH.pistW && dx < SH.bodyR - 14 && dy > cy + 6 && dy < cy + 42, 'the damper dot is in the oil right of the piston, which never goes there');
  const [ax, ay] = dotOf('Воздушная камера');
  // left of the full sweep of the air piston: inside the positive chamber for every c from 0 to 1
  assert.ok(ax > AIR_X0 && ax < SH.airPist - TS && ay > cy - 67 && ay < cy - 6, 'the air dot is in the positive chamber');
});

// ---- carried from the Task 3 review: the lower fork arrows end clear of the valve plate ----
test('fork: the lower oil arrows end in the valve gap, not on the plate underside', () => {
  for (const kind of ['spring', 'air']) {
    const segs = flowSegments(L.lockMarkup(kind)), bot = Math.max(...segs.flatMap(s => [s[1], s[3]]));
    const lower = segs.filter(s => s[1] === bot);
    assert.equal(lower.length, 2, kind);
    for (const [, , x2, y2] of lower) {
      assert.ok(Math.abs(x2 - 600) <= 4.5, `${kind}: tip x=${x2}`);
      assert.ok(y2 >= 282 + 3, `${kind}: tip y=${y2} is too close to the plate underside (y 282)`);
    }
  }
});

// ---- Task 4, fix round 1: the air spring compresses ----
const chamber = c => poseOf('shock', { ...L.lockState(0), c })['la-sh-pos'];

test('shock: the positive air chamber shrinks and gets denser as the shock compresses', () => {
  const w = c => chamber(c).width, o = c => chamber(c)['fill-opacity'];
  near(w(0), SH.airPist - AIR_X0, 0.01);
  near(w(0.7), SH.airPist - 0.7 * TS - AIR_X0, 0.01);
  let prevW = Infinity, prevO = -Infinity;
  for (let c = 0; c <= 1.0001; c += 0.1) {
    assert.ok(w(c) < prevW && o(c) > prevO, `c=${c.toFixed(1)}`);
    assert.ok(w(c) > 0, 'the chamber never closes');
    prevW = w(c); prevO = o(c);
  }
  assert.ok(o(0.7) <= 1 && o(0) > 0);
  // it depends on c only: not on the step, the lever or the time
  assert.deepEqual(chamber(0.35), poseOf('shock', { ...L.lockState(0), c: 0.35, step: 3, lever: 1, valve: 1, flow: 0, hitD: 0.2 })['la-sh-pos']);
});

test('shock: the air piston is on the shaft, inside the can, and slides with it', () => {
  const svg = L.lockMarkup('shock'), move = groupInner(svg, 'la-move');
  assert.ok(move.includes('id="la-sh-apiston"'), 'the air piston is a child of la-move');
  assert.match(svg, /id="la-sh-pos"[^>]*fill="#5EB8F0"/);
  const x = Number(/id="la-sh-apiston"[^>]*\sx="([\d.]+)"/.exec(move)[1]), wd = Number(/id="la-sh-apiston"[^>]*\swidth="([\d.]+)"/.exec(move)[1]);
  assert.equal(x, SH.airPist);
  assert.equal(wd, SH.airW);
  // at full travel it still stands right of the left cap, at rest left of the right cap
  assert.ok(x - TS > AIR_X0 && x + wd < SH.canR - 12);
  // the positive chamber starts at the left cap and ends at the piston face, whatever c is
  assert.match(svg, new RegExp('id="la-sh-pos"[^>]*x="' + AIR_X0 + '"'));
});

test('shock: the lever housing stands on the body', () => {
  const svg = L.lockMarkup('shock'), cy = SHOCK_CY;
  const posts = [...svg.matchAll(/<rect class="la-post" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/g)].map(m => m.slice(1).map(Number));
  assert.equal(posts.length, 2, 'two posts, the needle stem stays visible between them');
  for (const [x, y, w, h] of posts) {
    assert.ok(y + h >= cy - 50, 'the post reaches the body top');
    assert.ok(y <= cy - 100 + 22 + 1, 'the post starts at the housing');
    assert.ok(Math.abs(x + w / 2 - SH.px) > 3 + w / 2, 'the post is off the needle stem');
  }
});

// ---- Task 5: the page block with steps, pause and reduced motion ----
const STEP_NAMES = ['1 Сжатие', '2 Отбой', '3 Блокировка', '4 Удар'];

test('lockBlock: four step buttons, a play button, a live caption', () => {
  for (const kind of ['spring', 'air', 'shock']) {
    const h = L.lockBlock(kind);
    assert.ok(h.startsWith(`<section class="lock-anim" data-lock-kind="${kind}">`), kind);
    assert.ok(h.includes(`data-lock="${kind}"`), 'the drawing is inside');
    assert.match(h, /<p class="la-caption" aria-live="polite">/);
    assert.match(h, /role="radiogroup"/);
    for (let i = 1; i <= 4; i++) {
      assert.match(h, new RegExp(`<button[^>]*role="radio"[^>]*data-lock-step="${i}"[^>]*>${STEP_NAMES[i - 1]}</button>`), `step ${i}`);
    }
    assert.equal([...h.matchAll(/data-lock-step="/g)].length, 4);
    assert.equal([...h.matchAll(/role="radio"/g)].length, 4);
    assert.equal([...h.matchAll(/aria-checked="true"/g)].length, 1, 'one step is current');
    assert.match(h, /<button[^>]*data-lock-play[^>]*>Пауза<\/button>/);
  }
  assert.equal(L.lockBlock('nope'), '');
});

test('captions: the shock says амортизатор', () => {
  assert.equal(L.LOCK_CAPTIONS.length, 4);
  assert.equal(L.captionOf('air', 1), 'Блокировка открыта: вилка сжимается на кочке, масло свободно проходит через клапан');
  assert.equal(L.captionOf('spring', 2), 'Отбой: вилка возвращается, масло течёт обратно');
  assert.equal(L.captionOf('air', 3), 'Рычаг повернули: индикатор красный, игла перекрывает масло');
  assert.equal(L.captionOf('spring', 4), 'Удар при закрытой блокировке: масло не проходит, вилка не сжимается');
  for (let s = 1; s <= 4; s++) {
    assert.ok(!/вилк/.test(L.captionOf('shock', s)), `shock step ${s}`);
    assert.ok(L.captionOf('air', s).length > 20);
  }
  assert.equal(L.captionOf('shock', 1), 'Блокировка открыта: амортизатор сжимается на кочке, масло свободно проходит через клапан');
  assert.equal(L.captionOf('shock', 2), 'Отбой: амортизатор возвращается, масло течёт обратно');
  assert.equal(L.captionOf('shock', 4), 'Удар при закрытой блокировке: масло не проходит, амортизатор не сжимается');
  assert.ok(L.lockBlock('shock').includes('амортизатор сжимается'));
});

// a fake page: rAF callbacks are kept and run by hand; the root keeps its click listeners and a few elements
function fakeLockWin(reduce) {
  const q = [];
  return { q, requestAnimationFrame: cb => q.push(cb), matchMedia: () => ({ matches: reduce }) };
}
function fakeLockRoot({ elements = false } = {}) {
  const mk = (attrs = {}) => ({ attrs: { ...attrs }, textContent: '', setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; } });
  const steps = [1, 2, 3, 4].map(i => { const b = mk({ 'aria-checked': i === 1 ? 'true' : 'false', tabindex: i === 1 ? '0' : '-1' }); b.dataset = { lockStep: String(i) }; b.hasAttribute = k => k === 'data-lock-step'; b.closest = () => b; b.focused = 0; b.focus = () => { b.focused++; }; return b; });
  const play = mk(); play.dataset = {}; play.hasAttribute = k => k === 'data-lock-play'; play.closest = () => play;
  // the texts count their writes: the live caption and the play button must not be rewritten with the same text
  const counted = (el, init) => { let v = init; el.writes = 0; Object.defineProperty(el, 'textContent', { get: () => v, set: x => { el.writes++; v = x; } }); return el; };
  counted(play, 'Пауза');
  const cap = counted(mk({ 'aria-live': 'polite' }), L.captionOf('air', 1)), svg = mk(); // the markup shows the play text and the step 1 caption
  const els = {}; svg.queries = 0; svg.sets = 0;
  svg.querySelector = sel => {
    svg.queries++;
    if (!elements) return null;
    const id = sel.slice(1);
    return els[id] || (els[id] = { setAttribute(k, v) { svg.sets++; this['a_' + k] = String(v); } });
  };
  const listeners = [];
  return {
    isConnected: true, steps, play, cap, svg, listeners,
    addEventListener(type, fn) { listeners.push([type, fn]); },
    removeEventListener(type, fn) { const i = listeners.findIndex(l => l[0] === type && l[1] === fn); if (i >= 0) listeners.splice(i, 1); },
    click(btn) { for (const [type, fn] of [...listeners]) if (type === 'click') fn({ target: btn }); },
    key(btn, key) { const ev = { key, target: btn, prevented: false, preventDefault() { this.prevented = true; } }; for (const [type, fn] of [...listeners]) if (type === 'keydown') fn(ev); return ev; },
    querySelector(sel) { return sel === '.la-caption' ? cap : sel === '[data-lock-play]' ? play : sel === 'svg.la-svg' ? svg : null; },
    querySelectorAll(sel) { return sel === '[data-lock-step]' ? steps : []; },
  };
}

test('reduced motion: paused on the impact', () => {
  const win = fakeLockWin(true), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'air', win);
  const s = a.state();
  assert.equal(s.playing, false);
  assert.equal(s.t, 7.8);
  assert.equal(root.steps[3].getAttribute('aria-checked'), 'true');
  assert.equal(root.steps[0].getAttribute('aria-checked'), 'false');
  assert.equal(root.cap.textContent, L.captionOf('air', 4));
  assert.equal(root.play.textContent, 'Пуск');
  win.q.shift()(1000); win.q.shift()(2000);
  assert.equal(a.state().t, 7.8, 'the time stands still');
});

test('time advances, capped per frame; the caption and the radios follow the step', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'shock', win);
  assert.equal(a.state().playing, true);
  assert.equal(root.play.textContent, 'Пауза');
  win.q.shift()(1000); win.q.shift()(1016);
  assert.ok(a.state().t > 0.015 && a.state().t < 0.017);
  win.q.shift()(61016); // a minute in the background
  assert.ok(a.state().t < 0.07, 'no jump after the tab comes back');
  assert.equal(root.cap.textContent, L.captionOf('shock', 1));
  let now = 61016;
  while (a.state().t < 3.2) { now += 50; win.q.shift()(now); }
  assert.equal(root.cap.textContent, L.captionOf('shock', 2));
  assert.equal(root.steps[1].getAttribute('aria-checked'), 'true');
  assert.equal(root.steps[0].getAttribute('aria-checked'), 'false');
});

test('a step button jumps and pauses', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'spring', win);
  win.q.shift()(1000);
  root.click(root.steps[2]);
  assert.equal(a.state().t, 5);
  assert.equal(a.state().playing, false);
  assert.equal(root.steps[2].getAttribute('aria-checked'), 'true');
  assert.equal(root.cap.textContent, L.captionOf('spring', 3));
  assert.equal(root.play.textContent, 'Пуск');
  root.click(root.steps[3]);
  assert.equal(a.state().t, 7.8, 'step 4 is the moment of the impact');
  root.click(root.steps[0]);
  assert.equal(a.state().t, 0);
  root.click(root.steps[1]);
  assert.equal(a.state().t, 3);
  win.q.shift()(2000); win.q.shift()(3000);
  assert.equal(a.state().t, 3, 'paused: the time does not move');
  root.click(root.play);
  assert.equal(a.state().playing, true);
  assert.equal(root.play.textContent, 'Пауза');
  win.q.shift()(4000); win.q.shift()(4016);
  assert.ok(a.state().t > 3.015 && a.state().t < 3.017, 'resumes from where it stood');
});

test('the loop stops when the block leaves the page', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  L.startLockAnim(root, 'air', win);
  assert.equal(win.q.length, 1);
  win.q.shift()(1000);
  assert.equal(win.q.length, 1, 'keeps running while on the page');
  root.isConnected = false;
  win.q.shift()(1016);
  assert.equal(win.q.length, 0, 'no new frame after leaving');
});

test('stop() ends the loop and the click handler; a second start on the same element leaves one loop', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'air', win);
  win.q.shift()(1000);
  a.stop();
  win.q.shift()(1016);
  assert.equal(win.q.length, 0, 'no frame after stop');
  assert.equal(root.listeners.length, 0, 'the click handler is gone');
  const w2 = fakeLockWin(false), r2 = fakeLockRoot();
  const b1 = L.startLockAnim(r2, 'air', w2), b2 = L.startLockAnim(r2, 'air', w2);
  assert.deepEqual(r2.listeners.map(l => l[0]).sort(), ['click', 'keydown'], 'one click and one keydown handler');
  w2.q.shift()(1000); w2.q.shift()(1016);
  assert.equal(w2.q.length, 1, 'only the second loop is alive');
  r2.click(r2.play);
  assert.equal(b2.state().playing, false, 'one click toggles once');
  assert.equal(b1.state().playing, true, 'the first controller no longer reacts');
});

test('the page loads lockAnim.js before guide.js and styles the block', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const a = html.indexOf('<script src="./lockAnim.js"></script>'), g = html.indexOf('<script src="./guide.js"></script>');
  assert.ok(a > 0 && g > a, 'lockAnim.js before guide.js');
  for (const cls of ['.lock-anim', '.la-svg', '.la-caption', '.la-ind.la-open', '.la-ind.la-closed', '.la-label']) assert.ok(html.includes(cls), cls);
  assert.ok(html.includes('#3FAE5C') && html.includes('#D9473F'));
});

// ---- Task 5 fix round 1: keyboard steps, quiet captions, cached elements ----
test('the step radios roam: one tab stop that follows the current step', () => {
  const h = L.lockBlock('air');
  assert.equal([...h.matchAll(/tabindex="0"/g)].length, 1);
  assert.match(h, /aria-checked="true" tabindex="0" data-lock-step="1"/);
  assert.equal([...h.matchAll(/tabindex="-1"/g)].length, 3);
  const win = fakeLockWin(false), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'air', win);
  const tabs = () => root.steps.map(b => b.getAttribute('tabindex')).join(',');
  assert.equal(tabs(), '0,-1,-1,-1');
  root.click(root.steps[2]);
  assert.equal(tabs(), '-1,-1,0,-1');
  root.click(root.steps[3]);
  assert.equal(tabs(), '-1,-1,-1,0');
  assert.equal(a.state().step, 4);
  const w2 = fakeLockWin(true), r2 = fakeLockRoot();
  L.startLockAnim(r2, 'air', w2);
  assert.equal(r2.steps.map(b => b.getAttribute('tabindex')).join(','), '-1,-1,-1,0', 'reduced motion: the impact step is the tab stop');
});

test('arrow keys move the step, wrap at the ends and pause', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  const a = L.startLockAnim(root, 'spring', win);
  root.click(root.steps[3]);
  assert.equal(a.state().step, 4);
  const ev = root.key(root.steps[3], 'ArrowRight');
  assert.equal(ev.prevented, true);
  assert.equal(a.state().step, 1, 'ArrowRight from step 4 wraps to step 1');
  assert.equal(a.state().playing, false);
  assert.equal(a.state().t, 0);
  assert.equal(root.steps[0].getAttribute('aria-checked'), 'true');
  assert.equal(root.steps[0].focused, 1, 'focus follows the selection');
  root.key(root.steps[0], 'ArrowLeft');
  assert.equal(a.state().step, 4, 'ArrowLeft from step 1 wraps to step 4');
  assert.equal(a.state().t, 7.8);
  root.key(root.steps[3], 'ArrowUp');
  assert.equal(a.state().step, 3);
  root.key(root.steps[2], 'ArrowDown');
  assert.equal(a.state().step, 4);
  root.key(root.steps[3], 'Home');
  assert.equal(a.state().step, 1);
  root.key(root.steps[0], 'End');
  assert.equal(a.state().step, 4);
  // playing: an arrow key pauses, like a click
  root.click(root.play);
  assert.equal(a.state().playing, true);
  root.key(root.steps[3], 'ArrowRight');
  assert.equal(a.state().playing, false);
  // other keys and other targets are left alone
  const t = a.state().t, ev2 = root.key(root.steps[0], 'a');
  assert.equal(ev2.prevented, false);
  assert.equal(a.state().t, t);
  const ev3 = root.key(null, 'ArrowRight');
  assert.equal(ev3.prevented, false);
  a.stop();
  assert.equal(root.listeners.length, 0, 'click and keydown handlers are removed');
});

test('the play text and the caption are written only when they change', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  L.startLockAnim(root, 'air', win);
  assert.equal(root.cap.writes, 0, 'the markup already shows step 1: nothing is rewritten on open');
  assert.equal(root.play.writes, 0, 'the play text is already «Пауза»');
  let now = 1000;
  for (let i = 0; i < 20; i++) win.q.shift()(now += 16);
  assert.equal(root.play.writes, 0, 'not rewritten every frame');
  assert.equal(root.cap.writes, 0, 'the step has not changed');
  root.click(root.play);
  assert.equal(root.play.writes, 1);
});

test('the caption is a quiet live region while the loop plays', () => {
  const win = fakeLockWin(false), root = fakeLockRoot();
  L.startLockAnim(root, 'air', win);
  const live = () => root.cap.getAttribute('aria-live');
  assert.equal(live(), 'off', 'the autoplay is not narrated');
  let now = 1000;
  for (let i = 0; i < 5; i++) win.q.shift()(now += 16);
  assert.equal(live(), 'off');
  root.click(root.play);                 // the user pauses
  assert.equal(live(), 'polite');
  root.click(root.steps[1]);             // a step button
  assert.equal(live(), 'polite');
  root.click(root.play);                 // resumes
  assert.equal(live(), 'off');
  root.click(root.steps[2]);             // a step button while playing: pauses, speaks
  assert.equal(live(), 'polite');
  // reduced motion: paused on the impact, but nothing is announced on open; a user action turns the region on
  const w2 = fakeLockWin(true), r2 = fakeLockRoot();
  L.startLockAnim(r2, 'air', w2);
  assert.equal(r2.cap.getAttribute('aria-live'), 'off');
  assert.equal(r2.cap.textContent, L.captionOf('air', 4));
  r2.click(r2.steps[0]);
  assert.equal(r2.cap.getAttribute('aria-live'), 'polite');
  assert.equal(r2.cap.textContent, L.captionOf('air', 1));
});

test('the pose elements are looked up once and attributes are set only when they change', () => {
  const win = fakeLockWin(false), root = fakeLockRoot({ elements: true });
  L.startLockAnim(root, 'air', win);
  const queries = root.svg.queries, sets = root.svg.sets;
  assert.equal(queries, new Set(L.lockPose('air', L.lockState(0)).map(p => p.id)).size, 'one lookup per id');
  let now = 1000;
  for (let i = 0; i < 10; i++) win.q.shift()(now += 16);
  assert.equal(root.svg.queries, queries, 'no new lookups while playing');
  assert.ok(root.svg.sets > sets, 'moving parts are updated');
  // a paused pose set again sets nothing
  root.click(root.steps[1]);
  const s2 = root.svg.sets;
  root.click(root.steps[1]);
  root.click(root.play);
  root.click(root.play);
  assert.equal(root.svg.sets, s2, 'an unchanged pose sets no attribute');
  // the plain applyLock still works
  const el = { v: null, setAttribute(k, v) { this.v = [k, v]; } };
  L.applyLock({ querySelector: () => el }, [{ id: 'x', attrs: { a: 1 } }]);
  assert.deepEqual(el.v, ['a', 1]);
});
