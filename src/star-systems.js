import {G} from './physics.js';

// Real multiple systems, placed from their published orbital elements.
//
// Two rules decided this list. Every system is one that has actually been
// measured - no hypothetical arrangements - and every one is hierarchical: a
// close pair with a distant third, or a pair inside a pair. That is not a
// stylistic choice. A non-hierarchical trapezium of comparable masses at
// comparable distances is the chaotic three-body problem, and it does not
// survive integration in any engine: components are ejected within a few
// crossing times, which is exactly what makes the situation in Liu Cixin's
// novel unliveable. Hierarchical triples are the ones nature keeps.
//
// Masses are in solar masses, radii in km, separations in AU. Where a
// published period and mass did not quite close Kepler's third law - normal
// for systems whose distance is uncertain - the semi-major axis is the one
// consistent with the quoted period and masses, so the engine reproduces the
// period that was actually observed.
export const SOLAR_RADIUS_KM = 695700;
const languageIndex = {pl: 0, en: 1, de: 2, es: 3};

const star = (name, mass, radiusSolar, temperature, spectralType, kind = 'star') =>
 ({star: {name, mass, radiusKm: radiusSolar * SOLAR_RADIUS_KM, temperature, spectralType, kind}});
const compact = (name, mass, radiusKm, temperature, spectralType, kind) =>
 ({star: {name, mass, radiusKm, temperature, spectralType, kind}});
const planet = (name, massEarths, radiusKm, colour) =>
 ({star: {name, mass: massEarths * 3.0034896e-6, radiusKm, colour, kind: 'planet'}});
const orbit = (primary, secondary, semiMajorAU, eccentricity, inclinationDeg = 0, phaseDeg = 0) =>
 ({primary, secondary, semiMajorAU, eccentricity, inclinationDeg, phaseDeg});

