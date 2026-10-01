import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Box3,Group,PerspectiveCamera,Scene,Texture,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {KONAMI_CODE,createKonamiSequence,createEnterpriseEasterEgg} from '../src/enterprise-easter-egg.js';
import {prepareEnterpriseModel,ENTERPRISE_SOURCE} from '../src/enterprise-model.js';

test('Konami requires the complete ordered code and ignores held-key repeats',()=>{
 const sequence=createKonamiSequence();
 assert.equal(sequence.press({code:'ArrowUp'}).complete,false);
 assert.equal(sequence.press({code:'ArrowUp',repeat:true}).complete,false);
 for(const code of KONAMI_CODE.slice(2))assert.equal(sequence.press({code}).complete,false);
 sequence.reset();
 for(const [i,code] of KONAMI_CODE.entries())assert.equal(sequence.press({code}).complete,i===KONAMI_CODE.length-1);
 sequence.press({code:'ArrowUp'});
 for(const [i,code] of KONAMI_CODE.entries())assert.equal(sequence.press({code}).complete,i===KONAMI_CODE.length-1,'an extra initial Up keeps the valid suffix');
});

test('mistakes, input fields and browser shortcuts cannot unlock the ship',()=>{
 for(const interruption of [{code:'KeyW'},{code:'ArrowUp',target:{tagName:'INPUT'}},{code:'ArrowUp',target:{isContentEditable:true}},{code:'ArrowUp',ctrlKey:true},{code:'ArrowUp',metaKey:true},{code:'ArrowUp',altKey:true},{code:'ArrowUp',isComposing:true}]){
  const sequence=createKonamiSequence();KONAMI_CODE.slice(0,4).forEach(code=>sequence.press({code}));
  assert.equal(sequence.press(interruption).consumed,false);
  for(const code of KONAMI_CODE.slice(4))assert.equal(sequence.press({code}).complete,false);
 }
});

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(loader){
 const scene=new Scene(),camera=new PerspectiveCamera(43,16/9,.000001,2000),events=new EventTarget();
 camera.position.set(0,3,10);let active=false,created=0,released=0,loads=0;
 const loadModel=loader||(()=>{loads++;return Promise.resolve({createEnterpriseModel:()=>{created++;const model=new Group();model.userData.dispose=()=>released++;return model}})});
 const egg=createEnterpriseEasterEgg({scene,camera,events,isActive:()=>active,spawnDistance:()=>5,loadModel});
 function key(code,extra={}){const event=new Event('keydown',{cancelable:true});Object.assign(event,{code,...extra});events.dispatchEvent(event);return event}
 return {scene,camera,egg,events,key,setActive:value=>{active=value},type:()=>KONAMI_CODE.forEach(code=>key(code)),counts:()=>({created,released,loads})};
}

test('only active free flight accepts the code, consumes A and creates one stationary ship',async()=>{
 const f=fixture();f.type();await flush();assert.deepEqual(f.counts(),{created:0,released:0,loads:0});
 f.setActive(true);for(const code of KONAMI_CODE)assert.equal(f.key(code).defaultPrevented,true);
 await flush();assert.equal(f.scene.children.length,1);assert.equal(f.counts().created,1);
 const position=f.egg.object.position.clone();assert.ok(position.distanceTo(f.camera.position)-5<1e-9);
 f.camera.position.add(new Vector3(2,0,-1));f.egg.update();assert.deepEqual(f.egg.object.position,position,'ship is in space, not attached to camera');
 f.type();await flush();assert.equal(f.scene.children.length,1);assert.equal(f.counts().loads,1);
 f.egg.dispose();assert.equal(f.scene.children.length,0);
});

test('Escape removes and disposes the ship; returning requires a new full sequence',async()=>{
 const f=fixture();f.setActive(true);f.type();await flush();f.key('Escape');
 assert.equal(f.egg.object,null);assert.equal(f.counts().released,1);
 f.setActive(false);f.egg.update();f.setActive(true);f.egg.update();await flush();assert.equal(f.scene.children.length,0);
 KONAMI_CODE.slice(2).forEach(code=>f.key(code));await flush();assert.equal(f.egg.object,null);
 f.type();await flush();assert.equal(f.counts().created,2);f.egg.dispose();
});

