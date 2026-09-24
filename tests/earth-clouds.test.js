import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
 CLOUD_CLUSTER_COUNT,
 CLOUD_MOTION_SIMULATION_MULTIPLIER,
 CLOUD_WIND_DIRECTION,
 cloudDrift,
 cloudMotionTime,
 cloudWeatherTime,
 createEarthCloudCover,
 createProceduralCloudTexture
} from '../src/earth-clouds.js';

const cloudMesh = cover => cover.group.getObjectByName('Ray-marched cloud volumes');
const instanceMatrix = (mesh, index) => { const matrix = new THREE.Matrix4(); mesh.getMatrixAt(index, matrix); return matrix; };
const instancePosition = (mesh, index) => new THREE.Vector3().setFromMatrixPosition(instanceMatrix(mesh, index));
const instanceScale = (mesh, index) => { const scale = new THREE.Vector3(); instanceMatrix(mesh, index).decompose(new THREE.Vector3(), new THREE.Quaternion(), scale); return scale; };

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

test('a paused simulation freezes every cloud instance regardless of wall time', () => {
 const cover = createEarthCloudCover();
 const cameraPosition = new THREE.Vector3(0, 1.001, 0);
 cover.update({wallSeconds: 0, simulatedDays: 0, cameraPosition});
 const mesh = cloudMesh(cover);
 const before = {matrix: Array.from(mesh.instanceMatrix.array), seed: Array.from(mesh.geometry.getAttribute('instanceSeed').array), opacity: Array.from(mesh.geometry.getAttribute('instanceOpacity').array), time: mesh.material.uniforms.uTime.value};
 cover.update({wallSeconds: 3600, simulatedDays: 0, cameraPosition});
 assert.deepEqual(Array.from(mesh.instanceMatrix.array), before.matrix);
 assert.deepEqual(Array.from(mesh.geometry.getAttribute('instanceSeed').array), before.seed);
 assert.deepEqual(Array.from(mesh.geometry.getAttribute('instanceOpacity').array), before.opacity);
 assert.equal(mesh.material.uniforms.uTime.value, before.time);
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

test('visible Earth clouds use one instanced ray-marching mesh, not static sprites', () => {
 const cover = createEarthCloudCover();
 const mesh = cloudMesh(cover);
 assert.ok(mesh?.isInstancedMesh);
 assert.equal(mesh.count, CLOUD_CLUSTER_COUNT);
 assert.equal(CLOUD_CLUSTER_COUNT, 1600);
 assert.equal(cover.group.children.some(child => child.isSprite), false);
 const cameraPosition = new THREE.Vector3(0, 1.01, 0);
 cover.update({simulatedDays: 0, cameraPosition});
 const start = instancePosition(mesh, 0);
 cover.update({simulatedDays: .02, cameraPosition});
 assert.ok(mesh.material.uniforms.uTime.value > .01);
 assert.ok(instancePosition(mesh, 0).distanceTo(start) > .0005);
 cover.dispose();
});

test('dense weather includes nearby and large cloud clusters without a terrain-intersecting shadow mesh', () => {
 const cover = createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0, 1, 0), {radiusKm: 6371, surfaceHeightKm: 0, surfaceRadius: 1});
 cover.setLighting({daylight: 1, sunDirection: new THREE.Vector3(.3, .8, .5)});
 cover.update({simulatedDays: .02, cameraPosition: new THREE.Vector3(0, 1.001, 0)});
 const mesh = cloudMesh(cover);
 const positions = Array.from({length: CLOUD_CLUSTER_COUNT}, (_, index) => instancePosition(mesh, index));
 assert.equal(cover.group.getObjectByName('Projected cloud shadow'), undefined);
 assert.ok(positions.some(position => Math.hypot(position.x, position.z) * 6371 < 6), 'some clouds spawn beside the observer');
 assert.ok(Array.from({length: CLOUD_CLUSTER_COUNT}, (_, index) => instanceScale(mesh, index)).some(scale => Math.max(scale.x, scale.z) * 6371 > 36));
 cover.dispose();
});

test('weather cycles respawn varied cloud shapes under one shared wind direction', () => {
 const cover = createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0, 1, 0), {radiusKm: 6371, surfaceRadius: 1});
 cover.update({simulatedDays: 0, cameraPosition: new THREE.Vector3(0, 1.001, 0)});
 const mesh = cloudMesh(cover);
 const beforeSeeds = Array.from(mesh.geometry.getAttribute('instanceSeed').array);
 const beforeScale = instanceScale(mesh, 0);
 assert.equal(mesh.userData.windDirection, CLOUD_WIND_DIRECTION);
 cover.update({simulatedDays: 1, cameraPosition: new THREE.Vector3(0, 1.001, 0)});
 assert.ok(Array.from(mesh.geometry.getAttribute('instanceSeed').array).some((seed, index) => seed !== beforeSeeds[index]));
 assert.ok(instanceScale(mesh, 0).distanceTo(beforeScale) > 1e-5);
 cover.dispose();
});

test('cloud coverage follows an observer who leaves the current weather tile', () => {
 const cover = createEarthCloudCover();
 const firstObserver = new THREE.Vector3(0, 1, 0);
 const nearbyObserver = new THREE.Vector3(.001, 1, 0).normalize();
 const distantObserver = new THREE.Vector3(1, 0, 0);
 cover.setObserver(firstObserver, {radiusKm: 6371, surfaceRadius: 1});
 const anchor = cover.group.getObjectByName('Earth cloud observer anchor');
 const initialPosition = anchor.position.clone();
 cover.setObserver(nearbyObserver, {radiusKm: 6371, surfaceRadius: 1, follow: true});
 assert.deepEqual(anchor.position.toArray(), initialPosition.toArray());
 cover.setObserver(distantObserver, {radiusKm: 6371, surfaceRadius: 1, follow: true});
 assert.ok(anchor.position.distanceTo(initialPosition) > .5);
 cover.dispose();
});

test('cloud shadows are injected into ground materials without overlay meshes', () => {
 const cover = createEarthCloudCover();
 const ground = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial());
 cover.applyGroundShadows(ground);
 assert.equal(ground.material.userData.__solareCloudShadow, true);
 assert.equal(typeof ground.material.onBeforeCompile, 'function');
 ground.geometry.dispose(); ground.material.dispose(); cover.dispose();
});

test('cloud deck honours the observer elevation and keeps low clouds below Everest', () => {
 const cover = createEarthCloudCover();
 cover.setObserver(new THREE.Vector3(0,1,0), {radiusKm:6371,surfaceHeightKm:8.849,surfaceRadius:1});
 cover.update({simulatedDays:0});
 const anchor = cover.group.getObjectByName('Earth cloud observer anchor');
 assert.ok(Math.abs(anchor.position.y-(1+8.849/6371))<1e-6);
 const mesh = cloudMesh(cover);
 assert.ok(Array.from({length:CLOUD_CLUSTER_COUNT}, (_, index) => instancePosition(mesh, index)).some(position => position.y < 0));
 cover.dispose();
});
