import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceTemperatures} from '../src/solar-thermal.js';

const sun={id:1,key:'sun',p:[0,0,0]},earth={id:2,key:'earth',a:1,p:[1,0,0]};

test('Earth day and night profiles use the observed global skin-temperature climatology',()=>{
 const temperature=surfaceTemperatures(earth,[sun,earth],100);
 assert.ok(Math.abs(temperature.litC-17.57)<.01);
 assert.ok(Math.abs(temperature.darkC-12.93)<.01);
 assert.ok(temperature.litC>temperature.darkC);
});

test('increasing solar brightness heats both sides by their thermal response',()=>{
 const nominal=surfaceTemperatures(earth,[sun,earth],100);
 const brighter=surfaceTemperatures(earth,[sun,earth],400);
 assert.ok(brighter.litC>nominal.litC);
 assert.ok(brighter.darkC>nominal.darkC);
 assert.ok(Math.abs((brighter.litC+273.15)/(nominal.litC+273.15)-Math.SQRT2)<1e-10);
});

test('editing a star radius changes irradiance by its emitting area',()=>{
 const nominal=surfaceTemperatures(earth,[sun,earth],100);
 const enlargedSun={...sun,radius:695700*100,luminosity:1,starPresetId:'sun'};
 const enlarged=surfaceTemperatures(earth,[enlargedSun,earth],100);
 assert.equal(enlarged.irradiance/nominal.irradiance,10_000);
 assert.ok(Math.abs((enlarged.litC+273.15)/(nominal.litC+273.15)-10)<1e-10);
 assert.ok(enlarged.darkC>nominal.darkC);
});

test('moving a body farther from the Sun lowers its temperature',()=>{
 const far={...earth,p:[2,0,0]};
 assert.ok(surfaceTemperatures(far,[sun,far],100).litC<surfaceTemperatures(earth,[sun,earth],100).litC);
});
