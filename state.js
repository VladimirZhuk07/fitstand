// Фитстенд — чтение сохранённых параметров из localStorage с проверкой каждого поля. Без DOM.
(function (root) {
const isOldQuiz = q => Array.isArray(q) && q.length === 6 &&
  q.every(v => v === null || (Number.isInteger(v) && v >= 0 && v <= 4));
const SINGLE = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'back2', 'knee2', 'cushion'];
const MULTI = ['back1', 'knee1', 'upper1'];
const GATE = ['back', 'knees', 'upper', 'none'];
const isNum = n => Number.isInteger(n) && n >= 0 && n <= 9;
const distinct = a => new Set(a).size === a.length;

// ответы опроса: старый массив из 6 переводится в {v:2, a}; в v2 остаются только допустимые поля
function readQuiz(q) {
  if (isOldQuiz(q)) {
    const a = {};
    q.forEach((v, i) => { if (v !== null) a['q' + (i + 1)] = v; });
    return { v: 2, a };
  }
  if (!q || typeof q !== 'object' || q.v !== 2 || !q.a || typeof q.a !== 'object' || Array.isArray(q.a)) return null;
  const a = {};
  for (const k of SINGLE) if (isNum(q.a[k])) a[k] = q.a[k];
  for (const k of MULTI) {
    const v = q.a[k];
    if (Array.isArray(v) && v.length >= 1 && v.length <= 6 && v.every(isNum) && distinct(v)) a[k] = [...v];
  }
  const g = q.a.gate;
  if (Array.isArray(g) && g.length >= 1 && g.every(x => GATE.includes(x)) && distinct(g)) a.gate = [...g];
  return { v: 2, a };
}

// поправки посадки по здоровью: всё или ничего
function readHealth(h) {
  if (!h || typeof h !== 'object') return null;
  const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  if (!num(h.upright, 0, 12) || !num(h.barUp, 0, 60)) return null;
  if (!(h.crankMax === null || num(h.crankMax, 145, 175))) return null;
  if (typeof h.stepThrough !== 'boolean') return null;
  if (!Array.isArray(h.gear) || h.gear.length > 12 || !h.gear.every(x => typeof x === 'string')) return null;
  return { upright: h.upright, barUp: h.barUp, crankMax: h.crankMax, stepThrough: h.stepThrough, gear: [...h.gear] };
}

// raw: строка из localStorage или null; возвращает новый объект на основе defaults
function loadSaved(raw, defaults, styles, colors) {
  const out = { ...defaults };
  let sv;
  try { sv = JSON.parse(raw); } catch (e) { return out; }
  if (!sv || typeof sv !== 'object') return out;
  for (const k of ['H', 'I', 'A', 'W', 'flex']) if (typeof sv[k] === 'number' && isFinite(sv[k])) out[k] = sv[k];
  if (typeof sv.style === 'string' && Object.prototype.hasOwnProperty.call(styles, sv.style)) out.style = sv.style;
  if (colors.includes(sv.color)) out.color = sv.color;
  for (const k of ['rider', 'dims', 'motor']) if (typeof sv[k] === 'boolean') out[k] = sv[k];
  out.quiz = readQuiz(sv.quiz) || defaults.quiz;
  out.health = readHealth(sv.health) || defaults.health || null;
  out.healthOn = typeof sv.healthOn === 'boolean' ? sv.healthOn : defaults.healthOn !== false;
  return out;
}

const api = { loadSaved };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
