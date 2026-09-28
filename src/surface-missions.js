import * as THREE from 'three';
import {localSurfacePoint} from './surface-texture-frame.js';
import {mountOfficialMissionModel} from './official-mission-models.js';

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
 mountOfficialMissionModel(group,'apollo',{span:.24,rotation:[0,.35,0]});return group;
}

function rover(name='Mars rover',variant='solar'){
 const group=new THREE.Group();group.name=name;box(group,[.15,.07,.11],mars,[0,.055,0]);
 for(const x of [-.065,0,.065])for(const z of [-.073,.073])cylinder(group,.024,.022,aluminium,[x,.025,z],[Math.PI/2,0,0]);
 const mast=cylinder(group,.009,.14,aluminium,[.02,.15,0]);const camera=new THREE.Mesh(new THREE.BoxGeometry(.05,.028,.035),black());camera.position.set(.02,.22,0);mast.add(camera);
 if(variant==='nuclear'){cylinder(group,.035,.21,black(),[-.12,.1,0],[0,0,Math.PI/2]);for(const z of [-.07,.07])cylinder(group,.009,.27,aluminium,[.04,.11,z],[0,0,Math.PI/2]);}
 else{box(group,[.23,.008,.09],panel,[-.09,.115,0]);if(variant==='mer'){box(group,[.18,.007,.07],panel,[.11,.115,0]);}}
 return group;
}
const black=()=>new THREE.MeshStandardMaterial({color:'#192029',roughness:.5,metalness:.55});

function vikingLander(){
 const group=new THREE.Group();group.name='Viking 1 lander';
 cylinder(group,.095,.07,aluminium,[0,.07,0]);box(group,[.15,.05,.15],gold,[0,.12,0]);
 for(const [x,z] of [[-.12,-.1],[-.12,.1],[.12,-.1],[.12,.1]])cylinder(group,.008,.18,aluminium,[x,.02,z],[z*.5,0,-x*.5]);
 const dish=new THREE.Mesh(new THREE.SphereGeometry(.08,16,9,0,Math.PI*2,0,Math.PI/2),aluminium);dish.rotation.x=Math.PI;dish.position.set(.02,.22,0);group.add(dish);
 cylinder(group,.01,.18,aluminium,[.11,.14,.02],[0,0,.9]);mountOfficialMissionModel(group,'viking',{span:.28,rotation:[0,.2,0]});return group;
}

const SITE_DATA={
 moon:[
  {name:'Apollo 11',landed:'1969-07-20T20:17:40Z',latitude:.674,longitude:23.473,model:apolloLander},
  {name:'Apollo 12',landed:'1969-11-19T06:54:35Z',latitude:-3.012,longitude:-23.421,model:apolloLander},
  {name:'Apollo 14',landed:'1971-02-05T09:18:11Z',latitude:-3.645,longitude:-17.471,model:apolloLander},
  {name:'Apollo 15',landed:'1971-07-30T22:16:29Z',latitude:26.132,longitude:3.634,model:apolloLander},
  {name:'Apollo 16',landed:'1972-04-21T02:23:35Z',latitude:-8.973,longitude:15.501,model:apolloLander},
  {name:'Apollo 17',landed:'1972-12-11T19:54:57Z',latitude:20.191,longitude:30.772,model:apolloLander}
 ],
 mars:[
  {name:'Viking 1',landed:'1976-07-20T11:53:06Z',latitude:22.48,longitude:-47.97,model:vikingLander},
  {name:'Viking 2',landed:'1976-09-03T22:37:50Z',latitude:47.66,longitude:134.28,model:vikingLander},
  {name:'Sojourner',landed:'1997-07-04T16:56:55Z',latitude:19.33,longitude:-33.22,model:()=>rover('Sojourner rover'),route:[[19.33,-33.22],[19.331,-33.219],[19.333,-33.218]]},
  {name:'Spirit',landed:'2004-01-04T04:35:00Z',latitude:-14.57,longitude:175.47,model:()=>rover('Spirit rover','mer'),route:[[-14.57,175.47],[-14.569,175.49],[-14.566,175.52]]},
  {name:'Opportunity',landed:'2004-01-25T05:05:00Z',latitude:-1.95,longitude:-5.53,model:()=>{const group=rover('Opportunity rover','mer');mountOfficialMissionModel(group,'opportunity',{span:.28,rotation:[0,.4,0]});return group;},route:[[-1.95,-5.53],[-1.948,-5.51],[-1.944,-5.48]]},
  {name:'Curiosity',landed:'2012-08-06T05:17:57Z',latitude:-4.59,longitude:137.44,model:()=>rover('Curiosity rover','nuclear'),route:[[-4.59,137.44],[-4.588,137.46],[-4.584,137.49]]},
  {name:'Perseverance',landed:'2021-02-18T20:55:00Z',latitude:18.44,longitude:77.45,model:()=>{const group=rover('Perseverance rover','nuclear');mountOfficialMissionModel(group,'perseverance',{span:.3,rotation:[0,.4,0]});return group;},route:[[18.44,77.45],[18.443,77.47],[18.448,77.50]]}
 ]
};
export const SURFACE_MISSION_SITES=SITE_DATA;

