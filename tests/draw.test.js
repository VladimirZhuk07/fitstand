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

test('unicycle bounds are finite and narrow', () => {
  const b = Dr.boundsOf(gt('special'), false, 1);
  for (const v of [b.x, b.y, b.w, b.h]) assert.ok(Number.isFinite(v));
  assert.ok(b.w < 1500, `width ${b.w}`);
});

test('every catalog style draws without ids', () => {
  for (const s of Object.keys(M.STYLES)) assert.doesNotMatch(Dr.bikeMarkup(gt(s), 1, { live: false }), /\sid="/, s);
});
