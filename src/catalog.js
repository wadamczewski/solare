import {AU, G, SOLAR_MASS, planets, body} from './physics.js';
export const horizonRadius = massKg => 2 * G * (massKg / SOLAR_MASS) / (299792.458 * 86400 / AU) ** 2 * AU;
export const validDimensions = (massKg, radiusKm) => Number.isFinite(massKg) && massKg > 0 && massKg <= 1e43 && Number.isFinite(radiusKm) && radiusKm > 0 && radiusKm <= 1e14;
const earth = planets.find(p => p[1] === 'earth'), jupiter = planets.find(p => p[1] === 'jupiter');
const blackHole = (id, name, mass, source = '') => ({id, name, key:'blackhole', group:'Czarne dziury', mass, radius:horizonRadius(mass * SOLAR_MASS), spin:24, tilt:0, color:'#f9b572', source, note:'Masa przybliżona. Promień horyzontu obliczamy z masy dla nierotującej czarnej dziury; to uproszczenie, bez ogólnej teorii względności.'});
const exoplanet = (id, name, mass, radius, textureKey, color, note, gas=false) => ({id, name, key:id, group:'Egzoplanety', mass, radius, textureKey, color, gas, spin:24, tilt:0, source:`https://science.nasa.gov/exoplanet-catalog/${id}/`, note:note+' Wygląd umowny; obrót 24 h i oś 0° to założenia symulacji. Położenie i prędkość nadajesz tutaj.'});
export const catalog = [
 {id:'comet',key:'comet',name:'Kometa',group:'Obiekty ogólne',mass:1.1e-16,radius:4,spin:12,tilt:35,color:'#a1d6df',note:'Przykładowe jądro komety. Masę i promień możesz zmieniać niezależnie.'},
 {...blackHole('blackhole','Supermasywna czarna dziura',1e6),group:'Obiekty ogólne'},
 {...blackHole('custom-blackhole','Własna czarna dziura',10),group:'Obiekty ogólne',note:'Ustaw własną masę w kg lub masach Słońca, położenie i wektor ruchu. Horyzont wynika z masy. Model nierotującej czarnej dziury; bez efektów relatywistycznych.'},
 ...planets.map(p=>({id:p[1],name:p[0],key:p[1],group:'Układ Słoneczny',mass:p[5],radius:p[6],spin:p[7],tilt:p[8],color:p[9],note:'Przybliżona masa i średni promień planety. Nowa kopia powstaje we wskazanym miejscu.'})),
 blackHole('sagittarius-a','Sagittarius A*',4e6,'https://science.nasa.gov/universe/black-holes/'),
 blackHole('m87','M87*',6.5e9,'https://www.jpl.nasa.gov/edu/resources/teachable-moment/how-scientists-captured-the-first-image-of-a-black-hole/'),
 blackHole('cygnus-x1','Cygnus X-1',21,'https://www.nasa.gov/universe/nasas-ixpe-reveals-shape-orientation-of-hot-matter-around-black-hole/'),
 exoplanet('proxima-centauri-b','Proxima Centauri b',1.055*earth[5],1.02*earth[6],'mars','#bb9b89','Masa minimalna z pomiarów prędkości radialnych; promień szacowany.'),
 exoplanet('trappist-1-e','TRAPPIST-1 e',.692*earth[5],.92*earth[6],'moon','#b4a294','Masa i promień według katalogu NASA.'),
 exoplanet('51-pegasi-b','51 Pegasi b',.61*jupiter[5],1.26*69911,'jupiter','#e4bb92','Masa przybliżona; promień szacowany.',true),
 exoplanet('55-cancri-e','55 Cancri e',7.99*earth[5],1.875*earth[6],'mars','#ff9260','Masa i promień według katalogu NASA.')
];
export function createCatalogBody(id, {massKg, radiusKm, p, v}) {
 const preset = catalog.find(item=>item.id===id);
 if(!preset)throw new Error('Nieznany obiekt.');
 if(preset.key==='blackhole')radiusKm=horizonRadius(massKg);
 if(!validDimensions(massKg,radiusKm))throw new Error('Masa: 0–1e43 kg; promień: 0–1e14 km. Obie wartości muszą być dodatnie.');
 const {id:presetId,group,...properties}=preset;
 return body({...properties,presetId,mass:massKg/SOLAR_MASS,radius:radiusKm,p:[...p],v:[...v]});
}
