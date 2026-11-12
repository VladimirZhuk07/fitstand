# Сцены езды, релиз B — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** своя сцена езды для оставшихся шести видов главной: гибрид, женский, грэвел (пыль), циклокросс (грязь), трековый (наклон виража), складной.

**Architecture:** продолжение релиза A: записи в `SCENES` (`ride.js`), имена строителей слоёв в `BUILD`, подкраска `#bike[data-scene=…]` в `index.html`. Новое: эффект `mud` рядом с `dust`, поле `tilt` у сцены и обёртка `#tiltWrap` вокруг фона и велосипеда.

**Tech Stack:** ванильный JS, `node --test` (без пути на Windows), SVG, CSS `color-mix`, headless Chrome для визуальной проверки. Картинки не нужны: всё рисуется кодом.

**Spec:** `docs/superpowers/specs/2026-11-12-ride-scenes-design.md` (раздел «Релиз B»); релиз A уже в main (`ride.js`, `tests/ride.test.js` — шаблон для всех задач).

## Global Constraints

- Тексты и подписи на русском; никаких марок, названия магазина и имени продавца.
- Каденс не меняется: `RIDE.CRANK_REVS = 12` за 9 с; у каждой сцены целое число оборотов колеса и дорога в такт колесу (проверяют циклы по `SCENE_IDS` и `R2` в тестах).
- Скорости из отзыва, км/ч: гибрид 18–22, женский 12–16, грэвел 22–25, циклокросс 22–26, трековый 35–40, складной 12–15.
- Новые элементы строятся тайлами в границах тайла (x, y, эллипсы, пути); в разметке нет литералов `#`-цветов — только CSS-переменные и классы.
- Размытие по глубине, три слоя и дорога, цикл 9 с — как в релизе A.
- Только 10 видов `FIT_STYLES`; неизвестный вид → `'default'`.
- После изменений: `VERSION` в `sw.js` → `fitstand-v18` и `tests/sw.test.js`; `node --test` зелёный.
- Пуш/мерж в main — только после слова «да». Ветка: `feedback5-ride-b`.

## Review Focus

- Трек с наклоном: при повороте на 4° по краям окна не видно края фона ни на узком, ни на широком `viewBox`. Тест в задаче 5.
- Смена грэвел → циклокросс → шоссе: группа эффекта `#fx` пересобирается (класс `fx-dust` / `fx-mud` / нет группы), `applyFx` не падает на отсутствующей группе. Тест в задаче 4.
- Маленькие колёса (складной 20″, `wheelR` 203 и 152.5): тайлы слоёв 2400–5000, `wheelRevs >= 1` для всех новых сцен. Покрывают циклы по `R2` в задаче 1.
- «Рваный» ритм циклокросса: тряска зациклена без шва (целые периоды). Покрывает тест «roughness» в задаче 1.
- Тёмная тема: шесть новых подкрасок читаемы. Визуальная проверка в задаче 6.

---

### Task 1: Шесть сцен в таблице и маппинг видов

**Files:**
- Modify: `ride.js` (`SCENES`, `STYLE_SCENE`)
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: `sceneOf` теперь возвращает для `hybrid → 'hybrid'`, `women → 'women'`, `gravel → 'gravel'`, `cx → 'cx'`, `track → 'track'`, `folding → 'folding'` (остальное как в релизе A; неизвестное → `'default'`). Записи `SCENES` с полями `kmh`, `bounce`, `effect`, `layers`, и новым необязательным `tilt` (градусы, число; отсутствует = 0).
- Значения:
  - `hybrid`: `kmh 20`, `bounce [[1.5,13,0],[1.5,29,0.7]]`, `effect 'none'`, `layers {far:'default', mid:'park', near:'verge', road:'cracks'}`.
  - `women`: `kmh 14`, `bounce [[0.8,13,0],[0.8,29,0.7]]`, `effect 'none'`, `layers {far:'water', mid:'promenade', near:'flowers', road:'tiles'}`.
  - `gravel`: `kmh 23.5`, `bounce [[2.2,9,0],[1.8,23,0.7]]`, `effect 'dust'`, `layers {far:'fields', mid:'fence', near:'gravel', road:'gravelroad'}`.
  - `cx`: `kmh 24`, `bounce [[3,7,0],[2.5,19,0.7],[2,37,1.9]]`, `effect 'mud'`, `layers {far:'woodline', mid:'course', near:'mudgrass', road:'mud'}`.
  - `track`: `kmh 37.5`, `bounce [[0.3,13,0],[0.3,29,0.7]]`, `effect 'none'`, `tilt 4`, `layers {far:'stands', mid:'rail', near:'trackline', road:'wood'}`.
  - `folding`: `kmh 13.5`, `bounce [[1,13,0],[1,29,0.7]]`, `effect 'none'`, `layers {far:'harbour', mid:'quay', near:'cobbles', road:'tiles'}`.
  Пока строителей нет, `layerInner` уходит в `default` (так задумано).

