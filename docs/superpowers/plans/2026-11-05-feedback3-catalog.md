# Каталог и справочник по третьему отзыву — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** общая карточка MTB и вид «Женский», 10 видов в посадке, аксессуары по блокам, вилка подробнее, «Обода» и «Покрышки» вместо «Колёс и покрышек».

**Architecture:** стиль `women` и флаг низкой рамы из стиля — `model.js`; раздельные обод и покрышка на схеме — `draw.js`; тексты и поля (`drawAs`, `specs`, `branches`, `parent`, `more`, `how`, `terrain`) — `content.js`; экраны — `guide.js`; кнопки, умолчание, CSS — `index.html`.

**Tech Stack:** ванильный JS, `node --test` (из корня, без аргумента), headless Edge для скриншотов.

**Spec:** `docs/superpowers/specs/2026-11-05-feedback3-catalog-design.md`

## Global Constraints

- Без брендов (тест `no brands`), все тексты — в `content.js`; тексты короткие и простые.
- Ветка `feedback3-catalog`; мерж и push — только после «да».
- `quiz.js` не меняется; сохранённые данные (`fitstand:v1`) читаются как раньше.
- Кэш `fitstand-v8`; существующие тесты остаются зелёными (кроме тех, что план меняет явно).
- Между задачами: `node --test` и открыть приложение (`python -m http.server 8080`).

## Review Focus

1. **Сохранён `style:'road'` или старый `#parts/wheels` в закладке:** посадка открывает шоссе, адрес — «Обода». Тесты: `loadSaved keeps a saved style` (Task 6), `parseRoute: parts` (Task 5).
2. **10 кнопок посадки на 360 px:** переносятся, без горизонтальной прокрутки. Скриншот (Task 6).
3. **Подсветка узла «Покрышки» у трицикла, поддерживающих колёс, одноколёсного:** покрышка подсвечивается, обод нет. Тест `rims and tyres are separate parts` (Task 2).
4. **Переход «MTB» → «Хардтейл» → «←»:** возвращает на «MTB», не на каталог. Браузер (Task 5).
5. **`#acc/<groupId>` и `#acc/<accId>`:** не путаются, неизвестный → список групп. Тест `parseRoute acc` (Task 7).

---

### Task 1: Стиль «Женский» и 10 стилей посадки

**Files:** `model.js`, `tests/model.test.js`

**Produces:** `STYLES.women = {...STYLES.hybrid, name:'Женский', stepThrough:true, crankMax:170, barMin:540, barMax:640, parent:'hybrid'}`; в `fit()` → `g.stepThrough = !!(st.stepThrough || (h && h.stepThrough))`; `FIT_STYLES = ['city','hybrid','women','gravel','cx','road','track','mtb','fullsus','folding']`.

- [ ] **Step 1: Тесты.** `FIT_STYLES` — новый порядок, каждый есть в `STYLES`. Новый `women: low frame, short cranks, hybrid sizes`: `fit({...P, style:'women'}).g.stepThrough === true`; `g.crank <= 170` для человека с длинными ногами (`I: 92`); `sizesFor('women')` равно `sizesFor('hybrid')`; у `hybrid` без здоровья `stepThrough === false`. Новый `cx and track fit with finite numbers`: все числа `g` конечны, `F.best` есть.
- [ ] **Step 2:** `node --test` — FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(model): women style with a low frame; ten fit styles`.

### Task 2: Обод и покрышка — разные узлы на схеме

**Files:** `draw.js`, `tests/draw.test.js`

**Produces:** вместо `data-part="wheels"` — `data-part="rims"` (спицы, обод, втулка; у трицикла, поддерживающих колёс, одноколёсного — тоже) и `data-part="tyres"` (покрышки). `wheel(c,g,id)` возвращает `{rim, tyre}`; группа вращения `#wR/#wF` остаётся внутри `rims`.

