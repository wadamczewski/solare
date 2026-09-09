import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLAR_RADIUS_KM,applyCentralStarPreset,blackbodyColor,centralStars,starPreset,visualLuminosity} from '../src/central-stars.js';

test('central star catalogue contains five known replacement stars with physical observables',()=>{
 const replacements=centralStars.filter(star=>star.id!=='sun');
 assert.equal(replacements.length,5);
 for(const star of replacements){
  for(const key of ['mass','radius','luminosity','temperature','colorTemperature'])assert.ok(Number.isFinite(star[key])&&star[key]>0,`${star.name}: ${key}`);
  assert.match(star.source,/^https:/);
 }
 assert.equal(starPreset('r136a1').galaxy,'Wielki Obłok Magellana');
 assert.equal(starPreset('woh-g64').radius,1540*SOLAR_RADIUS_KM);
});

test('black-body colour shifts blueward with a hot photosphere',()=>{
 assert.notEqual(blackbodyColor(3400),blackbodyColor(53000));
 assert.ok(visualLuminosity(8.7e6)>visualLuminosity(1));
});

test('replacing the central star preserves positions and rescales heliocentric velocity',()=>{
 const sun={key:'sun',mass:1,p:[0,0,0],v:[.02,0,0]},planet={p:[1,0,0],v:[.03,.02,0]};
 applyCentralStarPreset(sun,starPreset('sirius-a'),[sun,planet]);
 assert.equal(sun.mass,2.02);
 assert.deepEqual(planet.p,[1,0,0]);
 assert.ok(Math.abs(planet.v[0]-(.02+.01*Math.sqrt(2.02)))<1e-12);
 assert.ok(Math.abs(planet.v[1]-.02*Math.sqrt(2.02))<1e-12);
});
