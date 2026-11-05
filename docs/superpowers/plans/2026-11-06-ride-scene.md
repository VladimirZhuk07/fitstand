# Сцена поездки на главной (4а) — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на главной, пока крутятся педали, — сцена с фоном из слоёв и живым движением (каденс 80, колёса в такт дороге, корпус, дыхание, руль, подпрыгивание); на паузе — чертёж, как сейчас.

**Architecture:** `ride.js` — чистые `ridePose`, `layerShift`, разметка фона `rideBgMarkup` и `applyRide`; `draw.js` — подвижный верх райдера (`upperAt`, `id`), группа руля, спицы/диск/ниппель, класс сетки; `index.html` — класс `riding`, цикл анимации на `ridePose`, CSS сцены.

**Tech Stack:** ванильный JS, SVG, `node --test` (из корня, без аргумента), headless Edge (`%TEMP%/fitstand-build/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-06-ride-scene-design.md`

## Global Constraints

- Все числа движения — из таблицы спецификации 2.2; цикл 9 с.
- Только `transform`/атрибуты на кадр, без фильтров.
- Статическая разметка (каталог, результат опроса) не меняется.
- Цвета сцены — CSS-переменные, светлая и тёмная темы.
- Ветка `ride-scene`; кэш `fitstand-v12`; мерж и push — после «да».

## Review Focus

1. **Смена вида/роста на ходу** (кнопки посадки, ползунки): сцена перестраивается, дорога и колёса остаются в такт, ошибок нет. Браузер (Task 4).
2. **Пауза посреди цикла и продолжение:** движение продолжается с того же места, без скачка. Браузер (Task 4).
3. **Складной 20″ и детские размеры колёс:** дорога совпадает с колесом. Тест `road matches the wheel` для 20″ и 16″ (Task 1).
4. **Узкий экран 360 px:** фон покрывает всю сцену, нет пустых полос по краям при любом `viewBox`. Скриншот (Task 4).
5. **Выключенный «Райдер»:** сцена работает, ошибок нет (верх райдера скрыт). Браузер (Task 4).

---

### Task 1: `ridePose` и `layerShift`

**Files:** создать `ride.js`, `tests/ride.test.js`

**Produces:** `RIDE = {PERIOD: 9, CRANK_REVS: 12, SPEED: 6000}`; `wheelRevs(wheelR) = max(1, round(SPEED·PERIOD / (2π·wheelR)))`; `speedOf(wheelR) = wheelRevs·2π·wheelR / PERIOD`; `ridePose(t, wheelR) → {crank, wheel, ground, torso, breath, bar, bounce}` (спецификация 3.1, формулы колебаний — 2.2: `torso = 1.2·sin(2π·24τ)`, `breath = 3·(1 − cos(2π·3τ))`, `bar = 0.6·sin(2π·2τ + 0.3) + 0.45·sin(2π·5τ + 1.1) + 0.3·sin(2π·7τ + 2)`, `bounce = 1.5·sin(2π·13τ) + 1.5·sin(2π·29τ + 0.7)`, `τ = (t mod 9)/9`; `crank = 360·12τ`, `wheel = 360·wheelRevs·τ`, `ground = speedOf·9·τ`); `LAYERS` и `layerShift(id, t, wheelR) → {x, tile}` (`n = max(1, round(v·9·k / 3500))`, `tile = v·9·k / n`, `x = −((v·t·k) mod tile)` для `t` по модулю 9).

- [ ] **Step 1: Тесты** (`tests/ride.test.js`): `whole revolutions per loop` (12 шатунов; колесо целое для `wheelR` 311, 292, 203, 152.5); `road matches the wheel` (`ground = wheel/360·2πR` ± 0.5 мм для тех же R); `loop seam` (между `t = 9 − 1/60` и `0`: углы по модулю 360 отличаются меньше чем на шаг кадра + 1°, `torso`, `bar`, `breath`, `bounce` — меньше 0,3); `limits` (`|torso| ≤ 2`, `|bar| ≤ 1.5`, `0 ≤ breath ≤ 6`, `|bounce| ≤ 3`); `bar is irregular` (> 4 локальных максимума, не все равны в пределах 0,1); `layers` (целое число плиток за цикл, плитка 2500–4500 мм, `x(t) = x(t + 9)`, скорость `road` = скорость колеса, `near` > `road` > `mid` > `far`).
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS. **Step 5:** Commit `feat(ride): ride pose and parallax layers`.

### Task 2: Подвижный верх райдера, руль, колёса на ходу

**Files:** `draw.js`, `model.js` (если `upperAt` ставится рядом с `upperOf`), `tests/draw.test.js`

**Produces:** `upperAt(g, hip, ck, pose) → {shoulder, elbow, hand, head, alpha}` (спецификация 3.2; при `pose` = нули — как `upperOf(g, hip, ck.hand)`); в `live` разметке: `id` `uHip`, `uTorso`, `uNeck`, `uUpper`, `uFore`, `uHand`, `uHead`, `uHelmet`; `part('cockpit')` внутри `<g id="cockpitG">`; в колесе `<g class="spokes">`, `<circle class="blur-disc">`, `<circle class="valve">` внутри вращаемой группы; сетка — `<rect class="grid-bg">`. Экспорт `upperAt`.

- [ ] **Step 1: Тесты:** `live markup has moving upper body and ride wheels` — все `id` и классы есть в живой, ни одного в статической; `upperAt at rest equals upperOf` (до 0,5 мм: плечо, кисть, голова; поза `{torso:0, breath:0, bar:0}`); `arms reach the bar` — для `torso` ±1.2, `bar` ±1.35, `breath` 6: `|hand − shoulder| ≤ arm·AEK + 0.5`, кисть отличается от грипсы меньше чем на 1 мм, если рука дотягивается.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS. **Step 5:** Commit `feat(draw): moving upper body, steering group, wheels at speed`.

### Task 3: Фон сцены

**Files:** `ride.js`, `tests/ride.test.js`

**Produces:** `rideBgMarkup(b, ground) → string` — `<g id="rideBg">` с `<defs>` (узоры `rb-far`, `rb-mid`, `rb-near`, `rb-road` шириной по `layerShift(…, 0, R).tile`, градиенты неба, дымки, света) и прямоугольниками, покрывающими `b` (границы `viewBox` в мм) с запасом 20 % по ширине; земля на `y = −ground` (как в разметке схемы); `applyRide(svg, shifts)` — `patternTransform="translate(x 0)"` у четырёх узоров.

- [ ] **Step 1: Тесты:** `background covers the view` — прямоугольник неба и слоёв шире и выше `b`, дорога от земли вниз до края `b`; есть 4 узора с `id` и шириной, равной `tile`; цвета только через `var(--…)` классы (нет `#` в `fill`/`stroke`); `applyRide` на фейковом `svg` ставит 4 `patternTransform`.
- [ ] **Step 2:** FAIL. **Step 3:** рисунок: холмы (2–3 мягкие кривые), деревья (кроны-эллипсы и стволы, 5–7 разных на плитку), трава (пучки-штрихи) и столбики, дорога (мелкие отрезки-фактура). **Step 4:** PASS. **Step 5:** Commit `feat(ride): layered background drawn in SVG`.

### Task 4: Сцена на главной

**Files:** `index.html`, `sw.js`, `tests/highlight.test.js`, `tests/sw.test.js`

**Consumes:** Task 1–3.

**Produces:** класс `riding` у `#bike` при `state.playing` (и снят на паузе); CSS: `#bike.riding .grid-bg, #bike.riding .dims, #bike.riding .ground {opacity:0}`, `#bike:not(.riding) #rideBg {opacity:0}`, `.blur-disc` видим и `.spokes` полупрозрачны только в `riding`, переходы `opacity .3s`; CSS-переменные сцены светлые/тёмные; цикл: `rideT += min(0.05, dt)` при `playing`, поза → ноги (`legAt` с углом шатуна из позы), колёса, `upperAt`, `cockpitG` (`rotate(bar C)`), `#scene` (`translate(0 −bounce)`), `applyRide`; `rebuild()` строит `#rideBg` по текущему `vb`; `<script src="./ride.js">` после `draw.js`; `sw.js` — `./ride.js` в `CORE`, v12.

- [ ] **Step 1: Тесты:** `highlight` — правила `#bike.riding .grid-bg`, `#bike.riding .dims`, `#bike:not(.riding) #rideBg`; переменные `--sky-top` в светлой и тёмной теме; `ride.js` подключён после `draw.js` и до основного `<script>`; `sw` — v12 и `ride.js` в `CORE`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер:** скриншоты сцены (телефон, десктоп, светлая, тёмная), чертёж на паузе, «уменьшить движение»; смена вида и роста на ходу; выключенный «Райдер»; обновления в секунду (MutationObserver на `#wR`) ≥ 55; консоль чистая. Пользователь смотрит на `http://localhost:8080/`.
- [ ] **Step 6:** Commit `feat(fitstand): ride scene while pedalling, drawing on pause; cache v12`.

### Task 5: Выпуск 4а

- [ ] **Step 1:** `node --test` — зелёный; отзыв пользователя с localhost учтён.
- [ ] **Step 2:** Ревью ветки субагентом на opus; исправить подтверждённое.
- [ ] **Step 3:** docx продавцу `info/Feedback 3/Решения/Фитстенд - сцена на главной.docx` (скриншоты, что изменилось, что будет в 4б); требования — строка анимации «Частично».
- [ ] **Step 4:** Спросить «да» на мерж и push.
