# Опрос с учётом здоровья и 2–3 варианта — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в опрос вопрос «Есть ли травмы» с раскрывающимися блоками о здоровье, результат из 2–3 вариантов «вид + оснастка» и поправки посадки в фитстенде.

**Architecture:** Ответы о здоровье — данные с эффектами в `content.js`. Чистые функции в `quiz.js` строят список шагов и результат; `state.js` проверяет и переводит сохранение; `model.js` применяет поправки посадки, `draw.js` рисует оснастку; `guide.js` и `index.html` — экраны и фитстенд.

**Tech Stack:** ванильный JS без сборки, `node --test`, headless Edge через `%TEMP%/fitstand-build/cdp.mjs` для проверок в браузере.

**Spec:** `docs/superpowers/specs/2026-11-04-health-quiz-design.md`

## Global Constraints

- Без брендов, цен, названий магазинов и имён в отслеживаемых файлах.
- Ничего не запрещаем: здоровье меняет баллы, оснастку, посадку и добавляет предупреждения.
- Ограничения суммы: `upright` ≤ 12, `barUp` ≤ 60, `crankMax` ≥ 145.
- Дисклеймер на шаге `gate` и в результате; совет врача при `rehab` — тексты из спецификации 2.3 и 5.1 дословно.
- Ответы хранятся только в localStorage (`fitstand:v1`); сервера нет.
- Модуль-шаблон `(function(root){…})(globalThis)` с `module.exports` в Node — как в существующих файлах.
- Кэш `fitstand-v4`; все тексты — в `content.js`.
- Тесты: `node --test` из корня; существующие эталоны модели не меняются.
- Работа в ветке `feature/health` от `main`; коммит в конце каждой задачи; в `main` и пуш — после финального ревью.

## Review Focus

1. **Старое сохранение — массив из 6 пройденных ответов:** опрос продолжается с шага 7 (`gate`), результат не открывается до ответа на `gate`. Тесты: `migrates old quiz array` (Task 4), `firstMissingStep after old six` (Task 2).
2. **Снятый блок на `gate` после ответов в нём:** ответы блока удаляются и не влияют на результат. Тесты: `pruneAnswers drops unchecked blocks` (Task 2), `answers of unchecked block are ignored` (Task 3).
3. **Повреждённый `gate` с `none` и другими ответами вместе:** считается как `none`. Тест: `none wins in a corrupt gate` (Task 2).
4. **Переключатель «Учитывать» выключен:** фитстенд считает ровно как без поправок. Тест: `fit without health equals baseline` (Task 5) и проверка в браузере (Task 7).
5. **«Стереть мои ответы»:** после стирания «Подобрать велосипед» ведёт на `#quiz/1`, строка «Учтено здоровье» пропадает, рост остаётся. Проверка в браузере (Task 8).

---

### Task 1: Данные здоровья в `content.js`

**Files:**
- Modify: `content.js`, `tests/content.test.js`

**Interfaces:**
- Produces `CONTENT.health`:
  - `gate: {id:'gate', q, multi:true, answers:[{id:'back',text:'Спина'},{id:'knees',text:'Колени и бёдра'},{id:'upper',text:'Шея, плечи, руки'},{id:'none',text:'Нет'}]}`
  - `blocks: [{id:'back', title:'Спина', questions:[HQ back1, HQ back2]}, {id:'knees', title:'Колени и бёдра', questions:[knee1, knee2]}, {id:'upper', title:'Шея, плечи, руки', questions:[upper1]}]`
  - `cushion: HQ` (id `'cushion'`)
  - `HQ = {id, q, multi:boolean, answers:[HA]}`; `HA = {text, pts?, fit?:{upright?, barUp?, crankMax?, stepThrough?}, gear?:[id], warn?:{types:[вид], text}, explain?, reason?, note?, rehab?:true, offroadGear?:[id]}` — `offroadGear` только у `cushion` «Критична…» = `['fullSusp']`.
  - `gearOrder: ['fullSusp','suspFork','suspPost','wideTyres','riseBar','stepThrough','shortCranks','lowGears','ergoGrips','altGrips']`; `gear: {id: название}` — названия из спецификации 3.2; у `shortCranks` название с `{mm}`: `'короткие шатуны до {mm} мм'`.
  - `variantNames: {balance:'Баланс', comfort:'Максимальный комфорт', simple:'Проще и дешевле'}`
  - `disclaimer`, `privacy`, `rehabText` — дословно из спецификации 2.3 и 5.1 (`disclaimer` — длинный текст из 5.1; на шаге `gate` показываются первое предложение `disclaimer` + `privacy`).
  - `geometryRows: [{key:'stack'|'reach'|'crank'|'bar'|'tyre'|'frame', name, what, injury}]` — из таблицы 5.2; `geometryWarning` — текст под таблицей.
  - `explainTitles` не нужен: заголовок экрана-объяснения — `block.title`.
