import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSystem,MOON_ORBITS,moons,planets,AU} from '../src/physics.js';
import {spinAxis,iauSpinPole,poleAzimuth,satelliteState} from '../src/planet-poles.js';

const DEG=180/Math.PI,EPOCH=new Date('2026-09-25T00:00:00Z');
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=v=>{const l=Math.hypot(...v);return v.map(x=>x/l)};
const angle=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.reduce((s,x,i)=>s+x*b[i],0))))*DEG;
const bs=initialSystem(EPOCH);
const relative=moon=>{const host=bs.find(b=>b.id===moon.parent);return {host,r:moon.p.map((x,k)=>x-host.p[k]),v:moon.v.map((x,k)=>x-host.v[k])}};
const orbitNormal=moon=>{const {r,v}=relative(moon);return unit(cross(r,v))};

test('every moon except Earth\'s has tabulated orbital elements',()=>{
 for(const [name,parent] of moons)if(parent!=='earth')assert.ok(MOON_ORBITS[name],`${name} needs an inclination and eccentricity`);
});

test('regular moons orbit in their planet\'s equator, in the direction the planet spins',()=>{
 // This is the bug the elements fix: every regular moon used to go round
 // clockwise seen from the ecliptic north, in one plane per planet that did
 // not contain the planet's own rings.
 for(const moon of bs.filter(b=>b.key==='moon'&&b.name!=='Księżyc')){
  const orbit=MOON_ORBITS[moon.name];if(orbit.reference==='ecliptic'||orbit.laplace)continue;
  const {host}=relative(moon),tilt=angle(orbitNormal(moon),spinAxis(host));
  assert.ok(Math.abs(tilt-orbit.i)<.05,`${moon.name}: ${tilt.toFixed(3)}° to ${host.name}'s equator, expected ${orbit.i}°`);
 }
});

test('Triton is retrograde, Uranus\'s moons follow its tipped-over equator, Earth\'s Moon stays near the ecliptic',()=>{
 const byName=name=>bs.find(b=>b.name===name);
 assert.ok(angle(orbitNormal(byName('Tryton')),spinAxis(byName('Neptun')))>150,'Triton goes round against Neptune\'s spin');
 for(const name of ['Miranda','Ariel','Umbriel','Tytania','Oberon'])assert.ok(angle(orbitNormal(byName(name)),[0,1,0])>90,`${name} orbits with Uranus's 98° tilt`);
 const moonTilt=angle(orbitNormal(byName('Księżyc')),[0,1,0]);
 assert.ok(Math.abs(moonTilt-5.145)<.3,`the Moon is ${moonTilt}° from the ecliptic`);
 const iapetus=byName('Japet'),saturn=byName('Saturn');
 assert.ok(Math.abs(angle(orbitNormal(iapetus),spinAxis(saturn))-15.47)<1.5,'Iapetus sits about 15.5° from Saturn\'s equator');
 assert.ok(Math.abs(angle(orbitNormal(iapetus),[0,1,0])-17.28)<1.5,'and about 17.3° from the ecliptic');
});

test('prograde regular moons of every planet but Uranus now circle counter-clockwise seen from ecliptic north',()=>{
 for(const moon of bs.filter(b=>b.key==='moon'&&!['Tryton','Nereida'].includes(b.name))){
  if(relative(moon).host.key==='uranus')continue;
  assert.ok(orbitNormal(moon)[1]>0,`${moon.name} orbits the wrong way round`);
 }
});

test('an eccentric orbit keeps its real extremes: Nereid ranges from 1.4 to 9.6 million km',()=>{
 const state=satelliteState({mu:1,a:5513400/AU,e:.7507,phaseRad:0});
 const pericentre=Math.hypot(...state.p)*AU;
 assert.ok(Math.abs(pericentre/(5513400*(1-.7507))-1)<1e-9);
 const apo=Math.hypot(...satelliteState({mu:1,a:5513400/AU,e:.7507,phaseRad:Math.PI}).p)*AU;
 assert.ok(Math.abs(apo/(5513400*(1+.7507))-1)<1e-9);
 const nereid=bs.find(b=>b.name==='Nereida'),r=Math.hypot(...relative(nereid).r)*AU;
 assert.ok(r>=5513400*(1-.7507)*.999&&r<=5513400*(1+.7507)*1.001,`Nereid at ${r} km`);
});

test('planet spin axes keep their tilt and point where the IAU pole points',()=>{
 for(const [,key,,,inclination,,,,tilt] of planets){
  const planet=bs.find(b=>b.key===key),axis=spinAxis(planet);
  assert.ok(Math.abs(angle(axis,[0,1,0])-tilt)<1e-6,`${key} tilt`);
  const pole=iauSpinPole(key,EPOCH);
  assert.ok(Math.abs(poleAzimuth(axis)-poleAzimuth(pole))<1e-9,`${key} axis azimuth follows the IAU pole`);
  // The tabulated tilt is the obliquity to the planet's own orbit, so it
  // differs from the pole's angle to the ecliptic by at most the orbit's
  // own inclination to the ecliptic (Mercury's 7° is the largest).
  assert.ok(angle(axis,pole)<inclination+1.5,`${key}: axis ${angle(axis,pole).toFixed(2)}° from the IAU pole`);
 }
});

test('a body with no pole direction keeps the old convention, tilted towards -X',()=>{
 const axis=spinAxis({tilt:30});
 assert.ok(Math.abs(axis[0]+Math.sin(30/DEG))<1e-12&&Math.abs(axis[1]-Math.cos(30/DEG))<1e-12&&Math.abs(axis[2])<1e-12);
});
