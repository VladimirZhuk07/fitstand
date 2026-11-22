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
  for (const kind of ['spring']) {
    const svg = L.lockMarkup(kind), segs = flowSegments(svg), m = mirrorOf(kind, 4);
    assert.ok(segs.length >= 4);
    const all = [...segs, ...segs.map(([x1, y1, x2, y2]) => [x1, m - y1, x2, m - y2])];
    for (const [x1, y1, x2, y2] of all) for (const [x, y] of [[x1, y1], [x2, y2]]) {
      if (y >= 224 && y <= 296) assert.ok(Math.abs(x - 600) >= 13, `arrow end (${x},${y}) is on the needle`);
    }
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
  for (const kind of ['spring']) {
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
  assert.ok(!move.includes(dot[0].slice(0, 40)));
  // the stanchion bushing (static, drawn over the legs): y 520…536
  assert.ok(Number(dot[2]) >= 520 && Number(dot[2]) <= 536, `dot y ${dot[2]}`);
});
