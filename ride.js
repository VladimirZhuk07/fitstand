// Фитстенд — сцена поездки на главной: поза в момент цикла, слои фона с параллаксом.
// ridePose и layerShift — чистые функции (тестируются в Node).
(function (root) {
const RIDE = { PERIOD: 9, CRANK_REVS: 12, SPEED: 6000 }; // s, crank turns a loop (cadence 80), mm/s (≈ 22 km/h)
const TAU = 2 * Math.PI;
const wrap = t => ((t % RIDE.PERIOD) + RIDE.PERIOD) % RIDE.PERIOD;

// a scene per kind of ride (feedback 5): speed of the background, roughness of the road, what fills the layers.
// bounce: [amplitude mm, whole periods a loop, phase] — every wobble has a whole number of periods, so the loop has no seam
const SCENES = {
  default: { kmh: 21.6, bounce: [[1.5, 13, 0], [1.5, 29, 0.7]], effect: 'none', layers: { far: 'default', mid: 'default', near: 'default', road: 'default' } },
  road:    { kmh: 32.5, bounce: [[0.6, 13, 0], [0.6, 29, 0.7]], effect: 'none', layers: { far: 'open', mid: 'barriers', near: 'asphalt', road: 'smooth' } },
  city:    { kmh: 16.5, bounce: [[1.2, 13, 0], [1.2, 29, 0.7]], effect: 'none', layers: { far: 'roofs', mid: 'street', near: 'curb', road: 'tiles' } },
  mtb:     { kmh: 24, bounce: [[3.5, 7, 0], [2.5, 17, 0.7], [2, 31, 1.9]], effect: 'dust', layers: { far: 'forest', mid: 'trunks', near: 'roots', road: 'dirt' } },
  hybrid:  { kmh: 20, bounce: [[1.5, 13, 0], [1.5, 29, 0.7]], effect: 'none', layers: { far: 'default', mid: 'park', near: 'verge', road: 'cracks' } },
  women:   { kmh: 14, bounce: [[0.8, 13, 0], [0.8, 29, 0.7]], effect: 'none', layers: { far: 'water', mid: 'promenade', near: 'flowers', road: 'tiles' } },
  gravel:  { kmh: 23.5, bounce: [[2.2, 9, 0], [1.8, 23, 0.7]], effect: 'dust', layers: { far: 'fields', mid: 'fence', near: 'gravel', road: 'gravelroad' } },
  cx:      { kmh: 24, bounce: [[3, 7, 0], [2.5, 19, 0.7], [2, 37, 1.9]], effect: 'mud', layers: { far: 'woodline', mid: 'course', near: 'mudgrass', road: 'mud' } },
  track:   { kmh: 37.5, bounce: [[0.3, 13, 0], [0.3, 29, 0.7]], effect: 'none', tilt: 4, layers: { far: 'stands', mid: 'rail', near: 'trackline', road: 'wood' } },
  folding: { kmh: 13.5, bounce: [[1, 13, 0], [1, 29, 0.7]], effect: 'none', layers: { far: 'harbour', mid: 'quay', near: 'cobbles', road: 'tiles' } },
};
const STYLE_SCENE = { road: 'road', city: 'city', mtb: 'mtb', fullsus: 'mtb', hybrid: 'hybrid', women: 'women', gravel: 'gravel', cx: 'cx', track: 'track', folding: 'folding' };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const sceneOf = style => (typeof style === 'string' && has(STYLE_SCENE, style) ? STYLE_SCENE[style] : 'default');
const sceneData = id => (typeof id === 'string' && has(SCENES, id) ? SCENES[id] : SCENES.default);

// a whole number of wheel turns a loop, so the valve mark comes back to its place; the road then moves exactly with the wheel
const wheelRevs = (wheelR, sceneId) => Math.max(1, Math.round(((sceneData(sceneId).kmh / 3.6) * 1000 * RIDE.PERIOD) / (TAU * wheelR)));
const speedOf = (wheelR, sceneId) => (wheelRevs(wheelR, sceneId) * TAU * wheelR) / RIDE.PERIOD;

// every wobble has a whole number of periods a loop: no seam, and mixed periods read as irregular
function ridePose(t, wheelR, sceneId) {
  const tau = wrap(t) / RIDE.PERIOD, s = (n, ph = 0) => Math.sin(TAU * n * tau + ph);
  return {
    crank: 360 * RIDE.CRANK_REVS * tau,
    wheel: 360 * wheelRevs(wheelR, sceneId) * tau,
    ground: speedOf(wheelR, sceneId) * RIDE.PERIOD * tau,
    torso: 2 * s(2 * RIDE.CRANK_REVS),                      // 2° towards each pushing leg, at the cadence; the head holds (model.js)
    breath: 3 * (1 - Math.cos(TAU * 3 * tau)),             // 3 breaths a loop
    bar: 0.6 * s(2, 0.3) + 0.45 * s(5, 1.1) + 0.3 * s(7, 2), // small steering corrections
    bounce: sceneData(sceneId).bounce.reduce((sum, [a, n, ph]) => sum + a * s(n, ph), 0), // the tyres on the road
  };
}

// parallax: far hills barely move, trees faster, the grass by the road faster than the road itself
const LAYERS = [{ id: 'far', k: 0.06 }, { id: 'mid', k: 0.35 }, { id: 'near', k: 1.3 }, { id: 'road', k: 1 }];
function layerShift(id, t, wheelR, sceneId) {
  const { k } = LAYERS.find(l => l.id === id), speed = speedOf(wheelR, sceneId), run = speed * RIDE.PERIOD * k;
  const n = Math.max(1, Math.round(run / 3500)), tile = run / n;   // a whole number of tiles a loop
  return { x: -((speed * wrap(t) * k) % tile), tile };
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
    const x0 = ((i + 0.2 + r() * 0.6) * tile) / n, th = 140 + r() * 120, cw = 110 + r() * 90, ch = 150 + r() * 130;
    const x = Math.min(tile - cw * 1.1 - 2, Math.max(cw * 1.1 + 2, x0)); // a crown never crosses the tile edge: no seam
    if (r() < 0.3) { out += `<ellipse class="rb-bush" cx="${f1(x)}" cy="${f1(h - ch * 0.35 - 2)}" rx="${f1(cw * 1.1)}" ry="${f1(ch * 0.35)}"/>`; continue; }
    out += `<rect class="rb-trunk" x="${f1(x - 14)}" y="${f1(h - th)}" width="28" height="${f1(th)}"/>`;
    out += `<ellipse class="rb-tree" cx="${f1(x)}" cy="${f1(h - th - ch * 0.6)}" rx="${f1(cw)}" ry="${f1(ch)}"/>`;
    out += `<ellipse class="rb-tree rb-tree2" cx="${f1(x - cw * 0.35)}" cy="${f1(h - th - ch * 0.3)}" rx="${f1(cw * 0.7)}" ry="${f1(ch * 0.7)}"/>`;
  }
  return out;
}
// grass tufts and posts on the verge; h is the tile height, everything stands on its bottom
function grass(tile, seed, h) {
  const r = rng(seed);
  let out = '';
  for (let x = 20; x < tile - 20; x += 40 + r() * 70) {
    const hgt = 40 + r() * 50, b = h - 2;
    out += `<path class="rb-grass" d="M${f1(x - 14)} ${b} Q${f1(x - 10)} ${f1(b - hgt * 0.6)} ${f1(x - 22)} ${f1(b - hgt)} M${f1(x)} ${b} Q${f1(x + 2)} ${f1(b - hgt * 0.7)} ${f1(x + 6)} ${f1(b - hgt * 1.1)} M${f1(x + 12)} ${b} Q${f1(x + 14)} ${f1(b - hgt * 0.5)} ${f1(x + 26)} ${f1(b - hgt * 0.8)}"/>`;
  }
  for (const px of [tile * 0.31, tile * 0.81]) out += `<rect class="rb-post" x="${f1(px)}" y="${f1(h - 102)}" width="30" height="100" rx="6"/><rect class="rb-reflector" x="${f1(px + 5)}" y="${f1(h - 90)}" width="20" height="14" rx="3"/>`;
  return out;
}
function specks(tile, h, seed) {
  const r = rng(seed);
  let out = '';
  for (let i = 0; i < 70; i++) out += `<rect class="rb-speck" x="${f1(r() * (tile - 40))}" y="${f1(6 + r() * (h - 12))}" width="${f1(10 + r() * 30)}" height="3"/>`;
  return out;
}

// ---------- layer builders: each draws the inside of one pattern tile; the scene table says which one a layer uses ----------
// y of a hill line made by hillPath at x
const hillY = (tile, base, waves, x) => base - waves.reduce((sum, [a, n, ph]) => sum + a * Math.cos((TAU * n * x) / tile + ph), 0);
// small props shared by the scenes; all of them stand on the bottom of the tile (y = h) and inside x .. x + width
const benchAt = (bx, h) => `<rect class="rb-bench" x="${f1(bx)}" y="${f1(h - 64)}" width="170" height="14" rx="3"/><rect class="rb-bench" x="${f1(bx)}" y="${f1(h - 104)}" width="170" height="10" rx="3"/><rect class="rb-bench" x="${f1(bx + 14)}" y="${f1(h - 50)}" width="10" height="48"/><rect class="rb-bench" x="${f1(bx + 146)}" y="${f1(h - 50)}" width="10" height="48"/>`;
const lampAt = (lx, h) => `<rect class="rb-lamp" x="${f1(lx)}" y="${f1(h - 330)}" width="10" height="330"/><rect class="rb-lamp" x="${f1(lx - 18)}" y="${f1(h - 340)}" width="46" height="14" rx="5"/>`;
const BUILD = {
  far: {
    default: (tile, h) => `<path class="rb-hill2" d="${hillPath(tile, h, h * 0.42, [[90, 1, 0.4], [50, 2, 1.7], [25, 3, 2.9]])}"/><path class="rb-hill" d="${hillPath(tile, h, h * 0.68, [[70, 1, 2.2], [40, 2, 0.3], [20, 4, 1.1]])}"/>`,
    // a dense forest on the hills with the sky showing through
    forest: (tile, h) => {
      const w = [[40, 2, 0.5], [22, 5, 1.3]], base = h * 0.55, rg = rng(29), n = 30;
      let crowns = '';
      for (let i = 0; i < n; i++) { const x = ((i + 0.5) * tile) / n, rx = 40 + rg() * 26, ry = 46 + rg() * 30; crowns += `<ellipse class="rb-treeline" cx="${f1(x)}" cy="${f1(hillY(tile, base, w, x) - ry * 0.35)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`; }
      return `<path class="rb-hill2" d="${hillPath(tile, h, base + 20, w)}"/>${crowns}<path class="rb-hill" d="${hillPath(tile, h, h * 0.8, [[30, 3, 0.9], [14, 7, 2.1]])}"/>`;
    },
    // a quiet water front: a strip of water, low roofs and trees beyond it
    water: (tile, h) => {
      const n = 10, cell = tile / n, rg = rng(73);
      let out = '';
      for (let i = 0; i < n; i++) { const H = 70 + rg() * 90; out += `<rect class="rb-hill2" x="${f1(i * cell + 4)}" y="${f1(h * 0.7 - H)}" width="${f1(cell - 8)}" height="${f1(H)}"/>`; }
      for (let i = 0; i < 7; i++) { const x = ((i + 0.5) * tile) / 7, rx = 40 + rg() * 20, ry = 30 + rg() * 16; out += `<ellipse class="rb-treeline" cx="${f1(x)}" cy="${f1(h * 0.7 - 60 - ry * 0.4)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`; }
      return out + `<rect class="rb-water" x="0" y="${f1(h * 0.7)}" width="${f1(tile)}" height="${f1(h * 0.3)}"/>`;
    },
    // low rooftops in two rows and the crowns of the street trees above them
    roofs: (tile, h) => {
      const n = 14, cell = tile / n, r = rng(17);
      let rows = '', crowns = '';
      for (const [cls, hmax, hmin] of [['rb-hill2', 330, 160], ['rb-hill', 230, 90]])
        for (let i = 0; i < n; i++) { const H = hmin + r() * (hmax - hmin); rows += `<rect class="${cls}" x="${f1(i * cell + 3)}" y="${f1(h - H)}" width="${f1(cell - 6)}" height="${f1(H)}"/>`; }
      for (let i = 0; i < 9; i++) { const x = ((i + 0.5) * tile) / 9, rx = 40 + r() * 25, ry = 36 + r() * 20; crowns += `<ellipse class="rb-treeline" cx="${f1(x)}" cy="${f1(h - 230 - ry * 0.4)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`; }
      return rows + crowns;
    },
    // an open horizon: long low hills and a far line of trees
    open: (tile, h) => {
      const w = [[18, 1, 2.2], [10, 3, 1.1]], base = h * 0.78, r = rng(5), n = 18;
      let line = '';
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) * tile) / n, rx = 26 + r() * 14, ry = 14 + r() * 8;
        line += `<ellipse class="rb-treeline" cx="${f1(x)}" cy="${f1(hillY(tile, base, w, x) - ry * 0.5)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`;
      }
      return `<path class="rb-hill2" d="${hillPath(tile, h, h * 0.66, [[26, 1, 0.4], [14, 2, 1.7]])}"/><path class="rb-hill" d="${hillPath(tile, h, base, w)}"/>${line}`;
    },
  },
  mid: {
    default: (tile, h) => trees(tile, h, 7),
    // a park: trees behind, a hedge, a picket fence and a couple of signposts
    park: (tile, h) => {
      const rg = rng(61), n = Math.max(1, Math.round(tile / 36)), step = tile / n;
      let out = trees(tile, h, 23);
      for (let i = 0; i < 6; i++) { const rx = 90 + rg() * 50; out += `<ellipse class="rb-bush" cx="${f1(((i + 0.5) * tile) / 6)}" cy="${f1(h - 70)}" rx="${f1(rx)}" ry="48"/>`; }
      out += `<rect class="rb-fence" x="0" y="${f1(h - 66)}" width="${f1(tile)}" height="9"/><rect class="rb-fence" x="0" y="${f1(h - 34)}" width="${f1(tile)}" height="9"/>`;
      for (let i = 0; i < n; i++) out += `<rect class="rb-fence" x="${f1(i * step + step * 0.25)}" y="${f1(h - 84)}" width="${f1(step * 0.5)}" height="84"/>`;
      for (const px of [tile * 0.28, tile * 0.74]) out += `<rect class="rb-post" x="${f1(px)}" y="${f1(h - 250)}" width="12" height="170"/><rect class="rb-sign" x="${f1(px - 26)}" y="${f1(h - 304)}" width="64" height="50" rx="7"/>`;
      return out;
    },
    // a promenade: flower beds, round shrubs, benches and lamps
    promenade: (tile, h) => {
      const n = Math.max(3, Math.round(tile / 420)), cell = tile / n, rg = rng(79);
      let out = '', front = '';
      for (let i = 0; i < n; i++) {
        const cx = i * cell + cell * 0.3;
        out += `<ellipse class="rb-bush" cx="${f1(cx)}" cy="${f1(h - 80)}" rx="${f1(70 + rg() * 24)}" ry="74"/>`;
        out += lampAt(i * cell + cell * 0.9, h);
        const bx = i * cell + cell * 0.08;
        front += benchAt(bx, h);
        for (let k = 0; k < 5; k++) front += `<ellipse class="rb-flower" cx="${f1(bx + 190 + k * 26)}" cy="${f1(h - 24 - rg() * 12)}" rx="9" ry="8"/>`;
        front += `<ellipse class="rb-bush" cx="${f1(bx + 250)}" cy="${f1(h - 14)}" rx="84" ry="12"/>`;
      }
      return out + front;
    },
    // the forest wall: dense crowns, dark trunks in front, boulders by the path
    trunks: (tile, h) => {
      const n = 9, cell = tile / n, rg = rng(43);
      let out = trees(tile, h, 19);
      for (let i = 0; i < n; i++) { const w = 40 + rg() * 44, H = 560 + rg() * 320; out += `<rect class="rb-trunk-dark" x="${f1(i * cell + cell * (0.2 + rg() * 0.5))}" y="${f1(h - H)}" width="${f1(w)}" height="${f1(H)}"/>`; }
      for (let i = 0; i < 4; i++) { const rx = 70 + rg() * 40, ry = 44 + rg() * 20; out += `<ellipse class="rb-boulder" cx="${f1(((i + 0.5) * tile) / 4 + rg() * 60 - 30)}" cy="${f1(h - ry - 2)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`; }
      return out;
    },
    // houses with windows, lamp posts and benches along a street
    street: (tile, h) => {
      const n = Math.max(3, Math.round(tile / 420)), cell = tile / n, r = rng(31);
      let out = '', front = '';
      for (let i = 0; i < n; i++) {
        const x = i * cell + cell * 0.1, w = cell * 0.8, H = 300 + r() * 120, cols = Math.max(2, Math.floor(w / 90));
        out += `<rect class="rb-house" x="${f1(x)}" y="${f1(h - H)}" width="${f1(w)}" height="${f1(H)}"/>`;
        for (let c = 0; c < cols; c++) for (let row = 0; row < 3; row++)
          out += `<rect class="rb-window" x="${f1(x + (w / cols) * (c + 0.5) - 18)}" y="${f1(h - H + 40 + row * 78)}" width="36" height="46" rx="4"/>`;
        const lx = i * cell + cell * 0.9;
        out += lampAt(lx, h);
        if (i % 2 === 0) front += benchAt(i * cell + cell * 0.35, h);
      }
      return out + front;
    },
    // a guardrail along the road, with posts, and two signs on poles
    barriers: (tile, h) => {
      const n = Math.max(1, Math.round(tile / 140)), step = tile / n;
      let out = `<rect class="rb-barrier" x="0" y="${f1(h - 78)}" width="${f1(tile)}" height="16"/><rect class="rb-barrier" x="0" y="${f1(h - 48)}" width="${f1(tile)}" height="10"/>`;
      for (let i = 0; i < n; i++) out += `<rect class="rb-barrier" x="${f1(i * step + step / 2 - 6)}" y="${f1(h - 64)}" width="12" height="56"/>`;
      for (const px of [tile * 0.22, tile * 0.68]) out += `<rect class="rb-post" x="${f1(px)}" y="${f1(h - 300)}" width="14" height="${f1(222)}"/><rect class="rb-sign" x="${f1(px - 30)}" y="${f1(h - 360)}" width="74" height="60" rx="8"/>`;
      return out;
    },
  },
  near: {
    default: (tile, h) => grass(tile, 23, h),
    // the verge of a park path: grass and small stones
    verge: (tile, h) => {
      const rg = rng(67);
      let out = grass(tile, 29, h);
      for (let i = 0; i < 8; i++) { const rx = 10 + rg() * 12, ry = 7 + rg() * 5; out += `<ellipse class="rb-boulder" cx="${f1(((i + 0.5) * tile) / 8)}" cy="${f1(h - ry - 3)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`; }
      return out;
    },
    // roots across the way, stones and ferns
    roots: (tile, h) => {
      const rg = rng(37), n = 6, cell = tile / n;
      let out = '';
      for (let i = 0; i < n; i++) {
        const x = i * cell + cell * 0.25, y = h - 10;
        out += `<path class="rb-fern" d="M${f1(x)} ${f1(y)} Q${f1(x + 6)} ${f1(y - 45)} ${f1(x - 18)} ${f1(y - 70)} M${f1(x + 10)} ${f1(y)} Q${f1(x + 22)} ${f1(y - 50)} ${f1(x + 40)} ${f1(y - 66)}"/>`;
        const rx = 18 + rg() * 14, ry = 12 + rg() * 8;
        out += `<ellipse class="rb-boulder" cx="${f1(x + cell * 0.45)}" cy="${f1(h - ry - 3)}" rx="${f1(rx)}" ry="${f1(ry)}"/>`;
        const rx0 = i * cell; // the root stays inside its own cell: nothing is cut off at the tile seam
        out += `<path class="rb-root" d="M${f1(rx0 + cell * 0.55)} ${f1(h - 6)} Q${f1(rx0 + cell * 0.7)} ${f1(h - 48)} ${f1(rx0 + cell * 0.95)} ${f1(h - 20)}"/>`;
      }
      return out;
    },
    // flowers on tall stems in the grass by the promenade
    flowers: (tile, h) => {
      const rg = rng(83), n = 12, cell = tile / n;
      let out = grass(tile, 17, h);
      for (let i = 0; i < n; i++) { const x = i * cell + cell * (0.2 + rg() * 0.6), y = 24 + rg() * 24; out += `<ellipse class="rb-flower" cx="${f1(x)}" cy="${f1(y)}" rx="9" ry="8"/>`; }
      return out;
    },
    // the pavement edge: a kerb, flower beds
    curb: (tile, h) => {
      const n = 7, cell = tile / n, r = rng(13);
      let out = `<rect class="rb-tile" x="0" y="${f1(h * 0.4)}" width="${f1(tile)}" height="${f1(h * 0.2)}"/>`;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5) * cell;
        out += `<ellipse class="rb-bush" cx="${f1(x)}" cy="${f1(h * 0.4 - 8)}" rx="${f1(60 + r() * 20)}" ry="22"/>`;
        for (let k = 0; k < 4; k++) out += `<ellipse class="rb-flower" cx="${f1(x - 36 + k * 24)}" cy="${f1(h * 0.4 - 20 - r() * 8)}" rx="7" ry="6"/>`;
      }
      return out + `<rect class="rb-road" x="0" y="${f1(h * 0.62)}" width="${f1(tile)}" height="${f1(h * 0.38)}"/>`;
    },
    // smooth asphalt of the road shoulder with a long marking line: the blur makes it a fast stripe
    asphalt: (tile, h) => `<rect class="rb-road" x="0" y="${f1(h * 0.3)}" width="${f1(tile)}" height="${f1(h * 0.7)}"/><rect class="rb-marking" x="0" y="${f1(h * 0.3 + 8)}" width="${f1(tile)}" height="8"/>`,
  },
  road: {
    default: (tile, h) => `<rect class="rb-road" x="0" y="0" width="${f1(tile)}" height="${f1(h)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tile)}" height="5"/>${specks(tile, h, 11)}`,
    // asphalt with a few cracks
    cracks: (tile, h) => {
      const rg = rng(71), n = 5, cell = tile / n;
      let out = `<rect class="rb-road" x="0" y="0" width="${f1(tile)}" height="${f1(h)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tile)}" height="5"/>${specks(tile, h, 11)}`;
      for (let i = 0; i < n; i++) {
        let x = i * cell + cell * 0.2, y = h * 0.3 + rg() * h * 0.3, d = `M${f1(x)} ${f1(y)}`;
        for (let k = 0; k < 4; k++) { x += 26 + rg() * 24; y = Math.min(h - 6, Math.max(8, y + (rg() - 0.5) * 30)); d += ` L${f1(x)} ${f1(y)}`; }
        out += `<path class="rb-crack" d="${d}"/>`;
      }
      return out;
    },
    // packed earth with roots across it and patches of sunlight through the leaves
    dirt: (tile, h) => {
      const rg = rng(53), n = 5, cell = tile / n;
      let out = `<rect class="rb-road" x="0" y="0" width="${f1(tile)}" height="${f1(h)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tile)}" height="5"/>${specks(tile, h, 11)}`;
      for (let i = 0; i < n; i++) {
        const x = i * cell + cell * 0.35;
        out += `<path class="rb-root" d="M${f1(x)} ${f1(h - 8)} Q${f1(x + 30)} ${f1(h * 0.2)} ${f1(x + 90)} ${f1(h - 14)}"/>`;
        out += `<ellipse class="rb-light" cx="${f1(x + cell * 0.3)}" cy="${f1(h * 0.5)}" rx="${f1(50 + rg() * 30)}" ry="14"/>`;
      }
      return out;
    },
    // asphalt with a stretch of paving under the kerb
    tiles: (tile, h) => {
      const n = Math.max(8, Math.round(tile / 66)), step = tile / n;
      let out = `<rect class="rb-road" x="0" y="0" width="${f1(tile)}" height="${f1(h)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tile)}" height="5"/>`;
      for (let i = 0; i < n; i++) out += `<rect class="rb-tile" x="${f1(i * step + 3)}" y="${f1(h * 0.55)}" width="${f1(step - 6)}" height="26" rx="3"/>`;
      return out;
    },
    // flawless asphalt with a dashed centre line
    smooth: (tile, h) => {
      const n = Math.max(1, Math.round(tile / 340)), step = tile / n;
      let out = `<rect class="rb-road" x="0" y="0" width="${f1(tile)}" height="${f1(h)}"/><rect class="rb-roadedge" x="0" y="0" width="${f1(tile)}" height="5"/>`;
      for (let i = 0; i < n; i++) out += `<rect class="rb-marking" x="${f1(i * step + (step - 150) / 2)}" y="${f1(h * 0.55)}" width="150" height="8"/>`;
      return out;
    },
  },
};
const layerInner = (layer, sceneId, tile, h) => (BUILD[layer][sceneData(sceneId).layers[layer]] || BUILD[layer].default)(tile, h);

