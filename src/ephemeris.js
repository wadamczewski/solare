// Approximate heliocentric positions of the major planets.
//
// Keplerian elements and their per-century rates, referred to the mean ecliptic
// and equinox of J2000, from the JPL Solar System Dynamics table "Keplerian
// Elements for Approximate Positions of the Major Planets":
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
//
// The table is the 1800 AD - 2050 AD fit. JPL quotes maximum errors over that
// span of a few arcminutes for the inner planets and up to ~1 arcminute for the
// outer ones - good enough to place a body on the right side of its orbit, far
// from a full ephemeris such as DE440. Outside 1800-2050 the elements drift and
// this module stops being meaningful.
//
// Units out: AU and AU/day, ecliptic J2000, x towards the equinox, z along the
// ecliptic north pole. The renderer's own frame swaps y and z; that happens at
// the call site, not here.

const DEG = Math.PI / 180;
export const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);

// a (AU), e, I (deg), L (deg), longitude of perihelion (deg), longitude of
// ascending node (deg); each followed by its rate per Julian century.
export const elements = {
 mercury:{a:[.38709927,.00000037],e:[.20563593,.00001906],i:[7.00497902,-.00594749],l:[252.2503235,149472.67411175],peri:[77.45779628,.16047689],node:[48.33076593,-.12534081]},
 venus:{a:[.72333566,.0000039],e:[.00677672,-.00004107],i:[3.39467605,-.0007889],l:[181.9790995,58517.81538729],peri:[131.60246718,.00268329],node:[76.67984255,-.27769418]},
 earth:{a:[1.00000261,.00000562],e:[.01671123,-.00004392],i:[-.00001531,-.01294668],l:[100.46457166,35999.37244981],peri:[102.93768193,.32327364],node:[0,0]},
 mars:{a:[1.52371034,.00001847],e:[.0933941,.00007882],i:[1.84969142,-.00813131],l:[-4.55343205,19140.30268499],peri:[-23.94362959,.44441088],node:[49.55953891,-.29257343]},
 jupiter:{a:[5.202887,-.00011607],e:[.04838624,-.00013253],i:[1.30439695,-.00183714],l:[34.39644051,3034.74612775],peri:[14.72847983,.21252668],node:[100.47390909,.20469106]},
 saturn:{a:[9.53667594,-.0012506],e:[.05386179,-.00050991],i:[2.48599187,.00193609],l:[49.95424423,1222.49362201],peri:[92.59887831,-.41897216],node:[113.66242448,-.28867794]},
 uranus:{a:[19.18916464,-.00196176],e:[.04725744,-.00004397],i:[.77263783,-.00242939],l:[313.23810451,428.48202785],peri:[170.9542763,.40805281],node:[74.01692503,.04240589]},
 neptune:{a:[30.06992276,.00026291],e:[.00859048,.00005105],i:[1.77004347,.00035372],l:[-55.12002969,218.45945325],peri:[44.96476227,-.32241464],node:[131.78422574,-.00508664]}
};

export const julianCenturies = date => (date.getTime() - J2000) / 86400000 / 36525;
const wrap = deg => {const x = deg % 360; return x > 180 ? x - 360 : x < -180 ? x + 360 : x;};

// Newton iteration on Kepler's equation; e < 0.21 here so it converges in a few
// passes from M as the initial guess.
export function eccentricAnomaly(meanAnomalyDeg, e) {
 const M = wrap(meanAnomalyDeg);
 let E = M + (e / DEG) * Math.sin(M * DEG);
 for (let i = 0; i < 24; i++) {
  const dM = M - (E - (e / DEG) * Math.sin(E * DEG));
  const dE = dM / (1 - e * Math.cos(E * DEG));
  E += dE;
  if (Math.abs(dE) < 1e-11) break;
 }
 return E;
}

// Heliocentric state of one planet. Returns ecliptic J2000 {p, v} in AU, AU/day.
export function planetState(key, date) {
 const el = elements[key];
 if (!el) throw new Error(`No approximate elements for ${key}`);
 const T = julianCenturies(date);
 const a = el.a[0] + el.a[1] * T, e = el.e[0] + el.e[1] * T;
 const I = (el.i[0] + el.i[1] * T) * DEG;
 const L = el.l[0] + el.l[1] * T, peri = el.peri[0] + el.peri[1] * T;
 const node = (el.node[0] + el.node[1] * T) * DEG;
 const argument = (peri - el.node[0] - el.node[1] * T) * DEG;
 const E = eccentricAnomaly(L - peri, e) * DEG;

 // In-plane coordinates and their time derivatives. The mean motion is taken
 // from the tabulated rate of L so position and velocity stay self-consistent.
 const cosE = Math.cos(E), sinE = Math.sin(E), root = Math.sqrt(1 - e * e);
 const x = a * (cosE - e), y = a * root * sinE;
 const n = el.l[1] * DEG / 36525;               // rad/day
 const eDot = n / (1 - e * cosE);
 const vx = -a * sinE * eDot, vy = a * root * cosE * eDot;

 const cw = Math.cos(argument), sw = Math.sin(argument);
 const cn = Math.cos(node), sn = Math.sin(node);
 const ci = Math.cos(I), si = Math.sin(I);
 const rotate = (u, w) => [
  (cw * cn - sw * sn * ci) * u + (-sw * cn - cw * sn * ci) * w,
  (cw * sn + sw * cn * ci) * u + (-sw * sn + cw * cn * ci) * w,
  (sw * si) * u + (cw * si) * w
 ];
 return {p: rotate(x, y), v: rotate(vx, vy), a, e};
}

// Scene frame: the renderer keeps the ecliptic in XZ with +Y as its north pole.
export const toSceneFrame = ([x, y, z]) => [x, z, y];
