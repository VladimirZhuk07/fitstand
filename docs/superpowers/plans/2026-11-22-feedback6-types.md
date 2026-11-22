# Четыре новых вида на главной — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На главной 14 видов: добавить Электро, BMX, Подростковый и С подпорными колёсами, с детским подбором по росту, цветом рамы по виду, своими сценами езды и узнаваемыми деталями.

**Architecture:** Статическое PWA без сборки: `model.js` (геометрия и подбор, без DOM), `state.js` (разбор сохранения, без DOM), `draw.js` (SVG велосипеда), `ride.js` (сцены езды), `index.html` (панель и анимация), `content.js` (каталог). Новые чистые функции живут в этих файлах и тестируются в Node; `index.html` только связывает их.

**Tech Stack:** plain JS (UMD-обёртки `module.exports` / глобалы), SVG, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-feedback6-types-design.md`

## Global Constraints

- Тесты: `node --test` из корня репозитория, **без аргумента пути** (на Windows путь ломает запуск). До начала работы — 263 теста, все зелёные; после каждой задачи все зелёные.
- Никаких марок и торговых названий; имя магазина и продавца не писать нигде (тест проверяет марки).
- Цвета фона сцен — только через CSS-классы и переменные: в разметке `rideBgMarkup` нет `fill="#…"`, `stroke="#…"`, `stop-color="#…"` (существующий тест).
- Всё, что рисуется в слое сцены, остаётся внутри своего тайла (существующие тесты на границы `rect` и `ellipse`).
- Новые детали велосипеда — группы `<g data-k="имя">`, по которым их ищут тесты.
- `sw.js` VERSION и `tests/sw.test.js` не трогать (поднимается один раз при слиянии).
- Комментарии в коде — по-английски, как в соседнем коде; тексты интерфейса — по-русски.
- Не пушить, не сливать ветки. Ветка: `feedback6-types`.

## Review Focus

1. **Переключение взрослый → детский → взрослый** сохраняет взрослые H/I/A/W и детский рост каждого вида независимо, в том числе после перезагрузки. Тест — в задаче 5 (`riderOf`, разбор `kidH`).
2. **Старое сохранение без `kidH`** с выбранным детским видом открывается на росте по умолчанию (110 / 145), без NaN. Тест — задача 5.
3. **Самый маленький ребёнок (85 см, 12″) и самый большой подросток (165 см, 26″)**: посадка считается без NaN, седло выше каретки, колено согнуто в разумных пределах. Тест — задача 3.
4. **Рисунки каталога** для детских видов и BMX не меняют размер колёс после перехода на ростовку (С подпорными колёсами 110 см → 16″, Подростковый 145 см → 24″). Тест — задача 3.
5. **Строка «Рост» в итоге** у BMX не говорит про складные велосипеды; у складного остаётся как была. Тест — задача 6 (`heightRowOf`).

---

### Task 1: Флаги вида доходят до живого рисунка при смене вида

Сейчас `tick()` в `index.html` переносит из `target` в `cur` только `FLAGS=['brake','susp','hinge','suspPost','stepThrough']`, поэтому `rearShock` и все новые детали не появляются после переключения вида без перезагрузки.

**Files:**
- Modify: `draw.js` (новая функция + экспорт), `index.html:762,827`
- Test: `tests/draw.test.js`

**Interfaces:**
- Produces: `copyFlags(cur: object, target: object, numKeys: string[]) -> boolean` в `draw.js` (экспорт): копирует в `cur` каждый ключ `target`, которого нет в `numKeys` и значение которого отличается (сравнение `!==`); возвращает `true`, если что-то скопировано.

- [ ] **Step 1: Failing test** в `tests/draw.test.js`:
  - `test('copyFlags copies every non-numeric key that changed and reports it')`: `cur={a:1,rearShock:false,brake:'rim'}`, `target={a:2,rearShock:true,brake:'disc',gyro:true}`, `numKeys=['a']` → возвращает `true`; `cur.rearShock===true`, `cur.brake==='disc'`, `cur.gyro===true`, `cur.a===1` (числовой не тронут). Повторный вызов с теми же объектами → `false`.
- [ ] **Step 2:** `node --test` → новый тест падает (`copyFlags is not a function`).
- [ ] **Step 3:** реализовать `copyFlags` в `draw.js`, добавить в экспорт. В `index.html` убрать константу `FLAGS`, строку 827 заменить на `if(copyFlags(cur,target,NUM))dirty=true;`.
- [ ] **Step 4:** `node --test` → всё зелёное.
- [ ] **Step 5:** commit `fix: every style flag reaches the live drawing on a style switch`.

---

### Task 2: Тело ребёнка из роста

**Files:**
- Modify: `model.js` (`WHEEL_R`, `bodyOf`, новая `kidBody`, экспорт)
- Test: `tests/model.test.js`

**Interfaces:**
- Produces: `kidBody(H: number) -> {I, A, W, headK}` (см, доли — числа); `bodyOf(p)` учитывает `p.headK`; `WHEEL_R['18']===177.5`, `WHEEL_R['26']===279.5`.

- [ ] **Step 1: Failing tests:**
  - `test('kidBody hits the anchor rows')`: для каждой строки таблицы спеки (95, 110, 125, 145, 178) `I/H`, `A/H`, `W/H`, `headK` совпадают с таблицей с точностью 1e-6 (`I` возвращается в см: `kidBody(110).I ≈ 0.427*110`).
  - `test('kidBody is linear between anchors and clamped outside')`: `kidBody(117.5).I/117.5` — среднее долей 110 и 125; `kidBody(80)` даёт доли строки 95; `kidBody(200)` — доли строки 178.
  - `test('bodyOf: adults unchanged, a child gets a larger head')`: для `{H:178,I:83,A:61,W:42}` результат `bodyOf` такой же, как до изменения (`headR===0.062*1780`); для `{H:110,...kidBody(110)}` `headR===0.076*1100`.
  - `test('wheel radii for 18 and 26 inch')`.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать. Таблица опор — константа `KID_BODY=[[95,0.421,0.316,0.253,0.080],[110,0.427,0.318,0.245,0.076],[125,0.440,0.328,0.240,0.072],[145,0.455,0.338,0.234,0.067],[178,0.466,0.343,0.236,0.062]]`. В `bodyOf`: `headR:(p.headK||0.062)*H`.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(model): a child's body from height`.

