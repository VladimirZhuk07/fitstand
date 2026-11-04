const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSaved } = require('../state.js');

const STYLES = { road: {}, gravel: {}, city: {}, hybrid: {}, mtb: {}, folding: {} };
const COLORS = ['#2B47D6', '#D44A2C'];
const DEF = { H: 178, I: 83, A: 61, W: 42, flex: 3, style: 'road', color: '#2B47D6', rider: true, dims: true, motor: false, quiz: null, health: null, healthOn: true, playing: true };
const load = obj => loadSaved(typeof obj === 'string' ? obj : JSON.stringify(obj), DEF, STYLES, COLORS);

test('old v1 save loads', () => {
  const s = load({ H: 170, I: 80, A: 58, W: 40, flex: 2, style: 'city', color: '#2B47D6', rider: true, dims: false });
  assert.deepEqual([s.H, s.I, s.A, s.W, s.flex, s.style, s.color, s.rider, s.dims], [170, 80, 58, 40, 2, 'city', '#2B47D6', true, false]);
  assert.equal(s.motor, false);
  assert.equal(s.quiz, null);
  assert.equal(s.playing, true);
});

test('new fields load', () => {
  const s = load({ style: 'mtb', motor: true, quiz: [0, 1, null, 2, 3, 4] });
  assert.equal(s.style, 'mtb');
  assert.equal(s.motor, true);
  assert.deepEqual(s.quiz, { v: 2, a: { q1: 0, q2: 1, q4: 2, q5: 3, q6: 4 } });
});

test('bad quiz ignored', () => {
  for (const quiz of ['x', [1, 2], [0, 0, 0, 0, 0, 7], [0.5, 0, 0, 0, 0, 0], { 0: 1 }])
    assert.equal(load({ quiz }).quiz, null, JSON.stringify(quiz));
});

test('broken json and empty storage give defaults', () => {
  assert.deepEqual(load('{'), DEF);
  assert.deepEqual(loadSaved(null, DEF, STYLES, COLORS), DEF);
  assert.deepEqual(load('null'), DEF);
});

test('unknown values are ignored', () => {
  const s = load({ style: 'bmx', color: '#000', H: 'tall', I: Infinity, motor: 'yes' });
  assert.deepEqual([s.style, s.color, s.H, s.I, s.motor], ['road', '#2B47D6', 178, 83, false]);
});

test('defaults are not mutated', () => {
  load({ H: 150, quiz: [0, 0, 0, 0, 0, 0] });
  assert.equal(DEF.H, 178);
  assert.equal(DEF.quiz, null);
});

test('migrates old quiz array', () => {
  assert.deepEqual(load({ quiz: [0, 1, null, 2, 3, 4] }).quiz, { v: 2, a: { q1: 0, q2: 1, q4: 2, q5: 3, q6: 4 } });
  assert.deepEqual(load({ quiz: [null, null, null, null, null, null] }).quiz, { v: 2, a: {} });
});

test('v2 quiz loads and filters', () => {
  const a = { q1: 0, q2: 4, gate: ['back', 'knees'], back1: [0, 5], back2: 3, knee1: [1], knee2: 2, upper1: [4], cushion: 0 };
  assert.deepEqual(load({ quiz: { v: 2, a } }).quiz, { v: 2, a });
  const bad = { q1: 12, q2: 1, back1: [1, 1], knee1: [], upper1: [0, 'x'], gate: ['x'], cushion: -1, extra: 1 };
  assert.deepEqual(load({ quiz: { v: 2, a: bad } }).quiz, { v: 2, a: { q2: 1 } });
  assert.equal(load({ quiz: { v: 3, a } }).quiz, null);
  assert.equal(load({ quiz: { v: 2, a: [] } }).quiz, null);
});

test('health loads and filters', () => {
  const h = { upright: 6, barUp: 30, crankMax: 155, stepThrough: true, gear: ['suspFork', 'wideTyres'] };
  assert.deepEqual(load({ health: h }).health, h);
  assert.deepEqual(load({ health: { ...h, crankMax: null } }).health.crankMax, null);
  for (const bad of [{ ...h, upright: 20 }, { ...h, barUp: -1 }, { ...h, crankMax: 120 }, { ...h, stepThrough: 'yes' }, { ...h, gear: 'x' }, { ...h, gear: [1] }, 'x'])
    assert.equal(load({ health: bad }).health, null, JSON.stringify(bad));
});

test('healthOn default true', () => {
  assert.equal(load({}).healthOn, true);
  assert.equal(load({ healthOn: false }).healthOn, false);
  assert.equal(load({ healthOn: 'no' }).healthOn, true);
});
