# Реалистичные картинки видов, ободов и покрышек — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 31 реалистичная картинка (21 вид, 4 обода, 6 покрышек) в приложении; в каталоге видов — фото вместо схемы с запасным вариантом «схема».

**Architecture:** конвертер `tools/convert-images.py` (правило `type-`, обрезка 3:2, ключи `--raw`, `--dry-run`); промпты `tools/make-image-prompts.js` (словарь `TYPES`, раздел «Этап 3»); экраны `guide.js` + CSS `index.html`. Картинки делает пользователь в Cursor между Task 4 и Task 5.

**Tech Stack:** ванильный JS, Python 3 + Pillow, `node --test` (из корня, без аргумента), headless Edge (`%TEMP%/fitstand-build/cdp.mjs`).

**Spec:** `docs/superpowers/specs/2026-11-05-realistic-images-design.md`

## Global Constraints

- Без брендов, надписей, логотипов на картинках; без людей.
- Файлы картинок ≤ 120 КБ (тест `images`).
- Ветка `feedback3-images`; кэш `fitstand-v10`; мерж и push — после «да».
- `info/` и `img/raw/` не в git.

## Review Focus

1. **Картинка вида не загрузилась (нет файла, офлайн без кэша):** на карточке и странице видна схема, без пустого места и «битой» картинки. Браузер без файлов (Task 3).
2. **Велосипед обрезан по краям после 3:2:** колёса целиком в кадре. Просмотр каждой картинки (Task 5).
3. **Тёмная тема:** белый фон фото — в рамке, не «дыра» на тёмной странице. Скриншот (Task 3).
4. **Узкий экран 360 px:** две карточки в ряд, фото не растягивает карточку. Скриншот (Task 3).
5. **Повторный запуск конвертера:** не трогает уже сделанные `acc-`/`part-` (результат тот же), новые `type-` добавляются. Тест `--dry-run` (Task 1).

---

### Task 1: Конвертер для видов

**Files:** `tools/convert-images.py`, `tests/tools.test.js`

**Produces:** правило `type-<id>.png` → `img/types/<id>.webp`, центр-обрезка до 3:2 и `720×480`; остальные — `512×512`, как сейчас. Ключи: `--raw <dir>` (по умолчанию `img/raw`), `--dry-run` — печатает по строке JSON `{"source", "target", "size": [w, h]}` на задание и ничего не пишет.

