import test from 'node:test';
import assert from 'node:assert/strict';
import {ShaderChunk} from 'three';
import {installSceneDepth,SCENE_DEPTH_SCALE} from '../src/scene-depth.js';

// Reproduce GPU float arithmetic and the actual 24-bit depth attachment.
const f=Math.fround,depth24=x=>Math.round(x*(2**24-1));
function shaderDepth(w,far=2000){
 const fc=f(2/Math.log2(far+1));
 const shaderFar=f(f(2**f(2/fc))-1);
 return f(f(Math.log2(f(1+f(f(w)*SCENE_DEPTH_SCALE))))/f(Math.log2(f(1+f(shaderFar*SCENE_DEPTH_SCALE)))));
}
test('AU scene depth separates nearby hull, interior and terrain instead of rounding every surface to zero',()=>{
 const earthVehicle=6/149597870.7*.06371;
 const distances=[earthVehicle,earthVehicle*1.1,earthVehicle*2];
 assert.deepEqual(distances.map(w=>Math.log2(f(1+f(w)))),[0,0,0],'original Three.js shader reproduces the missing hull');
 for(const lengthKm of [.008,.017374,.06371,.12]){
  const length=6/149597870.7*lengthKm;
  const values=[1,1.001,1.01,1.1,2].map(d=>depth24(shaderDepth(d*length)));
  assert.ok(values.every((v,i)=>i===0||v>values[i-1]),'1/1000 of the vehicle length still has a distinct depth');
 }
});
test('depth remains monotonic from a close surface camera to outer-system space and respects the far plane',()=>{
 for(const far of [1,2000,10000]){
  const samples=[1e-12,1e-10,1e-8,1e-6,.001,.1,1,100,far].filter(x=>x<=far);
  let previous=-1;for(const w of [...new Set(samples)].sort((a,b)=>a-b)){const d=shaderDepth(w,far);assert.ok(d>previous&&d>=0&&d<=1.000001);previous=d;}
  assert.ok(Math.abs(shaderDepth(far,far)-1)<1e-6);
 }
});
test('all included material shaders share the depth mapping, retain orthographic depth and install idempotently',()=>{
 const oldVertex=ShaderChunk.logdepthbuf_vertex,oldFragment=ShaderChunk.logdepthbuf_fragment;
 try{
  installSceneDepth();const vertex=ShaderChunk.logdepthbuf_vertex,fragment=ShaderChunk.logdepthbuf_fragment;
  assert.ok(vertex.includes(SCENE_DEPTH_SCALE.toExponential()));assert.match(fragment,/vIsPerspective == 0\.0 \? gl_FragCoord\.z/);
  assert.match(fragment,/logDepthBufFC/);installSceneDepth();assert.equal(ShaderChunk.logdepthbuf_vertex,vertex);assert.equal(ShaderChunk.logdepthbuf_fragment,fragment);
 }finally{ShaderChunk.logdepthbuf_vertex=oldVertex;ShaderChunk.logdepthbuf_fragment=oldFragment;}
});
