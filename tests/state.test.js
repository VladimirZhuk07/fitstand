const test = require('node:test');
const assert = require('node:assert/strict');
const { loadSaved, riderOf } = require('../state.js');

const STYLES = { road: {}, gravel: {}, city: {}, hybrid: {}, mtb: {}, folding: {},
  kidTraining: { kidFit: { range: [85, 125], def: 110 } }, teen: { kidFit: { range: [125, 165], def: 145 } } };
const KID_DEF = { kidTraining: 110, teen: 145 };
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
  const WANT = { ...DEF, kidH: KID_DEF };
  assert.deepEqual(load('{'), WANT);
  assert.deepEqual(loadSaved(null, DEF, STYLES, COLORS), WANT);
  assert.deepEqual(load('null'), WANT);
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

// ---------- fit styles only (sub-project A, Task 5) ----------
const MODEL = require('../model.js');
const FIT = Object.fromEntries(MODEL.FIT_STYLES.map(s => [s, MODEL.STYLES[s]]));
test('old saved mtb style still loads', () => {
  assert.equal(loadSaved(JSON.stringify({ style: 'mtb' }), DEF, FIT, COLORS).style, 'mtb');
  assert.equal(loadSaved(JSON.stringify({ style: 'fullsus' }), DEF, FIT, COLORS).style, 'fullsus');
});
test('catalog-only styles are rejected', () => {
  for (const style of ['balance', 'kidTrike', 'special', 'trike', 'cargo']) assert.equal(loadSaved(JSON.stringify({ style }), DEF, FIT, COLORS).style, 'road', style);
});

test('loadSaved keeps a saved style', () => {
  const DEF_H = { ...DEF, style: 'hybrid' };
  const st = style => loadSaved(JSON.stringify({ style }), DEF_H, FIT, COLORS).style;
  assert.equal(st('road'), 'road');
  assert.equal(st('women'), 'women');
  assert.equal(st('bmx'), 'bmx');
  assert.equal(st('kidTrike'), 'hybrid');
  assert.equal(loadSaved(null, DEF_H, FIT, COLORS).style, 'hybrid');
});

// ---------- a child's height per kids' style (feedback 6, Task 5) ----------
test('kidH: saved heights load, bad ones fall back per style', () => {
  assert.deepEqual(load({ kidH: { kidTraining: 100, teen: 200 } }).kidH, { kidTraining: 100, teen: 145 });
  assert.deepEqual(load({ kidH: 'x' }).kidH, KID_DEF);
  assert.deepEqual(load({}).kidH, KID_DEF);
  assert.deepEqual(load({ kidH: { kidTraining: NaN } }).kidH, KID_DEF);
  assert.deepEqual(load('{"kidH":{"kidTraining":null,"teen":"150"}}').kidH, KID_DEF);
  assert.deepEqual(load({ kidH: { road: 150 } }).kidH, KID_DEF);
  const saved = { kidTraining: 100 };
  assert.notEqual(load({ kidH: saved }).kidH, saved);
});

test('riderOf: adults and kids keep separate measures', () => {
  const kidBody = H => ({ I: H * 0.45, A: H * 0.33, W: H * 0.23, headK: 0.07 });
  const st = { H: 178, I: 83, A: 61, W: 42, style: 'teen', kidH: { kidTraining: 100, teen: 150 } };
  const k = riderOf(st, STYLES, kidBody);
  assert.equal(k.H, 150);
  assert.equal(k.I, 67.5);
  assert.equal(k.headK, 0.07);
  assert.deepEqual(riderOf({ ...st, style: 'road' }, STYLES, kidBody), { H: 178, I: 83, A: 61, W: 42 });
});

test('an old save with a kid style opens on the default height', () => {
  const kidBody = H => ({ I: H * 0.45, A: H * 0.33, W: H * 0.23 });
  const s = load({ style: 'teen' });
  assert.equal(s.style, 'teen');
  assert.equal(riderOf(s, STYLES, kidBody).H, 145);
  assert.equal(riderOf({ style: 'teen' }, STYLES, kidBody).H, 145);
  assert.equal(riderOf({ style: 'teen', kidH: {} }, STYLES, kidBody).H, 145);
});
