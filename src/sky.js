// The real sky, drawn on a sphere that rides with the camera.
//
// Catalogue data is prepared offline by tools/build-sky.mjs from d3-celestial
// (BSD-3-Clause, Olaf Frohn), which packages Hipparcos/Tycho astrometry and
// Mellinger's all-sky survey. Coordinates arrive as equatorial J2000 RA/Dec and
// are rotated here into the renderer's ecliptic frame.
//
// The Milky Way is drawn twice over: a smooth luminance map rasterised from the
// survey's five isophote levels, plus a sparse point cloud on top. The band
// physically is starlight too faint to resolve, so the map carries its glow
// while the points restore the grain of the stars that do resolve.
import * as THREE from 'three';
import {LineSegments2} from 'three/addons/lines/LineSegments2.js';
import {LineSegmentsGeometry} from 'three/addons/lines/LineSegmentsGeometry.js';
import {LineMaterial} from 'three/addons/lines/LineMaterial.js';

// The sky remains transparent, but must still participate in depth testing.
// Otherwise Three.js renders it after opaque bodies and its stars shine through
// planets, moons and the Sun.
export const skyLayerDepthState = Object.freeze({
 depthWrite: false,
 depthTest: true
});

const DEG = Math.PI / 180;
const OBLIQUITY = 23.4392911 * DEG;          // mean obliquity at J2000
const COS_E = Math.cos(OBLIQUITY), SIN_E = Math.sin(OBLIQUITY);

// Equatorial J2000 RA/Dec (degrees) to a unit vector in the renderer's frame,
// where the ecliptic lies in XZ and +Y is the ecliptic north pole.
export function skyDirection(raDeg, decDeg) {
 const ra = raDeg * DEG, dec = decDeg * DEG;
 const cd = Math.cos(dec);
 const xe = cd * Math.cos(ra), ye = cd * Math.sin(ra), ze = Math.sin(dec);
 return [xe, -ye * SIN_E + ze * COS_E, ye * COS_E + ze * SIN_E];
}

// Ballesteros (2012) colour-index to effective temperature, then a blackbody
// tint. Both are approximations: real stellar colours also depend on surface
// gravity, metallicity and reddening, none of which the catalogue carries.
export function colourIndexToRGB(bv) {
 const clamped = Math.max(-0.4, Math.min(2, bv));
 const t = 4600 * (1 / (0.92 * clamped + 1.7) + 1 / (0.92 * clamped + 0.62));
 const k = Math.max(1000, Math.min(40000, t)) / 100;
 let r, g, b;
 if (k <= 66) { r = 255; g = 99.47 * Math.log(k) - 161.12; }
 else { r = 329.7 * Math.pow(k - 60, -0.1332); g = 288.12 * Math.pow(k - 60, -0.0755); }
 if (k >= 66) b = 255;
 else if (k <= 19) b = 0;
 else b = 138.52 * Math.log(k - 10) - 305.04;
 const channel = v => Math.pow(Math.max(0, Math.min(255, v)) / 255, 2.2); // to linear
 return [channel(r), channel(g), channel(b)];
}

// Relative flux, normalised so a magnitude 6 star (the naked-eye limit through
// air) sits at 1. Space has no extinction, so fainter stars stay visible here.
export const magnitudeFlux = mag => Math.pow(10, -0.4 * (mag - 6));

function decode(buffer, fields) {
 const count = new DataView(buffer).getUint32(0, true);
 const out = {count};
 let offset = 4;
 for (const [name, Type] of fields) {
  out[name] = new Type(buffer, offset, count);
  offset += count * Type.BYTES_PER_ELEMENT;
 }
 return out;
}

export const decodeStars = buffer =>
 decode(buffer, [['ra', Uint16Array], ['dec', Int16Array], ['mag', Int16Array], ['bv', Int8Array]]);
export const decodeGlow = buffer =>
 decode(buffer, [['ra', Uint16Array], ['dec', Int16Array], ['brightness', Uint8Array]]);
export const decodeLines = buffer =>
 decode(buffer, [['ra', Uint16Array], ['dec', Int16Array]]);

export const unpackRA = raw => raw * 360 / 65536;
export const unpackDec = raw => raw / 180;

