# Движение и сцены езды, релиз A — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** живее движение велосипедиста на главной и своя сцена езды для шоссе, города и MTB (двухподвес берёт сцену MTB); остальные виды остаются на нынешней сцене до релиза B.

**Architecture:** таблица `SCENES` и функция `sceneOf(style)` в `ride.js`; скорость, тряска и слои фона берутся из сцены (последний аргумент `sceneId` у `ridePose`, `speedOf`, `wheelRevs`, `layerShift`, `rideBgMarkup`; по умолчанию `'default'` — всё как сейчас). Цвет сцены — через `data-scene` на `#bike` и «подкраску» (`--tint`, `--tk`), которая смешивается с цветами темы, поэтому работает и в светлой, и в тёмной теме. Слои рисуют функции-строители по виду сцены.

**Tech Stack:** ванильный JS, `node --test` (без пути на Windows), SVG, CSS `color-mix`, headless Chrome для визуальной проверки.

**Spec:** `docs/superpowers/specs/2026-11-12-ride-scenes-design.md`

## Global Constraints

- Тексты и подписи на русском; никаких марок, названия магазина и имени продавца в отслеживаемых файлах.
- Каденс не меняется: `RIDE.CRANK_REVS = 12` за `RIDE.PERIOD = 9` с; у любой сцены целое число оборотов колеса за цикл и дорога строго в такт колесу (`speed('road') == speedOf(wheelR, sceneId)`).
- Скорости фона (км/ч, из отзыва): шоссе 30–35, город 15–18, MTB 20–28.
- Три слоя параллакса + дорога; размытие ближнего слоя сильнее дальнего; цикл 9 с без стыка.
- Только 10 видов `FIT_STYLES`; виды без своей сцены → `'default'`; детские и электро не трогаем.
- После изменения файлов: `VERSION` в `sw.js` → `fitstand-v17` и `tests/sw.test.js`; `node --test` зелёный.
- Пуш/мерж в main — только после слова «да» от пользователя. Ветка: `feedback5-ride`.

## Review Focus

- Смена вида посреди езды (шоссе → город → гибрид) в любой момент `rideT`: фон пересобирается без NaN, колесо и дорога остаются в такт. Тест в задаче 1.
- Сохранённый или неизвестный вид (`undefined`, `'women'`, `'track'`): `sceneOf` возвращает `'default'`, исключений нет. Тест в задаче 1.
- Маленькие колёса (складной, 20″) на любой сцене: `wheelRevs >= 1` и тайлы слоёв 2500–4500 мм. Тест в задаче 2.
- Пауза и `prefers-reduced-motion` (`state.playing=false`): без размытия, без частиц; сцена статична. Тест в задаче 5 (разметка).
- Тёмная тема: подкраска не делает дорогу и небо нечитаемыми. Визуальная проверка в задаче 7.

---

### Task 1: Таблица сцен и скорость/тряска по сцене (`ride.js`)

**Files:**
- Modify: `ride.js` (константы `RIDE`, `wheelRevs`, `speedOf`, `ridePose`, `layerShift`, экспорт)
- Modify: `index.html` (вызовы `ridePose`, `layerShift`, `rideBgMarkup` — передать `sceneId`)
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: `SCENES: { default, road, city, mtb }`, где у каждой записи `{ kmh: number, bounce: Array<[amp:number, periods:number, phase:number]>, effect: 'none'|'dust'|'mud', layers: { far: string, mid: string, near: string, road: string } }`; `sceneOf(style: string|undefined): 'default'|'road'|'city'|'mtb'` (`road`→road, `city`→city, `mtb`/`fullsus`→mtb, иначе default); `wheelRevs(wheelR: number, sceneId?: string): number`, `speedOf(wheelR: number, sceneId?: string): number` (мм/с), `ridePose(t: number, wheelR: number, sceneId?: string)`, `layerShift(id: string, t: number, wheelR: number, sceneId?: string)`. Значения по умолчанию = поведение до задачи.
- Значения таблицы: `default.kmh = 21.6` (=`RIDE.SPEED`), `road.kmh = 32.5`, `city.kmh = 16.5`, `mtb.kmh = 24`; `bounce` у default `[[1.5,13,0],[1.5,29,0.7]]`, у road `[[0.6,13,0],[0.6,29,0.7]]`, у city `[[1.2,13,0],[1.2,29,0.7]]`, у mtb `[[3.5,7,0],[2.5,17,0.7],[2,31,1.9]]`; `effect`: default/road/city `'none'`, mtb `'dust'`; `layers` задача 3–5 заполняют именами строителей (`'hills'|'open'|'roofs'|'forest'` и т.д.), в этой задаче — строки-заглушки `'default'`.

