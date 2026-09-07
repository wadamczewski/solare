import test from 'node:test';import assert from 'node:assert/strict';
import {body,AU,G,step,stableStep} from '../src/physics.js';
import {resolveCollisions,collisionRadius} from '../src/collisions.js';
const mass=bs=>bs.reduce((s,b)=>s+b.mass,0),momentum=bs=>[0,1,2].map(k=>bs.reduce((s,b)=>s+b.mass*b.v[k],0));
function pair(speed=0,grazing=false){const r=6371/AU,m=3e-6;return [body({key:'earth',name:'Ziemia',mass:m,radius:6371,p:[-r,0,0],v:[speed/2,0,0]}),body({key:'mars',name:'Mars',mass:m,radius:6371,p:[r,0,0],v:grazing?[-speed*.05,speed,0]:[-speed/2,0,0]})]}
function conserved(before,after){assert.ok(Math.abs(mass(before)-mass(after))/mass(before)<1e-12);const a=momentum(before),b=momentum(after);a.forEach((x,k)=>assert.ok(Math.abs(x-b[k])<1e-15))}
test('slow collision merges and preserves mass, momentum and volume',()=>{const bs=pair(.0001),old=structuredClone(bs),events=resolveCollisions(bs);assert.equal(events[0].kind,'merge');assert.equal(bs.length,1);conserved(old,bs);assert.ok(Math.abs(bs[0].radius**3-2*6371**3)<.001)});
test('energetic impact generates massive ejecta with conserved momentum',()=>{const bs=pair(.025),old=structuredClone(bs),events=resolveCollisions(bs);assert.equal(events[0].kind,'disrupt');assert.equal(events[0].added.length,6);conserved(old,bs);for(const b of bs)assert.ok([...b.p,...b.v].every(Number.isFinite));assert.equal(resolveCollisions(bs).length,0)});
test('grazing rocky collision separates bodies without elastic bounce',()=>{const bs=pair(.009,true),old=structuredClone(bs),events=resolveCollisions(bs);assert.equal(events[0].kind,'graze');assert.equal(bs.length,2);conserved(old,bs);assert.ok(bs[1].p[0]-bs[0].p[0]>2*6371/AU);assert.equal(resolveCollisions(bs).length,0)});
test('even a lighter black hole remains the absorber and grows its horizon',()=>{const black=body({key:'blackhole',mass:1e-6,radius:1}),planet=body({key:'earth',mass:3e-6,radius:6371}),bs=[planet,black];const old=structuredClone(bs),e=resolveCollisions(bs);assert.equal(e[0].kind,'absorb');assert.equal(bs[0].id,black.id);assert.equal(bs[0].radius,collisionRadius(bs[0])*AU);conserved(old,bs)});
test('gas giant accretes without creating rocky fragments',()=>{const bs=pair(.04);bs[0].key='jupiter';assert.equal(resolveCollisions(bs)[0].kind,'accrete');assert.equal(bs.length,1)});
test('body limit retains unresolved ejecta mass in remnant',()=>{const bs=pair(.03),old=structuredClone(bs);resolveCollisions(bs,{maxBodies:2});assert.ok(bs.length<=2);conserved(old,bs)});
test('a swallowed parent transfers its satellites without a cycle',()=>{const bs=pair();bs[0].mass=1e-6;const child=body({mass:1e-15,radius:1,p:[1,0,0],parent:bs[0].id});bs.push(child);const e=resolveCollisions(bs);assert.equal(child.parent,e[0].survivor);assert.notEqual(bs[0].parent,bs[0].id)});
test('fast approach is detected during adaptive integration',()=>{const bs=pair(.1);bs[0].p[0]*=3;bs[1].p[0]*=3;let found=false;for(let i=0;i<1000;i++){const events=resolveCollisions(bs);if(events.length){found=true;break}step(bs,stableStep(bs))}assert.ok(found)});
test('coincident spawn resolves before singular gravitational integration',()=>{const bs=pair(.03);bs[1].p=[...bs[0].p];resolveCollisions(bs);step(bs,stableStep(bs));assert.ok(bs.every(b=>[...b.p,...b.v].every(Number.isFinite)))});

test('fragment impacts do not recursively multiply debris',()=>{
 const a=body({key:'fragment',mass:1e-10,radius:100,p:[0,0,0],v:[1,0,0]}),b=body({key:'fragment',mass:1e-10,radius:100,p:[0,0,0],v:[-1,0,0]});
 const bs=[a,b],events=resolveCollisions(bs);assert.equal(events[0].added.length,0);assert.equal(bs.length,1);assert.equal(bs[0].mass,2e-10);
});