// The packed line file preserves the source ordering but not its GeoJSON
// feature properties. These figures restore that lightweight metadata without
// adding a runtime network dependency. The source has two Serpens features.
export const constellationFigures = Object.freeze([
 ['And','Andromeda'],['Ant','Antlia'],['Aps','Apus'],['Aqr','Aquarius'],['Aql','Aquila'],['Ara','Ara'],['Ari','Aries'],['Aur','Auriga'],['Boo','Boötes'],['Cae','Caelum'],['Cam','Camelopardalis'],['Cnc','Cancer'],['CVn','Canes Venatici'],['CMa','Canis Major'],['CMi','Canis Minor'],['Cap','Capricornus'],['Car','Carina'],['Cas','Cassiopeia'],['Cen','Centaurus'],['Cep','Cepheus'],['Cet','Cetus'],['Cha','Chamaeleon'],['Cir','Circinus'],['Col','Columba'],['Com','Coma Berenices'],['CrA','Corona Australis'],['CrB','Corona Borealis'],['Crv','Corvus'],['Crt','Crater'],['Cru','Crux'],['Cyg','Cygnus'],['Del','Delphinus'],['Dor','Dorado'],['Dra','Draco'],['Equ','Equuleus'],['Eri','Eridanus'],['For','Fornax'],['Gem','Gemini'],['Gru','Grus'],['Her','Hercules'],['Hor','Horologium'],['Hya','Hydra'],['Hyi','Hydrus'],['Ind','Indus'],['Lac','Lacerta'],['Leo','Leo'],['LMi','Leo Minor'],['Lep','Lepus'],['Lib','Libra'],['Lup','Lupus'],['Lyn','Lynx'],['Lyr','Lyra'],['Men','Mensa'],['Mic','Microscopium'],['Mon','Monoceros'],['Mus','Musca'],['Nor','Norma'],['Oct','Octans'],['Oph','Ophiuchus'],['Ori','Orion'],['Pav','Pavo'],['Peg','Pegasus'],['Per','Perseus'],['Phe','Phoenix'],['Pic','Pictor'],['Psc','Pisces'],['PsA','Piscis Austrinus'],['Pup','Puppis'],['Pyx','Pyxis'],['Ret','Reticulum'],['Sge','Sagitta'],['Sgr','Sagittarius'],['Sco','Scorpius'],['Scl','Sculptor'],['Sct','Scutum'],['Ser','Serpens Caput'],['Ser','Serpens Cauda'],['Sex','Sextans'],['Tau','Taurus'],['Tel','Telescopium'],['Tri','Triangulum'],['TrA','Triangulum Australe'],['Tuc','Tucana'],['UMa','Ursa Major'],['UMi','Ursa Minor'],['Vel','Vela'],['Vir','Virgo'],['Vol','Volans'],['Vul','Vulpecula']
]);

