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