// Every model is normalised to a largest dimension of 1 with its base on the
// ground, then drawn at one display size per body. They are deliberately
// enlarged - a 3 m lander would be under a pixel from the eye height the
// surface view keeps above its kilometre-resolution globe - but no longer to
// the 100-250 km they had before, which put the camera inside them.
export const MISSION_DISPLAY_SPAN=.0012; // of the body's radius (Moon 2.1 km, Mars 4.1 km)
const SHELL=1.000003; // the streamed colour tiles' shell (surface-tiles.js)
function normalise(model){
 const parent=model.parent;if(parent)parent.remove(model);
 model.position.set(0,0,0);model.scale.setScalar(1);model.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 const largest=Math.max(size.x,size.y,size.z,1e-9),scale=1/largest;
 model.scale.setScalar(scale);model.position.set(-center.x*scale,-box.min.y*scale,-center.z*scale);
 model.userData.normalisedSize=[size.x*scale,size.y*scale,size.z*scale];
 // Kilometre-scale hardware under a solar shadow map sized for planets only
 // gets self-shadowing acne; it casts shadows but does not receive them.
 model.traverse(node=>{if(node.isMesh)node.receiveShadow=false});
 if(parent)parent.add(model);return model;
}
// The surface view stands its observer on the line from the body's centre
// through (latitude, longitude), at the ellipsoid's scaled radius; the model
// is put on that same line, so on a flattened planet (Mars: 0.6 %) it is not
// shifted by the 10-15 km the plain scaled point would be.
function placeAtSurface(model,latitude,longitude,span,axes=[1,1,1]){
 const holder=new THREE.Group(),normal=new THREE.Vector3(...localSurfacePoint(latitude,longitude)).normalize();
 const radial=Math.hypot(normal.x*axes[0],normal.y*axes[1],normal.z*axes[2]);
 holder.position.set(normal.x*radial/axes[0],normal.y*radial/axes[1],normal.z*radial/axes[2]).multiplyScalar(SHELL);
 holder.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),normal);
 holder.scale.setScalar(span);holder.add(normalise(model));
 // A NASA model replaces the placeholder once it has loaded; it is measured
 // and seated on the ground again.
 model.addEventListener('model-ready',()=>normalise(model));
 return holder;
}
// Sites whose hardware had landed by `date`.
export function missionSitesFor(body,date=new Date()){
 const sites=SITE_DATA[body?.key==='moon'&&['Księżyc','Moon'].includes(body.name)?'moon':body?.key]||[];
 const time=date instanceof Date?date.getTime():Number(date);
 return sites.filter(site=>!(Date.parse(site.landed)>time));
}
// Known-place entries for the surface view's list, one per landed site.
export const missionPlacesFor=(body,date)=>missionSitesFor(body,date).map(site=>({name:site.name,latitude:site.latitude,longitude:site.longitude,mission:true,landed:site.landed}));

