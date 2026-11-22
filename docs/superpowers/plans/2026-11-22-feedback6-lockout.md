# Анимация блокировки и блоки «Вилка и амортизация» — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** На страницах пружинной вилки, воздушной вилки и заднего амортизатора — разрез, который за 10 с проходит 4 шага блокировки (сжатие, отбой, рычаг, удар), и одинаковый полный набор блоков под ним.

**Architecture:** Новый UMD-модуль `lockAnim.js` по образцу `forkAnim.js`: чистые `lockState(t)`, `lockMarkup(kind)`, `lockPose(kind, state)` (тестируются в Node) и `lockBlock`, `startLockAnim`, `applyLock` для страницы. `guide.js` рисует блок на странице детали, `content.js` даёт данные.

**Tech Stack:** plain JS (UMD), SVG, `node:test`.

**Spec:** `docs/superpowers/specs/2026-11-22-feedback6-lockout-design.md`

## Global Constraints

- Рабочая папка: worktree `C:/work/projects/fitstand-suspension`, ветка `feedback6-suspension`. Не трогать `C:/work/projects/fitstand` (там идёт другая ветка), кроме чтения образца рисунка `C:/work/projects/fitstand/info/gen-etap5-schemas.js` (папка `info/` не в git и в worktree её нет).
- Тесты: `node --test` из корня worktree, **без аргумента пути**. До начала — 263 теста, все зелёные; после каждой задачи все зелёные.
- Никаких марок и торговых названий; имя магазина и продавца не писать (тест проверяет марки).
- В `lockAnim.js` нет `Math.random`: всё детерминировано, цикл бесшовный.
- Подписи на рисунке и в интерфейсе — по-русски; комментарии в коде — по-английски, как в соседнем коде.
- Цвета: голубой `#5EB8F0` (позитивная камера), оранжевый `#F29A4A` (негативная), масло `#D9A441`, зелёный `#3FAE5C` (открыто), красный `#D9473F` (закрыто).
- `sw.js` VERSION и `tests/sw.test.js` не трогать; в список файлов кэша `sw.js` добавляется только `./lockAnim.js` (задача 1).
- Не пушить, не сливать.

## Review Focus

1. **Стык цикла** (9.999 → 0) без скачка у всех величин и у позиций частиц. Тест — задачи 1 и 3.
2. **Индикатор и рычаг никогда не расходятся** (красный при открытом рычаге — грубая ошибка для продавца). Тест — задача 1 (состояние) и задача 2 (класс в `lockPose`).
3. **Уход со страницы**: анимация останавливается, повторное открытие страницы не запускает второй цикл. Тест — задача 5.
4. **Выключенная анимация в системе**: цикл не идёт, показан момент удара, кнопки шагов работают. Тест — задача 5.
5. **Тексты не потеряли смысл** при переносе из `usage` в `lockout` / `breaks`: каждый прежний пункт о блокировке, поломках и ремонте нашёл место. Тест — задача 6 (сравнение со снимком прежних пунктов).

---

### Task 1: Сценарий цикла `lockState`

**Files:**
- Create: `lockAnim.js` (UMD-обёртка как в `forkAnim.js`; пока экспорт `LOCK_PERIOD`, `lockState`)
- Modify: `sw.js` (добавить `'./lockAnim.js'` в список файлов после `'./forkAnim.js'`)
- Test: `tests/lockAnim.test.js` (новый), `tests/sw.test.js` не трогать — проверку списка добавить в новый файл

