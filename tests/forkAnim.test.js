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
  const ac = a.indexOf(Math.max(...a));
  for (let i = ac + 1; i < a.length; i++) assert.ok(a[i] <= a[i - 1] + 1e-12, 'air returns without rocking');
  for (const k of KINDS) assert.ok(Math.abs(F.forkPose(k, 'bump', 2.99, false).c) < 0.02, `${k} settles`);
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
      if (prev) assert.ok(Math.abs(p.c - prev.c) < 0.15, `smooth ${k} ${m} ${t}`);
      prev = p;
    }
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
