import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {cloudDrift, cloudWeatherTime, createEarthCloudCover, createProceduralCloudTexture} from '../src/earth-clouds.js';

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
 assert.ok(twoDaysPerSecond - paused > .14);
 assert.ok(fastForward - twoDaysPerSecond > 20);
});

test('cloud shadows retain the cloud deck motion with a Sun-facing offset', () => {
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
 cover.update({wallSeconds: 12,cameraPosition:new THREE.Vector3(0,1.01,0)});
 assert.ok(firstPuff.material.uniforms.uTime.value>0);
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