- [ ] **Step 1: Failing tests** в `tests/ride.test.js`: `SCENE_IDS` расширить всеми десятью идентификаторами (`default, road, city, mtb, hybrid, women, gravel, cx, track, folding`), `KMH` — диапазонами выше; `sceneOf` для `hybrid, women, gravel, cx, track, folding` возвращает свои id (старое ожидание `women/track → default` заменить), для `undefined, '__proto__', 'bmx'` — `default`; `SCENES.track.tilt === 4`, у остальных `tilt` отсутствует или `0`; существующие циклы по `SCENE_IDS` (скорость, согласованность колеса/дороги/слоёв, шум, NaN при смене сцены) должны пройти на всех десяти.
- [ ] **Step 2:** `node --test` — новые утверждения падают.
- [ ] **Step 3:** добавить записи и маппинг в `ride.js` по Interfaces.
- [ ] **Step 4:** `node --test` зелёный. Открыть главную, выбрать каждый вид: едет без ошибок (новые сцены пока рисуются прежним фоном).
- [ ] **Step 5:** commit `feat(ride): scene table for the other six styles`

### Task 2: Гибрид и женский

**Files:**
- Modify: `ride.js` (строители), `index.html` (подкраска и классы)
- Test: `tests/ride.test.js`

**Interfaces:**
- Consumes: `BUILD[layer][name]` и `layerInner` из релиза A; сигнатура строителя `(tile: number, h: number) => string`.
- Produces: `BUILD.mid.park` (кусты, штакетник, указатели, редкие дома; классы `rb-bush`, `rb-fence`, `rb-sign`, `rb-post`), `BUILD.near.verge` (трава обочины и мелкие камни: `rb-grass`, `rb-boulder`), `BUILD.road.cracks` (асфальт, трещины и плотная грунтовка местами: `rb-road`, `rb-crack`, `rb-speck`), `BUILD.far.water` (вода и крыши вдали: `rb-water`, `rb-hill2`), `BUILD.mid.promenade` (клумбы, скамейки, фонари, декоративные кусты: `rb-flower`, `rb-bench`, `rb-lamp`, `rb-bush`), `BUILD.near.flowers` (цветы и трава: `rb-flower`, `rb-grass`). Для женского дорога `tiles` (уже есть). Новые классы: `rb-fence`, `rb-crack`, `rb-water`. Подкраска `#bike[data-scene="hybrid"]{--tint:#9CC08A;--tk:18%}`, `#bike[data-scene="women"]{--tint:#F3C9A8;--tk:20%}`.

- [ ] **Step 1: Failing tests:** `bg('hybrid')` содержит `rb-fence`, `rb-crack`, `rb-sign`; `bg('women')` — `rb-water`, `rb-flower`, `rb-bench`, `rb-tile`; ни одна не содержит `rb-barrier`/`rb-house`; обе сцены носят свой `data-scene`; регулярка подкраски в `index.html` для каждой; общие проверки «patterns stay inside their tile» и «paths inside the tile» уже идут по `SCENE_IDS`.
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители и CSS (цвета только через переменные темы и `color-mix` с `--tint`).
- [ ] **Step 4:** `node --test` зелёный; headless-скриншоты светлой и тёмной темы для двух видов.
- [ ] **Step 5:** commit `feat(ride): hybrid and women scenes`

### Task 3: Грэвел и циклокросс (сцены без эффектов)

