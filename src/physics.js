// AU, solar masses, days. G = Gaussian gravitational constant squared.
import {planetState,toSceneFrame} from './ephemeris.js';
import {earthMoonSplit} from './lunar-theory.js';
import {centralStars} from './central-stars.js';
import {iauSpinPole,poleAzimuth,satelliteState,spinAxis} from './planet-poles.js';
import {encounterState,recordedState} from './historic-trajectories.js';
import {keplerDrift} from './fast-step.js';
export const G=0.0002959122082855911, AU=149597870.7, SOLAR_MASS=1.98847e30;
// name, key, semi-major axis AU, eccentricity, inclination deg, mass M☉, radius km, rotation h, axial tilt deg, colour
export const planets=[
 ['Merkury','mercury',.3871,.2056,7.005,1.6601e-7,2439.7,1407.6,.034,'#a79a87'],
 ['Wenus','venus',.7233,.0068,3.395,2.4478e-6,6051.8,5832.5,177.36,'#d6b777'],
 ['Ziemia','earth',1,.0167,0,3.0035e-6,6371,23.934,23.44,'#629ed1'],
 ['Mars','mars',1.5237,.0934,1.85,3.227e-7,3389.5,24.623,25.19,'#c47953'],
 ['Jowisz','jupiter',5.2029,.0484,1.303,.00095479,69911,9.925,3.13,'#d2b99a'],
 ['Saturn','saturn',9.537,.0542,2.489,.00028589,58232,10.656,26.73,'#d9c69c'],
 ['Uran','uranus',19.191,.0472,.773,.00004366,25362,17.24,97.77,'#91d4d9'],
 ['Neptun','neptune',30.07,.0086,1.77,.00005151,24622,16.11,28.32,'#4c73c9']
];
// name, parent, orbital radius km, mass kg, radius km, period days, irregular
export const moons=[
 ['Księżyc','earth',384400,7.342e22,1737.4,27.322,false],
 ['Fobos','mars',9376,1.0659e16,11.267,.3189,true],['Deimos','mars',23463,1.4762e15,6.2,1.263,true],
 ['Io','jupiter',421700,8.932e22,1821.6,1.769,false],['Europa','jupiter',671034,4.8e22,1560.8,3.551,false],['Ganimedes','jupiter',1070412,1.4819e23,2634.1,7.155,false],['Kallisto','jupiter',1882709,1.0759e23,2410.3,16.689,false],
 ['Mimas','saturn',185539,3.75e19,198.2,.942,false],['Enceladus','saturn',238042,1.08e20,252.1,1.37,false],['Tetyda','saturn',294672,6.175e20,531.1,1.888,false],['Dione','saturn',377415,1.095e21,561.4,2.737,false],['Rea','saturn',527068,2.307e21,763.8,4.518,false],['Tytan','saturn',1221870,1.3452e23,2574.7,15.945,false],['Japet','saturn',3560820,1.8056e21,734.5,79.321,false],['Hyperion','saturn',1481000,5.6e18,135,21.277,true,13*24],
 // The eight moons above are the only ones round enough to be in
 // hydrostatic equilibrium; every Saturn moon below this line is a small,
 // lumpy body Cassini imaged well enough to size (radii and masses from
 // Cassini-era Wikipedia infoboxes, mass = 500 kg/m³ assumed density × volume
 // where no measured mass is published, the same convention those infoboxes
 // themselves use for the smallest ones). They fall into three real groups,
 // all essentially in Saturn's ring plane - the shared small inclination
 // already used for every Saturn moon above applies just as well here, so
 // this file's per-body inclination model does not need to change:
 // ring shepherds and co-orbitals, threaded through and just outside the
 // rings themselves, in orbital-radius order -
 ['Pan','saturn',133600,4.3e15,14.1,.575,true],['Daphnis','saturn',136500,6.8e13,3.8,.594,true],['Atlas','saturn',137700,5.49e15,15.1,.605,true],['Prometeusz','saturn',139400,1.6e17,43.1,.616,true],['Pandora','saturn',141700,1.36e17,40.7,.631,true],['Epimeteusz','saturn',151400,5.26e17,58.1,.697,true],['Janus','saturn',151500,1.89e18,89.5,.697,true],['Aegaeon','saturn',167500,7.5e10,.33,.808,true],
 // and the Alkyonides, a trio of tiny moonlets embedded in the faint dust
 // ring their own collisions help supply -
 ['Methone','saturn',194700,6.4e12,1.45,1.01,true],['Anthe','saturn',198100,1.53e12,.9,1.039,true],['Pallene','saturn',212280,1.15e13,2.23,1.153746,true],
 // and the trojans, sharing Tethys's and Dione's own orbits 60° ahead of and
 // behind them at the Lagrange points those two hold the two pairs in - the
 // same distance and period as 'Tetyda' and 'Dione' above, not independently
 // measured values, since that co-orbital relationship is the entire reason
 // these four exist.
 ['Telesto','saturn',294672,4e15,12.3,1.888,true],['Kalipso','saturn',294672,2e15,9.5,1.888,true],['Helena','saturn',377415,7.1e15,18.1,2.737,true],['Polideukes','saturn',377415,7.5e12,1.53,2.737,true],
 ['Miranda','uranus',129390,6.59e19,235.8,1.413,false],['Ariel','uranus',190900,1.353e21,578.9,2.52,false],['Umbriel','uranus',266000,1.172e21,584.7,4.144,false],['Tytania','uranus',436300,3.527e21,788.9,8.706,false],['Oberon','uranus',583500,3.014e21,761.4,13.463,false],
 ['Tryton','neptune',354759,2.139e22,1353.4,-5.877,false],['Proteusz','neptune',117647,4.4e19,210,1.122,true],['Nereida','neptune',5513400,3.1e19,170,360.13,false]
];
// Each moon's orbital inclination (degrees) to its planet's equator - the
// plane its rings lie in, and to within a fraction of a degree the local
// Laplace plane for every regular moon here - and eccentricity, from the
// NASA/JPL satellite mean elements (ssd.jpl.nasa.gov/sats/elem) as given on
// each moon's Wikipedia page. Triton's 157 degrees is what makes it
// retrograde. Nereid, far enough out that the Sun sets its Laplace plane, is
// referred to the ecliptic instead. Iapetus's own Laplace plane lies 14.8
// degrees from Saturn's equator, part-way towards Saturn's orbit, and its 8.1
// degrees are measured from that plane (it comes to 15.5 degrees from the
// equator and 17 from the ecliptic; the node is chosen so the result lands
// within about a degree of both). Earth's Moon is placed by
// lunar-theory.js.
export const MOON_ORBITS={
 'Fobos':{i:1.093,e:.0151},'Deimos':{i:.93,e:.00033},
 'Io':{i:.036,e:.0041},'Europa':{i:.466,e:.009},'Ganimedes':{i:.177,e:.0013},'Kallisto':{i:.192,e:.0074},
 'Mimas':{i:1.574,e:.0196},'Enceladus':{i:.009,e:.0047},'Tetyda':{i:1.12,e:.0001},'Dione':{i:.019,e:.0022},'Rea':{i:.345,e:.001},'Tytan':{i:.349,e:.0288},'Japet':{i:8.13,e:.0286,laplace:14.8,node:74},'Hyperion':{i:.43,e:.123},
 'Pan':{i:.0001,e:0},'Daphnis':{i:.0036,e:0},'Atlas':{i:.003,e:.0012},'Prometeusz':{i:.008,e:.0022},'Pandora':{i:.05,e:.0042},'Epimeteusz':{i:.335,e:.0098},'Janus':{i:.165,e:.0068},'Aegaeon':{i:.001,e:.0002},
 'Methone':{i:.007,e:.0001},'Anthe':{i:.1,e:.0011},'Pallene':{i:.181,e:.004},'Telesto':{i:1.18,e:.0002},'Kalipso':{i:1.499,e:.0005},'Helena':{i:.199,e:.0022},'Polideukes':{i:.177,e:.0192},
 'Miranda':{i:4.232,e:.0013},'Ariel':{i:.26,e:.0012},'Umbriel':{i:.205,e:.0039},'Tytania':{i:.34,e:.0011},'Oberon':{i:.058,e:.0014},
 'Tryton':{i:156.885,e:.000016},'Proteusz':{i:.524,e:.0005},'Nereida':{i:7.09,e:.7507,reference:'ecliptic'}
};
// A pole turned `degrees` from `pole` towards the ecliptic pole (+Y).
function towardEcliptic(pole,degrees){
 const k=[pole[1]*0-pole[2]*1,pole[2]*0-pole[0]*0,pole[0]*1-pole[1]*0],length=Math.hypot(...k);if(length<1e-12)return pole;
 const axis=k.map(x=>x/length),side=[axis[1]*pole[2]-axis[2]*pole[1],axis[2]*pole[0]-axis[0]*pole[2],axis[0]*pole[1]-axis[1]*pole[0]],a=degrees*Math.PI/180;
 return pole.map((x,j)=>x*Math.cos(a)+side[j]*Math.sin(a));
}
let nextId=0;
export function body(o){return {id:++nextId,p:[0,0,0],v:[0,0,0],mass:1,radius:1,spin:24,tilt:0,color:'#bab9b4',...o};}
export const relativeVelocity=(body,reference)=>body.v.map((value,index)=>value-reference.v[index]);
export const velocityKmPerSecond=velocity=>Math.hypot(...velocity)*AU/86400;
const DAY_MS=86400000;
const dayOffset=(date,origin)=> (date.getTime()-Date.parse(origin))/DAY_MS;
const add=(a,b)=>a.map((value,index)=>value+b[index]);
const scale=(a,value)=>a.map(component=>component*value);
const difference=(a,b)=>a.map((value,index)=>value-b[index]);
const norm=a=>Math.hypot(...a);
const lerp=(a,b,t)=>a.map((value,index)=>value+(b[index]-value)*t);
const stateAtPlanet=(key,date)=>{const state=planetState(key,date);return {p:toSceneFrame(state.p),v:toSceneFrame(state.v)}};

