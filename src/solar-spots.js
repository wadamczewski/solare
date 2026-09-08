import * as THREE from 'three';

// White-light solar observations show irregular spot groups: a cooler, dark
// umbra nested in a broader, warmer penumbra, often accompanied by pores.
const regions=[
 {lon:-.72,lat:.12,r:.072,pores:[[-1.5,.55,.26],[1.2,-.35,.19]]},
 {lon:-.13,lat:-.19,r:.046,pores:[[1.35,.22,.18]]},
 {lon:.36,lat:.17,r:.093,pores:[[-1.45,-.28,.23],[1.35,.48,.16],[1.82,-.7,.12]]},
 {lon:.77,lat:-.08,r:.053,pores:[[-1.25,.58,.17]]},
 {lon:1.18,lat:.27,r:.039,pores:[]}
];
const disc=(seed,segments=40)=>{
 const geometry=new THREE.CircleGeometry(1,segments),position=geometry.attributes.position;
 for(let i=1;i<position.count;i++){const x=position.getX(i),y=position.getY(i),angle=Math.atan2(y,x);const wobble=1+.11*Math.sin(angle*3+seed)+.055*Math.sin(angle*7-seed*1.7);position.setXY(i,x*wobble,y*wobble)}
 position.needsUpdate=true;return geometry;
};
const normalAt=({lon,lat})=>new THREE.Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),Math.cos(lat)*Math.sin(lon));
const place=(group,normal,distance)=>{group.position.copy(normal).multiplyScalar(distance);group.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal)};
const material=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,toneMapped:false,side:THREE.FrontSide});

export function createSolarSpots(){
 const root=new THREE.Group(),materials=[];
 for(let index=0;index<regions.length;index++){
  const region=regions[index],normal=normalAt(region),group=new THREE.Group();place(group,normal,1.006);
  const penumbra=material('#8d5e38',.20),umbra=material('#1e1008',.46);materials.push({material:penumbra,base:.20},{material:umbra,base:.46});
  const outer=new THREE.Mesh(disc(index),penumbra);outer.scale.setScalar(region.r);group.add(outer);
  const core=new THREE.Mesh(disc(index+9),umbra);core.position.z=.0015;core.scale.setScalar(region.r*.47);group.add(core);
  for(const [x,y,size] of region.pores){const pore=new THREE.Mesh(disc(index+17),umbra.clone());pore.material.opacity=.34;materials.push({material:pore.material,base:.34});pore.position.set(x*region.r,y*region.r,.002);pore.scale.setScalar(region.r*size);group.add(pore)}
  root.add(group);
 }
 root.userData.spotMaterials=materials;
 return root;
}

export function setSolarSpotBrightness(root,brightnessPercent){
 if(!root)return;const scale=Math.max(.05,Math.min(1,brightnessPercent/100)),contrast=.35+.65*(1-Math.sqrt(scale));
 for(const {material,base} of root.userData.spotMaterials||[])material.opacity=Math.min(.94,base*(.55+contrast));
}