- Produces `CONTENT.menu` += `{id:'erase', title:'Стереть мои ответы', short:'Ответы опроса и поправки посадки'}` последним пунктом.

- [ ] **Step 1: Тесты** в `tests/content.test.js`:
  - `health gate` — 4 ответа с id `back, knees, upper, none`, `multi:true`;
  - `health questions` — ids по порядку `back1, back2, knee1, knee2, upper1, cushion`; числа ответов `6, 4, 6, 3, 5, 4`; `multi` — `true` у `back1, knee1, upper1`, иначе `false`; тексты вопросов дословно из спецификации 2.1; ответ `back2[2].text === 'Готов(а) к лёгкому наклону, если есть амортизация'`;
  - `health effects shape` — у каждого ответа ключи ⊂ `{text,pts,fit,gear,warn,explain,reason,note,rehab,offroadGear}`; `pts` — ключи ⊂ `BASE_TYPES`, целые −3..3; `fit` — ключи ⊂ `{upright,barUp,crankMax,stepThrough}`; `gear`, `offroadGear` ⊂ `gearOrder`; `warn.types` ⊂ `BASE_TYPES`, `warn.text` не пустой;
  - `health matrix matches spec` — таблица `EXPECTED_HEALTH` из спецификации 3.1: для каждого ответа сверить `pts` (0, если нет), `fit`, `gear`, наличие `warn` и его `types`, `rehab`;
  - `every health answer explains itself` — у каждого ответа с `pts`, `fit` или `gear` есть непустые `explain` и `reason`;
  - `health texts` — `disclaimer`, `privacy`, `rehabText`, `geometryWarning` дословно из спецификации; 6 строк `geometryRows` с ключами по порядку; у каждой непустые `name, what, injury`;
  - `menu items` — обновить ожидание: `['quiz','fit','types','parts','erase']`;
  - `no brands` уже покрывает новые тексты.
- [ ] **Step 2:** `node --test` → новые тесты FAIL.
- [ ] **Step 3:** Заполнить `CONTENT.health` и пункт меню. Тексты `warn/explain/reason/note` — короткие, по смыслу таблицы 3.1; `reason` во 2-м лице, со строчной («у вас проблема с поясницей — нужна посадка без сильного наклона»).
- [ ] **Step 4:** `node --test` → PASS. Старые тесты `menu items` и опроса тоже зелёные.
- [ ] **Step 5: Commit** `feat(content): health questions with effects, gear names, disclaimers`

---

### Task 2: Ход опроса `quizFlow`

**Files:**
- Modify: `quiz.js`, `tests/quiz.test.js`

