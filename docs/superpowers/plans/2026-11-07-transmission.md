# Трансмиссия (отзыв 4, часть A) — план

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Раздел «Трансмиссия» получает страницы восьми деталей с подсветкой на схеме, «Кому подходит / Для каких трасс» у вариантов, блоки «Как пользоваться трансмиссией» и третий вариант педалей.

**Architecture:** Тексты — данные в `content.js` (`parts.drivetrain.details`, `.more`, `.related`, новые поля вариантов). `guide.js` разбирает адрес `#parts/<part>/<detail>` и рисует страницу детали. `draw.js` делит трансмиссию на подгруппы `data-d` и по флагу `details` дорисовывает переключатели, манетку и тросик только на статичной схеме.

**Tech Stack:** чистый JS без сборки и библиотек, SVG, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-07-transmission-design.md`

## Global Constraints

- Тексты только на русском и только в `content.js`; в `guide.js`/`draw.js` — ни одной русской строки контента (тест `guide texts live in content.js`).
- Без марок и названий фирм: тест `no brands` проверяет весь `CONTENT`.
- Живой рисунок и сцена езды на главной выглядят как раньше.
- Тесты: `node --test` из корня репозитория, **без аргумента-пути** (на Windows путь ломает запуск). До начала — 197 тестов, все зелёные.
- Коммит после каждой задачи, ветка `feedback4-transmission`. Без пуша.
- В коммитах и файлах репозитория — без имени магазина и продавца.
- Каждый коммит заканчивается строкой `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. Мусор в адресе детали (`#parts/drivetrain/constructor`, `#parts/drivetrain/__proto__`) — страница «Трансмиссия», не падение. → тест в Task 3.
2. Флаг `details` на велосипеде без цепи (беговел, трёхколёсный, моноцикл) — рисунок строится, лишних групп нет. → тест в Task 4.
3. Тёмная тема: новые фигуры только через классы `s-ink`/`s-metal`/`f-metal`, без цветов в атрибутах. → тест в Task 4.
4. Шоссейный руль с низким хватом: манетка на руле там, где рука, а не в воздухе. → визуальная проверка в Task 4 (стиль `road`).
5. «Назад» со страницы детали возвращает на «Трансмиссию», а не на главную. → ручная проверка в Task 6.

---

### Task 1: Варианты трансмиссии и «Как пользоваться» (R4, R5)

**Files:**
- Modify: `content.js:811-820` (`parts.drivetrain`)
- Modify: `guide.js:239-240` (`partView`, строка варианта)
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: у каждого `parts.drivetrain.variants[i]` строки `forWhom`, `terrain`; `parts.drivetrain.more` — 5 блоков `{ title, list }`. `partView` выводит `forWhom` как «Кому подходит» у любого узла.

- [ ] **Step 1: Write the failing test** (в конец `tests/content.test.js`)

```js
test('drivetrain variants and usage per spec 2, 4', () => {
  const T = CONTENT.parts.drivetrain;
  T.variants.forEach(v => {
    assert.ok(nonEmpty(v.forWhom), `${v.name}.forWhom`);
    assert.ok(nonEmpty(v.terrain), `${v.name}.terrain`);
  });
  assert.deepEqual(T.more.map(m => m.title), ['Как переключать на разных трассах', 'Как не испортить трансмиссию', 'Частые ошибки новичков', 'Как выбрать трансмиссию новичку', 'Уход за трансмиссией']);
  T.more.forEach(m => assert.ok(m.list && m.list.length >= 3, m.title));
});
```

- [ ] **Step 2: Run** `node --test` — Expected: FAIL `drivetrain variants and usage per spec 2, 4`.
- [ ] **Step 3: Implement.** В `content.js` у четырёх вариантов — `forWhom` и `terrain` (одна фраза каждое). Блок `more` с пятью списками по 3–6 пунктов: переключение на подъёме/спуске/ровном/старте, без переключения под нагрузкой, без перекоса цепи, не переключать стоя на месте (кроме планетарки) и т.д. В `guide.js` в `partView` перед `line('Для каких трасс', v.terrain)` добавить `line('Кому подходит', v.forWhom)`.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS (198).
- [ ] **Step 5: Commit** `feat(content): drivetrain variants — for whom and terrain; how to use the drivetrain`

---

### Task 2: Детали трансмиссии — тексты (R3)