- [ ] **Step 1: Тест** `convert plan: types are 3:2, the rest square` — временная папка с пустыми `type-city.png`, `part-rims-0.png`, `acc-helmet.png`, `notes.txt`; запуск `python tools/convert-images.py --raw <tmp> --dry-run`; ровно 3 строки; цели оканчиваются на `img/types/city.webp` (`[720, 480]`), `img/parts/rims-0.webp` (`[512, 512]`), `img/acc/helmet.webp` (`[512, 512]`). Тест пропускается (`t.skip`), если `python` не запускается.
- [ ] **Step 2:** FAIL. **Step 3:** код (обрезка: `min(w, h·3/2)` по ширине, по центру). **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(tools): convert type pictures to 3:2`.

### Task 2: Промпты видов

**Files:** `tools/make-image-prompts.js`, `tests/tools.test.js`

**Produces:** `TYPES` — английские описания всех 21 вида по таблице спецификации 2.1; `TYPE_STYLE` — дополнение к стилю (строгий профиль, переднее колесо справа, велосипед во всю ширину, по центру по высоте, запас сверху и снизу); проверка `no prompt for type <id>` (исключение). В markdown — раздел «Этап 3: виды, обода, покрышки» (31 строка: `type-<id>.png` ×21, `part-rims-0..3.png`, `part-tyres-0..5.png`) с `TYPE_STYLE` и инструкцией для Cursor; старые разделы без изменений.

- [ ] **Step 1: Тест** `image prompts cover every part variant` дополнить: в markdown есть раздел «Этап 3», в нём `type-<id>.png` для каждого вида и все `part-rims-*`, `part-tyres-*`; новый `prompts fail on a type without a prompt` — копия `content.js` во временной папке с лишним видом `xyz` → скрипт завершается с ошибкой, в stderr `no prompt for type xyz`.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5:** Commit `feat(tools): prompts for bike types, rims and tyres`.

### Task 3: Фото на карточках и страницах видов

**Files:** `guide.js`, `index.html` (CSS), `sw.js`, `tests/guide.test.js`, `tests/sw.test.js`

**Produces:**
- `typeCard(id)`: `<img class="type-thumb" src="img/types/<id>.webp" alt="<name>" loading="lazy" decoding="async" data-opt>` **перед** схемой; CSS `.card .type-thumb + .card-bike{display:none}` — пока фото есть, схема скрыта; удалили фото (`data-opt`) — схема видна.
- `typeView(id)`: `<img class="type-photo" …data-opt>` перед схемой `.pg-bike`; схема остаётся.
- CSS: `.type-thumb` (ширина 100%, `aspect-ratio: 3/2`, `object-fit: contain`, белый фон, скругление, как `.acc-thumb`); `.type-photo` (как `.acc-photo`, но 3:2, `max-width: 560px`).
- `sw.js`: `fitstand-v10`.

- [ ] **Step 1: Тесты.** `guide`: в `guide.js` есть `img/types/${id}.webp` и `type-thumb`, `type-photo`; `highlight`: в `index.html` есть правило `.card .type-thumb + .card-bike{display:none}`; `sw`: v10.
- [ ] **Step 2:** FAIL. **Step 3:** код. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** Без файлов: `#types` и `#types/city` — схемы как раньше, консоль без ошибок (404 на картинки — ожидаемы, но без исключений). С временной картинкой (`img/types/city.webp` — копия любой `img/acc/*.webp`, потом удалить): фото на карточке и странице, схема на карточке скрыта, на странице — под фото; 360 px, 1366 px, тёмная тема.
- [ ] **Step 6:** Commit `feat(guide): bike type photos with the drawing as a fallback`.

### Task 4: Передача промптов пользователю

- [ ] **Step 1:** `node tools/make-image-prompts.js` → `info/image-prompts.md`; показать пользователю раздел «Этап 3» и что сделать в Cursor (31 PNG в `img/raw/`, имена — из таблицы). **Ждать картинки** (внешняя зависимость — остановка по правилам исполнения).

### Task 5: Картинки в приложении

**Files:** `img/types/*.webp`, `img/parts/rims-*.webp`, `img/parts/tyres-*.webp`, `tests/images.test.js`

- [ ] **Step 1: Тест.** `images`: `every bike type has a picture` (`img/types/<id>.webp` для всех видов, ≤ 120 КБ); `PENDING` удалить; `no pictures of types that are gone`.
- [ ] **Step 2:** FAIL. **Step 3:** `python tools/convert-images.py`; просмотреть каждую из 31 картинки (контактный лист): нет логотипов и надписей, вид узнаваем, колёса целиком, устройство верное (трицикл — два задних колеса, BMX — 20″ и т. д.). Неудачные — список пользователю на перегенерацию, повторить. **Step 4:** PASS.
- [ ] **Step 5: Браузер.** Каталог, страницы нескольких видов, обода, покрышки — 360 px и десктоп.
- [ ] **Step 6:** Commit `feat(images): pictures of bike types, rims and tyres`.

### Task 6: Выпуск

- [ ] **Step 1:** `node --test` — зелёный.
- [ ] **Step 2:** Ревью ветки субагентом на opus; исправить подтверждённое.
- [ ] **Step 3:** docx продавцу `info/Feedback 3/Решения/Фитстенд - реалистичные картинки.docx` (контактный лист видов, ободов и покрышек; что проверить); статусы в `info/Фитстенд - требования.docx`.
- [ ] **Step 4:** Спросить «да» на мерж и push.