**Interfaces:**
- Consumes: `CONTENT.quiz`, `CONTENT.health` (Task 1).
- Produces (экспорт `quiz.js`):
  - `Answers = {q1..q6:number, gate:[id], back1:[number], back2:number, knee1:[number], knee2:number, upper1:[number], cushion:number}` (любые поля могут отсутствовать).
  - `MAX_STEPS = 16`.
  - `gateBlocks(A):string[]` — `[]`, если `gate` нет или содержит `none`; иначе id блоков из `gate` в порядке `back, knees, upper`.
  - `quizFlow(A, C):Step[]`, `Step = {kind:'q', id} | {kind:'explain', block}` — порядок: `q1…q6`, `gate`, затем для каждого блока из `gateBlocks` его вопросы и `{kind:'explain', block}`, затем `cushion`, если блоков ≥ 1.
  - `getQuestion(id, C)` — для `q1…q6` объект из `C.quiz[i]` (с `multi:false`), для остальных — из `C.health`.
  - `isAnswered(step, A, C):boolean` — explain всегда `true`; один ответ — целое, есть такой ответ; несколько — непустой массив допустимых номеров (у `gate` — допустимых id).
  - `firstMissingStep(A, C):number` — индекс (с 0) первого шага без ответа или `-1`.
  - `pruneAnswers(A, C):Answers` — новый объект без ответов блоков, которых нет в `gateBlocks(A)`, и без `cushion`, если блоков нет.

- [ ] **Step 1: Тесты** в `tests/quiz.test.js` (на реальном `CONTENT`):
  - `flow without injuries` — `A={q1..q6, gate:['none']}` → 7 шагов, последний `{kind:'q', id:'gate'}`;
  - `flow with back` — `gate:['back']` → 11 шагов: `…gate, back1, back2, explain back, cushion`;
  - `flow with all blocks` — `gate:['upper','back','knees']` → 16 шагов, блоки в порядке back, knees, upper; `quizFlow(...).length === MAX_STEPS`;
  - `none wins in a corrupt gate` (Review Focus 3) — `gate:['none','back']` → 7 шагов;
  - `firstMissingStep after old six` (Review Focus 1) — `{q1..q6}` → `6`; пустой → `0`; полный ход с back → `-1`;
  - `isAnswered` — `back1:[]` → false; `back1:[0,9]` → false; `back2:1` → true; `gate:['back','x']` → false;
  - `pruneAnswers drops unchecked blocks` (Review Focus 2) — `{gate:['knees'], back1:[0], back2:1, knee1:[2], cushion:0}` → без `back1, back2`, с `knee1, cushion`; `{gate:['none'], cushion:0}` → без `cushion`.
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Реализовать функции в `quiz.js`, экспортировать вместе с существующими.
- [ ] **Step 4:** `node --test` → PASS.
- [ ] **Step 5: Commit** `feat(quiz): health flow with gate, blocks and explain steps`

---

### Task 3: Результат `buildResult`

**Files:**
- Modify: `quiz.js`, `tests/quiz.test.js`

**Interfaces:**
- Consumes: Task 2; существующий `scoreQuiz`.
- Produces:
  - `rankTypes(scores, priorityAnswer):string[]` — вынести из `scoreQuiz` сортировку (сумма ↓, баллы ответа на вопрос 3 ↓, `TIE_ORDER`); `scoreQuiz` пользуется ею, его поведение не меняется.
  - `isOffroad(A):boolean` — `A.q1 === 2 || A.q4 === 3 || A.q4 === 4`.
  - `COMFORT_ORDER = ['city','hybrid','gravel','mtb','road']`.
  - `buildResult(A, C)` → `{complete:false, firstMissing}` (индекс шага из `firstMissingStep`) или
    `{complete:true, scores, motor, variants:[Variant], reasons:[string], notes:[string], rehab:boolean, health:{upright, barUp, crankMax:number|null, stepThrough:boolean}}`,
    `Variant = {kind:'balance'|'comfort'|'simple', type, motor, gear:[id], fit:{upright, barUp, crankMax:number|null, stepThrough}, warn:[string]}`.
  - Алгоритм — спецификация раздел 4 и 3: ответы берутся из `pruneAnswers(A)`; базовая часть — `scoreQuiz([A.q1…A.q6], C.quiz, C.ebikeHint)`; `gear` всегда отсортирован по `gearOrder` без повторов; `shortCranks` и `stepThrough` добавляются в `gear` из суммы `fit`; `offroadGear` ответа `cushion` добавляется при `isOffroad`; поправки комфорта: `upright +3`, `barUp +20` с ограничениями.

