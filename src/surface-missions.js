import * as THREE from 'three';
import {localSurfacePoint} from './surface-texture-frame.js';

// Visible, lightweight representations of hardware left by people and robots.
// They are mounted only in surface view, not into the all-system scene.
const aluminium=new THREE.MeshStandardMaterial({color:'#b8b5a7',roughness:.66,metalness:.55});
const gold=new THREE.MeshStandardMaterial({color:'#b99b55',roughness:.52,metalness:.5});
const lunar=new THREE.MeshStandardMaterial({color:'#837d70',roughness:.91});
const mars=new THREE.MeshStandardMaterial({color:'#b95f38',roughness:.86});
const panel=new THREE.MeshStandardMaterial({color:'#173c70',roughness:.35,metalness:.25,emissive:'#07142b',emissiveIntensity:.18});
const lineMaterial=new THREE.LineBasicMaterial({color:'#cc7249',transparent:true,opacity:.78,depthWrite:false});
const moonLineMaterial=new THREE.LineBasicMaterial({color:'#bdb7aa',transparent:true,opacity:.65,depthWrite:false});

const box=(group,size,material,position=[0,0,0])=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};
const cylinder=(group,radius,length,material,position=[0,0,0],rotation=[0,0,0])=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,10),material);mesh.position.set(...position);mesh.rotation.set(...rotation);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;};

function apolloLander(){
 const group=new THREE.Group();group.name='Apollo Lunar Module';
 cylinder(group,.036,.065,gold,[0,.045,0]);box(group,[.075,.05,.075],aluminium,[0,.1,0]);
 for(const [x,z] of [[-.075,-.075],[-.075,.075],[.075,-.075],[.075,.075]]){cylinder(group,.006,.13,aluminium,[x,.03,z],[z*.6,0,-x*.6]);const foot=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.005,10),lunar);foot.position.set(x,-.025,z);group.add(foot);}
 const antenna=new THREE.Mesh(new THREE.SphereGeometry(.028,12,8,0,Math.PI*2,0,Math.PI/2),aluminium);antenna.rotation.x=Math.PI;antenna.position.set(.025,.15,0);group.add(antenna);
 return group;
}

function rover(name='Mars rover'){
 const group=new THREE.Group();group.name=name;box(group,[.15,.07,.11],mars,[0,.055,0]);
 for(const x of [-.065,0,.065])for(const z of [-.073,.073])cylinder(group,.024,.022,aluminium,[x,.025,z],[Math.PI/2,0,0]);
 const mast=cylinder(group,.009,.14,aluminium,[.02,.15,0]);const camera=new THREE.Mesh(new THREE.BoxGeometry(.05,.028,.035),black());camera.position.set(.02,.22,0);mast.add(camera);
 box(group,[.23,.008,.09],panel,[-.09,.115,0]);return group;
}
const black=()=>new THREE.MeshStandardMaterial({color:'#192029',roughness:.5,metalness:.55});

function vikingLander(){
 const group=new THREE.Group();group.name='Viking 1 lander';
 cylinder(group,.095,.07,aluminium,[0,.07,0]);box(group,[.15,.05,.15],gold,[0,.12,0]);
 for(const [x,z] of [[-.12,-.1],[-.12,.1],[.12,-.1],[.12,.1]])cylinder(group,.008,.18,aluminium,[x,.02,z],[z*.5,0,-x*.5]);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.08,16,9,0,Math.PI*2,0,Math.PI/2),aluminium);dish.rotation.x=Math.PI;dish.position.set(.02,.22,0);group.add(dish);
 cylinder(group,.01,.18,aluminium,[.11,.14,.02],[0,0,.9]);return group;
}

const SITE_DATA={
 moon:[
  {name:'Apollo 11',latitude:.674,longitude:23.473,model:apolloLander},
  {name:'Apollo 12',latitude:-3.012,longitude:-23.421,model:apolloLander},
  {name:'Apollo 14',latitude:-3.645,longitude:-17.471,model:apolloLander},
  {name:'Apollo 15',latitude:26.132,longitude:3.634,model:apolloLander},
  {name:'Apollo 16',latitude:-8.973,longitude:15.501,model:apolloLander},
  {name:'Apollo 17',latitude:20.191,longitude:30.772,model:apolloLander}
 ],
 mars:[
  {name:'Viking 1',latitude:22.48,longitude:-47.97,model:vikingLander},
  {name:'Viking 2',latitude:47.66,longitude:134.28,model:vikingLander},
  {name:'Sojourner',latitude:19.33,longitude:-33.22,model:()=>rover('Sojourner rover'),route:[[19.33,-33.22],[19.331,-33.219],[19.333,-33.218]]},
  {name:'Spirit',latitude:-14.57,longitude:175.47,model:()=>rover('Spirit rover'),route:[[-14.57,175.47],[-14.569,175.49],[-14.566,175.52]]},
  {name:'Opportunity',latitude:-1.95,longitude:-5.53,model:()=>rover('Opportunity rover'),route:[[-1.95,-5.53],[-1.948,-5.51],[-1.944,-5.48]]},
  {name:'Curiosity',latitude:-4.59,longitude:137.44,model:()=>rover('Curiosity rover'),route:[[-4.59,137.44],[-4.588,137.46],[-4.584,137.49]]},
  {name:'Perseverance',latitude:18.44,longitude:77.45,model:()=>rover('Perseverance rover'),route:[[18.44,77.45],[18.443,77.47],[18.448,77.50]]}
 ]
};
export const SURFACE_MISSION_SITES=SITE_DATA;

function placeAtSurface(group,latitude,longitude,offset=.002){
 const normal=new THREE.Vector3(...localSurfacePoint(latitude,longitude)).normalize();
 group.position.copy(normal).multiplyScalar(1+offset);
 group.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
 group.scale.setScalar(.24);return group;
}
function addRoute(parent,route,material){
 const positions=route.map(([latitude,longitude])=>new THREE.Vector3(...localSurfacePoint(latitude,longitude)).multiplyScalar(1.003));
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),material);line.name='Recorded rover route';parent.add(line);
}

export function attachSurfaceMissionAssets(view,body){
 if(!view?.mesh)return null;detachSurfaceMissionAssets(view);
 const sites=SITE_DATA[body.key==='moon'&&body.name==='Księżyc'?'moon':body.key];if(!sites?.length)return null;
 const root=new THREE.Group();root.name='Human and robotic surface missions';
 for(const site of sites){const model=placeAtSurface(site.model(),site.latitude,site.longitude);model.userData.mission=site.name;root.add(model);if(site.route)addRoute(root,site.route,body.key==='mars'?lineMaterial:moonLineMaterial);}
 view.mesh.add(root);view.surfaceMissionAssets=root;return root;
}
export function detachSurfaceMissionAssets(view){
 const root=view?.surfaceMissionAssets;if(!root)return;root.removeFromParent();root.traverse(node=>node.geometry?.dispose?.());view.surfaceMissionAssets=null;
}