// IAU Latin names remain stable identifiers. The short names shown to a viewer
// follow the interface language and retain that identifier in parentheses.
const constellationTranslations = Object.freeze({
 'Andromeda':['Andromeda','Andromeda','Andromeda','Andrómeda'],'Antlia':['Pompa','Air Pump','Luftpumpe','Máquina Neumática'],'Apus':['Ptak Rajski','Bird of Paradise','Paradiesvogel','Ave del Paraíso'],'Aquarius':['Wodnik','Water Bearer','Wassermann','Acuario'],'Aquila':['Orzeł','Eagle','Adler','Águila'],'Ara':['Ołtarz','Altar','Altar','Altar'],'Aries':['Baran','Ram','Widder','Aries'],'Auriga':['Woźnica','Charioteer','Fuhrmann','Auriga'],'Boötes':['Wolarz','Herdsman','Bärenhüter','Boyero'],'Caelum':['Rylec','Chisel','Grabstichel','Buril'],'Camelopardalis':['Żyrafa','Giraffe','Giraffe','Jirafa'],'Cancer':['Rak','Crab','Krebs','Cáncer'],'Canes Venatici':['Psy Gończe','Hunting Dogs','Jagdhunde','Canes de Caza'],'Canis Major':['Wielki Pies','Great Dog','Großer Hund','Can Mayor'],'Canis Minor':['Mały Pies','Little Dog','Kleiner Hund','Can Menor'],'Capricornus':['Koziorożec','Sea Goat','Steinbock','Capricornio'],'Carina':['Kil','Keel','Kiel','Quilla'],'Cassiopeia':['Kasjopea','Cassiopeia','Kassiopeia','Casiopea'],'Centaurus':['Centaur','Centaur','Zentaur','Centauro'],'Cepheus':['Cefeusz','Cepheus','Kepheus','Cefeo'],'Cetus':['Wieloryb','Whale','Walfisch','Ballena'],'Chamaeleon':['Kameleon','Chameleon','Chamäleon','Camaleón'],'Circinus':['Cyrkiel','Compass','Zirkel','Compás'],'Columba':['Gołąb','Dove','Taube','Paloma'],'Coma Berenices':['Warkocz Bereniki',"Berenice's Hair",'Haar der Berenike','Cabellera de Berenice'],'Corona Australis':['Korona Południowa','Southern Crown','Südliche Krone','Corona Austral'],'Corona Borealis':['Korona Północna','Northern Crown','Nördliche Krone','Corona Boreal'],'Corvus':['Kruk','Raven','Rabe','Cuervo'],'Crater':['Puchar','Cup','Becher','Copa'],'Crux':['Krzyż Południa','Southern Cross','Kreuz des Südens','Cruz del Sur'],'Cygnus':['Łabędź','Swan','Schwan','Cisne'],'Delphinus':['Delfin','Dolphin','Delfin','Delfín'],'Dorado':['Złota Ryba','Goldfish','Schwertfisch','Dorado'],'Draco':['Smok','Dragon','Drache','Dragón'],'Equuleus':['Źrebię','Little Horse','Füllen','Potrillo'],'Eridanus':['Erydan','Eridanus','Eridanus','Erídano'],'Fornax':['Piec','Furnace','Ofen','Horno'],'Gemini':['Bliźnięta','Twins','Zwillinge','Géminis'],'Grus':['Żuraw','Crane','Kranich','Grulla'],'Hercules':['Herkules','Hercules','Herkules','Hércules'],'Horologium':['Zegar','Pendulum Clock','Pendeluhr','Reloj'],'Hydra':['Hydra','Hydra','Wasserschlange','Hidra'],'Hydrus':['Wąż Wodny','Male Water Snake','Kleine Wasserschlange','Hydra Macho'],'Indus':['Indianin','Indian','Indianer','Indio'],'Lacerta':['Jaszczurka','Lizard','Eidechse','Lagarto'],'Leo':['Lew','Lion','Löwe','Leo'],'Leo Minor':['Mały Lew','Little Lion','Kleiner Löwe','León Menor'],'Lepus':['Zając','Hare','Hase','Liebre'],'Libra':['Waga','Scales','Waage','Libra'],'Lupus':['Wilk','Wolf','Wolf','Lobo'],'Lynx':['Ryś','Lynx','Luchs','Lince'],'Lyra':['Lutnia','Lyre','Leier','Lira'],'Mensa':['Góra Stołowa','Table Mountain','Tafelberg','Mesa'],'Microscopium':['Mikroskop','Microscope','Mikroskop','Microscopio'],'Monoceros':['Jednorożec','Unicorn','Einhorn','Unicornio'],'Musca':['Mucha','Fly','Fliege','Mosca'],'Norma':['Węgielnica',"Carpenter's Square",'Winkelmaß','Escuadra'],'Octans':['Oktant','Octant','Oktant','Octante'],'Ophiuchus':['Wężownik','Serpent Bearer','Schlangenträger','Ofiuco'],'Orion':['Orion','Orion','Orion','Orión'],'Pavo':['Paw','Peacock','Pfau','Pavo'],'Pegasus':['Pegaz','Pegasus','Pegasus','Pegaso'],'Perseus':['Perseusz','Perseus','Perseus','Perseo'],'Phoenix':['Feniks','Phoenix','Phönix','Fénix'],'Pictor':['Malarz','Painter','Maler','Pintor'],'Pisces':['Ryby','Fishes','Fische','Piscis'],'Piscis Austrinus':['Ryba Południowa','Southern Fish','Südlicher Fisch','Pez Austral'],'Puppis':['Rufa','Stern','Heck des Schiffs','Popa'],'Pyxis':['Kompas',"Mariner's Compass",'Schiffskompass','Brújula'],'Reticulum':['Sieć','Reticle','Netz','Retículo'],'Sagitta':['Strzała','Arrow','Pfeil','Flecha'],'Sagittarius':['Strzelec','Archer','Schütze','Sagitario'],'Scorpius':['Skorpion','Scorpion','Skorpion','Escorpio'],'Sculptor':['Rzeźbiarz','Sculptor','Bildhauer','Escultor'],'Scutum':['Tarcza','Shield','Schild','Escudo'],'Serpens Caput':['Głowa Węża',"Serpent's Head",'Schlangenkopf','Cabeza de la Serpiente'],'Serpens Cauda':['Ogon Węża',"Serpent's Tail",'Schlangenschwanz','Cola de la Serpiente'],'Sextans':['Sekstant','Sextant','Sextant','Sextante'],'Taurus':['Byk','Bull','Stier','Tauro'],'Telescopium':['Teleskop','Telescope','Teleskop','Telescopio'],'Triangulum':['Trójkąt','Triangle','Dreieck','Triángulo'],'Triangulum Australe':['Trójkąt Południowy','Southern Triangle','Südliches Dreieck','Triángulo Austral'],'Tucana':['Tukan','Toucan','Tukan','Tucán'],'Ursa Major':['Wielka Niedźwiedzica','Great Bear','Großer Bär','Osa Mayor'],'Ursa Minor':['Mała Niedźwiedzica','Little Bear','Kleiner Bär','Osa Menor'],'Vela':['Żagiel','Sails','Segel','Velas'],'Virgo':['Panna','Virgin','Jungfrau','Virgo'],'Volans':['Ryba Latająca','Flying Fish','Fliegender Fisch','Pez Volador'],'Vulpecula':['Lisek','Little Fox','Füchschen','Zorra']
});
const languageIndex = {pl:0,en:1,de:2,es:3};
export function constellationLabel(figure, language='en') {
 const latin=figure.name, localized=constellationTranslations[latin]?.[languageIndex[language] ?? 1] || latin;
 return `${localized} (${latin})`;
}

