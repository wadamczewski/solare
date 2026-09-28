import test from 'node:test';
import assert from 'node:assert/strict';
import {MISSION_DISPLAY_SPAN,SURFACE_MISSION_SITES,missionFraming,missionPlacesFor,missionSitesFor} from '../src/surface-missions.js';

test('surface view includes the six Apollo landing sites and robotic Mars hardware',()=>{
 assert.equal(SURFACE_MISSION_SITES.moon.length,6);
 assert.ok(SURFACE_MISSION_SITES.moon.every(site=>site.model&&Number.isFinite(site.latitude)&&Number.isFinite(site.longitude)));
 assert.ok(SURFACE_MISSION_SITES.mars.some(site=>site.name==='Viking 1'));
 for(const rover of ['Sojourner','Spirit','Opportunity','Curiosity','Perseverance']){
  const site=SURFACE_MISSION_SITES.mars.find(candidate=>candidate.name===rover);
  assert.ok(site?.route?.length>=2,`${rover} needs a drawn traverse`);
 }
});


test('hardware appears on the ground from its landing date',()=>{
 const mars={key:'mars'},moon={key:'moon',name:'Księżyc'};
 assert.deepEqual(missionSitesFor(moon,new Date('1969-07-19T00:00:00Z')).map(site=>site.name),[]);
 assert.deepEqual(missionSitesFor(moon,new Date('1969-07-21T00:00:00Z')).map(site=>site.name),['Apollo 11']);
 assert.equal(missionSitesFor(mars,new Date('2026-01-01T00:00:00Z')).length,7);
 assert.ok(!missionSitesFor(mars,new Date('2020-01-01T00:00:00Z')).some(site=>site.name==='Perseverance'));
 assert.ok(missionPlacesFor(mars,new Date('2026-01-01T00:00:00Z')).every(place=>place.mission&&Number.isFinite(place.latitude)));
});

test('the framing puts the whole model inside the field of view',()=>{
 const radiusKm=3389.5,latitude=22.48,longitude=-47.97;
 for(const [fovDeg,aspect,size] of [[50,16/9,[1,.6,.8]],[50,.46,[1,1,1]],[70,1.2,[.6,1,.5]]]){
  const view=missionFraming({latitude,longitude,radiusKm,fovDeg,aspect,size});
  // Angular radius of the model's bounding sphere seen from the camera must fit the narrower half-angle.
  const spanKm=radiusKm*MISSION_DISPLAY_SPAN,sphere=Math.hypot(...size.map(value=>value*spanKm))/2;
  const vertical=fovDeg*Math.PI/180,horizontal=2*Math.atan(Math.tan(vertical/2)*aspect);
  assert.ok(Math.asin(sphere/view.distanceKm)<Math.min(vertical,horizontal)/2,`fits at fov ${fovDeg}, aspect ${aspect.toFixed(2)}`);
  // The camera stands back from the site by the ground distance and looks back at it.
  const toRad=Math.PI/180,d=Math.acos(Math.sin(latitude*toRad)*Math.sin(view.latitude*toRad)+Math.cos(latitude*toRad)*Math.cos(view.latitude*toRad)*Math.cos((longitude-view.longitude)*toRad))*radiusKm;
  assert.ok(Math.abs(d-view.groundKm)<1e-6*radiusKm);
  assert.ok(view.altitude<0&&view.eyeHeightKm>size[1]*spanKm/2,'looking down from above the model');
 }
});
