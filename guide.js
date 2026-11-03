// Фитстенд — экраны гида поверх фитстенда: опрос, результат, каталог видов, справочник узлов.
// Адрес после # определяет экран; parseRoute и backTarget — чистые функции (тестируются в Node).
(function (root) {
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);

function parseRoute(hash, content) {
  const parts = String(hash || '').replace(/^#/, '').split('/');
  const [head, arg, extra] = parts;
  if (extra !== undefined) return { view: 'fit' };
  if (head === 'quiz') {
    const n = Number(arg);
    return { view: 'quiz', n: Number.isInteger(n) && n >= 1 && n <= content.quiz.length ? n : 1 };
  }
  if (head === 'result' && arg === undefined) return { view: 'result' };
  if (head === 'types') return arg !== undefined && has(content.types, arg) ? { view: 'type', id: arg } : { view: 'types' };
  if (head === 'parts') return arg !== undefined && has(content.parts, arg) ? { view: 'part', id: arg } : { view: 'parts' };
  return { view: 'fit' };
}

// how to get from a guide screen back to the fitstand: step back over our own entries, or replace the address
function backTarget(historyState) {
  const fs = historyState && historyState.fs;
  return Number.isInteger(fs) && fs > 0 ? { kind: 'back', steps: fs } : { kind: 'replace' };
}

// a second tap that lands on the next question within this time is a double tap, not an answer
const ANSWER_GUARD_MS = 350;
function answerAllowed(lastAnswerAt, now) {
  return lastAnswerAt === 0 || now - lastAnswerAt >= ANSWER_GUARD_MS;
}

function init() {
  const C = root.CONTENT, page = document.getElementById('page'), wrap = document.querySelector('.wrap');
  const fsApi = () => root.fitstand;
  const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  let lastAnswerAt = 0;
  const depth = () => (history.state && Number.isInteger(history.state.fs) ? history.state.fs : 0);

  function go(hash) { history.pushState({ fs: depth() + 1 }, '', hash); render(); }
  function toFit() {
    const t = backTarget(history.state);
    if (t.kind === 'back') history.go(-t.steps);
    else { history.replaceState(null, '', location.pathname + location.search); render(); }
  }
  function back() { if (depth() > 0) history.back(); else toFit(); }

  const head = (title, small) => `<header class="pg-head"><button class="pg-back" data-action="back" aria-label="Назад">←</button>
    <div>${small ? `<div class="pg-small">${esc(small)}</div>` : ''}<h1 tabindex="-1">${esc(title)}</h1></div></header>`;
  const bike = (style, motor, hl, cls = 'pg-bike') =>
    `<svg class="bike ${cls}" data-style="${style}"${motor ? ' data-motor="1"' : ''}${hl ? ` data-hl="${hl}"` : ''} role="img" aria-label="Схема велосипеда"></svg>`;
  const list = (items, cls) => `<ul class="${cls}">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
  const prosCons = (pros, cons) => `<div class="pc"><div><h3>Плюсы</h3>${list(pros, 'pros')}</div><div><h3>Минусы</h3>${list(cons, 'cons')}</div></div>`;
  const program = t => `<section><h2>С чего начать</h2><ol class="prog">${t.program.map(s => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span></li>`).join('')}</ol></section>`;
  const switcher = on => `<nav class="pg-switch" aria-label="Разделы гида"><a href="#types"${on === 'types' ? ' aria-current="page"' : ''}>Виды</a><a href="#parts"${on === 'parts' ? ' aria-current="page"' : ''}>Узлы</a></nav>`;
  const fitBtn = (style, motor) => `<button class="btn primary" data-action="fit" data-style="${style}"${motor ? ' data-motor="1"' : ''}>Подобрать размер</button>`;

  function quizView(n) {
    const q = C.quiz[n - 1], ans = (fsApi().getQuiz() || [])[n - 1];
    return head(q.q, `Вопрос ${n} / ${C.quiz.length}`) +
      `<div class="pg-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${C.quiz.length}" aria-valuenow="${n}"><i style="width:${(n / C.quiz.length) * 100}%"></i></div>` +
      `<div class="answers">${q.answers.map((a, i) => `<button class="ans" data-answer="${i}" aria-pressed="${ans === i}">${esc(a.text)}</button>`).join('')}</div>`;
  }
  function resultView(r) {
    const t = C.types[r.type];
    const reasons = r.reasons.map(cap);
    const name = t.name + (r.motor ? ' с мотором' : '');
    return head(name, 'Вам подойдёт') + bike(r.type, r.motor) +
      `<p class="lead">${esc(t.purpose)}</p>` +
      (reasons.length ? `<section><h2>Почему</h2>${list(reasons, 'why')}</section>` : '') +
      (r.runnerUp ? `<section><h2>Ещё подойдёт</h2><p><a href="#types/${r.runnerUp}">${esc(C.types[r.runnerUp].name)}</a> — ${esc(C.types[r.runnerUp].short.toLowerCase())}</p></section>` : '') +
      (r.notes.length ? `<section><h2>Что учесть</h2>${list(r.notes, 'notes')}</section>` : '') +
      `<section>${prosCons(t.pros, t.cons)}</section>` + program(t) +
      `<div class="pg-actions">${fitBtn(r.type, r.motor)}<button class="btn" data-action="restart">Пройти заново</button><a class="btn" href="#types">Все виды</a></div>`;
  }
  const typeBike = id => (id === 'ebike' ? ['city', true] : [id, false]);
  function typesView() {
    return head('Виды велосипедов') + switcher('types') +
      `<div class="cards">${C.typeOrder.map(id => { const [s, m] = typeBike(id);
        return `<a class="card" href="#types/${id}">${bike(s, m, null, 'card-bike')}<b>${esc(C.types[id].name)}</b><span>${esc(C.types[id].short)}</span></a>`; }).join('')}</div>`;
  }
  function typeView(id) {
    const t = C.types[id], [s, m] = typeBike(id);
    return head(t.name) + bike(s, m) + `<p class="lead">${esc(t.purpose)}</p>` +
      `<section><h2>Кому подходит</h2><p>${esc(t.forWhom)}</p></section>` +
      `<section>${prosCons(t.pros, t.cons)}</section>` + program(t) +
      `<div class="pg-actions">${fitBtn(s, m)}<a class="btn" href="#quiz/1">Пройти опрос</a></div>`;
  }
  function partsView() {
    return head('Узлы велосипеда') + switcher('parts') +
      `<div class="cards">${C.partOrder.map(id => `<a class="card" href="#parts/${id}"><b>${esc(C.parts[id].name)}</b><span>${esc(C.parts[id].short)}</span></a>`).join('')}</div>`;
  }
  function partView(id) {
    const p = C.parts[id], st = fsApi().getState();
    return head(p.name) + bike(st.style, st.motor, id) + `<p class="lead">${esc(p.short)}</p>` +
      p.variants.map(v => `<article class="var"><h2>${esc(v.name)}</h2><p>${esc(v.text)}</p>${prosCons(v.pros, v.cons)}</article>`).join('');
  }

  function render() {
    const r = parseRoute(location.hash, C);
    const open = r.view !== 'fit';
    page.hidden = !open;
    document.body.classList.toggle('page-open', open);
    if (wrap) wrap.inert = open;
    if (!open) { page.innerHTML = ''; return; }
    let html;
    if (r.view === 'quiz') html = quizView(r.n);
    else if (r.view === 'result') {
      const res = root.scoreQuiz(fsApi().getQuiz() || [], C.quiz, C.ebikeHint);
      if (!res.complete) { history.replaceState(history.state, '', '#quiz/' + (res.firstMissing + 1)); return render(); }
      html = resultView(res);
    } else if (r.view === 'types') html = typesView();
    else if (r.view === 'type') html = typeView(r.id);
    else if (r.view === 'parts') html = partsView();
    else html = partView(r.id);
    page.innerHTML = `<div class="pg">${html}</div>`;
    page.querySelectorAll('svg[data-style]').forEach(svg =>
      fsApi().drawBike(svg, { style: svg.dataset.style, motor: svg.dataset.motor === '1', highlight: svg.dataset.hl || null }));
    page.scrollTop = 0;
    const h = page.querySelector('h1'); if (h) h.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); go(a.getAttribute('href')); return; }
    const b = e.target.closest('#page button');
    if (!b) return;
    if (b.dataset.answer !== undefined) {
      const now = performance.now();
      if (!answerAllowed(lastAnswerAt, now)) return;
      lastAnswerAt = now;
      const n = parseRoute(location.hash, C).n, answers = fsApi().getQuiz() || C.quiz.map(() => null);
      answers[n - 1] = Number(b.dataset.answer);
      fsApi().setQuiz(answers);
      go(n < C.quiz.length ? '#quiz/' + (n + 1) : '#result');
    } else if (b.dataset.action === 'back') back();
    else if (b.dataset.action === 'restart') { fsApi().setQuiz(null); go('#quiz/1'); }
    else if (b.dataset.action === 'fit') { fsApi().applyStyle(b.dataset.style, b.dataset.motor === '1'); fsApi().showTab('result'); toFit(); }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !page.hidden) back(); });
  window.addEventListener('popstate', render);

  // a direct link to a guide screen: put the fitstand underneath so «←» and «Подобрать размер» land there
  if (parseRoute(location.hash, C).view !== 'fit' && !(history.state && Number.isInteger(history.state.fs))) {
    const hash = location.hash;
    history.replaceState({ fs: 0 }, '', location.pathname + location.search);
    history.pushState({ fs: 1 }, '', hash);
  }
  render();
}

const api = { parseRoute, backTarget, answerAllowed, ANSWER_GUARD_MS };
if (typeof module === 'object' && module.exports) module.exports = api;
else { Object.assign(root, api); if (typeof document !== 'undefined') init(); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
