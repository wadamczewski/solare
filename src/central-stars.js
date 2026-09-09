// Central-star presets use bolometric luminosity in L☉, mass in M☉ and mean
// photospheric radius in km. They are intentionally a small, curated list:
// parameters of supergiants are model-dependent and often time-variable.
export const SOLAR_RADIUS_KM=695700;

export const centralStars=[
 {id:'sun',name:'Słońce',mass:1,radius:SOLAR_RADIUS_KM,luminosity:1,temperature:5772,colorTemperature:5778,spin:609.12,tilt:7.25,spectralType:'G2 V',galaxy:'Droga Mleczna',source:'https://solarscience.msfc.nasa.gov/',note:'Wartości referencyjne NASA dla fotosfery i całkowitej mocy promieniowania.'},
 {id:'sirius-a',name:'Sirius A',mass:2.02,radius:1.711*SOLAR_RADIUS_KM,luminosity:25.4,temperature:9900,colorTemperature:9900,spin:5.5*24,tilt:0,spectralType:'A1 V',galaxy:'Droga Mleczna',source:'https://www.aanda.org/articles/aa/pdf/2003/35/aa3846.pdf',note:'Masa, promień i jasność są dobrze ograniczone przez astrometrię oraz interferometrię.'},
 {id:'vega',name:'Vega',mass:2.135,radius:2.362*SOLAR_RADIUS_KM,luminosity:40.12,temperature:9602,colorTemperature:9602,spin:12.5,tilt:5,spectralType:'A0 V',galaxy:'Droga Mleczna',source:'https://ui.adsabs.harvard.edu/abs/2006ApJ...644..475Y/abstract',note:'Szybko rotująca gwiazda oglądana prawie od bieguna; podane wartości są efektywnymi średnimi.'},
 {id:'betelgeuse',name:'Betelgeuse',mass:17.5,radius:780*SOLAR_RADIUS_KM,luminosity:93000,temperature:3600,colorTemperature:3600,spin:36*365.25*24,tilt:0,spectralType:'M1–M2 Ia–ab',galaxy:'Droga Mleczna',source:'https://doi.org/10.3847/1538-4357/ad93c8',note:'Czerwony nadolbrzym o zmiennych parametrach; wartości są modelem z rozwiązania pulsacyjno-astrometrycznego.'},
 {id:'r136a1',name:'R136a1',mass:265,radius:35*SOLAR_RADIUS_KM,luminosity:8.7e6,temperature:53000,colorTemperature:53000,spin:24,tilt:0,spectralType:'WN5h',galaxy:'Wielki Obłok Magellana',source:'https://www.eso.org/public/news/eso1030/',note:'Bardzo masywna gwiazda Wolfa–Rayeta w 30 Doradus; bieżąca masa i jasność wynikają z modeli atmosfery oraz ewolucji.'},
 {id:'woh-g64',name:'WOH G64',mass:25,radius:1540*SOLAR_RADIUS_KM,luminosity:10**5.45,temperature:3400,colorTemperature:3400,spin:24,tilt:0,spectralType:'M7.5 I',galaxy:'Wielki Obłok Magellana',source:'https://arxiv.org/abs/0903.2260',note:'Oszacowanie czerwonego nadolbrzyma z pyłowym torusem: masa ewolucyjna, a promień, temperatura i jasność z modelu atmosfery.'}
];

export const starPreset=id=>centralStars.find(star=>star.id===id)||centralStars[0];

// Approximation to the visible black-body locus. It describes the apparent
// colour of a stellar photosphere in vacuum, not the atmospheric colour seen
// from the ground.
export function blackbodyColor(temperature){
 const k=Math.max(1000,Math.min(40000,temperature))/100;
 let r,g,b;
 if(k<=66){r=255;g=99.4708025861*Math.log(k)-161.1195681661;b=k<=19?0:138.5177312231*Math.log(k-10)-305.0447927307}
 else {r=329.698727446*Math.pow(k-60,-.1332047592);g=288.1221695283*Math.pow(k-60,-.0755148492);b=255}
 const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
 return `#${[r,g,b].map(clamp).map(value=>value.toString(16).padStart(2,'0')).join('')}`;
}

// Scene light is tonemapped, so a linear stellar luminosity would reduce all
// luminous stars to a white clipped disk. This is only a display exposure;
// physics continues to use the uncompressed bolometric luminosity above.
export const visualLuminosity=luminosity=>Math.max(.28,1+.28*Math.log10(Math.max(1e-8,luminosity)));

export function centralStarDetails(body){
 return body?.key==='sun'?{luminosity:body.luminosity??1,temperature:body.temperature??5772,colorTemperature:body.colorTemperature??5778,spectralType:body.spectralType??'G2 V',galaxy:body.galaxy??'Droga Mleczna',source:body.source,note:body.note,starPresetId:body.starPresetId??'sun'}:null;
}

export function applyCentralStarPreset(sun,preset,bodies){
 const oldMass=Math.max(1e-12,sun.mass),factor=Math.sqrt(preset.mass/oldMass),originVelocity=[...sun.v];
 // The existing planets keep their instantaneous position; scaling each
 // heliocentric velocity by √(Mnew/Mold) prevents an artificial one-frame
 // ejection solely because the central mass was changed in the editor.
 for(const body of bodies)if(body!==sun)body.v=body.v.map((value,index)=>originVelocity[index]+(value-originVelocity[index])*factor);
 Object.assign(sun,{name:preset.name,mass:preset.mass,radius:preset.radius,spin:preset.spin,tilt:preset.tilt,color:blackbodyColor(preset.colorTemperature),luminosity:preset.luminosity,temperature:preset.temperature,colorTemperature:preset.colorTemperature,spectralType:preset.spectralType,galaxy:preset.galaxy,source:preset.source,note:preset.note,starPresetId:preset.id,stellar:true});
 return sun;
}
