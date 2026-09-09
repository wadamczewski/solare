import * as THREE from 'three';
import {G} from './physics.js';

export const ASTEROID_COUNT = 1800;

// The main belt is a population of small rocky bodies, rather than a painted
// ring. Their radii are enlarged only enough to preserve a readable belt at
// solar-system-map distance; each body remains much smaller than a planet.
export function createAsteroidBelt({count=ASTEROID_COUNT,random=Math.random}={}){
 const geometry=new THREE.IcosahedronGeometry(1,0);
 const material=new THREE.MeshStandardMaterial({color:'#a69d8e',roughness:1,metalness:0,vertexColors:true});
 const mesh=new THREE.InstancedMesh(geometry,material,count);
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.castShadow=false;
 mesh.receiveShadow=true;
 mesh.frustumCulled=false;
 const data=[];
 const color=new THREE.Color();
 for(let index=0;index<count;index++){
  const r=2.12+random()*1.08,t=random()*Math.PI*2,y=(random()-.5)*.15;
  data.push({index,r,t,y,spin:(random()-.5)*.12,scale:.006+random()*.018,stretch:.72+random()*.52,rotation:random()*Math.PI*2});
  color.setHSL(.065+random()*.055,.08+random()*.18,.36+random()*.28);
  mesh.setColorAt(index,color);
 }
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),matrix=new THREE.Matrix4();
 const update=(elapsed,mapped,compressed=true,density=1)=>{
  const active=Math.min(count,Math.max(1,Math.round(count*density)));
  // The belt remains a recognisable population at map scale; close inspection
  // restores every instance without rebuilding geometry or losing detail.
  mesh.count=active;
  for(let index=0;index<active;index++){
   const asteroid=data[index];
   const angle=asteroid.t+elapsed*Math.sqrt(G/asteroid.r**3);
   const raw=[asteroid.r*Math.cos(angle),asteroid.y,asteroid.r*Math.sin(angle)];
   position.copy(compressed?mapped(raw):new THREE.Vector3(...raw).multiplyScalar(6));
   quaternion.setFromEuler(new THREE.Euler(asteroid.rotation+elapsed*asteroid.spin,angle*.37,asteroid.rotation*.61));
   scale.set(asteroid.scale*asteroid.stretch,asteroid.scale,asteroid.scale*(1.25/asteroid.stretch));
   matrix.compose(position,quaternion,scale);mesh.setMatrixAt(asteroid.index,matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
 };
 return {mesh,data,update};
}
