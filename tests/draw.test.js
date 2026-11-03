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
