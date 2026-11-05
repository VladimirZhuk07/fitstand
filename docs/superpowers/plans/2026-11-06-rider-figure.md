# Объёмный велосипедист (4б) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на главной вместо палочек — объёмный велосипедист в футболке, шортах, кроссовках и шлеме цвета рамы; на ходу колышется футболка и ремешок; у велосипеда блик рамы и протектор.

**Architecture:** `rider.js` — чистые `limbPath`, `riderShapes`, разметка `riderMarkup` и `applyRider`; `draw.js` — слоты `riderFarSlot`/`riderSlot` вместо линий райдера, блик и протектор в живой разметке; `index.html` — суставы → фигуры в `rebuild()`/`updateDynamic()`, CSS-переменные одежды. Образец форм — одноразовая проба `%TEMP%/fitstand-build/rider-spike.html` (не копировать как есть: в ней нет `id`, анимации и тестов).

**Tech Stack:** ванильный JS, SVG, `node --test` (из корня, без аргумента), headless Edge (`%TEMP%/fitstand-build/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-06-rider-figure-design.md`

## Global Constraints

- Размеры форм — только от `g.headR` и длин сегментов модели; работает для всех `FIT_STYLES` и роста 150–200.
- Цвета — CSS-переменные (светлая/тёмная), шлем — `var(--frame)`.
- На кадр — только атрибуты существующих элементов.
- Статическая разметка (каталог, результат) не меняется.
- Ветка `rider-figure`; кэш `fitstand-v13`; мерж и push — после «да».

## Review Focus

1. **Рост 150 и 200, складной и шоссе:** формы не выворачиваются (колено, локоть с правильной стороны, шорты не шире бедра в 2 раза). Скриншоты (Task 4).
2. **Смена цвета рамы:** шлем перекрашивается. Браузер (Task 4).
3. **Пауза-чертёж:** линии размеров поверх велосипедиста, подсветка «посадки» на фигуре слева не ломается. Браузер (Task 4).
4. **«Райдер» выкл.:** велосипедиста нет, ошибок нет, `boundsOf` без райдера. Браузер (Task 4).
5. **Производительность:** обновлений в секунду ≥ 55 на десктопе в headless. Браузер (Task 4).

---

### Task 1: Формы велосипедиста

**Files:** создать `rider.js`, `tests/rider.test.js`

**Produces:** `limbPath(a, b, wa, wb, bulge = 0, at = 0.35) → string` (контур: от `a` к `b`, округлые концы радиусом `wa/2`, `wb/2`, выпуклость `bulge` на стороне нормали в доле `at`; координаты модели `y` вверх, в `d` — `y` со знаком минус); `riderShapes(g, j, pose) → [{id, tag, cls, attrs}]`, `j = {hip, near, far, up}` (`near`/`far` — результат `legAt`, `up` — `upperAt`), `pose` — `{t?: number}` для колыхания (без `t` — без колыхания). Фигуры (порядок): `rd-far-thigh`, `rd-far-shin`, `rd-far-sock`, `rd-far-shorts`, `rd-far-shoe`, `rd-far-sole` | `rd-torso`, `rd-fold1`, `rd-fold2`, `rd-seat` | `rd-thigh`, `rd-shin`, `rd-sock`, `rd-shorts`, `rd-shoe`, `rd-sole` | `rd-neck`, `rd-head`, `rd-nose`, `rd-chin`, `rd-ear`, `rd-helmet`, `rd-vent1..3`, `rd-visor`, `rd-strap` | `rd-upper`, `rd-sleeve`, `rd-fore`, `rd-fist`. Дальняя сторона — классы с суффиксом `-far`. Колыхание: `hem = 8·(0.6·sin(2π·2τ) + 0.4·sin(2π·5τ + 1))` мм у нижнего края спины футболки; ремешок: `3·sin(2π·3τ)`°, `τ = t/9`.

- [ ] **Step 1: Тесты** (`tests/rider.test.js`, суставы из `model.js`/`draw.js`/`ride.js`): `limbPath ends have the given widths` (точки начала/конца пути на расстоянии `wa/2`, `wb/2` от `a`, `b` ±1 мм; путь замкнут `Z`); `shapes for every style and height` (все `FIT_STYLES` × H 150/165/178/195 × 12 моментов: одинаковый набор `id` в одинаковом порядке, все числа в `attrs` конечны); `fist on the grip, shoe on the pedal` (центр `rd-fist` ближе `0.4·headR` к `up.hand`; середина подошвы `rd-sole` ближе `0.5·headR` к `near.pedal`); `cloth moves a little and loops` (сдвиг края спины ≤ 8 мм, поворот ремешка ≤ 3°, значения при `t` и `t + 9` равны).
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS. **Step 5:** Commit `feat(rider): volumetric rider shapes`.

### Task 2: Разметка и обновление кадра

**Files:** `rider.js`, `tests/rider.test.js`

**Produces:** `riderMarkup(g, j, pose) → string` — `<g class="rider rider-v">` + `<defs>` градиентов `rd-gSkin`, `rd-gShirt`, `rd-gShorts`, `rd-gShoe`, `rd-gHelmet` (стопы — `var(--…)`) + фигуры с `id`; `riderSplit(markup)` не нужен — вместо него `riderMarkup(g, j, pose, side)` с `side` `'far'` (только `-far`) или `'near'` (остальное, с `<defs>`); `applyRider(svg, shapes)` — для каждой фигуры `svg.querySelector('#'+id)` → `setAttribute` по `attrs`.

- [ ] **Step 1: Тесты:** `markup has every shape once` (сумма `far` и `near` — все `id` по одному разу; `defs` только в `near`); `colours come from CSS variables` (нет `#` в `fill`, `stroke`, `stop-color`; шлем — `var(--frame)`); `applyRider sets attributes` (фейковый `svg` собирает вызовы: все `id`, атрибуты как в `attrs`).
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS. **Step 5:** Commit `feat(rider): markup and per-frame update`.

### Task 3: Слоты в живой разметке, блик и протектор

**Files:** `draw.js`, `tests/draw.test.js`

**Produces:** в живой разметке: `<g id="riderFarSlot"></g>` на месте дальних линий ноги; `<g id="riderSlot"></g>` на месте ближних ноги и верха (после руля и седла); удалены `fThigh`, `fShin`, `fFoot`, `nThigh`, `nShin`, `nFoot`, `uHip`, `uTorso`, `uNeck`, `uUpper`, `uFore`, `uHand`, `uHeadG`; `cockpitG` остаётся. Блик: `<line class="hi">` вдоль подседельной, нижней и верхней труб; протектор: `<circle class="tread">` у каждой покрышки — только в живой.

- [ ] **Step 1: Тесты:** обновить `live markup has moving upper body and ride wheels` (теперь `riderFarSlot`, `riderSlot`, `cockpitG`, `.hi`, `.tread`; старых `id` нет); статическая без `riderSlot`, `.hi`, `.tread`; `riderFarSlot` раньше `data-part="frame"`, `riderSlot` позже `data-part="cockpit"`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS. **Step 5:** Commit `feat(draw): rider slots, frame highlight and tyre tread`.

### Task 4: Велосипедист на главной

**Files:** `index.html`, `sw.js`, `tests/highlight.test.js`, `tests/sw.test.js`

**Produces:** `riderJoints(g, pts, pose) → {hip, near, far, up}` (в `index.html`); `rebuild()` — `riderFarSlot.innerHTML = riderMarkup(…, 'far')`, `riderSlot.innerHTML = riderMarkup(…, 'near')`; `updateDynamic()` — `applyRider(bikeSvg, riderShapes(g, riderJoints(…), {t: rideT}))`; удалить обработку старых `id`; CSS: переменные `--skin-1/2`, `--shirt-1/2`, `--shorts-1/2`, `--shoe-1/2`, `--sole` светлые и тёмные; `.bike .hi{stroke:#fff…}` → через переменную `--hi`; `.tread`; `<script src="./rider.js">` после `ride.js`; `sw.js` — `rider.js` в `CORE`, v13.

- [ ] **Step 1: Тесты:** `highlight` — переменные одежды в светлой и тёмной темах, `rider.js` после `ride.js` и до основного скрипта; `sw` — v13, `rider.js` в `CORE`, 9 скриптов.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер:** Review Focus 1–5; скриншоты телефона и десктопа, светлая и тёмная. Пользователь смотрит `http://localhost:8080/`.
- [ ] **Step 6:** Commit `feat(fitstand): volumetric rider in the ride scene; cache v13`.

### Task 5: Выпуск

- [ ] **Step 1:** `node --test` — зелёный; замечания пользователя учтены.
- [ ] **Step 2:** Ревью ветки субагентом на opus; исправить подтверждённое.
- [ ] **Step 3:** docx продавцу `info/Feedback 3/Решения/Фитстенд - велосипедист.docx`; требования: две строки анимации → «Сделано».
- [ ] **Step 4:** Спросить «да» на мерж и push.
