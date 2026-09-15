// The Moon's geocentric position, from the truncated ELP-2000/82 series.
//
// Every other satellite in this simulation carries a composed phase, because
// no satellite theory is modelled. The Moon is the one that shows: it is the
// only one a viewer can check against the sky tonight, and it is the only one
// whose position decides whether an eclipse happens. This module gives it a
// real theory.
//
// The series is the abridgement of ELP-2000/82 published by Jean Meeus,
// Astronomical Algorithms (2nd ed.), chapter 47, tables 47.A and 47.B: 60
// periodic terms for longitude and distance, 60 for latitude, in the arguments
// D, M, M' and F. Meeus quotes about 10 arcseconds in longitude and 4 in
// latitude, which at the Moon's distance is some 20 and 8 km - three orders of
// magnitude better than the composed phase it replaces, and far inside the
// accuracy of the planetary ephemeris it has to live alongside.
//
// Two corrections the rest of the application does without are needed here,
// because at the Moon's angular speed of about half a degree an hour they are
// larger than the series' own error:
//
//  - The series is referred to the mean equinox of the date, and everything
//    else in the scene is in ecliptic J2000. Precession between the two is
//    about 50 arcseconds a year, so by 2026 it is a fifth of a degree - some
//    1400 km at the Moon. The reduction is Meeus chapter 21.
//  - The series takes Dynamical Time, and the application's clock is UTC. The
//    difference is around 69 seconds today, which the Moon covers in 38
//    arcseconds, or 70 km.
//
// Units out: AU and AU per day, ecliptic J2000, x towards the equinox and z
// along the ecliptic north pole - the same frame ephemeris.js returns.
const DEG = Math.PI / 180;
const ARCSEC = DEG / 3600;
export const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
export const MOON_DISTANCE_AU = 384400 / 149597870.7;

// Table 47.A: multiples of D, M, M', F, then the coefficient of the sine for
// longitude (units of 1e-6 degree) and of the cosine for distance (in metres).
const LR=[
 [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],[0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],[2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],[0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],[4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],[2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],[2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],[2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],[0,1,2,0,-2120,5751],[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],[2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],[3,0,-1,0,-892,3258],[2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],[2,1,-2,0,691,0],[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],[4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],[0,0,2,-2,-381,-4421],[1,1,1,0,351,0],[3,0,-2,0,-340,0],[4,0,-3,0,330,0],[2,-1,2,0,327,0],[0,2,1,0,-323,1165],[1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752]
];

// Table 47.B: the same arguments, with the coefficient of the sine for latitude.
const LAT=[
 [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],[2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],[2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],[2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],[0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],[0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833],[0,0,1,-3,777],[4,0,-2,1,671],[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],[2,0,-2,1,-451],[0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],[2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],[0,0,1,3,-283],[2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],[0,1,-2,-1,-220],[2,1,-1,-1,-220],[1,0,1,1,-185],[2,-1,-2,-1,181],[0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],[1,0,1,-1,-164],[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107]
];

// Difference between Dynamical Time and UTC, in seconds.
//
// Measured values at twenty-year steps from the Espenak and Meeus tabulation,
// linearly interpolated, held flat outside the range. This is deliberately not
// the well-known 2005-2050 polynomial from the same authors: the Earth's
// rotation sped up after it was fitted, and by 2025 that polynomial reads 75
// seconds against an observed 69. Past 2030 every value here is an
// extrapolation of a quantity nobody can predict, which is why it is flat.
const DELTA_T = [[1800, 13.7], [1820, 11.9], [1840, 5.8], [1860, 7.6], [1880, -5.5], [1900, -2.8],
 [1920, 21.2], [1940, 24.3], [1960, 33.2], [1980, 50.5], [2000, 63.8], [2010, 66.1], [2020, 69.4], [2030, 69.5]];