test('mode changes, focus loss and explicit reset clear both the ship and partial code',async()=>{
 for(const leave of [f=>{f.setActive(false);f.egg.update();f.setActive(true)},f=>f.events.dispatchEvent(new Event('blur')),f=>f.egg.reset()]){
  const f=fixture();f.setActive(true);KONAMI_CODE.slice(0,5).forEach(code=>f.key(code));leave(f);
  KONAMI_CODE.slice(5).forEach(code=>f.key(code));await flush();assert.equal(f.egg.object,null);
  f.type();await flush();assert.ok(f.egg.object);leave(f);assert.equal(f.egg.object,null);assert.equal(f.counts().released,1);f.egg.dispose();
 }
});

test('a late download cannot resurrect a ship from a previous flight session',async()=>{
 const pending=[];let created=0;
 const f=fixture(()=>new Promise(resolve=>pending.push(resolve))),module={createEnterpriseModel:()=>{created++;return new Group()}};
 f.setActive(true);f.type();assert.equal(pending.length,1);f.egg.reset();
 f.type();assert.equal(pending.length,2);
 pending[0](module);await flush();assert.equal(created,0);assert.equal(f.egg.object,null);
 pending[1](module);await flush();assert.equal(created,1);assert.equal(f.scene.children.length,1);f.egg.dispose();
});

test('download completion after leaving a flight disposes the decoded model and cannot replace a newer ship',async()=>{
 const pending=[];let released=0;
 const f=fixture(async()=>({createEnterpriseModel:({signal})=>new Promise(resolve=>pending.push({resolve,signal}))}));
 const makeModel=()=>{const model=new Group();model.userData.dispose=()=>released++;return model};
 f.setActive(true);f.type();await flush();assert.equal(pending.length,1);
 f.key('Escape');assert.equal(pending[0].signal.aborted,true);
 f.type();await flush();pending[1].resolve(makeModel());await flush();const current=f.egg.object;
 pending[0].resolve(makeModel());await flush();assert.equal(released,1);assert.equal(f.egg.object,current);assert.equal(f.scene.children.length,1);
 f.egg.dispose();assert.equal(released,2);
});

test('finishing a download in an inactive mode never adds the ship',async()=>{
 let resolveModel,released=0;
 const f=fixture(async()=>({createEnterpriseModel:()=>new Promise(resolve=>{resolveModel=resolve})}));
 f.setActive(true);f.type();await flush();f.setActive(false);
 const model=new Group();model.userData.dispose=()=>released++;
 resolveModel(model);await flush();assert.equal(f.egg.object,null);assert.equal(released,1);assert.equal(f.scene.children.length,0);
 f.egg.dispose();
});

test('Sketchfab Enterprise keeps all source geometry, fits the frame and releases shared resources once',async()=>{
 const data=await readFile(new URL('../public/models/enterprise/enterprise-ncc-1701.glb',import.meta.url));
 assert.equal(data.toString('ascii',0,4),'glTF');assert.equal(data.readUInt32LE(8),data.length,'complete download');
 const json=JSON.parse(data.subarray(20,20+data.readUInt32LE(12)));
 assert.equal(json.asset.extras.source,ENTERPRISE_SOURCE.url);assert.equal(json.images.length,35);
 assert.equal(json.asset.extras.license,'CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)');
 assert.ok(json.images.every(image=>image.bufferView!==undefined&&!image.uri),'textures are bundled, no external requests');
 // The real GLB geometry/material parser runs in Node; browser decoding of the
 // embedded images is covered by the visual check, not an invented geometry.
 let bitmapsClosed=0;
 const image={close:()=>bitmapsClosed++},loader=new GLTFLoader();
 loader.register(()=>({name:'test-image-decoding',loadTexture:()=>Promise.resolve(new Texture(image))}));
 const {scene}=await loader.parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'');
 const model=prepareEnterpriseModel(scene),bounds=new Box3().setFromObject(model),size=bounds.getSize(new Vector3());
 assert.ok(Math.abs(Math.max(size.x,size.y,size.z)-1)<1e-6);
 assert.ok(bounds.getCenter(new Vector3()).length()<1e-6);
 const geometries=new Set(),materials=new Set(),textures=new Set();let disposed=0,triangles=0;
 model.traverse(node=>{
  if(node.geometry)geometries.add(node.geometry);
  if(node.isLine)assert.equal(node.visible,false,'construction edges do not cover the hull');
  for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);
  if(node.isMesh)triangles+=(node.geometry.index?.count??node.geometry.attributes.position.count)/3;
 });
 assert.equal(triangles,147146);
 for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
 for(const value of [...geometries,...materials,...textures])value.addEventListener('dispose',()=>disposed++);
 model.userData.dispose();model.userData.dispose();assert.equal(disposed,geometries.size+materials.size+textures.size);assert.equal(bitmapsClosed,1);
});
