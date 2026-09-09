// The Sun's remaining life, from today to a cold white dwarf.
//
// Anchor values follow Schröder & Connon Smith (2008, MNRAS 386, 155), whose
// model gives the red-giant tip at 2730 L☉, 256 R☉ and 0.668 M☉, and the
// asymptotic-giant tip at 4170 L☉, 213 R☉ and 0.546 M☉, ending on a 0.5405 M☉
// white dwarf; the earlier main-sequence brightening follows Sackmann,
// Boothroyd & Kraemer (1993, ApJ 418, 457). Ages are counted from now, taking
// the Sun's present age as 4.6 Gyr.
//
// Screen time is not proportional to real duration and cannot be: the main
// sequence has 5 billion years left and the planetary nebula about ten
// thousand, a ratio of half a million to one. Each phase is given the time it
// needs to be watched, and the readout always shows the real age.
export const SOLAR_RADIUS_KM = 695700;

// `note` is a [pl, en, de, es] row: the interface translator substitutes single
// phrases inside arbitrary text and would mangle a sentence, so prose is keyed
// by language here, exactly as the sky descriptions are.
const languageIndex = {pl: 0, en: 1, de: 2, es: 3};
const phase = (id, name, seconds, startGyr, endGyr, from, to, spectralType, note) =>
 ({id, name, seconds, startGyr, endGyr, from, to, spectralType, note});

// German and Spanish fall back to English rather than to the Polish source.
export function solarPhaseNote(id, language = 'en') {
 const row = SOLAR_PHASES.find(item => item.id === id)?.note;
 return row ? row[languageIndex[language] ?? 1] || row[1] : null;
}

export const SOLAR_PHASES = Object.freeze([
 phase('main-sequence', 'Ciąg główny', 18, 0, 5.4,
  {mass: 1, radius: 1, luminosity: 1, temperature: 5772},
  {mass: 1, radius: 1.4, luminosity: 1.84, temperature: 5670}, 'G2 V',
  ['Wodór spala się w jądrze. Słońce jaśnieje o około 10% na miliard lat — na długo przed końcem tej fazy Ziemia straci oceany.','Hydrogen burns in the core. The Sun brightens by about 10% per billion years, and Earth will lose its oceans long before this phase ends.','Im Kern brennt Wasserstoff. Die Sonne wird pro Milliarde Jahre etwa 10% heller; die Erde verliert ihre Ozeane lange vor dem Ende dieser Phase.','El hidrógeno arde en el núcleo. El Sol se aviva un 10% cada mil millones de años, y la Tierra perderá sus océanos mucho antes del final de esta fase.']),
 phase('subgiant', 'Podolbrzym', 8, 5.4, 6.9,
  {mass: 1, radius: 1.4, luminosity: 1.84, temperature: 5670},
  {mass: .999, radius: 2.3, luminosity: 2.7, temperature: 5000}, 'G8 IV',
  ['Jądro wodorowe wyczerpane. Spalanie przenosi się do otoczki wokół obojętnego jądra helowego, gwiazda puchnie i chłodnieje.','The hydrogen core is spent. Burning moves to a shell around the inert helium core, and the star swells and cools.','Der Wasserstoffkern ist erschöpft. Das Brennen wandert in eine Schale um den inerten Heliumkern, der Stern bläht sich auf und kühlt ab.','El núcleo de hidrógeno se agota. La combustión pasa a una capa en torno al núcleo inerte de helio, y la estrella se hincha y se enfría.']),
 phase('red-giant', 'Gałąź czerwonych olbrzymów', 20, 6.9, 7.585,
  {mass: .999, radius: 2.3, luminosity: 2.7, temperature: 5000},
  {mass: .668, radius: 256, luminosity: 2730, temperature: 2602}, 'M0 III',
  ['Otoczka rozdyma się do 256 promieni słonecznych — 1,19 AU, czyli poza orbitę Wenus. Wiatr gwiazdowy zabiera jedną trzecią masy Słońca.','The envelope swells to 256 solar radii — 1.19 AU, past the orbit of Venus. The stellar wind carries off a third of the Sun’s mass.','Die Hülle dehnt sich auf 256 Sonnenradien aus — 1,19 AU, über die Venusbahn hinaus. Der Sternwind trägt ein Drittel der Sonnenmasse fort.','La envoltura se dilata hasta 256 radios solares — 1,19 UA, más allá de la órbita de Venus. El viento estelar se lleva un tercio de la masa del Sol.']),
 phase('horizontal-branch', 'Błysk helowy i spalanie helu', 8, 7.585, 7.72,
  {mass: .668, radius: 10, luminosity: 44, temperature: 4700},
  {mass: .66, radius: 12, luminosity: 54, temperature: 4600}, 'K0 III',
  ['Hel w jądrze zapala się gwałtownie i gwiazda kurczy się dziesięciokrotnie. Ta spokojna faza trwa około 130 milionów lat.','Helium ignites in the core in a flash and the star shrinks tenfold. This quiet phase lasts about 130 million years.','Im Kern zündet Helium schlagartig und der Stern schrumpft um das Zehnfache. Diese ruhige Phase dauert rund 130 Millionen Jahre.','El helio se enciende de golpe en el núcleo y la estrella se encoge diez veces. Esta fase tranquila dura unos 130 millones de años.']),
 phase('agb', 'Asymptotyczna gałąź olbrzymów', 12, 7.72, 7.748,
  {mass: .66, radius: 12, luminosity: 54, temperature: 4600},
  {mass: .546, radius: 213, luminosity: 4170, temperature: 2860}, 'M5 III',
  ['Spalanie w dwóch otoczkach naraz, pulsy termiczne i najsilniejszy wiatr. Słońce świeci ponad cztery tysiące razy jaśniej niż dziś.','Two burning shells at once, thermal pulses, and the strongest wind of all. The Sun shines over four thousand times brighter than today.','Zwei brennende Schalen zugleich, thermische Pulse und der stärkste Wind. Die Sonne leuchtet über viertausendmal heller als heute.','Dos capas ardiendo a la vez, pulsos térmicos y el viento más intenso. El Sol brilla más de cuatro mil veces más que hoy.']),
 phase('planetary-nebula', 'Mgławica planetarna', 12, 7.748, 7.758,
  {mass: .546, radius: 40, luminosity: 3500, temperature: 6000},
  {mass: .5405, radius: .1, luminosity: 300, temperature: 120000}, 'jądro mgławicy',
  ['Otoczka zostaje odrzucona i odsłania gorące jądro, które ją jonizuje. Cały ten spektakl trwa około dziesięciu tysięcy lat.','The envelope is cast off, exposing the hot core that ionises it. The whole spectacle lasts about ten thousand years.','Die Hülle wird abgestoßen und gibt den heißen Kern frei, der sie ionisiert. Das ganze Schauspiel dauert etwa zehntausend Jahre.','La envoltura es expulsada y deja al descubierto el núcleo caliente que la ioniza. Todo el espectáculo dura unos diez mil años.']),
 phase('white-dwarf', 'Biały karzeł', 14, 7.758, 13,
  {mass: .5405, radius: .0126, luminosity: 100, temperature: 100000},
  {mass: .5405, radius: .0126, luminosity: 1e-5, temperature: 4000}, 'DA',
  ['Zostaje jądro węglowo-tlenowe o masie 0,54 Słońca upakowanej w kuli wielkości Ziemi. Nie produkuje już energii — tylko stygnie, przez dziesiątki miliardów lat.','What remains is a carbon-oxygen core, 0.54 solar masses packed into a sphere the size of Earth. It makes no more energy: it only cools, for tens of billions of years.','Zurück bleibt ein Kohlenstoff-Sauerstoff-Kern, 0,54 Sonnenmassen in einer erdgroßen Kugel. Er erzeugt keine Energie mehr, sondern kühlt nur noch ab — über zig Milliarden Jahre.','Queda un núcleo de carbono y oxígeno, 0,54 masas solares en una esfera del tamaño de la Tierra. Ya no produce energía: solo se enfría, durante decenas de miles de millones de años.'])
]);

