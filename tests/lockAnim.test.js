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
  assert.ok(svg.includes('class="la-svg"') && svg.includes('data-lock="spring"') && svg.includes('viewBox="0 0 900 900"'));
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
    assert.ok(maxY + dy + 1 <= 900, `tail at ${maxY + dy}`);
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
  assert.ok(svg.includes('data-lock="air"') && svg.includes('viewBox="0 0 900 900"'));
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
