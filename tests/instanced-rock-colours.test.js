import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAsteroidBelt} from '../src/asteroid-belt.js';
import {createRingParticles} from '../src/ring-particles.js';
import {createIrregularMoonSwarm} from '../src/irregular-moon-swarm.js';
import {SATURN_RING_INNER,SATURN_RING_BANDS} from '../src/planet-rings.js';

test('instanced rocks take their colour from instanceColor, not a missing vertex attribute',()=>{
 const meshes={
  'asteroid belt':createAsteroidBelt({count:12,random:()=>.5}).mesh,
  'ring particles':createRingParticles({inner:SATURN_RING_INNER,bands:SATURN_RING_BANDS,count:12,random:()=>.5}).mesh,
  'irregular moons':createIrregularMoonSwarm({random:()=>.5}).mesh
 };
 for(const [label,mesh] of Object.entries(meshes)){
  const mesh_=mesh.isInstancedMesh?mesh:mesh.children.find(child=>child.isInstancedMesh);
  assert.ok(mesh_?.isInstancedMesh,label);
  assert.equal(mesh_.material.vertexColors,false,`${label}: no per-vertex colour multiply`);
  assert.equal(mesh_.geometry.getAttribute('color'),undefined,`${label}: the rock geometry has no colour attribute to multiply by`);
  assert.ok(mesh_.instanceColor,`${label}: every rock still has its own tone`);
 }
});
