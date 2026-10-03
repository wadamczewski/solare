import test from 'node:test';
import assert from 'node:assert/strict';
import {Mesh,Ray,Raycaster,SphereGeometry,Vector3,MeshBasicMaterial,DoubleSide,IcosahedronGeometry} from 'three';
import {createSurfaceGroundSampler} from '../src/surface-ground-sampler.js';
const direction=(lat,lon)=>new Vector3(Math.cos(lat*Math.PI/180)*Math.cos(lon*Math.PI/180),Math.sin(lat*Math.PI/180),-Math.cos(lat*Math.PI/180)*Math.sin(lon*Math.PI/180));
test('fast wheel contacts match the actual globe triangles and ellipsoidal axes at poles and seams',()=>{
 const mesh=new Mesh(new SphereGeometry(1,32,20),new MeshBasicMaterial({side:DoubleSide})),axes=[1.1,.9,1];mesh.scale.fromArray(axes);mesh.updateMatrixWorld();
 const sample=createSurfaceGroundSampler({mesh,radiusKm:100,axes}),raycaster=new Raycaster();
 for(const [lat,lon] of [[0,0],[36,88],[-89.9,110],[89.9,-150],[0,-179.99],[0,179.99]]){
  const d=direction(lat,lon);raycaster.set(d.clone().multiplyScalar(3),d.clone().negate());
  const hit=raycaster.intersectObject(mesh,false)[0];assert.ok(hit);assert.ok(Math.abs(sample(lat,lon)-hit.point.length()*100)<1e-7,`${lat},${lon}`);
 }
 mesh.geometry.dispose();mesh.material.dispose();
});
test('authored irregular surfaces use their actual triangles and DEM overrides supersede the globe',()=>{
 const mesh=new Mesh(new IcosahedronGeometry(1,3));mesh.geometry.attributes.position.array[0]*=1.12;
 const sample=createSurfaceGroundSampler({mesh,radiusKm:10}),raycaster=new Raycaster();mesh.updateMatrixWorld();
 for(const lat of [-89,0,54])for(const lon of [-178,60,170]){const d=direction(lat,lon);raycaster.set(d.clone().multiplyScalar(3),d.clone().negate());const hit=raycaster.intersectObject(mesh)[0];assert.ok(Math.abs(sample(lat,lon)-hit.point.length()*10)<1e-7);}
 const terrain=createSurfaceGroundSampler({mesh,radiusKm:10,getTopography:()=>({sampleRadius:()=>1.2})});assert.equal(terrain(0,0),12);mesh.geometry.dispose();mesh.material.dispose();
});
