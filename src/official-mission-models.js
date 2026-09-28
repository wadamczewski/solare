import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

// Public NASA 3D Resources assets.  Each is loaded only after its object is
// made visible; the parsed source scene is cached and cloned for later sites.
// NASA makes this collection free to download and use (see docs/model-sources).
export const OFFICIAL_MODEL_SOURCES=Object.freeze({
 voyager:{url:'/models/missions/voyager-nasa.glb',source:'NASA 3D Resources · Voyager Probe (A)'},
 iss:{url:'/models/missions/iss-nasa.glb',source:'NASA 3D Resources · International Space Station (ISS) (B)'},
 viking:{url:'/models/missions/viking-lander-nasa.glb',source:'NASA 3D Resources · Viking Lander'},
 apollo:{url:'/models/missions/apollo-lm-nasa.glb',source:'NASA 3D Resources · Apollo Lunar Module'},
 perseverance:{url:'/models/missions/perseverance-nasa.glb',source:'NASA 3D Resources · Mars 2020 Perseverance Rover'},
 opportunity:{url:'/models/missions/opportunity-nasa.glb',source:'NASA 3D Resources · Mars Exploration Rover Opportunity (MER-B)'}
});

const loader=new GLTFLoader(),loaded=new Map(),loading=new Map();
function sourceScene(key){
 if(loaded.has(key))return Promise.resolve(loaded.get(key));
 if(loading.has(key))return loading.get(key);
 const spec=OFFICIAL_MODEL_SOURCES[key];if(!spec)return Promise.reject(new Error(`Unknown official model: ${key}`));
 const pending=new Promise((resolve,reject)=>loader.load(spec.url,gltf=>{loaded.set(key,gltf.scene);resolve(gltf.scene)},undefined,reject));
 loading.set(key,pending);return pending;
}
function fit(scene,span){
 const box=new THREE.Box3().setFromObject(scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const largest=Math.max(size.x,size.y,size.z,1e-6);scene.scale.setScalar(span/largest);scene.position.sub(center).multiplyScalar(span/largest);
 scene.traverse(node=>{if(node.isMesh){node.castShadow=true;node.receiveShadow=true;node.frustumCulled=true;}});
 return scene;
}

export function mountOfficialMissionModel(host,key,{span=1,rotation=[0,0,0],onReady}={}){
 host.userData.officialModel=OFFICIAL_MODEL_SOURCES[key]?.source||'';
 sourceScene(key).then(source=>{
  if(!host.parent)return;
  const scene=fit(source.clone(true),span);scene.rotation.set(...rotation);host.clear();host.add(scene);host.userData.modelReady=true;onReady?.(scene);
 }).catch(()=>{host.userData.modelReady=false;});
 return host;
}
