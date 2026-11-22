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
const LX = 300, RX = 600;          // x-centres of the left leg (spring or air) and the damper leg (right)
const SPRING = { top: 212, bot: 498, turns: 9, half: 15 }; // coil spring (bot = rest position of its lower end)
// the oil arrows live in the band FLOW_TOP…FLOW_BOT around the valve plate; the reversed flow mirrors the whole group
// about the middle of that band, so the mirrored arrows land on the same spots with the opposite direction
const FLOW_TOP = 232, FLOW_BOT = 322;
// per-kind geometry of the parts every kind shares: the lever, the needle, the oil arrows, the impact arrow, the travel
const FORK_GEOM = {
  lever: { x: RX, y: 157, rest: -60 }, // pivot on the crown; the drawn lever points up-right when open
  needleDrop: 28,                    // px the needle goes down into its seat when the valve is closed
  flowMirror: FLOW_TOP + FLOW_BOT,   // mirror axis (2 * the band's middle) of the oil arrows
  hitShift: 60,                      // px the impact arrow is held back while it is "far" (its tail stays inside the picture)
  travel: 160,                       // px the lower legs rise at full compression (c = 1)
  dir: [0, -1],                      // the direction the lower part moves when it compresses (a side-view shock uses [-1, 0] or [1, 0])
};
const GEOM = { spring: FORK_GEOM, air: FORK_GEOM };
const TRAVEL = FORK_GEOM.travel;

const nr = v => Math.round(v * 100) / 100;
// a translate() of d px along the geometry's compression axis (sign -1: against it); + 0 turns -0 into 0
const shift = (g, d, sign = 1) => `translate(${nr(g.dir[0] * d * sign) + 0} ${nr(g.dir[1] * d * sign) + 0})`;

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

