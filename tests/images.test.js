const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { CONTENT } = require('../content.js');
const { detailImg, schemaImg } = require('../guide.js');

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

test('every part variant has a compressed picture', () => {
  for (const [id, p] of Object.entries(CONTENT.parts)) p.variants.forEach((_, i) => check(`img/parts/${id}-${i}.webp`));
});

test('every bike type has a picture', () => {
  for (const id of Object.keys(CONTENT.types)) check(`img/types/${id}.webp`);
});

test('no pictures of types that are gone', () => {
  for (const f of fs.readdirSync(path.join(root, 'img/types'))) {
    assert.ok(Object.prototype.hasOwnProperty.call(CONTENT.types, f.replace(/\.webp$/, '')), f);
  }
});

test('no pictures of parts that are gone', () => {
  for (const f of fs.readdirSync(path.join(root, 'img/parts'))) {
    const id = f.replace(/-\d+\.webp$/, '');
    assert.ok(Object.prototype.hasOwnProperty.call(CONTENT.parts, id), f);
  }
});

// pictures of part details and their kinds, named by guide.detailImg
const schemaIds = Object.values(CONTENT.parts).flatMap(p => (p.details || []).filter(d => d.schema).map(d => d.id));
// pictures of part details and their kinds, named by guide.detailImg
const detailPics = () => Object.values(CONTENT.parts).flatMap(p => (p.details || []).flatMap(d =>
  [detailImg(d.id), ...(d.kinds || []).map((_, i) => detailImg(d.id, i))]));

test('every part detail and each of its kinds has a compressed picture', () => {
  const pics = detailPics();
  assert.equal(pics.length, 29);
  pics.forEach(check);
});

test('no pictures of details that are gone', () => {
  const pics = new Set([...detailPics(), ...schemaIds.map(schemaImg)]);
  for (const f of fs.readdirSync(path.join(root, 'img/details'))) assert.ok(pics.has(`img/details/${f}`), f);
});

// principle drawings of the suspension pages: img/details/<id>-schema.svg (feedback 5)
test('three schema pictures are expected', () => assert.deepEqual(schemaIds, ['springFork', 'airFork', 'rearShock']));
for (const id of schemaIds) {
  const file = path.join(root, schemaImg(id));
  test(`schema picture ${id}: a standalone SVG without brands`, () => {
    const svg = fs.readFileSync(file, 'utf8');
    assert.match(svg, /<svg[\s>]/);
    assert.ok(!/<(script|image)\b|href="http/i.test(svg), 'no scripts or external images');
    for (const b of ['shimano', 'sram', 'rockshox', 'fox', 'manitou', 'suntour']) assert.ok(!svg.toLowerCase().includes(b), b);
  });
}