- [ ] **Step 1: Failing tests** в `tests/ride.test.js`: (a) `sceneOf` для `road, city, mtb, fullsus, women, track, undefined, '__proto__'` → `road, city, mtb, mtb, default, default, default, default`; (b) `scene speeds are in the seller's ranges`: `speedOf(311, id) * 3.6 / 1000` для `road` в 30–35, `city` в 15–18, `mtb` в 20–28 (допуск округления оборотов ±1 %), `default` как раньше 20–24; (c) для каждой сцены и `WHEELS` (+ `203`, `152.5`) работают все существующие инварианты: целые обороты колеса и кривошипа за цикл, дорога совпадает с колесом, зацикленность, слои (`n` целое); (d) `bounce` каждой сцены в пределах `sum(amp) + 0.01`; у mtb максимум > у road; (e) смена сцены между кадрами не даёт `NaN` в `ridePose/layerShift` для `t` из `frames()` при всех парах сцен. Существующие вызовы без `sceneId` остаются зелёными (default).
- [ ] **Step 2:** `node --test` — новые тесты падают.
- [ ] **Step 3:** реализовать по Interfaces: `ridePose.bounce` = сумма `amp * sin(2π·periods·tau + phase)` по сцене; `speedOf(wheelR, id) = wheelRevs(wheelR, id)·2πR/PERIOD`, где `wheelRevs` округляет `SCENES[id].kmh/3.6·1000·PERIOD/(2πR)` (минимум 1). `layerShift` использует `speedOf(wheelR, sceneId)`. Неизвестный `sceneId` ведёт себя как `'default'`.
- [ ] **Step 4:** в `index.html` вычислять `const sceneId = sceneOf(state.style)` там, где зовутся `ridePose(rideT,target.wheelR)`, `layerShift(id,rideT,target.wheelR)` и `rideBgMarkup(...)`, и передавать его последним аргументом; тест `the scene speed follows the target wheel` обновить под новые вызовы (`ridePose\(rideT,target\.wheelR,sceneId\)`).
- [ ] **Step 5:** `node --test` зелёный; открыть главную, переключить виды — анимация идёт, дорога не «скользит» относительно колеса.
- [ ] **Step 6:** commit `feat(ride): scene table, scene speed and roughness`

### Task 2: Движение — корпус, тень, блик, размытие по глубине

**Files:**
- Modify: `ride.js` (`ridePose`: торс), `draw.js` (тень с `id`, блик на ободе), `index.html` (`updateDynamic`, CSS, защита от тормозов)
- Test: `tests/ride.test.js`, `tests/draw.test.js`

**Interfaces:**
- Consumes: `ridePose` из задачи 1.
- Produces: `ridePose(...).torso` с амплитудой 2 (градусы, `2·sin(2π·2·CRANK_REVS·tau)`); `slowFrames(dts: number[]): boolean` в `ride.js` — `true`, если среднее из последних 60 интервалов > 0.028 с (экспортируется); в разметке живого велосипеда: у тени `id="shadow"`; на каждом колесе `<path class="rim-glint">` (не внутри вращающейся группы колеса); классы `.rb-midlayer`/`.rb-nearlayer` получают CSS-размытие, а у `#bike.no-blur` — нет.

- [ ] **Step 1: Failing tests:** `ridePose torso reaches 2°`: максимум `|torso|` на кадрах в [1.9, 2.0]; `slowFrames`: 60 интервалов по 0.016 → `false`, по 0.04 → `true`, меньше 60 значений → `false`; в `tests/draw.test.js`: живая разметка содержит ровно одну `id="shadow"`, и по одному `rim-glint` на колесо (два), блик не находится внутри `<g id="wR">`/`<g id="wF">`. В `tests/ride.test.js` обновить тест `the head holds steady`: плечо сдвигается не более 25 мм (сейчас < 4), голова по-прежнему не более 0.5 мм по `x` и `breath` по `y`.
- [ ] **Step 2:** запустить — падают.
- [ ] **Step 3:** `ridePose`: торс 2; `draw.js`: `id="shadow"` у живой тени и `rim-glint` — короткая дуга (`stroke: var(--hi)`) на верхней левой части обода каждого колеса; `index.html` `updateDynamic`: масштаб тени `scale(1+0.012·bounce, 1-0.04·bounce)` вокруг её центра; CSS: `.rb-midlayer{filter:blur(6px)} .rb-nearlayer{filter:blur(14px)} #bike.no-blur .rb-midlayer,#bike.no-blur .rb-nearlayer{filter:none} .rim-glint{fill:none;stroke:var(--hi);stroke-width:8;stroke-linecap:round}`; в `tick` собирать последние 60 `dt` и при `slowFrames` добавить `no-blur` на `#bike` (один раз за сеанс); при `!state.playing` слои без блюра (класс `no-blur`).
- [ ] **Step 4:** `node --test` зелёный; headless-скриншот светлой темы: корпус не выглядит «седло слишком высоко», тень и блик на месте.
- [ ] **Step 5:** commit `feat(ride): torso sway, shadow and rim glint, depth blur with a slow-device guard`

