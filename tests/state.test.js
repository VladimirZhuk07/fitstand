const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSaved } = require('../state.js');

const STYLES = { road: {}, gravel: {}, city: {}, hybrid: {}, mtb: {}, folding: {} };
const COLORS = ['#2B47D6', '#D44A2C'];
const DEF = { H: 178, I: 83, A: 61, W: 42, flex: 3, style: 'road', color: '#2B47D6', rider: true, dims: true, motor: false, quiz: null, playing: true };
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
  assert.deepEqual(s.quiz, [0, 1, null, 2, 3, 4]);
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