**Files:**
- Modify: `content.js` (`parts.drivetrain`: новые поля `details`, `related`)
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: `CONTENT.parts.drivetrain.details: Array<{ id, name, short, text?, how?, kinds?: {name,text,pros,cons}[], breaks?: {name,text}[], care?: string[], more?: {title,text?,list?,table?}[] }>`; `CONTENT.parts.drivetrain.related = ['pedals']`.

- [ ] **Step 1: Write the failing test**

```js
const DETAILS = [
  ['bb', 'Каретка', ['text', 'breaks', 'care'], []],
  ['cranks', 'Шатуны и звёзды', ['text', 'kinds'], ['Из чего делают', 'Какие для каких целей']],
  ['chain', 'Цепь', ['text', 'kinds', 'care'], []],
  ['fd', 'Передний переключатель', ['text', 'how', 'breaks', 'care'], []],
  ['rd', 'Задний переключатель', ['text', 'how', 'breaks', 'care'], []],
  ['cassette', 'Кассета / трещотка', ['text', 'kinds'], ['Под какие трассы', 'Что надёжнее']],
  ['shifters', 'Манетки', ['text', 'kinds'], ['Манетка или велошифт']],
  ['cables', 'Тросики и рубашки', ['text'], ['Как проводят тросики', 'Какая проводка лучше']],
];
const strs = (a, n, label) => { assert.ok(Array.isArray(a) && a.length >= n, label); a.forEach(x => assert.ok(nonEmpty(x), label)); };

test('drivetrain details per spec 3', () => {
  const D = CONTENT.parts.drivetrain.details;
  assert.deepEqual(D.map(d => [d.id, d.name]), DETAILS.map(([id, name]) => [id, name]));
  assert.deepEqual(CONTENT.parts.drivetrain.related, ['pedals']);
  for (const [id, , req, more] of DETAILS) {
    const d = D.find(x => x.id === id);
    assert.ok(nonEmpty(d.short) && d.short.length <= 60, `${id}.short`);
    for (const k of req) assert.ok(d[k] !== undefined, `${id}.${k} required`);
    for (const k of ['text', 'how']) if (d[k] !== undefined) assert.ok(nonEmpty(d[k]), `${id}.${k}`);
    if (d.kinds) {
      assert.ok(d.kinds.length >= 2, `${id}.kinds`);
      d.kinds.forEach(k => {
        assert.ok(nonEmpty(k.name) && nonEmpty(k.text), `${id}.kinds.${k.name}`);
        assert.ok(k.pros.length >= 1 && k.pros.length <= 3 && k.cons.length >= 1 && k.cons.length <= 3, `${id}.kinds.${k.name} pros/cons`);
      });
    }
    if (d.breaks) { assert.ok(d.breaks.length >= 2, `${id}.breaks`); d.breaks.forEach(b => assert.ok(nonEmpty(b.name) && nonEmpty(b.text), `${id}.breaks`)); }
    if (d.care) strs(d.care, 2, `${id}.care`);
    const titles = (d.more || []).map(m => m.title);
    for (const t of more) assert.ok(titles.includes(t), `${id}: ${t}`);
    for (const m of d.more || []) {
      assert.ok(nonEmpty(m.text) || (m.list && m.list.length) || m.table, `${id}.${m.title}: empty`);
      if (m.list) strs(m.list, 1, `${id}.${m.title}`);
      if (m.table) m.table.rows.forEach(r => assert.equal(r.length, m.table.head.length, `${id}.${m.title}.row`));
    }
  }
  const S = D.find(x => x.id === 'shifters');
  for (const n of ['Триггерные манетки', 'Велошифт (поворотная ручка)']) assert.ok(S.kinds.some(k => k.name === n), n);
  const cmp = S.more.find(m => m.title === 'Манетка или велошифт').table;
  assert.deepEqual(cmp.head, ['', 'Манетка', 'Велошифт']);
  assert.ok(cmp.rows.length >= 4);
});
```

- [ ] **Step 2: Run** `node --test` — Expected: FAIL `drivetrain details per spec 3`.
- [ ] **Step 3: Implement** `details` и `related` в `parts.drivetrain` (после `variants`, перед `more`). Тексты — для новичка, по 1–3 предложения; поломки — «что ломается» → «как избежать»; виды каретки не нужны. Велошифт описывать как поворотную ручку на руле. Марок не упоминать.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS.
- [ ] **Step 5: Commit** `feat(content): eight drivetrain details`

---

### Task 3: Адрес страницы детали

**Files:**
- Modify: `guide.js:8-29` (`parseRoute`)
- Test: `tests/guide.test.js`