export const STAR_SYSTEMS = Object.freeze([
 {
  id: 'alpha-centauri', name: 'Alfa Centauri', daysPerSecond: 365,
  source: 'https://www.aanda.org/articles/aa/full_html/2016/10/aa29201-16/aa29201-16.html',
  note: [
   'Najbliższy nam układ trzech gwiazd i pierwowzór problemu trzech ciał z powieści Liu Cixina. A i B okrążają się w 79,9 roku po orbicie o mimośrodzie 0,52, zbliżając się na 11 i oddalając na 36 AU. Proxima krąży wokół nich w odległości około 8700 AU — jej jeden obieg trwa pół miliona lat, więc na ekranie stoi praktycznie nieruchomo.',
   'The nearest triple system to us, and the original of the three-body problem in Liu Cixin’s novel. A and B circle each other in 79.9 years on an orbit of eccentricity 0.52, closing to 11 AU and opening to 36. Proxima orbits the pair some 8700 AU out — one circuit takes half a million years, so on screen it barely moves.',
   'Das nächstgelegene Dreifachsystem und das Vorbild für das Dreikörperproblem in Liu Cixins Roman. A und B umkreisen einander in 79,9 Jahren auf einer Bahn der Exzentrizität 0,52, von 11 bis 36 AU. Proxima umläuft das Paar in etwa 8700 AU — ein Umlauf dauert eine halbe Million Jahre, auf dem Bildschirm steht sie praktisch still.',
   'El sistema triple más cercano y el original del problema de los tres cuerpos de la novela de Liu Cixin. A y B se orbitan en 79,9 años con excentricidad 0,52, acercándose a 11 UA y alejándose a 36. Próxima rodea al par a unas 8700 UA: una vuelta le lleva medio millón de años, así que en pantalla casi no se mueve.'],
  root: orbit(
   orbit(star('α Centauri A', 1.0788, 1.2175, 5790, 'G2 V'), star('α Centauri B', .9092, .8591, 5260, 'K1 V'), 23.52, .5179, 0, 60),
   star('Proxima Centauri', .1221, .1542, 3042, 'M5.5 Ve'), 8700, .5, 15, 200)
 },
 {
  id: 'kepler-16', name: 'Kepler-16', daysPerSecond: 10,
  source: 'https://science.nasa.gov/exoplanet-catalog/kepler-16-b/',
  note: [
   'Pierwsza potwierdzona planeta krążąca wokół dwóch słońc naraz — z powodu podwójnego wschodu nazwana Tatooine. Gwiazdy obiegają się w 41 dni w odległości 0,22 AU, a planeta wielkości Saturna okrąża całą parę w 229 dni. Orbita planety leży tuż za granicą stabilności, około 0,64 AU od pary.',
   'The first confirmed planet orbiting two suns at once, nicknamed Tatooine for its double sunrise. The stars circle each other in 41 days at 0.22 AU, and a Saturn-sized planet goes round the pair in 229 days. Its orbit sits just outside the stability limit, about 0.64 AU from the binary.',
   'Der erste bestätigte Planet um zwei Sonnen zugleich, wegen des doppelten Sonnenaufgangs Tatooine genannt. Die Sterne umkreisen einander in 41 Tagen bei 0,22 AU, ein saturngroßer Planet das Paar in 229 Tagen. Seine Bahn liegt knapp außerhalb der Stabilitätsgrenze von etwa 0,64 AU.',
   'El primer planeta confirmado que orbita dos soles a la vez, apodado Tatooine por su doble amanecer. Las estrellas se orbitan en 41 días a 0,22 UA, y un planeta del tamaño de Saturno rodea al par en 229 días. Su órbita queda justo fuera del límite de estabilidad, a unas 0,64 UA.'],
  root: orbit(
   orbit(star('Kepler-16 A', .6897, .6489, 4450, 'K'), star('Kepler-16 B', .20255, .22623, 3300, 'M'), .22431, .15944, 0, 30),
   planet('Kepler-16 b', 105.8, 51000, '#c8a97a'), .7048, .0069, 0, 150)
 },
 {
  id: 'sirius', name: 'Syriusz A i B', daysPerSecond: 365,
  source: 'https://science.nasa.gov/asset/hubble/sirius-a-and-b/',
  note: [
   'Najjaśniejsza gwiazda nieba i jej niewidoczny gołym okiem towarzysz: biały karzeł o masie Słońca ściśnięty do rozmiarów Ziemi. Krążą wokół siebie w 50,1 roku po wyraźnie wydłużonej orbicie, mijając się w odległości od 8 do 32 AU. Bessel wywnioskował istnienie B z zafalowań ruchu A osiemnaście lat przed jego zobaczeniem.',
   'The brightest star in the sky and its companion, invisible to the unaided eye: a white dwarf with the mass of the Sun squeezed into the size of Earth. They circle each other in 50.1 years on a markedly elongated orbit, passing between 8 and 32 AU apart. Bessel inferred B from the wobble of A eighteen years before anyone saw it.',
   'Der hellste Stern des Himmels und sein mit bloßem Auge unsichtbarer Begleiter: ein Weißer Zwerg mit Sonnenmasse, zusammengepresst auf Erdgröße. Sie umkreisen einander in 50,1 Jahren auf einer deutlich gestreckten Bahn zwischen 8 und 32 AU. Bessel erschloss B aus dem Torkeln von A, achtzehn Jahre bevor ihn jemand sah.',
   'La estrella más brillante del cielo y su compañera, invisible a simple vista: una enana blanca con la masa del Sol comprimida al tamaño de la Tierra. Se orbitan en 50,1 años en una órbita marcadamente alargada, entre 8 y 32 UA. Bessel dedujo B del bamboleo de A dieciocho años antes de que nadie la viera.'],
  root: orbit(star('Syriusz A', 2.063, 1.711, 9940, 'A1 V'),
   compact('Syriusz B', 1.018, 5850, 25000, 'DA2', 'white-dwarf'), 19.8, .5914, 0, 45)
 },
 {
  id: 'algol', name: 'Algol', daysPerSecond: .5,
  source: 'https://science.nasa.gov/image-detail/amb-pia00075/',
  note: [
   'Gwiazda Diabła: przez tysiąclecia widziano, jak co 2,87 dnia przygasa, zanim zrozumiano, że to zaćmienie. Ciaśniejsza para obiega się w odległości 0,062 AU, a trzecia gwiazda okrąża je w 680 dni. Mniej masywny składnik jest już podolbrzymem i oddaje materię towarzyszowi — tego przepływu model nie odtwarza.',
   'The Demon Star: for millennia people watched it dim every 2.87 days before anyone realised it was an eclipse. The close pair circles at 0.062 AU, and a third star goes round them in 680 days. The less massive component is already a subgiant and is giving up matter to its companion — a transfer this model does not reproduce.',
   'Der Teufelsstern: Jahrtausendelang sah man ihn alle 2,87 Tage schwächer werden, bevor jemand die Bedeckung erkannte. Das enge Paar umkreist sich in 0,062 AU, ein dritter Stern umläuft beide in 680 Tagen. Die massearmere Komponente ist bereits ein Unterriese und gibt Materie an den Begleiter ab — diesen Transfer bildet das Modell nicht ab.',
   'La Estrella del Diablo: durante milenios se la vio atenuarse cada 2,87 días antes de entender que era un eclipse. El par cercano se orbita a 0,062 UA, y una tercera estrella los rodea en 680 días. La componente menos masiva ya es una subgigante y cede materia a su compañera, transferencia que este modelo no reproduce.'],
  root: orbit(
   orbit(star('Algol Aa1', 3.17, 2.73, 13000, 'B8 V'), star('Algol Aa2', .70, 3.48, 4500, 'K0 IV'), .0620, .0, 0, 0),
   star('Algol Ab', 1.76, 1.73, 7500, 'A7 m'), 2.694, .227, 10, 120)
 },
 {
  id: 'psr-j0337', name: 'PSR J0337+1715', daysPerSecond: 2,
  source: 'https://arxiv.org/abs/1401.0939',
  note: [
   'Pulsar milisekundowy z dwoma białymi karłami — jedyny znany taki układ i najczystszy test zasady równoważności poza Układem Słonecznym. Wewnętrzny karzeł obiega gwiazdę neutronową w 1,63 dnia, zewnętrzny całą parę w 327 dni, a obie orbity są niemal idealnie kołowe i współpłaszczyznowe. Wszystkie trzy ciała spadają na siebie z tym samym przyspieszeniem z dokładnością do dwóch milionowych.',
   'A millisecond pulsar with two white dwarfs — the only such system known, and the cleanest test of the equivalence principle outside the Solar System. The inner dwarf circles the neutron star in 1.63 days, the outer one goes round both in 327 days, and both orbits are almost perfectly circular and coplanar. All three bodies fall towards each other at the same rate to within two parts in a million.',
   'Ein Millisekundenpulsar mit zwei Weißen Zwergen — das einzige bekannte System dieser Art und der sauberste Test des Äquivalenzprinzips außerhalb des Sonnensystems. Der innere Zwerg umkreist den Neutronenstern in 1,63 Tagen, der äußere beide in 327 Tagen, beide Bahnen nahezu kreisförmig und koplanar. Alle drei Körper fallen bis auf zwei Millionstel gleich schnell.',
   'Un púlsar de milisegundos con dos enanas blancas: el único sistema así conocido y la prueba más limpia del principio de equivalencia fuera del Sistema Solar. La enana interior orbita la estrella de neutrones en 1,63 días, la exterior a ambas en 327 días, y las dos órbitas son casi circulares y coplanares. Los tres cuerpos caen a la vez con una precisión de dos partes por millón.'],
  root: orbit(
   orbit(compact('PSR J0337+1715', 1.4378, 12, 1e6, 'pulsar', 'neutron-star'),
    compact('Wewnętrzny biały karzeł', .19751, 63000, 15800, 'DA', 'white-dwarf'), .03193, .0006918, 0, 0),
   compact('Zewnętrzny biały karzeł', .4101, 15000, 15800, 'DA', 'white-dwarf'), 1.1797, .035356, 0, 90)
 },
 {
  id: 'hulse-taylor', name: 'PSR B1913+16', daysPerSecond: .02,
  source: 'https://www.nobelprize.org/prizes/physics/1993/summary/',
  note: [
   'Dwie gwiazdy neutronowe obiegające się w niecałe osiem godzin na orbicie o mimośrodzie 0,617 — od 1,1 do 4,8 promienia Słońca. Ich okres skraca się o 76 mikrosekund rocznie dokładnie tak, jak przewiduje emisja fal grawitacyjnych: pierwszy dowód na ich istnienie i Nobel z 1993 roku. Silnik jest newtonowski, więc tego zacieśniania orbity nie zobaczysz.',
   'Two neutron stars circling in under eight hours on an orbit of eccentricity 0.617 — from 1.1 to 4.8 solar radii apart. Their period shortens by 76 microseconds a year, exactly as the emission of gravitational waves predicts: the first evidence that they exist, and the 1993 Nobel Prize. This engine is Newtonian, so you will not see that decay.',
   'Zwei Neutronensterne umkreisen einander in weniger als acht Stunden auf einer Bahn der Exzentrizität 0,617 — von 1,1 bis 4,8 Sonnenradien. Ihre Periode verkürzt sich um 76 Mikrosekunden pro Jahr, genau wie die Abstrahlung von Gravitationswellen vorhersagt: der erste Nachweis ihrer Existenz und der Nobelpreis 1993. Diese Engine ist newtonsch, die Bahnschrumpfung bleibt daher unsichtbar.',
   'Dos estrellas de neutrones que se orbitan en menos de ocho horas con excentricidad 0,617: entre 1,1 y 4,8 radios solares. Su período se acorta 76 microsegundos al año, justo como predice la emisión de ondas gravitacionales: la primera prueba de que existen y el Nobel de 1993. Este motor es newtoniano, así que esa contracción no se ve.'],
  root: orbit(compact('PSR B1913+16', 1.4398, 12, 1e6, 'pulsar', 'neutron-star'),
   compact('Towarzysz neutronowy', 1.3886, 12, 1e5, 'gwiazda neutronowa', 'neutron-star'), .01313, .6171, 0, 180)
 },
 {
  id: 'psr-b1620', name: 'PSR B1620−26', daysPerSecond: 50,
  source: 'https://science.nasa.gov/exoplanet-catalog/psr-b1620-26-b/',
  note: [
   'Najstarsza znana planeta, licząca około 12,7 miliarda lat — powstała, gdy Wszechświat miał niecały miliard. Krąży wokół pary pulsara i białego karła w gromadzie kulistej M4, w środowisku tak ciasnym, że układ najpewniej powstał z wymiany partnerów przy bliskim spotkaniu gwiazd. Orbita planety jest słabo ograniczona: około 23 AU.',
   'The oldest known planet, about 12.7 billion years old — formed when the universe was under a billion. It orbits a pulsar and white dwarf pair inside the globular cluster M4, in surroundings so crowded that the system most likely arose from an exchange of partners during a close stellar encounter. The planet’s orbit is poorly constrained: about 23 AU.',
   'Der älteste bekannte Planet, rund 12,7 Milliarden Jahre alt — entstanden, als das Universum keine Milliarde Jahre zählte. Er umkreist ein Paar aus Pulsar und Weißem Zwerg im Kugelsternhaufen M4, in einer so dichten Umgebung, dass das System wohl bei einer nahen Begegnung durch Partnertausch entstand. Die Planetenbahn ist schlecht bestimmt: etwa 23 AU.',
   'El planeta más antiguo conocido, de unos 12 700 millones de años: se formó cuando el universo no llegaba a mil millones. Orbita un par de púlsar y enana blanca en el cúmulo globular M4, en un entorno tan denso que el sistema surgió probablemente de un intercambio de parejas en un encuentro estelar cercano. La órbita del planeta está mal acotada: unas 23 UA.'],
  root: orbit(
   orbit(compact('PSR B1620−26', 1.34, 12, 1e6, 'pulsar', 'neutron-star'),
    compact('Biały karzeł', .34, 20000, 25000, 'DA', 'white-dwarf'), .772, .025, 0, 0),
   planet('PSR B1620−26 b', 794.5, 80000, '#7d8a94'), 23, .13, 8, 240)
 },
 {
  id: 's2-sgr-a', name: 'S2 i Sagittarius A*', daysPerSecond: 365,
  source: 'https://www.mpe.mpg.de/369216/The_Orbit_of_S2',
  note: [
   'Gwiazda krążąca wokół czarnej dziury w centrum Drogi Mlecznej. Jeden obieg trwa 16 lat, a przy peryastronie S2 zbliża się na 120 AU i pędzi ponad 7000 km/s — dwa i pół procent prędkości światła. Śledzenie tej orbity przez trzy dekady dało masę 4,3 miliona Słońc i Nagrodę Nobla z 2020 roku. Peryastron obraca się z powodu efektów relatywistycznych, których ten silnik nie liczy.',
   'A star orbiting the black hole at the centre of the Milky Way. One circuit takes 16 years, and at pericentre S2 closes to 120 AU and moves at over 7000 km/s — two and a half per cent of light speed. Tracking this orbit for three decades gave a mass of 4.3 million Suns and the 2020 Nobel Prize. The pericentre precesses through relativistic effects this engine does not compute.',
   'Ein Stern auf einer Bahn um das Schwarze Loch im Zentrum der Milchstraße. Ein Umlauf dauert 16 Jahre; im Perizentrum kommt S2 auf 120 AU heran und erreicht über 7000 km/s — zweieinhalb Prozent der Lichtgeschwindigkeit. Drei Jahrzehnte Bahnverfolgung ergaben 4,3 Millionen Sonnenmassen und den Nobelpreis 2020. Das Perizentrum dreht sich durch relativistische Effekte, die diese Engine nicht rechnet.',
   'Una estrella en órbita alrededor del agujero negro del centro de la Vía Láctea. Una vuelta dura 16 años y, en el pericentro, S2 se acerca a 120 UA a más de 7000 km/s: el dos y medio por ciento de la velocidad de la luz. Seguir esta órbita durante tres décadas dio una masa de 4,3 millones de soles y el Nobel de 2020. El pericentro precesa por efectos relativistas que este motor no calcula.'],
  root: orbit(compact('Sagittarius A*', 4.297e6, 1.27e7, 0, 'czarna dziura', 'blackhole'),
   star('S2', 13.6, 7.0, 25000, 'B0-2 V'), 1034.4, .8847, 20, 10)
 }
]);

