// Ring boundaries, in units of the planet's own equatorial radius, with a
// colour and an alpha per band. Alpha stands in for that band's measured
// normal optical depth (roughly alpha=1-e^-tau, rounded for legibility
// rather than kept at literal precision), so a gap's transparency reflects
// how little ring material is actually there instead of being an artistic
// darker-but-still-solid tone. That matters for the real gaps this file
// models: Saturn's Cassini Division and the moon-swept Encke and Keeler
// gaps, and - far more so - the wide, genuinely empty space between every
// named Uranus ring, which a single translucent disc previously hid.
//
// Saturn: radii from Cassini/Voyager radio and stellar occultations
// (Wikipedia, "Rings of Saturn"), in units of Saturn's equatorial radius,
// 60,300 km.
export const SATURN_RING_INNER=1.109; // D ring inner edge, ~66,900 km
export const SATURN_RING_BANDS=[
 {to:1.238,tone:'#33322f',alpha:.10}, // D ring - very tenuous
 {to:1.526,tone:'#7c7a72',alpha:.30}, // C ring - the "crepe ring"
 {to:1.950,tone:'#ddd6c8',alpha:.92}, // B ring - densest and brightest
 {to:2.026,tone:'#26262a',alpha:.10}, // Cassini Division
 {to:2.213,tone:'#bdb6a8',alpha:.55}, // A ring, inner part
 {to:2.218,tone:'#202124',alpha:.04}, // Encke Gap - kept clear by Pan
 {to:2.262,tone:'#a89f92',alpha:.60}, // A ring, middle part
 {to:2.266,tone:'#202124',alpha:.04}, // Keeler Gap - kept clear by Daphnis
 {to:2.268,tone:'#a89f92',alpha:.60}, // A ring, outer part
 {to:2.312,tone:'#232326',alpha:.07}, // Roche Division
 {to:2.330,tone:'#cec6b6',alpha:.45}, // F ring
 {to:2.350,tone:'#101114',alpha:.03}  // faint haze beyond the F ring
];
// Uranus: radii from Voyager 2 and Earth-based stellar occultations
// (Wikipedia, "Rings of Uranus"), in units of Uranus's equatorial radius,
// 25,559 km. Unlike Saturn's mostly continuous system, real emptiness here
// vastly outweighs the rings: every named ring but zeta is only a few
// kilometres wide, so each is drawn as a band deliberately widened for
// visibility at its correct position rather than at its true, sub-pixel
// width - but the wide true gaps between them are real, not a rendering
// shortcut, and get correspondingly low alpha rather than a darker fill.
export const URANUS_RING_INNER=1.48;
export const URANUS_RING_BANDS=[
 {to:1.618,tone:'#3a3a3a',alpha:.08}, // zeta - a genuinely broad dust sheet
 {to:1.630,tone:'#050505',alpha:.02}, // gap
 {to:1.644,tone:'#4c4c4c',alpha:.20}, // ring 6
 {to:1.648,tone:'#050505',alpha:.02}, // gap
 {to:1.660,tone:'#4c4c4c',alpha:.30}, // ring 5
 {to:1.664,tone:'#050505',alpha:.02}, // gap
 {to:1.673,tone:'#4c4c4c',alpha:.20}, // ring 4
 {to:1.742,tone:'#050505',alpha:.02}, // gap
 {to:1.758,tone:'#575757',alpha:.45}, // alpha ring
 {to:1.779,tone:'#050505',alpha:.02}, // gap
 {to:1.795,tone:'#575757',alpha:.30}, // beta ring
 {to:1.838,tone:'#050505',alpha:.02}, // gap
 {to:1.852,tone:'#4c4c4c',alpha:.30}, // eta ring
 {to:1.856,tone:'#050505',alpha:.02}, // gap
 {to:1.870,tone:'#616161',alpha:.75}, // gamma ring
 {to:1.884,tone:'#050505',alpha:.02}, // gap
 {to:1.899,tone:'#575757',alpha:.45}, // delta ring
 {to:1.949,tone:'#050505',alpha:.02}, // gap
 {to:1.965,tone:'#404040',alpha:.15}, // lambda ring - faint and dusty
 {to:1.988,tone:'#050505',alpha:.02}, // gap
 {to:2.014,tone:'#6e6e6e',alpha:.75}, // epsilon ring - brightest, widest
 {to:2.020,tone:'#050505',alpha:.02}  // gap
];
// Every band's upper bound; the caller supplies the matching *_RING_INNER as
// the lower bound of the first one. Bands are listed inner-to-outer, so the
// first one whose `to` a radius falls under is the one that applies.
export function ringBandAt(bands,r){
 for(const band of bands)if(r<band.to)return band;
 return bands[bands.length-1];
}

// A ring is not a painted disc - it is an uncountable population of
// individual ice and rock particles, and a real stellar-occultation profile
// of one reads as dense, irregular grain at every scale, not as a couple of
// clean sine waves. This sums several octaves of coherent noise at
// particle-plausible radial frequencies so the same band boundaries above
// get filled with texture that looks like it is built out of countless
// separate objects rather than printed on. It is deliberately a function of
// radius alone (no azimuthal term): the rendered ring mesh is a child of the
// planet's own spinning mesh (see main.js), so anything that varied with
// angle would incorrectly appear to rotate once per Saturn day instead of
// staying fixed, the way a real ring's broad radial structure does on the
// timescale anyone watches it.
const grainHash=(x,seed)=>{const v=Math.sin(x*127.1+seed*311.7)*43758.5453123;return v-Math.floor(v)};
const grainSmooth=v=>v*v*(3-2*v);
function grainNoise1D(x,seed){
 const xi=Math.floor(x),t=grainSmooth(x-xi);
 return grainHash(xi,seed)+(grainHash(xi+1,seed)-grainHash(xi,seed))*t;
}
export function ringGrain(radiusInPlanetRadii,seed=4111){
 let amplitude=1,frequency=95,sum=0,weight=0;
 for(let octave=0;octave<5;octave++){
  sum+=(grainNoise1D(radiusInPlanetRadii*frequency,seed+octave*41.7)-.5)*amplitude;
  weight+=amplitude;amplitude*=.56;frequency*=2.35;
 }
 return sum/weight; // roughly -0.5..0.5, mean 0
}