// a leader line from a point on a part to its label (side 'l' = label on the left of the fork);
// with ly set, the line first goes vertically to the label's height (to keep clear of moving parts)
function leader(x, y, edge, text, side, ly = y) {
  const tx = side === 'l' ? edge - 6 : edge + 6;
  const line = ly === y
    ? `<line class="la-leader" x1="${x}" y1="${y}" x2="${edge}" y2="${y}" stroke="#8b97a2" stroke-width="1.2"/>`
    : `<path class="la-leader" d="M ${x} ${y} V ${ly} H ${edge}" fill="none" stroke="#8b97a2" stroke-width="1.2"/>`;
  return line
    + `<circle class="la-leader-dot" cx="${x}" cy="${y}" r="3.2" fill="#24303a"/>`
    + `<text class="la-label" x="${tx}" y="${ly + 6}" text-anchor="${side === 'l' ? 'end' : 'start'}" font-family="${FONT}" font-size="18" fill="#1c2630">${text}</text>`;
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

// both lower legs, the arch between them and the axle: everything that rises with the compression
function lowerLegs() {
  const arch = `<path d="M 336 482 L 336 440 Q 450 384 564 440 L 564 482 Q 450 426 336 482 Z" fill="url(#la-g-alumV)"/>
    <path d="M 340 446 Q 450 394 560 446" fill="none" stroke="#fff" stroke-width="2" opacity="0.25"/>`;
  const axle = `<rect x="${LX}" y="719" width="${RX - LX}" height="12" fill="url(#la-g-steel)"/>
    <rect x="398" y="703" width="104" height="44" rx="8" fill="url(#la-g-alumV)"/>
    <rect x="408" y="708" width="84" height="5" rx="2" fill="#fff" opacity="0.25"/>`;
  return `<g id="la-move" transform="translate(0 0)">${arch}${legShell(LX, 'la-leg-l')}${legShell(RX, 'la-leg-r')}${axle}</g>`;
}

// the oil damper leg: amber oil, a funnel-seat valve plate, the cone-tipped needle coming down from the lever,
// the damper piston on its rod, the oil arrows and the red cross that shows when the valve is shut
function damperLeg(g, cx) {
  const plate = `<path d="M ${cx - 20} 262 h 11 l 6 20 h -17 z M ${cx + 20} 262 h -11 l -6 20 h 17 z" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/>`;
  const needle = `<g id="la-needle" transform="translate(0 0)"><rect x="${cx - 3}" y="150" width="6" height="84" fill="url(#la-g-steel)"/><rect x="${cx - 6}" y="224" width="12" height="9" rx="2" fill="url(#la-g-brass)"/><polygon points="${cx - 9},234 ${cx + 9},234 ${cx},264" fill="url(#la-g-brass)"/></g>`;
  const piston = `<g id="la-piston" transform="translate(0 0)"><rect x="${cx - 3}" y="446" width="6" height="285" fill="url(#la-g-steel)"/><rect x="${cx - 19}" y="430" width="38" height="16" rx="3" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/><rect x="${cx - 19}" y="435" width="38" height="3" fill="#14181c" opacity="0.5"/></g>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#6b3f04" stroke-width="2.4" marker-end="url(#la-g-arr)"/>`;
  // below the plate the oil comes up to the seat (the lower pair), above it the oil leaves (the upper pair, the lower
  // pair mirrored); the upper pair starts in the valve gap and all four stay off the needle cone, so the needle is visible
  const out = 17, seat = 7, run = 30, m = g.flowMirror; // out: at the wall side (inside the column), seat: in the valve gap
  const flow = `<g id="la-flow" opacity="0" transform="translate(0 0)">`
    + arrow(cx - out, FLOW_BOT, cx - seat, FLOW_BOT - run) + arrow(cx + out, FLOW_BOT, cx + seat, FLOW_BOT - run)
    + arrow(cx - seat, m - (FLOW_BOT - run), cx - out, m - FLOW_BOT) + arrow(cx + seat, m - (FLOW_BOT - run), cx + out, m - FLOW_BOT) + `</g>`;
  const cross = `<g id="la-cross" opacity="0"><path d="M ${cx - 14} 258 L ${cx + 14} 286 M ${cx + 14} 258 L ${cx - 14} 286" stroke="#D9473F" stroke-width="6" stroke-linecap="round"/></g>`;
  return `<rect x="${cx - 20}" y="205" width="40" height="315" fill="url(#la-g-oil)"/>${plate}${needle}${piston}${flow}${cross}`;
}

// the crown with the steerer, both stanchions and the lock lever with its colour indicator above the damper leg
function forkTop(g) {
  const lv = g.lever;
  return `${stanchion(LX)}${stanchion(RX)}
  <rect x="428" y="20" width="44" height="118" rx="4" fill="url(#la-g-alum)"/>
  <rect x="190" y="130" width="520" height="55" rx="14" fill="url(#la-g-alumV)"/>
  <rect x="204" y="135" width="492" height="5" rx="2" fill="#fff" opacity="0.28"/>
  <rect x="${LX - 34}" y="180" width="68" height="24" rx="4" fill="url(#la-g-alum)"/><rect x="${RX - 34}" y="180" width="68" height="24" rx="4" fill="url(#la-g-alum)"/>
  <circle cx="${lv.x}" cy="${lv.y}" r="22" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/>
  <g id="la-lever" transform="translate(${lv.x} ${lv.y}) rotate(0)">
    <g transform="rotate(${lv.rest})"><rect x="4" y="-8" width="68" height="16" rx="8" fill="url(#la-g-brass)" stroke="#7c5a1e" stroke-width="1"/><rect x="12" y="-5" width="52" height="3" rx="1.5" fill="#fff" opacity="0.35"/></g>
    <circle id="la-ind" class="la-ind la-open" r="14" fill="#3FAE5C" stroke="#fff" stroke-width="2"/>
  </g>`;
}

// the red arrow that hits the axle from below; "far" means held back by g.hitShift
function hitArrow(g) {
  return `<g id="la-hit" opacity="0" transform="${shift(g, g.hitShift, -1)}"><polygon points="450,752 430,784 443,784 443,834 457,834 457,784 470,784" fill="#D9473F" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>`;
}

// the leaders every fork has: crown, upper leg, seal, lower leg, and the right-hand ones of the lever and the damper leg
function forkLeaders(g) {
  const lv = g.lever;
  return [
    leader(228, 158, 190, 'Корона', 'l'),
    leader(LX - 24, 262, 190, 'Верхняя нога', 'l'),
    // the seal point is the stanchion bushing: the stanchion never moves, so the dot stays on metal through the whole travel
    leader(LX - 25, 528, 190, 'Сальник', 'l'),
    leader(LX - 44, 600, 190, 'Нижняя нога', 'l'),
    // from the top of the pivot straight up, above the arc the lever sweeps, then to the label
    leader(lv.x - 12, lv.y - 18, 712, 'Рычаг блокировки', 'r', 70),
    leader(RX, 214, 712, 'Игла', 'r'),
    leader(RX + 15, 272, 712, 'Клапан', 'r'),
    leader(RX + 14, 480, 712, 'Демпфер', 'r'),
    leader(RX, 590, 712, 'Шток', 'r'),
  ];
}

// the frame every fork shares: left = markup of the left leg, leaders = the labels of that leg, before = drawn under the crown, after = drawn over the stanchions
function forkSvg(kind, aria, left, leaders, before = '', after = '') {
  const g = GEOM[kind];
  return `<svg class="la-svg" data-lock="${kind}" viewBox="0 0 900 900" role="img" aria-label="${aria}">${defs}
  ${lowerLegs()}
  ${left}
  ${damperLeg(g, RX)}
  ${before}${forkTop(g)}${after}
  <g class="la-leaders">${[...forkLeaders(g), ...leaders].join('')}</g>
  ${hitArrow(g)}
</svg>`;
}

function springMarkup() {
  const left = `<rect x="${LX - 20}" y="205" width="40" height="315" fill="url(#la-g-cavity)"/>
  <rect x="${LX - 20}" y="205" width="40" height="8" fill="url(#la-g-steel)"/>
  <polyline id="la-spring" points="${springPoints(0)}" fill="none" stroke="url(#la-g-spring)" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/>
  <g id="la-cup" transform="translate(0 0)"><rect x="${LX - 3}" y="510" width="6" height="221" fill="url(#la-g-steel)"/><path d="M ${LX - 17} 498 h 34 l -4 12 h -26 z" fill="url(#la-g-steel)"/></g>`;
  return forkSvg('spring', 'Пружинная вилка в разрезе, вид спереди', left, [leader(LX, 320, 190, 'Пружина', 'l')]);
}

// ---- the air fork: the left leg holds two air chambers split by a piston; the bypass tube runs outside its wall ----
const AIR = { x0: 280, x1: 320, rodX: 300, top: 213, bot: 512, pist: 400, pistH: 14 }; // chamber box (the full inner width) and the piston at rest
const TUBE = { x: 262, w: 8, top: 218, bot: 508, portH: 10 }; // the bypass tube outside the left stanchion wall (x 272…280), ports through the wall
const POS_N = 18, NEG_N = 12;      // particles of the positive (blue) and the negative (orange) chamber
const BYPASS_P = [0, 2, 3, 5];     // blue particles that travel through the bypass into the negative chamber under compression
const PR = 3.8;                    // particle radius
const COL_POS = '#5EB8F0', COL_NEG = '#F29A4A', BG_POS = '#D4ECFB', BG_NEG = '#FDE3CC', COL_TUBE = '#B9C8D4';

// a fixed shift for particle k, -0.25…0.25: the same on every frame, so nothing flickers
const jit = (k, salt) => (((k * 7919 + salt * 104729) % 97) / 97 - 0.5) * 0.5;

// the point at fraction f of the length of a polyline
function along(pts, f) {
  const seg = [];
  let total = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); total += d; }
  let rest = clamp01(f) * total;
  for (let i = 0; i < seg.length; i++) {
    if (rest <= seg[i] || i === seg.length - 1) { const u = seg[i] ? rest / seg[i] : 0; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u]; }
    rest -= seg[i];
  }
}

