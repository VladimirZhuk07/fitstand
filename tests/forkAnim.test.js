const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../forkAnim.js');

const KINDS = ['spring', 'air'], MODES = ['bump', 'climb'];
const frames = (from = 0, to = F.FORK_PERIOD) => { const r = []; for (let t = from; t < to; t += 1 / 60) r.push(t); return r; };
const max = (kind, mode, locked, key, ts = frames()) => Math.max(...ts.map(t => F.forkPose(kind, mode, t, locked)[key]));
const min = (kind, mode, locked, key, ts = frames()) => Math.min(...ts.map(t => F.forkPose(kind, mode, t, locked)[key]));

test('bump compresses both forks', () => {
  for (const k of KINDS) assert.ok(max(k, 'bump', false, 'c') > 0.4, k);
});

test('spring rocks, air settles', () => {
  const cs = k => frames().map(t => F.forkPose(k, 'bump', t, false).c);
  const s = cs('spring'), a = cs('air'), crest = s.indexOf(Math.max(...s));
  assert.ok(Math.min(...s.slice(crest)) < -0.05, 'spring extends past rest');
  let peaks = 0;
  for (let i = crest + 1; i < s.length - 1; i++) if (s[i] > s[i - 1] && s[i] >= s[i + 1] && s[i] > 0.03) peaks++;
  assert.ok(peaks >= 1, 'spring compresses again after the bump');
  assert.ok(Math.min(...s) > -0.2, 'top-out keeps the spring from extending far');
  assert.ok(Math.min(...a) >= 0, 'air never extends past rest');
  for (const k of KINDS) assert.ok(Math.abs(F.forkPose(k, 'bump', 2.99, false).c) < 0.02, `${k} settles`);
});

// the bar is what the rider feels: the fork keeps it almost still, the spring one rocks, the air one glides back
test('bar stays almost still over the bump', () => {
  const fr = k => frames().map(t => F.forkPose(k, 'bump', t, false).front);
  const minima = xs => { let n = 0; for (let i = 1; i < xs.length - 1; i++) if (xs[i] < xs[i - 1] && xs[i] <= xs[i + 1] && xs[i] < -0.01) n++; return n; };
  for (const k of KINDS) assert.ok(Math.max(...fr(k).map(Math.abs)) <= 0.2, `${k}: bar moves at most 0.2 of travel`);
  assert.ok(minima(fr('spring')) >= 2, 'spring bar rocks');
  assert.equal(minima(fr('air')), 1, 'air bar dips once and glides back');
});

test('the wheel rides over the bump, not through it', () => {
  for (const t of frames()) {
    const bx = F.bumpCenter(t), lift = F.forkPose('air', 'bump', t, true).wheel * F.FORK_S;
    for (let dx = -F.BUMP_HALF; dx <= F.BUMP_HALF; dx += 1) {
      const x = bx + dx, h = F.bumpHeight(dx), gap = F.WHEEL_OUT ** 2 - (x - F.AXLE_X) ** 2;
      if (gap <= 0) continue;
      const tyreBottom = F.WHEEL_OUT - Math.sqrt(gap) + lift; // height of the tyre underside above the ground at x
      assert.ok(tyreBottom >= h - 0.6, `t=${t.toFixed(3)} x=${x.toFixed(0)}: tyre ${tyreBottom.toFixed(1)} under bump ${h.toFixed(1)}`);
    }
  }
});

test('the bump enters and leaves out of sight', () => {
  for (const t of [0, F.FORK_PERIOD - 1e-6]) {
    const bx = F.bumpCenter(t);
    assert.ok(bx - F.BUMP_HALF >= 240 || bx + F.BUMP_HALF <= 0, `t=${t}: bump at ${bx}`);
  }
});

test('lockout', () => {
  for (const k of KINDS) {
    for (const m of MODES) for (const t of frames()) assert.equal(F.forkPose(k, m, t, true).c, 0, `${k} ${m} ${t}`);
    for (const key of ['front', 'wheel']) {
      const v = max(k, 'bump', true, key);
      assert.ok(v >= 0.69 && v <= 0.7, `${k} ${key} ${v}`);
    }
    const h = max(k, 'bump', true, 'hands');
    assert.ok(h >= 0.99 && h <= 1, `${k} hands ${h}`);
    for (const t of frames()) assert.deepEqual(F.forkPose(k, 'climb', t, true), { c: 0, wheel: 0, front: 0, hands: 0 });
  }
});

test('climb bobs, spring more', () => {
  for (const k of KINDS) for (const t of frames()) assert.equal(F.forkPose(k, 'climb', t, false).wheel, 0);
  const s = max('spring', 'climb', false, 'c'), a = max('air', 'climb', false, 'c');
  assert.ok(s > a && a > 0.05, `${s} ${a}`);
});

