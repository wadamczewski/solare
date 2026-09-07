import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url).pathname;
const THREE=await import(root+'node_modules/three/build/three.module.js');
const {initialSystem,AU}=await import(root+'src/physics.js');const {fastStepSize,splitStep}=await import(root+'src/fast-step.js');const {step}=await import(root+'src/physics.js');const {resolveCollisions}=await import(root+'src/collisions.js');const {captureCollisionView,viewContact}=await import(root+'src/collision-view.js');
const bs=initialSystem(),s=fs.readFileSync(root+'src/main.js','utf8');const code=s.slice(s.indexOf('function mapped('),s.indexOf('const sphere='));const {displayed,radius}=new Function('THREE','bs','AU','const lightFlight=null,compressed=true,vector=a=>new THREE.Vector3(...a);'+code+';return {displayed,radius}')(THREE,bs,AU);
test('reset system retains all 32 original bodies through the first ten days in visual scale',()=>{
 const ids=bs.map(b=>b.id);let day=0;
 while(day<10){const previous=captureCollisionView(bs,displayed,radius);const c=fastStepSize(bs),dt=Math.min(c.dt,10-day);if(c.split)splitStep(bs,dt,c.states);else step(bs,dt);day+=dt;const current=captureCollisionView(bs,displayed,radius);const events=resolveCollisions(bs,{contactTest:(a,b)=>viewContact(a,b,current,previous)});assert.equal(events.length,0,`unexpected collision at day ${day}`);}
 assert.equal(bs.length,32);assert.deepEqual(bs.map(b=>b.id),ids);
});