// every particle position depends on the compression c only (not on the time), so a held pose stands still.
// The tiny give of a locked fork (c <= BUMP_AMP) is not shown by the air: it is counted as BUMP_AMP.
function airParticles(c, travel) {
  const cp = Math.max(c, BUMP_AMP);
  const q = clamp01((cp - BUMP_AMP) / (C_MAX - BUMP_AMP)); // 0 at rest, 1 at full compression
  const pistY = AIR.pist - cp * travel;
  const ya = AIR.top + 5, yb = pistY - 5;                  // the positive chamber: from the top down to the piston
  const na = pistY + AIR.pistH + 6, nb = AIR.bot - 4;      // the negative chamber: under the piston, down to the bottom
  const neg = [];
  for (let k = 0; k < NEG_N; k++) { // two columns (the rod stands between them), six rows
    neg.push([AIR.x0 + (k % 2 ? 32 : 8) + jit(k, 3) * 4.8, na + (Math.floor(k / 2) + 0.5 + jit(k, 4) * 0.5) * (nb - na) / 6]);
  }
  const pos = [];
  for (let k = 0; k < POS_N; k++) { // three columns, six rows
    const home = [AIR.x0 + 8 + (k % 3) * 12 + jit(k, 1) * 4.8, ya + (Math.floor(k / 3) + 0.5 + jit(k, 2) * 0.5) * (yb - ya) / 6];
    const r = BYPASS_P.indexOf(k);
    if (r < 0) { pos.push(home); continue; }
    // the travellers leave through the top port, go down the tube and enter the negative chamber through the bottom port;
    // they end between the orange rows (x on an orange column, y on a row boundary)
    const end = [AIR.x0 + (r % 2 ? 32 : 8), na + (r + 1) * (nb - na) / 6];
    const path = [home, [AIR.x0 + 2, TUBE.top + 5], [TUBE.x + TUBE.w / 2, TUBE.top + 5], [TUBE.x + TUBE.w / 2, TUBE.bot - 5], [AIR.x0 + 2, TUBE.bot - 5], end];
    pos.push(along(path, q * 1.36 - 0.12 * r));
  }
  return { pos, neg };
}