export const SOLAR_EVOLUTION_SECONDS = SOLAR_PHASES.reduce((total, item) => total + item.seconds, 0);

// Radius, luminosity and temperature span four to eight orders of magnitude
// within a single run, so they are interpolated geometrically: a linear ramp
// would spend almost the whole of a phase at its larger endpoint.
const geometric = (from, to, t) => Math.exp(Math.log(from) + (Math.log(to) - Math.log(from)) * t);
const linear = (from, to, t) => from + (to - from) * t;
const clamp01 = value => Math.max(0, Math.min(1, value));

export function solarEvolutionState(seconds) {
 const at = Math.max(0, Number(seconds) || 0);
 let elapsed = 0;
 for (let index = 0; index < SOLAR_PHASES.length; index++) {
  const item = SOLAR_PHASES[index];
  const last = index === SOLAR_PHASES.length - 1;
  if (!last && at >= elapsed + item.seconds) { elapsed += item.seconds; continue; }
  const progress = clamp01(item.seconds > 0 ? (at - elapsed) / item.seconds : 1);
  return {
   phase: item.id, index, name: item.name, note: item.note, spectralType: item.spectralType,
   progress, done: last && progress >= 1,
   ageGyr: linear(item.startGyr, item.endGyr, progress),
   mass: linear(item.from.mass, item.to.mass, progress),
   radiusSolar: geometric(item.from.radius, item.to.radius, progress),
   luminosity: geometric(item.from.luminosity, item.to.luminosity, progress),
   temperature: geometric(item.from.temperature, item.to.temperature, progress)
  };
 }
 return null;
}

// Mass a star loses to its wind leaves the system, and the orbits left behind
// widen: for slow loss the action is adiabatically invariant, so the semi-major
// axis goes as 1/M and the orbital speed as M. The integrator would find this
// on its own given millions of years of orbits, and it has seconds, so the
// scripted run applies the same result directly. This is why Mercury and Venus
// are still overtaken by the giant while retreating from it.
export function adiabaticExpansion(massBefore, massAfter) {
 if (!(massBefore > 0 && massAfter > 0)) return {position: 1, velocity: 1};
 return {position: massBefore / massAfter, velocity: massAfter / massBefore};
}

// A body is inside the photosphere once its distance from the star's centre is
// smaller than the star's radius. Both in AU.
export const engulfed = (distanceAU, starRadiusAU) => distanceAU <= starRadiusAU;
