import test from 'node:test';
import assert from 'node:assert/strict';
import {moveSurfaceCoordinates} from '../src/surface-navigation.js';

const earth={latitude:0,longitude:0,radiusKm:6371,distanceKm:10};

test('forward surface movement follows the camera heading',()=>{
 const north=moveSurfaceCoordinates({...earth,azimuth:0,forward:1});
 const east=moveSurfaceCoordinates({...earth,azimuth:90,forward:1});
 assert.ok(north.latitude>.08&&Math.abs(north.longitude)<.001);
 assert.ok(east.longitude>.08&&Math.abs(east.latitude)<.001);
});

test('strafe movement and poles remain numerically stable',()=>{
 const strafe=moveSurfaceCoordinates({...earth,azimuth:0,right:1});
 const polar=moveSurfaceCoordinates({latitude:89.98,longitude:179,radiusKm:1737,distanceKm:20,azimuth:0,forward:1});
 assert.ok(strafe.longitude>.08&&Math.abs(strafe.latitude)<.001);
 assert.ok(polar.latitude<=89.99&&polar.longitude>=-180&&polar.longitude<=180);
});
