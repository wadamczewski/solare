import test from 'node:test';
import assert from 'node:assert/strict';
import {equirectangularSurfaceBasis} from '../src/surface-texture-frame.js';

const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

test('an equirectangular map places Greenwich and east on the matching body axes', () => {
 const frame={prime:[1,0,0],pole:[0,1,0],quarter:[0,0,-1]};
 const basis=equirectangularSurfaceBasis(frame);
 // U=.5 is the middle of the geographic texture: Greenwich at local +X.
 assert.deepEqual(basis.x,frame.prime);
 // U=.75 is 90° east: local -Z must point along the horizon quarter axis.
 assert.deepEqual(basis.z,[0,0,1]);
 assert.deepEqual(cross(basis.x,basis.y),basis.z);
});
