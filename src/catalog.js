import {AU, G, SOLAR_MASS, planets, body} from './physics.js';
export const horizonRadius = massKg => 2 * G * (massKg / SOLAR_MASS) / (299792.458 * 86400 / AU) ** 2 * AU;
export const validDimensions = (massKg, radiusKm) => Number.isFinite(massKg) && massKg > 0 && massKg <= 1e43 && Number.isFinite(radiusKm) && radiusKm > 0 && radiusKm <= 1e14;
const earth = planets.find(p => p[1] === 'earth'), jupiter = planets.find(p => p[1] === 'jupiter');
const blackHole = (id, name, mass, source = '') => ({id, name, key:'blackhole', group:'Czarne dziury', mass, radius:horizonRadius(mass * SOLAR_MASS), spin:24, tilt:0, color:'#f9b572', source, note:'Masa przybliżona. Promień horyzontu obliczamy z masy dla nierotującej czarnej dziury; to uproszczenie, bez ogólnej teorii względności.'});
const exoplanet = (id, name, mass, radius, color, note, gas=false, visualSource='') => ({id, name, key:id, group:'Egzoplanety', mass, radius, textureKey:id, color, gas, spin:24, tilt:0, source:`https://science.nasa.gov/exoplanet-catalog/${id}/`, visualSource, note:note+' Tekstura jest naukową wizualizacją, nie bezpośrednim zdjęciem powierzchni. Obrót 24 h i oś 0° to założenia symulacji. Położenie i prędkość nadajesz tutaj.'});
// Masses and pulse periods are observations where available. A neutron-star
// radius and the mass of objects without a dynamical mass measurement remain
// equation-of-state / canonical model values rather than direct photographs.
const neutronStar = (id,name,{mass,radius,spin,magneticField,tilt=30,source,note}) => ({id,name,key:'neutron-star',group:'Gwiazdy neutronowe',mass,radius,spin,magneticField,tilt,color:'#c9e9ff',source,note});
export const catalog = [
 {id:'comet',key:'comet',name:'Kometa',group:'Obiekty ogólne',mass:1.1e-16,radius:4,spin:12,tilt:35,color:'#a1d6df',note:'Przykładowe jądro komety. Masę i promień możesz zmieniać niezależnie.'},
 {id:'halley',key:'comet',name:'1P/Halley',group:'Obiekty ogólne',mass:2.2e14/SOLAR_MASS,radius:5.5,spin:52,tilt:162,color:'#292a27',note:'1P/Halley ma jądro około 15 × 8 km. Masa i promień są przybliżeniem dla nieregularnego, aktywnego jądra komety.'},
 {...blackHole('blackhole','Supermasywna czarna dziura',1e6),group:'Obiekty ogólne'},
 {...blackHole('custom-blackhole','Własna czarna dziura',10),group:'Obiekty ogólne',note:'Ustaw własną masę w kg lub masach Słońca, położenie i wektor ruchu. Horyzont wynika z masy. Model nierotującej czarnej dziury; bez efektów relatywistycznych.'},
 ...planets.map(p=>({id:p[1],name:p[0],key:p[1],group:'Układ Słoneczny',mass:p[5],radius:p[6],spin:p[7],tilt:p[8],color:p[9],note:'Przybliżona masa i średni promień planety. Nowa kopia powstaje we wskazanym miejscu.'})),
 blackHole('sagittarius-a','Sagittarius A*',4e6,'https://science.nasa.gov/universe/black-holes/'),
 blackHole('m87','M87*',6.5e9,'https://www.jpl.nasa.gov/edu/resources/teachable-moment/how-scientists-captured-the-first-image-of-a-black-hole/'),
 blackHole('cygnus-x1','Cygnus X-1',21,'https://www.nasa.gov/universe/nasas-ixpe-reveals-shape-orientation-of-hot-matter-around-black-hole/'),
 neutronStar('psr-j0740','PSR J0740+6620',{mass:2.08,radius:13.7,spin:.00288/3600,magneticField:1.6e4,tilt:26,source:'https://ntrs.nasa.gov/citations/20210026095',note:'Masa 2,08 ± 0,07 masy Słońca i promień 13,7 km pochodzą z analizy NICER/XMM. Okres 2,88 ms jest mierzony; pole magnetyczne jest oszacowaniem pulsara milisekundowego.'}),
 neutronStar('crab-pulsar','Pulsar Kraba',{mass:1.4,radius:12.4,spin:.033/3600,magneticField:3.8e8,tilt:30,source:'https://science.nasa.gov/missions/hubble/the-crab-nebula/',note:'Okres obrotu wynosi około 33 ms. Masa 1,4 masy Słońca i promień 12,4 km to kanoniczny model gwiazdy neutronowej; pole 3,8 × 10⁸ T jest przybliżeniem dipolowym.'}),
 neutronStar('vela-pulsar','Pulsar Vela',{mass:1.4,radius:9.7,spin:(1/11)/3600,magneticField:3.4e8,tilt:35,source:'https://www.nasa.gov/missions/chandra/vela-pulsar/',note:'NASA opisuje obiekt o średnicy około 12 mil, wykonujący ponad 11 obrotów na sekundę. Masa 1,4 masy Słońca i pole 3,4 × 10⁸ T są wartościami modelowymi.'}),
 neutronStar('sgr-1806-20','Magnetar SGR 1806−20',{mass:1.4,radius:12,spin:7.47665/3600,magneticField:2e10,tilt:20,source:'https://heasarc.gsfc.nasa.gov/docs/asca/science/magnetar.html',note:'Zaobserwowany okres obrotu: 7,47665 s. Pole magnetyczne około 2 × 10¹⁰ T (2 × 10¹⁴ G); masa 1,4 masy Słońca i promień 12 km to modelowe wartości gwiazdy neutronowej.'}),
 exoplanet('proxima-centauri-b','Proxima Centauri b',1.055*earth[5],1.02*earth[6],'#bb9b89','Masa minimalna z pomiarów prędkości radialnych; promień szacowany.',false,'https://www.hq.eso.org/public/images/eso1629e/'),
 exoplanet('trappist-1-e','TRAPPIST-1 e',.692*earth[5],.92*earth[6],'#b4a294','Masa i promień według katalogu NASA.',false,'https://science.nasa.gov/asset/webb/trappist-1-e-artists-concept/'),
 exoplanet('51-pegasi-b','51 Pegasi b',.61*jupiter[5],1.26*69911,'#e4bb92','Masa przybliżona; promień szacowany.',true,'https://www.esa.int/ESA_Multimedia/Images/2023/03/Artist_s_impression_of_exoplanet_51_Pegasi_b'),
 exoplanet('55-cancri-e','55 Cancri e',7.99*earth[5],1.875*earth[6],'#ff9260','Masa i promień według katalogu NASA.',false,'https://science.nasa.gov/asset/webb/super-earth-exoplanet-55-cancri-e-artists-concept/')
];
export function createCatalogBody(id, {massKg, radiusKm, p, v}) {
 const preset = catalog.find(item=>item.id===id);
 if(!preset)throw new Error('Nieznany obiekt.');
 if(preset.key==='blackhole')radiusKm=horizonRadius(massKg);
 if(!validDimensions(massKg,radiusKm))throw new Error('Masa: 0–1e43 kg; promień: 0–1e14 km. Obie wartości muszą być dodatnie.');
 const {id:presetId,group,...properties}=preset;
 return body({...properties,presetId,mass:massKg/SOLAR_MASS,radius:radiusKm,p:[...p],v:[...v]});
}
