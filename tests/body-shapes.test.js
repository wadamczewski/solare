import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSystem,moons,planets} from '../src/physics.js';
import {bodyAxes,hasMeasuredIrregularShape,largestAxis,measuredIrregularGeometry,shapeSources} from '../src/body-shapes.js';

test('every rendered planet and included moon has a finite volume-preserving shape profile',()=>{
 const bodies=initialSystem(),included=[...planets.map(([name,key])=>({name,key})),...moons.map(([name])=>({name,key:'moon'}))];
 assert.ok(shapeSources.every(source=>source.startsWith('https://')));
 for(const body of included){
  const axes=bodyAxes(body);
  assert.equal(axes.length,3,body.name);
  assert.ok(axes.every(value=>Number.isFinite(value)&&value>0),body.name);
  assert.ok(Math.abs(axes[0]*axes[1]*axes[2]-1)<1e-10,body.name);
  assert.ok(bodies.some(candidate=>candidate.name===body.name),body.name);
 }
});

test('Deimos uses its measured rounded triaxial envelope instead of the generic faceted rock',()=>{
 const deimos=initialSystem().find(body=>body.name==='Deimos'),axes=bodyAxes(deimos),geometry=measuredIrregularGeometry(deimos);
 assert.ok(hasMeasuredIrregularShape(deimos));
 assert.ok(axes[0]>1.18&&axes[2]<.85,`unexpected Deimos axes ${axes}`);
 assert.ok(largestAxis(deimos)<1.25);
 assert.ok(geometry?.attributes.position.count>1000);
 geometry.dispose();
});

test('Nereid remains an unresolved near-sphere rather than receiving invented roughness',()=>{
 const nereid=initialSystem().find(body=>body.name==='Nereida');
 assert.equal(nereid.irregular,false);
 assert.equal(hasMeasuredIrregularShape(nereid),false);
 assert.deepEqual(bodyAxes(nereid),[1,1,1]);
});
