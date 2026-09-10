import {AU} from './physics.js';

// Placing a star system on screen.
//
// The application's own scale mapping is anchored on the Solar System: one AU
// is a fixed number of scene units. These systems span eight orders of
// magnitude, from two neutron stars a hundredth of an AU apart to Proxima at
// 8700, so a fixed mapping would put every one of them either inside the
// camera's near plane or past its far plane. Each system is therefore drawn
// against its own widest orbit, which always fills the same frame.
//
// The compression is applied to each level of the hierarchy separately rather
// than to a body's distance from the barycentre, and that distinction is the
// whole design. Alpha Centauri A and B are 13.7 AU apart while sitting 700 AU
// from the system's centre of mass: a single radial map from the origin gives
// them very nearly the same radius and draws the pair as one dot. Compressing
// the separation at each node instead keeps the pair readable inside an orbit
// four hundred times its size, which is what a hierarchical system is for.
//
// Real scale drops the compression and the minimum gap and draws everything in
// proportion, exactly as the toggle does everywhere else in the application.
export const SYSTEM_VIEW_RADIUS = 40;
export const SYSTEM_VIEW_EXPONENT = .55;
// Nothing may shrink below a visible dot, and no component may grow past a
// share of the frame.
export const SYSTEM_MIN_BODY = .5, SYSTEM_MAX_BODY = 2;
// A component is also held to a share of the separation of the pair it belongs
// to, so the compression cannot inflate a star until it fills its own orbit:
// Algol's primary really is a fifth of the way to its companion, and the
// power law on its own would draw it at nearly half.
export const SYSTEM_BODY_SHARE = .22;
// Centre-to-centre distance of a pair, as a multiple of the sum of the radii
// drawn for it. Below this the two discs touch and read as a single object.
// It only ever binds where the share above has already lost to the floor - a
// pair too tight to draw in proportion at all, like Alpha Centauri A and B
// inside Proxima's orbit - and there it is what keeps them two objects.
export const SYSTEM_MIN_GAP = 2.2;

export function systemDistance(au, spanAU, compressed = true) {
 if (!(au > 0) || !(spanAU > 0)) return 0;
 return compressed ? SYSTEM_VIEW_RADIUS * Math.pow(au / spanAU, SYSTEM_VIEW_EXPONENT)
  : SYSTEM_VIEW_RADIUS * au / spanAU;
}

export function systemBodyRadius(radiusKm, spanAU, compressed = true, cap = Infinity) {
 const drawn = systemDistance((radiusKm || 0) / AU, spanAU, compressed);
 return compressed ? Math.max(SYSTEM_MIN_BODY, Math.min(drawn, SYSTEM_MAX_BODY, cap)) : drawn;
}

// How large each node is drawn and how far apart its two branches are put.
// The separation of a pair is fixed by the compression alone, the components
// inside it are then capped against that separation, and only then may the
// minimum gap widen the pair - in that order, so widening a pair can never
// feed back into the size of what is inside it.
function measure(node, spanAU, compressed, separationOf, cap = Infinity) {
 if (node.star) return {node, mass: node.star.mass,
  size: systemBodyRadius(node.star.radiusKm, spanAU, compressed, cap)};
 const base = systemDistance(separationOf(node), spanAU, compressed);
 const inner = compressed ? SYSTEM_BODY_SHARE * base : Infinity;
 const primary = measure(node.primary, spanAU, compressed, separationOf, inner);
 const secondary = measure(node.secondary, spanAU, compressed, separationOf, inner);
 const mass = primary.mass + secondary.mass;
 const separation = compressed ? Math.max(base, SYSTEM_MIN_GAP * (primary.size + secondary.size)) : base;
 const size = Math.max(separation * secondary.mass / mass + primary.size,
  separation * primary.mass / mass + secondary.size);
 return {node, mass, size, separation, primary, secondary};
}

// The widest the system is ever drawn: every node at its apocentre. Framing on
// the current configuration instead would lose S2, which starts near pericentre
// and travels out to sixteen times that distance.
export const systemDrawnExtent = (root, spanAU, compressed = true) =>
 measure(root, spanAU, compressed, node => node.semiMajorAU * (1 + node.eccentricity)).size;

// Drawn position and radius for every component in the current state.
// `positionOf(name)` gives a component's live position in AU; each node is
// placed by compressing the vector between the barycentres of its two
// branches, so the integrator keeps full control of where everything is and
// only the length of each separation is rescaled.
export function systemLayout(root, positionOf, spanAU, compressed = true) {
 const barycentre = node => {
  if (node.star) return {mass: node.star.mass, p: positionOf(node.star.name) || [0, 0, 0]};
  const one = barycentre(node.primary), two = barycentre(node.secondary), mass = one.mass + two.mass;
  return {mass, p: one.p.map((value, axis) => (value * one.mass + two.p[axis] * two.mass) / mass)};
 };
 const live = new Map();
 const separationOf = node => {
  const one = barycentre(node.primary).p, two = barycentre(node.secondary).p;
  const offset = two.map((value, axis) => value - one[axis]), length = Math.hypot(...offset);
  live.set(node, {offset, length});
  return length;
 };
 const tree = measure(root, spanAU, compressed, separationOf);
 const placed = new Map();
 const place = (branch, origin) => {
  if (branch.node.star) { placed.set(branch.node.star.name, {p: origin, r: branch.size}); return; }
  const {offset, length} = live.get(branch.node);
  const unit = length > 0 ? offset.map(value => value / length) : [1, 0, 0];
  const {separation, primary, secondary, mass} = branch;
  place(primary, origin.map((value, axis) => value - unit[axis] * separation * secondary.mass / mass));
  place(secondary, origin.map((value, axis) => value + unit[axis] * separation * primary.mass / mass));
 };
 place(tree, [0, 0, 0]);
 return placed;
}

export const systemCameraDistance = extent => Math.max(1, extent) * 2.6;
export const systemMaxDistance = extent => Math.max(1, extent) * 24;

// Engine key and appearance for each kind of component. A white dwarf shines,
// so it is drawn with the self-luminous material rather than a lit sphere; the
// neutron star and the black hole have visuals of their own.
const KEYS = {'star': 'sun', 'white-dwarf': 'sun', 'neutron-star': 'neutron-star', 'blackhole': 'blackhole', 'planet': 'exoplanet'};
export const systemBodyKey = kind => KEYS[kind] || 'exoplanet';