**Interfaces:**
- Produces: `LOCK_PERIOD = 10`; `lockState(t) -> {step, c, lever, valve, flow, hitD, hitA}`:
  - `step` 1–4 по таблице спеки (0–3, 3–5, 5–7, 7–10);
  - `c` (0…1): 0→0.7 на 0–3 и 0.7→0 на 3–5 по `smooth(x)=x*x*(3-2x)`; на шаге 4 импульс `0.04*sin(π*(t-7.7)/0.3)` при 7.7≤t≤8.0, иначе 0;
  - `lever`: 0 до 5; `smooth` 0→1 на 5–7; 1 до 9.4; `smooth` 1→0 на 9.4–10;
  - `valve`: `lever(t-0.3)` на 5–7.3, затем 1 до 9.4, `smooth` 1→0 на 9.4–10 (вместе с рычагом);
  - `flow`: +1 на шаге 1, −1 на шаге 2, иначе 0;
  - стрелка удара: `hitD` (1 — далеко, 0 — у ноги): `smooth` 1→0 на 7–7.8, 0→0.6 на 7.8–8.6, 0.6 до 9.4; `hitA` (прозрачность): 0 до 7, 1 на 7–8.6, `smooth` 1→0 на 8.6–9.4, 0 дальше;
  - `t` берётся по модулю периода (в том числе отрицательный).

- [ ] **Step 1: Failing tests:**
  - `test('steps follow the timeline')`: `step` в 0, 2.99, 3, 4.99, 5, 6.99, 7, 9.99 → 1,1,2,2,3,3,4,4.
  - `test('the loop closes without a jump')`: для каждого числового поля `|lockState(9.999)[k]-lockState(0)[k]| <= 0.01`.
  - `test('time wraps around the period')`: `lockState(-1)` глубоко равно `lockState(9)`, `lockState(23)` — `lockState(3)`.
  - `test('compression: 0.7 at the end of step 1, almost none when locked')`: `c(3)≈0.7`; для всех t на [7,10) с шагом 0.01 `c<=0.04`; `c(5)===0`.
  - `test('the valve closes after the lever and both open at the end')`: `valve(6)<lever(6)`; `lever(8)===1 && valve(8)===1`; `lever(9.999)<0.01`.
  - `test('oil flows only while the fork moves freely')`: `flow` 1 при t=1, −1 при t=4, 0 при t=6 и t=8.
  - `test('the impact arrow comes, bounces, fades')`: `hitA(6.9)===0`, `hitD(7.8)≈0`, `hitD(8.6)≈0.6`, `hitA(9.5)===0`.
  - `test('sw caches lockAnim.js')`: текст `sw.js` содержит `'./lockAnim.js'`.
- [ ] **Step 2:** `node --test` → новые тесты падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(lock): the 10-second lockout timeline`.

---

### Task 2: Рисунок и кадр пружинной вилки

**Files:**
- Modify: `lockAnim.js` (`lockMarkup`, `lockPose`, `applyLock`)
- Test: `tests/lockAnim.test.js`

**Interfaces:**
- Consumes: `lockState` (задача 1).
- Produces:
  - `lockMarkup(kind: 'spring'|'air'|'shock') -> string` — `<svg class="la-svg" data-lock="spring" viewBox="0 0 900 900">…</svg>` — **вид спереди**: корона, две ноги, арка, ось; левая нога в разрезе (пружина / воздух), правая — демпфер; рычаг с индикатором на короне над правой ногой (амортизатор позже — `0 0 1000 600`); подписи — `<text class="la-label">`; цвета — через классы `la-*` и `defs`-градиенты (градиенты можно с цветами в атрибутах, как в схемах отзыва 5);
  - общие для всех узлов `id`: `la-lever` (группа рычага, поворот вокруг оси), `la-ind` (индикатор, класс `la-open`/`la-closed`), `la-needle` (игла, сдвиг вниз при `valve`), `la-cross` (крест на клапане), `la-flow` (группа стрелок потока масла), `la-hit` (стрелка удара), `la-move` (подвижная часть: обе нижние ноги с аркой и осью / шток с проушиной амортизатора);
  - пружинная дополнительно: `la-spring` (`polyline`, точки пружины);
  - `lockPose(kind, state) -> Array<{id, attrs}>` — только атрибуты, без новых элементов: `la-move` `transform` (ход `c * TRAVEL`, `TRAVEL = 160` px для вилок), `la-spring` `points`, `la-lever` `transform` `rotate(lever*90 …)`, `la-ind` `class` (`la-ind la-open` при `lever<0.5`, иначе `la-ind la-closed`), `la-needle` `transform`, `la-flow` `opacity` (`|flow|`) и `transform` (зеркально при `flow<0`), `la-cross` `opacity` (`valve>0.5 && hitA>0 ? 1 : 0`), `la-hit` `transform` и `opacity`;
  - `applyLock(svg, list)` — как `applyRider`: `svg.querySelector('#'+id).setAttribute(...)`.

- [ ] **Step 1: Failing tests:**
  - `test('spring cutaway: labelled parts and moving ids')`: разметка содержит все общие `id` и `la-spring`; подписи «Корона», «Пружина», «Демпфер», «Клапан», «Игла», «Рычаг блокировки», «Сальник», «Нижняя нога».
  - `test('every id lockPose touches exists in the markup')`: для t от 0 до 10 с шагом 0.25 каждый `id` из `lockPose('spring', lockState(t))` встречается как `id="…"` в `lockMarkup('spring')`.
  - `test('the indicator always matches the lever')`: для t с шагом 0.05 класс `la-ind` в `lockPose` — `la-closed` тогда и только тогда, когда `lockState(t).lever >= 0.5`.
  - `test('front view: two legs, the lever above the damper leg')`: в разметке две нижние ноги (`la-leg-l`, `la-leg-r`) внутри `la-move`; x-центр `la-lever` ближе к центру правой ноги, чем левой.
  - `test('the spring shortens as the fork compresses')`: длина пружины (по крайним точкам `points`) при `c=0.7` меньше, чем при `c=0`.
  - `test('no Math.random in lockAnim.js')` (чтение файла).
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать. Образец стиля, деталей и подписей — функция `springFork(mode)` в `C:/work/projects/fitstand/info/gen-etap5-schemas.js` (там одна нога сбоку; градиенты `alum`, `steel`, `spring`, `cavity` оттуда). Компоновка — вид спереди, как на образце продавца `C:/work/projects/fitstand/info/Feedback 6/ref-air-fork-lockout.png` (посмотреть картинку): две ноги, рычаг на короне над ногой с демпфером. Текст с образца не копировать (он искажён), подписи — наши, по-русски.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(lock): spring fork cutaway and its frames`.