---

### Task 3: Ростовка детских видов и подбор по росту

**Files:**
- Modify: `model.js` (`STYLES.kidTraining`, `STYLES.teen`, `sizesFor`, новая `kidSizeFor`, `fit`, экспорт)
- Test: `tests/model.test.js`

**Interfaces:**
- Consumes: `kidBody` (задача 2).
- Produces:
  - `STYLES.kidTraining.kidSizes`, `STYLES.teen.kidSizes` — массивы `{n, wheel, st, reach, stack, ht, crank, h:[min,max]}` по таблицам спеки (`n` — `'12″'` и т. д., `wheel` — `'12'`, `'14'`, `'16'`, `'18'`, `'24'`, `'26'`);
  - `STYLES.kidTraining.kidFit={range:[85,125],def:110}`, `STYLES.teen.kidFit={range:[125,165],def:145}`; у обоих `oneSize:false`;
  - `kidSizeFor(style: string, H: number) -> number` — индекс в `kidSizes`: ближайшая середина диапазона, при равенстве меньший индекс;
  - `sizesFor(style)` для вида с `kidSizes` возвращает копии `kidSizes` (проверка идёт **до** ветки `st.size`);
  - `fit(p)` для вида с `kidFit`: тело `{...p, ...kidBody(p.H)}`, оценивается только размер `kidSizeFor`, `best.i` — его индекс, `near=[]`, шатун `crank0 = Math.min(c0, size.crank)`, поправки здоровья не применяются.

