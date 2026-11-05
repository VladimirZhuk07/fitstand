# Анимация вилки — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** на странице «Вилка и амортизация» две анимированные сцены (пружинная и воздушная) с режимами «Кочка»/«Подъём» и кнопкой «Блокировка».

**Architecture:** новый модуль `forkAnim.js`: чистые `forkPose` и `forkMarkup` (тестируются в Node), DOM-часть `applyPose` и `startForkAnim`; подписи — `content.js` `parts.fork.anim`; встраивание — `guide.js` `partView`; скрипт и CSS — `index.html`; кэш — `sw.js`.

**Tech Stack:** ванильный JS, SVG, `requestAnimationFrame`, `node --test` (из корня, без аргумента), headless Edge (`%TEMP%/fitstand-build/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-05-fork-animation-design.md`

## Global Constraints

- Без брендов; все тексты — в `content.js`.
- Цвета — только существующие CSS-переменные (`--ink`, `--muted`, `--line`, `--panel`, `--accent`, `--measure`); тёмная тема без отдельных правил.
- `prefers-reduced-motion: reduce` — старт на паузе.
- Ветка `feedback3-fork`; кэш `fitstand-v9`; мерж и push — после «да».

## Review Focus

1. **Уход со страницы вилки во время анимации** (←, другой узел, закрытие гида): цикл `requestAnimationFrame` прекращается, ошибок в консоли нет. Браузер (Task 3).
2. **Повторный заход на `#parts/fork`:** одна анимация, не две параллельные (скорость не удваивается). Тест `startForkAnim stops when root leaves the document` (Task 3) + браузер.
3. **Вкладка в фоне, возврат через минуту:** нет рывка/скачка — время цикла берётся по модулю, шаг кадра ограничен. Тест непрерывности (Task 1).
4. **Узкий экран 360 px и тёмная тема:** сцены одна под другой, подписи читаются, ничего не вылезает. Скриншоты (Task 3).
5. **Клавиатура и экранный диктор:** кнопки — `button` с `aria-pressed`, подпись — `aria-live="polite"`, SVG — `role="img"` с названием. Тест разметки (Task 3).

---

### Task 1: `forkPose` и `forkMarkup`

**Files:** создать `forkAnim.js`, `tests/forkAnim.test.js`

**Produces:**
- `FORK_PERIOD = 3`.
- `forkPose(kind: 'spring'|'air', mode: 'bump'|'climb', t: number, locked: boolean) → {c, wheel, front, hands}` — модель из спецификации 3.1: кочка `u(t)` — приподнятый косинус `0.7` на `[0.5, 0.8]` с; без блокировки `front` — груз на пружине с гашением (`ω = 2π·1.6`; `ζ` 0.18 у пружинной, 1 у воздушной), таблица на цикл с шагом 1/600 с (считается один раз на `kind`, линейная интерполяция); с блокировкой `front = wheel = u`, `hands = u/0.7`; подъём: `c = A(1 − cos(2π·2.5t))/2`, `A` 0.18 / 0.1, `wheel = 0`; с блокировкой всё 0. `t` — по модулю `FORK_PERIOD` (отрицательное тоже).
- `forkMarkup(kind, labels: {spring, air, oil, hands}, title: string) → string` — `<svg class="fork-scene" data-fork="<kind>" viewBox="0 0 240 260" role="img" aria-label="<title>">`; группы с `data-k`: `front`, `lower`, `bump`, `hands`, и `spring` (у пружинной) или `air` + `oil` (у воздушной); текстовые подписи из `labels`.

- [ ] **Step 1: Тесты** (`tests/forkAnim.test.js`; выборка `t` с шагом 1/60 на цикл):
  - `bump compresses both forks` — без блокировки `max c > 0.4` для `spring` и `air`;
  - `spring rocks, air settles` — пружинная: `min front < −0.05` после `t = 0.8`; воздушная: `front ≥ −0.005` везде; обе: `|front(2.99)| < 0.02`;
  - `lockout` — `locked`: `c === 0` везде в обоих режимах; кочка: `max front` и `max wheel` в `[0.69, 0.7]`, `max hands` в `[0.99, 1]`; подъём: все поля 0;
  - `climb bobs, spring more` — без блокировки: `wheel === 0`, `max c` пружинной > `max c` воздушной > 0.05;
  - `pose invariants` — для всех 8 сочетаний: `c ≈ wheel − front` (1e-9); `forkPose(t) ≈ forkPose(t + 3)` и `forkPose(−0.5) ≈ forkPose(2.5)`; соседние кадры: `|Δc| < 0.15`;
  - `markup` — у `spring` есть `data-k="spring"`, нет `data-k="air"`; у `air` наоборот и есть `data-k="oil"`; у обеих `data-k` `front`, `lower`, `bump`, `hands`, `role="img"`, `aria-label`, тексты подписей; подписи экранируются (`<` → `&lt;`).
- [ ] **Step 2:** `node --test` — FAIL (нет модуля). **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(fork): fork pose model and scene markup`.

### Task 2: Тексты анимации

**Files:** `content.js`, `tests/content.test.js`

**Produces:** `CONTENT.parts.fork.anim = { title: 'Как работает амортизация', kinds: {spring: 'Пружинная', air: 'Воздушная'}, modes: {bump: 'Кочка', climb: 'Подъём'}, lock: 'Блокировка', play: 'Пуск', pause: 'Пауза', labels: {spring: 'пружина', air: 'воздух', oil: 'масло гасит отскок', hands: 'удар в руки'}, captions: {bump: {off, on}, climb: {off, on}} }` — смысл подписей по таблице спецификации 2.

- [ ] **Step 1: Тест** `fork animation texts` — все поля непустые, ровно 4 подписи `captions.<mode>.<off|on>`; подпись `bump.on` упоминает руки, `climb.on` — подъём.
- [ ] **Step 2:** FAIL. **Step 3:** тексты. **Step 4:** PASS (с `no brands`).
- [ ] **Step 5:** Commit `feat(content): fork animation captions`.

### Task 3: Сцены на странице вилки

**Files:** `forkAnim.js`, `guide.js`, `index.html`, `sw.js`, `tests/forkAnim.test.js`, `tests/guide.test.js`, `tests/sw.test.js`, `tests/highlight.test.js`

**Consumes:** Task 1 (`forkPose`, `forkMarkup`, `FORK_PERIOD`), Task 2 (`parts.fork.anim`).

**Produces:**
- `applyPose(svg, pose, bumpX)` — `front`: `translate(0, −front·S)`; `lower`: `translate(0, −wheel·S)`; пружина: перестроить ломаную под длину `L0 − c·S`; воздух: `fill-opacity` `0.25 + 0.5·max(c,0)`; `bump`: `translate(bumpX, 0)`; `hands`: `opacity = hands`. `S = 60` (px полного хода).
- `forkBlock(anim) → string` — HTML раздела: `<section class="fork-anim">` с заголовком `anim.title`, `<div class="fork-scenes">` двух сцен (с подписями `kinds`), кнопки `data-fork-mode="bump|climb"` (`aria-pressed`), `data-fork-lock` (`aria-pressed`), `data-fork-play`, подпись `<p class="fork-cap" aria-live="polite">`.
- `startForkAnim(root, anim, win = window)` — состояние `{mode:'bump', locked:false, playing: !reducedMotion}`; обработчики кнопок внутри `root`; цикл rAF: `dt = min(0.05, Δ)`, `t += dt` пока `playing`; позиция кочки по `t` в режиме «Кочка», в «Подъёме» кочка скрыта; цикл прекращается, если `!root.isConnected`. Возвращает `stop()`.
- `guide.js` `partView`: если `p.anim` — `forkBlock(p.anim)` после `.lead`; в `render` после вставки — `if (r.view === 'part' && C.parts[r.id].anim) root.startForkAnim(page.querySelector('.fork-anim'), C.parts[r.id].anim)`.
- `index.html`: `<script src="./forkAnim.js">` перед `guide.js`; CSS `.fork-anim`, `.fork-scenes` (2 колонки, ≤480 px — 1), `.fork-scene` (штрихи `--ink`, разрез `--line`/`--panel`, воздух и масло `--accent`, метка рук `--measure`), кнопки как `.chip`.
- `sw.js`: `./forkAnim.js` в `CORE`, `VERSION = 'fitstand-v9'`.

- [ ] **Step 1: Тесты.**
  - `forkAnim`: `forkBlock` — две сцены `data-fork="spring"`/`"air"`, кнопки с `aria-pressed`, подпись `aria-live="polite"`. `startForkAnim stops when root leaves the document` — фейковые `root` (`isConnected` переключаемый, `querySelectorAll` → []) и `win` (`requestAnimationFrame` копит колбэки, `matchMedia` → `{matches:false}`): после `isConnected = false` очередной кадр не ставит новый rAF. `reduced motion starts paused` — `matchMedia(...).matches = true` → после кадра `t` не растёт (через возвращаемый `state()`).
  - `guide`: в `guide.js` нет «Блокировка», «Кочка».
  - `sw`: версия v9; `forkAnim.js` в `CORE`.
  - `highlight`: `forkAnim.js` подключён до `guide.js`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** `#parts/fork` на 360 px и 1366 px, светлая и тёмная: скриншоты кочки в момент удара и после (пружинная качается, воздушная нет), «Блокировка» + «Кочка» (метка «удар в руки»), «Подъём» без и с блокировкой; «Пауза» останавливает; уход на `#parts/frame` и обратно 3 раза — скорость та же, консоль чистая; эмуляция `prefers-reduced-motion` — стоит до «Пуск».
- [ ] **Step 6:** Commit `feat(guide): animated spring and air forks with lockout`.

### Task 4: Выпуск этапа

- [ ] **Step 1:** `node --test` — зелёный; финальные скриншоты.
- [ ] **Step 2:** Ревью ветки субагентом на opus; исправить подтверждённое.
- [ ] **Step 3:** docx продавцу `info/Feedback 3/Решения/Фитстенд - анимация вилки.docx` (что видно в анимации, как пользоваться, что проверить); строку «Вилка: … с анимацией» в `info/Фитстенд - требования.docx` → «Сделано».
- [ ] **Step 4:** Спросить «да» на мерж в main и push.