---

### Task 3: Воздушная вилка

**Files:**
- Modify: `lockAnim.js`
- Test: `tests/lockAnim.test.js`

**Interfaces:**
- Produces: `lockMarkup('air')` — общие `id` плюс частицы `la-p0`…`la-p17` (позитивная камера, класс `la-pos`), `la-n0`…`la-n11` (негативная, класс `la-neg`), `la-bypass` (канал); подписи «Ниппель», «Позитивная камера», «Поршень», «Негативная камера», «Байпас», «Демпфер», «Клапан», «Игла», «Рычаг блокировки».
- Частицы в `lockPose('air', state)`: `cx`, `cy` — функции только от `state.c` (без времени): позитивные равномерно (детерминированная сетка со сдвигом по фиксированному сиду) в верхней камере, высота которой уменьшается с `c`; 4 из негативных при `c>0` стоят на пути байпаса в точке `c/0.7` пути; при `c=0` все негативные в своей камере. Поэтому при неизменном `c` частицы стоят (шаги 3–4).

- [ ] **Step 1: Failing tests:**
  - `test('air cutaway: two chambers of particles, a bypass, labels')`.
  - `test('positive chamber gets denser under compression')`: среднее попарное расстояние частиц `la-p*` при `c=0.7` меньше, чем при `c=0`.
  - `test('particles stand still while the lockout is closed')`: для t от 7 до 9.4 с шагом 0.1 координаты частиц в соседних кадрах отличаются не больше чем на 0.6 px (вздрагивание при ударе `c<=0.04`).
  - `test('air: the loop closes')`: координаты всех частиц при t=9.999 и t=0 отличаются не больше чем на 1 px.
  - `test('air: every id lockPose touches exists')` (как в задаче 2).
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать по образцу `airFork(mode)` из генератора и компоновке вида спереди из задачи 2: камеры в левой ноге, демпфер в правой, ниппель над левой ногой.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(lock): air fork cutaway with chamber particles`.

---

### Task 4: Задний амортизатор

**Files:**
- Modify: `lockAnim.js`
- Test: `tests/lockAnim.test.js`

**Interfaces:**
- Produces: `lockMarkup('shock')` — viewBox `0 0 1000 600`, горизонтальный корпус, две проушины (`la-eye1`, `la-eye2`), воздушная банка, шток, клапан с иглой, рычаг на корпусе, общие `id`; `la-move` сдвигается по горизонтали (`TRAVEL_SHOCK = 120` px); подписи «Проушина», «Воздушная камера», «Шток», «Демпфер», «Клапан», «Игла», «Рычаг блокировки».

- [ ] **Step 1: Failing tests:** `test('shock cutaway: two eyes, a shaft, labels, moving ids')`; `test('shock: every id lockPose touches exists')`; `test('shock: the shaft moves horizontally')` — у `la-move` в `transform` меняется только x.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать по образцу `rearShock(mode)` из генератора.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(lock): rear shock cutaway`.

