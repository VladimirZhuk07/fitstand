// Фитстенд — объёмный велосипедист для главной: формы по суставам модели (без DOM в расчётах).
// Функции модели (V, add, sub, mul, …) берутся из глобальной области: их кладёт model.js.
(function (root) {
const TAU = 2 * Math.PI;
const f1 = n => n.toFixed(1);
const P = v => `${f1(v.x)} ${f1(-v.y)}`;                     // model y up → markup y down
const unit = v => { const l = Math.hypot(v.x, v.y) || 1; return V(v.x / l, v.y / l); };
const perp = v => V(-v.y, v.x);
const lerp = (a, b, t) => add(a, mul(sub(b, a), t));
const dot = (a, b) => a.x * b.x + a.y * b.y;

// a limb from a to b: rounded ends of widths wa and wb, a bulge on the side of the normal at share `at`
function limbPath(a, b, wa, wb, bulge = 0, at = 0.35) {
  const d = unit(sub(b, a)), n = perp(d), L = Math.hypot(b.x - a.x, b.y - a.y);
  const a1 = add(a, mul(n, wa / 2)), a2 = add(a, mul(n, -wa / 2)), b1 = add(b, mul(n, wb / 2)), b2 = add(b, mul(n, -wb / 2));
  const m = add(a, mul(d, L * at)), wm = wa + (wb - wa) * at;
  const c1 = add(m, mul(n, wm / 2 + Math.max(0, bulge))), c2 = add(m, mul(n, -wm / 2 - Math.max(0, -bulge)));
  return `M${P(a1)} Q${P(c1)} ${P(b1)} A${f1(wb / 2)} ${f1(wb / 2)} 0 0 1 ${P(b2)} Q${P(c2)} ${P(a2)} A${f1(wa / 2)} ${f1(wa / 2)} 0 0 1 ${P(a1)} Z`;
}
// the sign that puts a bulge of the limb a→b on the side of the direction s
const sideOf = (a, b, s) => (dot(perp(unit(sub(b, a))), s) >= 0 ? 1 : -1);

// a loop-safe phase: the same t and t + 9 give exactly the same shapes
const phase = t => (((Math.round(t * 1000) % 9000) + 9000) % 9000) / 9000;

function leg(l, hip, hr, far) {
  const s = far ? '-far' : '', id = n => far ? `rd-far-${n}` : `rd-${n}`, skin = 'rd-skin' + s;
  const back = unit(sub(l.ankle, l.toe));                              // towards the heel
  let heel = add(l.ankle, V(-hr * 0.28, -hr * 0.2)), toe = add(l.toe, V(hr * 0.05, -hr * 0.06)), top = add(l.ankle, V(hr * 0.05, hr * 0.12));
  // the sole rests on the pedal: move the shoe so its bottom edge passes the top of the pedal bar (22 mm, centred on the pedal)
  const hb = add(heel, V(0, -hr * 0.09)), tb = add(toe, V(hr * 0.02, -hr * 0.09));
  const k = (l.pedal.x - hb.x) / ((tb.x - hb.x) || 1), lift = V(0, l.pedal.y + 11 - (hb.y + (tb.y - hb.y) * k));
  heel = add(heel, lift); toe = add(toe, lift); top = add(top, lift);
  return [
    { id: id('thigh'), tag: 'path', cls: skin, attrs: { d: limbPath(hip, l.knee, hr * 1.25, hr * 0.78, hr * 0.12 * sideOf(hip, l.knee, V(0, 1)), 0.4) } },
    { id: id('shin'), tag: 'path', cls: skin, attrs: { d: limbPath(l.knee, l.ankle, hr * 0.74, hr * 0.42, hr * 0.16 * sideOf(l.knee, l.ankle, back), 0.3) } },
    { id: id('sock'), tag: 'path', cls: 'rd-sock' + s, attrs: { d: limbPath(lerp(l.knee, l.ankle, 0.82), l.ankle, hr * 0.5, hr * 0.46) } },
    { id: id('shorts'), tag: 'path', cls: 'rd-shorts' + s, attrs: { d: limbPath(hip, lerp(hip, l.knee, 0.62), hr * 1.4, hr * 1.05, hr * 0.08 * sideOf(hip, l.knee, V(0, 1)), 0.5) } },
    { id: id('shoe'), tag: 'path', cls: 'rd-shoe' + s, attrs: { d: `M${P(heel)} Q${P(add(heel, V(-hr * 0.1, hr * 0.35)))} ${P(top)} Q${P(lerp(top, toe, 0.5))} ${P(add(toe, V(0, hr * 0.28)))} Q${P(add(toe, V(hr * 0.12, 0)))} ${P(toe)} Z` } },
    { id: id('sole'), tag: 'path', cls: 'rd-sole' + s, attrs: { d: `M${P(add(heel, V(-hr * 0.02, hr * 0.02)))} L${P(add(toe, V(hr * 0.05, 0)))} L${P(add(toe, V(hr * 0.02, -hr * 0.09)))} L${P(add(heel, V(0, -hr * 0.09)))} Z` } },
  ];
}

// a ponytail from the back of the head under the helmet: a tapered tail that swings by `sw` degrees
function ponytail(c, R, sw) {
  const root = add(c, V(-R * 1.0, R * 0.3)), tip = add(root, rot(V(-R * 1.15, -R * 0.85), sw));
  return { id: 'rd-ponytail', tag: 'path', cls: 'rd-hair', attrs: { d: limbPath(root, tip, R * 0.42, R * 0.14, R * 0.1, 0.35) } };
}

function riderShapes(g, j, pose = {}) {
  const hr = g.headR, { hip, up } = j, moving = Number.isFinite(pose.t), tau = moving ? phase(pose.t) : 0, fem = !!pose.female;
  // cloth: the shirt hem flutters a little (2 and 5 times a loop), the helmet strap swings
  const hem = moving ? 8 * (0.6 * Math.sin(TAU * 2 * tau) + 0.4 * Math.sin(TAU * 5 * tau + 1)) : 0;
  const strap = moving ? 3 * Math.sin(TAU * 3 * tau) : 0;
  // torso: back curve behind, chest in front
  const d = unit(sub(up.shoulder, hip)), nn = perp(d), front = nn.x > 0 ? nn : mul(nn, -1), back = mul(front, -1);
  // a woman: narrower shoulders, wider hips, a fuller chest line
  const hipB = add(add(hip, mul(back, hr * (fem ? 0.9 : 0.75))), mul(back, hem)), hipF = add(hip, mul(front, hr * (fem ? 0.7 : 0.55)));
  const shB = add(up.shoulder, mul(back, hr * (fem ? 0.5 : 0.6))), shF = add(up.shoulder, mul(front, hr * (fem ? 0.55 : 0.65)));
  const midB = add(lerp(hip, up.shoulder, 0.55), mul(back, hr * 1.0)), chest = add(lerp(hip, up.shoulder, 0.72), mul(front, hr * (fem ? 1.12 : 1.05)));
  const belly = add(lerp(hip, up.shoulder, 0.3), mul(front, hr * 0.8));
  const torsoD = `M${P(hipB)} Q${P(midB)} ${P(shB)} Q${P(add(up.shoulder, mul(d, hr * 0.4)))} ${P(shF)} Q${P(chest)} ${P(lerp(shF, hipF, 0.45))} Q${P(belly)} ${P(hipF)} Q${P(add(hip, mul(d, -hr * 0.5)))} ${P(hipB)} Z`;
  const fold = k => { const a = add(lerp(hip, up.shoulder, k), mul(back, hr * 0.5)), b = add(lerp(hip, up.shoulder, k + 0.08), mul(front, hr * 0.3));
    return `M${P(a)} Q${P(add(lerp(a, b, 0.5), mul(d, -hr * 0.12)))} ${P(b)}`; };
  // head and helmet
  const c = up.head, R = hr, tilt = -8, rot = `rotate(${tilt} ${f1(c.x)} ${f1(-c.y)})`;
  const strapAt = add(c, V(-R * 0.05, R * 0.12));
  const vents = [[-0.55, 0.75], [-0.05, 0.9], [0.45, 0.8]].map(([x, y], i) => ({ id: `rd-vent${i + 1}`, tag: 'ellipse', cls: 'rd-vent', attrs: { cx: f1(c.x + R * x), cy: f1(-c.y - R * y), rx: f1(R * 0.18), ry: f1(R * 0.08), transform: rot } }));
  const neckFrom = add(up.shoulder, mul(d, hr * 0.3)), neckTo = add(c, V(-R * 0.25, -R * 0.55));
  return [
    ...leg(j.far, hip, hr, true),
    { id: 'rd-torso', tag: 'path', cls: 'rd-shirt', attrs: { d: torsoD } },
    { id: 'rd-fold1', tag: 'path', cls: 'rd-fold', attrs: { d: fold(0.25), 'stroke-width': f1(hr * 0.06) } },
    { id: 'rd-fold2', tag: 'path', cls: 'rd-fold', attrs: { d: fold(0.45), 'stroke-width': f1(hr * 0.06) } },
    { id: 'rd-seat', tag: 'ellipse', cls: 'rd-shorts', attrs: { cx: f1(hip.x), cy: f1(-hip.y), rx: f1(hr * (fem ? 0.82 : 0.72)), ry: f1(hr * (fem ? 0.56 : 0.5)) } },
    ...leg(j.near, hip, hr, false),
    { id: 'rd-neck', tag: 'path', cls: 'rd-skin', attrs: { d: limbPath(neckFrom, neckTo, R * 0.5, R * 0.45) } },
    { id: 'rd-head', tag: 'circle', cls: 'rd-skin', attrs: { cx: f1(c.x), cy: f1(-c.y), r: f1(R * 0.92) } },
    { id: 'rd-nose', tag: 'path', cls: 'rd-skin', attrs: { d: `M${P(add(c, V(R * 0.82, -R * 0.05)))} L${P(add(c, V(R * 1.06, -R * 0.32)))} L${P(add(c, V(R * 0.84, -R * 0.4)))} Z` } },
    { id: 'rd-chin', tag: 'path', cls: 'rd-skin', attrs: { d: `M${P(add(c, V(R * 0.2, -R * 0.75)))} Q${P(add(c, V(R * 0.75, -R * 1.0)))} ${P(add(c, V(R * 0.85, -R * 0.55)))} L${P(add(c, V(R * 0.5, -R * 0.3)))} Z` } },
    { id: 'rd-ear', tag: 'ellipse', cls: 'rd-ear', attrs: { cx: f1(c.x - R * 0.12), cy: f1(-c.y + R * 0.05), rx: f1(R * 0.16), ry: f1(R * 0.22) } },
    ...(fem ? [ponytail(c, R, moving ? 10 * Math.sin(TAU * 3 * tau + 0.5) : 0)] : []),
    { id: 'rd-helmet', tag: 'path', cls: 'rd-helmet', attrs: { d: `M${P(add(c, V(-R * 1.12, -R * 0.05)))} Q${P(add(c, V(-R * 1.15, R * 1.25)))} ${P(add(c, V(R * 0.2, R * 1.18)))} Q${P(add(c, V(R * 1.2, R * 1.05)))} ${P(add(c, V(R * 1.18, R * 0.12)))} L${P(add(c, V(R * 0.9, R * 0.18)))} Q${P(add(c, V(0, R * 0.32)))} ${P(add(c, V(-R * 1.12, -R * 0.05)))} Z`, transform: rot } },
    ...vents,
    { id: 'rd-visor', tag: 'path', cls: 'rd-visor', attrs: { d: `M${P(add(c, V(R * 0.95, R * 0.25)))} L${P(add(c, V(R * 1.45, R * 0.18)))} L${P(add(c, V(R * 1.2, R * 0.05)))} Z`, transform: rot } },
    { id: 'rd-strap', tag: 'path', cls: 'rd-strap', attrs: { d: `M${P(strapAt)} Q${P(add(c, V(0.02 * R, -R * 0.5)))} ${P(add(c, V(R * 0.35, -R * 0.92)))}`, 'stroke-width': f1(R * 0.06), transform: `rotate(${f1(strap)} ${f1(strapAt.x)} ${f1(-strapAt.y)})` } },
    { id: 'rd-upper', tag: 'path', cls: 'rd-skin', attrs: { d: limbPath(up.shoulder, up.elbow, hr * 0.62, hr * 0.46, hr * 0.06, 0.35) } },
    { id: 'rd-sleeve', tag: 'path', cls: 'rd-shirt', attrs: { d: limbPath(add(up.shoulder, mul(d, hr * 0.12)), lerp(up.shoulder, up.elbow, 0.45), hr * 0.95, hr * 0.72) } },
    { id: 'rd-fore', tag: 'path', cls: 'rd-skin', attrs: { d: limbPath(up.elbow, up.hand, hr * 0.46, hr * 0.34, hr * 0.07, 0.3) } },
    { id: 'rd-fist', tag: 'ellipse', cls: 'rd-skin', attrs: { cx: f1(up.hand.x), cy: f1(-up.hand.y), rx: f1(hr * 0.3), ry: f1(hr * 0.24) } },
  ];
}

// gradients light from the upper left, like the sun in the scene; colours are CSS variables (light and dark theme)
const grad = (id, a, b, vertical) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="1"><stop offset="0" style="stop-color:${a}"/><stop offset="1" style="stop-color:${b}"/></linearGradient>`;
const DEFS = '<defs>' + grad('rd-gSkin', 'var(--skin-1)', 'var(--skin-2)') + grad('rd-gShirt', 'var(--shirt-1)', 'var(--shirt-2)') +
  grad('rd-gShorts', 'var(--shorts-1)', 'var(--shorts-2)') + grad('rd-gShoe', 'var(--shoe-1)', 'var(--shoe-2)', true) +
  grad('rd-gHelmet', 'color-mix(in srgb,var(--frame) 80%,white)', 'color-mix(in srgb,var(--frame) 75%,black)') + '</defs>';
const tagOf = s => `<${s.tag} id="${s.id}" class="${s.cls}" ${Object.entries(s.attrs).map(([k, v]) => `${k}="${v}"`).join(' ')}/>`;

// the far leg goes before the frame, everything else after the cockpit: two pieces of markup
function riderMarkup(g, j, pose, side) {
  const shapes = riderShapes(g, j, pose).filter(s => (side === 'far') === s.id.startsWith('rd-far-'));
  const f = pose && pose.female ? ' rider-f' : '';
  return side === 'far' ? `<g class="rider rider-v rider-far${f}">${shapes.map(tagOf).join('')}</g>` : `<g class="rider rider-v${f}">${DEFS}${shapes.map(tagOf).join('')}</g>`;
}
// a frame of the animation: only attributes of the existing elements change
function applyRider(svg, shapes) {
  for (const s of shapes) {
    const el = svg.querySelector('#' + s.id);
    if (el) for (const [k, v] of Object.entries(s.attrs)) el.setAttribute(k, v);
  }
}

const api = { limbPath, riderShapes, riderMarkup, applyRider };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
