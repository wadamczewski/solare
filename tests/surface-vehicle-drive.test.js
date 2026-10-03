import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createSurfaceVehicleDrive,surfaceVehicleLengthKm} from '../src/surface-vehicle-drive.js';

// A mechanical test rig, not a replacement for the requested Mako asset.
const wheels=[-.22,.22].flatMap(x=>[-.34,0,.34].map(z=>({center:[x,.08,z],radius:.08,steerable:z<0})));
function fixture(options={}){
 const drive=createSurfaceVehicleDrive({radiusKm:6371,lengthKm:.06,wheels,...options});
 const tick=(input,seconds=1,fps=60)=>{for(let i=0;i<seconds*fps;i++)drive.update(1/fps,input)};
 return {drive,tick};
}

test('surface vehicle accelerates, brakes before reversing and does not strafe',()=>{
 const {drive,tick}=fixture();tick({throttle:1},2);const moving=drive.state;
 assert.ok(moving.latitude>0);assert.ok(Math.abs(moving.longitude)<1e-9);assert.equal(moving.braking,0);assert.ok(moving.exhaust>.8);
 drive.update(.05,{throttle:-1});assert.ok(drive.state.speedKmS>0);assert.equal(drive.state.braking,1);assert.ok(drive.state.exhaust<moving.exhaust);
 tick({throttle:-1},2);assert.ok(drive.state.speedKmS<0);assert.ok(drive.state.speedKmS>=-drive.state.cruiseKmS*.4);
 tick({brake:true},2);assert.equal(drive.state.speedKmS,0);assert.equal(drive.state.braking,1);assert.ok(drive.state.exhaust<1e-8);
 const stopped=drive.state.positionKm;tick({brake:true});assert.ok(stopped.distanceTo(drive.state.positionKm)<1e-10);
 const parked=fixture();parked.tick({steer:1});assert.equal(parked.drive.state.distanceKm,0);assert.ok(Math.abs(parked.drive.state.azimuth)<1e-9);
});

test('only steering wheels turn and all wheels roll with travelled distance in both directions',()=>{
 const {drive,tick}=fixture();tick({throttle:1,steer:1},.5);const s=drive.state;
 assert.ok(s.longitude>0);assert.ok(s.azimuth>0);assert.ok(s.wheelSpin.every(spin=>spin<0));
 wheels.forEach((wheel,index)=>assert.equal(s.wheelSteer[index]!==0,wheel.steerable));
 tick({brake:true},1);const before=drive.state.wheelSpin[0];tick({throttle:-1},.2);assert.ok(drive.state.wheelSpin[0]>before);
});

test('coasting stops cleanly; boost affects speed; pause does not affect manual input',()=>{
 const normal=fixture(),boosted=fixture();normal.tick({throttle:1},4);boosted.tick({throttle:1,boost:true},4);
 assert.ok(boosted.drive.state.speedKmS>normal.drive.state.speedKmS*1.99);
 normal.tick({},4);assert.equal(normal.drive.state.speedKmS,0);assert.equal(normal.drive.state.braking,0);assert.ok(normal.drive.state.exhaust<1e-8);
 normal.drive.update(0,{throttle:1});assert.equal(normal.drive.state.speedKmS,0);
});

test('speed ramps and wheel rotation are independent of display frame rate',()=>{
 const a=fixture(),b=fixture();a.tick({throttle:1},2,30);b.tick({throttle:1},2,120);
 assert.ok(a.drive.state.positionKm.distanceTo(b.drive.state.positionKm)<1e-7);
 assert.ok(Math.abs(a.drive.state.wheelSpin[0]-b.drive.state.wheelSpin[0])<1e-8);
 a.tick({brake:true},1,30);b.tick({brake:true},1,120);assert.ok(a.drive.state.positionKm.distanceTo(b.drive.state.positionKm)<1e-7);
});

test('parallel transport crosses either pole without a sideways jump',()=>{
 for(const south of [false,true]){
  const {drive,tick}=fixture({radiusKm:1,lengthKm:.02,latitude:south?-89.999:89.999,azimuth:south?180:0});
  const original=drive.state.positionKm.clone(),direction=new Vector3(0,0,-1).applyQuaternion(drive.state.quaternion);
  tick({throttle:1},.4);const after=drive.state;
  const displacement=after.positionKm.clone().sub(original);
  assert.ok(displacement.dot(direction)>0);
  assert.ok(displacement.clone().cross(direction).length()<displacement.length()*.02);
  assert.ok(new Vector3(0,0,-1).applyQuaternion(after.quaternion).dot(direction)>.99);
 }
});

test('six contacts react independently to terrain, while chassis tilts toward a fitted ground plane',()=>{
 const {drive,tick}=fixture({sampleRadiusKm:(lat,lon)=>6371+lat*5+lon*2+(.00012*Math.exp(-((lat+.000183)**2+(lon+.000119)**2)/1e-9))});
 const s=drive.state;
 assert.ok(s.wheelTravel.some(value=>Math.abs(value)>.0001));
 assert.ok(Math.max(...s.wheelTravel)-Math.min(...s.wheelTravel)>.001);
 const up=new Vector3(0,1,0).applyQuaternion(s.quaternion),flat=new Vector3(1,0,0);
 assert.ok(up.dot(flat)<.99999);assert.ok(up.dot(flat)>.99);
 tick({throttle:1},.5);assert.notDeepEqual(s.wheelTravel,drive.state.wheelTravel);
});

test('vehicle size follows world size with useful limits and validates the model rig',()=>{
 assert.equal(surfaceVehicleLengthKm(6371),.06371);assert.equal(surfaceVehicleLengthKm(6.2),.008);assert.equal(surfaceVehicleLengthKm(60000),.12);
 assert.throws(()=>surfaceVehicleLengthKm(0));assert.throws(()=>fixture({wheels:[]}));
 assert.throws(()=>fixture({sampleRadiusKm:()=>NaN}));
});
