// Builds info/image-prompts.md for image generation in Cursor (or any generator).
// usage (from the repo root): node tools/make-image-prompts.js [repo] [out]   -> info/image-prompts.md
const repo = process.argv[2] || require('path').join(__dirname, '..');
const out = process.argv[3] || repo + '/info/image-prompts.md';
const { CONTENT: C } = require(repo + '/content.js');
const fs = require('fs');

const STYLE = 'Photorealistic studio product photo, single object centered, three-quarter view, pure white seamless background (#FFFFFF), soft even studio lighting with a gentle shadow under the object, sharp focus, no people unless stated, no text, no letters, no numbers, no logos, no brand marks, no stickers, no watermark, unbranded generic design, matte neutral colours (black, grey, dark blue), square 1:1 image.';

// English subjects for every accessory id (content.js keys)
const ACC = {
  helmet: 'an unbranded black bicycle helmet with vents, city style',
  frontLight: 'a compact unbranded bicycle front LED headlight with a handlebar mount',
  rearLight: 'a small unbranded red bicycle rear light with a seatpost strap',
  bell: 'a classic chrome bicycle bell on a short piece of handlebar',
  reflectors: 'a set of bicycle reflectors: white front, red rear, orange spoke reflectors and pedal reflectors',
  gloves: 'a pair of black cycling gloves with padded palms, one with short fingers and one with full fingers',
  glasses: 'unbranded sport cycling sunglasses with wraparound lenses',
  vest: 'a fluorescent yellow cycling safety vest with reflective stripes, laid flat',
  mirror: 'a small round bicycle bar-end mirror',
  radar: 'a small unbranded bicycle rear radar light unit with a seatpost mount',
  pump: 'a compact unbranded hand bicycle pump with a frame mount',
  tube: 'a folded black bicycle inner tube with a valve',
  levers: 'three plastic bicycle tyre levers',
  multitool: 'a folding bicycle multitool with hex keys, screwdrivers and a chain tool, partly opened',
  patches: 'a small bicycle puncture repair kit: patches, a tube of glue and sandpaper in an open box',
  quickLink: 'two bicycle chain quick links next to a short piece of chain',
  pumpMount: 'a bicycle pump bracket attached under a bottle cage on a piece of frame tube',
  saddleBag: 'a small black bicycle saddle bag attached under a saddle',
  ties: 'black zip ties, a roll of black electrical tape and a few small bolts',
  firstAid: 'a compact dark green first aid pouch with a small white plus sign, partly open, with plasters and a bandage; no red cross',
  uLock: 'a bicycle D-lock (U-lock) shown unlocked: a long U-shaped steel shackle (about 25 cm tall) lying next to its separate straight horizontal crossbar, the crossbar is a long black cylinder as wide as the shackle with two holes for the shackle ends and a key slot at one end; no padlock body; key beside it',
  chainLock: 'a thick bicycle chain lock in a black fabric sleeve with a padlock',
  cableLock: 'a coiled bicycle cable lock with a combination lock',
  secureBolts: 'bicycle anti-theft security skewers and a special key',
  gpsTracker: 'a small black rectangular GPS tracker device, about the size of a matchbox, with a rubber strap, next to a bicycle bottle cage',
  rack: 'an aluminium rear bicycle pannier rack, unmounted',
  bags: 'two black waterproof bicycle pannier bags with roll-top closures and rack hooks on the back, standing side by side',
  basket: 'a woven bicycle front basket with a quick-release handlebar bracket',
  childSeat: 'a rear child bicycle seat for a luggage rack: high moulded plastic shell with a backrest and side wings, padded insert, shoulder harness straps, two adjustable footrests with ankle straps mounted on the sides of the shell, plastic leg guards that keep feet away from the spokes',
  trailer: 'a two-wheel bicycle child trailer with a rain cover',
  barBag: 'a small black bicycle handlebar bag',
  bottle: 'a plastic cycling water bottle in a black bottle cage',
  fenders: 'a pair of black bicycle mudguards (front and rear fenders)',
  rainJacket: 'a lightweight cycling rain jacket with reflective details, laid flat',
  saddleCover: 'a waterproof bicycle saddle cover on a saddle',
  overshoes: 'a pair of black waterproof cycling overshoes',
  thermal: 'a long-sleeve thermal base layer top, laid flat',
  jersey: 'a plain dark blue short-sleeve cycling jersey with rear pockets, laid flat, no print',
  gilet: 'a lightweight windproof cycling gilet (vest), laid flat',
  buff: 'a plain grey neck tube (buff)',
  shorts: 'black padded cycling shorts, laid flat',
  windJacket: 'a thin packable cycling wind jacket, laid flat',
  tights: 'black long cycling tights, laid flat',
  winterGloves: 'a pair of insulated winter cycling gloves, lobster style',
  ergoGrips: 'a pair of ergonomic bicycle grips with wide palm rests',
  barEnds: 'a straight flat bicycle handlebar with grips and two short black bar ends pointing forward at both ends',
  saddle: 'two bicycle saddles side by side: a wide comfort saddle and a narrow sport saddle',
  suspPost: 'a suspension bicycle seatpost with a visible spring',
  stemBar: 'a short adjustable-angle bicycle stem and a riser handlebar',
  pedals: 'three bicycle pedals side by side: a flat platform pedal, a clipless pedal and a dual-sided combination pedal',
  shoes: 'a pair of plain black cycling shoes with a stiff sole and velcro straps, side view, plain surfaces',
  shortCranks: 'a short bicycle crankset (crank arms with chainring)',
  computer: 'a small unbranded bicycle computer on a handlebar mount, screen off',
  gps: 'a smartphone in a bicycle handlebar phone mount, screen off',
  cadenceHr: 'a bicycle cadence sensor and a chest heart rate strap',
  powerBank: 'a compact black power bank with a short cable',
  pressureSensor: 'two small black bicycle tyre pressure sensors shaped like valve caps, next to a bicycle tyre valve',
  actionCam: 'a small unbranded action camera with a handlebar mount',
  lube: 'two small unlabelled bottles of bicycle chain lube',
  cleaner: 'an unlabelled spray bottle of bicycle degreaser and a microfibre cloth',
  brushes: 'a set of bicycle cleaning brushes for chain and cassette',
  floorPump: 'an unbranded bicycle floor pump with a pressure gauge',
  repairStand: 'a folding bicycle repair stand with a clamp',
  bikeCover: 'a folded grey waterproof bicycle cover',
  wallMount: 'a wall-mounted bicycle hook bracket',
  roofRack: 'a bicycle roof rack carrier for a car roof bar, unmounted',
  hitchRack: 'a platform bicycle carrier for a car tow hitch, for two bikes, unmounted',
  travelBag: 'a padded bicycle travel bag, closed',
  trainingWheels: 'a pair of children bicycle training wheels with brackets',
  pushHandle: 'a detachable parent push handle for a child bicycle',
  kidsHelmet: 'a colourful child bicycle helmet with knee and elbow pads',
  kidSeatHarness: 'a child bicycle seat with a five-point harness and foot straps',
  flags: 'a tall orange bicycle safety flag on a fibreglass pole and a few reflectors',
};

