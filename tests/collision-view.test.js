import test from 'node:test';
import assert from 'node:assert/strict';
import {body} from '../src/physics.js';
import {resolveCollisions} from '../src/collisions.js';
import {viewContact} from '../src/collision-view.js';
const pair=()=>[body({p:[0,0,0],mass:1e-6,radius:100}),body({p:[1,0,0],mass:1e-6,radius:100})];
const snapshot=(a,b,x,r=.6)=>new Map([[a.id,{p:[0,0,0],r}],[b.id,{p:[x,0,0],r}]]);
test('visual contact merges visibly touching bodies despite separated physical surfaces',()=>{
 const bs=pair(),[a,b]=bs,current=snapshot(a,b,1);assert.equal(resolveCollisions(bs).length,0);
 assert.equal(resolveCollisions(bs,{contactTest:(x,y)=>viewContact(x,y,current)}).length,1);assert.equal(bs.length,1);
});
test('separated visible spheres do not collide',()=>{const [a,b]=pair();assert.equal(viewContact(a,b,snapshot(a,b,2)),false)});
test('swept test catches fast crossing between integration samples',()=>{const [a,b]=pair();assert.equal(viewContact(a,b,snapshot(a,b,3),snapshot(a,b,-3)),true)});
test('swept test rejects near miss and ignores bodies absent from previous sample',()=>{
 const [a,b]=pair(),before=snapshot(a,b,-3),after=snapshot(a,b,3);before.get(b.id).p[1]=2;after.get(b.id).p[1]=2;
 assert.equal(viewContact(a,b,after,before),false);assert.equal(viewContact(a,b,after,new Map()),false);
});
