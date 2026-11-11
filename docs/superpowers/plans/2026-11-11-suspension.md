# Вилка и амортизатор — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** три подстраницы в «Вилка и амортизация» (пружинная вилка, воздушная вилка, задний амортизатор) с видами, поломками, блоком «Как использовать» и местом под схему принципа работы.

**Architecture:** повторяем механизм `details` узла «Трансмиссия»: записи в `parts.fork.details`, вывод в `detailView` (`guide.js`). Новые поля записи: `usage` (блок «Как использовать»), `schema` (SVG принципа), `hl`/`style` (подсветка и вид велосипеда на странице); у видов — `terrain`. Амортизатор в `draw.js` становится отдельной подсвечиваемой частью.

**Tech Stack:** ванильный JS, `node --test` (без пути на Windows), service worker, SVG/webp.

**Spec:** `docs/superpowers/specs/2026-11-11-suspension-design.md`

## Global Constraints

- Тексты на русском, простыми словами, для новичка; только в `content.js` (данные), разметка — в `guide.js`.
- Никаких марок и названий фирм (тест «no brands»); название магазина и имя продавца не писать.
- Масляный демпфер на пружинно-эластомерной вилке не показывать; блокировка эластомерной вилки зажимает эластомер, пружина остаётся на месте; у воздушной блокировка — часть демпфера, воздух остаётся в камерах.
- После изменения файлов: `VERSION` в `sw.js` → `fitstand-v16` и `tests/sw.test.js`; `node --test` зелёный.
- Пуш/мерж в main — только после слова «да» от пользователя.
- Ветка: `feedback5-suspension`.

## Review Focus

- Страница `#parts/fork/rearShock` при любом стиле, выбранном на главной (хардтейл, город): схема должна быть двухподвесом, иначе амортизатор не виден.
- Отсутствующий файл картинки (схема, фото вида): страница без битой картинки (`data-opt`).
- Старый адрес `#parts/fork` и ссылки на вилку из опроса/результата открываются; блок «Настройки воздушной вилки» не теряется (переезд, не удаление).
- Подсветка вилки на двухподвесе не прячет амортизатор (подсвечивается вся подвеска).
- Запись без `usage`/`schema`/`terrain` (трансмиссия) выводится как раньше.

---

### Task 1: Амортизатор — отдельная подсвечиваемая часть

**Files:**
- Modify: `draw.js:144-147` (блок `if(g.rearShock)`)
- Test: `tests/draw.test.js`

**Interfaces:**
- Produces: в разметке двухподвеса есть группа `<g data-part="fork" data-d="rearShock">` (с `data-on`, если `highlight` равен `'fork'` или `'fork:rearShock'`); у стилей без `rearShock` её нет.

- [ ] **Step 1: Failing tests** в `tests/draw.test.js` (по образцу `dGroups`): `rear shock is its own fork detail on a full-suspension bike` — разметка стиля `fullsus` содержит ровно одну `data-part="fork" data-d="rearShock"`; без highlight без `data-on`; при `highlight:'fork:rearShock'` и при `'fork'` — с `data-on`; при `highlight:'frame'` — без; разметка стиля `mtb` такой группы не содержит; `data-k="rearShock"` остался внутри.
- [ ] **Step 2:** `node --test` — новые тесты падают.
- [ ] **Step 3:** в `bikeMarkup` вынести фрагмент амортизатора из `fr` в отдельную строку `sh` и добавить `s+=part('fork',sh,'rearShock')` сразу после `s+=part('frame',fr)`. Геометрия не меняется. `part()` включает `data-on` при `hl===name`, поэтому `'fork'` подсвечивает и амортизатор, а `'fork:rearShock'` — только его.
- [ ] **Step 4:** `node --test` — всё зелёное (включая существующие тесты подсветки).
- [ ] **Step 5:** `git add draw.js tests/draw.test.js && git commit -m "feat(draw): rear shock as its own fork detail"`

### Task 2: `detailView` — usage, schema, terrain, hl/style

**Files:**
- Modify: `guide.js` (`schemaImg` рядом с `detailImg`; `detailView`, строки ~252-262; экспорт в `api`)
- Test: `tests/guide.test.js`

