import test from 'node:test';
import assert from 'node:assert/strict';
import {equirectangularSurfaceBasis,localSurfacePoint} from '../src/surface-texture-frame.js';

const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const near = (value,target,epsilon=1e-9) => Math.abs(value-target)<epsilon;

test('an equirectangular map places Greenwich and east on the matching body axes', () => {
 const frame={prime:[1,0,0],pole:[0,1,0],quarter:[0,0,-1]};
 const basis=equirectangularSurfaceBasis(frame);
 // U=.5 is the middle of the geographic texture: Greenwich at local +X.
 assert.deepEqual(basis.x,frame.prime);
 // U=.75 is 90° east: local -Z must point along the horizon quarter axis.
 assert.deepEqual(basis.z,[0,0,1]);
 assert.deepEqual(cross(basis.x,basis.y),basis.z);
});

test('localSurfacePoint agrees with the basis calibration at Greenwich, 90 east and the poles', () => {
 const greenwich=localSurfacePoint(0,0);
 assert.ok(near(greenwich[0],1)&&near(greenwich[1],0)&&near(greenwich[2],0));
 const ninetyEast=localSurfacePoint(0,90);
 assert.ok(near(ninetyEast[0],0)&&near(ninetyEast[1],0)&&near(ninetyEast[2],-1));
 const north=localSurfacePoint(90,137);
 assert.ok(near(north[0],0)&&near(north[1],1)&&near(north[2],0));
 const south=localSurfacePoint(-90,-52);
 assert.ok(near(south[0],0)&&near(south[1],-1)&&near(south[2],0));
});

test('localSurfacePoint always lands on the unit sphere', () => {
 for (const [lat,lon] of [[12,34],[-67,190],[45,-133.8],[0,180],[-19.2,133.4]]) {
  const [x,y,z]=localSurfacePoint(lat,lon);
  assert.ok(near(Math.hypot(x,y,z),1,1e-9),`(${lat},${lon}) landed at radius ${Math.hypot(x,y,z)}`);
 }
});
