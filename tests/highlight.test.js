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
