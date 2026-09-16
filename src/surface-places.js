// Real, named surface destinations for the object details pane's "known
// places" list, so jumping into surface view can start somewhere worth
// seeing instead of always at latitude/longitude zero.
//
// Every runtime moon shares the key 'moon' (see physics.js: Europa, Titan
// and the Earth's own Moon are all built with key:'moon', distinguished only
// by name), so this table is keyed by planet key for the eight planets and
// by body name for every moon. knownPlacesFor() below picks the right one.
//
// Coordinates are planetocentric latitude and east longitude in degrees -
// the same convention the surface-latitude/longitude sliders use - rounded
// to the nearest degree. That is enough to bring a feature within view from
// directly overhead; it is not survey-grade placement, and a handful of
// entries (Io's active volcanoes, Jupiter's and Neptune's storms, Saturn's
// polar hexagon) describe things that drift or evolve, so their coordinates
// are only approximate for the current epoch. Names follow official IAU
// planetary nomenclature (https://planetarynames.wr.usgs.gov/) where one
// exists, which is also why most of them need no translation: Latin generic
// terms - Mons, Valles, Regio, Chasma, Patera, Rupes, Mare, Sulcus - are used
// unchanged in every language.
export const KNOWN_PLACES = {
 mercury: [
  {name: 'Caloris Planitia', latitude: 30, longitude: -170},
  {name: 'Discovery Rupes', latitude: -53, longitude: -38}
 ],
 venus: [
  {name: 'Maxwell Montes', latitude: 65, longitude: 3},
  {name: 'Alpha Regio', latitude: -25, longitude: 0}
 ],
 earth: [
  {name: 'Everest', latitude: 28, longitude: 87},
  {name: 'Grand Canyon', latitude: 36, longitude: -112},
  {name: 'Struktura Richat (Oko Sahary)', latitude: 21, longitude: -11}
 ],
 mars: [
  {name: 'Olympus Mons', latitude: 19, longitude: -134},
  {name: 'Valles Marineris', latitude: -14, longitude: -59},
  {name: 'Gale', latitude: -5, longitude: 138}
 ],
 jupiter: [{name: 'Wielka Czerwona Plama', latitude: -20, longitude: -90}],
 saturn: [{name: 'Heksagon bieguna północnego', latitude: 78, longitude: 0}],
 uranus: [{name: 'Biegun (ekstremalne nachylenie osi)', latitude: 90, longitude: 0}],
 neptune: [{name: 'Wielka Ciemna Plama', latitude: -22, longitude: 0}],
 // Moons, keyed by name - see the note above.
 'Księżyc': [
  {name: 'Baza Spokoju (Apollo 11)', latitude: 1, longitude: 23},
  {name: 'Tycho', latitude: -43, longitude: -11},
  {name: 'Copernicus', latitude: 10, longitude: -20}
 ],
 'Fobos': [{name: 'Stickney', latitude: -1, longitude: 49}],
 'Deimos': [{name: 'Voltaire', latitude: 3, longitude: -5}],
 'Io': [
  {name: 'Loki Patera', latitude: 19, longitude: -55},
  {name: 'Pele', latitude: -19, longitude: -105}
 ],
 'Europa': [{name: 'Pwyll', latitude: -25, longitude: 89}],
 'Ganimedes': [{name: 'Galileo Regio', latitude: 32, longitude: -142}],
 'Kallisto': [{name: 'Valhalla', latitude: 18, longitude: -56}],
 'Mimas': [{name: 'Herschel', latitude: 1, longitude: -113}],
 'Enceladus': [{name: 'Damascus Sulcus', latitude: -75, longitude: 0}],
 'Tetyda': [{name: 'Ithaca Chasma', latitude: 0, longitude: -30}],
 'Dione': [{name: 'Janiculum Dorsa', latitude: 22, longitude: -155}],
 'Rea': [{name: 'Inktomi', latitude: -12, longitude: -113}],
 'Tytan': [
  {name: 'Kraken Mare', latitude: 68, longitude: -50},
  {name: 'Xanadu', latitude: 5, longitude: 100}
 ],
 'Japet': [{name: 'Cassini Regio', latitude: 0, longitude: 0}],
 'Miranda': [{name: 'Verona Rupes', latitude: -16, longitude: -4}],
 'Ariel': [{name: 'Kachina Chasmata', latitude: 0, longitude: -30}],
 'Umbriel': [{name: 'Wunda', latitude: 8, longitude: -86}],
 'Tytania': [{name: 'Gertrude', latitude: 16, longitude: -72}],
 'Oberon': [{name: 'Hamlet', latitude: -46, longitude: -46}],
 'Tryton': [{name: 'Uhlanga Regio', latitude: -40, longitude: 20}],
 // Proteus and Nereid have no confidently mapped named surface feature (both
 // were only glimpsed by Voyager 2), so each gets the one destination this
 // simulation can place honestly: the point that always faces the planet,
 // since every moon without its own tabulated rotation is modelled here as
 // tidally locked (see surface-frame.js's synchronousFrame).
 'Proteusz': [{name: 'Punkt podplanetarny', latitude: 0, longitude: 0}],
 'Nereida': [{name: 'Punkt podplanetarny', latitude: 0, longitude: 0}]
};

// Moons all share the runtime key 'moon' - see the note above - so they are
// looked up by name; every other surface-candidate body has a unique key.
export function knownPlacesFor(body) {
 return KNOWN_PLACES[body?.key === 'moon' ? body.name : body?.key] || [];
}