- [ ] **Step 1: Failing tests:**
  - `test('kidSizeFor picks by the middle of the height range')`: kidTraining — 85→0, 100→1 (середины 92.5 и 102.5), 105→1, 112→2, 120→3, 125→3; teen — 125→0, 146→0 (равенство 146.25 не достигнуто: 137.5/155), 147→1, 165→1; и `kidSizeFor('kidTraining', 97.5)===0` (ровно посередине между 92.5 и 102.5 → меньший).
  - `test('kid fit: size, wheel and crank follow the height')`: `fit({H, style:'kidTraining', flex:3})` для H=90/100/112/122 → `best.sz.wheel` `'12'/'14'/'16'/'18'`, `g.crank` 85/89/95/102; teen H=135 → `'24'`, 152; H=160 → `'26'`, 160.
  - `test('kid fit at the edges: no NaN, saddle above the crank, knee sane')`: H=85 kidTraining и H=165 teen — все числа в `g` конечны, `g.saddleH > g.crank`, `F.knee` конечен и в пределах 0–90° (точную норму для детей не задаём; фактические значения — в отчёт).
  - `test('catalog dummies keep their wheels')`: `fit({...STYLES.kidTraining.rider, style:'kidTraining', flex:3}).best.sz.wheel==='16'`; то же для teen → `'24'`; bmx → `'20'`.
  - `test('rear tyre clears the bottom bracket on every size of every style')`: для всех `FIT_STYLES` (после задачи 4 — 14 видов; здесь — текущие плюс kidTraining и teen) и каждого размера `sizesFor` выполняется `g.cs > g.wheelR + 25` у результата `fit` с подходящим ростом (взрослые — 178 см, детские — середина диапазона каждого размера).
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать. Геометрия подросткового: `cs:410, drop:-10, HTA:69, STA:72` (сейчас перья 280 мм короче радиуса колеса); если тест зазора не проходит для другого вида — остановиться и доложить, не подбирать числа самостоятельно.
- [ ] **Step 4:** `node --test` → зелёное (существующие тесты каталога и рисунков тоже).
- [ ] **Step 5:** commit `feat(model): kids' bikes are sized by the child's height`.

---

### Task 4: Вид «Электро», флаги деталей, 14 видов на главной

**Files:**
- Modify: `model.js` (`STYLES.ebike`, `evalSize`, `FIT_STYLES`, данные `bmx/kidTraining/teen`)
- Test: `tests/model.test.js`

**Interfaces:**
- Produces:
  - `STYLES.ebike={...STYLES.hybrid, name:'Электро', susp:true, motor:true, display:true, parent:'hybrid'}`;
  - флаги вида: `bmx` — `gyro:true, gumwall:true, brake:'rearRim'`; `kidTraining` — `rimAccent:true, bell:true, parentHandle:true`; `teen` — `reflectors:true, fender:1`;
  - `evalSize` кладёт в `g`: `motor:!!st.motor, display:!!st.display, gyro:!!st.gyro, gumwall:!!st.gumwall, rimAccent:!!st.rimAccent, bell:!!st.bell, parentHandle:!!st.parentHandle, reflectors:!!st.reflectors` (`fender` и `brake` уже переносятся);
  - `FIT_STYLES=['city','hybrid','women','gravel','cx','road','track','mtb','fullsus','folding','ebike','bmx','teen','kidTraining']`;
  - `STYLES.folding.heightRange=[150,195]` (в `FOLDING_RANGE` то же значение; константа остаётся).

- [ ] **Step 1: Failing tests:**
  - `test('ebike: hybrid sizes, a fork, a motor and a display')`: `sizesFor('ebike')` глубоко равен `sizesFor('hybrid')`; у `fit({...adult, style:'ebike'}).g` `susp===true`, `motor===true`, `display===true`.
  - `test('detail flags reach the geometry')`: bmx → `gyro`, `gumwall`, `brake==='rearRim'`; kidTraining (H 110) → `rimAccent`, `bell`, `parentHandle`; teen (H 145) → `reflectors`, `fender===1`; у road все новые флаги `false`.
  - `test('14 styles on the main screen, in this order')`: `FIT_STYLES` равен массиву выше.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное. Если падают существующие тесты, перечисляющие `FIT_STYLES` (например, «у каждого вида есть сцена» в `ride.test.js`), — не трогать их здесь: доложить список; их закроет задача 9.
