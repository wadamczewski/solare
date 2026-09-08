import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceTemperatures} from '../src/solar-thermal.js';

const sun={id:1,key:'sun',p:[0,0,0]},earth={id:2,key:'earth',a:1,p:[1,0,0]};

test('surface temperatures use distinct lit and dark profiles at nominal solar output',()=>{
 const temperature=surfaceTemperatures(earth,[sun,earth],100);
 assert.ok(temperature.litC>0);
 assert.ok(temperature.darkC<0);
 assert.ok(temperature.litC>temperature.darkC);
});

test('increasing solar brightness heats both sides by their thermal response',()=>{
 const nominal=surfaceTemperatures(earth,[sun,earth],100);
 const brighter=surfaceTemperatures(earth,[sun,earth],400);
 assert.ok(brighter.litC>nominal.litC);
 assert.ok(brighter.darkC>nominal.darkC);
 assert.ok(Math.abs((brighter.litC+273.15)/(nominal.litC+273.15)-Math.SQRT2)<1e-10);
});

test('moving a body farther from the Sun lowers its temperature',()=>{
 const far={...earth,p:[2,0,0]};
 assert.ok(surfaceTemperatures(far,[sun,far],100).litC<surfaceTemperatures(earth,[sun,earth],100).litC);
});
