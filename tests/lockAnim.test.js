const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('../lockAnim.js');

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test('steps follow the timeline', () => {
  const ts = [0, 2.99, 3, 4.99, 5, 6.99, 7, 9.99], want = [1, 1, 2, 2, 3, 3, 4, 4];
  ts.forEach((t, i) => assert.equal(L.lockState(t).step, want[i], `t=${t}`));
  assert.equal(L.LOCK_PERIOD, 10);
});

test('the loop closes without a jump', () => {
  const a = L.lockState(9.999), b = L.lockState(0);
  // flow is a direction sign (+1 on step 1, 0 at the end of step 4): it steps by design, so it is not in the seam check
  for (const k of ['c', 'lever', 'valve', 'hitD', 'hitA']) assert.ok(Math.abs(a[k] - b[k]) <= 0.01, k);
});

test('time wraps around the period', () => {
  assert.deepEqual(L.lockState(-1), L.lockState(9));
  assert.deepEqual(L.lockState(23), L.lockState(3));
});

test('compression: 0.7 at the end of step 1, almost none when locked', () => {
  near(L.lockState(3).c, 0.7);
  for (let i = 0; i < 300; i++) assert.ok(L.lockState(7 + i * 0.01).c <= 0.04 + 1e-9, `t=${7 + i * 0.01}`);
  assert.equal(L.lockState(5).c, 0);
});

test('the valve closes after the lever and both open at the end', () => {
  assert.ok(L.lockState(6).valve < L.lockState(6).lever);
  assert.equal(L.lockState(8).lever, 1);
  assert.equal(L.lockState(8).valve, 1);
  assert.ok(L.lockState(9.999).lever < 0.01);
});

test('oil flows only while the fork moves freely', () => {
  assert.equal(L.lockState(1).flow, 1);
  assert.equal(L.lockState(4).flow, -1);
  assert.equal(L.lockState(6).flow, 0);
  assert.equal(L.lockState(8).flow, 0);
});

test('the impact arrow comes, bounces, fades', () => {
  assert.equal(L.lockState(6.9).hitA, 0);
  near(L.lockState(7.8).hitD, 0, 1e-3);
  near(L.lockState(8.6).hitD, 0.6, 1e-3);
  assert.equal(L.lockState(9.5).hitA, 0);
});

test('sw caches lockAnim.js', () => {
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  assert.ok(sw.includes("'./lockAnim.js'"));
});
