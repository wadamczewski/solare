import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 CLOUD_MOTION_SIMULATION_MULTIPLIER,
 CLOUD_WIND_DIRECTION,
 cloudDrift,
 cloudMotionTime,
 cloudWeatherTime,
 createEarthCloudCover,
 createProceduralCloudTexture
} from '../src/earth-clouds.js';

test('procedural Earth clouds contain both clear sky and opaque cloud cells', () => {
 const texture = createProceduralCloudTexture(48, 24, 41);
 const alpha = texture.image.data.filter((_, index) => index % 4 === 3);
 assert.ok(Math.min(...alpha) < 8);
 assert.ok(Math.max(...alpha) > 180);
 texture.dispose();
});

test('cloud drift is deterministic and advances without wrapping out of bounds', () => {
 const first = cloudDrift({wallSeconds: 1, simulatedDays: 0, drift: 1});
 const later = cloudDrift({wallSeconds: 300, simulatedDays: 6, drift: 1});
 assert.notEqual(first.x, later.x);
 for (const value of Object.values(later)) assert.ok(value >= 0 && value < 1);
});

test('cloud weather follows simulated days strongly enough to reflect simulation speed', () => {
 const paused = cloudWeatherTime({wallSeconds: 10, simulatedDays: 0});
 const twoDaysPerSecond = cloudWeatherTime({wallSeconds: 10, simulatedDays: 2});
 const fastForward = cloudWeatherTime({wallSeconds: 10, simulatedDays: 365});
 assert.ok(twoDaysPerSecond - paused > 1.6);
 assert.ok(fastForward - twoDaysPerSecond > 300);
});

test('a paused simulation freezes cloud shape and motion regardless of wall time', () => {
 const cover = createEarthCloudCover();
 const cameraPosition = new THREE.Vector3(0, 1.001, 0);
 cover.update({wallSeconds: 0, simulatedDays: 0, cameraPosition});
 const field = cover.group.getObjectByName('Earth dynamic cloud field');
 const puff = field.getObjectByName('Ray-marched cloud volume');
 const before = {
  position: puff.position.clone(),
  scale: puff.scale.clone(),
  rotation: puff.rotation.clone(),
  time: puff.material.uniforms.uTime.value
 };
 cover.update({wallSeconds: 3600, simulatedDays: 0, cameraPosition});
 assert.deepEqual(puff.position.toArray(), before.position.toArray());
 assert.deepEqual(puff.scale.toArray(), before.scale.toArray());
 assert.deepEqual(puff.rotation.toArray(), before.rotation.toArray());
 assert.equal(puff.material.uniforms.uTime.value, before.time);
 cover.dispose();
});

test('cloud advection at 0.02 d/s has the intended 2 d/s visual pace', () => {
 const slowMotion = cloudMotionTime({wallSeconds: 0, simulatedDays: .02});
 const formerFastWeatherPhase = cloudWeatherTime({wallSeconds: 0, simulatedDays: 2});
 assert.equal(CLOUD_MOTION_SIMULATION_MULTIPLIER, 100);
 assert.equal(slowMotion, formerFastWeatherPhase);
});

test('cloud drift exposes an independent second coordinate for weather evolution', () => {
 const cloud = cloudDrift({wallSeconds: 120, simulatedDays: 2, drift: 1});
 const shadow = cloudDrift({wallSeconds: 120, simulatedDays: 2, drift: 1, shadow: true});
 assert.notEqual(cloud.y, shadow.y);
});


test('visible Earth clouds are dynamic ray-marched volumes, not static sprites', () => {
 const cover = createEarthCloudCover();
 const field = cover.group.getObjectByName('Earth dynamic cloud field');
 assert.ok(field?.isGroup);
 const firstPuff = field.getObjectByName('Ray-marched cloud volume');
 assert.ok(firstPuff?.isMesh);
 assert.equal(cover.group.children.some(child => child.isSprite), false);
 const cameraPosition=new THREE.Vector3(0,1.01,0);
 cover.update({wallSeconds:0,simulatedDays:0,cameraPosition});
 const start=firstPuff.position.clone();
 cover.update({wallSeconds:0,simulatedDays:.02,cameraPosition});
 assert.ok(firstPuff.material.uniforms.uTime.value>.01);
 assert.ok(firstPuff.position.distanceTo(start)>.0005,'a 0.02-day simulation advance visibly advects the cloud cell');
 cover.dispose();
});