---

### Task 5: Блок страницы и управление

**Files:**
- Modify: `lockAnim.js` (`lockBlock`, `startLockAnim`, `LOCK_CAPTIONS`), `index.html` (`<script src="./lockAnim.js"></script>` перед `./guide.js`; CSS `.la-*` для светлой и тёмной темы с цветами из Global Constraints)
- Test: `tests/lockAnim.test.js`

**Interfaces:**
- Produces:
  - `lockBlock(kind) -> string`: `<section class="lock-anim" data-lock-kind="…">` с `lockMarkup(kind)`, `<p class="la-caption" aria-live="polite">`, группой `role="radiogroup"` из 4 кнопок `data-lock-step="1..4"` с подписями «1 Сжатие», «2 Отбой», «3 Блокировка», «4 Удар» и кнопкой `data-lock-play` («Пауза» / «Пуск»);
  - `LOCK_CAPTIONS` — 4 подписи шагов дословно из спеки; для `shock` слово «вилка» заменяется на «амортизатор» (функция `captionOf(kind, step)`);
  - `startLockAnim(rootEl, kind, win = window) -> {stop(), state()}` по образцу `startForkAnim`: `requestAnimationFrame`, шаг времени не больше 0.05 с, остановка при `!rootEl.isConnected` или `stop()`; кнопка шага ставит `t` на начало шага (шаг 4 — 7.8) и паузу; `prefers-reduced-motion: reduce` → `playing:false`, `t=7.8`; при каждом кадре подпись и `aria-checked` кнопок соответствуют `step`.

- [ ] **Step 1: Failing tests** (заглушки `win` и `rootEl` как в `tests/forkAnim.test.js`):
  - `test('lockBlock: four step buttons, a play button, a live caption')`.
  - `test('captions: the shock says амортизатор')`.
  - `test('reduced motion: paused on the impact')`: `startLockAnim(fakeRoot,'air',fakeWin{reduce:true}).state()` → `playing===false`, `t===7.8`.
  - `test('a step button jumps and pauses')`: клик по `data-lock-step="3"` → `t===5`, `playing===false`.
  - `test('the loop stops when the block leaves the page')`: после `rootEl.isConnected=false` следующий кадр не запрашивает новый `requestAnimationFrame`.
  - `test('the page loads lockAnim.js before guide.js')` (текст `index.html`).
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное.
- [ ] **Step 5:** commit `feat(lock): the page block with steps, pause and reduced motion`.

---

### Task 6: Данные трёх узлов (`content.js`)

**Files:**
- Modify: `content.js` (`parts.fork.details`: `springFork`, `airFork`, `rearShock`)
- Test: `tests/content.test.js`

**Interfaces:**
- Produces у каждой из трёх деталей:
  - `lock`: `'spring'` / `'air'` / `'shock'`;
  - `lockout: string[]` — «Как пользоваться блокировкой»: пункты прежнего подблока `usage` «Зачем нужна блокировка» плюс «как»: где рычаг, когда включать (подъём, ровный асфальт), когда выключать (спуск, кочки), не прыгать и не ехать по корням с закрытой блокировкой;
  - `care: string[]` — 4–6 пунктов «Уход»;
  - `breaks: {name, text, fix}[]` — объединение прежних поломок (`usage` «Возможные поломки» или поле `breaks`) и ремонта (`usage` «Ремонт» / «Ремонт своими руками»): `text` — признак и как избежать, `fix` — как устранить (сам или в мастерской);
  - в `usage` остаются только «Рекомендации по использованию» и «Настройки».