// the whole background for the view b (viewBox in mm) with the ground at groundY
function rideBgMarkup(b, groundY, wheelR, sceneId) {
  const tile = id => layerShift(id, 0, wheelR, sceneId).tile;
  // a wide screen shows more than the viewBox (preserveAspectRatio meet), so the background reaches far past it
  const X0 = b.x - b.w * 3, W = b.w * 7, Y0 = b.y - b.h, bottom = b.y + b.h * 2;
  // the road is a band under the wheels; below it a verge with grass and posts
  const HF = 900, HM = 900, RY = groundY - 25, HR = 80, VY = RY + HR, HN = 125, NY = VY;
  const pat = (id, y, h, inner) => `<pattern id="rb-${id}" patternUnits="userSpaceOnUse" x="0" y="${f1(y)}" width="${f1(tile(id))}" height="${f1(h)}">${inner}</pattern>`;
  // the rect starts a little inside its pattern: a pattern drawn right to its tile edge leaves a hairline there
  const rect = (id, y, h) => `<rect x="${f1(X0)}" y="${f1(y + 4)}" width="${f1(W)}" height="${f1(h - 4)}" fill="url(#rb-${id})"/>`;
  const tf = tile('far'), tm = tile('mid'), tr = tile('road'), tn = tile('near');
  const defs = '<defs>' +
    '<linearGradient id="rb-skyG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,var(--sky-top),var(--tint,transparent) var(--tk,0%))"/><stop offset="1" style="stop-color:color-mix(in srgb,var(--sky-bottom),var(--tint,transparent) var(--tk,0%))"/></linearGradient>' +
    '<radialGradient id="rb-sunG" cx="0.12" cy="0.25" r="0.75"><stop offset="0" style="stop-color:var(--sun);stop-opacity:.55"/><stop offset="1" style="stop-color:var(--sun);stop-opacity:0"/></radialGradient>' +
    '<linearGradient id="rb-hazeG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--haze);stop-opacity:0"/><stop offset="0.75" style="stop-color:var(--haze);stop-opacity:0"/><stop offset="1" style="stop-color:var(--haze);stop-opacity:.6"/></linearGradient>' +
    pat('far', groundY - HF, HF, layerInner('far', sceneId, tf, HF)) +
    pat('mid', groundY - HM, HM, layerInner('mid', sceneId, tm, HM)) +
    pat('road', RY, HR, layerInner('road', sceneId, tr, HR)) +
    pat('near', NY, HN, layerInner('near', sceneId, tn, HN)) +
    '</defs>';
  return `<g id="rideBg" data-scene="${sceneData(sceneId) === SCENES.default ? 'default' : sceneId}">${defs}` +
    `<rect class="rb-sky" x="${f1(X0)}" y="${f1(Y0)}" width="${f1(W)}" height="${f1(groundY - Y0)}" fill="url(#rb-skyG)"/>` +
    `<rect x="${f1(X0)}" y="${f1(Y0)}" width="${f1(W)}" height="${f1(groundY - Y0)}" fill="url(#rb-sunG)"/>` +
    rect('far', groundY - HF, HF) +
    // the haze starts far above the view, so its top edge is never on screen
    `<rect x="${f1(X0)}" y="${f1(Y0)}" width="${f1(W)}" height="${f1(groundY - Y0)}" fill="url(#rb-hazeG)"/>` +
    `<g class="rb-midlayer">${rect('mid', groundY - HM, HM)}</g>` +
    `<rect class="rb-verge" x="${f1(X0)}" y="${f1(VY)}" width="${f1(W)}" height="${f1(bottom - VY)}"/>` +
    rect('road', RY, HR) +
    `<g class="rb-nearlayer">${rect('near', NY, HN)}</g>` +
    '</g>';
}
// move the four patterns (x in mm, negative — the scene runs to the left)
function applyRide(svg, shifts) {
  for (const id of ['far', 'mid', 'near', 'road']) svg.querySelector('#rb-' + id).setAttribute('patternTransform', `translate(${+shifts[id].toFixed(2)} 0)`);
}