- [ ] **Step 5:** commit `feat(model): e-bike style, detail flags, 14 styles on the main screen`.

---

### Task 5: Детский рост в сохранении и выбор мерок

**Files:**
- Modify: `state.js` (`loadSaved`, новая `riderOf`, экспорт)
- Test: `tests/state.test.js`

**Interfaces:**
- Consumes: в `styles` (третий аргумент `loadSaved`) у детских видов есть `kidFit:{range,def}`.
- Produces:
  - `loadSaved` возвращает `out.kidH` — объект `{style: number}` для каждого вида из `styles` с `kidFit`: сохранённое число, если оно конечное и в `range`, иначе `def`; `defaults.kidH` не нужен;
  - `riderOf(state, styles, kidBody) -> {H, I, A, W, headK?}`: для вида с `kidFit` — `{H: state.kidH[style], ...kidBody(H)}`, иначе `{H, I, A, W}` из `state`.

- [ ] **Step 1: Failing tests** (в тестовом `STYLES` добавить `kidTraining:{kidFit:{range:[85,125],def:110}}`, `teen:{kidFit:{range:[125,165],def:145}}`):
  - `test('kidH: saved heights load, bad ones fall back per style')`: `{kidH:{kidTraining:100,teen:200}}` → `{kidTraining:100, teen:145}`; `{kidH:'x'}` и отсутствие поля → `{kidTraining:110, teen:145}`; `{kidH:{kidTraining:NaN}}` → 110; лишние ключи (`{kidH:{road:150}}`) не попадают.
  - `test('riderOf: adults and kids keep separate measures')`: состояние `{H:178,I:83,A:61,W:42,style:'teen',kidH:{kidTraining:100,teen:150}}`; `riderOf` с заглушкой `kidBody=H=>({I:H*0.45,A:H*0.33,W:H*0.23,headK:0.07})` → `H===150`, `I===67.5`; со `style:'road'` → ровно `{H:178,I:83,A:61,W:42}`.
  - `test('an old save with a kid style opens on the default height')`: `{style:'teen'}` (без `kidH`) → `state.style==='teen'`, `riderOf(...).H===145`.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(state): a child's height per kids' style, separate from the adult measures`.

---

### Task 6: Панель главной: 14 кнопок и детский режим

**Files:**
- Modify: `index.html` (разметка `#seg`, `DEFAULTS`, `save`, `syncControls`, обработчик `inputs.H`, `syncStyle`, `changed`, `tick`, `renderSpecs`, `fitstand.applyStyle`), `model.js` (новая `heightRowOf`, экспорт)
- Test: `tests/model.test.js`, `tests/content.test.js` или новый `tests/page.test.js` (проверки текста `index.html`, как в `ride.test.js` «depth blur … wired in the page»)

**Interfaces:**
- Consumes: `kidBody`, `kidSizeFor`, `fit` (2–3), `FIT_STYLES` (4), `riderOf`, `kidH` (5).
- Produces: `heightRowOf(style, H, sizeIndex) -> null | {value: string, hint: string, status: 'good'|'warn'}` в `model.js`:
  - вид с `kidFit`: `hint` — `на рост ${min}–${max} см` (диапазон размера); `status:'warn'` и `hint` дополняется `· скоро вырастет — следующий ${n}`, если `H >= max-3` и есть размер больше;
  - вид с `heightRange` (складной): `складные обычно на 150–195 см`, `warn` вне диапазона (как сейчас);
  - остальные (включая bmx) — `null`.

