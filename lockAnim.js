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

const api = { LOCK_PERIOD, lockState };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
