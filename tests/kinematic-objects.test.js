import test from 'node:test';
import assert from 'node:assert/strict';
import {AU,OBSERVATION_WINDOWS,VIKING_1_EVENTS,accelerations,advanceByEphemeris,initialSystem,isObserved,stableStep,step,updateKinematicBodies} from '../src/physics.js';
import {planetState} from '../src/ephemeris.js';

const at=value=>new Date(value);
test('the default Solar System includes the requested observed spacecraft and small bodies',()=>{
 const bodies=initialSystem(at('2026-09-28T00:00:00Z'));
 for(const type of ['voyager-1','new-horizons','viking-1','tesla-roadster','iss','oumuamua','67p','hale-bopp','ceres','pluto','haumea','makemake','eris'])
  assert.ok(bodies.some(body=>body.kinematicType===type),`missing ${type}`);
 assert.deepEqual(bodies.filter(body=>body.dwarfPlanet).map(body=>body.kinematicType).sort(),['ceres','eris','haumea','makemake','pluto']);
 assert.ok(bodies.filter(body=>body.kinematic).every(body=>body.mass>0&&body.radius>0));
});

test('kinematic objects do not add gravity or reduce the system integration step',()=>{
 const bodies=initialSystem(at('2026-09-28T00:00:00Z'));
 const physical=bodies.filter(body=>!body.kinematic);
 const withKinematic=accelerations(bodies).filter((_,index)=>!bodies[index].kinematic);
 const without=accelerations(physical);
 assert.deepEqual(withKinematic,without);
 assert.equal(stableStep(bodies),stableStep(physical));
 step(bodies,.02);updateKinematicBodies(bodies,at('2026-09-28T00:28:48Z'));
 assert.ok(bodies.every(body=>[...body.p,...body.v].every(Number.isFinite)));
});

const distanceTo=(bodies,type,other)=>{const a=bodies.find(body=>body.kinematicType===type),b=bodies.find(body=>body.key===other||body.kinematicType===other);return Math.hypot(...a.p.map((value,index)=>value-b.p[index]))};

test('Voyager 1 follows its recorded JPL Horizons trajectory',()=>{
 // Horizons (-31): 2012-08-25 ~121.6 AU, 2026 ~172 AU from the Sun.
 const bodies=initialSystem(at('1977-09-06T00:00:00Z'));
 updateKinematicBodies(bodies,at('2012-08-25T00:00:00Z'));assert.ok(Math.abs(distanceTo(bodies,'voyager-1','sun')-121.6)<.5);
 updateKinematicBodies(bodies,at('2026-09-28T00:00:00Z'));assert.ok(Math.abs(distanceTo(bodies,'voyager-1','sun')-171.5)<1.5);
 const voyager=bodies.find(body=>body.kinematicType==='voyager-1');
 assert.ok(Math.hypot(...voyager.v)*AU/86400>16&&Math.hypot(...voyager.v)*AU/86400<18,'about 17 km/s outward');
 // Heading north of the ecliptic (scene +y), as the real probe does.
 const sun=bodies.find(body=>body.key==='sun');assert.ok(voyager.p[1]-sun.p[1]>90);
});

test('flybys pass at the recorded distance from the planet as drawn',()=>{
 const jupiter=initialSystem(at('1979-03-05T12:05:00Z'));
 assert.ok(Math.abs(distanceTo(jupiter,'voyager-1','jupiter')*AU-348900)<3000,'Voyager 1 at Jupiter');
 const saturn=initialSystem(at('1980-11-12T23:46:00Z'));
 assert.ok(Math.abs(distanceTo(saturn,'voyager-1','saturn')*AU-184300)<6000,'Voyager 1 at Saturn');
 const pluto=initialSystem(at('2015-07-14T11:49:57Z'));
 assert.ok(Math.abs(distanceTo(pluto,'new-horizons','pluto')*AU-13690)<500,'New Horizons at Pluto');
});

