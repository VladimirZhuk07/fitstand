# Новые виды велосипедов и детская линейка — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 19 видов в каталоге по трём группам, развилка MTB хардтейл/двухподвес в опросе и подборе размера, схемы новых видов.

**Architecture:** Новые виды — данные в `content.js` и наборы параметров в `model.js`; схемы строит та же модель по параметрам вида; `draw.js` получает 8 новых меток; `quiz.js` заменяет `mtb` на `fullsus` по правилу; `guide.js` показывает каталог по группам.

**Tech Stack:** ванильный JS, `node --test`, headless Edge (`%TEMP%/fitstand-build/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-04-bike-types-design.md`

## Global Constraints

- Без брендов; тексты в `content.js`.
- Существующие эталоны модели (`EXPECT`) и все текущие тесты остаются зелёными.
- В выбор вида фитстенда попадают только `road, gravel, city, hybrid, mtb, fullsus, folding` (`FIT_STYLES`); сохранение принимает только их.
- Кэш `fitstand-v5`.
- Ветка `feature/types` от `main`; коммит после каждой задачи; после каждой задачи — быстрая проверка в браузере (страница без ошибок JS); в `main` — после общего ревью вместе с подпроектом B.

## Review Focus

1. **Сохранённый вид `mtb`** у старого пользователя: открывается «MTB» (хардтейл) как раньше. Тест: `old saved mtb style still loads` (Task 5).
2. **Детский вид в фитстенде:** через сохранение или `applyStyle('balance')` не должен попасть в фитстенд. Тест: `catalog-only styles are rejected` (Task 5).
3. **Схема детского вида на устройстве взрослого:** манекен детского роста, а не текущий рост. Проверка в браузере (Task 5).
4. **Двухподвес как «Баланс»:** «Проще и дешевле» — хардтейл, без двойной надписи про двухподвес. Тест `fullsus simple is hardtail` (Task 4).

---

### Task 1: Новые виды в модели

**Files:** Modify `model.js`, `tests/model.test.js`

**Interfaces — Produces:**
- `WHEEL_R` += `'12':101.5, '14':127, '16':152.5, '24':253.5`.
- `FIT_STYLES = ['road','gravel','city','hybrid','mtb','fullsus','folding']`.
- `STYLES.fullsus = {...STYLES.mtb, name:'Двухподвес', rearShock:true}`; `sizesFor('fullsus')` = размеры `mtb`.
- Каталожные виды (`oneSize:true` у всех, кроме `cx/track/trike/cargo`, которые берут размеры родителя): `cx` = gravel c `tyre:33, drop:60, name:'Циклокросс'`; `track` = road c `brake:'none', name:'Трековый'`; `trike` = city c `trike:true, name:'Трицикл'`; `cargo` = city c `cargoBox:true, name:'Грузовой'`; `bmx`, `special`, `kidTrike`, `balance`, `kidTraining`, `kid`, `teen` — свои `STYLES` с одним размером (колёса: bmx `20`, special `20`, kidTrike `12`, balance `12`, kidTraining `16`, kid `20`, teen `24`), `crankMax` (kidTrike 80, balance 80, kidTraining 95, kid 114, teen 152, bmx 175, special 125), флаги `noPedals` (balance), `trainingWheels` (kidTraining), `trike`+`frontPedals` (kidTrike), `unicycle` (special) и `rider: {H,I,A,W}`: kidTrike/balance `{H:95,I:40,A:30,W:24}`, kidTraining `{H:110,I:47,A:35,W:27}`, kid `{H:125,I:55,A:41,W:30}`, teen `{H:145,I:66,A:49,W:34}`, bmx/special `{H:170,I:79,A:58,W:40}`.
- В `g` копируются флаги: `rearShock, trike, cargoBox, noPedals, trainingWheels, frontPedals, unicycle`; `brake:'none'` у трека.

- [ ] **Step 1: Тесты:** `fullsus uses mtb sizes` (размеры для пресетов совпадают с `mtb`, `g.rearShock === true`); `catalog styles give finite geometry` — для каждого из 11 новых каталожных видов `fit({...rider ?? PRESETS[1], flex:3, style})` даёт конечные `saddleH`, `knee`, `alpha`, `g.wheelR`; для детских `g.crank <= crankMax`; `FIT_STYLES` ровно 7; эталоны `EXPECT` не меняются.
- [ ] **Step 2:** `node --test` → FAIL. **Step 3:** Реализовать; числа размеров подбирать так, чтобы ошибка дотягивания `best.err` < 60 мм у всех. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(model): full-suspension MTB and catalog styles incl. kids`.

### Task 2: Новые метки схемы

**Files:** Modify `draw.js`, `tests/draw.test.js`

**Interfaces — Produces:** в статичной разметке метки из спецификации 5: `rearShock`, `noBrakes`, `trike`, `cargoBox`, `noPedals`, `trainingWheels`, `frontPedals`, `unicycle`. `noPedals` и `frontPedals` убирают цепь и звезду у каретки; `unicycle` рисует отдельную разметку (колесо, штырь от оси к седлу, шатуны на оси) и `boundsOf` для него считает рамку по колесу и седлу.

- [ ] **Step 1: Тест** `each new style draws its own mark`: таблица `{fullsus:'rearShock', track:'noBrakes', trike:'trike', cargo:'cargoBox', balance:'noPedals', kidTraining:'trainingWheels', kidTrike:'frontPedals', special:'unicycle'}` — разметка вида содержит свою метку и ни одной из остальных 7 (кроме `kidTrike`, у которого есть и `trike`); у `track` нет `data-k="rim"`/`"disc"`; линии цепи получают метку `data-k="chain"`: она есть у `road`, её нет у `balance` и `kidTrike`; `boundsOf` для `special` — конечные числа, ширина < 1500 мм.
- [ ] **Step 2:** FAIL. **Step 3:** Реализовать. **Step 4:** PASS + превью `preview.js` со всеми 19 видами — визуально различимы.
- [ ] **Step 5:** Commit `feat(draw): rear shock, track, trike, cargo box, balance, training wheels, kids trike, unicycle`.

### Task 3: Тексты 12 новых видов

**Files:** Modify `content.js`, `tests/content.test.js`

**Interfaces — Produces:** `CONTENT.types` — 19 видов с полями спецификации 2.1; `CONTENT.typeGroups = [{id:'adult', title:'Взрослые', ids:[…]}, {id:'kids', title:'Детские', ids:[…]}, {id:'special', title:'Трюковые и специальные', ids:[…]}]` (порядок из спецификации 2); `CONTENT.typeOrder` — все 19 в порядке групп; `CONTENT.kidsWheels = [{from:85,to:100,wheel:'12'}, …]` (спецификация 2.2); `types[id].wheels` у детских — список колёс для подсветки (`['12']`, `['12']`, `['12','14','16']`, `['16','20']`, `['24']`). `mtb.name = 'MTB хардтейл'`.

- [ ] **Step 1: Тесты:** `types complete` — обновить: 19 видов, `pros/cons` 3–5, `program` 3 шага; `groups cover every type once`; `new fields per spec` — `group` у всех, `terrain` у `mtb, fullsus, cx, bmx`, `compare` у `cx`, `age` и `wheels` у детских, `teach` (3–4) у `balance, kidTraining, kid`, `fear` (3–4) у `kidTraining`, `variants` (≥2) у `teen, kid, special`, `note` у `trike` упоминает электрический, `fitAs` по таблице спецификации; `kidsWheels` — 5 строк по спецификации; `no brands` уже есть.
- [ ] **Step 2:** FAIL. **Step 3:** Написать тексты (тон — как продавец объясняет; для детских — родителю). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(content): 12 new bike types, kids line, groups, kids wheel table`.

### Task 4: Развилка MTB в опросе

**Files:** Modify `quiz.js`, `tests/quiz.test.js`

**Interfaces — Produces:** `wantsFullSus(A):boolean` — `A.q4 === 4 || A.cushion === 0 || (gateBlocks(A).includes('back') && isOffroad(A))`; в `buildResult` вид `mtb` у «Баланса» → `fullsus` при `wantsFullSus`; «Максимальный комфорт» при бездорожье — `fullsus`; у вариантов вида `fullsus` из `gear` убирается `fullSusp`; «Проще и дешевле» при «Балансе» `fullsus` — вид `mtb`, без `suspPost`. `scores` не меняются (`fullsus` в них нет).

- [ ] **Step 1: Тесты:** `jumps give full suspension` (`q4=4`, MTB-победитель → `balance.type === 'fullsus'`); `hardtail otherwise` (MTB-победитель без условий → `mtb`); `back plus offroad gives full suspension`; `offroad comfort is fullsus without fullSusp label` (обновить старый тест `offroad comfort is full suspension`); `fullsus simple is hardtail` (Review Focus 4).
- [ ] **Step 2:** FAIL. **Step 3:** Реализовать. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(quiz): MTB splits into hardtail and full suspension`.

### Task 5: Фитстенд, каталог, экраны вида

**Files:** Modify `index.html`, `guide.js`, `sw.js`, `tools/content-review.mjs`, `tests/state.test.js`, `tests/highlight.test.js`, `tests/sw.test.js`

**Interfaces:**
- Consumes: Tasks 1–4.
- Produces: кнопка `data-style="fullsus"` «Двухподвес» в `#seg`; `index.html` передаёт в `loadSaved` объект только из `FIT_STYLES` (сам `state.js` не меняется); `applyStyle` игнорирует виды не из `FIT_STYLES`; `drawBike(svg, {style, …})` для вида с `rider` строит схему по манекену; каталог — три раздела (`typeGroups`), у детских в карточке возраст; экран вида — новые поля и таблица `kidsWheels` с подсветкой `wheels`; «Подобрать размер» только при `fitAs` (с мотором для `ebike`); выгрузка — новые поля; `sw.js` → `fitstand-v5`.

- [ ] **Step 1: Тесты:** `old saved mtb style still loads` и `catalog-only styles are rejected` (`style:'balance'` → `road`) в `tests/state.test.js` с `FIT_STYLES`; `fullsus button exists` в `highlight.test.js`; `cache version is v5`.
- [ ] **Step 2:** FAIL. **Step 3:** Реализовать. **Step 4:** PASS.
- [ ] **Step 5: Браузер:** каталог — 3 раздела, 19 карточек со схемами, нет ошибок JS; экран `#types/kidTraining` — «Как учить», «Если ребёнок боится», таблица с подсвеченными 12–16″, кнопки «Подобрать размер» нет; `#types/cx` — «Чем отличается от шоссейного», «Подобрать размер» → фитстенд «Грэвел»; опрос с «прыгаю» → «MTB двухподвес», «Подобрать размер» → фитстенд «Двухподвес»; схема `balance` одинакова при росте 160 и 195 в фитстенде (Review Focus 3).
- [ ] **Step 6:** Commit `feat(guide): grouped catalog, new type pages, kids wheel table, full-suspension in fitstand`.
