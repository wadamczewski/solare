import * as THREE from 'three';

// Each visual keeps the published silhouette readable at the deliberately
// enlarged map scale.  Dimensions are proportional; the parent mesh applies
// the app's visibility scale, not a fictional physical size.
const metal=new THREE.MeshStandardMaterial({color:'#bfc4c7',roughness:.48,metalness:.72});
const gold=new THREE.MeshStandardMaterial({color:'#cbb16a',roughness:.34,metalness:.78});
const solar=new THREE.MeshStandardMaterial({color:'#183d71',roughness:.38,metalness:.3,emissive:'#07172d',emissiveIntensity:.3,side:THREE.DoubleSide});
const red=new THREE.MeshStandardMaterial({color:'#b62424',roughness:.28,metalness:.52});
const black=new THREE.MeshStandardMaterial({color:'#10151b',roughness:.22,metalness:.6});
const white=new THREE.MeshStandardMaterial({color:'#e5e5df',roughness:.75});
const addBox=(group,size,material,position=[0,0,0])=>{const mesh=new THREE.Mesh(new THREE.BoxGeometry(...size),material);mesh.position.set(...position);group.add(mesh);return mesh;};
const addCylinder=(group,radius,length,material,position=[0,0,0],rotation=[0,0,0])=>{const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,12),material);mesh.position.set(...position);mesh.rotation.set(...rotation);group.add(mesh);return mesh;};

function voyager(){
 const group=new THREE.Group();group.name='Voyager 1 spacecraft model';
 addBox(group,[.32,.25,.24],metal);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.34,24,12,0,Math.PI*2,0,Math.PI/2),gold);dish.rotation.x=Math.PI;dish.position.set(.05,.23,0);group.add(dish);
 addCylinder(group,.025,.85,metal,[-.37,-.05,0],[0,0,Math.PI/2]);
 for(const z of [-.18,.18]){addCylinder(group,.055,.38,black,[-.54,-.05,z],[0,0,Math.PI/2]);}
 addCylinder(group,.018,1.08,metal,[.1,-.45,.02],[Math.PI/2,0,.15]);
 addCylinder(group,.012,.58,metal,[.22,.24,0],[0,0,-.72]);
 group.rotation.set(.32,.3,-.2);return group;
}

function roadster(){
 const group=new THREE.Group();group.name='Tesla Roadster and Starman model';
 addBox(group,[.86,.2,.4],red,[0,-.04,0]);
 const hood=addBox(group,[.3,.1,.36],red,[.26,.11,0]);hood.rotation.z=-.16;
 const cabin=new THREE.Mesh(new THREE.BoxGeometry(.34,.17,.34),new THREE.MeshStandardMaterial({color:'#16222b',roughness:.08,metalness:.2,transparent:true,opacity:.72}));cabin.position.set(-.12,.13,0);group.add(cabin);
 for(const x of [-.28,.3])for(const z of [-.23,.23])addCylinder(group,.105,.05,black,[x,-.15,z],[Math.PI/2,0,0]);
 const body=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.14,4,10),white);body.position.set(-.13,.19,.01);body.rotation.z=Math.PI/2;group.add(body);
 const helmet=new THREE.Mesh(new THREE.SphereGeometry(.072,14,10),white);helmet.position.set(-.23,.25,.01);group.add(helmet);
 group.rotation.set(.2,-.6,.12);return group;
}

function iss(){
 const group=new THREE.Group();group.name='International Space Station model';
 addCylinder(group,.11,.9,white,[0,0,0],[0,0,Math.PI/2]);
 addCylinder(group,.14,.25,metal,[-.3,0,0],[0,0,Math.PI/2]);
 addCylinder(group,.14,.25,metal,[.3,0,0],[0,0,Math.PI/2]);
 addBox(group,[1.9,.045,.05],metal,[0,.02,0]);
 for(const x of [-.66,-.22,.22,.66]){
  addBox(group,[.34,.018,.52],solar,[x,.02,.29]);
  addBox(group,[.34,.018,.52],solar,[x,.02,-.29]);
 }
 addCylinder(group,.06,.5,metal,[0,.2,0],[0,0,0]);
 group.rotation.set(.35,-.25,.15);return group;
}

function newHorizons(){
 const group=new THREE.Group();group.name='New Horizons spacecraft model';
 addBox(group,[.32,.18,.28],black);
 addBox(group,[.18,.04,.64],solar,[-.05,.01,.34]);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.23,20,10,0,Math.PI*2,0,Math.PI/2),white);dish.rotation.x=Math.PI;dish.position.set(.12,.2,0);group.add(dish);
 addCylinder(group,.018,.75,metal,[-.13,.02,-.32],[Math.PI/2,0,.2]);
 addCylinder(group,.024,.44,gold,[.19,-.14,.03],[0,0,.4]);
 group.rotation.set(.2,-.5,.18);return group;
}

function viking(){
 const group=new THREE.Group();group.name='Viking 1 orbiter and lander model';
 addBox(group,[.52,.14,.34],metal);
 addBox(group,[1.3,.025,.38],solar,[0,.01,0]);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.16,18,10,0,Math.PI*2,0,Math.PI/2),white);dish.rotation.x=Math.PI;dish.position.set(.05,.15,0);group.add(dish);
 addCylinder(group,.035,.48,gold,[-.2,-.17,.02],[0,0,.5]);
 group.rotation.set(.18,.3,-.14);return group;
}

export function createSpacecraftVisual(type){
 if(type==='voyager-1')return voyager();
 if(type==='tesla-roadster')return roadster();
 if(type==='iss')return iss();
 if(type==='new-horizons')return newHorizons();
 if(type==='viking-1')return viking();
 return new THREE.Group();
}