export function deltaTSeconds(date) {
 const whole = date.getUTCFullYear(), start = Date.UTC(whole, 0, 1);
 const year = whole + (date.getTime() - start) / (Date.UTC(whole + 1, 0, 1) - start);
 if (year <= DELTA_T[0][0]) return DELTA_T[0][1];
 for (let i = 1; i < DELTA_T.length; i++) {
  const [y1, d1] = DELTA_T[i], [y0, d0] = DELTA_T[i - 1];
  if (year <= y1) return d0 + (d1 - d0) * (year - y0) / (y1 - y0);
 }
 return DELTA_T[DELTA_T.length - 1][1];
}

// Julian centuries of Dynamical Time since J2000.
export const dynamicalCenturies = date =>
 (date.getTime() + deltaTSeconds(date) * 1000 - J2000) / 86400000 / 36525;

const positive = deg => {const x = deg % 360; return x < 0 ? x + 360 : x;};
const polynomial = (t, ...c) => c.reduce((sum, value, power) => sum + value * t ** power, 0);

// Longitude and latitude in degrees referred to the mean equinox of the date,
// and the distance between the centres of the Earth and the Moon in km.
export function moonEcliptic(centuries) {
 const t = centuries;
 // Meeus 47.1 to 47.5: the Moon's mean longitude, mean elongation, the Sun's
 // mean anomaly, the Moon's mean anomaly and its argument of latitude.
 const moonLongitude = polynomial(t, 218.3164477, 481267.88123421, -.0015786, 1 / 538841, -1 / 65194000);
 const elongation = polynomial(t, 297.8501921, 445267.1114034, -.0018819, 1 / 545868, -1 / 113065000);
 const sunAnomaly = polynomial(t, 357.5291092, 35999.0502909, -.0001536, 1 / 24490000);
 const moonAnomaly = polynomial(t, 134.9633964, 477198.8675055, .0087414, 1 / 69699, -1 / 14712000);
 const latitudeArgument = polynomial(t, 93.272095, 483202.0175233, -.0036539, -1 / 3526000, 1 / 863310000);
 // Venus, Jupiter and the flattening of the Earth, as three further arguments.
 const a1 = positive(119.75 + 131.849 * t) * DEG;
 const a2 = positive(53.09 + 479264.29 * t) * DEG;
 const a3 = positive(313.45 + 481266.484 * t) * DEG;
 // The Sun's anomaly enters through the eccentricity of the Earth's orbit,
 // which is decreasing; terms in M are scaled by it, terms in 2M by its square.
 const eccentricity = polynomial(t, 1, -.002516, -.0000074);
 const argument = [positive(elongation) * DEG, positive(sunAnomaly) * DEG,
  positive(moonAnomaly) * DEG, positive(latitudeArgument) * DEG];

 let sumL = 0, sumR = 0, sumB = 0;
 for (const row of LR) {
  let angle = 0;
  for (let i = 0; i < 4; i++) if (row[i]) angle += row[i] * argument[i];
  const scale = eccentricity ** Math.abs(row[1]);
  sumL += row[4] * scale * Math.sin(angle);
  sumR += row[5] * scale * Math.cos(angle);
 }
 for (const row of LAT) {
  let angle = 0;
  for (let i = 0; i < 4; i++) if (row[i]) angle += row[i] * argument[i];
  sumB += row[4] * eccentricity ** Math.abs(row[1]) * Math.sin(angle);
 }
 const mean = positive(moonLongitude) * DEG;
 sumL += 3958 * Math.sin(a1) + 1962 * Math.sin(mean - argument[3]) + 318 * Math.sin(a2);
 sumB += -2235 * Math.sin(mean) + 382 * Math.sin(a3) + 175 * Math.sin(a1 - argument[3])
  + 175 * Math.sin(a1 + argument[3]) + 127 * Math.sin(mean - argument[2]) - 115 * Math.sin(mean + argument[2]);

 return {longitude: positive(moonLongitude + sumL / 1e6), latitude: sumB / 1e6,
  distanceKm: 385000.56 + sumR / 1000};
}