export const systemNote = (id, language = 'en') => {
 const row = STAR_SYSTEMS.find(item => item.id === id)?.note;
 return row ? row[languageIndex[language] ?? 1] || row[1] : null;
};

// True-anomaly form of the two-body solution: position and velocity of the
// secondary relative to the primary, in AU and AU per day.
export function orbitalState({semiMajorAU, eccentricity, inclinationDeg = 0, phaseDeg = 0}, totalMass) {
 const mu = G * totalMass, e = eccentricity, a = semiMajorAU;
 const nu = phaseDeg * Math.PI / 180, inclination = inclinationDeg * Math.PI / 180;
 const parameter = a * (1 - e * e), r = parameter / (1 + e * Math.cos(nu));
 const h = Math.sqrt(mu * parameter);
 // Radial and transverse components, then into the orbital plane.
 const radial = mu / h * e * Math.sin(nu), transverse = h / r;
 const inPlane = [r * Math.cos(nu), r * Math.sin(nu)];
 const velocityInPlane = [radial * Math.cos(nu) - transverse * Math.sin(nu),
  radial * Math.sin(nu) + transverse * Math.cos(nu)];
 // Tilt the plane about the line of nodes so a system is not drawn edge-flat.
 const cos = Math.cos(inclination), sin = Math.sin(inclination);
 return {
  position: [inPlane[0], inPlane[1] * sin, inPlane[1] * cos],
  velocity: [velocityInPlane[0], velocityInPlane[1] * sin, velocityInPlane[1] * cos],
  period: 2 * Math.PI * Math.sqrt(a ** 3 / mu)
 };
}

