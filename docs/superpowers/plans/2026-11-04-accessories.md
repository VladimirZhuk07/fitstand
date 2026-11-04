# Аксессуары и их подбор — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** каталог ~65 аксессуаров в 10 группах и подбор 3–5 штук по ответам опроса.

**Architecture:** данные в `content.js`; чистые `accSituations` и `recommendAccessories` в `quiz.js`; экраны в `guide.js`.

**Tech Stack:** ванильный JS, `node --test`, headless Edge.

**Spec:** `docs/superpowers/specs/2026-11-04-accessories-design.md`

## Global Constraints

- Без брендов и цен; все тексты в `content.js`.
- Ветка `feature/types` (продолжение подпроекта A); общее ревью A+B в конце; кэш `fitstand-v6`.
- Существующие тесты остаются зелёными.

## Review Focus

1. **Человек без ответов о багаже и травмах:** «Что взять» — шлем и два фонаря плюс 0–2 позиции, без пустых ситуаций. Тест `minimal answers` (Task 2).
2. **Неизвестный `#acc/<id>`:** открывается список. Тест `parseRoute acc` (Task 3).
3. **Опрос не пройден:** блоков аксессуаров нет, результат перенаправляет на вопрос как раньше. Браузер (Task 3).

---

### Task 1: Данные аксессуаров

**Files:** `content.js`, `tests/content.test.js`

**Produces:** `CONTENT.accGroups`, `CONTENT.accessories`, `CONTENT.accSituationTitles` (спецификация 2–3); пункт меню `{id:'acc', title:'Аксессуары', short:'Шлем, фонари, замки, сумки, одежда и уход'}` после `parts`.

- [ ] **Step 1: Тесты:** `acc groups` — 10 групп по спецификации с иконками и заголовками, секции `safety` и `repair` с заголовками; `acc items` — каждая позиция ровно в одной секции, все поля по таблице 2, `short` ≤ 70, `priority` 1–3, `when` = `'always'` или массив из ситуаций спецификации 3; `always` ровно у `helmet`, `frontLight`, `rearLight`; `kinds` у шлема, фонарей, звонка, перчаток, очков, насоса, велосумок, бутылки, крыльев, педалей, велотуфель, велокомпьютера, смазки, багажника, детского кресла, автокреплений; `choose` у шлема, фонарей, велотуфель, педалей, детского кресла, детского шлема; `weather` у всей одежды; `menu items` — добавить `acc`.
- [ ] **Step 2:** FAIL. **Step 3:** Написать данные. **Step 4:** PASS. **Step 5:** Commit `feat(content): accessories catalog with groups, kinds, how-to-choose and pick rules`.

### Task 2: Подбор

**Files:** `quiz.js`, `tests/quiz.test.js`

**Produces:** `accSituations(A, C):Set<string>`, `recommendAccessories(A, C):{top:[id], bySituation:[{id,title,ids}]}` по спецификации 3–4; экспорт обоих.

- [ ] **Step 1: Тесты:** `situations from answers` (по строке на ситуацию); `minimal answers` (Review Focus 1); `safety first and 3–5 items`; `luggage brings rack and bags` (`q6=0` → `rack`, `bags` в `touring`); `wrists bring grips`; `back brings suspension seatpost`; `child seat brings kids items`.
- [ ] **Step 2:** FAIL. **Step 3:** Реализовать. **Step 4:** PASS. **Step 5:** Commit `feat(quiz): accessory situations and recommendations`.

### Task 3: Экраны

**Files:** `guide.js`, `index.html`, `tools/content-review.mjs`, `sw.js`, `tests/guide.test.js`, `tests/sw.test.js`

**Produces:** маршруты `{view:'acc'}`, `{view:'accItem', id}`; меню; экран групп; карточка; блок «Что взять» и «По ситуациям» в результате; строка в программе; аксессуары на детских видах; выгрузка; `fitstand-v6`.

- [ ] **Step 1: Тесты:** `parseRoute acc` (`#acc`, `#acc/helmet`, `#acc/xyz` → `acc`); `cache version is v6`.
- [ ] **Step 2:** FAIL. **Step 3:** Реализовать. **Step 4:** PASS.
- [ ] **Step 5: Браузер:** меню → «Аксессуары» → 10 групп; карточка шлема с видами и «Как выбрать»; результат опроса с багажником → «Что взять» 5 позиций, «Для туринга»; программа со строкой «Перед первой поездкой»; `#types/balance` — детские аксессуары; без ошибок JS; телефон и десктоп.
- [ ] **Step 6:** Commit `feat(guide): accessories catalog, picks in the result and riding program`.