// These objects are observed spacecraft or small bodies whose full numerical
// ephemerides are intentionally not bundled with the browser app.  They are
// therefore *kinematic*: their position comes from a documented reference
// trajectory and they neither perturb the planets nor force the integrator
// into millisecond steps near the ISS.
const orbitalPoint=({a,e,period,epoch,phase=0,inclination=0,node=0},date)=>{
 const days=dayOffset(date,epoch),M=phase+Math.PI*2*days/period;
 let E=M;
 for(let i=0;i<8;i++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const x=a*(Math.cos(E)-e),z=a*Math.sqrt(1-e*e)*Math.sin(E);
 const cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(inclination),si=Math.sin(inclination);
 return [cn*x-sn*ci*z,si*z,-sn*x-cn*ci*z];
};
const numericalState=(descriptor,date)=>{
 const p=orbitalPoint(descriptor,date),near=new Date(date.getTime()+DAY_MS*.02);
 return {p,v:scale(difference(orbitalPoint(descriptor,near),p),50)};
};
const dwarfPlanetDefinitions=[
 {name:'Ceres',key:'dwarf-planet',presetId:'ceres',kinematicType:'ceres',dwarfPlanet:true,mass:9.3835e20/SOLAR_MASS,radius:469.7,spin:9.07,tilt:4,color:'#938c80',orbit:{a:2.7675,e:.0758,period:1681.6,epoch:'2000-01-01T12:00:00Z',phase:.8,inclination:10.59*Math.PI/180,node:80.3*Math.PI/180}},
 {name:'Pluton',key:'dwarf-planet',presetId:'pluto',kinematicType:'pluto',dwarfPlanet:true,mass:1.303e22/SOLAR_MASS,radius:1188.3,spin:153.3,tilt:119.6,color:'#bda992',orbit:{a:39.482,e:.2488,period:90560,epoch:'2000-01-01T12:00:00Z',phase:4.3,inclination:17.16*Math.PI/180,node:110.3*Math.PI/180}},
 {name:'Haumea',key:'dwarf-planet',presetId:'haumea',kinematicType:'haumea',dwarfPlanet:true,mass:4.006e21/SOLAR_MASS,radius:816,spin:3.92,tilt:126,color:'#d8dedf',orbit:{a:43.218,e:.1913,period:103774,epoch:'2000-01-01T12:00:00Z',phase:2.1,inclination:28.19*Math.PI/180,node:122.2*Math.PI/180}},
 {name:'Makemake',key:'dwarf-planet',presetId:'makemake',kinematicType:'makemake',dwarfPlanet:true,mass:3.1e21/SOLAR_MASS,radius:715,spin:22.8,tilt:29,color:'#b36e4b',orbit:{a:45.79,e:.159,period:113183,epoch:'2000-01-01T12:00:00Z',phase:5.4,inclination:28.96*Math.PI/180,node:79.6*Math.PI/180}},
 {name:'Eris',key:'dwarf-planet',presetId:'eris',kinematicType:'eris',dwarfPlanet:true,mass:1.6466e22/SOLAR_MASS,radius:1163,spin:25.9,tilt:78,color:'#d7d8dc',orbit:{a:67.78,e:.4418,period:203830,epoch:'2000-01-01T12:00:00Z',phase:3.2,inclination:44.04*Math.PI/180,node:35.9*Math.PI/180}}
];
const kinematicObjectDefinitions=[
 {name:'Voyager 1',key:'spacecraft',presetId:'voyager-1',kinematicType:'voyager-1',spacecraftType:'voyager-1',mass:721.9/SOLAR_MASS,radius:.00185,spin:24,tilt:35,color:'#d4c49e'},
 {name:'Tesla Roadster / Starman',key:'spacecraft',presetId:'tesla-roadster',kinematicType:'tesla-roadster',spacecraftType:'tesla-roadster',mass:1296/SOLAR_MASS,radius:.0022,spin:24,tilt:1.1,color:'#cc3429'},
 {name:'Międzynarodowa Stacja Kosmiczna (ISS)',key:'spacecraft',presetId:'iss',kinematicType:'iss',spacecraftType:'iss',mass:419725/SOLAR_MASS,radius:.0545,spin:1.55,tilt:51.6,color:'#e5e7e7'},
 {name:'ʻOumuamua',key:'interstellar',presetId:'oumuamua',kinematicType:'oumuamua',mass:5e8/SOLAR_MASS,radius:.1,spin:7.34,tilt:122,color:'#4a3728',irregular:true,cometProfile:'oumuamua'},
 {name:'67P/Churyumov–Gerasimenko',key:'comet',presetId:'67p',kinematicType:'67p',mass:9.982e12/SOLAR_MASS,radius:1.65,spin:12.4,tilt:7,color:'#51483f',cometProfile:'67p'},
 {name:'C/1995 O1 (Hale-Bopp)',key:'comet',presetId:'hale-bopp',kinematicType:'hale-bopp',mass:1e15/SOLAR_MASS,radius:30,spin:11,tilt:89,color:'#655044',cometProfile:'hale-bopp'},
 {name:'New Horizons',key:'spacecraft',presetId:'new-horizons',kinematicType:'new-horizons',spacecraftType:'new-horizons',mass:478/SOLAR_MASS,radius:.002,spin:24,tilt:2.5,color:'#d7c69a'},
 {name:'Viking 1',key:'spacecraft',presetId:'viking-1',kinematicType:'viking-1',spacecraftType:'viking-1',mass:2325/SOLAR_MASS,radius:.004,spin:24,tilt:25,color:'#d4c8a4'},
 ...dwarfPlanetDefinitions
];
const KINEMATIC_BY_TYPE=new Map(kinematicObjectDefinitions.map(item=>[item.kinematicType,item]));

// ---- When each object was really observed ---------------------------------
// An object is drawn only while it was actually being watched - tracked by
// radio, measured by telescope - so the scene never shows ʻOumuamua or
// Hale-Bopp today, where nobody can see them, or Voyager before it flew.
// Dates are UTC; `end: null` means the object is still being observed.
//  Voyager 1   launch 1977-09-05 12:56, still tracked by the Deep Space Network
//  New Horizons launch 2006-01-19 19:00, still tracked
//  Viking 1    launch 1975-08-20 21:22; the orbiter's mission ended 1980-08-17
//              (the lander, contacted until 1982-11-11, is drawn in surface view)
//  Roadster    heliocentric from 2018-02-07 03:00 (Horizons s11); the last of
//              its 374 astrometric measurements was taken 2018-03-19
//  ISS         first module (Zarya) launched 1998-11-20, occupied since
//  ʻOumuamua   first image 2017-10-14 (precovery; discovered 10-19), last
//              observation 2018-01-02 (Hubble)
//  67P         first image 1969-09-11 (Churyumov and Svetlana Gerasimenko),
//              last astrometry 2025-06-21 (JPL SBDB)
//  Hale-Bopp   earliest image 1993-04-27 (precovery; discovered 1995-07-23),
//              last observation 2022-07-09 (JPL SBDB, solution JPL#226)
const window=(start,end=null,note='')=>Object.freeze({start:Date.parse(start),end:end?Date.parse(end):null,note});
export const OBSERVATION_WINDOWS=Object.freeze({
 'voyager-1':window('1977-09-05T12:56:00Z'),
 'new-horizons':window('2006-01-19T19:00:00Z'),
 'viking-1':window('1975-08-20T21:22:00Z','1980-08-17T00:00:00Z'),
 'tesla-roadster':window('2018-02-07T03:00:00Z','2018-03-19T04:00:00Z'),
 'iss':window('1998-11-20T06:40:00Z'),
 'oumuamua':window('2017-10-14T00:00:00Z','2018-01-02T23:59:00Z'),
 '67p':window('1969-09-11T00:00:00Z','2025-06-21T23:59:00Z'),
 'hale-bopp':window('1993-04-27T00:00:00Z','2022-07-09T23:59:00Z')
});
export function isObserved(type,date){
 const span=OBSERVATION_WINDOWS[type];if(!span)return true;
 const time=date instanceof Date?date.getTime():Number(date);
 return time>=span.start&&(span.end==null||time<=span.end);
}

// ---- Viking 1 -------------------------------------------------------------
// Horizons holds no Viking trajectory, so the cruise is the Keplerian transfer
// that joins Earth at launch to Mars at orbit insertion in the time the
// spacecraft took (a Lambert arc through the planets' own ephemeris), and the
// orbit afterwards is the documented 1513 x 32 800 km, 39.3-degree orbit
// round Mars. The plane's node is not published; it is a stated choice.
export const VIKING_1_EVENTS=Object.freeze({
 launch:Date.parse('1975-08-20T21:22:00Z'),
 orbitInsertion:Date.parse('1976-06-19T23:40:00Z'),
 separation:Date.parse('1976-07-20T08:51:00Z'),
 landing:Date.parse('1976-07-20T11:53:06Z'),
 orbiterEnd:Date.parse('1980-08-17T00:00:00Z')
});
const MARS_GM_AU=42828.37/(AU**3)*86400*86400;
const stumpffC=z=>z>1e-8?(1-Math.cos(Math.sqrt(z)))/z:z< -1e-8?(Math.cosh(Math.sqrt(-z))-1)/-z:.5-z/24;
const stumpffS=z=>{if(z>1e-8){const r=Math.sqrt(z);return (r-Math.sin(r))/(r*r*r)}if(z< -1e-8){const r=Math.sqrt(-z);return (Math.sinh(r)-r)/(r*r*r)}return 1/6-z/120};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
// Universal-variable Lambert solution (Curtis, Orbital Mechanics, alg. 5.2),
// prograde about +z; returns the departure velocity.
export function lambertDeparture(r1,r2,days,mu=G){
 const n1=norm(r1),n2=norm(r2);
 let angle=Math.acos(Math.max(-1,Math.min(1,dot(r1,r2)/(n1*n2))));
 if(cross(r1,r2)[2]<0)angle=2*Math.PI-angle;
 const A=Math.sin(angle)*Math.sqrt(n1*n2/(1-Math.cos(angle)));
 const y=z=>n1+n2+A*(z*stumpffS(z)-1)/Math.sqrt(stumpffC(z));
 const F=z=>{const yz=y(z);return Math.pow(yz/stumpffC(z),1.5)*stumpffS(z)+A*Math.sqrt(yz)-Math.sqrt(mu)*days};
 let low=-4*Math.PI*Math.PI,high=4*Math.PI*Math.PI*.999;
 while(y(low)<0)low=low/2;
 for(let k=0;k<200;k++){const mid=(low+high)/2;if(F(mid)>0)high=mid;else low=mid}
 const z=(low+high)/2,yz=y(z),f=1-yz/n1,g=A*Math.sqrt(yz/mu);
 return r2.map((value,k)=>(value-f*r1[k])/g);
}
// Two-body propagation from a state, through its osculating conic.
function stateElements(r,v,mu){
 const h=cross(r,v),hn=norm(h),rn=norm(r),e=cross(v,h).map((value,k)=>value/mu-r[k]/rn),ecc=norm(e);
 const a=-mu/(2*(dot(v,v)/2-mu/rn)),nodeVector=cross([0,0,1],h);
 return {a,ecc,incl:Math.acos(h[2]/hn),node:Math.atan2(nodeVector[1],nodeVector[0]),
  peri:Math.atan2(dot(cross(nodeVector,e),h)/hn,dot(nodeVector,e)),nu:Math.atan2(dot(cross(e,r),h)/hn,dot(e,r))};
}
function propagate(r,v,days,mu){
 const el=stateElements(r,v,mu),n=Math.sqrt(mu/Math.abs(el.a**3)),e=el.ecc;
 const E0=2*Math.atan(Math.sqrt((1-e)/(1+e))*Math.tan(el.nu/2)),M=E0-e*Math.sin(E0)+n*days;
 let E=M;for(let k=0;k<40;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const x=el.a*(Math.cos(E)-e),y=el.a*Math.sqrt(1-e*e)*Math.sin(E),rate=n/(1-e*Math.cos(E));
 const vx=-el.a*Math.sin(E)*rate,vy=el.a*Math.sqrt(1-e*e)*Math.cos(E)*rate;
 const cO=Math.cos(el.node),sO=Math.sin(el.node),cI=Math.cos(el.incl),sI=Math.sin(el.incl),cw=Math.cos(el.peri),sw=Math.sin(el.peri);
 const P=[cO*cw-sO*sw*cI,sO*cw+cO*sw*cI,sw*sI],Q=[-cO*sw-sO*cw*cI,-sO*sw+cO*cw*cI,cw*sI];
 return {p:[0,1,2].map(k=>P[k]*x+Q[k]*y),v:[0,1,2].map(k=>P[k]*vx+Q[k]*vy)};
}
let vikingTransfer=null;
function vikingCruise(date){
 if(!vikingTransfer){
  const r1=planetState('earth',new Date(VIKING_1_EVENTS.launch)).p,r2=planetState('mars',new Date(VIKING_1_EVENTS.orbitInsertion)).p;
  const days=(VIKING_1_EVENTS.orbitInsertion-VIKING_1_EVENTS.launch)/DAY_MS;
  vikingTransfer={r1,v1:lambertDeparture(r1,r2,days)};
 }
 const days=Math.max(0,(date.getTime()-VIKING_1_EVENTS.launch)/DAY_MS);
 return propagate(vikingTransfer.r1,vikingTransfer.v1,days,G);
}
function vikingMarsOrbit(date){
 const radius=3389.5,periapsis=(radius+1513)/AU,apoapsis=(radius+32800)/AU,a=(periapsis+apoapsis)/2,e=(apoapsis-periapsis)/(apoapsis+periapsis);
 const n=Math.sqrt(MARS_GM_AU/(a*a*a)),M=n*(date.getTime()-VIKING_1_EVENTS.orbitInsertion)/DAY_MS;
 let E=M;for(let k=0;k<30;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));
 const i=39.3*Math.PI/180,x=a*(Math.cos(E)-e),y=a*Math.sqrt(1-e*e)*Math.sin(E),rate=n/(1-e*Math.cos(E));
 const vx=-a*Math.sin(E)*rate,vy=a*Math.sqrt(1-e*e)*Math.cos(E)*rate;
 return {p:[x,y*Math.cos(i),y*Math.sin(i)],v:[vx,vy*Math.cos(i),vy*Math.sin(i)]};
}
// Heliocentric ecliptic state of Viking 1, or a Mars-relative one after
// orbit insertion (flagged, so the caller can attach it to Mars).
export function vikingState(date){
 if(date.getTime()<VIKING_1_EVENTS.orbitInsertion)return {...vikingCruise(date),relativeTo:null};
 return {...vikingMarsOrbit(date),relativeTo:'mars'};
}

function kinematicState(type,date,bodies){
 const sun=bodies.find(item=>item.key==='sun'),earth=bodies.find(item=>item.key==='earth');
 const sunP=sun?.p||[0,0,0],sunV=sun?.v||[0,0,0];
 const heliocentric=state=>({p:add(sunP,toSceneFrame(state.p)),v:add(sunV,toSceneFrame(state.v))});
 if(type==='iss'&&earth){
  // No historical ISS ephemeris is bundled (it is re-boosted every few
  // weeks); this is its real altitude, inclination and period at a
  // composed phase, attached to the Earth.
  const altitudeAU=(earth.radius+420)/AU,period=.0639,angle=dayOffset(date,'1998-11-20T00:00:00Z')*Math.PI*2/period;
  const inclination=51.6*Math.PI/180,offset=[Math.cos(angle)*altitudeAU,Math.sin(angle)*Math.sin(inclination)*altitudeAU,Math.sin(angle)*Math.cos(inclination)*altitudeAU];
  const velocity=[-Math.sin(angle)*altitudeAU*Math.PI*2/period,Math.cos(angle)*Math.sin(inclination)*altitudeAU*Math.PI*2/period,Math.cos(angle)*Math.cos(inclination)*altitudeAU*Math.PI*2/period];
  return {p:add(earth.p,offset),v:add(earth.v,velocity),parent:earth.id};
 }
 if(type==='viking-1'){
  const state=vikingState(date),mars=bodies.find(item=>item.key==='mars');
  if(state.relativeTo==='mars'&&mars)return {p:add(mars.p,toSceneFrame(state.p)),v:add(mars.v,toSceneFrame(state.v)),parent:mars.id};
  return {...heliocentric(state),parent:null};
 }
 const recorded=recordedState(type,date);
 if(recorded){
  const state=heliocentric(recorded),encounter=encounterState(type,date);
  const host=encounter&&bodies.find(item=>item.key===encounter.body||item.kinematicType===encounter.body);
  if(host&&encounter.weight>0){
   const near={p:add(host.p,toSceneFrame(encounter.p)),v:add(host.v,toSceneFrame(encounter.v))};
   return {p:lerp(state.p,near.p,encounter.weight),v:lerp(state.v,near.v,encounter.weight)};
  }
  return state;
 }
 const dwarf=KINEMATIC_BY_TYPE.get(type)?.orbit;
 if(dwarf){const state=numericalState(dwarf,date);return {p:add(sunP,state.p),v:add(sunV,state.v)};}
 return {p:[...sunP],v:[...sunV]};
}
export function updateKinematicBodies(bodies,date){
 // Dwarf planets first: a flyby probe is placed relative to them.
 const ordered=bodies.filter(item=>item.kinematic).sort((a,b)=>(b.dwarfPlanet?1:0)-(a.dwarfPlanet?1:0));
 for(const item of ordered){
  const state=kinematicState(item.kinematicType,date,bodies);
  item.p=state.p;item.v=state.v;
  if(state.parent)item.parent=state.parent;else if(state.parent===null)delete item.parent;
  item.observed=isObserved(item.kinematicType,date);
 }
 return bodies;
}
// Planets are placed at their true heliocentric state for `date`. The Moon is
// placed from a real theory (lunar-theory.js); every other satellite keeps a
// composed phase (see moons table), because none of them has one.
export function initialSystem(date=new Date()){
 const star=centralStars[0];
 const result=[body({...star,key:'sun',stellar:true,starPresetId:star.id,color:'#fff6ec'})];
 let lunar=null;
 for(const [name,key,a,e,inc,mass,radius,spin,tilt,color] of planets){
  let state=planetState(key,date);
  // JPL's approximate elements are fitted to the Earth-Moon barycentre rather
  // than to the Earth, and the Earth used to be placed there - 4671 km from
  // where it is. Knowing where the Moon is lets the pair be split properly.
  if(key==='earth'){const split=earthMoonSplit(state.p,state.v,date);state=split.earth;lunar=split.moon;}
  // The spin axis keeps its tabulated tilt and takes its direction from the
  // IAU pole, so rings, seasons and the moons' orbital plane all agree.
  result.push(body({name,key,a,e,mass,radius,spin,tilt,color,poleAzimuth:poleAzimuth(iauSpinPole(key,date)),p:toSceneFrame(state.p),v:toSceneFrame(state.v)}));
 }
 moons.forEach(([name,parent,dist,kg,radius,days,irregular,rotationHours],i)=>{
  const host=result.find(b=>b.key===parent),mass=kg/SOLAR_MASS,t=i*2.399;
  // A synchronous moon spins about its orbit normal, so its drawn axis is
  // that normal; the IAU pole is used for the Moon, whose axis is tabulated.
  const axisOf=normal=>({tilt:Math.acos(Math.max(-1,Math.min(1,normal[1])))*180/Math.PI,poleAzimuth:poleAzimuth(normal)});
  if(parent==='earth'&&lunar){
   result.push(body({name,key:'moon',parent:host.id,mass,radius,spin:Math.abs(days)*24,...axisOf(iauSpinPole('moon',date)||[0,1,0]),irregular,color:'#b8b8b6',p:toSceneFrame(lunar.p),v:toSceneFrame(lunar.v)}));
   return;
  }
  const orbit=MOON_ORBITS[name]||{i:0,e:0};
  const reference=orbit.reference==='ecliptic'?[0,1,0]:orbit.laplace?towardEcliptic(spinAxis(host),orbit.laplace):spinAxis(host);
  const state=satelliteState({mu:G*(host.mass+mass),a:dist/AU,e:orbit.e,inclinationDeg:orbit.i,nodeRad:orbit.laplace?orbit.node*Math.PI/180:1+i*.9,phaseRad:t,reference});
  result.push(body({name,key:'moon',parent:host.id,mass,radius,spin:rotationHours??Math.abs(days)*24,...axisOf(state.normal),irregular,color:name==='Io'?'#d8c67d':name==='Tytan'?'#d6a668':'#b8b8b6',p:host.p.map((x,k)=>x+state.p[k]),v:host.v.map((x,k)=>x+state.v[k])}));
 });
 const total=result.reduce((s,b)=>s+b.mass,0),com=[0,0,0],mom=[0,0,0];result.forEach(b=>b.p.forEach((x,k)=>{com[k]+=x*b.mass/total;mom[k]+=b.v[k]*b.mass/total}));result.forEach(b=>b.p.forEach((_,k)=>{b.p[k]-=com[k];b.v[k]-=mom[k]}));
 for(const definition of kinematicObjectDefinitions)result.push(body({...definition,kinematic:true,p:[0,0,0],v:[0,0,0]}));
 updateKinematicBodies(result,date);
 return result;
}
export function accelerations(bs){const acc=bs.map(()=>[0,0,0]);for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],b=bs[j];if(a.kinematic||b.kinematic)continue;const dx=b.p[0]-a.p[0],dy=b.p[1]-a.p[1],dz=b.p[2]-a.p[2],r2=dx*dx+dy*dy+dz*dz+1e-20,f=G/(r2*Math.sqrt(r2)),fa=f*b.mass,fb=f*a.mass;acc[i][0]+=dx*fa;acc[i][1]+=dy*fa;acc[i][2]+=dz*fa;acc[j][0]-=dx*fb;acc[j][1]-=dy*fb;acc[j][2]-=dz*fb}return acc}