function airMarkup() {
  const g = GEOM.air, a = airParticles(0, g.travel);
  const dot = (id, cls, col, p) => `<circle id="${id}" class="${cls}" cx="${nr(p[0])}" cy="${nr(p[1])}" r="${PR}" fill="${col}" stroke="#1c2630" stroke-width="0.8"/>`;
  const left = `<rect x="${LX - 20}" y="205" width="40" height="315" fill="url(#la-g-cavity)"/>
  <rect id="la-pos-bg" x="${AIR.x0}" y="${AIR.top}" width="${AIR.x1 - AIR.x0}" height="${AIR.pist - AIR.top}" fill="${BG_POS}"/>
  <rect id="la-neg-bg" x="${AIR.x0}" y="${AIR.pist + AIR.pistH}" width="${AIR.x1 - AIR.x0}" height="${AIR.bot - AIR.pist - AIR.pistH}" fill="${BG_NEG}"/>
  ${a.pos.map((p, i) => dot('la-p' + i, 'la-pos', COL_POS, p)).join('')}${a.neg.map((p, i) => dot('la-n' + i, 'la-neg', COL_NEG, p)).join('')}
  <g id="la-apiston" transform="translate(0 0)"><rect x="${AIR.rodX - 3}" y="${AIR.pist + AIR.pistH}" width="6" height="${731 - AIR.pist - AIR.pistH}" fill="url(#la-g-steel)"/><rect x="${AIR.x0}" y="${AIR.pist}" width="${AIR.x1 - AIR.x0}" height="${AIR.pistH}" rx="3" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/><rect x="${AIR.x0}" y="${AIR.pist + 5}" width="${AIR.x1 - AIR.x0}" height="3" fill="#14181c" opacity="0.5"/></g>
  <rect x="${LX - 20}" y="205" width="40" height="8" fill="url(#la-g-steel)"/>`;
  // the bypass: a tube along the outside of the stanchion with a short port through the wall at each end (drawn over the wall)
  const port = y => `<rect x="${TUBE.x + TUBE.w - 1}" y="${y}" width="${AIR.x0 - TUBE.x - TUBE.w + 1}" height="${TUBE.portH}" fill="${COL_TUBE}" stroke="#5c6770" stroke-width="1"/>`;
  const tube = `<g id="la-bypass"><rect x="${TUBE.x}" y="${TUBE.top - 1}" width="${TUBE.w}" height="${TUBE.bot - TUBE.top + 2}" rx="3" fill="${COL_TUBE}" stroke="#5c6770" stroke-width="1"/>${port(TUBE.top)}${port(TUBE.bot - TUBE.portH)}</g>`;
  // the air valve (nipple) sticks out of the crown above the left leg
  const nipple = `<rect x="${LX - 8}" y="104" width="16" height="30" rx="3" fill="url(#la-g-steel)" stroke="#5c6770" stroke-width="1"/><rect x="${LX - 5}" y="95" width="10" height="11" rx="2" fill="url(#la-g-brass)"/>`;
  const leaders = [
    leader(LX, 112, 190, 'Ниппель', 'l'),
    leader(LX, 216, 190, 'Позитивная камера', 'l'),
    // the piston rises with the legs: its leader moves with it (the line stays level, the label follows)
    `<g id="la-lead-piston" transform="translate(0 0)">${leader(LX, AIR.pist + 7, 190, 'Поршень', 'l')}</g>`,
    leader(TUBE.x + TUBE.w / 2, 440, 190, 'Байпас', 'l'),
    leader(LX, 480, 190, 'Негативная камера', 'l'),
  ];
  return forkSvg('air', 'Воздушная вилка в разрезе, вид спереди', left, leaders, nipple, tube);
}

