import test from 'node:test';
import assert from 'node:assert/strict';
import {BoxGeometry,Group,Mesh,MeshStandardMaterial,PerspectiveCamera,Vector3} from 'three';
import {createSurfaceVehicleDrive} from '../src/surface-vehicle-drive.js';
import {createSurfaceVehicleRig} from '../src/surface-vehicle-rig.js';
import {createSurfaceVehicleCamera} from '../src/surface-vehicle-camera.js';

function fixture(){
 const model=new Group(),body=new Group();model.add(body);body.rotation.y=.05;
 const wheels=[-.22,.22].flatMap(x=>[-.34,0,.34].map(z=>{
  const node=new Mesh(new BoxGeometry(.06,.16,.16),new MeshStandardMaterial());node.name='Test wheel';body.add(node);
  node.position.set(x,.08,z);return {node,center:[x,.08,z],radius:.08,steerable:z<0};
 }));
 const arm=new Mesh(new BoxGeometry(.12,.01,.01),new MeshStandardMaterial());body.add(arm);
 const drive=createSurfaceVehicleDrive({radiusKm:6371,lengthKm:.06,wheels});
 const rig=createSurfaceVehicleRig({model,wheels,brakeLights:[{position:[-.2,.15,.45]},{position:[.2,.15,.45]}],exhausts:[{position:[-.15,.12,.48]},{position:[.15,.12,.48]}],suspensionLinks:[{node:arm,wheelIndex:0,pivot:[-.1,.12,-.34],wheelPoint:[-.22,.08,-.34]}]});
 return {model,body,wheels,drive,rig,arm};
}

test('rig preserves authored geometry and animates six wheels, arms, brake lights and blue exhaust',()=>{
 const f=fixture(),geometry=f.wheels[0].node.geometry,material=f.wheels[0].node.material;
 f.drive.update(.1,{throttle:1,steer:1});let s=f.drive.state;s.wheelTravel[0]=.025;f.rig.apply(s,.001);
 assert.equal(f.wheels[0].node.geometry,geometry);assert.equal(f.wheels[0].node.material,material);
 const pivots=f.rig.root.getObjectByName('Active wheel suspension');
 assert.equal(pivots.children.length,7);assert.ok(Math.abs(pivots.children[0].position.y-.105)<1e-12);
 assert.equal(pivots.children[0].children[0].rotation.y,-s.wheelSteer[0]);assert.equal(pivots.children[0].children[0].children[0].rotation.x,s.wheelSpin[0]);
 assert.ok(Math.abs(pivots.children[6].quaternion.z)>.01);
 const lights=f.rig.root.getObjectByName('Vehicle brake and exhaust lights');assert.equal(lights.children.filter(light=>light.visible).length,2);
 assert.ok(lights.children[2].material.color.b>lights.children[2].material.color.r);
 f.drive.update(.1,{brake:true});f.rig.apply(f.drive.state);assert.ok(lights.children[0].visible);assert.ok(lights.children[0].material.color.r>2);
 for(let i=0;i<180;i++)f.drive.update(1/60,{brake:true});f.rig.apply(f.drive.state);assert.equal(lights.children[2].visible,false);
 f.rig.dispose();
});

test('rig releases its GPU effects once and restores all source parts for model disposal',()=>{
 const f=fixture(),lights=f.rig.root.getObjectByName('Vehicle brake and exhaust lights');let materials=0,textures=0;
 for(const sprite of lights.children)sprite.material.addEventListener('dispose',()=>materials++);
 lights.children[0].material.map.addEventListener('dispose',()=>textures++);
 f.rig.dispose();f.rig.dispose();assert.equal(materials,4);assert.equal(textures,1);
 assert.ok(f.wheels.every(w=>w.node.parent===f.body));assert.equal(f.arm.parent,f.body);assert.equal(f.model.parent,null);
 assert.equal(f.rig.root.parent,null);assert.equal(f.rig.root.children.length,1);
});

test('chase camera fits portrait screens, follows body translation/rotation and clears relief',()=>{
 const f=fixture(),bodyFrame=new Group(),camera=new PerspectiveCamera(70,.5,.001,1000);
 bodyFrame.position.set(12,2,5);bodyFrame.rotation.z=.3;
 const chase=createSurfaceVehicleCamera({camera,bodyFrame,sampleRadiusKm:()=>6371});
 f.rig.apply(f.drive.state,.001);bodyFrame.add(f.rig.root);chase.update(f.drive.state,.001,.02);
 const point=f.rig.root.getWorldPosition(new Vector3()),offset=camera.position.clone().sub(point);
 assert.ok(offset.length()>.00012,'whole vehicle fits a narrow viewport');
 const before=camera.position.clone();bodyFrame.position.x+=3;chase.update(f.drive.state,.001,0);assert.ok(Math.abs(camera.position.x-before.x-3)<1e-10);
 f.rig.root.updateWorldMatrix(true,false);
 for(const x of [-.3,.3])for(const z of [-.5,.5]){
  const corner=new Vector3(x,.15,z).applyMatrix4(f.rig.root.matrixWorld).project(camera);assert.ok(Math.abs(corner.x)<1&&Math.abs(corner.y)<1);
 }
 chase.look(200,50);chase.update(f.drive.state,.001,.25);assert.ok(camera.position.distanceTo(before)>2);
 const local=camera.position.clone();bodyFrame.worldToLocal(local);assert.ok(local.length()>6.371);
 f.rig.dispose();
});

test('bad wheel references fail before the asset tree is changed',()=>{
 const model=new Group(),wheel=new Group();model.add(wheel);
 assert.throws(()=>createSurfaceVehicleRig({model,wheels:[{node:wheel,center:[0,0,0],radius:0}]}));assert.equal(wheel.parent,model);
 assert.throws(()=>createSurfaceVehicleRig({model,wheels:[{node:wheel,center:[0,0,0],radius:.1}],brakeLights:[{position:[NaN,0,0]}]}));assert.equal(wheel.parent,model);
});
