// Фитстенд — анимация вилки: пружинная и воздушная в разрезе, режимы «Кочка» и «Подъём», блокировка.
// forkPose и forkMarkup — чистые функции (тестируются в Node); applyPose, forkBlock, startForkAnim — для страницы.
(function (root) {
const FORK_PERIOD = 3;            // seconds per loop
const BUMP = [0.5, 0.8], BUMP_H = 0.7, CREST = 0.65, PEAK = 0.55;
const S = 60;                      // px of full travel on the drawing
const TAU = 2 * Math.PI;

const wrap = t => ((t % FORK_PERIOD) + FORK_PERIOD) % FORK_PERIOD;
// the bump under the wheel: a raised cosine
function bumpAt(t) {
  const ph = (t - BUMP[0]) / (BUMP[1] - BUMP[0]);
  return ph >= 0 && ph <= 1 ? BUMP_H * (1 - Math.cos(TAU * ph)) / 2 : 0;
}
// compression after the bump crest: the spring fork rocks (little damping, top-out keeps extension short),
// the air fork comes back smoothly (oil damps the rebound)
function afterCrest(kind, tau) {
  if (kind === 'spring') {
    const w = TAU * 1.4, z = 0.2, k = Math.sqrt(1 - z * z), wd = w * k;
    const x = PEAK * Math.exp(-z * w * tau) * (Math.cos(wd * tau) + (z / k) * Math.sin(wd * tau));
    return x < 0 ? x * 0.3 : x;
  }
  const w = TAU * 0.9;
  return PEAK * (1 + w * tau) * Math.exp(-w * tau);
}

function forkPose(kind, mode, t, locked) {
  const tt = wrap(t);
  if (mode === 'climb') {
    if (locked) return { c: 0, wheel: 0, front: 0, hands: 0 };
    const c = (kind === 'spring' ? 0.18 : 0.1) * (1 - Math.cos(TAU * 2.5 * tt)) / 2; // 2.5 pushes a second — cadence 75
    return { c, wheel: 0, front: -c, hands: 0 };
  }
  const u = bumpAt(tt);
  if (locked) return { c: 0, wheel: u, front: u, hands: u / BUMP_H };
  const c = tt < BUMP[0] ? 0 : tt < CREST ? u * PEAK / BUMP_H : afterCrest(kind, tt - CREST);
  return { c, wheel: u, front: u - c, hands: 0 };
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// scene geometry (viewBox 0 0 240 260): fork axis x = 120, crown at y = 46, lower leg top at y = 120, axle at y = 190
const X = 120, CROWN = 46, LEG_TOP = 120, AXLE = 190, WHEEL_R = 46, GROUND = AXLE + WHEEL_R;
function springPoints(len) {
  const n = 9, top = CROWN + 6, pts = [`${X},${top}`];
  for (let i = 1; i < n; i++) pts.push(`${X + (i % 2 ? -8 : 8)},${(top + (len * i) / n).toFixed(1)}`);
  pts.push(`${X},${(top + len).toFixed(1)}`);
  return pts.join(' ');
}
const SPRING_LEN = LEG_TOP - CROWN - 6;

function forkMarkup(kind, labels, title) {
  const inner = kind === 'spring'
    ? `<polyline data-k="spring" class="fa-spring" points="${springPoints(SPRING_LEN)}"/>` +
      `<text class="fa-label" x="${X + 20}" y="${CROWN + 40}">${esc(labels.spring)}</text>`
    : `<rect data-k="air" class="fa-air" x="${X - 7}" y="${CROWN + 6}" width="14" height="${SPRING_LEN}" fill-opacity=".25"/>` +
      `<text class="fa-label" x="${X + 20}" y="${CROWN + 40}">${esc(labels.air)}</text>`;
  const oil = kind === 'air'
    ? `<g data-k="oil"><rect class="fa-oil" x="${X - 6}" y="${LEG_TOP + 26}" width="12" height="30"/>` +
      `<text class="fa-label" x="${X + 20}" y="${LEG_TOP + 44}">${esc(labels.oil)}</text></g>`
    : '';
  const spokes = [0, 45, 90, 135].map(a => {
    const r = a * Math.PI / 180, dx = Math.cos(r) * (WHEEL_R - 8), dy = Math.sin(r) * (WHEEL_R - 8);
    return `<line class="fa-thin" x1="${(X - dx).toFixed(1)}" y1="${(AXLE - dy).toFixed(1)}" x2="${(X + dx).toFixed(1)}" y2="${(AXLE + dy).toFixed(1)}"/>`;
  }).join('');
  return `<svg class="fork-scene" data-fork="${kind}" viewBox="0 0 240 260" role="img" aria-label="${esc(title)}">` +
    `<line class="fa-ground" x1="0" y1="${GROUND}" x2="240" y2="${GROUND}"/>` +
    `<g data-k="bump"><path class="fa-bump" d="M-30 ${GROUND} C-12 ${GROUND} -12 ${GROUND - BUMP_H * S} 0 ${GROUND - BUMP_H * S} C12 ${GROUND - BUMP_H * S} 12 ${GROUND} 30 ${GROUND} Z"/></g>` +
    `<g data-k="lower">` +
      `<circle class="fa-tyre" cx="${X}" cy="${AXLE}" r="${WHEEL_R - 4}"/>${spokes}<circle class="fa-hub" cx="${X}" cy="${AXLE}" r="5"/>` +
      `<rect class="fa-leg" x="${X - 13}" y="${LEG_TOP}" width="26" height="${AXLE - LEG_TOP}" rx="6"/>${oil}` +
    `</g>` +
    `<g data-k="front">` +
      `<line class="fa-thick" x1="${X}" y1="${CROWN}" x2="${X}" y2="14"/>` +
      `<line class="fa-thick" x1="${X - 44}" y1="14" x2="${X + 30}" y2="14"/><circle class="fa-hand" cx="${X - 40}" cy="14" r="8"/>` +
      `<rect class="fa-crown" x="${X - 18}" y="${CROWN - 8}" width="36" height="12" rx="3"/>` +
      `<rect class="fa-stanchion" x="${X - 9}" y="${CROWN}" width="18" height="${LEG_TOP - CROWN + 30}"/>` + inner +
      `<g data-k="hands" opacity="0"><path class="fa-hit" d="M${X - 58} 0 L${X - 50} 8 M${X - 62} 14 L${X - 52} 14 M${X - 58} 28 L${X - 50} 20"/>` +
      `<text class="fa-label fa-hit-text" x="${X - 34}" y="40">${esc(labels.hands)}</text></g>` +
    `</g></svg>`;
}

const api = { FORK_PERIOD, forkPose, forkMarkup };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
