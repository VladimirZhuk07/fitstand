const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const root = path.join(__dirname, '..');

test('image prompts cover every part variant', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fs-prompts-')), 'prompts.md');
  execFileSync(process.execPath, [path.join(root, 'tools/make-image-prompts.js'), root, out], { stdio: 'pipe' });
  const md = fs.readFileSync(out, 'utf8');
  const { CONTENT } = require('../content.js');
  for (const [id, p] of Object.entries(CONTENT.parts)) p.variants.forEach((_, i) => assert.match(md, new RegExp(`part-${id}-${i}\.png`), `${id}-${i}`));
  assert.doesNotMatch(md, /part-wheels-/);
  const stage = md.slice(md.indexOf('## Этап 3'));
  assert.ok(md.includes('## Этап 3'), 'stage 3 section');
  for (const id of Object.keys(CONTENT.types)) assert.match(stage, new RegExp(`type-${id}\.png`), id);
  for (const id of ['rims', 'tyres']) CONTENT.parts[id].variants.forEach((_, i) => assert.match(stage, new RegExp(`part-${id}-${i}\.png`), `${id}-${i}`));
});

test('prompts fail on a type without a prompt', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-repo-'));
  const src = fs.readFileSync(path.join(root, 'content.js'), 'utf8').replace('  types: {', "  types: { xyz: { name: 'X' },");
  fs.writeFileSync(path.join(dir, 'content.js'), src);
  let err = '';
  try { execFileSync(process.execPath, [path.join(root, 'tools/make-image-prompts.js'), dir, path.join(dir, 'out.md')], { stdio: 'pipe' }); }
  catch (e) { err = String(e.stderr); }
  assert.match(err, /no prompt for type xyz/);
});

test('convert plan: types are 3:2, the rest square', t => {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  try { execFileSync(py, ['--version'], { stdio: 'pipe' }); } catch { t.skip('no python'); return; }
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-raw-'));
  for (const f of ['type-city.png', 'part-rims-0.png', 'acc-helmet.png', 'notes.txt']) fs.writeFileSync(path.join(raw, f), '');
  const out = execFileSync(py, [path.join(root, 'tools/convert-images.py'), '--raw', raw, '--dry-run'], { encoding: 'utf8' });
  const jobs = out.trim().split('\n').map(l => JSON.parse(l));
  assert.equal(jobs.length, 3);
  const by = end => jobs.find(j => j.target.split(String.fromCharCode(92)).join('/').endsWith(end));
  assert.deepEqual(by('img/types/city.webp').size, [720, 480]);
  assert.deepEqual(by('img/parts/rims-0.webp').size, [512, 512]);
  assert.deepEqual(by('img/acc/helmet.webp').size, [512, 512]);
});

// a tall object (a unicycle) must not lose its top in the 3:2 crop; a long one is cropped around itself
test('type crop keeps the whole object', t => {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  try { execFileSync(py, ['-c', 'import PIL'], { stdio: 'pipe' }); } catch { t.skip('no Pillow'); return; }
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-raw-')), out = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-out-'));
  const make = `from PIL import Image, ImageDraw
im = Image.new('RGB', (1024, 1024), 'white'); d = ImageDraw.Draw(im); d.rectangle((500, 40, 524, 1000), fill='black'); im.save(r'${raw}/type-tall.png')
im = Image.new('RGB', (1024, 1024), 'white'); d = ImageDraw.Draw(im); d.rectangle((20, 100, 1000, 400), fill='black'); im.save(r'${raw}/type-high.png')`;
  execFileSync(py, ['-c', make]);
  execFileSync(py, [path.join(root, 'tools/convert-images.py'), '--raw', raw, '--out', out], { stdio: 'pipe' });
  const check = `from PIL import Image
for name in ('tall', 'high'):
    im = Image.open(r'${out}/types/' + name + '.webp').convert('L'); w, h = im.size
    rows = [y for y in range(h) if min(im.getpixel((x, y)) for x in range(0, w, 2)) < 100]
    print(name, w, h, rows[0], h - 1 - rows[-1])`;
  const res = execFileSync(py, ['-c', check], { encoding: 'utf8' }).trim().split('\n').map(l => l.trim().split(' '));
  for (const [name, w, h, top, bottom] of res) {
    assert.deepEqual([w, h], ['720', '480'], name);
    assert.ok(Number(top) > 2 && Number(bottom) > 2, `${name}: object touches the edge (top ${top}, bottom ${bottom})`);
  }
});

test('a source wider than 3:2 gets white, not black, bands', t => {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  try { execFileSync(py, ['-c', 'import PIL'], { stdio: 'pipe' }); } catch { t.skip('no Pillow'); return; }
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-raw-')), out = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-out-'));
  execFileSync(py, ['-c', `from PIL import Image, ImageDraw
im = Image.new('RGB', (1792, 1024), 'white'); ImageDraw.Draw(im).rectangle((100, 300, 1700, 700), fill='black'); im.save(r'${raw}/type-wide.png')`]);
  execFileSync(py, [path.join(root, 'tools/convert-images.py'), '--raw', raw, '--out', out], { stdio: 'pipe' });
  const corners = execFileSync(py, ['-c', `from PIL import Image
im = Image.open(r'${out}/types/wide.webp').convert('L'); w, h = im.size
print(w, h, min(im.getpixel(p) for p in ((2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3))))`], { encoding: 'utf8' }).trim().split(' ').map(Number);
  assert.deepEqual(corners.slice(0, 2), [720, 480]);
  assert.ok(corners[2] > 230, `corner brightness ${corners[2]}`);
});

test('image prompts cover every drivetrain detail and kind', () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fs-prompts-')), 'prompts.md');
  execFileSync(process.execPath, [path.join(root, 'tools/make-image-prompts.js'), root, out], { stdio: 'pipe' });
  const md = fs.readFileSync(out, 'utf8');
  const stage = md.slice(md.indexOf('## Отзыв 4: детали трансмиссии'));
  assert.ok(md.includes('## Отзыв 4: детали трансмиссии'), 'feedback 4 section');
  const { CONTENT } = require('../content.js');
  for (const d of CONTENT.parts.drivetrain.details) {
    assert.match(stage, new RegExp(`detail-${d.id}\.png`), d.id);
    (d.kinds || []).forEach((_, i) => assert.match(stage, new RegExp(`detail-${d.id}-${i}\.png`), `${d.id}-${i}`));
  }
});

test('convert plan: detail pictures go to img/details, square', t => {
  const py = process.platform === 'win32' ? 'python' : 'python3';
  try { execFileSync(py, ['--version'], { stdio: 'pipe' }); } catch { t.skip('no python'); return; }
  const raw = fs.mkdtempSync(path.join(os.tmpdir(), 'fs-raw-'));
  for (const f of ['detail-chain.png', 'detail-shifters-1.png']) fs.writeFileSync(path.join(raw, f), '');
  const out = execFileSync(py, [path.join(root, 'tools/convert-images.py'), '--raw', raw, '--dry-run'], { encoding: 'utf8' });
  const jobs = out.trim().split('\n').map(l => JSON.parse(l));
  const by = end => jobs.find(j => j.target.split(String.fromCharCode(92)).join('/').endsWith(end));
  assert.deepEqual(by('img/details/chain.webp').size, [512, 512]);
  assert.deepEqual(by('img/details/shifters-1.webp').size, [512, 512]);
});