// Segment totals are retained from the d3-celestial GeoJSON features when the
// compact binary file is built. They preserve exact figure boundaries, even
// where one constellation contains detached strokes (notably Serpens).
const constellationSegmentCounts = Object.freeze([
 16,2,3,14,9,6,3,10,13,3,7,4,1,11,1,10,18,4,15,11,15,5,2,4,2,7,6,5,9,2,8,5,7,15,2,26,2,11,8,17,5,18,5,5,10,9,5,10,6,12,6,7,3,5,8,6,4,3,17,24,10,14,23,7,2,23,9,11,3,4,3,29,13,3,4,8,5,3,11,2,3,3,6,21,7,7,12,6,4
]);

export function splitConstellationFigures(lines) {
 const segments = lines.count / 2;
 if (!Number.isInteger(segments) || constellationSegmentCounts.reduce((sum, count) => sum + count, 0) !== segments) throw new Error('Unexpected constellation line data.');
 let start = 0;
 return constellationSegmentCounts.map((count, index) => {
  const figure = {start, count, id: constellationFigures[index][0], name: constellationFigures[index][1]};
  start += count;
  return figure;
 });
}

const RADIUS = 900; // well inside the camera far plane; the group tracks the camera

// The band is painted from an equirectangular luminance map. Rather than rely on
// the sphere's own UV convention, the fragment shader inverts skyDirection() to
// recover RA/Dec from the view direction, so the mapping matches the point
// layers exactly by construction.
const BAND_VERTEX = `
varying vec3 dir;
void main(){ dir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`;

const BAND_FRAGMENT = `
uniform sampler2D map; uniform float strength; uniform vec3 tint;
varying vec3 dir;
const float PI = 3.141592653589793;
const float COS_E = ${COS_E.toFixed(12)};
const float SIN_E = ${SIN_E.toFixed(12)};
void main(){
 vec3 d = normalize(dir);
 float xe = d.x;
 float ye = d.z * COS_E - d.y * SIN_E;
 float ze = d.z * SIN_E + d.y * COS_E;
 float ra = atan(ye, xe);
 float dec = asin(clamp(ze, -1., 1.));
 vec2 uv = vec2((ra + PI) / (2. * PI), (PI * .5 - dec) / PI);
 gl_FragColor = vec4(tint * texture2D(map, uv).r * strength, 1.);
}`;