// parts variants (content.js parts.*.variants order)
const PARTS = {
  frame: ['a bare aluminium bicycle frame', 'a bare steel bicycle frame with thin round tubes', 'a bare carbon bicycle frame with shaped tubes', 'a bare titanium bicycle frame, brushed finish'],
  fork: ['a rigid bicycle fork', 'a simple suspension bicycle fork for a city or trekking bike: two silver stanchions sliding into black lower legs, preload knob on top', 'an air suspension mountain bike fork'],
  brakes: ['a bicycle rim brake caliper on a wheel rim', 'a mechanical disc brake caliper with a rotor and cable', 'a hydraulic disc brake caliper with a rotor and hose', 'a rear bicycle hub with a coaster brake arm'],
  drivetrain: ['a single-speed bicycle chainring, chain and single cog', 'an internal gear hub rear wheel hub', 'a 1x mountain bike drivetrain: single chainring and wide cassette', 'a 2x road bicycle drivetrain: double chainring, front and rear derailleurs'],
  rims: ['a plain steel bicycle wheel rim with spokes, chrome finish', 'a light single-wall aluminium bicycle rim with spokes', 'a deep double-wall aluminium bicycle rim with eyelets and spokes', 'a deep-section carbon bicycle rim with spokes, matte black'],
  tyres: ['a smooth slick road bicycle tyre', 'a single semi-slick city bicycle tyre standing upright, seen almost head-on from the front so the tread faces the camera: a completely smooth bald strip runs down the middle of the tread, small knobs only along the two outer edges, ring shape with an open centre', 'an all-round gravel bicycle tyre with a fine dense tread', 'a single wide knobby mountain bike tyre (2.4 inch) standing upright, seen at a three-quarter angle, thin round ring shape like a real bicycle tyre with a large open centre, square knobs along the tread, nothing inside the ring', 'a narrow mud bicycle tyre with tall widely spaced knobs', 'a studded winter bicycle tyre with metal spikes'],
  cockpit: ['a flat mountain bike handlebar with grips', 'a swept-back city bicycle handlebar', 'a road bicycle drop handlebar', 'a flared gravel drop handlebar'],
  saddle: ['a wide padded comfort bicycle saddle', 'a narrow sport bicycle saddle', 'a dropper seatpost with a remote lever'],
  pedals: ['a flat platform bicycle pedal', 'a small road bike clipless pedal: narrow aerodynamic body with a spring-loaded cleat binding at the front and rear, no pins, no flat platform, with a matching triangular shoe cleat beside it', 'a dual-sided bicycle pedal: one side is a flat platform with small metal pins, the other side has a spring-loaded clipless cleat binding in the middle; tilted at an angle so both the platform side and the binding are clearly visible'],
};

