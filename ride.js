// Фитстенд — сцена поездки на главной: поза в момент цикла, слои фона с параллаксом.
// ridePose и layerShift — чистые функции (тестируются в Node).
(function (root) {
const RIDE = { PERIOD: 9, CRANK_REVS: 12, SPEED: 6000 }; // s, crank turns a loop (cadence 80), mm/s (≈ 22 km/h)
const TAU = 2 * Math.PI;
const wrap = t => ((t % RIDE.PERIOD) + RIDE.PERIOD) % RIDE.PERIOD;

// a whole number of wheel turns a loop, so the valve mark comes back to its place; the road then moves exactly with the wheel
const wheelRevs = wheelR => Math.max(1, Math.round((RIDE.SPEED * RIDE.PERIOD) / (TAU * wheelR)));
const speedOf = wheelR => (wheelRevs(wheelR) * TAU * wheelR) / RIDE.PERIOD;

// every wobble has a whole number of periods a loop: no seam, and mixed periods read as irregular
function ridePose(t, wheelR) {
  const tau = wrap(t) / RIDE.PERIOD, s = (n, ph = 0) => Math.sin(TAU * n * tau + ph);
  return {
    crank: 360 * RIDE.CRANK_REVS * tau,
    wheel: 360 * wheelRevs(wheelR) * tau,
    ground: speedOf(wheelR) * RIDE.PERIOD * tau,
    torso: 1.2 * s(2 * RIDE.CRANK_REVS),                    // a little towards each pushing leg
    breath: 3 * (1 - Math.cos(TAU * 3 * tau)),             // 3 breaths a loop
    bar: 0.6 * s(2, 0.3) + 0.45 * s(5, 1.1) + 0.3 * s(7, 2), // small steering corrections
    bounce: 1.5 * s(13) + 1.5 * s(29, 0.7),                 // the tyres on a not quite smooth road
  };
}

// parallax: far hills barely move, trees faster, the grass by the road faster than the road itself
const LAYERS = [{ id: 'far', k: 0.06 }, { id: 'mid', k: 0.35 }, { id: 'near', k: 1.3 }, { id: 'road', k: 1 }];
function layerShift(id, t, wheelR) {
  const { k } = LAYERS.find(l => l.id === id), run = speedOf(wheelR) * RIDE.PERIOD * k;
  const n = Math.max(1, Math.round(run / 3500)), tile = run / n;   // a whole number of tiles a loop
  return { x: -((speedOf(wheelR) * wrap(t) * k) % tile), tile };
}

// ---------- background, drawn in mm like the bike; y grows downwards as in the markup ----------
const f1 = n => n.toFixed(1);
// a tiny seeded random, so the trees stand in the same places every time
function rng(seed) { return () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; }; }
// a hill line that repeats every tile: whole numbers of waves across it
function hillPath(tile, h, base, waves) {
  let d = `M0 ${f1(h)}`;
  for (let x = 0; x <= tile + 0.01; x += tile / 80) {
    const y = base - waves.reduce((sum, [a, n, ph]) => sum + a * Math.cos((TAU * n * x) / tile + ph), 0);
    d += ` L${f1(x)} ${f1(y)}`;
  }
  return d + ` L${f1(tile)} ${f1(h)} Z`;
}
function trees(tile, h, seed) {
  const r = rng(seed), n = 6;
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = ((i + 0.2 + r() * 0.6) * tile) / n, th = 140 + r() * 120, cw = 110 + r() * 90, ch = 150 + r() * 130;
    if (r() < 0.3) { out += `<ellipse class="rb-bush" cx="${f1(x)}" cy="${f1(h - 40)}" rx="${f1(cw * 1.1)}" ry="${f1(ch * 0.35)}"/>`; continue; }
    out += `<rect class="rb-trunk" x="${f1(x - 14)}" y="${f1(h - th)}" width="28" height="${f1(th)}"/>`;
    out += `<ellipse class="rb-tree" cx="${f1(x)}" cy="${f1(h - th - ch * 0.6)}" rx="${f1(cw)}" ry="${f1(ch)}"/>`;
    out += `<ellipse class="rb-tree rb-tree2" cx="${f1(x - cw * 0.35)}" cy="${f1(h - th - ch * 0.3)}" rx="${f1(cw * 0.7)}" ry="${f1(ch * 0.7)}"/>`;
  }
  return out;
}
function grass(tile, seed) {
  const r = rng(seed);
  let out = '';
  for (let x = 20; x < tile - 20; x += 40 + r() * 70) {
    const hgt = 50 + r() * 70;
    out += `<path class="rb-grass" d="M${f1(x - 14)} 170 Q${f1(x - 10)} ${f1(170 - hgt * 0.6)} ${f1(x - 22)} ${f1(170 - hgt)} M${f1(x)} 170 Q${f1(x + 2)} ${f1(170 - hgt * 0.7)} ${f1(x + 6)} ${f1(170 - hgt * 1.1)} M${f1(x + 12)} 170 Q${f1(x + 14)} ${f1(170 - hgt * 0.5)} ${f1(x + 26)} ${f1(170 - hgt * 0.8)}"/>`;
  }
  for (const px of [tile * 0.31, tile * 0.81]) out += `<rect class="rb-post" x="${f1(px)}" y="40" width="34" height="130" rx="6"/><rect class="rb-reflector" x="${f1(px + 6)}" y="56" width="22" height="16" rx="3"/>`;
  return out;
}
function specks(tile, h, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < 70; i++) out += `<rect class="rb-speck" x="${f1(r() * (tile - 40))}" y="${f1(6 + r() * (h - 12))}" width="${f1(10 + r() * 30)}" height="3"/>`;
  return out;
}