**Files:**
- Modify: `ride.js`, `index.html`
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: `BUILD.far.fields` (поля полосами и линия леса: `rb-hill2`, `rb-hill`, `rb-treeline`), `BUILD.mid.fence` (столбы, изгороди, редкие деревья: `rb-post`, `rb-fence`, `rb-tree`), `BUILD.near.gravel` (гравий и трава: `rb-boulder`, `rb-grass`), `BUILD.road.gravelroad` (плотная грунтовка с колеёй и крупной крошкой: `rb-road`, `rb-rut`, `rb-speck`), `BUILD.far.woodline` (лесополоса и холмы: `rb-hill2`, `rb-treeline`), `BUILD.mid.course` (деревья, колышки разметки трассы и флажки: `rb-tree`, `rb-stake`, `rb-flag`), `BUILD.near.mudgrass` (трава и пятна грязи: `rb-grass`, `rb-mud`), `BUILD.road.mud` (грязь с колеёй: `rb-road`, `rb-rut`, `rb-mud`). Новые классы: `rb-rut`, `rb-stake`, `rb-flag`, `rb-mud`. Подкраска: `gravel` `#E8B86E` 22 %, `cx` `#8FA8B8` 20 %.

- [ ] **Step 1: Failing tests:** `bg('gravel')` содержит `rb-rut`, `rb-fence`, `rb-boulder`; `bg('cx')` — `rb-flag`, `rb-stake`, `rb-mud`, `rb-rut`; ни одна не содержит `rb-barrier`/`rb-house`; `data-scene` и подкраска для обеих; границы тайла проходят.
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители и CSS.
- [ ] **Step 4:** `node --test` зелёный; скриншоты двух видов в двух темах.
- [ ] **Step 5:** commit `feat(ride): gravel and cyclocross scenes`

### Task 4: Эффект «грязь» и выбор эффекта по сцене

**Files:**
- Modify: `ride.js` (`effectPuffs`, `fxMarkup`), `index.html` (CSS)
- Test: `tests/ride.test.js`

**Interfaces:**
- Consumes: `effectPuffs(t, sceneId)`, `fxMarkup(sceneId)`, `applyFx(svg, puffs, w)` из релиза A.
- Produces: `effectPuffs(t, 'cx')` — 6 комьев: `{dx, dy, r, o}` с `dx = -(30 + u*220)`, `dy = 40 + 220u - 260u²` (взлетает и падает, `>= 0`), `r = 10 + 8(1-u)`, `o = 0.8(1-u²)`, где `u = (tau*6 + i/6) % 1`; зациклен на 9 с, живёт 9/6 с; `effectPuffs(t, 'gravel')` — пыль как у MTB; для остальных `[]`. `fxMarkup('cx')` рисует `<g id="fx">` с шестью `circle class="fx-mud"`, `fxMarkup('gravel'|'mtb')` — `fx-dust`, остальные `''`. CSS: `.fx-mud{fill:color-mix(in srgb,var(--trunk) 85%,black)}`.

- [ ] **Step 1: Failing tests:** для `cx`: 6 комьев, `dx < 0`, `dy >= 0`, `o` в [0, 0.8], `r > 0`; периодичность на 9 с и на 9/6 с (по образцу теста пыли); `dy` комка в середине жизни (`u = 0.5`) больше, чем в начале и в конце; `effectPuffs(t,'gravel')` — 6 клубов; `fxMarkup('cx')` содержит `fx-mud` и не содержит `fx-dust`; `fxMarkup('gravel')` — наоборот; `applyFx` с пустым массивом скрывает группу.
- [ ] **Step 2:** падают.
- [ ] **Step 3:** обобщить `effectPuffs`/`fxMarkup` по `SCENES[id].effect` (`'dust'` и `'mud'`), оставив прежнее поведение MTB.
- [ ] **Step 4:** `node --test` зелёный; скриншот `cx` и `gravel` (в `dump-dom` видны `fx-0…fx-5`).
- [ ] **Step 5:** commit `feat(ride): mud effect, dust for gravel`

### Task 5: Трековый и складной, наклон виража

**Files:**
- Modify: `ride.js` (строители), `index.html` (обёртка `#tiltWrap`, CSS, `rebuild`)
- Test: `tests/ride.test.js`