- [ ] **Step 1: Failing tests:**
  - `heightRowOf`: kidTraining H=118, индекс 2 (16″, 105–120) → `warn`, hint содержит `на рост 105–120 см` и `следующий 18″`; H=110 → `good`; teen H=163, индекс 1 (последний) → `good` (больше нет); folding H=140 → `warn` и `складные обычно на 150–195 см`; bmx → `null`.
  - Страница (чтение `index.html` как текста): в `#seg` 14 кнопок `data-style` в порядке `FIT_STYLES`; подписи новых — `Электро`, `BMX`, `Подростковый`, `С подпорными колёсами`; `save()` сохраняет `kidH`; `fit(` в `changed()` получает мерки через `riderOf(`.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать `heightRowOf`; в `index.html`:
  - 4 кнопки в `#seg`;
  - `const kidOf=s=>STYLES[s].kidFit||null`, мерки везде через `riderOf(state,FIT_ONLY,kidBody)`: `changed()` (здоровье `null` для детского вида), `curP`-твин в `tick()`, `renderSpecs` (`bodyOf`, «Индекс ноги» и т. д.);
  - `syncControls()`: у детского вида `inputs.H.min/max` из `kidFit.range`, значение `state.kidH[style]`; поля `[data-dim="I"],[data-dim="A"],[data-dim="W"]`, `.presets` и `#healthRow` скрыты (`hidden`); у взрослого — `145/210` и всё видно;
  - обработчик `inputs.H`: у детского вида пишет в `state.kidH[style]`, взрослые мерки не трогает;
  - `renderSpecs`: строка «Рост» строится из `heightRowOf` (вместо проверки `st.oneSize` с `FOLDING_RANGE`), при `null` строки нет;
  - `#tMotor`: для `ebike` `checked` и `disabled`; рисунок получает мотор, если `state.motor || target.motor`;
  - `save()` пишет `kidH`.
- [ ] **Step 4:** `node --test` → зелёное. Открыть страницу (`python -m http.server 8765`, браузер) и пройти: Гибрид → Подростковый (ползунок 125–165, видна только строка роста) → С подпорными колёсами → Гибрид (взрослые мерки прежние) → перезагрузка (всё сохранилось). Если проверить в браузере нельзя — написать это в отчёте.
- [ ] **Step 5:** commit `feat(main): 14 styles; kids' styles take only the child's height`.

---

### Task 7: Цвет рамы по виду

**Files:**
- Modify: `index.html` (`COLORS`-ряд, `STYLE_COLOR`, клик по виду, `loadSaved`-вызов)
- Test: тест страницы из задачи 6

**Interfaces:**
- Produces: `STYLE_COLOR` (объект `вид → [hex, название]`) по таблице спеки; первый образец в `#sw` — «цвет вида» (`data-style-color`), его `--c` и `aria-label` меняются со сменой вида; список допустимых цветов для `loadSaved` — объединение `COLORS` и `STYLE_COLOR`.

- [ ] **Step 1: Failing tests** (текст `index.html`): у каждого из 14 `FIT_STYLES` есть цвет в `STYLE_COLOR`, значения — из таблицы спеки (`track` `#8CCB2E`, `women` `#4FB8D6`, `teen` `#E8C21C`, `bmx` `#8A8A3A`, `cx` `#2B5FB8`, `hybrid` `#23407A`, `folding` `#5A6E82`, остальные `#2E3237`); вызов `loadSaved` получает объединённый список цветов.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать: клик по виду ставит `state.color=STYLE_COLOR[style][0]`, обновляет `--frame` и выбранный образец; `fitstand.applyStyle` делает то же.
- [ ] **Step 4:** `node --test` → зелёное; в браузере: смена вида перекрашивает раму, выбор другого цвета работает, после перезагрузки цвет сохранён.
- [ ] **Step 5:** commit `feat(main): every style has its own frame colour`.

---

### Task 8: Каталог открывает новые виды на главной

**Files:**
- Modify: `content.js` (`types.ebike`, `types.kidTraining`, `types.teen`, `types.bmx`)
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: `types.ebike.fitAs==='ebike'` (поле `drawAs` у ebike убрать; `motor:true` оставить), `types.kidTraining.fitAs==='kidTraining'`, `types.teen.fitAs==='teen'`, `types.bmx.fitAs==='bmx'`.