### Task 3: Сцена «Шоссе»

**Files:**
- Modify: `ride.js` (строители слоёв, `rideBgMarkup`, `SCENES.road.layers`), `index.html` (`data-scene`, CSS подкраски и новых классов)
- Test: `tests/ride.test.js`

**Interfaces:**
- Consumes: `SCENES`, `sceneOf` из задачи 1.
- Produces: функции-строители слоёв (внутренние) `(tile: number, h: number, seed: number) => string`; `rideBgMarkup(b, groundY, wheelR, sceneId)` выбирает строители по `SCENES[sceneId].layers`; `#bike` получает `data-scene="<sceneId>"`, а `#rideBg` — `data-scene` для тестов; CSS-подкраска: `#bike[data-scene="road"]{--tint:#9FC4E8;--tk:18%}`, а классы `.rb-hill,.rb-hill2,.rb-tree,.rb-road,.rb-verge` и градиент неба читают `color-mix(in srgb, var(--X), var(--tint) var(--tk,0%))`.
- Значения шоссе: `layers = { far: 'open', mid: 'barriers', near: 'markings', road: 'smooth' }`; `open` — низкие длинные холмы и линия деревьев; `barriers` — отбойник, столбы и редкие указатели; `markings` — разметка и край асфальта, ближний слой; `smooth` — ровный асфальт с пунктирной осевой. Новые классы: `rb-barrier, rb-sign, rb-marking`.

- [ ] **Step 1: Failing tests:** для сцены `road` `rideBgMarkup(view, 0, 311, 'road')` содержит классы `rb-barrier` и `rb-marking`, не содержит `rb-house`; для `'default'` — прежнюю разметку (как до задачи: `rb-tree`, `rb-grass`); содержимое каждого тайла не выходит за его границы (расширить тест `pattern content stays inside its tile` на все сцены); `#rideBg` несёт `data-scene="road"`; тайлы слоёв в диапазоне 2500–4500 для всех колёс.
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители шоссе и подкраску; `rideBgMarkup` принимает `sceneId` (по умолчанию `'default'`); в `index.html` в `rebuild()` ставить `bikeSvg.dataset.scene = sceneId`.
- [ ] **Step 4:** `node --test` зелёный; headless-скриншоты (светлая и тёмная тема, 1200×700) выбора «Шоссе»: ровный горизонт, отбойники, сильнее размытый передний план.
- [ ] **Step 5:** commit `feat(ride): road scene`

### Task 4: Сцена «Город»

**Files:**
- Modify: `ride.js`, `index.html` (CSS)
- Test: `tests/ride.test.js`

**Interfaces:**
- Consumes: механизм слоёв из задачи 3.
- Produces: `SCENES.city.layers = { far: 'roofs', mid: 'street', near: 'curb', road: 'tiles' }`; `roofs` — низкие дома и кроны вдали; `street` — витрины, фонари, скамейки и редкие прохожие силуэтами; `curb` — бордюр, клумбы, тень от фонарей; `tiles` — асфальт, участки плитки. Новые классы: `rb-house, rb-lamp, rb-bench, rb-flower, rb-tile`. Подкраска `#bike[data-scene="city"]{--tint:#F2B27A;--tk:20%}`.

- [ ] **Step 1: Failing tests:** `rideBgMarkup(view, 0, 311, 'city')` содержит `rb-house`, `rb-lamp`, `rb-bench`, `rb-tile`, не содержит `rb-barrier`; тайлы не выходят за границы (тест из задачи 3 уже обходит все сцены); тест на `data-scene="city"`.
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители города и CSS.
- [ ] **Step 4:** `node --test` зелёный; headless-скриншоты светлой и тёмной темы для «Город».
- [ ] **Step 5:** commit `feat(ride): city scene`

