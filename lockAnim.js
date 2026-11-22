// Фитстенд — анимация блокировки: вилка/амортизатор в разрезе, цикл из 4 шагов за 10 секунд.
// lockState — чистая функция (тестируется в Node): по времени возвращает положение всех подвижных частей.
(function (root) {
const LOCK_PERIOD = 10;            // seconds per loop
const T1 = 3, T2 = 5, T3 = 7;      // step boundaries: compression 0–3, rebound 3–5, lever 5–7, impact while locked 7–10
const C_MAX = 0.7;                 // compression at the end of step 1 (of full travel)
const LEVER_OFF = 9.4;             // the lever and the valve open again from here
const VALVE_LAG = 0.3;             // the valve follows the lever with this delay
const HIT_FAR = 7, HIT_NEAR = 7.8, HIT_BOUNCE = 8.6, HIT_END = 9.4; // impact arrow: comes, touches the leg, bounces, fades
const HIT_REST = 0.6;              // how far the arrow bounces back (0 — at the leg, 1 — far)
const BUMP_AMP = 0.04, BUMP_FROM = 7.7, BUMP_LEN = 0.3; // tiny residual give of a locked fork

const wrap = t => ((t % LOCK_PERIOD) + LOCK_PERIOD) % LOCK_PERIOD;
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = x => { const u = clamp01(x); return u * u * (3 - 2 * u); };
// 0 → 1 between a and b
const ramp = (t, a, b) => smooth((t - a) / (b - a));

// the lever: pulled over 5–7, held, released over 9.4–10
const leverAt = t => (t < LEVER_OFF ? ramp(t, T2, T3) : 1 - ramp(t, LEVER_OFF, LOCK_PERIOD));

function lockState(t) {
  const tt = wrap(t);
  const step = tt < T1 ? 1 : tt < T2 ? 2 : tt < T3 ? 3 : 4;
  let c = 0;
  if (step === 1) c = C_MAX * ramp(tt, 0, T1);
  else if (step === 2) c = C_MAX * (1 - ramp(tt, T1, T2));
  else if (step === 4 && tt >= BUMP_FROM && tt <= BUMP_FROM + BUMP_LEN) c = BUMP_AMP * Math.sin((Math.PI * (tt - BUMP_FROM)) / BUMP_LEN);
  const lever = leverAt(tt);
  const valve = tt < LEVER_OFF ? leverAt(tt - VALVE_LAG) : lever; // closes just after the lever, opens together with it
  const flow = step === 1 ? 1 : step === 2 ? -1 : 0;
  let hitD = 1; // 1 — far, 0 — at the leg
  if (tt >= HIT_FAR && tt < HIT_NEAR) hitD = 1 - ramp(tt, HIT_FAR, HIT_NEAR);
  else if (tt >= HIT_NEAR && tt < HIT_END) hitD = HIT_REST * ramp(tt, HIT_NEAR, HIT_BOUNCE);
  const hitA = tt < HIT_FAR ? 0 : tt < HIT_BOUNCE ? 1 : tt < HIT_END ? 1 - ramp(tt, HIT_BOUNCE, HIT_END) : 0;
  return { step, c, lever, valve, flow, hitD, hitA };
}

// ---- drawing: the fork is seen from the front (two legs, the crown with the lever above the damper leg) ----
const TRAVEL = 160;                // px the lower legs rise at full compression (c = 1)
const LX = 300, RX = 600;          // x-centres of the spring leg (left) and the damper leg (right)
const LEVER = { x: RX, y: 157, rest: -60 }; // lever pivot on the crown; the drawn lever points up-right when open
const NEEDLE_DROP = 28;            // px the needle goes down into its seat when the valve is closed
const SPRING = { top: 212, bot: 498, turns: 9, half: 15 }; // coil spring (bot = rest position of its lower end)
const HIT_SHIFT = 70;              // px the impact arrow is held back while it is "far"
const FLOW_MIRROR = 554;           // 2 * y of the valve plate: mirrors the oil arrows when the flow reverses

const nr = v => Math.round(v * 100) / 100;

// zig-zag of the coil spring: turns get closer when the lower end rises by c * TRAVEL
function springPoints(c) {
  const bot = SPRING.bot - c * TRAVEL, last = SPRING.turns * 2, pts = [];
  for (let i = 0; i <= last; i++) {
    const y = SPRING.top + ((bot - SPRING.top) * i) / last;
    const x = i === 0 || i === last ? LX : LX + (i % 2 ? SPRING.half : -SPRING.half);
    pts.push(`${nr(x)},${nr(y)}`);
  }
  return pts.join(' ');
}

const FONT = 'Arial, Helvetica, sans-serif';
const defs = `<defs>
  <linearGradient id="la-g-alum" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9aa6b2"/><stop offset="0.15" stop-color="#6a7682"/><stop offset="0.42" stop-color="#3c4652"/><stop offset="0.7" stop-color="#2a313a"/><stop offset="1" stop-color="#5a6570"/></linearGradient>
  <linearGradient id="la-g-alumV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8e9aa6"/><stop offset="0.35" stop-color="#4a5560"/><stop offset="1" stop-color="#2c333c"/></linearGradient>
  <linearGradient id="la-g-cavity" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12171c"/><stop offset="1" stop-color="#2a313a"/></linearGradient>
  <linearGradient id="la-g-spring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7fafc"/><stop offset="0.35" stop-color="#c5ced6"/><stop offset="0.62" stop-color="#8b969f"/><stop offset="1" stop-color="#e6edf2"/></linearGradient>
  <linearGradient id="la-g-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d5dde4"/><stop offset="0.5" stop-color="#8b969f"/><stop offset="1" stop-color="#5c6770"/></linearGradient>
  <linearGradient id="la-g-brass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dc9a"/><stop offset="0.45" stop-color="#c4963c"/><stop offset="1" stop-color="#7c5a1e"/></linearGradient>
  <linearGradient id="la-g-oil" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ECC26E"/><stop offset="0.5" stop-color="#D9A441"/><stop offset="1" stop-color="#B8872D"/></linearGradient>
  <linearGradient id="la-g-rubber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a4048"/><stop offset="1" stop-color="#14181c"/></linearGradient>
  <pattern id="la-g-hatch" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 5 L5 0" stroke="#0e1318" stroke-width="0.7" opacity="0.28"/></pattern>
  <marker id="la-g-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#6b3f04"/></marker>
</defs>`;

// a horizontal leader line from a point on a part to its label (side 'l' = label on the left of the fork)
function leader(x, y, edge, text, side) {
  const tx = side === 'l' ? edge - 6 : edge + 6;
  return `<line class="la-leader" x1="${x}" y1="${y}" x2="${edge}" y2="${y}" stroke="#8b97a2" stroke-width="1.2"/>`
    + `<circle class="la-leader-dot" cx="${x}" cy="${y}" r="3.2" fill="#24303a"/>`
    + `<text class="la-label" x="${tx}" y="${y + 6}" text-anchor="${side === 'l' ? 'end' : 'start'}" font-family="${FONT}" font-size="18" fill="#1c2630">${text}</text>`;
}

// the lower leg: open-top shell with a dark cavity, a seal ring on top and the axle hole at the bottom
function legShell(cx, id) {
  const x = cx - 48, top = 400, w = 96, h = 360, t = 11, iw = w - 2 * t;
  return `<g id="${id}" data-cx="${cx}">
    <rect x="${x + t}" y="${top}" width="${iw}" height="${h - t}" fill="#141a20"/>
    <path d="M ${x} ${top} h ${w} v ${h} h ${-w} z M ${x + t} ${top} h ${iw} v ${h - t} h ${-iw} z" fill="url(#la-g-alum)" fill-rule="evenodd"/>
    <path d="M ${x} ${top} h ${t} v ${h} h ${-t} z M ${x + w - t} ${top} h ${t} v ${h} h ${-t} z M ${x} ${top + h - t} h ${w} v ${t} h ${-w} z" fill="url(#la-g-hatch)" opacity="0.5"/>
    <rect x="${cx - 37}" y="${top}" width="9" height="16" rx="2" fill="url(#la-g-rubber)"/>
    <rect x="${cx + 28}" y="${top}" width="9" height="16" rx="2" fill="url(#la-g-rubber)"/>
    <circle cx="${cx}" cy="725" r="9" fill="#22282f" stroke="#c5ced6" stroke-width="2"/>
  </g>`;
}

// the upper leg (stanchion): walls and a cap on top, a bushing at the bottom; its inside is drawn separately
function stanchion(cx) {
  return `<path d="M ${cx - 28} 185 h 56 v 335 h -8 v -315 h -40 v 315 h -8 z" fill="url(#la-g-alum)"/>`
    + `<path d="M ${cx - 28} 205 h 8 v 315 h -8 z M ${cx + 20} 205 h 8 v 315 h -8 z" fill="url(#la-g-hatch)" opacity="0.55"/>`
    + `<rect x="${cx - 28}" y="520" width="56" height="16" rx="3" fill="url(#la-g-steel)"/>`;
}

function springMarkup() {
  const arch = `<path d="M 336 482 L 336 440 Q 450 384 564 440 L 564 482 Q 450 426 336 482 Z" fill="url(#la-g-alumV)"/>
    <path d="M 340 446 Q 450 394 560 446" fill="none" stroke="#fff" stroke-width="2" opacity="0.25"/>`;
  const axle = `<rect x="${LX}" y="719" width="${RX - LX}" height="12" fill="url(#la-g-steel)"/>
    <rect x="398" y="703" width="104" height="44" rx="8" fill="url(#la-g-alumV)"/>
    <rect x="408" y="708" width="84" height="5" rx="2" fill="#fff" opacity="0.25"/>`;
  // the valve: a plate with a funnel-shaped seat; the cone-tipped needle comes down from the lever into it
  const plate = `<path d="M ${RX - 20} 262 h 11 l 6 20 h -17 z M ${RX + 20} 262 h -11 l -6 20 h 17 z" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/>`;
  const needle = `<g id="la-needle" transform="translate(0 0)"><rect x="${RX - 3}" y="150" width="6" height="84" fill="url(#la-g-steel)"/><rect x="${RX - 6}" y="224" width="12" height="9" rx="2" fill="url(#la-g-brass)"/><polygon points="${RX - 9},234 ${RX + 9},234 ${RX},264" fill="url(#la-g-brass)"/></g>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b3f04" stroke-width="2.4" marker-end="url(#la-g-arr)"/>`;
  const flow = `<g id="la-flow" opacity="0" transform="translate(0 0)">`
    + arrow(RX - 12, 322, RX - 3, 292) + arrow(RX + 12, 322, RX + 3, 292)
    + arrow(RX - 7, 256, RX - 15, 232) + arrow(RX + 7, 256, RX + 15, 232) + `</g>`;
  const cup = `<g id="la-cup" transform="translate(0 0)"><rect x="${LX - 3}" y="510" width="6" height="221" fill="url(#la-g-steel)"/><path d="M ${LX - 17} 498 h 34 l -4 12 h -26 z" fill="url(#la-g-steel)"/></g>`;
  const piston = `<g id="la-piston" transform="translate(0 0)"><rect x="${RX - 3}" y="446" width="6" height="285" fill="url(#la-g-steel)"/><rect x="${RX - 19}" y="430" width="38" height="16" rx="3" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/><rect x="${RX - 19}" y="435" width="38" height="3" fill="#14181c" opacity="0.5"/></g>`;
  const lever = `<circle cx="${LEVER.x}" cy="${LEVER.y}" r="22" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/>
    <g id="la-lever" transform="translate(${LEVER.x} ${LEVER.y}) rotate(0)">
      <g transform="rotate(${LEVER.rest})"><rect x="4" y="-8" width="68" height="16" rx="8" fill="url(#la-g-brass)" stroke="#7c5a1e" stroke-width="1"/><rect x="12" y="-5" width="52" height="3" rx="1.5" fill="#fff" opacity="0.35"/></g>
      <circle id="la-ind" class="la-ind la-open" r="14" fill="#3FAE5C" stroke="#fff" stroke-width="2"/>
    </g>`;
  const leaders = [
    leader(228, 158, 190, 'Корона', 'l'),
    leader(LX - 24, 250, 190, 'Верхняя нога', 'l'),
    leader(LX, 320, 190, 'Пружина', 'l'),
    leader(LX - 33, 408, 190, 'Сальник', 'l'),
    leader(LX - 44, 600, 190, 'Нижняя нога', 'l'),
    leader(RX + 15, 158, 712, 'Рычаг блокировки', 'r'),
    leader(RX, 228, 712, 'Игла', 'r'),
    leader(RX + 15, 272, 712, 'Клапан', 'r'),
    leader(RX + 14, 480, 712, 'Демпфер', 'r'),
    leader(RX, 590, 712, 'Шток', 'r'),
  ].join('');
  return `<svg class="la-svg" data-lock="spring" viewBox="0 0 900 900" role="img" aria-label="Пружинная вилка в разрезе, вид спереди">${defs}
  <g id="la-move" transform="translate(0 0)">${arch}${legShell(LX, 'la-leg-l')}${legShell(RX, 'la-leg-r')}${axle}</g>
  <rect x="${LX - 20}" y="205" width="40" height="315" fill="url(#la-g-cavity)"/>
  <rect x="${RX - 20}" y="205" width="40" height="315" fill="url(#la-g-oil)"/>
  ${plate}${needle}
  <rect x="${LX - 20}" y="205" width="40" height="8" fill="url(#la-g-steel)"/>
  <polyline id="la-spring" points="${springPoints(0)}" fill="none" stroke="url(#la-g-spring)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  ${cup}${piston}${flow}
  ${stanchion(LX)}${stanchion(RX)}
  <rect x="428" y="20" width="44" height="118" rx="4" fill="url(#la-g-alum)"/>
  <rect x="190" y="130" width="520" height="55" rx="14" fill="url(#la-g-alumV)"/>
  <rect x="204" y="135" width="492" height="5" rx="2" fill="#fff" opacity="0.28"/>
  <rect x="${LX - 34}" y="180" width="68" height="24" rx="4" fill="url(#la-g-alum)"/><rect x="${RX - 34}" y="180" width="68" height="24" rx="4" fill="url(#la-g-alum)"/>
  ${lever}
  <g id="la-cross" opacity="0"><path d="M ${RX - 14} 258 L ${RX + 14} 286 M ${RX + 14} 258 L ${RX - 14} 286" stroke="#D9473F" stroke-width="6" stroke-linecap="round"/></g>
  <g class="la-leaders">${leaders}</g>
  <g id="la-hit" opacity="0" transform="translate(0 ${HIT_SHIFT})"><polygon points="450,752 430,784 443,784 443,834 457,834 457,784 470,784" fill="#D9473F" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>
</svg>`;
}

// kinds 'air' and 'shock' are drawn in later tasks; until then they return an empty string
function lockMarkup(kind) {
  return kind === 'spring' ? springMarkup() : '';
}

// one frame: attribute changes only, the list of ids is the same for every state
function lockPose(kind, st) {
  if (kind !== 'spring') return [];
  const up = `translate(0 ${nr(-st.c * TRAVEL)})`;
  return [
    { id: 'la-move', attrs: { transform: up } },
    { id: 'la-cup', attrs: { transform: up } },
    { id: 'la-piston', attrs: { transform: up } },
    { id: 'la-spring', attrs: { points: springPoints(st.c) } },
    { id: 'la-lever', attrs: { transform: `translate(${LEVER.x} ${LEVER.y}) rotate(${nr(st.lever * 90)})` } },
    { id: 'la-ind', attrs: { class: st.lever < 0.5 ? 'la-ind la-open' : 'la-ind la-closed' } },
    { id: 'la-needle', attrs: { transform: `translate(0 ${nr(st.valve * NEEDLE_DROP)})` } },
    { id: 'la-flow', attrs: { opacity: Math.abs(st.flow), transform: st.flow < 0 ? `translate(0 ${FLOW_MIRROR}) scale(1 -1)` : 'translate(0 0)' } },
    { id: 'la-cross', attrs: { opacity: st.valve > 0.5 && st.hitA > 0 ? 1 : 0 } },
    { id: 'la-hit', attrs: { transform: `translate(0 ${nr(st.hitD * HIT_SHIFT)})`, opacity: nr(st.hitA) } },
  ];
}

// the same as applyRider: set the attributes on the elements that exist
function applyLock(svg, list) {
  for (const p of list) {
    const el = svg.querySelector('#' + p.id);
    if (el) for (const [k, v] of Object.entries(p.attrs)) el.setAttribute(k, v);
  }
}

const api = { LOCK_PERIOD, TRAVEL, lockState, lockMarkup, lockPose, applyLock };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
