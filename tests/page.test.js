// The main screen (index.html read as text): 14 style buttons, kids' mode wired through riderOf
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const { FIT_STYLES } = require('../model.js');

test('the style bar has the 14 buttons of FIT_STYLES, the new ones are labelled', () => {
  const seg = html.slice(html.indexOf('id="seg"'), html.indexOf('</div>', html.indexOf('id="seg"')));
  const found = [...seg.matchAll(/data-style="(\w+)"[^>]*>([^<]+)</g)].map(m => [m[1], m[2]]);
  assert.equal(found.length, 14);
  assert.deepEqual(found.map(f => f[0]), FIT_STYLES);
  const label = Object.fromEntries(found);
  assert.equal(label.ebike, 'Электро');
  assert.equal(label.bmx, 'BMX');
  assert.equal(label.teen, 'Подростковый');
  assert.equal(label.kidTraining, 'С подпорными колёсами');
});

test('save() keeps the child\'s heights', () => {
  const save = html.slice(html.indexOf('function save()'), html.indexOf('/* ---------- controls'));
  assert.match(save, /kidH/);
});

test('fit, the figure and the readouts take their measures through riderOf', () => {
  const changed = html.slice(html.indexOf('function changed()'), html.indexOf('function computeUx'));
  assert.match(changed, /fit\(\{[^}]*riderOf\(/);
  assert.match(changed, /healthNow\(\)/);
  const tick = html.slice(html.indexOf('function tick('), html.indexOf('const onResize'));
  assert.match(tick, /riderOf\(/);
  const specs = html.slice(html.indexOf('function renderSpecs'), html.indexOf('/* ---------- animation loop'));
  assert.match(specs, /riderOf\(/);
  assert.match(specs, /heightRowOf\(/);
  assert.doesNotMatch(specs, /FOLDING_RANGE/);
});

test('a kids\' style hides the adult controls and keeps its own height slider', () => {
  const sync = html.slice(html.indexOf('function syncControls()'), html.indexOf('const healthNow'));
  assert.match(sync, /kidOf\(/);
  assert.match(sync, /\.range/);
  assert.match(sync, /\[data-dim="I"\]/);
  assert.match(sync, /\.presets/);
  const h = html.slice(html.indexOf("inputs.H.addEventListener"), html.indexOf("for(const k of ['I','A','W'])"));
  assert.match(h, /kidH\[/);
  const health = html.slice(html.indexOf('function syncHealth'), html.indexOf('function syncStyle'));
  assert.match(health, /kidOf\(/);
});

test('the e-bike always has its motor; the drawing gets it from the style too', () => {
  assert.match(html, /state\.motor\|\|target\.motor/);
  assert.match(html, /tMotor'\)\.disabled/);
});

test('the riser-bar height tweens with the rest of the geometry', () => {
  assert.match(html, /const NUM=\[[^\]]*'rise'/);
});
