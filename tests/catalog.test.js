import test from 'node:test';
import assert from 'node:assert/strict';
import {catalog,createCatalogBody,horizonRadius,validDimensions} from '../src/catalog.js';
import {AU,SOLAR_MASS,accelerations} from '../src/physics.js';
import {collisionRadius,resolveCollisions} from '../src/collisions.js';
const spawn=(id,massKg,radiusKm)=>createCatalogBody(id,{massKg,radiusKm,p:[0,0,0],v:[0,0,0]});
test('all presets fit creation and editing limits and retain physical dimensions',()=>{
 for(const p of catalog){const b=spawn(p.id,p.mass*SOLAR_MASS,p.radius);assert.ok(validDimensions(b.mass*SOLAR_MASS,b.radius),p.name);assert.ok(Math.abs(b.mass/p.mass-1)<1e-12);assert.ok(Math.abs(b.radius/p.radius-1)<1e-12);assert.notEqual(b.id,p.id)}
});
test('mass affects gravity and radius affects contact independently',()=>{
 const earth=catalog.find(p=>p.id==='earth');const a=spawn('earth',earth.mass*SOLAR_MASS,earth.radius),b=spawn('earth',earth.mass*SOLAR_MASS*2,earth.radius*3);
 assert.equal(b.mass/a.mass,2);assert.equal(collisionRadius(b)/collisionRadius(a),3);
 const probe=spawn('comet',1e10,1);probe.p=[1,0,0];
 assert.ok(Math.abs(accelerations([b,probe])[1][0]/accelerations([a,probe])[1][0]-2)<1e-10);
});
test('black hole horizon scales with mass and matches collision boundary',()=>{
 assert.ok(Math.abs(horizonRadius(SOLAR_MASS)-2.9533)<.001);
 const b=spawn('m87',6.5e9*SOLAR_MASS,1);assert.ok(b.radius>1e10);assert.equal(b.radius,collisionRadius(b)*AU);
 const small=spawn('comet',1e10,1);small.p=[b.radius/AU*.9,0,0];const bodies=[b,small];assert.equal(resolveCollisions(bodies)[0].kind,'absorb');assert.equal(bodies.length,1);
});
test('invalid physical dimensions are rejected',()=>{
 for(const [m,r] of [[0,1],[-1,1],[Infinity,1],[1,NaN],[1,0],[1,1e15]])assert.throws(()=>spawn('earth',m,r));
});