// kind 'shock' is drawn in a later task; until then it returns an empty string
function lockMarkup(kind) {
  return kind === 'spring' ? springMarkup() : kind === 'air' ? airMarkup() : '';
}

// ---- one frame: attribute changes only, the list of ids is the same for every state ----
// the lower part moves along g.dir by c * travel
const rise = (id, g, st) => ({ id, attrs: { transform: shift(g, st.c * g.travel) } });

// what every kind has: the moving lower part, the lever, the indicator, the needle, the damper piston, the oil arrows,
// the cross, the impact arrow. The axis g.dir decides the direction of the travel, of the hit and of the flow mirror.
function sharedPose(g, st) {
  const lv = g.lever, horiz = g.dir[0] !== 0;
  const mirror = horiz ? `translate(${g.flowMirror} 0) scale(-1 1)` : `translate(0 ${g.flowMirror}) scale(1 -1)`;
  return [
    rise('la-move', g, st),
    rise('la-piston', g, st),
    { id: 'la-lever', attrs: { transform: `translate(${lv.x} ${lv.y}) rotate(${nr(st.lever * 90)})` } },
    { id: 'la-ind', attrs: { class: st.lever < 0.5 ? 'la-ind la-open' : 'la-ind la-closed' } },
    { id: 'la-needle', attrs: { transform: `translate(0 ${nr(st.valve * g.needleDrop)})` } },
    { id: 'la-flow', attrs: { opacity: Math.abs(st.flow), transform: st.flow < 0 ? mirror : 'translate(0 0)' } },
    { id: 'la-cross', attrs: { opacity: st.valve > 0.5 && st.hitA > 0 ? 1 : 0 } },
    { id: 'la-hit', attrs: { transform: shift(g, st.hitD * g.hitShift, -1), opacity: nr(st.hitA) } },
  ];
}

// the parts that belong to one kind; lockPose appends them to the shared ones in a fixed order
const airPose = (g, st) => {
  const a = airParticles(st.c, g.travel), pistY = AIR.pist - st.c * g.travel; // the chamber boxes follow the real piston
  return [
    rise('la-apiston', g, st), rise('la-lead-piston', g, st),
    { id: 'la-pos-bg', attrs: { height: nr(pistY - AIR.top) } },
    { id: 'la-neg-bg', attrs: { y: nr(pistY + AIR.pistH), height: nr(AIR.bot - pistY - AIR.pistH) } },
    ...a.pos.map((p, i) => ({ id: 'la-p' + i, attrs: { cx: nr(p[0]), cy: nr(p[1]) } })),
    ...a.neg.map((p, i) => ({ id: 'la-n' + i, attrs: { cx: nr(p[0]), cy: nr(p[1]) } })),
  ];
};
const PARTS = {
  air: airPose,
  spring: (g, st) => [rise('la-cup', g, st), { id: 'la-spring', attrs: { points: springPoints(st.c) } }],
};

function lockPose(kind, st) {
  const g = GEOM[kind];
  return g ? [...sharedPose(g, st), ...PARTS[kind](g, st)] : [];
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