const STAR_VERTEX = `
attribute float size; attribute float intensity; attribute vec3 tint;
varying vec3 c; varying float i;
uniform float dpr; uniform float scale;
void main(){
 c = tint; i = intensity;
 vec4 mv = modelViewMatrix * vec4(position, 1.);
 gl_Position = projectionMatrix * mv;
 gl_PointSize = size * dpr * scale;
}`;

// A soft core with a wide faint skirt reads as a point source once the bloom
// pass spreads the brightest ones.
const STAR_FRAGMENT = `
varying vec3 c; varying float i;
void main(){
 float r = length(gl_PointCoord - .5) * 2.;
 if (r > 1.) discard;
 float core = pow(1. - r, 2.4);
 gl_FragColor = vec4(c * i * core, 1.);
}`;

const GLOW_FRAGMENT = `
varying vec3 c; varying float i;
void main(){
 float r = length(gl_PointCoord - .5) * 2.;
 if (r > 1.) discard;
 gl_FragColor = vec4(c * i * (1. - smoothstep(0., 1., r)), 1.);
}`;

function pointsMaterial(fragment, dpr) {
 return new THREE.ShaderMaterial({
  uniforms: {dpr: {value: dpr}, scale: {value: 1}},
  vertexShader: STAR_VERTEX, fragmentShader: fragment,
  transparent: true, ...skyLayerDepthState,
  blending: THREE.AdditiveBlending
 });
}

function buildPoints(count, fill, fragment, dpr) {
 const geometry = new THREE.BufferGeometry();
 const position = new Float32Array(count * 3), size = new Float32Array(count);
 const intensity = new Float32Array(count), tint = new Float32Array(count * 3);
 fill({position, size, intensity, tint});
 geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
 geometry.setAttribute('size', new THREE.BufferAttribute(size, 1));
 geometry.setAttribute('intensity', new THREE.BufferAttribute(intensity, 1));
 geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
 const points = new THREE.Points(geometry, pointsMaterial(fragment, dpr));
 points.frustumCulled = false;
 return points;
}

export function starIndicesForMagnitude(stars, maximumMagnitude=Infinity) {
 const indices=[];
 for(let index=0;index<stars.count;index++)if(stars.mag[index]/100<=maximumMagnitude)indices.push(index);
 return indices;
}

function buildStarLayer(stars, dpr, indices=starIndicesForMagnitude(stars)) {
 return buildPoints(indices.length, ({position, size, intensity, tint}) => {
  indices.forEach((source,index) => {
   placeStar(stars, source, position, size, intensity, tint, index);
  });
 }, STAR_FRAGMENT, dpr);
}

function placeStar(stars, source, position, size, intensity, tint, index) {
 const [x,y,z]=skyDirection(unpackRA(stars.ra[source]),unpackDec(stars.dec[source]));
 position[index*3]=x*RADIUS;position[index*3+1]=y*RADIUS;position[index*3+2]=z*RADIUS;
 const flux=magnitudeFlux(stars.mag[source]/100);
 size[index]=Math.min(7,1.05+1.35*Math.pow(flux,.29));
 intensity[index]=Math.min(26,.34+2.6*Math.pow(flux,.52));
 const [r,g,b]=colourIndexToRGB(stars.bv[source]/50);
 tint[index*3]=r;tint[index*3+1]=g;tint[index*3+2]=b;
}

function releaseLayer(layer) {
 layer?.geometry?.dispose();
 layer?.material?.dispose();
}

function waitForIdle() {
 return new Promise(resolve => {
  if(typeof requestIdleCallback==='function')requestIdleCallback(resolve,{timeout:900});
  else setTimeout(resolve,120);
 });
}

// Deep-sky objects are drawn as resolved fuzzy patches sized by their real
// angular extent, which is why the Magellanic Clouds and M31 read as smudges
// rather than stars.
const DSO_TINT = {
 g: [1, .93, .84], s: [1, .93, .84], i: [.95, .95, 1], sd: [.95, .95, 1],
 sfr: [1, .72, .62], en: [1, .72, .62], pn: [.6, 1, .9],
 gc: [1, .95, .82], oc: [.85, .92, 1], pos: [1, .85, .7]
};

