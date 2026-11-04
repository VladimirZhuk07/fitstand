// Фитстенд — подсчёт результата опроса «какой велосипед нужен». Без DOM.
(function (root) {
const BASE_TYPES = ['city', 'hybrid', 'gravel', 'mtb', 'road', 'folding'];
const TIE_ORDER = ['hybrid', 'city', 'gravel', 'road', 'mtb', 'folding'];
const PRIORITY_Q = 2; // «Что для вас важнее всего?» решает ничью
const RUNNER_UP_SHARE = 0.75;
const MAX_REASONS = 3;

// answers: номер ответа (с 0) на каждый вопрос или null; quiz: вопросы из content.js;
// ebikeHint: текст совета про электровелосипед (CONTENT.ebikeHint), без него совет не добавляется
function scoreQuiz(answers, quiz, ebikeHint) {
  const firstMissing = quiz.findIndex((q, i) => !Number.isInteger(answers[i]) || !q.answers[answers[i]]);
  if (firstMissing !== -1) return { complete: false, firstMissing };

  const chosen = quiz.map((q, i) => q.answers[answers[i]]);
  const pts = (a, t) => (a.pts && a.pts[t]) || 0;
  const scores = {};
  for (const t of BASE_TYPES) scores[t] = chosen.reduce((s, a) => s + pts(a, t), 0);

  const priority = chosen[PRIORITY_Q];
  const ranked = [...BASE_TYPES].sort((a, b) =>
    scores[b] - scores[a] || pts(priority, b) - pts(priority, a) || TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b));
  const allZero = scores[ranked[0]] === 0;
  const type = allZero ? 'hybrid' : ranked[0];
  const second = ranked[1];
  const runnerUp = !allZero && scores[second] >= RUNNER_UP_SHARE * scores[type] ? second : null;

  const motorAnswer = chosen.find(a => a.motor === true);
  const motor = Boolean(motorAnswer);
  const reasons = chosen
    .map((a, i) => ({ a, i, p: pts(a, type) }))
    .filter(x => x.p > 0)
    .sort((x, y) => y.p - x.p || x.i - y.i)
    .slice(0, motor && motorAnswer.reason ? MAX_REASONS - 1 : MAX_REASONS)
    .map(x => x.a.reason);
  if (motor && motorAnswer.reason) reasons.push(motorAnswer.reason);

  const notes = chosen.filter(a => a.note).map(a => a.note);
  if (ebikeHint && !motor && [0, 3].includes(answers[1]) && [0, 3].includes(answers[5])) notes.push(ebikeHint);

  return { complete: true, type, motor, scores, runnerUp, reasons, notes };
}

// ---------- ход опроса с блоками здоровья ----------
// Answers: {q1..q6: номер, gate: [id], back1: [номер], back2: номер, knee1, knee2, upper1, cushion}
const BASE_IDS = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'];
const BLOCK_ORDER = ['back', 'knees', 'upper'];
const MAX_STEPS = 16;

function gateBlocks(A) {
  const gate = A && Array.isArray(A.gate) ? A.gate : [];
  if (gate.includes('none')) return [];
  return BLOCK_ORDER.filter(id => gate.includes(id));
}

function getQuestion(id, C) {
  const i = BASE_IDS.indexOf(id);
  if (i !== -1) return { id, multi: false, ...C.quiz[i] };
  if (id === 'gate') return C.health.gate;
  if (id === 'cushion') return C.health.cushion;
  for (const b of C.health.blocks) for (const q of b.questions) if (q.id === id) return q;
  return null;
}

function quizFlow(A, C) {
  const steps = BASE_IDS.map(id => ({ kind: 'q', id }));
  steps.push({ kind: 'q', id: 'gate' });
  const blocks = gateBlocks(A);
  for (const b of C.health.blocks.filter(x => blocks.includes(x.id))) {
    for (const q of b.questions) steps.push({ kind: 'q', id: q.id });
    steps.push({ kind: 'explain', block: b.id });
  }
  if (blocks.length) steps.push({ kind: 'q', id: 'cushion' });
  return steps;
}

function isAnswered(step, A, C) {
  if (step.kind === 'explain') return true;
  const q = getQuestion(step.id, C), v = A ? A[step.id] : undefined;
  if (!q) return false;
  if (step.id === 'gate') {
    const ok = new Set(q.answers.map(a => a.id));
    return Array.isArray(v) && v.length > 0 && v.every(x => ok.has(x));
  }
  const valid = n => Number.isInteger(n) && n >= 0 && n < q.answers.length;
  if (q.multi) return Array.isArray(v) && v.length > 0 && v.every(valid);
  return valid(v);
}

function firstMissingStep(A, C) {
  return quizFlow(A, C).findIndex(s => !isAnswered(s, A, C));
}

function pruneAnswers(A, C) {
  const out = { ...(A || {}) };
  const keep = new Set(gateBlocks(out));
  for (const b of C.health.blocks) if (!keep.has(b.id)) for (const q of b.questions) delete out[q.id];
  if (!keep.size) delete out.cushion;
  return out;
}

const api = { BASE_TYPES, TIE_ORDER, scoreQuiz, MAX_STEPS, gateBlocks, getQuestion, quizFlow, isAnswered, firstMissingStep, pruneAnswers };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
