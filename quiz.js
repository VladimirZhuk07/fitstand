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

const api = { BASE_TYPES, TIE_ORDER, scoreQuiz };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
