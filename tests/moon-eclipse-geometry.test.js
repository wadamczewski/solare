import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {apparentDiskOcclusion,trueAngleOccluders} from '../src/extended-solar-shadow.js';

const AU=149597870.7;
// Jupiter system geometry in AU and km, Sun at the origin.
const jupiter=[5.2,0,0],JUPITER_KM=71492,IO_KM=421700/AU,SUN_KM=695700;
const occluderList=(display)=>[{id:1,trueP:jupiter,radiusKm:JUPITER_KM,displayPosition:display.jupiter}];
// The compressed map: Io 3.5 drawn Jupiter radii away, the Sun's disc enlarged.
const display={sun:new THREE.Vector3(0,0,0),jupiter:new THREE.Vector3(9.3,0,0)};

test('a moon well off its planet\'s shadow axis is not eclipsed on the compressed map',()=>{
 // Io 15 degrees round its orbit from the anti-solar point: 109 000 km off
 // the shadow axis in reality (Jupiter's radius is 71 500 km), but inside
 // Jupiter's drawn shadow on the map, where it sits only 3.5 radii out.
 const angle=15*Math.PI/180,io=[jupiter[0]+IO_KM*Math.cos(angle),IO_KM*Math.sin(angle),0];
 const receiverDisplay=display.jupiter.clone().add(new THREE.Vector3(Math.cos(angle),Math.sin(angle),0).multiplyScalar(2.39));
 const toSun=display.sun.clone().sub(receiverDisplay),toJupiter=display.jupiter.clone().sub(receiverDisplay);
 const onMap=apparentDiskOcclusion(Math.asin(1.02/toSun.length()),Math.asin(.675/toJupiter.length()),toSun.angleTo(toJupiter));
 assert.ok(onMap>.9,`sanity: the drawn geometry alone eclipses it (${onMap})`);
 const mapped=trueAngleOccluders({receiverTrue:io,sunTrue:[0,0,0],sunRadiusKm:SUN_KM,receiverDisplay,sunDisplay:display.sun,occluders:occluderList(display),receiverId:2});
 assert.equal(mapped.occluders.length,0);
});

test('a moon really behind its planet is eclipsed with the true angular sizes',()=>{
 const io=[jupiter[0]+IO_KM,0,0],receiverDisplay=display.jupiter.clone().add(new THREE.Vector3(2.39,0,0));
 const mapped=trueAngleOccluders({receiverTrue:io,sunTrue:[0,0,0],sunRadiusKm:SUN_KM,receiverDisplay,sunDisplay:display.sun,occluders:occluderList(display),receiverId:2});
 assert.equal(mapped.occluders.length,1);
 const [blocker]=mapped.occluders,distance=blocker.position.distanceTo(receiverDisplay);
 const sunDistance=receiverDisplay.length();
 assert.ok(Math.abs(Math.asin(blocker.radius/distance)-Math.asin(JUPITER_KM/AU/IO_KM))<1e-9,'Jupiter subtends its real angle from Io');
 assert.ok(Math.abs(Math.asin(mapped.sourceRadius/sunDistance)-Math.asin(SUN_KM/AU/(jupiter[0]+IO_KM)))<1e-9,'the Sun subtends its real angle');
 const sunDirection=display.sun.clone().sub(receiverDisplay).normalize(),blockerDirection=blocker.position.clone().sub(receiverDisplay).normalize();
 assert.ok(sunDirection.angleTo(blockerDirection)<1e-9,'the blocker is put in front of the drawn Sun');
 assert.equal(apparentDiskOcclusion(Math.asin(mapped.sourceRadius/sunDistance),Math.asin(blocker.radius/distance),0),1);
});
