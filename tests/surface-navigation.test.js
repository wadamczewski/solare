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
 assert.ok(polar.latitude<89.99&&polar.longitude>=-180&&polar.longitude<=180,'northward movement passes the pole instead of sticking to it');
});

test('polar traversal stays on course and diagonal keys do not accelerate',()=>{
 const southward=moveSurfaceCoordinates({latitude:-89.98,longitude:15,radiusKm:6371,distanceKm:8,azimuth:180,forward:1});
 const northward=moveSurfaceCoordinates({latitude:-89.98,longitude:15,radiusKm:6371,distanceKm:8,azimuth:0,forward:1});
 const single=moveSurfaceCoordinates({...earth,distanceKm:10,azimuth:0,forward:1});
 const diagonal=moveSurfaceCoordinates({...earth,distanceKm:10,azimuth:0,forward:1,right:1});
 // South crosses the pole and changes meridian; north moves away from it.
 assert.ok(southward.latitude>-89.98&&Math.abs(Math.abs(southward.longitude)-165)<2);
 assert.ok(northward.latitude>-89.98&&Math.abs(northward.longitude-15)<.01);
 // Great-circle angular distances are equal, so W+D cannot travel sqrt(2)
 // times farther than W during one frame.
 const angularDistance=point=>Math.acos(Math.sin(point.latitude*Math.PI/180)*0+Math.cos(point.latitude*Math.PI/180)*Math.cos(point.longitude*Math.PI/180));
 assert.ok(Math.abs(angularDistance(single)-angularDistance(diagonal))<1e-10);
});


test('surface exploration rates move a visible map-scale distance and sprint remains faster',()=>{
 const normal=moveSurfaceCoordinates({latitude:0,longitude:0,azimuth:0,radiusKm:6371,distanceKm:SURFACE_TRAVERSAL_SPEED_KM_S.normal*.05,forward:1});
 const sprint=moveSurfaceCoordinates({latitude:0,longitude:0,azimuth:0,radiusKm:6371,distanceKm:SURFACE_TRAVERSAL_SPEED_KM_S.sprint*.05,forward:1});
 assert.ok(normal.latitude>.004,'a single frame must change an Earth coordinate visibly');
 assert.ok(sprint.latitude>normal.latitude*5,'Shift must retain a meaningful fast traversal');
});