**Interfaces:**
- Produces: `schemaImg(id: string): string` → `img/details/${id}-schema.svg`, экспортируется как `detailImg`.
- Поля записи детали, которые понимает `detailView`: `schema: true` (секция «Принцип работы» с картинкой `schemaImg(id)`, `alt` = название + « — принцип работы»); `usage: [{title, list}]` (секция «Как использовать», на каждый элемент h3 + список); `hl: string` (заменяет `${pid}:${id}` в подсветке); `style: string` (заменяет стиль велосипеда из состояния); у `kinds[]` — `terrain` (строка «Для каких трасс: …» после описания вида).
- Порядок секций: Что это, Как работает, Принцип работы, Виды, Частые поломки, Уход, Как использовать, `more`.

- [ ] **Step 1: Failing tests** в `tests/guide.test.js`: `schemaImg('springFork') === 'img/details/springFork-schema.svg'`; `parseRoute('#parts/fork/rearShock', {parts:{fork:{details:[{id:'rearShock'}]}}})` → `{view:'detail', part:'fork', id:'rearShock'}`. Разметка `detailView` в Node не рендерится (она внутри `init`), поэтому по образцу `detail page plumbing` проверить исходник `guide.js`: в нём есть `d.usage`, `d.schema`, `d.hl`, `d.style`, `k.terrain`.
- [ ] **Step 2:** `node --test` — падает.
- [ ] **Step 3:** в `detailView`: `bike(d.style || st.style, st.motor, d.hl || \`${pid}:${id}\`, 'pg-bike', true)`; остальные секции по Interfaces. Схема — через `pic(..., 'var-photo schema')`, чтобы отсутствующий файл тихо убирался.
- [ ] **Step 4:** `node --test` зелёное. В браузере проверить `#parts/drivetrain/chain` — без изменений.
- [ ] **Step 5:** commit `feat(guide): usage, schema, terrain and highlight overrides in detail pages`

### Task 3: Страница «Пружинная вилка»

**Files:**
- Modify: `content.js` (`parts.fork.details`, новый ключ рядом с `variants`/`more`)
- Test: `tests/content.test.js`

**Interfaces:**
- Consumes: поля из Task 2.
- Produces: запись `id:'springFork'`, `hl:'fork'`, `schema:true`.

- [ ] **Step 1: Failing test** `fork details: spring fork page`: запись есть; `short`, `text` непустые; `kinds` с именами `['Пружинно-эластомерная','Пружинно-масляная','Простая пружинная']`, у каждого `text`, `terrain`, 1–3 плюса и минуса; `usage` с заголовками `['Рекомендации по использованию','Зачем нужна блокировка','Настройки','Возможные поломки','Ремонт']` по порядку, в каждом `list.length >= 2`; пункты блокировки упоминают «эластомер» и не содержат «отключ» (пружина остаётся на месте).
- [ ] **Step 2:** падает.
- [ ] **Step 3:** написать запись: эластомерная — дешёвая, отдача без точной настройки; масляная — гасит отскок; простая — без демпфера. Блокировка: шток зажимает эластомер, ход ограничен. Ремонт: смазка, замена эластомера и пружины, что нельзя делать самому.
- [ ] **Step 4:** `node --test` зелёный; открыть страницу, посмотреть вручную.
- [ ] **Step 5:** commit `feat(content): spring fork page`

### Task 4: Страница «Воздушная вилка» и переезд настроек

**Files:**
- Modify: `content.js` (запись в `parts.fork.details`; из `parts.fork.more` убрать блок «Настройки воздушной вилки», его список перенести в `usage` воздушной вилки)
- Test: `tests/content.test.js` (строка ~81: заголовки `more` вилки теперь `['Блокировка']`)

**Interfaces:**
- Produces: запись `id:'airFork'`, `hl:'fork'`, `schema:true`.

- [ ] **Step 1: Failing tests:** `fork.more` заголовки `['Блокировка']`; запись `airFork`: 2–3 вида (`name`, `text`, `terrain`, плюсы/минусы); `breaks.length >= 3` (с `name`, `text`); `usage` с заголовками `['Рекомендации по использованию','Зачем нужна блокировка','Настройки','Ремонт своими руками']`; в «Настройки» ≥ 5 пунктов (перенесены 6 из старого блока); блокировка упоминает «демпфер» и «воздух».
- [ ] **Step 2:** падает.
- [ ] **Step 3:** написать запись; виды без марок (например: с масляным картриджем; с переключателем хода; двухкамерная с отдельной настройкой). Ремонт своими руками: давление, чистка и смазка пыльников и сальников, замена масла в нижних ногах; когда нести в мастерскую.
- [ ] **Step 4:** `node --test` зелёный; проверить, что ссылки на `#parts/fork` из опроса/результата открываются.
- [ ] **Step 5:** commit `feat(content): air fork page; settings moved from the fork overview`

