const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../model.js');
Object.assign(globalThis, M);
const Dr = require('../draw.js');

const g = s => M.fit({ H: 178, I: 83, A: 61, W: 42, flex: 3, style: s }).g;
const PARTS = ['frame', 'fork', 'brakes', 'drivetrain', 'wheels', 'cockpit', 'saddle', 'pedals'];

test('static markup has no ids, no rider, no dims, all parts', () => {
  const s = Dr.bikeMarkup(g('road'), 1, { live: false });
  assert.doesNotMatch(s, /\sid="/);
  assert.doesNotMatch(s, /class="rider"|class="dims"/);
  for (const p of PARTS) assert.match(s, new RegExp(`data-part="${p}"`));
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