- [ ] **Step 1: Failing test** `test('the catalog opens every main-screen style')`: для каждого `fitAs` в `types` значение входит в `FIT_STYLES`, и каждый вид из `FIT_STYLES`, у которого есть тип каталога с тем же id, ссылается на себя (`ebike`, `kidTraining`, `teen`, `bmx`).
- [ ] **Step 2:** `node --test` → падает.
- [ ] **Step 3:** поправить данные; проверить, что `guide.js` (`fitOf`) и рисунок карточки каталога для ebike работают с `fitAs:'ebike'` (рисунок карточки строится из `fitAs`/`drawAs`; если ломается — доложить).
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(catalog): the e-bike, kids' and BMX cards open their style on the main screen`.

---

### Task 9: Сцены Электро и С подпорными колёсами, скорости по таблице А

**Files:**
- Modify: `ride.js` (`SCENES`, `STYLE_SCENE`, `BUILD.far/mid/near/road`), `index.html` (CSS-тинт `#bike[data-scene="ebike"]`, `…="kidTraining"`, классы новых элементов)
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: сцены `ebike` и `kidTraining` по таблице спеки (раздел 5); слои `far.suburb`, `mid.lamps`, `near.lawn`, `road.bikelane`, `far.yard`, `mid.playground`; `STYLE_SCENE.ebike='ebike'`, `STYLE_SCENE.kidTraining='kidTraining'`. Новые CSS-классы с префиксом `rb-` (например `rb-slide`, `rb-swing`, `rb-laneline`), цвета — через существующие переменные сцены.

- [ ] **Step 1: Failing tests:**
  - в `SCENE_IDS` добавить `'ebike','kidTraining'`; `KMH` заменить на значения таблицы А с допуском: `road:[34,36], track:[44,46], mtb:[19.5,20.5], women:[11.5,12.5], gravel:[24,26], city:[15.5,16.5], folding:[14.5,15.5], hybrid:[19.5,20.5], cx:[23.5,24.5], ebike:[25,27], kidTraining:[6.5,7.5], default:[20,24]` (скорость идёт через целое число оборотов, поэтому проверять на колесе 311 мм, а для kidTraining — на `WHEEL_R['16']+40`);
  - `sceneOf`: `ebike→'ebike'`, `kidTraining→'kidTraining'`; список «неизвестных» в существующем тесте поправить (`kid` остаётся неизвестным, `bmx` уйдёт в задачу 10 — пока оставить в списке неизвестных);
  - `test('ebike scene: suburb, lamps, a lawn, a bike lane with a dashed line')` и `test('kidTraining scene: yard houses, a playground with a slide and swings, a lawn')` — наличие своих классов в разметке слоёв, как в тестах сцен отзыва 5;
  - существующие тесты «every scene: patterns stay inside their tile…» и «every scene keeps the wheel…» автоматически покрывают новые id через `SCENE_IDS`.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать по образцу `city`/`hybrid` (тайлы, `rng(seed)`, предметы стоят на низу тайла и не пересекают край).
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(ride): e-bike and training-wheels scenes; scene speeds from the seller's table`.

---

### Task 10: Сцены Подростковый и BMX

**Files:**
- Modify: `ride.js`, `index.html` (CSS-тинт `teen`, `bmx`, классы)
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: сцены `teen` (`effect:'dust'`) и `bmx` по таблице спеки; слои `far.edge`, `far.cityback`, `mid.ramps`, `near.ledge`, `road.concrete`; `STYLE_SCENE.teen='teen'`, `STYLE_SCENE.bmx='bmx'`. Граффити — цветные пятна (`ellipse`/`path` с классами `rb-graffiti…`), **без текста и букв**.