// Reduce ecliptical coordinates from the mean equinox of one epoch to another,
// Meeus chapter 21. `from` and `to` are Julian centuries from J2000, so the
// reduction this module needs is from the date to zero.
export function precessEcliptic(longitudeDeg, latitudeDeg, from, to) {
 const t = to - from, t0 = from;
 const eta = ((47.0029 - .06603 * t0 + .000598 * t0 ** 2) * t
  + (-.03302 + .000598 * t0) * t ** 2 + .00006 * t ** 3) * ARCSEC;
 const node = (174.876384 * 3600 + 3289.4789 * t0 + .60622 * t0 ** 2
  - (869.8089 + .50491 * t0) * t + .03536 * t ** 2) * ARCSEC;
 const precession = ((5029.0966 + 2.22226 * t0 - .000042 * t0 ** 2) * t
  + (1.11113 - .000042 * t0) * t ** 2 - .000006 * t ** 3) * ARCSEC;
 const longitude = longitudeDeg * DEG, latitude = latitudeDeg * DEG;
 const cosLat = Math.cos(latitude), sinLat = Math.sin(latitude);
 const sinGap = Math.sin(node - longitude), cosGap = Math.cos(node - longitude);
 const a = Math.cos(eta) * cosLat * sinGap - Math.sin(eta) * sinLat;
 const b = cosLat * cosGap;
 const c = Math.cos(eta) * sinLat + Math.sin(eta) * cosLat * sinGap;
 return [positive((precession + node - Math.atan2(a, b)) / DEG), Math.asin(c) / DEG];
}

// Geocentric position of the Moon in AU, ecliptic J2000.
export function moonGeocentric(date) {
 const t = dynamicalCenturies(date), {longitude, latitude, distanceKm} = moonEcliptic(t);
 const [lon, lat] = precessEcliptic(longitude, latitude, t, 0);
 const r = distanceKm / 149597870.7, l = lon * DEG, b = lat * DEG;
 return [r * Math.cos(b) * Math.cos(l), r * Math.cos(b) * Math.sin(l), r * Math.sin(b)];
}

// Position and velocity, the velocity from a five-point central difference of
// the series itself. The Moon's dominant period is 27.3 days, so a half-day
// stencil resolves it to a few centimetres per second - far below anything the
// integrator that takes over from here will preserve.
const STENCIL = .125;
export function moonState(date) {
 const at = offset => moonGeocentric(new Date(date.getTime() + offset * 86400000));
 const [minus2, minus1, plus1, plus2] = [-2, -1, 1, 2].map(k => at(k * STENCIL));
 return {
  p: moonGeocentric(date),
  v: [0, 1, 2].map(axis => (minus2[axis] - 8 * minus1[axis] + 8 * plus1[axis] - plus2[axis]) / (12 * STENCIL))
 };
}

// The planetary ephemeris returns the Earth-Moon barycentre, not the Earth:
// JPL's approximate elements are fitted to the barycentre, and until now the
// Earth was simply placed there, 4671 km from where it is. With a real lunar
// theory the pair can be split properly, which is what removes that error.
export const MOON_EARTH_MASS_RATIO = .0123000371;
export const MOON_MASS_FRACTION = MOON_EARTH_MASS_RATIO / (1 + MOON_EARTH_MASS_RATIO);

export function earthMoonSplit(barycentrePosition, barycentreVelocity, date) {
 const {p, v} = moonState(date), moonShare = MOON_MASS_FRACTION, earthShare = 1 - moonShare;
 return {
  earth: {p: barycentrePosition.map((value, axis) => value - p[axis] * moonShare),
   v: barycentreVelocity.map((value, axis) => value - v[axis] * moonShare)},
  moon: {p: barycentrePosition.map((value, axis) => value + p[axis] * earthShare),
   v: barycentreVelocity.map((value, axis) => value + v[axis] * earthShare)}
 };
}