- [ ] **Step 1: Тесты.** `PARTS` = `frame, fork, brakes, drivetrain, rims, tyres, cockpit, saddle, pedals`; нет `data-part="wheels"`. Новый `rims and tyres are separate parts`: для стилей `hybrid`, `trike`, `kidTraining`, `special` в разметке с `highlight:'tyres'` внутри `<g data-part="tyres" data-on>` есть `class="s-tyre`, а внутри `data-part="rims"` нет `s-tyre`; `live` разметка содержит `id="wR"` и `id="wF"`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(draw): rims and tyres highlight separately`.

### Task 3: Виды — MTB, Женский, `drawAs`

**Files:** `content.js`, `tests/content.test.js`

**Produces:** виды `mountain` и `women` (поля — спецификация 2.1–2.2); `specs: string[]` у `mountain` и `women`; `branches: ['mtb','fullsus']` у `mountain`; `parent:'mountain'` у `mtb`, `fullsus`; `drawAs` у `mountain` (`'mtb'`), `women` (`'women'`), `ebike` (`'city'`, плюс `motor:true`); `fitAs`: `cx:'cx'`, `track:'track'`, `women:'women'`, `mountain:'mtb'`. `typeGroups.adult` = `city, hybrid, women, gravel, cx, road, track, mountain, folding, ebike, trike, cargo`; `typeOrder` — 21 вид: `adult` плюс `mtb, fullsus` сразу после `mountain`, затем детские и специальные.

- [ ] **Step 1: Тесты.** `types complete` — 21 вид. `groups cover every type once` → переписать: группы как выше; `typeOrder` = ожидаемый список; каждый вид — ровно в одной группе или указан в `branches` своего `parent`. `new fields per spec`: `FIT_AS` с новыми значениями; `terrain` есть у `mountain`; `specs` у `mountain`, `women` — 5–7 непустых строк; `T.mountain.branches` — `['mtb','fullsus']`, у каждой ветки `parent === 'mountain'`; `T.women.variants.length >= 3`, `T.women.note` непустой; `drawAs` любого вида — ключ `STYLES` из `model.js`. `menu items` — тексты меню не обещают число видов.
- [ ] **Step 2:** FAIL. **Step 3:** тексты и поля. **Step 4:** PASS (включая `no brands`).
- [ ] **Step 5:** Commit `feat(content): MTB overview with branches, women's type, drawAs`.

### Task 4: Узлы — вилка, обода, покрышки

**Files:** `content.js`, `tests/content.test.js`, `tests/images.test.js`, удалить `img/parts/wheels-0..2.webp`

**Produces:** `partOrder` = `frame, fork, brakes, drivetrain, rims, tyres, cockpit, saddle, pedals`. Вариант: необязательные `how: string`, `terrain: string`. Узел: необязательное `more: [{title, text?, list?: string[], ordered?: true, table?: {head: string[], rows: string[][]}}]`. Содержание — спецификация 5.2–5.3 (обода — 4 варианта, покрышки — 6; у узла с 6 вариантами лимит `variants` в тесте — до 6).

- [ ] **Step 1: Тесты.** `parts complete` — новый `partOrder`; варианты 2–6. Новый `fork, rims, tyres per spec`: у пружинной и воздушной вилки есть `how`; заголовки `fork.more` — `['Блокировка', 'Настройки воздушной вилки']`; у всех вариантов `rims` и `tyres` есть `terrain`; заголовки `rims.more` — `['Размеры', 'Ширина обода', 'Высокий профиль']`, у «Размеры» `table.head.length === 3` и 9 строк; заголовки `tyres.more` — `['На что влияет рисунок протектора', 'Материал: от худшего к лучшему', 'Камерные, бескамерные, трубки', 'Ширина и давление']`, у «Материал» `ordered === true` и `list.length >= 4`; в каждом разделе `more` есть хотя бы одно из `text`, `list`, `table`. `images`: `PENDING = ['rims', 'tyres']` пропускается в `every part variant has a compressed picture`; новый тест — в `img/parts/` нет файлов узлов, которых нет в `CONTENT.parts`.
- [ ] **Step 2:** FAIL. **Step 3:** тексты, удалить картинки `wheels-*`. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(content): fork in depth; rims and tyres as separate parts`.

### Task 5: Экраны видов и узлов

**Files:** `guide.js`, `index.html` (CSS), `tests/guide.test.js`

**Consumes:** поля Task 3–4.

**Produces:**
- `parseRoute('#parts/wheels')` → `{view:'part', id:'rims'}`.
- `typeBike(id)` → `[t.drawAs || id, !!t.motor]`; `fitOf(id)` → `t.fitAs ? [t.fitAs, !!t.motor] : null`; частное правило `id === 'ebike'` удалить.
- Страница вида: подпись над заголовком — `t.age || (t.parent && C.types[t.parent].name)`; раздел «Характеристики» (`specs`) после «Для каких трасс»; раздел «Хардтейл или двухподвес» (`branches`) — мини-карточки как в каталоге (`card` из `typesView` вынести в общую функцию).
- Страница узла: у варианта `how` — абзац «Как работает: …», `terrain` — «Для каких трасс: …»; после вариантов — разделы `more`: `text` → `<p>`, `list` → `ul`/`ol` (`ordered`), `table` → `<table class="ptable">` с `thead`.
- CSS: `.ptable` (как `.kids`, с горизонтальной прокруткой в обёртке на узком экране).

- [ ] **Step 1: Тесты.** `parseRoute: parts` — добавить `#parts/wheels` → `rims`, `#parts/tyres` → `tyres`. `guide texts live in content.js` — в `guide.js` нет `'ebike'`, нет «Хардтейл».
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** `#types` — одна карточка «MTB», есть «Женский»; `#types/mountain` → «Хардтейл» → «←» возвращает на MTB; у хардтейла подпись «MTB»; `#parts/fork`, `#parts/rims` (таблица на 360 px), `#parts/tyres`; подсветка обода и покрышки. Консоль без ошибок.
- [ ] **Step 6:** Commit `feat(guide): MTB branches, specs, parts sections and tables`.

