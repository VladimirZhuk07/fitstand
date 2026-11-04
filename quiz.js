// Фитстенд — подсчёт результата опроса «какой велосипед нужен». Без DOM.
(function (root) {
const BASE_TYPES = ['city', 'hybrid', 'gravel', 'mtb', 'road', 'folding'];
const TIE_ORDER = ['hybrid', 'city', 'gravel', 'road', 'mtb', 'folding'];
const PRIORITY_Q = 2; // «Что для вас важнее всего?» решает ничью
const RUNNER_UP_SHARE = 0.75;
const MAX_REASONS = 3;

// виды по убыванию баллов; ничья — по баллам ответа на «Что для вас важнее всего?», затем TIE_ORDER
function rankTypes(scores, priorityAnswer) {
  const pts = (a, t) => (a && a.pts && a.pts[t]) || 0;
  return [...BASE_TYPES].sort((a, b) =>
    scores[b] - scores[a] || pts(priorityAnswer, b) - pts(priorityAnswer, a) || TIE_ORDER.indexOf(a) - TIE_ORDER.indexOf(b));
}

// answers: номер ответа (с 0) на каждый вопрос или null; quiz: вопросы из content.js;
// ebikeHint: текст совета про электровелосипед (CONTENT.ebikeHint), без него совет не добавляется
// forType: build the reasons for this type instead of the winner (used when health points change the winner)
function scoreQuiz(answers, quiz, ebikeHint, forType) {
  const firstMissing = quiz.findIndex((q, i) => !Number.isInteger(answers[i]) || !q.answers[answers[i]]);
  if (firstMissing !== -1) return { complete: false, firstMissing };

  const chosen = quiz.map((q, i) => q.answers[answers[i]]);
  const pts = (a, t) => (a.pts && a.pts[t]) || 0;
  const scores = {};
  for (const t of BASE_TYPES) scores[t] = chosen.reduce((s, a) => s + pts(a, t), 0);

  const ranked = rankTypes(scores, chosen[PRIORITY_Q]);
  const allZero = scores[ranked[0]] === 0;
  const type = allZero ? 'hybrid' : ranked[0];
  const second = ranked[1];
  const runnerUp = !allZero && scores[second] >= RUNNER_UP_SHARE * scores[type] ? second : null;

  const motorAnswer = chosen.find(a => a.motor === true);
  const motor = Boolean(motorAnswer);
  const reasons = chosen
    .map((a, i) => ({ a, i, p: pts(a, forType || type) }))
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

// ---------- результат с учётом здоровья: 2–3 варианта ----------
const COMFORT_ORDER = ['city', 'hybrid', 'gravel', 'mtb', 'road'];
const CAP = { upright: 12, barUp: 60, crankMin: 145 };
const COMFORT_GEAR = ['suspFork', 'suspPost', 'wideTyres', 'riseBar'];
const SUSPENSION = ['fullSusp', 'suspFork', 'suspPost'];

const isOffroad = A => Boolean(A) && (A.q1 === 2 || A.q4 === 3 || A.q4 === 4);
// MTB → full suspension: jumps, critical cushioning, or a bad back on rough ground
const wantsFullSus = A => Boolean(A) && (A.q4 === 4 || A.cushion === 0 || (gateBlocks(A).includes('back') && isOffroad(A)));

function chosenHealthAnswers(A, C) {
  const out = [];
  for (const s of quizFlow(A, C)) {
    if (s.kind !== 'q' || BASE_IDS.includes(s.id) || s.id === 'gate') continue;
    const q = getQuestion(s.id, C), v = A[s.id];
    for (const i of (Array.isArray(v) ? v : [v])) out.push(q.answers[i]);
  }
  return out;
}

function buildResult(A0, C) {
  const A = pruneAnswers(A0, C);
  const missing = firstMissingStep(A, C);
  if (missing !== -1) return { complete: false, firstMissing: missing };

  const base = scoreQuiz(BASE_IDS.map(id => A[id]), C.quiz, C.ebikeHint);
  const chosen = chosenHealthAnswers(A, C);
  const offroad = isOffroad(A);

  const scores = { ...base.scores };
  for (const a of chosen) for (const [t, v] of Object.entries(a.pts || {})) scores[t] += v;
  const ranked = rankTypes(scores, C.quiz[PRIORITY_Q].answers[A.q3]);
  const type = Math.max(...Object.values(scores)) <= 0 ? 'hybrid' : ranked[0];

  const sum = k => chosen.reduce((s, a) => s + ((a.fit && a.fit[k]) || 0), 0);
  const cranks = chosen.map(a => a.fit && a.fit.crankMax).filter(Number.isFinite);
  const health = {
    upright: Math.min(CAP.upright, sum('upright')),
    barUp: Math.min(CAP.barUp, sum('barUp')),
    crankMax: cranks.length ? Math.max(CAP.crankMin, Math.min(...cranks)) : null,
    stepThrough: chosen.some(a => a.fit && a.fit.stepThrough === true),
  };

  const order = C.health.gearOrder;
  const sortGear = set => order.filter(id => set.has(id));
  const G = new Set();
  for (const a of chosen) {
    for (const g of a.gear || []) G.add(g);
    if (offroad) for (const g of a.offroadGear || []) G.add(g);
  }
  if (health.stepThrough) G.add('stepThrough');
  // a more upright back or a higher bar needs a riser bar or a high stem — spacers alone do not reach
  if (health.upright >= 3 || health.barUp > 0) G.add('riseBar');
  if (health.crankMax !== null) G.add('shortCranks');

  // full suspension is a type of its own, not a gear label
  G.delete('fullSusp');
  const shown = wantsFullSus(A) && type === 'mtb' ? 'fullsus' : type;
  const warnFor = t => { const w = t === 'fullsus' ? 'mtb' : t;
    return [...new Set(chosen.filter(a => a.warn && a.warn.types.includes(w)).map(a => a.warn.text))]; };
  const variant = (kind, t, gear, fit) => ({ kind, type: t, motor: base.motor, gear: sortGear(gear), fit, warn: warnFor(t) });
  const variants = [variant('balance', shown, G, health)];

  let comfortType;
  if (offroad) comfortType = 'fullsus';
  else if (type === 'folding') comfortType = 'folding';
  else comfortType = COMFORT_ORDER.find(t => scores[t] > 0 && scores[t] >= 0.5 * scores[type]) || type;
  if (comfortType === 'mtb' && shown === 'fullsus') comfortType = 'fullsus';
  const comfortGear = new Set(G);
  const mtbLike = comfortType === 'mtb' || comfortType === 'fullsus';
  for (const g of COMFORT_GEAR) if (!(g === 'suspFork' && mtbLike)) comfortGear.add(g);
  const comfortFit = { ...health, upright: Math.min(CAP.upright, health.upright + 3), barUp: Math.min(CAP.barUp, health.barUp + 20) };
  const sameSet = (a, b) => a.size === b.size && [...a].every(x => b.has(x));
  if (!(comfortType === shown && sameSet(comfortGear, G))) variants.push(variant('comfort', comfortType, comfortGear, comfortFit));

  const simpleGear = new Set([...G].filter(g => !SUSPENSION.includes(g)));
  simpleGear.add('wideTyres');
  // the simpler choice for a full-suspension MTB is a hardtail
  if (shown === 'fullsus') variants.push(variant('simple', 'mtb', simpleGear, health));
  else if ([...G].some(g => SUSPENSION.includes(g))) variants.push(variant('simple', shown, simpleGear, health));

  const healthReasons = [...new Set(chosen.map(a => a.reason).filter(Boolean))].slice(0, 2);
  // reasons from the first six answers, rebuilt for the final winner
  const forWinner = type === base.type ? base.reasons : scoreQuiz(BASE_IDS.map(id => A[id]), C.quiz, C.ebikeHint, type).reasons;
  const motorReason = base.motor ? forWinner[forWinner.length - 1] : null;
  const baseReasons = base.motor ? forWinner.slice(0, -1) : forWinner;
  const reasons = [...healthReasons, ...baseReasons].slice(0, motorReason ? 3 : 4);
  if (motorReason) reasons.push(motorReason);

  const hint = C.ebikeHint && base.notes.includes(C.ebikeHint) ? C.ebikeHint : null;
  const notes = [...base.notes.filter(n => n !== hint), ...chosen.map(a => a.note).filter(Boolean)];
  if (hint) notes.push(hint);

  return { complete: true, scores, motor: base.motor, variants, reasons, notes, rehab: chosen.some(a => a.rehab === true), health };
}

// ---------- аксессуары: ситуации по ответам и подбор 3–5 штук ----------
function accSituations(A, C) {
  const out = new Set();
  if (!A) return out;
  const blocks = gateBlocks(A);
  if (A.q1 === 0 || A.q2 === 0) out.add('city');
  if (A.q2 === 0) out.add('commute');
  if (A.q2 === 0 || A.q6 === 0) out.add('rain');
  if (A.q2 === 3 || A.q6 === 0) out.add('touring');
  if (A.q2 === 2 || A.q2 === 3) out.add('long');
  if (isOffroad(A)) out.add('offroad');
  if (A.q6 === 3) out.add('kids');
  if (blocks.includes('back')) out.add('back');
  if (blocks.includes('knees')) out.add('knees');
  if (blocks.includes('upper') && Array.isArray(A.upper1) && A.upper1.some(i => [2, 3, 4].includes(i))) out.add('wrists');
  return out;
}

const MAX_ACC = 5;
const SPECIFIC = new Set(['kids', 'back', 'wrists', 'knees', 'offroad', 'touring']);
function recommendAccessories(A, C) {
  const sit = accSituations(A, C), items = Object.entries(C.accessories);
  const hit = a => a.when === 'always' || a.when.some(w => sit.has(w));
  // within one priority: items for everyone, then items for this person's specific situation, then general city ones
  const rank = a => (a.when === 'always' ? 0 : a.when.every(w => SPECIFIC.has(w)) ? 1 : 2);
  const top = items.filter(([, a]) => hit(a))
    .map(([id, a], i) => ({ id, p: a.priority, r: rank(a), i }))
    .sort((x, y) => x.p - y.p || x.r - y.r || x.i - y.i)
    .slice(0, MAX_ACC).map(x => x.id);
  const bySituation = Object.entries(C.accSituationTitles)
    .filter(([id]) => sit.has(id))
    .map(([id, title]) => ({ id, title, ids: items.filter(([, a]) => Array.isArray(a.when) && a.when.includes(id)).map(([k]) => k) }))
    .filter(x => x.ids.length);
  return { top, bySituation };
}

const api = { accSituations, recommendAccessories, BASE_TYPES, TIE_ORDER, COMFORT_ORDER, scoreQuiz, rankTypes, isOffroad, wantsFullSus, buildResult, MAX_STEPS, gateBlocks, getQuestion, quizFlow, isAnswered, firstMissingStep, pruneAnswers };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