// drivetrain details (content.js parts.drivetrain.details): a photo of each detail and of each of its kinds, in order
const DETAILS = {
  bb: { photo: 'a bicycle bottom bracket cartridge: a threaded cylindrical metal unit with sealed bearings and splined axle ends sticking out on both sides, shown alone', kinds: [] },
  cranks: { photo: 'a bicycle crankset without pedals: the right crank arm with two chainrings attached and the separate left crank arm lying beside it', kinds: [
    'an inexpensive steel bicycle crankset: shiny chrome steel crank arm with a stamped steel chainring and a chain guard ring, city bike style',
    'a forged aluminium bicycle crankset: matte black aluminium crank arms with a machined aluminium chainring',
    'a lightweight carbon fibre bicycle crankset: crank arms with visible carbon weave texture and a black chainring'] },
  chain: { photo: 'a loosely coiled bicycle chain, silver and dark grey links', kinds: [
    'a short straight length of wide single-speed bicycle chain with plain flat silver plates and a connecting link',
    'a short straight length of narrow derailleur bicycle chain with shaped, bevelled inner plates, grey and silver'] },
  fd: { photo: 'a bicycle front derailleur, unmounted: a round clamp band and a narrow curved metal cage that guides the chain', kinds: [] },
  rd: { photo: 'a bicycle rear derailleur, unmounted: the body with a spring and a long cage holding two small toothed jockey pulleys', kinds: [] },
  cassette: { photo: 'a bicycle rear cassette: ten sprockets stacked from smallest to largest, viewed at an angle so the cone shape is visible', kinds: [
    'a bicycle cassette: a stack of separate sprockets and a lockring placed next to a rear hub with a splined freehub body, showing that the sprockets slide onto the splines',
    'a threaded bicycle freewheel: a single solid block of seven sprockets with the threaded ratchet body in the centre, shown alone'] },
  shifters: { photo: 'a short piece of flat bicycle handlebar with a rubber grip and a trigger gear shifter with two thumb levers clamped next to the grip', kinds: [
    'an unmounted bicycle trigger shifter with two thumb levers and a small blank gear indicator window',
    'a twist-grip bicycle gear shifter on a short piece of handlebar: a rotating ribbed rubber ring next to a fixed rubber grip, with a plain unmarked indicator ring'] },
  cables: { photo: 'bicycle gear cables: a coiled thin steel inner cable with a small barrel end, and several pieces of black cable housing with silver metal end caps', kinds: [] },
};

