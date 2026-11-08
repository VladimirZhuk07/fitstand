// Фитстенд — экраны гида поверх фитстенда: меню, опрос, результат, каталог видов, справочник узлов.
// Адрес после # определяет экран; parseRoute и backTarget — чистые функции (тестируются в Node).
(function (root) {
const has = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
// quiz.js: in the browser its functions are globals, in Node it is required
const Qz = typeof module === 'object' && module.exports ? require('./quiz.js') : root;

function parseRoute(hash, content) {
  const parts = String(hash || '').replace(/^#/, '').split('/');
  const [head, arg, extra] = parts;
  if (extra !== undefined) return { view: 'fit' };
  if (head === 'quiz') {
    const n = Number(arg);
    return { view: 'quiz', n: Number.isInteger(n) && n >= 1 && n <= Qz.MAX_STEPS ? n : 1 };
  }
  if (head === 'result' && arg === undefined) return { view: 'result' };
  if (head === 'menu' && arg === undefined) return { view: 'menu' };
  if (head === 'acc') {
    if (arg !== undefined && has(content.accessories, arg)) return { view: 'accItem', id: arg };
    if (arg !== undefined && content.accGroups.some(g => g.id === arg)) return { view: 'accGroup', id: arg };
    return { view: 'acc' };
  }
  if (head === 'types') return arg !== undefined && has(content.types, arg) ? { view: 'type', id: arg } : { view: 'types' };
  if (head === 'parts') {
    const id = arg === 'wheels' ? 'rims' : arg; // «Колёса и покрышки» became «Обода» and «Покрышки»
    return id !== undefined && has(content.parts, id) ? { view: 'part', id } : { view: 'parts' };
  }
  return { view: 'fit' };
}

// how to get from a guide screen back to the fitstand: step back over our own entries, or replace the address
function backTarget(historyState) {
  const fs = historyState && historyState.fs;
  return Number.isInteger(fs) && fs > 0 ? { kind: 'back', steps: fs } : { kind: 'replace' };
}

// menu «Подобрать велосипед»: first unanswered step, or the result when the quiz is complete
function quizTarget(saved, content) {
  const A = saved && saved.v === 2 ? saved.a : null;
  const i = Qz.firstMissingStep(A, content);
  return i === -1 ? '#result' : '#quiz/' + (i + 1);
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
  // before: an optional line for the first step («Перед первой поездкой: …»)
  const program = (t, before) => `<section><h2>С чего начать</h2><ol class="prog">${t.program.map((s, i) => `<li><b>${esc(s.title)}</b><span>${esc(s.text)}</span>${i === 0 && before ? `<span class="prog-acc">${esc(before)}</span>` : ''}</li>`).join('')}</ol></section>`;
  const accLink = id => `<a href="#acc/${id}">${esc(C.accessories[id].name)}</a>`;
  // pictures: img/acc/<id>.webp, img/parts/<part>-<n>.webp; data-opt — removed quietly if the file is missing
  const pic = (src, cls, alt = '') => `<img class="${cls}" src="${src}" alt="${esc(alt)}" loading="lazy" decoding="async" data-opt>`;
  const accPic = (id, cls) => pic(`img/acc/${id}.webp`, cls);
  const accRow = id => `<li>${accPic(id, 'acc-mini')}<span>${accLink(id)} — ${esc(C.accessories[id].why)}</span></li>`;
  const switcher = on => `<nav class="pg-switch" aria-label="Разделы гида"><a href="#types"${on === 'types' ? ' aria-current="page"' : ''}>Виды</a><a href="#parts"${on === 'parts' ? ' aria-current="page"' : ''}>Узлы</a></nav>`;
  const fitBtn = (style, motor) => `<button class="btn primary" data-action="fit" data-style="${style}"${motor ? ' data-motor="1"' : ''}>Подобрать размер</button>`;

  const answers = () => { const q = fsApi().getQuiz(); return q && q.v === 2 ? q.a : {}; };
  const saveAnswers = A => fsApi().setQuiz({ v: 2, a: A });
  const gearName = (g, fit) => C.health.gear[g].replace('{mm}', fit.crankMax);
  let shownResult = null;

  function menuView() {
    const q = fsApi().getQuiz(), target = quizTarget(q, C);
    const res = target === '#result' ? Qz.buildResult(answers(), C) : null;
    const v = res && res.complete ? res.variants[0] : null;
    const href = { quiz: target, types: '#types', parts: '#parts', acc: '#acc' };
    const item = m => {
      const short = m.id === 'quiz' && v ? `Ваш результат — ${C.types[v.type].name}${v.motor ? ' с мотором' : ''}` : m.short;
      const inner = `<b>${esc(m.title)}</b><span>${esc(short)}</span>`;
      if (m.id === 'fit') return `<button class="menu-item" data-action="tofit">${inner}</button>`;
      if (m.id === 'erase') return `<button class="menu-item" data-action="erase">${inner}</button>`;
      return `<a class="menu-item" href="${href[m.id]}">${inner}</a>`;
    };
    return head('Меню') + `<nav class="menu" aria-label="Меню">${C.menu.map(item).join('')}</nav>`;
  }
  function explainView(blockId, A) {
    const b = C.health.blocks.find(x => x.id === blockId);
    const lines = [];
    for (const q of b.questions) {
      const v = A[q.id];
      for (const i of (Array.isArray(v) ? v : [v])) { const a = q.answers[i]; if (a && a.explain) lines.push(a.explain); }
    }
    return head(b.title, 'Что мы учли') +
      (lines.length ? list([...new Set(lines)].slice(0, 3), 'why') : '<p>Учтём ваши ответы в подборе.</p>') +
      `<div class="pg-actions"><button class="btn primary" data-action="next">Дальше</button></div>`;
  }
  function quizView(n) {
    const A = answers(), flow = Qz.quizFlow(A, C), step = flow[n - 1];
    if (step.kind === 'explain') return explainView(step.block, A);
    const q = Qz.getQuestion(step.id, C), qSteps = flow.filter(s => s.kind === 'q');
    const pos = qSteps.findIndex(s => s.id === step.id) + 1, total = qSteps.length;
    const progress = `<div class="pg-progress" role="progressbar" aria-valuemin="0" aria-valuemax="${total}" aria-valuenow="${pos}"><i style="width:${(pos / total) * 100}%"></i></div>`;
    const cur = A[step.id];
    let body;
    if (q.multi) {
      const key = (a, i) => (step.id === 'gate' ? a.id : i);
      const on = (a, i) => Array.isArray(cur) && cur.includes(key(a, i));
      body = `<p class="pg-hint">Можно выбрать несколько</p><div class="answers">${q.answers.map((a, i) =>
        `<button class="ans" data-toggle="${key(a, i)}" aria-pressed="${on(a, i)}">${esc(a.text)}</button>`).join('')}</div>` +
        `<div class="pg-actions"><button class="btn primary" data-action="next"${Qz.isAnswered(step, A, C) ? '' : ' disabled'}>Дальше</button></div>`;
    } else {
      body = `<div class="answers">${q.answers.map((a, i) => `<button class="ans" data-answer="${i}" aria-pressed="${cur === i}">${esc(a.text)}</button>`).join('')}</div>`;
    }
    const note = step.id === 'gate' ? `<p class="pg-note">${esc(C.health.disclaimer.split('. ')[0])}. ${esc(C.health.privacy)}</p>` : '';
    return head(q.q, `Вопрос ${pos} из ${total}`) + progress + body + note;
  }
  function variantCard(v, i) {
    const t = C.types[v.type];
    const chips = v.gear.length ? `<ul class="gear">${v.gear.map(g => `<li>${esc(gearName(g, v.fit))}</li>`).join('')}</ul>` : '';
    const warn = v.warn.map(w => `<p class="v-warn">${esc(w)}</p>`).join('');
    return `<article class="variant"><div class="v-kind">${esc(C.health.variantNames[v.kind])}</div>` +
      `<svg class="bike v-bike" data-style="${v.type}"${v.motor ? ' data-motor="1"' : ''} data-variant="${i}" role="img" aria-label="Схема велосипеда"></svg>` +
      `<b>${esc(t.name)}${v.motor ? ' с мотором' : ''}</b>${chips}${warn}` +
      `<button class="btn primary" data-action="fit" data-variant="${i}">Подобрать размер</button></article>`;
  }
  function geometryView(v) {
    const s = fsApi().fitSummary({ style: v.type, health: { ...v.fit, gear: v.gear } });
    const val = { stack: `${s.stack} мм`, reach: `${s.reach} мм`, crank: `${String(s.crank).replace('.', ',')} мм`, bar: `${s.bar} мм`, tyre: `${s.tyre} мм`, frame: s.stepThrough ? 'с низкой трубой' : 'обычная' };
    return `<details class="geo"><summary>Цифры геометрии · размер ${esc(s.size)}</summary><table>` +
      `<thead><tr><th>Параметр</th><th>У вас</th><th>Что это</th><th>Куда смотреть при травмах</th></tr></thead><tbody>` +
      C.health.geometryRows.map(r => `<tr><td>${esc(r.name)}</td><td>${esc(val[r.key])}</td><td>${esc(r.what)}</td><td>${esc(r.injury)}</td></tr>`).join('') +
      `</tbody></table><p class="pg-note">${esc(C.health.geometryWarning)}</p></details>`;
  }
  function accBlock(rec) {
    const top = `<section><h2>Что взять</h2><ul class="acc-top">${rec.top.map(accRow).join('')}</ul></section>`;
    const sits = rec.bySituation.length ? `<section><h2>По ситуациям</h2>${rec.bySituation.map(s => `<p class="acc-sit"><b>${esc(s.title)}:</b> ${s.ids.map(accLink).join(', ')}</p>`).join('')}<p><a href="#acc">Все аксессуары</a></p></section>` : `<p><a href="#acc">Все аксессуары</a></p>`;
    return top + sits;
  }
  const plural = (n, [one, few, many]) => { const d = n % 10, h = n % 100;
    return d === 1 && h !== 11 ? one : d >= 2 && d <= 4 && (h < 12 || h > 14) ? few : many; };
  const groupIds = g => g.sections.flatMap(sec => sec.ids);
  function accView() {
    return head('Аксессуары') + `<div class="cards acc-groups">${C.accGroups.map(g => { const ids = groupIds(g);
      return `<a class="card" href="#acc/${g.id}">${accPic(ids[0], 'acc-thumb')}<b>${g.icon} ${esc(g.title)}</b><span>${ids.length} ${plural(ids.length, ['позиция', 'позиции', 'позиций'])}</span></a>`; }).join('')}</div>`;
  }
  function accGroupView(gid) {
    const g = C.accGroups.find(x => x.id === gid);
    return head(`${g.icon} ${g.title}`, 'Аксессуары') + g.sections.map(sec =>
      (sec.title ? `<h3 class="acc-sec">${esc(sec.title)}</h3>` : '') +
      `<div class="cards">${sec.ids.map(id => `<a class="card" href="#acc/${id}">${accPic(id, 'acc-thumb')}<b>${esc(C.accessories[id].name)}</b><span>${esc(C.accessories[id].short)}</span></a>`).join('')}</div>`).join('');
  }
  function accItemView(id) {
    const a = C.accessories[id], g = C.accGroups.find(x => x.sections.some(s => s.ids.includes(id)));
    const sec = (title, body) => `<section><h2>${esc(title)}</h2>${body}</section>`;
    return head(a.name, `${g.icon} ${g.title}`) + pic(`img/acc/${id}.webp`, 'acc-photo', a.name) + `<p class="lead">${esc(a.text)}</p>` +
      (a.kinds ? sec('Виды', `<ul class="why">${a.kinds.map(k => `<li><b>${esc(k.name)}</b> — ${esc(k.text)}</li>`).join('')}</ul>`) : '') +
      (a.choose ? sec('Как выбрать', list(a.choose, 'why')) : '') +
      (a.weather ? sec('Под какую погоду', `<p>${esc(a.weather)}</p>`) : '') +
      (a.check ? sec('Проверьте совместимость', `<p class="v-warn">${esc(a.check)}</p>`) : '') +
      `<div class="pg-actions"><a class="btn" href="#acc/${g.id}">Все в группе «${esc(g.title)}»</a></div>`;
  }
  function resultView(r) {
    shownResult = r;
    const rec = Qz.recommendAccessories(answers(), C);
    const before = 'Перед первой поездкой: ' + rec.top.map(id => C.accessories[id].name.toLowerCase()).join(', ') + '.';
    const bal = r.variants[0], t = C.types[bal.type];
    const name = t.name + (bal.motor ? ' с мотором' : '');
    return head(name, 'Вам подойдёт') +
      (r.rehab ? `<p class="pg-alert">${esc(C.health.rehabText)}</p>` : '') +
      `<div class="variants">${r.variants.map(variantCard).join('')}</div>` + accBlock(rec) +
      `<p class="lead">${esc(t.purpose)}</p>` +
      (r.reasons.length ? `<section><h2>Почему</h2>${list(r.reasons.map(cap), 'why')}</section>` : '') +
      (r.notes.length ? `<section><h2>Что учесть</h2>${list(r.notes, 'notes')}</section>` : '') +
      `<section>${prosCons(t.pros, t.cons)}</section>` + program(t, before) +
      `<section>${geometryView(bal)}</section>` +
      `<p class="pg-note">${esc(C.health.disclaimer)}</p>` +
      `<div class="pg-actions"><button class="btn" data-action="restart">Пройти заново</button><a class="btn" href="#types">Все виды</a></div>`;
  }
  // the drawing of a type: drawAs names another style (MTB, e-bike), otherwise the type draws by its id
  const typeBike = id => { const t = C.types[id]; return [t.drawAs || id, !!t.motor]; };
  const fitOf = id => { const t = C.types[id]; return t.fitAs ? [t.fitAs, !!t.motor] : null; };
  // a photo of the type; while it is there the card hides the drawing, without it (data-opt removes it) the drawing shows
  const typePic = (id, cls) => pic(`img/types/${id}.webp`, cls, C.types[id].name);
  const typeCard = id => { const [s, m] = typeBike(id), t = C.types[id];
    return `<a class="card" href="#types/${id}">${typePic(id, 'type-thumb')}${bike(s, m, null, 'card-bike')}<b>${esc(t.name)}${t.age ? `<small>${esc(t.age)}</small>` : ''}</b><span>${esc(t.short)}</span></a>`; };
  function typesView() {
    return head('Виды велосипедов') + switcher('types') +
      C.typeGroups.map(g => `<h2 class="grp">${esc(g.title)}</h2><div class="cards">${g.ids.map(typeCard).join('')}</div>`).join('');
  }
  function typeView(id) {
    const t = C.types[id], [s, m] = typeBike(id), fit = fitOf(id);
    const sec = (title, body) => `<section><h2>${esc(title)}</h2>${body}</section>`;
    const kidsTable = t.wheels ? sec('Размер колеса по росту ребёнка', `<table class="kids"><tr><th>Рост</th><th>Колесо</th></tr>${C.kidsWheels.map(w =>
      `<tr${t.wheels.includes(w.wheel) ? ' class="on"' : ''}><td>${w.from}–${w.to} см</td><td>${w.wheel}″</td></tr>`).join('')}</table><p class="pg-note">Ориентир: точнее — примерка, ребёнок должен доставать до земли носками.</p>`) : '';
    return head(t.name, t.age || (t.parent ? C.types[t.parent].name : null)) + typePic(id, 'type-photo') + bike(s, m) + `<p class="lead">${esc(t.purpose)}</p>` +
      (t.note ? `<p>${esc(t.note)}</p>` : '') +
      sec('Кому подходит', `<p>${esc(t.forWhom)}</p>`) +
      (t.terrain ? sec('Для каких трасс', `<p>${esc(t.terrain)}</p>`) : '') +
      (t.specs ? sec('Характеристики', list(t.specs, 'why')) : '') +
      (t.branches ? sec(t.branchesTitle, `<div class="cards">${t.branches.map(typeCard).join('')}</div>`) : '') +
      (t.compare ? sec('Чем отличается от шоссейного и чем похож', `<p>${esc(t.compare)}</p>`) : '') +
      (t.variants ? sec('Варианты', list(t.variants, 'why')) : '') +
      (t.teach ? sec('Как учить', `<ol class="steps">${t.teach.map(x => `<li>${esc(x)}</li>`).join('')}</ol>`) : '') +
      (t.fear ? sec('Если ребёнок боится', list(t.fear, 'why')) : '') +
      kidsTable +
      (t.acc ? sec('Что взять', `<ul class="acc-top">${t.acc.map(accRow).join('')}</ul>`) : '') +
      `<section>${prosCons(t.pros, t.cons)}</section>` + program(t) +
      `<div class="pg-actions">${fit ? fitBtn(fit[0], fit[1]) : ''}<a class="btn" href="#quiz/1">Пройти опрос</a></div>`;
  }
  function partsView() {
    return head('Узлы велосипеда') + switcher('parts') +
      `<div class="cards">${C.partOrder.map(id => `<a class="card" href="#parts/${id}"><b>${esc(C.parts[id].name)}</b><span>${esc(C.parts[id].short)}</span></a>`).join('')}</div>`;
  }
  function partView(id) {
    const p = C.parts[id], st = fsApi().getState();
    const line = (label, text) => (text ? `<p><b>${label}:</b> ${esc(text)}</p>` : '');
    const table = tb => `<div class="ptable-wrap"><table class="ptable"><thead><tr>${tb.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
      `<tbody>${tb.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const more = m => `<section><h2>${esc(m.title)}</h2>` +
      (m.list ? (m.ordered ? `<ol class="steps">${m.list.map(x => `<li>${esc(x)}</li>`).join('')}</ol>` : list(m.list, 'why')) : '') +
      (m.text ? `<p>${esc(m.text)}</p>` : '') + (m.table ? table(m.table) : '') + `</section>`;
    return head(p.name) + bike(st.style, st.motor, id) + `<p class="lead">${esc(p.short)}</p>` +
      (p.anim ? root.forkBlock(p.anim) : '') +
      p.variants.map((v, i) => `<article class="var">${pic(`img/parts/${id}-${i}.webp`, 'var-photo', v.name)}<h2>${esc(v.name)}</h2><p>${esc(v.text)}</p>` +
        line('Как работает', v.how) + line('Кому подходит', v.forWhom) + line('Для каких трасс', v.terrain) + `${prosCons(v.pros, v.cons)}</article>`).join('') +
      (p.more || []).map(more).join('');
  }

  function render() {
    const r = parseRoute(location.hash, C);
    const open = r.view !== 'fit';
    page.hidden = !open;
    document.body.classList.toggle('page-open', open);
    if (wrap) wrap.inert = open;
    if (!open) { page.innerHTML = ''; return; }
    let html;
    if (r.view === 'menu') html = menuView();
    else if (r.view === 'quiz') {
      if (r.n > Qz.quizFlow(answers(), C).length) { history.replaceState(history.state, '', quizTarget(fsApi().getQuiz(), C)); return render(); }
      html = quizView(r.n);
    } else if (r.view === 'result') {
      const res = Qz.buildResult(answers(), C);
      if (!res.complete) { history.replaceState(history.state, '', '#quiz/' + (res.firstMissing + 1)); return render(); }
      html = resultView(res);
    } else if (r.view === 'types') html = typesView();
    else if (r.view === 'type') html = typeView(r.id);
    else if (r.view === 'parts') html = partsView();
    else if (r.view === 'acc') html = accView();
    else if (r.view === 'accGroup') html = accGroupView(r.id);
    else if (r.view === 'accItem') html = accItemView(r.id);
    else html = partView(r.id);
    page.innerHTML = `<div class="pg">${html}</div>`;
    page.querySelectorAll('svg[data-style]').forEach(svg => {
      const v = svg.dataset.variant !== undefined && shownResult ? shownResult.variants[Number(svg.dataset.variant)] : null;
      fsApi().drawBike(svg, { style: svg.dataset.style, motor: svg.dataset.motor === '1', highlight: svg.dataset.hl || null,
        health: v ? { ...v.fit, gear: v.gear } : null });
    });
    if (r.view === 'part' && C.parts[r.id].anim) root.startForkAnim(page.querySelector('.fork-anim'), C.parts[r.id].anim);
    page.scrollTop = 0;
    const h = page.querySelector('h1'); if (h) h.focus({ preventScroll: true });
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (a && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); go(a.getAttribute('href')); return; }
    const b = e.target.closest('#page button');
    if (!b) return;
    const n = parseRoute(location.hash, C).n;
    const advance = A => { const len = Qz.quizFlow(A, C).length; go(n < len ? '#quiz/' + (n + 1) : '#result'); };
    if (b.dataset.answer !== undefined) {
      const now = performance.now();
      if (!answerAllowed(lastAnswerAt, now)) return;
      lastAnswerAt = now;
      const step = Qz.quizFlow(answers(), C)[n - 1], A = { ...answers(), [step.id]: Number(b.dataset.answer) };
      saveAnswers(A);
      advance(A);
    } else if (b.dataset.toggle !== undefined) {
      const step = Qz.quizFlow(answers(), C)[n - 1];
      const val = step.id === 'gate' ? b.dataset.toggle : Number(b.dataset.toggle);
      const prev = Array.isArray(answers()[step.id]) ? answers()[step.id] : [];
      let list;
      if (prev.includes(val)) list = prev.filter(x => x !== val);          // switch off
      else if (step.id === 'gate' && val === 'none') list = ['none'];     // «Нет» clears the blocks
      else list = [...prev.filter(x => x !== 'none'), val];               // a block clears «Нет»
      let A = { ...answers(), [step.id]: list };
      if (!list.length) delete A[step.id];
      if (step.id === 'gate') A = Qz.pruneAnswers(A, C);
      saveAnswers(A);
      render();
    } else if (b.dataset.action === 'next') {
      const A = answers(), step = Qz.quizFlow(A, C)[n - 1];
      if (step && Qz.isAnswered(step, A, C)) advance(A);
    } else if (b.dataset.action === 'erase') {
      if (window.confirm('Стереть ответы опроса и поправки посадки?')) { fsApi().eraseAnswers(); render(); }
    } else if (b.dataset.action === 'back') back();
    else if (b.dataset.action === 'tofit') toFit();
    else if (b.dataset.action === 'restart') { fsApi().setQuiz(null); go('#quiz/1'); }
    else if (b.dataset.action === 'fit') {
      const v = b.dataset.variant !== undefined && shownResult ? shownResult.variants[Number(b.dataset.variant)] : null;
      if (v) fsApi().applyStyle(v.type, v.motor, { ...v.fit, gear: v.gear });
      else fsApi().applyStyle(b.dataset.style, b.dataset.motor === '1');
      fsApi().showTab('result'); toFit();
    }
  });
  // a picture that is not there yet: drop it, the screen stays as before
  document.addEventListener('error', e => { if (e.target instanceof HTMLImageElement && e.target.hasAttribute('data-opt')) e.target.remove(); }, true);
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

const api = { parseRoute, backTarget, quizTarget, answerAllowed, ANSWER_GUARD_MS };
if (typeof module === 'object' && module.exports) module.exports = api;
else { Object.assign(root, api); if (typeof document !== 'undefined') init(); }
})(typeof globalThis !== 'undefined' ? globalThis : this);