test('pose invariants', () => {
  for (const k of KINDS) for (const m of MODES) for (const locked of [false, true]) {
    let prev = null;
    for (const t of frames()) {
      const p = F.forkPose(k, m, t, locked);
      assert.ok(Math.abs(p.c - (p.wheel - p.front)) < 1e-9, `c = wheel − front ${k} ${m} ${t}`);
      const q = F.forkPose(k, m, t + F.FORK_PERIOD, locked);
      for (const key of ['c', 'wheel', 'front', 'hands']) assert.ok(Math.abs(p[key] - q[key]) < 1e-9, `period ${key}`);
      if (prev) assert.ok(Math.abs(p.c - prev.c) < 0.15 && Math.abs(p.front - prev.front) < 0.15, `smooth ${k} ${m} ${t}`);
      prev = p;
    }
    const end = F.forkPose(k, m, F.FORK_PERIOD - 1 / 60, locked), start = F.forkPose(k, m, 0, locked);
    assert.ok(Math.abs(end.c - start.c) < 0.05 && Math.abs(end.front - start.front) < 0.05, `loop seam ${k} ${m} ${locked}`);
    const a = F.forkPose(k, m, -0.5, locked), b = F.forkPose(k, m, 2.5, locked);
    assert.ok(Math.abs(a.c - b.c) < 1e-9 && Math.abs(a.front - b.front) < 1e-9, 'negative t');
  }
});

test('markup', () => {
  const labels = { spring: 'пружина', air: 'воздух', oil: 'масло <гасит>', hands: 'удар в руки' };
  const s = F.forkMarkup('spring', labels, 'Пружинная'), a = F.forkMarkup('air', labels, 'Воздушная');
  for (const [m, title] of [[s, 'Пружинная'], [a, 'Воздушная']]) {
    for (const k of ['front', 'lower', 'bump', 'hands']) assert.match(m, new RegExp(`data-k="${k}"`), k);
    assert.match(m, /role="img"/);
    assert.match(m, new RegExp(`aria-label="${title}"`));
    assert.match(m, /удар в руки/);
  }
  assert.match(s, /data-fork="spring"/);
  assert.match(s, /data-k="spring"/);
  assert.doesNotMatch(s, /data-k="air"/);
  assert.match(s, /пружина/);
  assert.match(a, /data-fork="air"/);
  assert.match(a, /data-k="air"/);
  assert.match(a, /data-k="oil"/);
  assert.doesNotMatch(a, /data-k="spring"/);
  assert.match(a, /масло &lt;гасит&gt;/);
});

// ---------- page part ----------
const { CONTENT } = require('../content.js');
const ANIM = CONTENT.parts.fork.anim;

test('forkBlock: two scenes, pressed buttons, live caption', () => {
  const h = F.forkBlock(ANIM);
  assert.match(h, /<section class="fork-anim">/);
  assert.match(h, /data-fork="spring"/);
  assert.match(h, /data-fork="air"/);
  assert.match(h, /data-fork-mode="bump" aria-pressed="true"/);
  assert.match(h, /data-fork-mode="climb" aria-pressed="false"/);
  assert.match(h, /data-fork-lock aria-pressed="false"/);
  assert.match(h, /data-fork-play/);
  assert.match(h, /class="fork-cap" aria-live="polite"/);
});

// a fake page: rAF callbacks are kept and run by hand
function fakeWin(reduce) {
  const q = [];
  return { q, requestAnimationFrame: cb => q.push(cb), matchMedia: () => ({ matches: reduce }) };
}
const fakeRoot = () => ({ isConnected: true, querySelectorAll: () => [], querySelector: () => null });

test('startForkAnim stops when root leaves the document', () => {
  const win = fakeWin(false), root = fakeRoot();
  F.startForkAnim(root, ANIM, win);
  assert.equal(win.q.length, 1);
  win.q.shift()(1000);
  assert.equal(win.q.length, 1, 'keeps running while on the page');
  root.isConnected = false;
  win.q.shift()(1016);
  assert.equal(win.q.length, 0, 'no new frame after leaving');
});

test('time advances, capped per frame; reduced motion starts paused', () => {
  const win = fakeWin(false), a = F.startForkAnim(fakeRoot(), ANIM, win);
  win.q.shift()(1000); win.q.shift()(1016);
  assert.ok(a.state().t > 0.015 && a.state().t < 0.017);
  win.q.shift()(61016); // a minute in the background
  assert.ok(a.state().t < 0.07, 'no jump after the tab comes back');
  const w2 = fakeWin(true), b = F.startForkAnim(fakeRoot(), ANIM, w2);
  w2.q.shift()(1000); w2.q.shift()(2000);
  assert.equal(b.state().playing, false);
  assert.ok(F.forkPose('air', 'bump', b.state().t, false).c > 0.4, 'paused on a moment that shows something');
});
