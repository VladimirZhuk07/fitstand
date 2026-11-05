const test = require('node:test');
const assert = require('node:assert/strict');
const html = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

test('highlighted part is painted in the accent colour (spec 3.5, 6)', () => {
  assert.match(html, /\.bike \.hl>\[data-on\] \[class\*="s-"\]\{stroke:var\(--accent\)\}/);
  assert.match(html, /\.bike \.hl>\[data-on\] \.f-ink,\.bike \.hl>\[data-on\] \.f-metal,\.bike \.hl>\[data-on\] \.f-frame\{fill:var\(--accent\)\}/);
});

test('header button opens the menu', () => {
  assert.match(html, /<a class="chip guide-link" href="#menu">Меню<\/a>/);
});

test('health row and toggle exist', () => {
  assert.match(html, /id="healthRow"/);
  assert.match(html, /<input type="checkbox" id="tHealth" checked>/);
});

test('fullsus button and fit-only styles in the fitstand', () => {
  assert.match(html, /<button role="radio" data-style="fullsus" aria-checked="false">Двухподвес<\/button>/);
  assert.match(html, /loadSaved\(saved,DEFAULTS,FIT_ONLY,/);
});

test('catalog groups and sections have room around them', () => {
  // must be stronger than the generic `.pg h2{margin:0 0 8px}`, which used to zero the gaps
  assert.match(html, /\.pg \.grp\{margin:36px 0 14px/);
  assert.match(html, /\.pg \.acc-sec\{margin:22px 0 10px/);
});

test('ten fit buttons in FIT_STYLES order, hybrid by default', () => {
  const { FIT_STYLES } = require('../model.js');
  const LABELS = { city: 'Город', hybrid: 'Гибрид', women: 'Женский', gravel: 'Грэвел', cx: 'Циклокросс', road: 'Шоссе', track: 'Трековый', mtb: 'MTB', fullsus: 'Двухподвес', folding: 'Складной' };
  const seg = html.slice(html.indexOf('id="seg"'), html.indexOf('</div>', html.indexOf('id="seg"')));
  const found = [...seg.matchAll(/<button role="radio" data-style="(\w+)"[^>]*>([^<]+)<\/button>/g)].map(m => [m[1], m[2]]);
  assert.deepEqual(found, FIT_STYLES.map(s => [s, LABELS[s]]));
  assert.match(html, /const DEFAULTS=\{[^}]*style:'hybrid'/);
});

test('fork animation script loads before the guide', () => {
  const a = html.indexOf('<script src="./forkAnim.js">'), g = html.indexOf('<script src="./guide.js">');
  assert.ok(a > 0 && a < g);
});

test('a type photo hides the card drawing; without it the drawing shows', () => {
  assert.match(html, /\.card \.type-thumb\+\.card-bike\{display:none\}/);
});

test('on a type page the photo replaces the drawing; without it the drawing shows', () => {
  assert.match(html, /\.type-photo\+\.pg-bike\{display:none\}/);
});

test('ride scene while pedalling, drawing on pause', () => {
  for (const sel of ['#bike.riding .grid-bg', '#bike.riding .dims', '#bike:not(.riding) #rideBg', '#bike.riding .blur-disc']) assert.ok(html.includes(sel), sel);
  assert.ok(html.includes('<g id="rideBgWrap"></g>'), 'background slot in the drawing');
  const dark = html.slice(html.indexOf('prefers-color-scheme: dark'));
  assert.match(html, /--sky-top:/);
  assert.match(dark, /--sky-top:/);
  const at = s => html.indexOf(`<script src="./${s}">`);
  assert.ok(at('draw.js') > 0 && at('ride.js') > at('draw.js') && at('ride.js') < html.indexOf('<script>'), 'ride.js after draw.js, before the page script');
});

test('the volumetric rider: clothes colours and the script', () => {
  const dark = html.slice(html.indexOf('prefers-color-scheme: dark'));
  for (const v of ['--skin-1', '--shirt-1', '--shorts-1', '--shoe-1', '--sole']) { assert.ok(html.includes(v + ':'), v); assert.ok(dark.includes(v + ':'), `${v} dark`); }
  const at = s => html.indexOf(`<script src="./${s}">`);
  assert.ok(at('rider.js') > at('ride.js') && at('rider.js') < html.indexOf('<script>'), 'rider.js after ride.js, before the page script');
  assert.ok(html.includes('riderMarkup(') && html.includes('applyRider('), 'the page draws and moves the rider');
});

test('the far leg is in shadow: darker, a little see-through', () => {
  assert.match(html, /\.rider-far\{opacity:\.9\}/);
  for (const c of ['rd-skin-far', 'rd-shorts-far', 'rd-shoe-far']) assert.match(html, new RegExp(String.raw`\.${c}\{fill:color-mix\(in srgb,var\(--[a-z]+-2\) \d+%,black\)\}`), c);
});