**Interfaces:**
- Produces: `BUILD.far.stands` (трибуны ступенями и фермы крыши: `rb-stand`, `rb-hill2`), `BUILD.mid.rail` (перила, разметка, флаги: `rb-barrier`, `rb-flag`), `BUILD.near.trackline` (линии разметки: `rb-marking`), `BUILD.road.wood` (деревянные доски со швами: `rb-plank`, `rb-roadedge`), `BUILD.far.harbour` (вода, причалы, крыши: `rb-water`, `rb-hill2`), `BUILD.mid.quay` (кнехты, фонари, лодки: `rb-lamp`, `rb-bench`, `rb-boat`), `BUILD.near.cobbles` (брусчатка и бордюр: `rb-tile`, `rb-boulder`). Новые классы: `rb-stand`, `rb-plank`, `rb-boat`. Подкраска: `track` `#B9CBE0` 20 %, `folding` `#F0D9A8` 18 %.
- Наклон: `<g id="tiltWrap">` содержит `<g id="rideBgWrap">` и `<g id="scene">`; `rebuild()` ставит `transform="rotate(-tilt cx cy)"`, где `tilt = SCENES[sceneId].tilt || 0`, `cx = (refs.pts.R.x + refs.pts.F.x) / 2`, `cy = -refs.pts.ground`; при `tilt = 0` атрибут убирается.

- [ ] **Step 1: Failing tests:** `bg('track')` содержит `rb-stand`, `rb-plank`, `rb-flag`, не содержит `rb-house`; `bg('folding')` — `rb-water`, `rb-boat`, `rb-tile`; подкраска и `data-scene`; `index.html` содержит `id="tiltWrap"` с вложенными `rideBgWrap` и `scene` (порядок), и код `rotate(-` с `tilt`; **края фона при наклоне**: для `VIEW` и для узкого `{x:-500,y:-1700,w:1200,h:2000}` четыре угла окна, повёрнутые на `+4°` вокруг `(cx, groundY)`, лежат внутри прямоугольника неба/верги `rideBgMarkup` (вычислить из `rb-sky` и `rb-verge`).
- [ ] **Step 2:** падают.
- [ ] **Step 3:** реализовать строители, CSS и обёртку; если фон не покрывает углы при 4° — расширить прямоугольники фона в `rideBgMarkup` (`W`, `Y0`, `bottom`) так, чтобы тест прошёл.
- [ ] **Step 4:** `node --test` зелёный; headless-скриншоты `track` (светлая и тёмная тема). **Решение:** если наклон на скриншоте читается плохо (велосипед выглядит падающим, дорога «съезжает»), поставить `track.tilt = 0`, записать `Ruling:` в ledger и поправить тест `SCENES.track.tilt`.
- [ ] **Step 5:** commit `feat(ride): track and folding scenes, bank tilt`

### Task 6: Подготовка релиза B — кэш, документ, требования, итоговая проверка

**Files:**
- Modify: `sw.js`, `tests/sw.test.js`
- Create: `info/Feedback 5/Решения/Фитстенд - езда по видам, вторая часть.docx` (в gitignore); обновить `info/Фитстенд - требования.docx`

- [ ] **Step 1:** `sw.js` → `fitstand-v18`, `tests/sw.test.js` → v18; `node --test` зелёный; commit `chore: cache v18`.
- [ ] **Step 2:** документ для продавца: шесть новых сцен (по строке на вид: покрытие, свет, скорость, акцент), как смотреть, вопросы (подходят ли цвета и скорость, не слишком ли заметна пыль и грязь, наклон на треке читается или мешает).
- [ ] **Step 3:** в требованиях: 7.6 → «Сделано» (десять видов), 7.4 → «Сделано»; пересчитать итоговую строку.
- [ ] **Step 4:** headless-осмотр всех десяти сцен в обеих темах (скриншоты), смена видов подряд; записать замечания.
- [ ] **Step 5:** один итоговый обзор всей ветки отдельным субагентом на сильной модели (Review Focus из плана приложить дословно), исправить найденное по TDD.
- [ ] **Step 6:** `node --test` зелёный; показать пользователю итог и ждать «да» на мерж/пуш в main.
