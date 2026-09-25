import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSystem} from '../src/physics.js';
import {educationPrimary,movingBodiesInView,screenLength} from '../src/education-vectors.js';

const bs=initialSystem(new Date('2026-09-25T00:00:00Z'));
const named=name=>bs.find(body=>body.name===name);

test('every moving body in view gets vectors, not just the selected one',()=>{
 const all=movingBodiesInView(bs,()=>true);
 // Everything but the Sun: 8 planets and 38 moons.
 assert.equal(all.length,bs.length-1);
 assert.ok(!all.some(item=>item.body.key==='sun'),'the dominant star\'s barycentric drift gets no arrow');
 const inView=new Set(['Saturn','Tytan','Mimas']);
 assert.deepEqual(movingBodiesInView(bs,body=>inView.has(body.name)).map(item=>item.body.name).sort(),[...inView].sort());
});

test('each body is measured against its own primary',()=>{
 assert.equal(educationPrimary(named('Tytan'),bs),named('Saturn'));
 assert.equal(educationPrimary(named('Ziemia'),bs),named('Słońce'));
 assert.equal(educationPrimary(named('Słońce'),bs),null);
 // Two comparable stars measure each other.
 const a={id:1,mass:1,p:[0,0,0],v:[0,0,0]},b={id:2,mass:.8,p:[1,0,0],v:[0,.01,0]};
 assert.equal(educationPrimary(a,[a,b]),b);assert.equal(educationPrimary(b,[a,b]),a);
 const titan=movingBodiesInView(bs,body=>body.name==='Tytan')[0];
 assert.ok(Math.abs(titan.metrics.speed-5.57)<.3,`Titan orbits Saturn at ${titan.metrics.speed} km/s`);
});

test('a body at rest relative to its primary is left out',()=>{
 const sun={id:1,mass:1,p:[0,0,0],v:[0,0,0]},still={id:2,mass:1e-6,p:[1,0,0],v:[0,0,0]};
 assert.deepEqual(movingBodiesInView([sun,still],()=>true),[]);
});

test('arrows are sized on screen but always clear their body',()=>{
 const near=screenLength(40,10,43,800),far=screenLength(40,100,43,800);
 assert.ok(Math.abs(far/near-10)<1e-9,'the same on-screen length at any distance');
 assert.equal(screenLength(40,10,43,800,5),5,'never shorter than the minimum');
});
