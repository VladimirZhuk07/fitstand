const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
Object.assign(globalThis, M);
const Dr = require('../draw.js');

const g = s => M.fit({ H: 178, I: 83, A: 61, W: 42, flex: 3, style: s }).g;
const PARTS = ['frame', 'fork', 'brakes', 'drivetrain', 'rims', 'tyres', 'cockpit', 'saddle', 'pedals'];

test('static markup has no ids, no rider, no dims, all parts', () => {
  const s = Dr.bikeMarkup(g('road'), 1, { live: false });
  assert.doesNotMatch(s, /\sid="/);
  assert.doesNotMatch(s, /class="rider"|class="dims"/);
  for (const p of PARTS) assert.match(s, new RegExp(`data-part="${p}"`));
});

// the inside of <g data-part="name"…>…</g>, nested groups included
function partBody(s, name) {
  const at = s.indexOf(`data-part="${name}"`);
  assert.ok(at >= 0, name);
  let i = s.indexOf('>', at) + 1, depth = 1;
  const start = i;
  while (depth) {
    const open = s.indexOf('<g', i), close = s.indexOf('</g>', i);
    if (open !== -1 && open < close) { depth++; i = open + 2; } else { depth--; i = close + 4; }
  }
  return s.slice(start, i - 4);
}

test('rims and tyres are separate parts', () => {
  for (const style of ['hybrid', 'trike', 'kidTraining', 'special']) {
    const s = Dr.bikeMarkup(g(style), 1, { live: false, highlight: 'tyres' });
    assert.doesNotMatch(s, /data-part="wheels"/, style);
    assert.match(s, /data-part="tyres" data-on/, style);
    assert.match(partBody(s, 'tyres'), /class="s-tyre/, `${style}: tyres`);
    assert.doesNotMatch(partBody(s, 'rims'), /class="s-tyre/, `${style}: rims`);
    assert.match(partBody(s, 'rims'), /class="s-rim/, `${style}: rim`);
  }
  const live = Dr.bikeMarkup(g('hybrid'), 1);
  assert.match(partBody(live, 'rims'), /id="wR"/);
  assert.match(partBody(live, 'rims'), /id="wF"/);
});

test('the trike third wheel stays behind the main wheels', () => {
  const order = s => [...s.matchAll(/data-part="(rims|tyres)"/g)].map(m => m[1]);
  assert.deepEqual(order(Dr.bikeMarkup(g('trike'), 1, { live: false })), ['rims', 'tyres', 'rims', 'tyres']);
  assert.deepEqual(order(Dr.bikeMarkup(g('hybrid'), 1, { live: false })), ['rims', 'tyres']);
});

test('live markup keeps animation ids', () => {
  const s = Dr.bikeMarkup(g('road'), 1);
  for (const id of ['nCrank', 'fCrank', 'nPedal', 'wR', 'wF']) assert.match(s, new RegExp(`id="${id}"`));
});

test('highlight marks one part', () => {
  const s = Dr.bikeMarkup(g('city'), 1, { live: false, highlight: 'brakes' });
  assert.match(s, /class="hl"/);
  assert.equal((s.match(/data-on/g) || []).length, 1);
  assert.match(s, /data-part="brakes" data-on/);
});

test('motor, disc, suspension, hinge are drawn', () => {
  assert.match(Dr.bikeMarkup(g('city'), 1, { live: false, motor: true }), /data-k="motor"/);
  assert.match(Dr.bikeMarkup(g('mtb'), 1, { live: false }), /data-k="disc"/);
  assert.match(Dr.bikeMarkup(g('mtb'), 1, { live: false }), /data-k="susp"/);
  assert.match(Dr.bikeMarkup(g('folding'), 1, { live: false }), /data-k="hinge"/);
  assert.doesNotMatch(Dr.bikeMarkup(g('road'), 1, { live: false }), /data-k="disc"/);
  assert.match(Dr.bikeMarkup(g('road'), 1, { live: false }), /data-k="rim"/);
});

// ---------- health gear on the drawing (Task 6) ----------
const gh = (s, health) => M.fit({ H: 178, I: 83, A: 61, W: 42, flex: 3, style: s, health }).g;
const H0 = { upright: 0, barUp: 0, crankMax: null, stepThrough: false, gear: [] };

test('suspension fork on a hybrid', () => {
  assert.match(Dr.bikeMarkup(gh('hybrid', { ...H0, gear: ['suspFork'] }), 1, { live: false }), /data-k="susp"/);
});

test('suspension seatpost', () => {
  const s = Dr.bikeMarkup(gh('city', { ...H0, gear: ['suspPost'] }), 1, { live: false });
  assert.match(s, /data-part="saddle"[^]*data-k="suspPost"/);
});

test('step-through frame', () => {
  const s = Dr.bikeMarkup(gh('hybrid', { ...H0, stepThrough: true }), 1, { live: false });
  assert.match(s, /data-part="frame"[^]*data-k="stepThrough"/);
});

test('no gear marks without health', () => {
  const s = Dr.bikeMarkup(gh('hybrid', null), 1, { live: false });
  for (const k of ['susp', 'suspPost', 'stepThrough']) assert.doesNotMatch(s, new RegExp(`data-k="${k}"`));
});

// ---------- new bike types (sub-project A, Task 2) ----------
const gt = s => { const st = M.STYLES[s]; return M.fit({ ...(st.rider || { H: 178, I: 83, A: 61, W: 42 }), flex: 3, style: s }).g; };
const MARK = { fullsus: 'rearShock', track: 'noBrakes', trike: 'trike', cargo: 'cargoBox', balance: 'noPedals', kidTraining: 'trainingWheels', kidTrike: 'frontPedals', special: 'unicycle' };

test('each new style draws its own mark', () => {
  for (const [style, mark] of Object.entries(MARK)) {
    const s = Dr.bikeMarkup(gt(style), 1, { live: false });
    assert.match(s, new RegExp(`data-k="${mark}"`), `${style} has ${mark}`);
    for (const other of Object.values(MARK)) {
      if (other === mark || (style === 'kidTrike' && other === 'trike')) continue;
      assert.doesNotMatch(s, new RegExp(`data-k="${other}"`), `${style} must not have ${other}`);
    }
  }
  assert.match(Dr.bikeMarkup(gt('kidTrike'), 1, { live: false }), /data-k="trike"/);
  const track = Dr.bikeMarkup(gt('track'), 1, { live: false });
  assert.doesNotMatch(track, /data-k="(rim|disc)"/);
});

test('chain is drawn only where there is one', () => {
  assert.match(Dr.bikeMarkup(gt('road'), 1, { live: false }), /data-k="chain"/);
  for (const s of ['balance', 'kidTrike', 'special']) assert.doesNotMatch(Dr.bikeMarkup(gt(s), 1, { live: false }), /data-k="chain"/, s);
});

// ---------- drivetrain details (feedback 4, spec 6) ----------
const DT = ['chain', 'cassette', 'cranks', 'bb'], EXTRA = ['rd', 'fd', 'shifters', 'cables'];
const dGroups = (s, d) => s.match(new RegExp(`<g data-part="drivetrain" data-d="${d}"( data-on)?>`, 'g')) || [];

test('drivetrain sub-groups; extra details only on a static drawing with details (spec 6)', () => {
  const base = Dr.bikeMarkup(g('hybrid'), 1, { live: false });
  for (const d of DT) assert.ok(dGroups(base, d).length >= 1, d);
  for (const d of EXTRA) assert.equal(dGroups(base, d).length, 0, d);
  const det = Dr.bikeMarkup(g('hybrid'), 1, { live: false, details: true });
  for (const d of [...DT, ...EXTRA]) assert.ok(dGroups(det, d).length >= 1, d);
  const live = Dr.bikeMarkup(g('hybrid'), 1, { details: true });
  for (const d of EXTRA) assert.equal(dGroups(live, d).length, 0, `live ${d}`);
});

test('highlight one drivetrain detail, or the whole drivetrain', () => {
  const one = Dr.bikeMarkup(g('road'), 1, { live: false, details: true, highlight: 'drivetrain:chain' });
  const on = [...one.matchAll(/<g data-part="(\w+)"(?: data-d="(\w+)")? data-on>/g)].map(m => `${m[1]}:${m[2]}`);
  assert.ok(on.length >= 1 && on.every(x => x === 'drivetrain:chain'), on.join());
  const all = Dr.bikeMarkup(g('road'), 1, { live: false, details: true, highlight: 'drivetrain' });
  const groups = all.match(/<g data-part="drivetrain"[^>]*>/g);
  assert.ok(groups.length >= 8 && groups.every(x => x.endsWith(' data-on>')));
});

test('details on bikes without a chain; new shapes use theme classes', () => {
  for (const s of ['balance', 'kidTrike', 'special']) {
    const m = Dr.bikeMarkup(gt(s), 1, { live: false, details: true });
    for (const d of EXTRA) assert.equal(dGroups(m, d).length, 0, `${s} ${d}`);
  }
  const det = Dr.bikeMarkup(g('mtb'), 1, { live: false, details: true });
  for (const d of EXTRA) {
    const at = det.indexOf(`data-d="${d}"`), body = det.slice(at, det.indexOf('</g>', at));
    assert.doesNotMatch(body, /(fill|stroke)="#/, d);
  }
});

test('unicycle bounds are finite and narrow', () => {
  const b = Dr.boundsOf(gt('special'), false, 1);
  for (const v of [b.x, b.y, b.w, b.h]) assert.ok(Number.isFinite(v));
  assert.ok(b.w < 1500, `width ${b.w}`);
});

test('every catalog style draws without ids', () => {
  for (const s of Object.keys(M.STYLES)) assert.doesNotMatch(Dr.bikeMarkup(gt(s), 1, { live: false }), /\sid="/, s);
});

// ---------- ride scene (stage 4a) ----------
const RIDE_IDS = ['riderFarSlot', 'riderSlot', 'cockpitG'];
const RIDE_CLASSES = ['spokes', 'blur-disc', 'valve', 'grid-bg', 'hi', 'tread'];
const OLD_IDS = ['fThigh', 'fShin', 'fFoot', 'nThigh', 'nShin', 'nFoot', 'uHip', 'uTorso', 'uNeck', 'uUpper', 'uFore', 'uHand', 'uHeadG'];

test('live markup has moving upper body and ride wheels', () => {
  const live = Dr.bikeMarkup(g('hybrid'), 1), stat = Dr.bikeMarkup(g('hybrid'), 1, { live: false });
  for (const id of RIDE_IDS) { assert.match(live, new RegExp(`id="${id}"`), id); assert.doesNotMatch(stat, new RegExp(`id="${id}"`), id); }
  for (const c of RIDE_CLASSES) { assert.match(live, new RegExp(`class="${c}`), c); assert.doesNotMatch(stat, new RegExp(`class="${c}`), c); }
  for (const id of OLD_IDS) assert.doesNotMatch(live, new RegExp(`id="${id}"`), `${id} is gone`);
  assert.ok(live.indexOf('id="riderFarSlot"') < live.indexOf('data-part="frame"'), 'far leg behind the frame');
  assert.ok(live.indexOf('id="riderSlot"') > live.indexOf('data-part="cockpit"'), 'the rider over the cockpit');
});

test('upperAt at rest equals upperOf', () => {
  for (const s of ['road', 'city', 'mtb', 'women']) {
    const G = g(s), { hip, ck } = Dr.geomPts(G);
    const a = M.upperOf(G, hip, ck.hand), b = M.upperAt(G, hip, ck, { torso: 0, breath: 0, bar: 0 });
    for (const k of ['shoulder', 'hand', 'head', 'elbow']) assert.ok(M.len(M.sub(a[k], b[k])) < 0.5, `${s}.${k}`);
  }
});

test('arms reach the bar while the body sways', () => {
  const G = g('hybrid'), { hip, ck } = Dr.geomPts(G);
  for (const torso of [-1.2, 1.2]) for (const bar of [-1.35, 1.35]) for (const breath of [0, 6]) {
    const u = M.upperAt(G, hip, ck, { torso, breath, bar });
    assert.ok(M.len(M.sub(u.hand, u.shoulder)) <= G.arm + 0.5, 'arm length'); // AEK is the bend at rest; swaying may straighten it a little
    const grip = M.add(ck.C, M.rot ? M.rot(M.sub(ck.hand, ck.C), bar) : M.sub(ck.hand, ck.C));
    if (M.len(M.sub(grip, u.shoulder)) < G.arm - 1) assert.ok(M.len(M.sub(u.hand, grip)) < 1, 'hand on the grip');
  }
});

// ---------- rear shock as a fork detail (feedback 5, spec: suspension) ----------
const shockGroups = s => s.match(/<g data-part="fork" data-d="rearShock"( data-on)?>/g) || [];

test('rear shock is its own fork detail on a full-suspension bike', () => {
  const plain = Dr.bikeMarkup(g('fullsus'), 1, { live: false });
  assert.equal(shockGroups(plain).length, 1);
  assert.ok(!shockGroups(plain)[0].endsWith(' data-on>'));
  assert.ok(plain.includes('data-k="rearShock"'));
  for (const hl of ['fork:rearShock', 'fork']) assert.ok(shockGroups(Dr.bikeMarkup(g('fullsus'), 1, { live: false, highlight: hl }))[0].endsWith(' data-on>'), hl);
  assert.ok(!shockGroups(Dr.bikeMarkup(g('fullsus'), 1, { live: false, highlight: 'frame' }))[0].endsWith(' data-on>'));
  assert.equal(shockGroups(Dr.bikeMarkup(g('mtb'), 1, { live: false })).length, 0);
});

test('the shock pivot dot belongs to the frame, so it is not lit with the shock', () => {
  const m = Dr.bikeMarkup(g('fullsus'), 1, { live: false, highlight: 'fork:rearShock' });
  const shock = m.match(/<g data-part="fork" data-d="rearShock"[^>]*><g data-k="rearShock">[\s\S]*?<\/g><\/g>/)[0];
  assert.ok(!shock.includes('cx="0" cy="0" r="30"'));
  assert.ok(m.includes('<circle class="f-ink" cx="0" cy="0" r="30"/>'));
});
