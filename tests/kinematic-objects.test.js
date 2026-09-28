import test from 'node:test';
import assert from 'node:assert/strict';
import {AU,VOYAGER_MILESTONES,accelerations,initialSystem,stableStep,step,updateKinematicBodies} from '../src/physics.js';

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

test('Voyager follows its dated outward milestones and continues away from the Sun',()=>{
 const bodies=initialSystem(at(VOYAGER_MILESTONES[0].time));
 const voyager=bodies.find(body=>body.kinematicType==='voyager-1'),sun=bodies.find(body=>body.key==='sun');
 const distance=()=>Math.hypot(...voyager.p.map((value,index)=>value-sun.p[index]));
 updateKinematicBodies(bodies,at('2006-08-16T00:00:00Z'));assert.ok(Math.abs(distance()-100)<.25);
 updateKinematicBodies(bodies,at('2012-08-25T00:00:00Z'));assert.ok(Math.abs(distance()-122)<.25);
 updateKinematicBodies(bodies,at('2026-08-25T00:00:00Z'));assert.ok(distance()>170);
 assert.ok(Math.hypot(...voyager.v)*AU/86400>15);
});

test('ISS remains close to Earth on a 51.6-degree low orbit',()=>{
 const bodies=initialSystem(at('2026-09-28T00:00:00Z'));
 const iss=bodies.find(body=>body.kinematicType==='iss'),earth=bodies.find(body=>body.key==='earth');
 const offset=iss.p.map((value,index)=>value-earth.p[index]),distance=Math.hypot(...offset)*AU;
 assert.ok(distance>earth.radius+350&&distance<earth.radius+500);
 assert.ok(Math.abs(iss.tilt-51.6)<.001);
});
