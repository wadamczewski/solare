import test from 'node:test';
import assert from 'node:assert/strict';
import {followDistance} from '../src/scene-scale.js';

test('follow frames a small moon instead of leaving it below a pixel',()=>{
 assert.equal(followDistance(.03,true),.3,'large moons keep the old framing');
 assert.ok(Math.abs(followDistance(.7,true)-2.1)<1e-12,'planets keep radius × 3');
 const phobos=.00093,distance=followDistance(phobos,true)*Math.hypot(0,2,4),pixels=phobos*800/(2*distance*Math.tan(43*Math.PI/360));
 assert.ok(pixels>12&&pixels<40,`Phobos is drawn about twenty pixels wide (${pixels.toFixed(1)})`);
 assert.equal(followDistance(1e-9,false),.00001,'true scale keeps its floor');
});