### Task 6: Посадка — кнопки и вид по умолчанию

**Files:** `index.html`, `sw.js`, `tests/highlight.test.js`, `tests/state.test.js`, `tests/sw.test.js`

**Produces:** кнопки `#seg` в порядке `FIT_STYLES` с подписями: Город, Гибрид, Женский, Грэвел, Циклокросс, Шоссе, Трековый, MTB, Двухподвес, Складной (первая — `aria-checked="true"` не задаётся в HTML жёстко: отметку ставит `syncStyle`); `DEFAULTS.style = 'hybrid'`; `VERSION = 'fitstand-v8'`.

- [ ] **Step 1: Тесты.** `highlight`: для каждой пары (стиль, подпись) есть `<button role="radio" data-style="…"…>подпись</button>`, порядок кнопок = `FIT_STYLES`; `DEFAULTS` содержит `style:'hybrid'`. `state`: новый `loadSaved keeps a saved style` — `{style:'road'}` при умолчании `hybrid` даёт `road`, `{style:'women'}` даёт `women`, `{style:'bmx'}` даёт `hybrid`. `sw`: версия v8.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** Чистый `localStorage` → гибрид. Каждая новая кнопка: схема и цифры без NaN; «Женский» — низкая рама. 360 px: кнопки в несколько строк, без горизонтальной прокрутки. С `#types/cx` «Подобрать размер» → кнопка «Циклокросс» отмечена.
- [ ] **Step 6:** Commit `feat(fitstand): ten fit styles, hybrid by default; cache v8`.

### Task 7: Аксессуары по блокам

**Files:** `guide.js`, `index.html` (CSS), `tests/guide.test.js`, `tests/content.test.js`

**Produces:** `parseRoute('#acc/<x>')`: аксессуар → `{view:'accItem', id}`, группа → `{view:'accGroup', id}`, иначе `{view:'acc'}`. `accView()` — сетка `.acc-groups` из 10 плиток-ссылок `#acc/<groupId>`: картинка первой позиции группы, «значок название», «N позиций» (N — сумма `ids` по секциям). `accGroupView(id)` — `head('<значок> <название>', 'Аксессуары')` и секции с карточками (нынешняя разметка группы). В `accItemView` кнопка — «Все в группе „<название>“» → `#acc/<groupId>`.

- [ ] **Step 1: Тесты.** `parseRoute acc`: `#acc/safety` → `{view:'accGroup', id:'safety'}`, `#acc/helmet` → `accItem`, `#acc/xyz` → `acc`. `content`: `acc ids do not clash with group ids`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** `#acc` — 10 плиток (на 360 px — 2 в ряд); плитка → группа; карточка → «Все в группе» → группа; «←» по цепочке возвращает назад; «Все аксессуары» из результата → плитки.
- [ ] **Step 6:** Commit `feat(guide): accessories by group tiles`.

### Task 8: Выпуск этапа

- [ ] **Step 1:** `node --test` — всё зелёное; запуск и скриншоты ключевых экранов (360 px и десктоп).
- [ ] **Step 2:** Общее ревью ветки субагентом на opus (спецификация + план + diff `main..feedback3-catalog`); исправить подтверждённое.
- [ ] **Step 3:** docx продавцу `info/Feedback 3/Решения/Фитстенд - каталог и справочник.docx` — что сделано по пунктам 1, 2, 5, 6, 7 (текст), 8, что проверить, что дальше (анимация вилки, картинки, главная). Обновить статусы в `info/Фитстенд - требования.docx`.
- [ ] **Step 4:** Спросить «да» на мерж в main и push.