test('cloud deck keeps visible volumes near the observer without a terrain-intersecting shadow mesh', () => {
 const cover = createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0, 1, 0), {radiusKm: 6371, surfaceHeightKm: 0, surfaceRadius: 1});
 cover.setLighting({daylight: 1, sunDirection: new THREE.Vector3(.3, .8, .5)});
 const field = cover.group.getObjectByName('Earth dynamic cloud field');
 const cameraPosition = new THREE.Vector3(0, 1.001, 0);
 cover.update({wallSeconds: 0, simulatedDays: 0, cameraPosition});
 const puffs = [];
 field.traverse(item => { if (item.name === 'Ray-marched cloud volume') puffs.push(item); });
 cover.update({wallSeconds: 0, simulatedDays: .02, cameraPosition});
 assert.equal(field.getObjectByName('Projected cloud shadow'), undefined);
 assert.equal(puffs.length, 16);
 assert.ok(puffs.some(puff => Math.hypot(puff.position.x, puff.position.z) * 6371 < 34));
 assert.ok(puffs.some(puff => Math.max(puff.scale.x, puff.scale.z) * 6371 > 24), 'the weather field includes large cloud clusters');
 assert.ok(puffs.some(puff => puff.position.y > 0), 'some cloud bases remain visibly above the local horizon');
 cover.dispose();
});

test('weather cycles respawn varied cloud shapes while keeping one shared wind direction', () => {
 const cover = createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0, 1, 0), {radiusKm: 6371, surfaceRadius: 1});
 cover.update({simulatedDays: 0, cameraPosition: new THREE.Vector3(0, 1.001, 0)});
 const field = cover.group.getObjectByName('Earth dynamic cloud field');
 const puffs = [];
 field.traverse(item => { if (item.name === 'Ray-marched cloud volume') puffs.push(item); });
 const before = puffs.map(puff => ({seed: puff.material.uniforms.uSeed.value, scale: puff.scale.toArray()}));
 assert.ok(puffs.every(puff => puff.userData.windDirection === CLOUD_WIND_DIRECTION));
 cover.update({simulatedDays: 1, cameraPosition: new THREE.Vector3(0, 1.001, 0)});
 assert.ok(puffs.some((puff, index) => puff.material.uniforms.uSeed.value !== before[index].seed));
 assert.ok(puffs.some((puff, index) => puff.scale.distanceTo(new THREE.Vector3(...before[index].scale)) > 1e-5));
 cover.dispose();
});

test('clouds stay fixed over the globe while the observer walks, and recenter only on an explicit jump', () => {
 const cover = createEarthCloudCover();
 const firstObserver = new THREE.Vector3(0, 1, 0);
 const secondObserver = new THREE.Vector3(1, 0, 0);
 cover.setObserver(firstObserver, {radiusKm: 6371, surfaceRadius: 1});
 const anchor = cover.group.getObjectByName('Earth cloud observer anchor');
 const initialPosition = anchor.position.clone();
 const initialRotation = anchor.quaternion.clone();
 cover.setObserver(secondObserver, {radiusKm: 6371, surfaceRadius: 1});
 assert.deepEqual(anchor.position.toArray(), initialPosition.toArray());
 assert.deepEqual(anchor.quaternion.toArray(), initialRotation.toArray());
 cover.setObserver(secondObserver, {radiusKm: 6371, surfaceRadius: 1, recenter: true});
 assert.ok(anchor.position.distanceTo(initialPosition) > .5);
 cover.dispose();
});

test('cloud shadows are injected into ground materials without overlay meshes', () => {
 const cover = createEarthCloudCover();
 const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial());
 cover.applyGroundShadows(ground);
 assert.equal(ground.material.userData.__solareCloudShadow, true);
 assert.equal(typeof ground.material.onBeforeCompile, 'function');
 ground.geometry.dispose();
 ground.material.dispose();
 cover.dispose();
});

test('cloud deck honours the observer elevation and keeps low clouds below Everest', () => {
 const cover=createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0,1,0),{radiusKm:6371,surfaceHeightKm:8.849,surfaceRadius:1});
 cover.update({wallSeconds:4,simulatedDays:0});
 const anchor=cover.group.getObjectByName('Earth cloud observer anchor');
 assert.ok(Math.abs(anchor.position.y-(1+8.849/6371))<1e-6);
 const puffs=[];anchor.traverse(item=>{if(item.name==='Ray-marched cloud volume')puffs.push(item)});
 assert.ok(puffs.some(puff=>puff.position.y<0));
 cover.dispose();
});