// bike types (content.js types keys), stage 3 of the third feedback
const TYPE_STYLE = 'Strict side view (profile) of the whole bicycle, front wheel on the right, the bicycle spans the full width of the frame and sits in the vertical centre with empty white space above and below, both wheels fully visible, no rider, no kickstand.';
const TYPES = {
  city: 'a city bicycle: upright swept-back handlebar, full fenders, rear rack, chain guard, step-over frame, 28 inch wheels, dark blue',
  hybrid: 'a hybrid bicycle: flat handlebar, 700c wheels with 38 mm tyres with a light tread, aluminium frame, rigid fork, disc brakes, grey',
  women: "a women's hybrid bicycle with a low step-through frame, flat handlebar, 700c wheels, wide comfortable saddle, teal",
  gravel: 'a gravel bicycle: flared drop handlebar, 700c wheels with 42 mm tyres with a fine tread, disc brakes, olive green',
  cx: 'a cyclocross bicycle: drop handlebar, 700c wheels with narrow 33 mm knobby tyres, high bottom bracket, no fenders, red',
  road: 'a road racing bicycle: drop handlebar, 700c wheels with narrow 28 mm slick tyres, lightweight frame, black',
  track: 'a track bicycle: single fixed gear, no brakes at all, no derailleurs, low drop handlebar, 700c wheels, white',
  mountain: 'a trail hardtail mountain bike: 140 mm suspension fork, no rear shock, wide 2.4 inch knobby tyres, 29 inch wheels, wide flat handlebar, dropper seatpost, orange',
  mtb: 'a cross-country hardtail mountain bike: 100 mm suspension fork, no rear shock, 29 inch wheels with knobby tyres, flat handlebar, dark green',
  fullsus: 'a full-suspension mountain bike: suspension fork and a rear shock with a rear swingarm, 29 inch wheels with knobby tyres, wide flat handlebar, charcoal',
  folding: 'a folding bicycle (unfolded, ready to ride): 20 inch wheels, hinge in the middle of the frame, long seatpost, tall handlebar stem, silver',
  ebike: 'a city electric bicycle: battery mounted on the down tube, motor at the bottom bracket, upright handlebar, fenders, rear rack, 28 inch wheels, dark grey',
  trike: 'an adult tricycle: one front wheel and two rear wheels on a rear axle, large basket between the rear wheels, low step-through frame, upright handlebar, light blue',
  cargo: 'a front-loader cargo bicycle: long wheelbase, large open wooden box in front of the rider between the handlebar and a small front wheel, 20 inch front wheel, 26 inch rear wheel',
  kidTrike: "a toddler's tricycle with pedals on the front wheel hub, small seat with a backrest, and a long parent push handle: a metal bar rising from behind the seat up and back to adult hand height, about twice as tall as the tricycle, with a rubber grip on top, the whole handle fully visible, bright red",
  balance: "a toddler's balance bike without pedals and without a chain, 12 inch wheels, low saddle, metal frame, yellow",
  kidTraining: "a child's 16 inch bicycle with two small training wheels at the back, chain guard, bright blue",
  kid: "a child's 20 inch bicycle without training wheels, flat handlebar, V-brakes, green",
  teen: "a teenager's 24 inch mountain bike with a suspension fork, disc brakes and gears, purple",
  bmx: 'a BMX bicycle: 20 inch wheels, small strong frame, high-rise handlebar with crossbar, axle pegs, chrome',
  special: 'a circus unicycle: one 20 inch wheel, pedals on the wheel axle, saddle on a long post, no handlebar, black and chrome',
};

const TRIAL = ['helmet', 'uLock', 'rack', 'brakes-2', 'childSeat'];
const REDO = ['acc-uLock.png', 'acc-firstAid.png', 'part-pedals-1.png', 'acc-gpsTracker.png', 'acc-bags.png', 'acc-barEnds.png', 'acc-shoes.png', 'acc-pressureSensor.png', 'part-fork-1.png'];
const L = [];
L.push('# Картинки для Фитстенда — промпты', '',
  'Для генерации в Cursor (агент, версия 2.4+, папка `C:\\work\\projects\\fitstand` открыта как проект).', '',
  '## Как запускать', '',
  '1. Сначала **пробная партия** (5 картинок) — раздел «Партия 0».',
  '2. Агенту Cursor: «Сгенерируй картинки по разделу „Партия 0“ файла `info/image-prompts.md`. Для каждой: возьми общий стиль + промпт, сохрани в `img/raw/` под указанным именем файла, PNG, квадрат 1024×1024. Не добавляй никакого текста и логотипов».',
  '3. Посмотрите результат: нет ли логотипов и надписей, правильно ли устроена вещь. Неудачные — перегенерировать.',
  '4. Если всё нормально — дальше партиями по 15–20 (разделы «Партия 1…»).', '',
  '## Общий стиль (добавлять к каждому промпту)', '', '```', STYLE, '```', '');