test('Viking 1 flies a transfer that ends at Mars on the arrival date',()=>{
 const bodies=initialSystem(at(new Date(VIKING_1_EVENTS.orbitInsertion+3600000).toISOString()));
 assert.ok(distanceTo(bodies,'viking-1','mars')*AU<40000,'in orbit round Mars');
 const cruise=initialSystem(at('1976-01-01T00:00:00Z'));
 const fromSun=distanceTo(cruise,'viking-1','sun');assert.ok(fromSun>1.05&&fromSun<1.6,`between Earth and Mars (${fromSun})`);
});

test('recorded objects exist on the map only while they were observed',()=>{
 assert.equal(isObserved('oumuamua',at('2017-09-09T00:00:00Z')),false,'perihelion came before anyone saw it');
 assert.equal(isObserved('oumuamua',at('2017-11-01T00:00:00Z')),true);
 assert.equal(isObserved('oumuamua',at('2026-09-28T00:00:00Z')),false);
 assert.equal(isObserved('hale-bopp',at('1997-04-01T00:00:00Z')),true);
 assert.equal(isObserved('hale-bopp',at('2026-09-28T00:00:00Z')),false,'last observed 2022-07-09');
 assert.equal(isObserved('tesla-roadster',at('2018-03-01T00:00:00Z')),true);
 assert.equal(isObserved('tesla-roadster',at('2020-10-07T00:00:00Z')),false,'no observations after 2018-03-19');
 assert.equal(isObserved('voyager-1',at('1977-01-01T00:00:00Z')),false);
 assert.equal(isObserved('voyager-1',at('2026-09-28T00:00:00Z')),true);
 const now=initialSystem(at('2026-09-28T00:00:00Z')),shown=type=>now.find(body=>body.kinematicType===type).observed;
 assert.deepEqual(['voyager-1','new-horizons','iss','oumuamua','67p','hale-bopp','tesla-roadster','viking-1'].map(shown),[true,true,true,false,false,false,false,false]);
 for(const span of Object.values(OBSERVATION_WINDOWS))assert.ok(span.end==null||span.end>span.start);
});

test('ʻOumuamua and Hale-Bopp stand where JPL puts them',()=>{
 const oumuamua=initialSystem(at('2017-10-19T00:00:00Z'));
 assert.ok(Math.abs(distanceTo(oumuamua,'oumuamua','sun')-1.22)<.02,'discovery, about 1.22 AU from the Sun');
 const haleBopp=initialSystem(at('1997-04-01T00:00:00Z'));
 assert.ok(Math.abs(distanceTo(haleBopp,'hale-bopp','sun')-.914)<.003,'perihelion 0.914 AU');
});

test('historic playback advances planets by the ephemeris without integrating',()=>{
 const bodies=initialSystem(at('1979-01-01T00:00:00Z')),sun=bodies.find(body=>body.key==='sun');
 advanceByEphemeris(bodies,at('1979-01-01T00:00:00Z'),at('1990-01-01T00:00:00Z'));
 const jupiter=bodies.find(body=>body.key==='jupiter'),expected=planetState('jupiter',at('1990-01-01T00:00:00Z')).p;
 const drawn=jupiter.p.map((value,index)=>value-sun.p[index]);
 assert.ok(Math.hypot(drawn[0]-expected[0],drawn[1]-expected[2],drawn[2]+expected[1])<1e-9);
 const io=bodies.find(body=>body.name==='Io');
 assert.ok(Math.abs(Math.hypot(...io.p.map((value,index)=>value-jupiter.p[index]))*AU-421800)<8000,'Io still on its orbit');
});

test('ISS remains close to Earth on a 51.6-degree low orbit',()=>{
 const bodies=initialSystem(at('2026-09-28T00:00:00Z'));
 const iss=bodies.find(body=>body.kinematicType==='iss'),earth=bodies.find(body=>body.key==='earth');
 const offset=iss.p.map((value,index)=>value-earth.p[index]),distance=Math.hypot(...offset)*AU;
 assert.ok(distance>earth.radius+350&&distance<earth.radius+500);
 assert.ok(Math.abs(iss.tilt-51.6)<.001);
});
