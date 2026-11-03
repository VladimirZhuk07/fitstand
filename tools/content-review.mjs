// Собирает все тексты из content.js в один markdown-документ для вычитки.
// Запуск из корня репозитория: node tools/content-review.mjs [путь]  (по умолчанию info/content-review.md)
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import contentModule from '../content.js';

const { CONTENT } = contentModule;
const TYPE_RU = { city: 'город', hybrid: 'гибрид', gravel: 'грэвел', mtb: 'MTB', road: 'шоссе', folding: 'складной' };
const out = resolve(process.argv[2] || 'info/content-review.md');
const L = [];
const bullets = (title, items) => { L.push(`**${title}:**`, '', ...items.map(i => `- ${i}`), ''); };

L.push('# Фитстенд — тексты на вычитку', '', 'Правки можно вписывать прямо в этот файл или в Word. Баллы — сколько ответ добавляет каждому виду.', '');

L.push('## Опрос', '');
CONTENT.quiz.forEach((q, qi) => {
  L.push(`### ${qi + 1}. ${q.q}`, '');
  q.answers.forEach((a, ai) => {
    const pts = Object.entries(a.pts).map(([t, v]) => `${TYPE_RU[t]} ${v}`).join(', ') || 'без баллов';
    L.push(`${qi + 1}.${ai + 1}. **${a.text}** — ${pts}${a.motor ? '; добавляет «с мотором»' : ''}`);
    if (a.reason) L.push(`   - причина в результате: «${a.reason}»`);
    if (a.note) L.push(`   - «Что учесть»: ${a.note}`);
  });
  L.push('');
});

L.push('**Совет в «Что учесть»**, если мотор не выбран, но человек ездит до работы или 50+ км и возит багажник или ребёнка:', '', `> ${CONTENT.ebikeHint}`, '');

L.push('## Виды велосипедов', '');
for (const id of CONTENT.typeOrder) {
  const t = CONTENT.types[id];
  L.push(`### ${t.name}`, '', `*${t.short}*`, '', t.purpose, '', `**Кому подходит:** ${t.forWhom}`, '');
  bullets('Плюсы', t.pros);
  bullets('Минусы', t.cons);
  bullets('С чего начать', t.program.map(s => `${s.title}: ${s.text}`));
}

L.push('## Узлы велосипеда', '');
for (const id of CONTENT.partOrder) {
  const p = CONTENT.parts[id];
  L.push(`### ${p.name}`, '', `*${p.short}*`, '');
  for (const v of p.variants) {
    L.push(`#### ${v.name}`, '', v.text, '');
    bullets('Плюсы', v.pros);
    bullets('Минусы', v.cons);
  }
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, L.join('\n'), 'utf8');
console.log(`written: ${out}`);
