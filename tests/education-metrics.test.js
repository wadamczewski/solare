import test from 'node:test';
import assert from 'node:assert/strict';
import {educationMetrics} from '../src/education-metrics.js';

const sun={mass:1,radius:695700,p:[0,0,0],v:[0,0,0]};
const earth={mass:3.0035e-6,radius:6371,p:[1,0,0],v:[0,.017202,0]};

test('educational metrics give Earth an approximately 29.8 km/s orbital speed',()=>{
 const metrics=educationMetrics(earth,sun);
 assert.ok(Math.abs(metrics.speed-29.8)<.2);
 assert.ok(metrics.acceleration>.005&&metrics.acceleration<.007);
 assert.ok(metrics.hillRadiusKm>1.3e6&&metrics.hillRadiusKm<1.7e6);
});

test('root body exposes only its directly meaningful kinematics',()=>{
 const metrics=educationMetrics(sun,null);
 assert.equal(metrics.hillRadiusKm,null);
 assert.equal(metrics.rocheLimitKm,null);
});
