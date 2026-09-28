// AU, solar masses, days. G = Gaussian gravitational constant squared.
import {planetState,toSceneFrame} from './ephemeris.js';
import {earthMoonSplit} from './lunar-theory.js';
import {centralStars} from './central-stars.js';
import {iauSpinPole,poleAzimuth,satelliteState,spinAxis} from './planet-poles.js';
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
const voyagerMilestoneData=[
 {date:'1977-09-05T12:56:00Z',label:'Start z Ziemi'},
 {date:'1979-03-05T00:00:00Z',label:'Przelot obok Jowisza'},
 {date:'1980-11-12T00:00:00Z',label:'Przelot obok Saturna'},
 {date:'2006-08-16T00:00:00Z',label:'100 AU od Słońca'},
 {date:'2012-08-25T00:00:00Z',label:'Przestrzeń międzygwiezdna'}
];
export const VOYAGER_MILESTONES=Object.freeze(voyagerMilestoneData.map(item=>({...item,time:Date.parse(item.date)})));
const voyagerPoint=date=>{
 const earth=stateAtPlanet('earth',new Date('1977-09-05T12:56:00Z')).p;
 const jupiter=stateAtPlanet('jupiter',new Date('1979-03-05T00:00:00Z')).p;
 const saturn=stateAtPlanet('saturn',new Date('1980-11-12T00:00:00Z')).p;
 const outbound=[-.676,.244,-.695];
 const points=[
  {time:VOYAGER_MILESTONES[0].time,p:add(earth,scale(outbound,.008))},
  {time:VOYAGER_MILESTONES[1].time,p:add(jupiter,scale(outbound,.012))},
  {time:VOYAGER_MILESTONES[2].time,p:add(saturn,scale(outbound,.014))},
  {time:VOYAGER_MILESTONES[3].time,p:scale(outbound,100)},
  {time:VOYAGER_MILESTONES[4].time,p:scale(outbound,122)}
 ];
 const time=date.getTime();
 if(time<=points[0].time)return points[0].p;
 for(let i=1;i<points.length;i++)if(time<=points[i].time){const a=points[i-1],b=points[i];return lerp(a.p,b.p,(time-a.time)/(b.time-a.time));}
 const final=points.at(-1),years=(time-final.time)/DAY_MS/365.25;
 return add(final.p,scale(outbound,years*3.59)); // NASA: roughly 17 km/s outward
};
const kinematicObjectDefinitions=[
 {name:'Voyager 1',key:'spacecraft',presetId:'voyager-1',kinematicType:'voyager-1',spacecraftType:'voyager-1',mass:721.9/SOLAR_MASS,radius:.00185,spin:24,tilt:35,color:'#d4c49e'},
 {name:'Tesla Roadster / Starman',key:'spacecraft',presetId:'tesla-roadster',kinematicType:'tesla-roadster',spacecraftType:'tesla-roadster',mass:1296/SOLAR_MASS,radius:.0022,spin:24,tilt:1.1,color:'#cc3429'},
 {name:'Międzynarodowa Stacja Kosmiczna (ISS)',key:'spacecraft',presetId:'iss',kinematicType:'iss',spacecraftType:'iss',mass:419725/SOLAR_MASS,radius:.0545,spin:1.55,tilt:51.6,color:'#e5e7e7'},
 {name:'ʻOumuamua',key:'interstellar',presetId:'oumuamua',kinematicType:'oumuamua',mass:5e8/SOLAR_MASS,radius:.1,spin:7.34,tilt:122,color:'#4a3728',irregular:true,cometProfile:'oumuamua'},
 {name:'67P/Churyumov–Gerasimenko',key:'comet',presetId:'67p',kinematicType:'67p',mass:9.982e12/SOLAR_MASS,radius:1.65,spin:12.4,tilt:7,color:'#51483f',cometProfile:'67p'},
 {name:'C/1995 O1 (Hale-Bopp)',key:'comet',presetId:'hale-bopp',kinematicType:'hale-bopp',mass:1e15/SOLAR_MASS,radius:30,spin:11,tilt:89,color:'#655044',cometProfile:'hale-bopp'}
];
const KINEMATIC_BY_TYPE=new Map(kinematicObjectDefinitions.map(item=>[item.kinematicType,item]));
const roadsterOrbit={a:1.324,e:.255,period:556.2,epoch:'2018-02-06T20:45:00Z',phase:.21,inclination:1.1*Math.PI/180,node:100*Math.PI/180};
const comet67pOrbit={a:3.463,e:.641,period:6.44*365.25,epoch:'2015-08-13T00:00:00Z',phase:0,inclination:7.04*Math.PI/180,node:50.2*Math.PI/180};
const haleBoppOrbit={a:186,e:.995,period:2534*365.25,epoch:'1997-04-01T00:00:00Z',phase:0,inclination:89.4*Math.PI/180,node:282.5*Math.PI/180};
const oumuamuaDirection=[.334,.144,-.932];
function kinematicState(type,date,bodies){
 const sun=bodies.find(item=>item.key==='sun'),earth=bodies.find(item=>item.key==='earth');
 const sunP=sun?.p||[0,0,0],sunV=sun?.v||[0,0,0];
 if(type==='iss'&&earth){
  const altitudeAU=(earth.radius+420)/AU,period=.0639,angle=dayOffset(date,'1998-11-20T00:00:00Z')*Math.PI*2/period;
  const inclination=51.6*Math.PI/180,offset=[Math.cos(angle)*altitudeAU,Math.sin(angle)*Math.sin(inclination)*altitudeAU,Math.sin(angle)*Math.cos(inclination)*altitudeAU];
  const velocity=[-Math.sin(angle)*altitudeAU*Math.PI*2/period,Math.cos(angle)*Math.sin(inclination)*altitudeAU*Math.PI*2/period,Math.cos(angle)*Math.cos(inclination)*altitudeAU*Math.PI*2/period];
  return {p:add(earth.p,offset),v:add(earth.v,velocity),parent:earth.id};
 }
 if(type==='voyager-1'){
  const p=add(sunP,voyagerPoint(date)),later=new Date(date.getTime()+DAY_MS);
  return {p,v:add(sunV,difference(voyagerPoint(later),voyagerPoint(date)))};
 }
 if(type==='tesla-roadster'){const state=numericalState(roadsterOrbit,date);return {p:add(sunP,state.p),v:add(sunV,state.v)};}
 if(type==='67p'){const state=numericalState(comet67pOrbit,date);return {p:add(sunP,state.p),v:add(sunV,state.v)};}
 if(type==='hale-bopp'){const state=numericalState(haleBoppOrbit,date);return {p:add(sunP,state.p),v:add(sunV,state.v)};}
 if(type==='oumuamua'){
  const days=dayOffset(date,'2017-09-09T00:00:00Z'),distance=.255+Math.abs(days)*26.33*86400/AU;
  const direction=days>=0?oumuamuaDirection:scale(oumuamuaDirection,-1),speed=26.33*86400/AU*Math.sign(days||1);
  return {p:add(sunP,scale(direction,distance)),v:add(sunV,scale(direction,speed))};
 }
 return {p:[...sunP],v:[...sunV]};
}
export function updateKinematicBodies(bodies,date){
 for(const item of bodies)if(item.kinematic){
  const state=kinematicState(item.kinematicType,date,bodies);
  item.p=state.p;item.v=state.v;
  if(state.parent)item.parent=state.parent;
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