// Where to stand to see a site's whole model: a camera distance at which the
// model's bounding sphere fits the narrower of the two fields of view, a
// little above it and looking down onto it, placed on the side the model is
// seen from (`viewAzimuth` is the direction the camera looks, 0 = north).
export function missionFraming({latitude,longitude,radiusKm,fovDeg=50,aspect=16/9,viewAzimuth=315,size=[1,1,1],spanFraction=MISSION_DISPLAY_SPAN,elevationDeg=16,margin=1.12}){
 const spanKm=radiusKm*spanFraction,[sx,sy,sz]=size.map(value=>value*spanKm);
 const sphere=Math.hypot(sx,sy,sz)/2,vertical=fovDeg*Math.PI/180,horizontal=2*Math.atan(Math.tan(vertical/2)*aspect);
 const distance=sphere*margin/Math.sin(Math.min(vertical,horizontal)/2),elevation=elevationDeg*Math.PI/180;
 const ground=distance*Math.cos(elevation),eyeHeightKm=sy/2+distance*Math.sin(elevation);
 // The camera stands `ground` km behind the model, against the view direction.
 const bearing=(viewAzimuth+180)*Math.PI/180,angular=ground/radiusKm,lat1=latitude*Math.PI/180,lon1=longitude*Math.PI/180;
 const lat2=Math.asin(Math.sin(lat1)*Math.cos(angular)+Math.cos(lat1)*Math.sin(angular)*Math.cos(bearing));
 const lon2=lon1+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(lat1),Math.cos(angular)-Math.sin(lat1)*Math.sin(lat2));
 const toTarget=Math.atan2(Math.sin(lon1-lon2)*Math.cos(lat1),Math.cos(lat2)*Math.sin(lat1)-Math.sin(lat2)*Math.cos(lat1)*Math.cos(lon1-lon2));
 return {latitude:lat2*180/Math.PI,longitude:((lon2*180/Math.PI+540)%360)-180,azimuth:((toTarget*180/Math.PI)+360)%360,altitude:-Math.atan2(eyeHeightKm-sy/2,ground)*180/Math.PI,fov:fovDeg,eyeHeightKm,distanceKm:distance,groundKm:ground};
}
// The normalised size of a site's model (placeholder until the NASA model
// arrives), for framing before the site has ever been drawn.
export function missionModelSize(site){
 const model=normalise(site.model());const size=model.userData.normalisedSize;model.traverse(node=>node.geometry?.dispose?.());return size;
}

function addRoute(parent,route,material){
 const positions=route.map(([latitude,longitude])=>new THREE.Vector3(...localSurfacePoint(latitude,longitude)).multiplyScalar(1.003));
 const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(positions),material);line.name='Recorded rover route';parent.add(line);
}

export function attachSurfaceMissionAssets(view,body,date=new Date(),axes=[1,1,1]){
 if(!view?.mesh)return null;detachSurfaceMissionAssets(view);
 const sites=missionSitesFor(body,date);if(!sites.length)return null;
 const root=new THREE.Group();root.name='Human and robotic surface missions';
 const span=MISSION_DISPLAY_SPAN;
 for(const site of sites){const model=placeAtSurface(site.model(),site.latitude,site.longitude,span,axes);model.userData.mission=site.name;root.add(model);if(site.route)addRoute(root,site.route,body.key==='mars'?lineMaterial:moonLineMaterial);}
 root.userData.sites=sites.map(site=>site.name).join('|');
 view.mesh.add(root);view.surfaceMissionAssets=root;return root;
}
export function detachSurfaceMissionAssets(view){
 const root=view?.surfaceMissionAssets;if(!root)return;root.removeFromParent();root.traverse(node=>node.geometry?.dispose?.());view.surfaceMissionAssets=null;
}