**Interfaces:**
- Consumes: `CONTENT.parts.<id>.details` (Task 2).
- Produces: `parseRoute('#parts/drivetrain/chain', C) → { view: 'detail', part: 'drivetrain', id: 'chain' }`.

- [ ] **Step 1: Write the failing test**

```js
test('parseRoute: part details (spec 5)', () => {
  assert.deepEqual(r('#parts/drivetrain/chain'), { view: 'detail', part: 'drivetrain', id: 'chain' });
  assert.deepEqual(r('#parts/drivetrain/shifters'), { view: 'detail', part: 'drivetrain', id: 'shifters' });
  for (const h of ['#parts/drivetrain/xyz', '#parts/drivetrain/constructor', '#parts/drivetrain/__proto__', '#parts/drivetrain/'])
    assert.deepEqual(r(h), { view: 'part', id: 'drivetrain' }, h);
  assert.deepEqual(r('#parts/brakes/chain'), { view: 'part', id: 'brakes' });
  assert.deepEqual(r('#parts/xyz/chain'), { view: 'parts' });
  for (const h of ['#types/mtb/x', '#acc/helmet/x', '#parts/drivetrain/chain/x']) assert.deepEqual(r(h), { view: 'fit' }, h);
});
```

- [ ] **Step 2: Run** `node --test` — Expected: FAIL `parseRoute: part details (spec 5)`.
- [ ] **Step 3: Implement.** В начале: `{ view: 'fit' }`, если частей больше трёх или третья часть есть, а `head !== 'parts'`. В ветке `parts`: если узел найден и третья часть — `id` одной из `details` этого узла (поиск через `.some(d => d.id === extra)`, не по ключам объекта), вернуть `detail`; иначе `part`.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS (старый тест `#types/mtb/extra/x` → `fit` тоже).
- [ ] **Step 5: Commit** `feat(guide): route to a part detail`

---

### Task 4: Схема — подгруппы трансмиссии и дорисованные детали

**Files:**
- Modify: `draw.js:75` (`part`), `draw.js:171-189` (трансмиссия), `draw.js:71` (`opts.details`)
- Test: `tests/draw.test.js`

**Interfaces:**
- Produces: `bikeMarkup(g, ux, { live, motor, highlight, details })`. Группы `<g data-part="drivetrain" data-d="<id>">` для `chain`, `cassette`, `cranks`, `bb` (всегда, когда есть цепь) и `rd`, `fd`, `shifters`, `cables` (только `live === false && details && есть цепь`). `highlight: 'drivetrain:<id>'` — `data-on` только у групп с этим `data-d`; `highlight: 'drivetrain'` — у всех групп трансмиссии.

- [ ] **Step 1: Write the failing test**

```js
const DT = ['chain', 'cassette', 'cranks', 'bb'], EXTRA = ['rd', 'fd', 'shifters', 'cables'];
const dGroups = (s, d) => s.match(new RegExp(`<g data-part="drivetrain" data-d="${d}"( data-on)?>`, 'g')) || [];

test('drivetrain sub-groups; extra details only on a static drawing with details (spec 6)', () => {
  const base = Dr.bikeMarkup(g('hybrid'), 1, { live: false });
  for (const d of DT) assert.ok(dGroups(base, d).length >= 1, d);
  for (const d of EXTRA) assert.equal(dGroups(base, d).length, 0, d);
  const det = Dr.bikeMarkup(g('hybrid'), 1, { live: false, details: true });
  for (const d of [...DT, ...EXTRA]) assert.ok(dGroups(det, d).length >= 1, d);
  const live = Dr.bikeMarkup(g('hybrid'), 1, { details: true });
  for (const d of EXTRA) assert.equal(dGroups(live, d).length, 0, `live ${d}`);
});

test('highlight one drivetrain detail, or the whole drivetrain', () => {
  const one = Dr.bikeMarkup(g('road'), 1, { live: false, details: true, highlight: 'drivetrain:chain' });
  const on = [...one.matchAll(/<g data-part="(\w+)"(?: data-d="(\w+)")? data-on>/g)].map(m => `${m[1]}:${m[2]}`);
  assert.ok(on.length >= 1 && on.every(x => x === 'drivetrain:chain'), on.join());
  const all = Dr.bikeMarkup(g('road'), 1, { live: false, details: true, highlight: 'drivetrain' });
  const groups = all.match(/<g data-part="drivetrain"[^>]*>/g);
  assert.ok(groups.length >= 8 && groups.every(x => x.endsWith(' data-on>')));
});

test('details on bikes without a chain; new shapes use theme classes', () => {
  for (const s of ['balance', 'kidTrike', 'special']) {
    const m = Dr.bikeMarkup(gt(s), 1, { live: false, details: true });
    for (const d of EXTRA) assert.equal(dGroups(m, d).length, 0, `${s} ${d}`);
  }
  const det = Dr.bikeMarkup(g('mtb'), 1, { live: false, details: true });
  for (const d of EXTRA) {
    const at = det.indexOf(`data-d="${d}"`), body = det.slice(at, det.indexOf('</g>', at));
    assert.doesNotMatch(body, /(fill|stroke)="#/, d);
  }
});
```

