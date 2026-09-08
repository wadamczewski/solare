import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {previewCameraPosition,syncPreviewTransform} from '../src/preview.js';

test('body preview follows the source axis and current spin instead of its own animation',()=>{
 const sourceAxis=new THREE.Group(),sourceMesh=new THREE.Mesh(new THREE.SphereGeometry());sourceAxis.add(sourceMesh);
 const previewAxis=sourceAxis.clone(true),previewMesh=previewAxis.children[0];sourceAxis.rotation.set(.2,.3,.4);sourceMesh.rotation.set(.5,.6,.7);
 syncPreviewTransform(previewAxis,previewMesh,sourceAxis,sourceMesh);
 assert.deepEqual(previewAxis.rotation.toArray(),sourceAxis.rotation.toArray());
 assert.deepEqual(previewMesh.rotation.toArray(),sourceMesh.rotation.toArray());
 assert.equal(previewMesh.geometry,sourceMesh.geometry);
 assert.equal(previewMesh.material,sourceMesh.material);
});

test('body preview camera faces the illuminated hemisphere from the Sun direction',()=>{
 const sunDirection=new THREE.Vector3(-3,2,4),camera=previewCameraPosition(sunDirection,5);
 assert.ok(Math.abs(camera.length()-5)<1e-10);
 assert.ok(camera.normalize().dot(sunDirection.normalize())>.999999);
});