- [ ] **Step 1: Тесты** (реальный `CONTENT`, хелпер `A(base, extra)` с базой `q1..q6`):
  - `no injuries: balance and comfort` — `gate:['none']` → варианты `['balance','comfort']`, у `balance.gear` пусто, у `comfort.gear` ⊇ `suspFork, suspPost, wideTyres, riseBar`;
  - `health points and warnings` — база, где побеждает `road` (`q1=3,q2=3,q3=1,q4=0,q5=2,q6=2`), + `back1:[1]` (шейная грыжа) → `scores.road` на 3 меньше, чем без здоровья; `balance.type === 'road'` (здоровье ничего не запрещает); `balance.warn` содержит текст `warn` шейной грыжи; `comfort.type === 'city'` или `'hybrid'`;
  - `health points change the winner` — база `q1..q6 = [0,1,1,2,1,2]`: без здоровья `scoreQuiz` даёт `gravel` (hybrid 8, gravel 8, ничья по вопросу 3); с `gate:['knees'], knee1:[1], knee2:2, cushion:3` (замена сустава: city +2, hybrid +1, road −2, mtb −2) → `balance.type === 'hybrid'`, `scores.hybrid === 9`, `scores.gravel === 8`;
  - `caps` — `back1:[0,1,2,3,4,5]`, `back2:0`, `upper1:[0,1]` → `health.upright === 12`, `health.barUp === 60`;
  - `crank and step-through` — `knee1:[1,4]` → `health.crankMax === 155`, `stepThrough === true`, `balance.gear` содержит `stepThrough`, `shortCranks`, `lowGears`;
  - `simple variant drops suspension` — `upper1:[2]` → вариант `simple` есть, без `suspFork`, с `wideTyres`; `gate:['none']` → варианта `simple` нет;
  - `offroad comfort is full suspension` — `q1=2`, `gate:['back'], back1:[0], back2:1, cushion:0` → `comfort.type === 'mtb'`, `comfort.gear` содержит `fullSusp`; `balance.gear` содержит `fullSusp`;
  - `comfort follows comfort order and 50% rule` — синтетические баллы через `C`, где `city` < 50 % победителя → комфорт берёт следующий подходящий;
  - `rehab` — `knee1:[1]` → `rehab:true`; `gate:['none']` → `false`;
  - `reasons: health first, max 4` — `back1:[0,1]`, `knee1:[1]` → первые 2 причины из здоровья, длина ≤ 4;
  - `answers of unchecked block are ignored` (Review Focus 2) — `gate:['knees'], back1:[1], knee1:[3], …` → `scores` и `health` как без `back1`;
  - `incomplete` — `{q1..q6}` → `{complete:false, firstMissing:6}`.
- [ ] **Step 2:** `node --test` → новые FAIL, старые `scoreQuiz` PASS.
- [ ] **Step 3:** Реализовать `rankTypes`, `isOffroad`, `buildResult`.
- [ ] **Step 4:** `node --test` → PASS.
- [ ] **Step 5: Commit** `feat(quiz): buildResult with health effects and balance/comfort/simple variants`

---

### Task 4: Сохранение `state.js`

**Files:**
- Modify: `state.js`, `tests/state.test.js`

