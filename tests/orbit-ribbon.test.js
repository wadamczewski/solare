import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createOrbitRibbon,orbitRibbonHalfWidth,updateOrbitRibbon} from '../src/orbit-ribbon.js';

test('orbit ribbon creates indexed triangles instead of a one-pixel line', () => {
 const ribbon=createOrbitRibbon({segments:4});
 assert.equal(ribbon.type,'Mesh');
 assert.equal(ribbon.geometry.attributes.position.count,10);
 assert.equal(ribbon.geometry.index.count,24);
 assert.equal(ribbon.material.side,THREE.DoubleSide);
});

test('orbit ribbon keeps a readable camera-facing width', () => {
 const ribbon=createOrbitRibbon({segments:2});
 const camera=new THREE.PerspectiveCamera(43,1,.1,1000);camera.position.set(0,4,10);
 updateOrbitRibbon(ribbon,[new THREE.Vector3(-2,0,0),new THREE.Vector3(0,0,0),new THREE.Vector3(2,0,0)],camera,900);
 const positions=ribbon.geometry.attributes.position;
 assert.ok(positions.getY(0)!==positions.getY(1)||positions.getZ(0)!==positions.getZ(1));
 assert.ok(orbitRibbonHalfWidth(50,43,900)>orbitRibbonHalfWidth(5,43,900));
 assert.ok(orbitRibbonHalfWidth(50,43,900,{realScale:true})<orbitRibbonHalfWidth(50,43,900));
});

test('true-scale ribbons stay at least a pixel wide out at the edge of the system', () => {
 // Neptune's orbit is 180 world units across, so the camera sits hundreds of units
 // away. A width capped in world units collapses below one pixel there and the
 // ellipse rasterises into arcs that read as a second orbit.
 for (const distance of [6, 60, 180, 600]) {
  const halfWidth = orbitRibbonHalfWidth(distance, 43, 900, {realScale: true});
  const worldPerPixel = 2 * distance * Math.tan(43 * Math.PI / 360) / 900;
  assert.ok(halfWidth / worldPerPixel > .5, `${distance}: ${halfWidth / worldPerPixel} px`);
 }
});
