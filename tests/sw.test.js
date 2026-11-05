const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const core = [...sw.match(/const CORE = \[([\s\S]*?)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]);

test('cache version is v12', () => assert.match(sw, /const VERSION = 'fitstand-v12'/));

test('every script of the page is cached for offline', () => {
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(scripts.length === 8, `scripts: ${scripts}`);
  assert.ok(core.includes('./forkAnim.js'), 'forkAnim.js in CORE');
  for (const s of scripts) assert.ok(core.includes(s), `${s} missing in CORE`);
});

test('every cached file exists', () => {
  for (const f of core) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), f);
});

// Run sw.js in a sandbox and call its fetch handler.
const vm = require('node:vm');
function swFetch({ url, mode = 'no-cors', cached, network }) {
  const handlers = {};
  const ctx = {
    self: { addEventListener: (t, f) => { handlers[t] = f; }, location: { origin: 'https://u.github.io' }, skipWaiting() {}, clients: { claim() {} } },
    caches: { match: async () => cached, open: async () => ({ put: async () => {}, addAll: async () => {} }), keys: async () => [] },
    fetch: async () => { if (network instanceof Error) throw network; return network; },
    URL,
  };
  vm.runInNewContext(sw, ctx);
  let promise;
  handlers.fetch({ request: { method: 'GET', mode, url }, respondWith: p => { promise = p; } });
  return promise;
}
const resp = name => ({ name, ok: true, type: 'basic', clone() { return this; } });

test('own scripts are network-first, so a new page never runs old scripts', async () => {
  const r = await swFetch({ url: 'https://u.github.io/fitstand/draw.js', cached: resp('old'), network: resp('new') });
  assert.equal(r.name, 'new');
});

test('own scripts fall back to cache offline', async () => {
  const r = await swFetch({ url: 'https://u.github.io/fitstand/draw.js', cached: resp('old'), network: new Error('offline') });
  assert.equal(r.name, 'old');
});

test('fonts from other origins stay cache-first', async () => {
  const r = await swFetch({ url: 'https://fonts.gstatic.com/x.woff2', cached: resp('old'), network: resp('new') });
  assert.equal(r.name, 'old');
});