const accItems = Object.keys(C.accessories).map(id => ({ file: `acc-${id}.png`, ru: C.accessories[id].name, en: ACC[id] }));
const partItems = [];
for (const [pid, list] of Object.entries(PARTS)) list.forEach((en, i) => partItems.push({ file: `part-${pid}-${i}.png`, ru: `${C.parts[pid].name}: ${C.parts[pid].variants[i].name}`, en, key: `${pid}-${i}` }));
const typeItems = Object.keys(C.types).map(id => ({ file: `type-${id}.png`, ru: `Вид: ${C.types[id].name}`, en: TYPES[id] }));
const noType = Object.keys(C.types).filter(id => !TYPES[id]);
if (noType.length) throw new Error('no prompt for type ' + noType.join(', '));
const missing = Object.keys(C.accessories).filter(id => !ACC[id]);
if (missing.length) throw new Error('no prompt for ' + missing.join(', '));
for (const [pid, list] of Object.entries(PARTS)) if (list.length !== C.parts[pid].variants.length) throw new Error('variants mismatch ' + pid);

const row = x => `| \`${x.file}\` | ${x.ru} | ${x.en} |`;
const head = ['| Файл | Что | Промпт |', '|---|---|---|'];
const trial = [...accItems.filter(x => TRIAL.includes(x.file.slice(4, -4))), ...partItems.filter(x => TRIAL.includes(x.key))];
L.push('## Партия 0 — пробная', '', ...head, ...trial.map(row), '');
const rest = [...accItems, ...partItems].filter(x => !trial.includes(x));
for (let i = 0; i * 18 < rest.length; i++) L.push(`## Партия ${i + 1}`, '', ...head, ...rest.slice(i * 18, i * 18 + 18).map(row), '');
const all = [...accItems, ...partItems];
L.push('## Партия 7 — переделки и пропущенные', '', 'Перегенерировать (заменить, если файл есть):', '', ...head, ...REDO.map(f => row(all.find(x => x.file === f))), '');
L.push(`Всего: ${accItems.length + partItems.length} картинок (${accItems.length} аксессуаров, ${partItems.length} вариантов узлов).`, '');
const stage3 = [...typeItems, ...partItems.filter(x => /^part-(rims|tyres)-/.test(x.file))];
L.push('## Этап 3: виды, обода, покрышки', '',
  `${stage3.length} картинок по третьему отзыву. Агенту Cursor: «Сгенерируй картинки по разделу „Этап 3“ файла \`info/image-prompts.md\`. Для каждой: общий стиль + промпт (для видов ещё дополнение для видов), PNG 1024×1024, сохрани в \`img/raw/\` под указанным именем. Без текста и логотипов».`, '',
  'Дополнение к общему стилю — только для видов (`type-*.png`):', '', '```', TYPE_STYLE, '```', '',
  ...head, ...stage3.map(row), '');
const detailItems = [];
for (const d of C.parts.drivetrain.details) {
  const p = DETAILS[d.id];
  if (!p) throw new Error('no prompt for detail ' + d.id);
  if ((d.kinds || []).length !== p.kinds.length) throw new Error('kinds mismatch ' + d.id);
  detailItems.push({ file: `detail-${d.id}.png`, ru: d.name, en: p.photo });
  p.kinds.forEach((en, i) => detailItems.push({ file: `detail-${d.id}-${i}.png`, ru: `${d.name}: ${d.kinds[i].name}`, en }));
}
L.push('## Отзыв 4: детали трансмиссии', '',
  `${detailItems.length} картинок: фото каждой детали и каждого её вида. Квадрат 1:1, 1024×1024, PNG в \`img/raw/\`.`, '',
  ...head, ...detailItems.map(row), '');
fs.writeFileSync(out, L.join('\n'), 'utf8');
console.log('written', accItems.length + partItems.length, 'prompts; trial', trial.length);