(`gt` — уже есть в `tests/draw.test.js` рядом со строкой 113; если объявлен ниже нового теста — поставить тест после него.)

- [ ] **Step 2: Run** `node --test` — Expected: FAIL три новых теста.
- [ ] **Step 3: Implement.**
  - `part(name, inner, d)`: атрибут `data-d` при `d`; `data-on`, если `hl === name` или `d && hl === name + ':' + d`. Порядок атрибутов строго `data-part`, `data-d`, `data-on`.
  - Ветка `if(chain)`: вместо одной `part('drivetrain', dr)` — подряд `part(…,'chain')` (как сейчас, с внутренним `data-k="chain"`), `part(…,'cassette')`, `part(…,'cranks')` (звезда + защита), `part(…,'bb')` (кружок r 38), `part(…,'cranks')` (шатун `nCrank` + колпачок r 16). Порядок слоёв и вид — как сейчас. Ветки `frontPedals` и `noPedals` — без изменений, `part('drivetrain', dr)` без `d`.
  - `details = !live && !!opts.details`; если `details && chain`, после `part('pedals', pd)` добавить четыре группы в порядке `cables`, `fd`, `rd`, `shifters`:
    - `rd` — лапка под кассетой: тело ~110 мм вниз-назад от `R` и два ролика r 14 (`f-metal`);
    - `fd` — пластина ~60 мм на подседельной трубе над звездой (вдоль `sd`, начиная с `rc + 30`);
    - `shifters` — короткий рычажок у `ck.G` (на шоссейном руле — у верхнего хвата, где рука);
    - `cables` — тонкая линия `s-metal` шириной 6: от `ck.G` к рулевой трубе, вдоль нижней трубы к каретке, вдоль нижнего пера к `rd`.
  - Только классы `s-ink`, `s-metal`, `f-metal`, `nf`; без цветов в атрибутах.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS.
- [ ] **Step 5: Visual check.** `node -e` с `bikeMarkup(g('hybrid'|'road'|'mtb'), 1, {live:false, details:true, highlight:'drivetrain:rd'})` → записать SVG во временный файл (вне репозитория), открыть, убедиться: детали на своих местах, подсвечен только задний переключатель, на `road` манетка на руле.
- [ ] **Step 6: Commit** `feat(draw): drivetrain sub-groups and detail shapes for the guide`

---

### Task 5: Страница детали и раздел «Детали»

**Files:**
- Modify: `guide.js:68-69` (`bike`), `guide.js:230-241` (`partView`, новый `detailView`), `guide.js:245-275` (`render`)
- Modify: `index.html:811-815` (`drawBike`)
- Test: `tests/guide.test.js`, `tests/highlight.test.js`

**Interfaces:**
- Consumes: `parseRoute` → `{ view: 'detail', part, id }` (Task 3); `bikeMarkup(..., { details })` (Task 4); `details`, `related` (Task 2).
- Produces: `bike(style, motor, hl, cls = 'pg-bike', details = false)` пишет `data-details="1"`; `drawBike(svg, { style, motor, highlight, details, health })`.

- [ ] **Step 1: Write the failing tests**

```js
// tests/guide.test.js
test('detail page plumbing: details flag reaches the drawing', () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'guide.js'), 'utf8');
  assert.match(src, /details: svg\.dataset\.details === '1'/);
  assert.match(src, /r\.view === 'detail'/);
});
// tests/highlight.test.js
test('drawBike passes the details flag to the drawing', () => {
  assert.match(html, /details:!!opts\.details/);
});
```