// Flatten a hierarchy into bodies whose barycentre is at rest at the origin.
// Each level is solved as its own two-body problem about the barycentre of the
// level below, which is what makes a hierarchical system reproducible: no level
// has to know anything about the ones inside it beyond their total mass.
export function buildSystem(node) {
 if (node.star) return {mass: node.star.mass, bodies: [{...node.star, p: [0, 0, 0], v: [0, 0, 0]}]};
 const inner = buildSystem(node.primary), outer = buildSystem(node.secondary);
 const total = inner.mass + outer.mass;
 const {position, velocity} = orbitalState(node, total);
 const shift = (group, factor) => group.bodies.map(item => ({...item,
  p: item.p.map((value, axis) => value + position[axis] * factor),
  v: item.v.map((value, axis) => value + velocity[axis] * factor)}));
 return {mass: total, bodies: [...shift(inner, -outer.mass / total), ...shift(outer, inner.mass / total)]};
}

export const systemBodies = preset => buildSystem(preset.root).bodies;

// Widest separation in the system as it stands, for framing the camera on load.
export function systemExtentAU(preset) {
 const bodies = systemBodies(preset);
 return Math.max(...bodies.map(item => Math.hypot(...item.p)));
}

// The largest distance any component will reach over a whole orbit. Framing on
// the current configuration alone would lose S2, which starts near pericentre
// and travels out to sixteen times that distance.
export function orbitSpanAU(preset) {
 const walk = node => node.star ? 0
  : Math.max(node.semiMajorAU * (1 + node.eccentricity), walk(node.primary), walk(node.secondary));
 return Math.max(systemExtentAU(preset), walk(preset.root));
}
