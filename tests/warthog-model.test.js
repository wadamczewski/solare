import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,statSync} from 'node:fs';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {ShaderLib} from 'three';
import {prepareWarthogModel,WARTHOG_SOURCE} from '../src/warthog-model.js';
import {createSurfaceVehicleRig} from '../src/surface-vehicle-rig.js';
import {createSurfaceVehicleDrive} from '../src/surface-vehicle-drive.js';
const root=new URL('../public/models/warthog/',import.meta.url);
function source(){const b=readFileSync(new URL('warthog.glb',root)),l=b.readUInt32LE(12);assert.equal(b.toString('ascii',0,4),'glTF');return {j:JSON.parse(b.subarray(20,20+l)),binary:b.subarray(l+28)};}
test('licensed Warthog has the complete authored meshes, local full-resolution texture references and no oversized blob',()=>{
 const {j}=source();assert.equal(j.meshes.length,45);assert.equal(j.images.length,19);assert.equal(WARTHOG_SOURCE.author,'McCarthy3D');assert.equal(WARTHOG_SOURCE.license,'CC BY 4.0');
 let triangles=0;for(const m of j.meshes)for(const p of m.primitives){assert.ok(p.attributes.TEXCOORD_0!==undefined);triangles+=j.accessors[p.indices].count/3;}
 assert.ok(triangles>=38000);for(const im of j.images){assert.match(im.uri,/^texture-\d+\.(webp|png)$/);assert.ok(existsSync(new URL(im.uri,root)));assert.ok(statSync(new URL(im.uri,root)).size<100*1024*1024);}
 assert.ok(j.extensionsUsed.includes('EXT_texture_webp'));
});
test('real source wheels, suspension and original geometry survive animated rig ownership and cleanup',async()=>{
 const {j,binary}=source();j.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');delete j.images;delete j.textures;delete j.materials;delete j.extensionsRequired;delete j.extensionsUsed;for(const m of j.meshes)for(const p of m.primitives)delete p.material;
 const previous=globalThis.ProgressEvent;globalThis.ProgressEvent=class{constructor(type,options){Object.assign(this,options);}};
 try{
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(j),''),asset=prepareWarthogModel(gltf.scene);
  assert.equal(asset.wheels.length,4);assert.equal(asset.wheels.filter(w=>w.steerable).length,2);assert.equal(asset.suspensionLinks.length,8);assert.equal(gltf.scene.getObjectByName('Globals').visible,false);
  for(const w of asset.wheels){assert.ok(w.radius>.09&&w.radius<.13);assert.ok(w.steerable?w.center[2]<0:w.center[2]>0);assert.equal(w.node.children.length,2);}
  const geometries=new Set();asset.model.traverse(n=>{if(n.geometry)geometries.add(n.geometry);});
  const rig=createSurfaceVehicleRig(asset),drive=createSurfaceVehicleDrive({radiusKm:1737.4,wheels:asset.wheels});drive.update(.1,{throttle:1,steer:1});rig.apply(drive.state);
  assert.ok(drive.state.wheelSpin.every(angle=>angle<0));assert.ok(drive.state.exhaust>0);assert.ok(asset.wheels[0].node.parent.name!==undefined);
  rig.dispose();assert.ok(asset.wheels.every(w=>w.node.parent.name==='Wheels'));
  let disposals=0;for(const geo of geometries)geo.addEventListener('dispose',()=>disposals++);asset.dispose();asset.dispose();assert.equal(disposals,geometries.size);
 }finally{if(previous===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=previous;}
});
test('actual source keeps transparent glass with finite close-up refraction and opaque tyres/interior with depth writes',async()=>{
 const {j,binary}=source();j.buffers[0].uri='data:application/octet-stream;base64,'+binary.toString('base64');
 // Exercise the real exported scalar material settings, without requiring
 // browser image decoding in Node. Texture references are checked above.
 for(const m of j.materials){
  delete m.normalTexture;delete m.occlusionTexture;delete m.emissiveTexture;
  delete m.pbrMetallicRoughness.baseColorTexture;delete m.pbrMetallicRoughness.metallicRoughnessTexture;
 }
 delete j.images;delete j.textures;j.extensionsUsed=j.extensionsUsed.filter(x=>x!=='EXT_texture_webp');delete j.extensionsRequired;
 const previous=globalThis.ProgressEvent;globalThis.ProgressEvent=class{constructor(type,options){Object.assign(this,options);}};
 try{
  const gltf=await new GLTFLoader().parseAsync(JSON.stringify(j),''),asset=prepareWarthogModel(gltf.scene),materials=new Map();
  asset.model.traverse(n=>{if(n.material)materials.set(n.material.name,n.material);});
  for(const name of ['Warthog_Mat','Warthog_Int_Mat','Warthog_Tyre_Mat','Warthog_Turret_Mat']){const m=materials.get(name);assert.equal(m.transparent,false,name);assert.equal(m.depthWrite,true,name);assert.equal(m.opacity,1,name);}
  const glass=materials.get('Warthog_Glass_Mat');assert.equal(glass.transparent,true);assert.equal(glass.opacity,.25);assert.equal(glass.transmission,.85);
  const shader={uniforms:{},fragmentShader:ShaderLib.physical.fragmentShader};glass.onBeforeCompile(shader);
  assert.match(shader.fragmentShader,/vec3 pos = -vViewPosition;/);assert.match(shader.fragmentShader,/vec3 v = normalize\( -pos \)/);
  assert.match(shader.fragmentShader,/pos, modelMatrix, mat4\( 1\.0 \), projectionMatrix/);assert.ok(!shader.fragmentShader.includes('cameraPosition - pos'));
  // Original world-space subtraction degenerates at the real scene scale.
  const camera=5,surface=5+2e-9;assert.equal(Math.fround(camera)-Math.fround(surface),0);
  const view=[Math.fround(2e-9),Math.fround(1e-9),Math.fround(4e-9)],length=Math.hypot(...view);assert.ok(view.map(x=>x/length).every(Number.isFinite));
  asset.dispose();
 }finally{if(previous===undefined)delete globalThis.ProgressEvent;else globalThis.ProgressEvent=previous;}
});