### Task 5: Сцена «MTB», пыль

**Files:**
- Modify: `ride.js` (строители, `effectPuffs`, разметка эффекта), `index.html` (CSS, подключение эффекта в `updateDynamic`)
- Test: `tests/ride.test.js`

**Interfaces:**
- Consumes: механизм слоёв и `SCENES.mtb.effect = 'dust'` из задачи 1.
- Produces: `SCENES.mtb.layers = { far: 'forest', mid: 'trunks', near: 'roots', road: 'dirt' }` (плотный лес и просветы; стволы и валуны; корни, камни, папоротник; грунт с корнями); новые классы `rb-trunk-dark, rb-boulder, rb-root, rb-fern`; `effectPuffs(t: number, sceneId: string): Array<{ dx: number, dy: number, r: number, o: number }>` — клубы пыли относительно оси заднего колеса, `[]` при `effect === 'none'`; `fxMarkup(): string` — `<g id="fx">` с 6 кругами `class="fx-dust"`; `applyFx(svg, puffs, rearWheel: {x,y})`; клубы зациклены на 9 с: срок жизни 9/6 с, фаза `i/6`. Подкраска `#bike[data-scene="mtb"]{--tint:#7FA070;--tk:24%}`.

- [ ] **Step 1: Failing tests:** `rideBgMarkup(view, 0, 311, 'mtb')` содержит `rb-boulder`, `rb-root`; `effectPuffs(t, 'mtb')` — 6 клубов, у каждого `o` в [0,1], `r > 0`; `effectPuffs(t, 'road')` и `'default'` → `[]`; зацикленность: `effectPuffs(t)` и `effectPuffs(t + P)` совпадают с точностью 1e-6; клубы смещаются назад (`dx` растёт по модулю в пределах жизни) и истаивают (`o` падает от 0.35 к 0); при `playing=false` (передан пустой массив) `applyFx` скрывает группу (`display:none`).
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители леса, `effectPuffs`, `fxMarkup`, `applyFx`; `index.html`: вставить `fxMarkup()` в `rebuild()` рядом с фоном, вызывать `applyFx(bikeSvg, effectPuffs(rideT, sceneId), {x:R.x,y:R.y})` в `updateDynamic`, а при паузе — `[]`.
- [ ] **Step 4:** `node --test` зелёный; headless-скриншот «MTB» и «Двухподвес» (одна сцена), светлая и тёмная тема; пыль видна, но не закрывает колесо.
- [ ] **Step 5:** commit `feat(ride): mountain bike scene with dust`

### Task 6: Подготовка релиза A — кэш, документ, требования

**Files:**
- Modify: `sw.js`, `tests/sw.test.js`
- Create: `info/Feedback 5/Решения/Фитстенд - езда по видам (шоссе, город, MTB).docx` (в gitignore), обновить `info/Фитстенд - требования.docx`

- [ ] **Step 1:** `sw.js` → `fitstand-v17`, `tests/sw.test.js` → v17; `node --test` зелёный.
- [ ] **Step 2:** commit `chore: cache v17`.
- [ ] **Step 3:** короткий документ для продавца: что видно на главной (три сцены, движение), что ещё впереди (гибрид, женский, грэвел, циклокросс, трек, складной), вопросы: нравятся ли свет, цвет и скорость; не слишком ли размыт фон; нужна ли пыль у грэвела и грязь у циклокросса именно так.
- [ ] **Step 4:** в требованиях: 7.5 → «Сделано» (описать, что именно), 7.6 → «Частично» (шоссе, город, MTB; остальные в релизе B), 7.4 → «Частично»; пересчитать итоговую строку.

### Task 7: Итоговая проверка

- [ ] **Step 1:** headless-осмотр всех сцен релиза A в светлой и тёмной теме, при ширине 400 и 1200, на паузе и в движении; зафиксировать замечания (контраст неба, читаемость дороги).
- [ ] **Step 2:** один итоговый обзор всей ветки отдельным субагентом на сильной модели (Review Focus из этого плана приложить дословно); исправить найденное по TDD.
- [ ] **Step 3:** `node --test` зелёный; показать пользователю результат (скриншоты, итоги обзора) и ждать «да» на мерж/пуш в main.