// a slow device: the last 60 frame intervals (s) average above 40 ms (a 30 fps cap is not slow) — then the depth blur is dropped
const slowFrames = dts => dts.length >= 60 && dts.slice(-60).reduce((a, b) => a + b, 0) / 60 > 0.04;

// ---------- dust behind the rear wheel (mountain bike): six puffs, each lives a sixth of the loop, so the loop has no seam ----------
const FX_N = 6;
// relative to the rear wheel and the ground, in mm: dx back, dy up; r radius; o opacity
function effectPuffs(t, sceneId) {
  if (sceneData(sceneId).effect !== 'dust' || sceneData(sceneId) === SCENES.default) return [];
  const tau = wrap(t) / RIDE.PERIOD, out = [];
  for (let i = 0; i < FX_N; i++) {
    const u = (tau * FX_N + i / FX_N) % 1;
    out.push({ dx: -(40 + u * 300), dy: 20 + u * 90, r: 22 + u * 46, o: 0.65 * (1 - u) });
  }
  return out;
}
const fxMarkup = sceneId => (sceneData(sceneId).effect === 'dust' ? `<g id="fx">${Array.from({ length: FX_N }, (_, i) => `<circle id="fx-${i}" class="fx-dust" cx="0" cy="0" r="1" opacity="0"/>`).join('')}</g>` : '');
// w: the rear wheel's x and the ground line (model mm, y up); the markup has y down
function applyFx(svg, puffs, w) {
  svg.querySelector('#fx').setAttribute('display', puffs.length ? 'inline' : 'none');
  puffs.forEach((p, i) => {
    const el = svg.querySelector('#fx-' + i);
    for (const [k, v] of Object.entries({ cx: +(w.x + p.dx).toFixed(1), cy: +(-(w.y + p.dy)).toFixed(1), r: +p.r.toFixed(1), opacity: +p.o.toFixed(3) })) el.setAttribute(k, v);
  });
}

// the shadow follows the bounce by a few percent: it shrinks a little as the bike rises (bounce is relative to the scene's own amplitude)
function shadowScale(bounce, sceneId) {
  const amp = sceneData(sceneId).bounce.reduce((sum, [a]) => sum + a, 0), k = amp ? Math.max(-1, Math.min(1, bounce / amp)) : 0;
  return { sx: 1 - 0.04 * k, sy: 1 - 0.08 * k };
}

const api = { shadowScale, effectPuffs, fxMarkup, applyFx, slowFrames, RIDE, SCENES, sceneOf, wheelRevs, speedOf, ridePose, LAYERS, layerShift, rideBgMarkup, applyRide };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