### Task 5: Страница «Задний амортизатор»

**Files:**
- Modify: `content.js` (запись `rearShock`)
- Test: `tests/content.test.js`

**Interfaces:**
- Produces: запись `id:'rearShock'`, `hl:'fork:rearShock'`, `style:'fullsus'`, `schema:true`.

- [ ] **Step 1: Failing test:** запись есть; `style === 'fullsus'`, `hl === 'fork:rearShock'`; `how` непустой; виды `['Пружинный','Воздушный','Эластомерный']` с `terrain` и указанием, для каких велосипедов; `usage` с теми же пятью заголовками, что у пружинной вилки.
- [ ] **Step 2:** падает.
- [ ] **Step 3:** написать запись; в `how` — шток, пружина/воздух, демпфер, блокировка; сказать, что амортизатор стоит на двухподвесе.
- [ ] **Step 4:** `node --test`; открыть `#parts/fork/rearShock` при выбранном «Город» — схема двухподвес, амортизатор подсвечен.
- [ ] **Step 5:** commit `feat(content): rear shock page`

### Task 6: Карточки в обзоре вилки и «как пользоваться» велошифтом

**Files:**
- Modify: `content.js` (`drivetrain.details.shifters` — новый `usage`)
- Test: `tests/content.test.js`

- [ ] **Step 1: Failing test:** у детали `shifters` есть `usage` с заголовком `'Как пользоваться велошифтом'` и ≥ 3 пунктами.
- [ ] **Step 2:** падает.
- [ ] **Step 3:** добавить `usage`: поворачивайте, ослабив нажим на педали; не сжимайте ручку сильнее нужного; по одной передаче за раз; в какую сторону легче — «в сторону, где педали крутить легче». Вручную проверить, что `partView` вилки показывает карточки трёх подстраниц в «Деталях».
- [ ] **Step 4:** `node --test` зелёный.
- [ ] **Step 5:** commit `feat(content): twist shifter usage`

### Task 7: Промпты, тесты картинок, кэш v16

**Files:**
- Create: `info/image-prompts-etap5.md` (gitignored, не коммитится)
- Modify: `sw.js`, `tests/sw.test.js`, `tests/images.test.js`

- [ ] **Step 1:** `info/image-prompts-etap5.md`: (1) задание продавца про пружинно-эластомерную вилку дословно из `Feedback 5.doc`, файл `springFork-schema.svg`; (2) про воздушную вилку дословно, `airFork-schema.svg`; (3) такое же по образцу для заднего амортизатора (продольный разрез, 4 состояния, блокировка зажимает демпфер, без марок), `rearShock-schema.svg`; (4) промпты фото: по одному на каждый вид и по одному на каждую из трёх страниц, имена по `image-prompts-etap4.md`, без марок и надписей.
- [ ] **Step 2:** `tests/images.test.js`: пока файлов нет, `detailPics()` пропускает детали с `schema:true` (комментарий «картинки этапа 5 ещё не получены — убрать, когда файлы в img/details»); отдельный тест `schema pictures` для каждой схемы: если файл есть — это SVG без брендов, если нет — `skip`.
- [ ] **Step 3:** `sw.js` → `fitstand-v16`, `tests/sw.test.js` → v16.
- [ ] **Step 4:** `node --test` зелёный.
- [ ] **Step 5:** commit `chore: image tests tolerate pending stage 5 pictures; cache v16`
- [ ] **Step 6:** сообщить пользователю, что промпты готовы; встраивание файлов — отдельная задача после их получения (убрать исключение из теста, перекодировать фото в webp).

### Task 8: Документ для продавца, требования, итоговая проверка

**Files:**
- Create: `info/Feedback 5/Решения/Фитстенд - вилка и амортизатор.docx` (gitignored)
- Modify: `info/Фитстенд - требования.docx` (статусы 5.14–5.17; пометка «отдельный этап» у 7.5–7.6)

- [ ] **Step 1:** короткий документ простым русским: что появилось (3 страницы), что ждёт (схемы и фото), вопросы продавцу: подходят ли виды пружинной/воздушной вилки и амортизатора, не нужны ли другие.
- [ ] **Step 2:** обновить статусы и итоговую строку в требованиях.
- [ ] **Step 3:** один итоговый обзор ветки отдельным субагентом на сильной модели; исправить найденное.
- [ ] **Step 4:** `node --test` зелёный; руками пройти три страницы и главную.
- [ ] **Step 5:** показать итог пользователю и ждать «да» на мерж/пуш в main.