export function step(bs,dt){const a=accelerations(bs);for(let i=0;i<bs.length;i++){if(bs[i].kinematic)continue;for(let k=0;k<3;k++){bs[i].v[k]+=.5*dt*a[i][k];bs[i].p[k]+=dt*bs[i].v[k]}}const a2=accelerations(bs);for(let i=0;i<bs.length;i++){if(bs[i].kinematic)continue;for(let k=0;k<3;k++)bs[i].v[k]+=.5*dt*a2[i][k];}}
export function stableStep(bs){let dt=.02;for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){if(bs[i].kinematic||bs[j].kinematic)continue;const r=Math.hypot(...bs[i].p.map((x,k)=>x-bs[j].p[k]));dt=Math.min(dt,.035*Math.sqrt(r*r*r/(G*(bs[i].mass+bs[j].mass))),.035*r/(Math.hypot(...bs[i].v.map((x,k)=>x-bs[j].v[k]))+1e-12))}return Math.max(1e-9,dt)}

// Historic scenarios run decades in a minute - hundreds of simulated days per
// real second, far past what the N-body integrator can step through. The
// planets then come straight from the same JPL ephemeris the system is built
// from (valid 1800-2050), the Moon from its lunar theory, and every other
// moon advances on its exact two-body orbit about its planet. Nothing is
// integrated, so the playback rate costs nothing and the planets stand where
// the ephemeris puts them on each date.
export function advanceByEphemeris(bodies,from,to){
 const days=(to.getTime()-from.getTime())/DAY_MS;
 const sun=bodies.find(item=>item.key==='sun');if(!sun||!(days>0))return updateKinematicBodies(bodies,to);
 const moons=[];
 for(const item of bodies){
  if(item.kinematic||item.key!=='moon'||item.parent==null)continue;
  const host=bodies.find(other=>other.id===item.parent);if(!host)continue;
  moons.push({item,host,r:difference(item.p,host.p),v:difference(item.v,host.v),mu:G*(item.mass+host.mass)});
 }
 let lunar=null;
 for(const [, key] of planets){
  const planet=bodies.find(item=>item.key===key);if(!planet)continue;
  let state=planetState(key,to);
  if(key==='earth'){const split=earthMoonSplit(state.p,state.v,to);state=split.earth;lunar=split.moon;}
  planet.p=add(sun.p,toSceneFrame(state.p));planet.v=add(sun.v,toSceneFrame(state.v));
 }
 for(const {item,host,r,v,mu} of moons){
  if(host.key==='earth'&&lunar&&['Księżyc','Moon'].includes(item.name)){item.p=add(sun.p,toSceneFrame(lunar.p));item.v=add(sun.v,toSceneFrame(lunar.v));continue;}
  const drift=keplerDrift(r,v,mu,days);
  item.p=add(host.p,drift?drift.r:r);item.v=add(host.v,drift?drift.v:v);
 }
 return updateKinematicBodies(bodies,to);
}
