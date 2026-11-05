const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONTENT } = require('../content.js');

const root = path.join(__dirname, '..');
const MAX_BYTES = 120 * 1024;
const check = rel => {
  const f = path.join(root, rel);
  assert.ok(fs.existsSync(f), `${rel} missing`);
  assert.ok(fs.statSync(f).size <= MAX_BYTES, `${rel} is larger than ${MAX_BYTES} bytes`);
};

test('every accessory has a compressed picture', () => {
  for (const id of Object.keys(CONTENT.accessories)) check(`img/acc/${id}.webp`);
});

// pictures for these parts come in stage 3 of the third feedback
const PENDING = ['rims', 'tyres'];

test('every part variant has a compressed picture', () => {
  for (const [id, p] of Object.entries(CONTENT.parts)) if (!PENDING.includes(id)) p.variants.forEach((_, i) => check(`img/parts/${id}-${i}.webp`));
});

test('no pictures of parts that are gone', () => {
  for (const f of fs.readdirSync(path.join(root, 'img/parts'))) {
    const id = f.replace(/-\d+\.webp$/, '');
    assert.ok(Object.prototype.hasOwnProperty.call(CONTENT.parts, id), f);
  }
});
