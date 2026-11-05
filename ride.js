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

const api = { RIDE, wheelRevs, speedOf, ridePose, LAYERS, layerShift };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