// The Sun's geometric longitude seen from the Earth, Meeus chapter 25: mean
// longitude plus the equation of the centre, good to about a hundredth of a
// degree. New moon is defined against this, not against the mean Sun, and the
// difference between the two runs to nearly two degrees.
export function solarLongitude(centuries) {
 const t = centuries;
 const mean = polynomial(t, 280.46646, 36000.76983, .0003032);
 const anomaly = polynomial(t, 357.52911, 35999.05029, -.0001537) * DEG;
 const centre = polynomial(t, 1.914602, -.004817, -.000014) * Math.sin(anomaly)
  + polynomial(t, .019993, -.000101) * Math.sin(2 * anomaly) + .000289 * Math.sin(3 * anomaly);
 return positive(mean + centre);
}

// Illuminated fraction of the disc and the phase angle, Meeus chapter 48. The
// visible proof that any of this works: the Moon in the scene now shows the
// phase the real one does tonight.
// Illuminated fraction of the disc, the phase angle and which way the phase is
// going, Meeus chapter 48 - all of it from the theory rather than from position
// vectors. Waxing and waning is the sign of an angle measured about the
// ecliptic pole, and the scene frame swaps two axes, which mirrors it: any
// cross product taken there comes out with the wrong sign. Computing the phase
// where there is no frame at all is what keeps that from becoming a bug.
export function moonIllumination(date) {
 const t = dynamicalCenturies(date), moon = moonEcliptic(t);
 const sunLongitude = solarLongitude(t);
 // Elongation of the Moon from the Sun, Meeus 48.2.
 const difference = (moon.longitude - sunLongitude) * DEG;
 const elongation = Math.acos(Math.max(-1, Math.min(1,
  Math.cos(moon.latitude * DEG) * Math.cos(difference))));
 // Radius vector of the Sun in km, Meeus 25.5, so the phase angle is the real
 // one rather than the near-180-degree approximation.
 const anomaly = polynomial(t, 357.52911, 35999.05029, -.0001537) * DEG;
 const eccentricity = polynomial(t, .016708634, -.000042037, -.0000001267);
 const sunDistance = 1.000001018 * (1 - eccentricity ** 2)
  / (1 + eccentricity * Math.cos(anomaly + (polynomial(t, 1.914602, -.004817, -.000014) * Math.sin(anomaly)
   + polynomial(t, .019993, -.000101) * Math.sin(2 * anomaly) + .000289 * Math.sin(3 * anomaly)) * DEG)) * 149597870.7;
 const phaseAngle = Math.atan2(sunDistance * Math.sin(elongation),
  moon.distanceKm - sunDistance * Math.cos(elongation));
 // The Moon waxes while it leads the Sun in longitude, which is the first half
 // of the synodic month by definition.
 const ahead = ((moon.longitude - sunLongitude) % 360 + 360) % 360;
 return {illuminated: (1 + Math.cos(phaseAngle)) / 2, phaseAngle: phaseAngle / DEG,
  elongation: elongation / DEG, waxing: ahead < 180, distanceKm: moon.distanceKm};
}

// Quarter names, for a readout. The boundaries are the conventional eighths of
// the synodic month, taken on the elongation rather than on the lit fraction,
// because the lit fraction cannot tell a first quarter from a last one.
export const MOON_PHASES = ['Nów', 'Sierp przybywający', 'Pierwsza kwadra', 'Garb przybywający',
 'Pełnia', 'Garb ubywający', 'Ostatnia kwadra', 'Sierp ubywający'];

export function moonPhaseName(date) {
 const {illuminated, waxing} = moonIllumination(date);
 if (illuminated < .04) return MOON_PHASES[0];
 if (illuminated > .96) return MOON_PHASES[4];
 if (Math.abs(illuminated - .5) < .06) return MOON_PHASES[waxing ? 2 : 6];
 const gibbous = illuminated > .5;
 return MOON_PHASES[waxing ? (gibbous ? 3 : 1) : (gibbous ? 5 : 7)];
}