**Interfaces:**
- Produces: `loadSaved(raw, defaults, styles, colors)` дополнительно возвращает `quiz: {v:2, a:Answers}|null`, `health: {upright, barUp, crankMax:number|null, stepThrough, gear:[string]}|null`, `healthOn: boolean`.
- Правила: `quiz` — массив из 6 (`null` или целые 0..4) → `{v:2, a:{q1…q6}}` без `null`-полей; объект `{v:2, a}` — каждое поле `a` проверяется: `q1…q6, back2, knee2, cushion` — целые 0..9; `back1, knee1, upper1` — массивы различных целых 0..9 длиной 1..6; `gate` — массив различных строк из `['back','knees','upper','none']`; неверные поля отбрасываются, лишние ключи отбрасываются. `health`: числа `upright` 0..12, `barUp` 0..60, `crankMax` `null` или 145..175, `stepThrough` boolean, `gear` массив строк длиной ≤ 12; иначе `null`. `healthOn` по умолчанию `true`.

- [ ] **Step 1: Тесты:**
  - `migrates old quiz array` (Review Focus 1) — `quiz:[0,1,null,2,3,4]` → `{v:2, a:{q1:0,q2:1,q4:2,q5:3,q6:4}}`;
  - `v2 quiz loads and filters` — валидные поля остаются; `back1:[1,1]`, `gate:['x']`, `q1:12`, `extra:1` отбрасываются;
  - `health loads and filters` — валидный объект как есть; `upright:20` → `health:null`; `crankMax:null` допустим;
  - `healthOn default true` и `healthOn:false` читается;
  - существующие тесты: `new fields load` и `bad quiz ignored` — переписать ожидания под новый формат (`quiz:[0,1,null,2,3,4]` → объект v2; `[0,0,0,0,0,7]` → `null`).
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Реализовать; `DEFAULTS` в `index.html` дополнить `health:null, healthOn:true` (только строка `DEFAULTS`, остальное — Task 7).
- [ ] **Step 4:** `node --test` → PASS.
- [ ] **Step 5: Commit** `feat(state): quiz v2 with migration, health and healthOn`

---

### Task 5: Поправки посадки в модели

**Files:**
- Modify: `model.js`, `tests/model.test.js`

**Interfaces:**
- Consumes: формат `health` (Task 4).
- Produces: `fit(p)` читает необязательные `p.health = {upright, barUp, crankMax, stepThrough, gear}`:
  - угол спины: и при выборе размера, и при настройке кокпита `alpha + upright` (вместо `st.alpha` и `alpha`);
  - цель кистей: `heightAdj + barUp`;
  - шатуны: `Math.min(c0, st.crankMax, crankMax ?? Infinity)`;
  - в `g`: `susp: st.susp || gear.includes('suspFork')`, `suspPost: gear.includes('suspPost')`, `tyre: gear.includes('wideTyres') ? Math.max(st.tyre, 46) : st.tyre`, `stepThrough: !!stepThrough`;
  - результат `fit` дополнительно: `upright` (применённые градусы, 0 без поправок), `crankCut: boolean` (шатуны укорочены поправкой).

- [ ] **Step 1: Тесты:**
  - `fit without health equals baseline` (Review Focus 4) — для пресетов и `road/gravel/city` `fit({...p, health:null})` даёт те же значения, что таблица `EXPECT` в начале `tests/model.test.js`;
  - `upright raises the back` — `city` 178 см: `alpha` с `upright:6` больше, чем без, на 4..8°;
  - `barUp raises the bar` — `hybrid`: высота руля (`F.g` → `cockpit(F.g).G.y`) с `barUp:30` выше на ≥ 15 мм;
  - `crankMax limits cranks` — 195 см, `road`, `crankMax:155` → `g.crank === 155`, `crankCut === true`; без → 175, `crankCut === false`;
  - `gear flags reach geometry` — `hybrid` с `gear:['suspFork','suspPost','wideTyres']`, `stepThrough:true` → `g.susp, g.suspPost, g.stepThrough === true`, `g.tyre === 46`.
- [ ] **Step 2:** `node --test` → FAIL (эталоны PASS).
- [ ] **Step 3:** Реализовать в `model.js`.
- [ ] **Step 4:** `node --test` → PASS.
- [ ] **Step 5: Commit** `feat(model): health adjustments for back angle, bar height, cranks and gear`

