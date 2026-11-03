// Фитстенд — чтение сохранённых параметров из localStorage с проверкой каждого поля. Без DOM.
(function (root) {
const isQuiz = q => Array.isArray(q) && q.length === 6 &&
  q.every(v => v === null || (Number.isInteger(v) && v >= 0 && v <= 4));

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
  if (isQuiz(sv.quiz)) out.quiz = [...sv.quiz];
  return out;
}

const api = { loadSaved };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
