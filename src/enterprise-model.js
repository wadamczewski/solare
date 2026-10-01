import {Box3,Group,Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

export const ENTERPRISE_SOURCE=Object.freeze({
 title:'U.S.S. Enterprise NCC-1701',
 author:'Cpt.Kirk',
 url:'https://sketchfab.com/3d-models/uss-enterprise-ncc-1701-6ad2e79331f445f8bcfc109a47d5287c',
 authorUrl:'https://sketchfab.com/CaptainJamesKirk',
 license:'CC BY 4.0',
 licenseUrl:'https://creativecommons.org/licenses/by/4.0/'
});
export const ENTERPRISE_MODEL_URL=`${import.meta.env?.BASE_URL??'/'}models/enterprise/enterprise-ncc-1701.glb`;

// Each flight owns its decoded model. HTTP caching can reuse the download, but
// GPU resources and ImageBitmaps must not outlive the flight or be shared with
// a later flight that may finish loading before this one is disposed.
export function prepareEnterpriseModel(scene){
 const root=new Group();root.name=ENTERPRISE_SOURCE.title;root.userData.source=ENTERPRISE_SOURCE;
 // The SketchUp export bundles its construction edges as unlit GL_LINES.
 // Displaying them paints a white wireframe over the textured hull. Retain
 // them in the original asset, but render only the complete surface meshes.
 scene.traverse(node=>{if(node.isLine)node.visible=false});
 const box=new Box3().setFromObject(scene),size=box.getSize(new Vector3()),center=box.getCenter(new Vector3());
 const extent=Math.max(size.x,size.y,size.z);
 if(!Number.isFinite(extent)||extent<=0)throw new Error('Enterprise has invalid model bounds');
 const placement=new Group();placement.scale.setScalar(1/extent);placement.position.copy(center).multiplyScalar(-1/extent);
 placement.add(scene);root.add(placement);
 let disposed=false;
 root.userData.dispose=()=>{
  if(disposed)return;disposed=true;
  const geometries=new Set(),materials=new Set(),textures=new Set(),images=new Set();
  root.traverse(node=>{
   if(node.geometry)geometries.add(node.geometry);
   for(const material of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(material);
  });
  for(const material of materials){for(const value of Object.values(material))if(value?.isTexture)textures.add(value);material.dispose()}
  for(const geometry of geometries)geometry.dispose();
  for(const texture of textures){if(texture.source?.data)images.add(texture.source.data);texture.dispose()}
  for(const image of images)image.close?.();
 };
 return root;
}

// This module and the self-contained GLB are loaded only after the Konami code.
// No Sketchfab account, iframe or third-party requests are needed by visitors.
export async function createEnterpriseModel({signal}={}){
 const response=await fetch(ENTERPRISE_MODEL_URL,{signal});
 if(!response.ok)throw new Error(`Enterprise download failed (${response.status})`);
 const data=await response.arrayBuffer();signal?.throwIfAborted();
 const gltf=await new GLTFLoader().parseAsync(data,'');
 const model=prepareEnterpriseModel(gltf.scene);
 if(signal?.aborted){model.userData.dispose();signal.throwIfAborted()}
 return model;
}
