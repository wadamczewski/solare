import test from 'node:test';
import assert from 'node:assert/strict';
import {moveSurfaceCoordinates,SURFACE_TRAVERSAL_SPEED_KM_S} from '../src/surface-navigation.js';

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


test('surface exploration rates move a visible map-scale distance and sprint remains faster',()=>{
 const normal=moveSurfaceCoordinates({latitude:0,longitude:0,azimuth:0,radiusKm:6371,distanceKm:SURFACE_TRAVERSAL_SPEED_KM_S.normal*.05,forward:1});
 const sprint=moveSurfaceCoordinates({latitude:0,longitude:0,azimuth:0,radiusKm:6371,distanceKm:SURFACE_TRAVERSAL_SPEED_KM_S.sprint*.05,forward:1});
 assert.ok(normal.latitude>.004,'a single frame must change an Earth coordinate visibly');
 assert.ok(sprint.latitude>normal.latitude*5,'Shift must retain a meaningful fast traversal');
});
