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

test('kids\' styles drop the reach row and its vote in the verdict', () => {
  const specs = html.slice(html.indexOf('function renderSpecs'), html.indexOf('/* ---------- animation loop'));
  assert.match(specs, /st\.kidFit\)\s*rows=rows\.filter\([^)]*Дотягивание/);
  assert.match(specs, /const reachS=st\.kidFit\|\|/);
});

test('the training-wheels style carries the button\'s name', () => {
  assert.equal(require('../model.js').STYLES.kidTraining.name, 'С подпорными колёсами');
});

const STYLE_COLOR_EXPECTED = { track: '#8CCB2E', women: '#4FB8D6', teen: '#E8C21C', bmx: '#8A8A3A', cx: '#2B5FB8', hybrid: '#23407A', folding: '#5A6E82' };

test('every style has its own frame colour, with a Russian name', () => {
  const m = html.match(/const STYLE_COLOR=\{([^}]*)\}/);
  assert.ok(m, 'STYLE_COLOR is declared');
  const map = Object.fromEntries([...m[1].matchAll(/(\w+):\['(#[0-9A-Fa-f]{6})','([^']+)'\]/g)].map(x => [x[1], [x[2], x[3]]]));
  assert.deepEqual(Object.keys(map).sort(), [...FIT_STYLES].sort());
  for (const s of FIT_STYLES) {
    assert.equal(map[s][0].toUpperCase(), (STYLE_COLOR_EXPECTED[s] || '#2E3237').toUpperCase(), s);
    assert.match(map[s][1], /^[А-Яа-яЁё-]+$/, s);
  }
});

test('loadSaved gets the basic colours and the style colours together', () => {
  const call = html.match(/loadSaved\([^\n]*\)/)[0];
  assert.match(call, /COLORS/);
  assert.match(call, /STYLE_COLOR/);
});

test('the first swatch is the style colour and follows the style', () => {
  assert.match(html, /data-style-color/);
  const sync = html.slice(html.indexOf('function syncStyle()'), html.indexOf("document.querySelectorAll('#seg button').forEach(b=>b.addEventListener"));
  assert.match(sync, /STYLE_COLOR\[state\.style\]/);
});

test('a style switch (button and applyStyle) takes the style colour; page load does not override', () => {
  const pick = html.slice(html.indexOf('function setStyle('), html.indexOf("$('#seg').addEventListener('keydown'"));
  assert.match(pick, /state\.color=STYLE_COLOR\[/);
  assert.match(pick, /--frame/);
  assert.match(html, /addEventListener\('click',\(\)=>pickStyle\(b\.dataset\.style\)\)/);
  const api = html.slice(html.indexOf('applyStyle(style,motor,health)'), html.indexOf('showTab(name)'));
  assert.match(api, /setStyle\(style\)/);
  const load = html.slice(html.indexOf('// restore saved view state'), html.indexOf('// tabs (phone layout)'));
  assert.doesNotMatch(load, /STYLE_COLOR/);
});