// the whole background for the view b (viewBox in mm) with the ground at groundY
function rideBgMarkup(b, groundY, wheelR) {
  const tile = id => layerShift(id, 0, wheelR).tile;
  const X0 = b.x - b.w * 0.2, W = b.w * 1.4, Y0 = b.y - b.h * 0.2, bottom = b.y + b.h * 1.1;
  const HF = 900, HM = 700, HR = Math.max(60, bottom - groundY), HN = 170, NY = groundY + 34;
  const pat = (id, y, h, inner) => `<pattern id="rb-${id}" patternUnits="userSpaceOnUse" x="0" y="${f1(y)}" width="${f1(tile(id))}" height="${f1(h)}">${inner}</pattern>`;
  const rect = (id, y, h) => `<rect x="${f1(X0)}" y="${f1(y)}" width="${f1(W)}" height="${f1(h)}" fill="url(#rb-${id})"/>`;
  const tf = tile('far'), tm = tile('mid'), tr = tile('road'), tn = tile('near');
  const defs = '<defs>' +
    '<linearGradient id="rb-skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--sky-top)"/><stop offset="1" style="stop-color:var(--sky-bottom)"/></linearGradient>' +
    '<radialGradient id="rb-sunG" cx="0.12" cy="0.25" r="0.75"><stop offset="0" style="stop-color:var(--sun);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--sun);stop-opacity:0"/></radialGradient>' +
    '<linearGradient id="rb-hazeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--haze);stop-opacity:0"/><stop offset="1" style="stop-color:var(--haze);stop-opacity:.6"/></linearGradient>' +
    pat('far', groundY - HF, HF,
      `<path class="rb-hill2" d="${hillPath(tf, HF, HF * 0.42, [[90, 1, 0.4], [50, 2, 1.7], [25, 3, 2.9]])}"/>` +
      `<path class="rb-hill" d="${hillPath(tf, HF, HF * 0.68, [[70, 1, 2.2], [40, 2, 0.3], [20, 4, 1.1]])}"/>`) +
    pat('mid', groundY - HM, HM, trees(tm, HM, 7)) +
    pat('road', groundY, HR, `<rect class="rb-road" x="0" y="0" width="${f1(tr)}" height="${f1(HR)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tr)}" height="6"/>${specks(tr, Math.min(HR, 120), 11)}`) +
    pat('near', NY, HN, grass(tn, 23)) +
    '</defs>';
  return `<g id="rideBg">${defs}` +
    `<rect class="rb-sky" x="${f1(X0)}" y="${f1(Y0)}" width="${f1(W)}" height="${f1(groundY - Y0)}" fill="url(#rb-skyG)"/>` +
    `<rect x="${f1(X0)}" y="${f1(Y0)}" width="${f1(W)}" height="${f1(groundY - Y0)}" fill="url(#rb-sunG)"/>` +
    rect('far', groundY - HF, HF) +
    `<rect x="${f1(X0)}" y="${f1(groundY - HF)}" width="${f1(W)}" height="${HF}" fill="url(#rb-hazeG)"/>` +
    `<g class="rb-midlayer">${rect('mid', groundY - HM, HM)}</g>` +
    rect('road', groundY, HR) +
    `<g class="rb-nearlayer">${rect('near', NY, HN)}</g>` +
    '</g>';
}
// move the four patterns (x in mm, negative — the scene runs to the left)
function applyRide(svg, shifts) {
  for (const id of ['far', 'mid', 'near', 'road']) svg.querySelector('#rb-' + id).setAttribute('patternTransform', `translate(${+shifts[id].toFixed(2)} 0)`);
}

const api = { RIDE, wheelRevs, speedOf, ridePose, LAYERS, layerShift, rideBgMarkup, applyRide };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