- [ ] **Step 2: Run** `node --test` — Expected: FAIL два новых теста.
- [ ] **Step 3: Implement.**
  - `bike(...)`: пятый параметр `details` → ` data-details="1"`.
  - `render`: в `drawBike` добавить `details: svg.dataset.details === '1'`; ветка `else if (r.view === 'detail') html = detailView(r.part, r.id);` перед последним `else`.
  - `index.html` `drawBike`: `bikeMarkup(g,1,{live:false,motor:!!opts.motor,highlight:opts.highlight||null,details:!!opts.details})`.
  - Вынести `more` (сейчас внутри `partView`) и `sec` (сейчас внутри `typeView`) на уровень замыкания — используют обе страницы.
  - `partView`: `bike(st.style, st.motor, id, 'pg-bike', !!p.details)`; после вариантов, если есть `p.details`, — `<section><h2>Детали</h2><div class="cards">…</div></section>`: карточки как в `partsView` (`<a class="card" href="#parts/<id>/<d.id>"><b>name</b><span>short</span></a>`), затем по `p.related` карточки узлов (`#parts/<rid>`, `C.parts[rid].name`/`.short`); потом `more`. Заголовок «Детали» — строка в `guide.js` допустима (как «Варианты»).
  - `detailView(pid, id)`: `head(d.name, p.name)` + `bike(st.style, st.motor, `${pid}:${id}`, 'pg-bike', true)` + `<p class="lead">short</p>` + разделы по порядку, только при наличии поля: «Что это» (`text`), «Как работает» (`how`), «Виды» (`kinds` — как `article.var` без картинки: `h2` имя, текст, `prosCons`), «Частые поломки и как их избежать» (`breaks` — `<ul class="why">` с `<li><b>name</b> text</li>`, всё через `esc`), «Уход» (`list(care, 'why')`), затем `more`.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS.
- [ ] **Step 5: Check in the browser** (skill `run`): «Меню → Узлы велосипеда → Трансмиссия» — схема с новыми деталями, у вариантов «Кому подходит», раздел «Детали» из 9 карточек, блоки «Как пользоваться». Открыть «Цепь», «Манетки» (таблица), «Задний переключатель» (подсвечен только он). «Назад» → «Трансмиссия». Тёмная тема — детали видны. Главная — без изменений. Ошибок в консоли нет.
- [ ] **Step 6: Commit** `feat(guide): drivetrain detail pages with a highlighted diagram`

---

### Task 6: Комбинированные педали и выпуск

**Blocked on:** `part-pedals-2.png` от пользователя (промпт — `info/image-prompts-etap4.md`).

**Files:**
- Modify: `content.js` (`parts.pedals`: третий вариант, `more`)
- Modify: `tools/make-image-prompts.js:13` (`PARTS.pedals` — третий промпт, текст из `info/image-prompts-etap4.md`)
- Create: `img/parts/pedals-2.webp`
- Modify: `sw.js:3`, `tests/sw.test.js:11` (v14)
- Test: `tests/content.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('pedals: combined variant and how to choose (spec 3)', () => {
  const P = CONTENT.parts.pedals;
  assert.deepEqual(P.variants.map(v => v.name), ['Платформы', 'Контактные', 'Комбинированные']);
  const m = P.more.find(x => x.title === 'Как подобрать педали');
  assert.ok(m && m.list.length >= 3);
});
```

и в `tests/sw.test.js` — `cache version is v14` с `/const VERSION = 'fitstand-v14'/`.

- [ ] **Step 2: Run** `node --test` — Expected: FAIL `pedals: combined…`, `cache version is v14`.
- [ ] **Step 3: Implement.** Вариант «Комбинированные» (текст, 1–3 плюса и минуса), `more` «Как подобрать педали» (по обуви, по поездкам, для новичка), третий промпт в `PARTS.pedals`; `node tools/make-image-prompts.js`; PNG — во временную папку, `python tools/convert-images.py --raw <папка>` → `img/parts/pedals-2.webp` (≤ 120 КБ); `VERSION = 'fitstand-v14'`.
- [ ] **Step 4: Run** `node --test` — Expected: всё PASS, включая `every part variant has a compressed picture` и `image prompts cover every part variant`.
- [ ] **Step 5: Commit** `feat(content): combined pedals and how to choose pedals; cache v14`

---

## После задач (ведущий, не субагенты)

1. Один общий ревьюер (opus) по всей ветке против спецификации.
2. Документ для продавца на русском — `info/Feedback 4/Решения/Фитстенд - трансмиссия.docx`; строки отзыва 4 в `info/Фитстенд - требования.docx`.
3. Слияние в `main` и пуш — только после «да».
