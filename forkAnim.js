// Фитстенд — анимация вилки: пружинная и воздушная в разрезе, режимы «Кочка» и «Подъём», блокировка.
// forkPose и forkMarkup — чистые функции (тестируются в Node); applyPose, forkBlock, startForkAnim — для страницы.
(function (root) {
const FORK_PERIOD = 3;            // seconds per loop
const BUMP_H = 0.7, CREST = 0.65;  // bump height (of full travel); the bump is under the axle at CREST
const S = 60;                      // px of full travel on the drawing
const TAU = 2 * Math.PI;
const K = 0.55 / BUMP_H;           // share of the bump the fork swallows; the rest lifts the bar a little
const AXLE_X = 120, WHEEL_OUT = 46, BUMP_HALF = 30, BUMP_SPEED = 240; // px, px, px, px/s

const wrap = t => ((t % FORK_PERIOD) + FORK_PERIOD) % FORK_PERIOD;
// the bump: a raised cosine BUMP_HALF px to each side, BUMP_H·S px high
const bumpHeight = dx => (Math.abs(dx) <= BUMP_HALF ? (BUMP_H * S * (1 + Math.cos((Math.PI * dx) / BUMP_HALF))) / 2 : 0);
// it rolls from beyond the right edge to beyond the left one
const bumpCenter = t => AXLE_X + (CREST - wrap(t)) * BUMP_SPEED;
// how high the bump lifts a round tyre: the tyre rests on the highest point of the bump under it
function wheelLift(bx) {
  let lift = 0;
  for (let dx = -BUMP_HALF; dx <= BUMP_HALF; dx += 0.25) {
    const x = bx + dx - AXLE_X;
    if (Math.abs(x) >= WHEEL_OUT) continue;
    lift = Math.max(lift, bumpHeight(dx) - (WHEEL_OUT - Math.sqrt(WHEEL_OUT * WHEEL_OUT - x * x)));
  }
  return lift / S;
}
// the bar after the crest: the spring fork rocks it a little, the air fork lets it dip once and glide back (oil damps the rebound)
function barAfterCrest(kind, tau) {
  if (kind === 'spring') {
    const w = TAU * 1.4, z = 0.2, wd = w * Math.sqrt(1 - z * z);
    return -0.2 * Math.exp(-z * w * tau) * Math.sin(wd * tau);
  }
  const w = TAU * 0.9, x = w * tau;
  return (-0.1 * x * x * Math.exp(-x)) / (4 * Math.exp(-2));
}

function forkPose(kind, mode, t, locked) {
  const tt = wrap(t);
  if (mode === 'climb') {
    if (locked) return { c: 0, wheel: 0, front: 0, hands: 0 };
    const c = (kind === 'spring' ? 0.18 : 0.1) * (1 - Math.cos((TAU * 7 * tt) / FORK_PERIOD)) / 2; // 7 pushes a loop — cadence 70
    return { c, wheel: 0, front: -c, hands: 0 };
  }
  const u = wheelLift(bumpCenter(tt));
  if (locked) return { c: 0, wheel: u, front: u, hands: u / BUMP_H };
  const front = (1 - K) * u + (tt > CREST ? barAfterCrest(kind, tt - CREST) : 0);
  return { c: u - front, wheel: u, front, hands: 0 };
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

// scene geometry (viewBox 0 −52 240 296: room above for the bar jumping with a locked fork): fork axis x = 120, crown at y = 46, lower leg top at y = 120, axle at y = 190
const X = AXLE_X, CROWN = 46, LEG_TOP = 120, AXLE = 190, WHEEL_R = WHEEL_OUT, GROUND = AXLE + WHEEL_R;
function springPoints(len) {
  const n = 9, top = CROWN + 6, pts = [`${X},${top}`];
  for (let i = 1; i < n; i++) pts.push(`${X + (i % 2 ? -8 : 8)},${(top + (len * i) / n).toFixed(1)}`);
  pts.push(`${X},${(top + len).toFixed(1)}`);
  return pts.join(' ');
}
const SPRING_LEN = LEG_TOP - CROWN - 6;

// the bump drawn from the same profile the wheel rides on, centred at x = 0
function bumpPath() {
  const pts = [];
  for (let dx = -BUMP_HALF; dx <= BUMP_HALF; dx += 3) pts.push(`${dx} ${(GROUND - bumpHeight(dx)).toFixed(1)}`);
  return `M${pts.join(' L')} Z`;
}

function forkMarkup(kind, labels, title) {
  const inner = kind === 'spring'
    ? `<polyline data-k="spring" class="fa-spring" points="${springPoints(SPRING_LEN)}"/>` +
      `<text class="fa-label" x="${X + 20}" y="${CROWN + 40}">${esc(labels.spring)}</text>`
    : `<rect data-k="air" class="fa-air" x="${X - 7}" y="${CROWN + 6}" width="14" height="${SPRING_LEN}" fill-opacity=".25"/>` +
      `<text class="fa-label" x="${X + 20}" y="${CROWN + 22}">${esc(labels.air)}</text>`;
  const oil = kind === 'air'
    ? `<g data-k="oil"><rect class="fa-oil" x="${X - 6}" y="${LEG_TOP + 26}" width="12" height="30"/>` +
      `<text class="fa-label" x="${X + 20}" y="${LEG_TOP + 8}">${esc(labels.oil)}</text></g>`
    : '';
  const spokes = [0, 45, 90, 135].map(a => {
    const r = a * Math.PI / 180, dx = Math.cos(r) * (WHEEL_R - 8), dy = Math.sin(r) * (WHEEL_R - 8);
    return `<line class="fa-thin" x1="${(X - dx).toFixed(1)}" y1="${(AXLE - dy).toFixed(1)}" x2="${(X + dx).toFixed(1)}" y2="${(AXLE + dy).toFixed(1)}"/>`;
  }).join('');
  return `<svg class="fork-scene" data-fork="${kind}" viewBox="0 -52 240 296" role="img" aria-label="${esc(title)}">` +
    `<line class="fa-ground" x1="0" y1="${GROUND}" x2="240" y2="${GROUND}"/>` +
    `<g data-k="bump"><path class="fa-bump" d="${bumpPath()}"/></g>` +
    `<g data-k="front">` +
      `<line class="fa-thick" x1="${X}" y1="${CROWN}" x2="${X}" y2="14"/>` +
      `<line class="fa-thick" x1="${X - 44}" y1="14" x2="${X + 30}" y2="14"/><circle class="fa-hand" cx="${X - 40}" cy="14" r="8"/>` +
      `<rect class="fa-crown" x="${X - 18}" y="${CROWN - 8}" width="36" height="12" rx="3"/>` +
      `<rect class="fa-stanchion" x="${X - 9}" y="${CROWN}" width="18" height="${LEG_TOP - CROWN + 30}"/>` + inner +
      `<g data-k="hands" opacity="0"><path class="fa-hit" d="M${X - 58} 0 L${X - 50} 8 M${X - 62} 14 L${X - 52} 14 M${X - 58} 28 L${X - 50} 20"/>` +
      `<text class="fa-label fa-hit-text" x="${X + 36}" y="18">${esc(labels.hands)}</text></g>` +
    `</g>` +
    `<g data-k="lower">` +
      `<circle class="fa-tyre" cx="${X}" cy="${AXLE}" r="${WHEEL_R - 4}"/>${spokes}<circle class="fa-hub" cx="${X}" cy="${AXLE}" r="5"/>` +
      `<rect class="fa-leg" x="${X - 13}" y="${LEG_TOP}" width="26" height="${AXLE - LEG_TOP}" rx="6"/>${oil}` +
    `</g>` +
    `</svg>`;
}

// ---------- page ----------
function applyPose(svg, pose, bumpX) {
  const k = name => svg.querySelector(`[data-k="${name}"]`);
  k('front').setAttribute('transform', `translate(0 ${(-pose.front * S).toFixed(2)})`);
  k('lower').setAttribute('transform', `translate(0 ${(-pose.wheel * S).toFixed(2)})`);
  const len = SPRING_LEN - pose.c * S;
  const sp = k('spring'); if (sp) sp.setAttribute('points', springPoints(len));
  const air = k('air');
  if (air) { air.setAttribute('height', len.toFixed(2)); air.setAttribute('fill-opacity', (0.25 + 0.5 * Math.max(pose.c, 0)).toFixed(3)); }
  const b = k('bump');
  if (bumpX === null) b.setAttribute('opacity', '0');
  else { b.setAttribute('opacity', '1'); b.setAttribute('transform', `translate(${bumpX.toFixed(1)} 0)`); }
  k('hands').setAttribute('opacity', pose.hands.toFixed(3));
}


function forkBlock(anim) {
  const btn = (attr, val, label, on) => `<button class="chip" ${attr}${val !== null ? `="${val}"` : ''} aria-pressed="${on}">${esc(label)}</button>`;
  return `<section class="fork-anim"><h2>${esc(anim.title)}</h2><div class="fork-scenes">` +
    ['spring', 'air'].map(k => `<figure>${forkMarkup(k, anim.labels, anim.kinds[k])}<figcaption>${esc(anim.kinds[k])}</figcaption></figure>`).join('') +
    `</div><div class="fork-ctl">${btn('data-fork-mode', 'bump', anim.modes.bump, true)}${btn('data-fork-mode', 'climb', anim.modes.climb, false)}` +
    `${btn('data-fork-lock', null, anim.lock, false)}<button class="chip" data-fork-play>${esc(anim.pause)}</button></div>` +
    `<p class="fork-cap" aria-live="polite">${esc(anim.captions.bump.off)}</p></section>`;
}

function startForkAnim(rootEl, anim, win = typeof window !== 'undefined' ? window : null) {
  const reduce = !!(win && win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const st = { mode: 'bump', locked: false, playing: !reduce, t: reduce ? CREST : 0 }; // paused on a moment that shows something
  const scenes = [...rootEl.querySelectorAll('svg[data-fork]')];
  const cap = rootEl.querySelector('.fork-cap'), play = rootEl.querySelector('[data-fork-play]');
  let last = null, stopped = false;
  function sync() {
    rootEl.querySelectorAll('[data-fork-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.forkMode === st.mode)));
    const lock = rootEl.querySelector('[data-fork-lock]'); if (lock) lock.setAttribute('aria-pressed', String(st.locked));
    if (play) play.textContent = st.playing ? anim.pause : anim.play;
    if (cap) cap.textContent = anim.captions[st.mode][st.locked ? 'on' : 'off'];
  }
  function draw() {
    for (const svg of scenes) applyPose(svg, forkPose(svg.dataset.fork, st.mode, st.t, st.locked), st.mode === 'bump' ? bumpCenter(st.t) : null);
  }
  if (rootEl.addEventListener) rootEl.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.forkMode) st.mode = b.dataset.forkMode;
    else if (b.hasAttribute('data-fork-lock')) st.locked = !st.locked;
    else if (b.hasAttribute('data-fork-play')) { st.playing = !st.playing; last = null; }
    else return;
    sync(); draw();
  });
  function frame(now) {
    if (stopped || !rootEl.isConnected) return;
    if (st.playing) {
      if (last !== null) st.t = wrap(st.t + Math.min(0.05, (now - last) / 1000)); // a tab back from the background does not jump
      last = now;
      draw();
    }
    win.requestAnimationFrame(frame);
  }
  sync(); draw();
  if (win) win.requestAnimationFrame(frame);
  return { stop() { stopped = true; }, state: () => ({ ...st }) };
}

const api = { FORK_PERIOD, FORK_S: S, AXLE_X, WHEEL_OUT, BUMP_HALF, bumpHeight, bumpCenter, forkPose, forkMarkup, applyPose, forkBlock, startForkAnim };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
