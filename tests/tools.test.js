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