---

### Task 6: Оснастка на схеме

**Files:**
- Modify: `draw.js`, `tests/draw.test.js`

**Interfaces:**
- Consumes: `g.suspPost`, `g.stepThrough`, `g.susp` (Task 5).
- Produces: в `bikeMarkup`: `g.suspPost` → в группе `saddle` элемент с `data-k="suspPost"` (утолщение штыря 40 мм длиной у верха подседельной трубы, `stroke-width 34`); `g.stepThrough` → верхняя труба идёт от `HtJ` к точке на подседельной трубе на 35 % её длины от каретки, элемент с `data-k="stepThrough"` в группе `frame`; `g.susp` на любом виде рисует амортвилку (уже так — проверить тестом).

- [ ] **Step 1: Тесты:** `suspension fork on a hybrid` (`data-k="susp"` в разметке гибрида с `gear:['suspFork']`); `suspension seatpost`; `step-through frame`; без оснастки — ни одной из меток.
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Реализовать.
- [ ] **Step 4:** `node --test` → PASS; превью `node %TEMP%/fitstand-build/preview.js` с гибридом в полной оснастке — визуально штырь и низкая труба различимы.
- [ ] **Step 5: Commit** `feat(draw): suspension seatpost, step-through frame, suspension fork on any type`

---

### Task 7: Фитстенд: поправки, строка «Учтено здоровье», API

**Files:**
- Modify: `index.html`, `sw.js`, `tests/sw.test.js`, `tests/highlight.test.js`

**Interfaces:**
- Consumes: Tasks 4–6.
- Produces `window.fitstand`:
  - `applyStyle(style, motor, health?)` — `health` (`{upright, barUp, crankMax, stepThrough, gear}` или `null`) пишется в `state.health`, `state.healthOn = true`;
  - `drawBike(svg, {style, motor, highlight, health})` — схема с поправками и оснасткой `health`;
  - `fitSummary({style, health}) → {size, stack, reach, crank, bar, tyre, stepThrough}` (мм; `bar = stack + sp`);
  - `getQuiz()/setQuiz(q)` — теперь объект `{v:2, a}` или `null`;
  - `eraseAnswers()` — `quiz = null`, `health = null`, сохранить, пересчитать.
- Фитстенд передаёт в `fit` `health: state.healthOn ? state.health : null`; `FLAGS` в `tick` += `suspPost`, `stepThrough`.
- Во вкладке «Посадка» под выбором вида: `<div id="healthRow">` — «Учтено здоровье: спина +6°, руль +30 мм, шатуны до 155 мм, рама с низкой трубой» (только ненулевые части) и `<label class="switch"><input type="checkbox" id="tHealth" checked> Учитывать</label>`; скрыт, если `state.health` пуст.
- Метрики: норма угла спины `torsoNorm + F.upright`; у «Длина шатунов» подсказка «укорочены по ответам о коленях», если `F.crankCut`.
- `sw.js`: `VERSION = 'fitstand-v4'`; тест версии — `v4`.

- [ ] **Step 1: Тесты:** `cache version is v4`; в `highlight.test.js` — `health row and toggle exist` (`id="healthRow"` и `id="tHealth"` в разметке).
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Реализовать.
- [ ] **Step 4:** `node --test` → PASS. В браузере (`cdp.mjs`): `fitstand.applyStyle('hybrid', false, {upright:6, barUp:30, crankMax:155, stepThrough:true, gear:['suspFork','suspPost','wideTyres']})` → строка «Учтено здоровье…» видна, схема с амортвилкой и низкой трубой, шатуны 155 с подсказкой; снять `tHealth` → метрики и размер как при `applyStyle('hybrid', false, null)` (Review Focus 4); перезагрузка сохраняет поправки и переключатель.
- [ ] **Step 5: Commit** `feat(fitstand): health adjustments row, toggle and API`

---

