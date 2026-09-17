import test from 'node:test';
import assert from 'node:assert/strict';
import {nearestMarkerId} from '../src/marker-hit.js';

test('a pointer inside a marker whose own radius is smaller than the minimum still hits it',()=>{
 const candidates=[{id:'tiny',x:100,y:100,radius:1}];
 assert.equal(nearestMarkerId({x:110,y:100},candidates,16),'tiny');
 assert.equal(nearestMarkerId({x:200,y:100},candidates,16),null);
});

test('a marker larger than the minimum keeps its own, more generous radius',()=>{
 const candidates=[{id:'big',x:0,y:0,radius:40}];
 assert.equal(nearestMarkerId({x:35,y:0},candidates,16),'big');
 assert.equal(nearestMarkerId({x:55,y:0},candidates,16),null);
});

test('the nearest of several overlapping markers wins, not the first or largest',()=>{
 const candidates=[
  {id:'far',x:0,y:0,radius:30},
  {id:'near',x:10,y:0,radius:5},
 ];
 assert.equal(nearestMarkerId({x:9,y:0},candidates,16),'near');
});

test('a pointer outside every marker misses entirely',()=>{
 const candidates=[{id:'a',x:0,y:0,radius:10},{id:'b',x:500,y:500,radius:10}];
 assert.equal(nearestMarkerId({x:250,y:250},candidates,16),null);
});

test('an empty candidate list never matches',()=>{
 assert.equal(nearestMarkerId({x:0,y:0},[],16),null);
});