export function createSky(dpr) {
 const group = new THREE.Group();
 group.matrixAutoUpdate = false;
 const layers = {};
 let loaded = false;
 let constellationVisible = false;
 let skyScale = 1;
 let activeConstellation = null;
 const constellationGlowMaterials = [];
 const lineResolution = new THREE.Vector2(1, 1);
 const constellationRay = new THREE.Raycaster();
 constellationRay.params.Line.threshold = 2.4;

 const place = (ra, dec, target, index) => {
  const [x, y, z] = skyDirection(ra, dec);
  target[index * 3] = x * RADIUS;
  target[index * 3 + 1] = y * RADIUS;
  target[index * 3 + 2] = z * RADIUS;
 };

 async function load() {
  const grab = async (path, type) => {
   const response = await fetch(path);
   if (!response.ok) throw new Error(`${path}: ${response.status}`);
   return type === 'json' ? response.json() : response.arrayBuffer();
  };
  // Paint the naked-eye catalogue first. The remaining catalogue and the
  // diffuse Milky Way are refined after the first usable frame, avoiding a
  // long main-thread buffer build before the scene appears.
  const [starBuffer, lineBuffer, deepSky, names] = await Promise.all([
   grab('/sky/stars.bin'), grab('/sky/constellations.bin'),
   grab('/sky/deepsky.json', 'json'), grab('/sky/starnames.json', 'json')
  ]);

  const stars = decodeStars(starBuffer);
  layers.stars = buildStarLayer(stars,dpr,starIndicesForMagnitude(stars,5.6));

  // 'pos' marks a coordinate of interest (the galactic centre), not a body to draw.
  const objects = deepSky.filter(o => o.type !== 'pos');
  layers.deepSky = buildPoints(objects.length, ({position, size, intensity, tint}) => {
   objects.forEach((object, i) => {
    place(object.ra, object.dec, position, i);
    // Extended but faint: surface brightness falls as the patch grows, so a big
    // object like the LMC stays a dim smudge rather than a lamp.
    size[i] = Math.max(4, Math.min(34, Math.sqrt(object.arcmin) * 2.4));
    intensity[i] = Math.min(0.5, 0.05 + magnitudeFlux(object.mag) * 0.012);
    const [r, g, b] = DSO_TINT[object.type] || [1, 1, 1];
    tint[i * 3] = r; tint[i * 3 + 1] = g; tint[i * 3 + 2] = b;
   });
  }, GLOW_FRAGMENT, dpr);

  const lines = decodeLines(lineBuffer);
  const linePositions = new Float32Array(lines.count * 3);
  for (let i = 0; i < lines.count; i++)
   place(unpackRA(lines.ra[i]), unpackDec(lines.dec[i]), linePositions, i);
  layers.constellations = new THREE.Group();
  for (const figure of splitConstellationFigures(lines)) {
   const positions = linePositions.slice(figure.start * 6, (figure.start + figure.count) * 6);
   const geometry = new THREE.BufferGeometry();
   geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
   const line = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({color: '#5f7fa8', transparent: true, opacity: .34, ...skyLayerDepthState}));
   line.userData.constellation = figure;
   // WebGL ignores LineBasicMaterial.linewidth on most platforms. A separate
   // LineSegments2 layer gives the active figure an actual screen-space width
   // and additive energy for the bloom pass, while the thin line remains the
   // reliable raycasting target.
   const glowGeometry = new LineSegmentsGeometry();
   glowGeometry.setPositions(Array.from(positions));
   const glowMaterial = new LineMaterial({color:'#bfeaff',linewidth:9,transparent:true,opacity:.9,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending,toneMapped:false});
   glowMaterial.resolution.copy(lineResolution);
   const glow = new LineSegments2(glowGeometry, glowMaterial);
   glow.visible = false;
   glow.frustumCulled = false;
   constellationGlowMaterials.push(glowMaterial);
   line.frustumCulled = false;
   line.renderOrder = -1;
   glow.renderOrder = -1;
   const figureGroup = new THREE.Group();
   figureGroup.userData.constellation = figure;
   figureGroup.add(line, glow);
   layers.constellations.add(figureGroup);
  }
  layers.constellations.frustumCulled = false;
  layers.constellations.visible = constellationVisible;

  for (const layer of Object.values(layers)) { layer.renderOrder = -1; group.add(layer); }
  loaded = true;
  void refineSky(stars,grab).catch(error=>console.warn('Nie udało się uzupełnić mapy nieba:',error.message));
  return {stars: stars.count, glow: 0, deepSky: objects.length, names};
 }

 async function refineSky(stars,grab) {
  await waitForIdle();
  const [glowBuffer,bandTexture]=await Promise.all([
   grab('/sky/milkyway.bin'),
   new Promise((resolve,reject)=>new THREE.TextureLoader().load('/sky/milkyway.png',resolve,undefined,()=>reject(new Error('milkyway.png'))))
  ]);
  bandTexture.flipY=false;bandTexture.wrapS=THREE.RepeatWrapping;bandTexture.minFilter=THREE.LinearFilter;bandTexture.magFilter=THREE.LinearFilter;bandTexture.generateMipmaps=false;bandTexture.colorSpace=THREE.NoColorSpace;
  layers.band=new THREE.Mesh(new THREE.SphereGeometry(RADIUS,64,32),new THREE.ShaderMaterial({uniforms:{map:{value:bandTexture},strength:{value:.34},tint:{value:new THREE.Color(1,.965,.92)}},vertexShader:BAND_VERTEX,fragmentShader:BAND_FRAGMENT,side:THREE.BackSide,transparent:true,...skyLayerDepthState,blending:THREE.AdditiveBlending}));layers.band.frustumCulled=false;layers.band.renderOrder=-2;group.add(layers.band);
  const glow=decodeGlow(glowBuffer);
  layers.milkyway=buildPoints(glow.count,({position,size,intensity,tint})=>{for(let i=0;i<glow.count;i++){place(unpackRA(glow.ra[i]),unpackDec(glow.dec[i]),position,i);const value=glow.brightness[i]/255;size[i]=1+value*.9;intensity[i]=.02+value*.075;tint[i*3]=1;tint[i*3+1]=.96;tint[i*3+2]=.9;}},GLOW_FRAGMENT,dpr);layers.milkyway.material.uniforms.scale.value=skyScale;layers.milkyway.renderOrder=-1;group.add(layers.milkyway);
  await waitForIdle();
  const detailed=buildStarLayer(stars,dpr);detailed.material.uniforms.scale.value=skyScale;detailed.renderOrder=-1;group.remove(layers.stars);releaseLayer(layers.stars);layers.stars=detailed;group.add(detailed);
 }

 return {
  group,
  load,
  get loaded() { return loaded; },
  // The sphere is anchored to the camera, so the sky shows no parallax as the
  // viewpoint crosses the solar system - correct, since the nearest star is
  // some 268 000 AU away.
  update(camera) {
   group.matrix.makeTranslation(camera.position.x, camera.position.y, camera.position.z);
   group.matrixWorldNeedsUpdate = true;
  },
  setConstellations(visible) {
   constellationVisible=visible;
   if (layers.constellations) layers.constellations.visible = visible;
   if (!visible) this.clearConstellationHighlight();
  },
  clearConstellationHighlight() {
   if (!activeConstellation) return;
   activeConstellation.line.material.color.set('#5f7fa8');
   activeConstellation.line.material.opacity = .34;
   activeConstellation.glow.visible = false;
   activeConstellation = null;
  },
  pickConstellation(event, camera, element) {
   if (!layers.constellations?.visible) return null;
   const rect = element.getBoundingClientRect();
   constellationRay.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, -((event.clientY - rect.top) / rect.height * 2 - 1)), camera);
   group.updateMatrixWorld(true);
   const line = constellationRay.intersectObjects(layers.constellations.children, true).find(hit=>hit.object.isLineSegments)?.object || null;
   const constellation = line?.userData.constellation || null;
   if (line === activeConstellation?.line) return constellation;
   this.clearConstellationHighlight();
   if (!line) return null;
   activeConstellation = {line, glow:line.parent.children.find(child=>child.isLineSegments2)};
   line.material.color.set('#d8edff');
   line.material.opacity = .96;
   activeConstellation.glow.visible = true;
   return constellation;
  },
  // Star sizes are in device pixels, so a real-scale flyby needs no change, but
  // the caller can dim the field when a bright foreground would wash it out.
  setScale(value) {
   skyScale=value;
   for (const layer of [layers.stars, layers.milkyway, layers.deepSky])
    if (layer) layer.material.uniforms.scale.value = value;
  },
  setViewport(width,height) {
   lineResolution.set(Math.max(1,width),Math.max(1,height));
   for(const material of constellationGlowMaterials)material.resolution.copy(lineResolution);
  }
 };
}