### Task 8: Экраны опроса и результата, меню, выгрузка

**Files:**
- Modify: `guide.js`, `index.html` (стили), `tools/content-review.mjs`, `tests/guide.test.js`

**Interfaces:**
- Consumes: Tasks 1–3, 7.
- Produces:
  - `parseRoute`: `#quiz/N` — `N` целое 1..`MAX_STEPS`, иначе 1.
  - `quizTarget(A, C)` — `'#quiz/' + (firstMissingStep + 1)` или `'#result'`.
  - Шаг-вопрос с одним ответом — как сейчас (защита от двойного касания сохраняется); с несколькими — кнопки-переключатели `aria-pressed`, у `gate` выбор `none` снимает остальные и наоборот; кнопка «Дальше» (`data-action="next"`, `disabled`, пока ничего не выбрано). После ответа на `gate` — `pruneAnswers`. Экран-объяснение — `block.title`, строки `explain` выбранных ответов блока (не больше 3), кнопка «Дальше». Счётчик «Вопрос N из M» по шагам-вопросам. На шаге `gate` под ответами — первое предложение `disclaimer` и `privacy`.
  - Результат по спецификации 5.1: плашка `rehabText`; карточки вариантов (`variantNames`, схема через `drawBike` с `health = {...v.fit, gear: v.gear}`, метки оснастки по `gear`, `warn` жёлтым, «Подобрать размер» → `applyStyle(v.type, v.motor, {...v.fit, gear:v.gear})`); «Почему», «Что учесть», плюсы/минусы и программа «Баланса»; `<details>` «Цифры геометрии» — строки `geometryRows` со значениями `fitSummary` для «Баланса» и `geometryWarning`; дисклеймер; «Пройти заново», «Все виды». Блок «Ещё подойдёт» удалить.
  - Меню: пункт «Подобрать велосипед» показывает «Ваш результат — …» по `buildResult`; пункт `erase` — `confirm('Стереть ответы опроса и поправки посадки?')` → `eraseAnswers()` → перерисовать меню.
  - `content-review.mjs`: раздел «Здоровье» — каждый вопрос, ответ и эффекты словами: «шоссе −3, гибрид +2; спина вертикальнее на 6°; руль выше на 30 мм; шатуны до 155 мм; рама с низкой трубой; оснастка: …; предупреждение для шоссе: «…»; совет врача».

- [ ] **Step 1: Тесты** в `tests/guide.test.js`: `parseRoute` — `'#quiz/16'` → `n:16`, `'#quiz/17'` → `n:1` (заменить старое ожидание для `#quiz/9`); `quizTarget` — `null` → `#quiz/1`, `{q1..q6}` → `#quiz/7`, полный без травм → `#result`.
- [ ] **Step 2:** `node --test` → FAIL.
- [ ] **Step 3:** Реализовать экраны, меню, выгрузку; стили карточек вариантов, меток оснастки, предупреждений, плашки врача, таблицы геометрии — в `index.html` рядом со стилями `.pg`.
- [ ] **Step 4:** `node --test` → PASS; `node tools/content-review.mjs` → в файле раздел «Здоровье» с 6 вопросами.
- [ ] **Step 5: Проверка в браузере** (телефон 390×844 и десктоп, светлая и тёмная): ход без травм → 7 вопросов, результат с «Баланс» и «Максимальный комфорт»; ход `back` (поясница) + `knees` (замена сустава) → экраны-объяснения, счётчик «из 12», плашка врача, предупреждения, «Подобрать размер» на «Максимальном комфорте» → фитстенд со строкой «Учтено здоровье»; системное «Назад» по шагам; снятие блока на `gate`; старое сохранение-массив → продолжение с шага 7; «Стереть мои ответы» → `#quiz/1`, строки «Учтено здоровье» нет, рост прежний (Review Focus 5).
- [ ] **Step 6: Commit** `feat(guide): health steps, explain screens, result variants, geometry, erase answers`
