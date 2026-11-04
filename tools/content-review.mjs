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

const H = CONTENT.health;
const TYPE_NAMES = { ...TYPE_RU };
const effects = a => {
  const out = [];
  const pts = Object.entries(a.pts || {}).map(([t, v]) => `${TYPE_NAMES[t]} ${v > 0 ? '+' : ''}${v}`);
  if (pts.length) out.push('баллы: ' + pts.join(', '));
  const f = a.fit || {};
  if (f.upright) out.push(`спина вертикальнее на ${f.upright}°`);
  if (f.barUp) out.push(`руль выше на ${f.barUp} мм`);
  if (f.crankMax) out.push(`шатуны до ${f.crankMax} мм`);
  if (f.stepThrough) out.push('рама с низкой трубой');
  const gear = [...(a.gear || []), ...(a.offroadGear || []).map(g => g + '*')];
  if (gear.length) out.push('оснастка: ' + gear.map(g => g.endsWith('*') ? H.gear[g.slice(0, -1)] + ' (при бездорожье)' : H.gear[g]).join(', ').replace('{mm}', f.crankMax || 'N'));
  if (a.rehab) out.push('совет врача');
  return out.join('; ') || 'без эффектов';
};
L.push('## Здоровье', '', `Вопрос 7: **${H.gate.q}** — ${H.gate.answers.map(a => a.text).join(' / ')} (можно несколько)`, '');
for (const q of [...H.blocks.flatMap(b => b.questions.map(x => ({ ...x, block: b.title }))), { ...H.cushion, block: 'всем, кто отметил травму' }]) {
  L.push(`### ${q.q}`, '', `*Блок: ${q.block}; ${q.multi ? 'можно несколько ответов' : 'один ответ'}*`, '');
  q.answers.forEach((a, i) => {
    L.push(`${i + 1}. **${a.text}** — ${effects(a)}`);
    if (a.warn) L.push(`   - предупреждение (${a.warn.types.map(t => TYPE_NAMES[t]).join(', ')}): «${a.warn.text}»`);
    if (a.explain) L.push(`   - объяснение после блока: «${a.explain}»`);
    if (a.reason) L.push(`   - причина в результате: «${a.reason}»`);
    if (a.note) L.push(`   - «Что учесть»: ${a.note}`);
  });
  L.push('');
}
L.push('**Дисклеймер:** ' + H.disclaimer, '', '**Хранение:** ' + H.privacy, '', '**Совет врача:** ' + H.rehabText, '');

L.push('## Аксессуары', '', 'Приоритет: 1 — безопасность, 2 — комфорт и практичность, 3 — электроника. «Когда» — в каких ситуациях подбирается после опроса.', '');
for (const g of CONTENT.accGroups) {
  L.push(`### ${g.icon} ${g.title}`, '');
  for (const sec of g.sections) {
    if (sec.title) L.push(`**${sec.title}**`, '');
    for (const id of sec.ids) {
      const a = CONTENT.accessories[id];
      const when = a.when === 'always' ? 'всем' : a.when.map(w => CONTENT.accSituationTitles[w] || (w === 'commute' ? 'По дороге на работу' : w)).join(', ');
      L.push(`#### ${a.name}`, '', `*${a.short}* — приоритет ${a.priority}; когда: ${when}; зачем: «${a.why}»`, '', a.text, '');
      if (a.kinds) bullets('Виды', a.kinds.map(k => `${k.name} — ${k.text}`));
      if (a.choose) bullets('Как выбрать', a.choose);
      if (a.weather) L.push(`**Под какую погоду:** ${a.weather}`, '');
      if (a.check) L.push(`**Проверьте совместимость:** ${a.check}`, '');
    }
  }
}

L.push('## Виды велосипедов', '');
for (const id of CONTENT.typeOrder) {
  const t = CONTENT.types[id];
  L.push(`### ${t.name}${t.age ? ` (${t.age})` : ''}`, '', `*${t.short}*`, '', t.purpose, '', `**Кому подходит:** ${t.forWhom}`, '');
  if (t.note) L.push(t.note, '');
  if (t.terrain) L.push(`**Для каких трасс:** ${t.terrain}`, '');
  if (t.compare) L.push(`**Чем отличается от шоссейного и чем похож:** ${t.compare}`, '');
  if (t.variants) bullets('Варианты', t.variants);
  if (t.teach) bullets('Как учить', t.teach);
  if (t.fear) bullets('Если ребёнок боится', t.fear);
  if (t.wheels) L.push(`**Колёса:** ${t.wheels.map(w => w + '″').join(', ')}`, '');
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
