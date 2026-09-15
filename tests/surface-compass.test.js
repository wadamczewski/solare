import test from 'node:test';
import assert from 'node:assert/strict';
import {compassPoint,relativeBearing} from '../src/surface-compass.js';

test('compass keeps north at the top of a north-facing view',()=>{
 const point=compassPoint(0,0,60);
 assert.equal(point.x,0);
 assert.equal(point.y,-60);
});

test('compass rotates celestial bearings opposite the observer heading',()=>{
 const east=compassPoint(90,0,60),northAfterTurn=compassPoint(0,90,60);
 assert.equal(east.x,60);
 assert.ok(Math.abs(east.y)<1e-9);
 assert.equal(Math.round(northAfterTurn.x),-60);
 assert.ok(Math.abs(northAfterTurn.y)<1e-9);
 assert.equal(relativeBearing(1,359),2);
});
