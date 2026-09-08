import test from 'node:test';
import assert from 'node:assert/strict';
import {AdditiveBlending,BackSide,MeshBasicMaterial,MeshStandardMaterial,NormalBlending} from 'three';
import {makeOpaqueSurface} from '../src/opaque-surface.js';

test('planetary surfaces remain opaque even after an effect changed material state',()=>{
 for(const Material of [MeshStandardMaterial,MeshBasicMaterial]){
  const material=new Material({transparent:true,opacity:.2,depthWrite:false,depthTest:false,blending:AdditiveBlending,side:BackSide,alphaTest:.3});
  assert.equal(makeOpaqueSurface(material),material);
  assert.equal(material.transparent,false);assert.equal(material.opacity,1);assert.equal(material.alphaTest,0);
  assert.equal(material.depthWrite,true);assert.equal(material.depthTest,true);assert.equal(material.blending,NormalBlending);
 }
});