- [ ] **Step 1: Failing tests:** `SCENE_IDS` + `'teen','bmx'`, `KMH.teen:[14.5,15.5]` (колесо `WHEEL_R['24']+40`), `KMH.bmx:[17.5,18.5]` (колесо `WHEEL_R['20']+55`); `sceneOf` для обоих; убрать `bmx` из списка неизвестных; `test('teen scene: a forest edge, park trees, roots, dirt, dust')`, `test('bmx scene: city behind, ramps and a graffiti wall without text, a ledge with a rail, concrete with joints')` — в разметке нет `<text`; `effectPuffs` для `teen` даёт пыль.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное; `test('every FIT_STYLE has its own scene')`: для каждого из 14 `FIT_STYLES` `sceneOf(s)!=='default'` — добавить и проверить, что проходит.
- [ ] **Step 5:** commit `feat(ride): teen and BMX scenes`.

---

### Task 11: Детали Электро, Подросткового и С подпорными колёсами

**Files:**
- Modify: `draw.js` (`bikeMarkup`, `wheel`), `index.html` (CSS классов `.rim-accent`, `.f-display`, `.f-reflector`, `.f-bell` для светлой и тёмной темы)
- Test: `tests/draw.test.js`

**Interfaces:**
- Consumes: флаги из задачи 4.
- Produces: в разметке `bikeMarkup`:
  - `data-k="display"` — дисплей на руле у грипса (внутри `part('cockpit',…)`, чтобы поворачивался с рулём);
  - мотор рисуется при `opts.motor || g.motor` (существующая группа `data-k="motor"`);
  - `data-k="reflectors"` — по одному оранжевому отражателю на спицах каждого колеса, **внутри** группы спиц (`<g class="spokes">` живого колеса), чтобы вращались;
  - у обода класс `rim-accent` при `g.rimAccent`;
  - `data-k="bell"` — звонок на руле; `data-k="parentHandle"` — ручка за седлом (внутри `part('saddle',…)`).

- [ ] **Step 1: Failing tests** (как `MARK` в `draw.test.js`): `ebike` → есть `data-k="display"` и `data-k="motor"` без `opts.motor`; `teen` → `data-k="reflectors"` и в живом рисунке (`live:true`, id колёс) отражатель находится внутри `<g id="wR">…</g>`; `kidTraining` → `rim-accent`, `bell`, `parentHandle`; у `road` ни одной из этих меток.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать; цвета — только классы, значения в CSS `index.html` (оранжевый `#E8742A` для `rim-accent` и отражателей).
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(draw): e-bike display, kids' rims, bell, parent handle, spoke reflectors`.

---

### Task 12: Детали BMX

**Files:**
- Modify: `draw.js` (`brakesMarkup`, `bikeMarkup`, `wheel`), `index.html` (CSS `.s-gumwall`)
- Test: `tests/draw.test.js`

**Interfaces:**
- Produces: `brake:'rearRim'` → группа `data-k="rim"` только с задним ободным тормозом; `data-k="gyro"` — диск ротора под выносом и два троса к заднему тормозу (внутри `part('cockpit',…)`); `data-k="gumwall"` — коричневое кольцо боковины на обеих шинах (в части `tyres`).

- [ ] **Step 1: Failing tests:** у `bmx` есть `gyro` и `gumwall`; в группе `data-k="rim"` ровно один калипер (один `<line`), и он у заднего колеса (его центр ближе к `R`, чем к `F`); у `city` (`brake:'rim'`) по-прежнему два.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(draw): BMX rotor, gum-wall tyres and a rear brake only`.

---

### Task 13: Проверка глазами (делает ведущий, не исполнитель)

- [ ] Скриншоты главной для 4 новых видов и 3 прежних с изменённой скоростью (шоссе, трек, женский) в светлой и тёмной теме — приём `_shot.html` + headless Chrome (см. память проекта). Проверить: чёрная рама видна в тёмной теме (иначе — контур рамы для тёмной темы), ребёнок не выглядит уменьшенным взрослым, колесо не задевает раму, граффити без букв, детали различимы.
- [ ] Найденное — отдельными задачами исполнителю.
- [ ] Общее ревью ветки (Opus), затем: версия `sw.js` + `tests/sw.test.js`, документ продавцу, строки R1/R2 в сводном файле требований; слияние только после «да».
