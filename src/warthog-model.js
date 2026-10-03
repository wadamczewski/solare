import {Box3,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const WARTHOG_SOURCE=Object.freeze({title:'Warthog - Standard edition',author:'McCarthy3D',url:'https://sketchfab.com/3d-models/warthog-standard-edition-e2d23c845eb34df2a286915890bb621a',authorUrl:'https://sketchfab.com/joshuawatt811',license:'CC BY 4.0',licenseUrl:'https://creativecommons.org/licenses/by/4.0/'});
export const WARTHOG_MODEL_URL=`${import.meta.env?.BASE_URL??'/'}models/warthog/warthog.glb`;
export function prepareWarthogModel(scene){
 const model=new Group();model.name=WARTHOG_SOURCE.title;model.userData.source=WARTHOG_SOURCE;
 // The source includes a presentation floor. Retain ownership for disposal,
 // but never render or include it in the vehicle's bounds or tyre contacts.
 const floor=scene.getObjectByName('Globals');if(floor)floor.visible=false;
 const hull=scene.getObjectByName('Warthog_LP');if(!hull)throw new Error('Missing Warthog hull');
 scene.updateMatrixWorld(true);
 const box=new Box3().setFromObject(hull),turret=scene.getObjectByName('Warthog_Turret_LP');if(turret)box.union(new Box3().setFromObject(turret));
 const size=box.getSize(new Vector3()),center=box.getCenter(new Vector3()),extent=Math.max(size.x,size.y,size.z);
 if(!(extent>0&&Number.isFinite(extent)))throw new Error('Invalid Warthog bounds');
 const placement=new Group();placement.scale.setScalar(1/extent);placement.position.set(-center.x/extent,-box.min.y/extent,-center.z/extent);
 const orientation=new Group();orientation.rotation.y=Math.PI;placement.add(scene);orientation.add(placement);model.add(orientation);model.updateMatrixWorld(true);
 // The FBX has explicit, complete wheel subtrees (tyres + hubcaps). Front is
 // source +Z, now canonical -Z. Pivots come from each tyre's authored bounds.
 const wheels=['Wheel_01','Wheel_02','Wheel_03','Wheel_04'].map(name=>{
  const node=scene.getObjectByName(name);if(!node)throw new Error(`Missing ${name}`);
  const tyre=node.getObjectByName('Tyre')??node,box=new Box3().setFromObject(tyre),center=box.getCenter(new Vector3()),size=box.getSize(new Vector3());
  return {node,center:center.toArray(),radius:(size.y+size.z)/4,steerable:center.z<0};
 });
 const rootNode=scene.getObjectByName('RootNode');
 // Measured openings in original FBX coordinates, transformed using the
 // complete export/normalisation frame, rather than added floating lamps.
 const anchor=(x,y,z,size)=>({position:rootNode.localToWorld(new Vector3(x,y,z)).toArray(),size});
 const brakeLights=[anchor(-123,180,-289,.06),anchor(123,180,-289,.06)];
 const exhausts=[anchor(-16,132,-244,.12),anchor(16,132,-244,.12)];
 const suspensionLinks=[];
 for(const side of ['L_Suspension','R_Suspension']){
  const group=scene.getObjectByName(side);if(!group)continue;
  for(const name of ['LF_Suspension','LR_Suspension','LF_Spring_02','LR_Spring_01']){
   const node=group.children.find(child=>child.name===name||child.name.startsWith(`${name}_`));if(!node)continue;
   const box=new Box3().setFromObject(node),c=box.getCenter(new Vector3());
   let wheelIndex=0,best=Infinity;for(let i=0;i<wheels.length;i++){const w=wheels[i].center,d=(c.x-w[0])**2+(c.z-w[2])**2;if(d<best){best=d;wheelIndex=i;}}
   const pivot=c.clone();pivot.x=side==='L_Suspension'?box.max.x:box.min.x;
   if(name.includes('Spring'))pivot.y=box.max.y;
   suspensionLinks.push({node,wheelIndex,pivot:pivot.toArray(),wheelPoint:wheels[wheelIndex].center});
  }
 }
 let disposed=false;
 const dispose=()=>{
  if(disposed)return;disposed=true;
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
  model.traverse(node=>{if(node.geometry)geometries.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);});
  for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose();}
  for(const geometry of geometries)geometry.dispose();
  for(const texture of textures){if(texture.source?.data)images.add(texture.source.data);texture.dispose();}for(const image of images)image.close?.();
 };
 return {model,wheels,brakeLights,exhausts,suspensionLinks,dispose};
}
export async function createWarthogModel({signal}={}){
 const response=await fetch(WARTHOG_MODEL_URL,{signal});if(!response.ok)throw new Error(`Warthog download failed (${response.status})`);
 const data=await response.arrayBuffer();signal?.throwIfAborted();
 const gltf=await new GLTFLoader().parseAsync(data,WARTHOG_MODEL_URL.slice(0,WARTHOG_MODEL_URL.lastIndexOf('/')+1));const asset=prepareWarthogModel(gltf.scene);
 if(signal?.aborted){asset.dispose();signal.throwIfAborted();}return asset;
}