- [ ] **Step 1: Failing tests:**
  - снимок прежних пунктов: перед правкой сохранить в тест (литералом) пункты прежних подблоков «Зачем нужна блокировка», «Возможные поломки» / `breaks`, «Ремонт» / «Ремонт своими руками» для трёх деталей; `test('every old lockout, breakdown and repair point found a place')` — каждый прежний пункт (или его ключевые слова, перечисленные в тесте) встречается в новых `lockout` / `breaks[].text` / `breaks[].fix`;
  - `test('three suspension details: lock, lockout, care, breaks with fixes')`: `lock` верный, `lockout.length>=4`, `care.length` 4–6, у каждого `breaks` есть непустые `name`, `text`, `fix`;
  - `test('usage keeps only recommendations and settings')`: заголовки `usage` — ровно «Рекомендации по использованию» и «Настройки».
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** перенести и дописать тексты (коротко, по-русски, без марок).
- [ ] **Step 4:** `node --test` → зелёное (включая проверку марок).
- [ ] **Step 5:** commit `feat(content): lockout, care and breakdowns for forks and the shock`.

---

### Task 7: Страница детали (`guide.js`)

**Files:**
- Modify: `guide.js` (`detailView`, вызов `startLockAnim` после отрисовки)
- Test: `tests/guide.test.js`

**Interfaces:**
- Consumes: `lockBlock`, `startLockAnim` (задача 5), поля из задачи 6.
- Produces: для детали с `lock` разделы в порядке «Принцип работы» (`lockBlock(d.lock)` и под ним ссылка «Схема целиком» на `schemaImg(id)`) → «Виды» → «Как пользоваться блокировкой» (`d.lockout`) → «Уход» (`d.care`) → «Поломки и как устранить» (`d.breaks`: `name` — `text`; `fix` отдельной строкой «Как устранить: …») → «Как использовать» (`d.usage`). Детали без `lock` рисуются как сейчас (раздел поломок для них — прежний заголовок «Частые поломки и как их избежать», если у пунктов нет `fix`). После отрисовки детали с `lock` вызывается `startLockAnim(page.querySelector('.lock-anim'), d.lock)`; при уходе со страницы прежний цикл останавливается (`stop()` сохранённого контроллера).

- [ ] **Step 1: Failing tests** (по образцу существующих тестов `guide.test.js`, рендер страницы в строку):
  - `test('a suspension detail: sections in order, the lockout block on top')` — индексы заголовков в разметке возрастают в указанном порядке; есть `class="lock-anim"` и ссылка «Схема целиком».
  - `test('a detail without lock renders as before')` — например, деталь трансмиссии: нет `lock-anim`, разделы прежние.
  - `test('breakdowns show how to fix')`.
- [ ] **Step 2:** `node --test` → падают.
- [ ] **Step 3:** реализовать.
- [ ] **Step 4:** `node --test` → зелёное. В браузере (`python -m http.server 8765` из worktree) открыть `#parts/fork/airFork`, `#parts/fork/springFork`, `#parts/fork/rearShock`: цикл идёт, кнопки шагов и пауза работают, уход назад и повторное открытие не ускоряют анимацию. Останавливать только свои процессы по PID. Если браузер недоступен — написать в отчёте.
- [ ] **Step 5:** commit `feat(guide): lockout animation and full blocks on the suspension pages`.

---

### Task 8: Проверка глазами (делает ведущий)

- [ ] Скриншоты трёх страниц на шагах 1–4 в светлой и тёмной теме; сравнить с образцом продавца: читаемость подписей, цвета камер и масла различимы, индикатор заметен, ничего не вылезает за рисунок.
- [ ] Найденное — задачами исполнителю; затем общее ревью ветки (Opus), версия `sw.js` + `tests/sw.test.js` при слиянии, документ продавцу, строки R4/R5 в сводном файле требований; слияние только после «да».
