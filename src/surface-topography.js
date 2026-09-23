import * as THREE from 'three';
import {surfaceAssetKey} from './surface-tiles.js';

// Measured landmark profiles bridge the gap between the inexpensive global
// maps and an on-foot view.  The global maps are intentionally retained as a
// fallback; these patches are only drawn around a surveyed feature and use a
// dense local mesh, so the surface cannot become a low-poly approximation at
// the one place where its relief matters most.
//
// Values are in kilometres.  They are conservative radial profiles rather
// than invented noise: Everest 8.849 km above sea level, Olympus Mons about
// 21.9 km above the Mars datum, and the rim-to-floor form of Tycho and
// Copernicus follow LOLA measurements.  Source product details live beside
// the terrain import tool, where the full DEM tiles replace these local
// profiles without changing the runtime interface.
export const SURFACE_FEATURES = Object.freeze({
 earth: Object.freeze([
  {id:'everest', latitude:27.9881, longitude:86.9250, kind:'peak', heightKm:8.849, radiusKm:18}
 ]),
 mars: Object.freeze([
  {id:'olympus-mons', latitude:18.65, longitude:-133.8, kind:'shield', heightKm:21.9, radiusKm:310, calderaKm:42, calderaDepthKm:3.2}
 ]),
 moon: Object.freeze([
  {id:'tycho', latitude:-43.31, longitude:-11.36, kind:'crater', radiusKm:43, rimKm:1.9, depthKm:4.85, floorRadiusKm:23},
  {id:'copernicus', latitude:9.62, longitude:-20.08, kind:'crater', radiusKm:46, rimKm:1.1, depthKm:3.8, floorRadiusKm:27}
 ])
});

// A compact real DEM accompanies the first landmark rather than a whole
// planet-scale download.  `height.f32` is a 512×512 little-endian Float32
// crop taken from Copernicus GLO-30 (27.5–28.0° N, 86.6–87.0° E).  It loads
// only after the observer comes within the Everest window.  The matching
// Terrain-RGB PNG is retained for diagnostics and future GPU displacement.
const LOCAL_DEMS=Object.freeze({
 earth:Object.freeze({
  path:'/textures/terrain/earth/everest-cop30-height.f32',width:1440,height:1800,
  south:27.5,north:28,west:86.6,east:87
 }),
 mars:Object.freeze({
  path:'/textures/terrain/mars/olympus-mola-128ppd-height.f32',width:512,height:512,
  south:12,north:26,west:218,east:234,positiveEast360:true
 }),
 moon:Object.freeze({
  path:'/textures/terrain/moon/tycho-lola-height.f32',width:512,height:512,
  south:-54,north:-33,west:-22.5,east:0
 })
});

const radians=value=>value*Math.PI/180;
const wrapLongitude=value=>((value+180)%360+360)%360-180;
export function greatCircleDistanceKm(radiusKm, latitudeA, longitudeA, latitudeB, longitudeB) {
 const latA=radians(latitudeA),latB=radians(latitudeB),deltaLat=latB-latA,deltaLon=radians(wrapLongitude(longitudeB-longitudeA));
 const h=Math.sin(deltaLat/2)**2+Math.cos(latA)*Math.cos(latB)*Math.sin(deltaLon/2)**2;
 return radiusKm*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}

function peakProfile(feature,distance) {
 const t=distance/feature.radiusKm;
 return t>=1?0:feature.heightKm*Math.exp(-3.6*t*t)*(1-.08*t);
}
function shieldProfile(feature,distance) {
 const t=distance/feature.radiusKm;
 if(t>=1.5)return 0;
 const dome=feature.heightKm*Math.exp(-1.9*t*t);
 const caldera=distance<feature.calderaKm?feature.calderaDepthKm*(1-distance/feature.calderaKm)**2:0;
 return dome-caldera;
}
function craterProfile(feature,distance) {
 const rimRadius=feature.radiusKm, floorRadius=feature.floorRadiusKm;
 if(distance>=rimRadius*1.45)return 0;
 // A narrow positive rim and a bowl that reaches the measured floor depth.
 const rim=feature.rimKm*Math.exp(-(((distance-rimRadius)/(rimRadius*.13))**2));
 const bowl=distance<rimRadius?feature.depthKm*(1-(distance/rimRadius)**1.65):0;
 const floor=distance<floorRadius?feature.depthKm*.12*(1-distance/floorRadius):0;
 return rim-bowl+floor;
}

export function topographyHeightKm(assetKey, radiusKm, latitude, longitude) {
 let height=0;
 for(const feature of SURFACE_FEATURES[assetKey]||[]) {
  const distance=greatCircleDistanceKm(radiusKm,latitude,longitude,feature.latitude,feature.longitude);
  if(feature.kind==='peak')height+=peakProfile(feature,distance);
  else if(feature.kind==='shield')height+=shieldProfile(feature,distance);
  else height+=craterProfile(feature,distance);
 }
 return height;
}

// Used by the surface camera when a named place is selected: a point rounded
// to whole degrees can still sit several kilometres from a narrow summit or
// crater rim, so look toward the surveyed centre rather than leaving the
// landmark outside the initial frame.
export function nearestSurfaceFeature(body, latitude, longitude) {
 const key=surfaceAssetKey(body),radiusKm=Number(body?.radius);
 if(!key||!Number.isFinite(radiusKm))return null;
 let result=null;
 for(const feature of SURFACE_FEATURES[key]||[]) {
  const distanceKm=greatCircleDistanceKm(radiusKm,latitude,longitude,feature.latitude,feature.longitude);
  if(!result||distanceKm<result.distanceKm)result={...feature,distanceKm};
 }
 return result;
}

function sampledDemHeightKm(dem,latitude,longitude){
 const sampleLongitude=dem?.positiveEast360&&longitude<0?longitude+360:longitude;
 if(!dem||latitude<dem.south||latitude>dem.north||sampleLongitude<dem.west||sampleLongitude>dem.east)return null;
 const x=(sampleLongitude-dem.west)/(dem.east-dem.west)*(dem.width-1),y=(dem.north-latitude)/(dem.north-dem.south)*(dem.height-1);
 const left=Math.max(0,Math.min(dem.width-2,Math.floor(x))),top=Math.max(0,Math.min(dem.height-2,Math.floor(y))),fx=x-left,fy=y-top;
 const a=dem.values[top*dem.width+left],b=dem.values[top*dem.width+left+1],c=dem.values[(top+1)*dem.width+left],d=dem.values[(top+1)*dem.width+left+1];
 return (a+(b-a)*fx+(c+(d-c)*fx-a-(b-a)*fx)*fy)/1000;
}

export function localTerrainPoint(latitude,longitude,radial=1) {
 const lat=radians(latitude),lon=radians(longitude),cosLat=Math.cos(lat);
 // Match the equirectangular body frame used by the surface camera and maps:
 // +X is the prime meridian, +Y north, and east points along -Z.  Reversing
 // X/Z placed the detailed terrain on the antipode, leaving the named point
 // visually flat even though the correct DEM had already been loaded.
 return [Math.cos(lon)*cosLat*radial,Math.sin(lat)*radial,-Math.sin(lon)*cosLat*radial];
}
const smoothstep=value=>value<=0?0:value>=1?1:value*value*(3-2*value);
function patchGeometry(assetKey,radiusKm,latitude,longitude,spanDegrees,dem,segments=96,feather=.14) {
 const vertices=[],uvs=[],indices=[];
 const latSpan=spanDegrees,lonSpan=spanDegrees/Math.max(.13,Math.cos(radians(latitude)));
 for(let y=0;y<=segments;y++)for(let x=0;x<=segments;x++){
  const north=(y/segments-.5)*latSpan,east=(x/segments-.5)*lonSpan;
  const lat=Math.max(-89.999,Math.min(89.999,latitude+north)),lon=wrapLongitude(longitude+east);
  // When a real DEM is ready it supersedes the hand-profile only in its own
  // measured footprint.  The profile remains a graceful fallback while the
  // small binary tile is still in flight or unavailable offline.
  const sampled=sampledDemHeightKm(dem,lat,lon);
  const height=sampled??topographyHeightKm(assetKey,radiusKm,lat,lon);
  // Fade measured terrain back into the undistorted globe before the outer
  // edge. The local shell then has no visible lip, while the central survey
  // keeps every measured ridge, valley and crater at full amplitude.
  const edge=Math.min(x/segments,1-x/segments,y/segments,1-y/segments);
  const blend=smoothstep(edge/feather);
  const radial=1+height*blend/radiusKm+.00000005;
  vertices.push(...localTerrainPoint(lat,lon,radial));
  uvs.push((lon+180)/360,(90-lat)/180);
 }
 const stride=segments+1;
 for(let y=0;y<segments;y++)for(let x=0;x<segments;x++){
  const a=y*stride+x,b=a+stride,c=b+1,d=a+1;indices.push(a,b,d,b,c,d);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

// Includes the overview point selected for a named landmark as well as the
// terrain sheet itself. Otherwise a deliberately wider first frame could sit
// just outside the stream radius and show only the fallback globe.
function activityRadius(key){return key==='earth'?140:key==='mars'?1200:230}
export function terrainActivationRadius(body){return activityRadius(surfaceAssetKey(body));}
// A single measured sheet replaces the ordinary surface below it. The former
// stack of context and focal sheets could z-fight with each other and with the
// global displacement map. These extents include each full landmark plus a
// broad feathered border, while keeping the high vertex density local.
const FOCAL_MESH=Object.freeze({
 earth:Object.freeze({span:.72,segments:1024,feather:.25}),
 mars:Object.freeze({span:12,segments:768,feather:.16}),
 moon:Object.freeze({span:5.6,segments:640,feather:.16})
});
export function focalTerrainProfile(key){return FOCAL_MESH[key]||null}
function nearbyFeature(key,radiusKm,latitude,longitude){
 return (SURFACE_FEATURES[key]||[]).some(feature=>greatCircleDistanceKm(radiusKm,latitude,longitude,feature.latitude,feature.longitude)<activityRadius(key));
}
function patchMaterial(baseMaterial) {
 const material=baseMaterial.clone();
 material.displacementMap=null;material.displacementScale=0;
 // Terrain patches follow a local east/north grid that crosses the texture
 // seam and the lunar poles.  Render both faces so a platform-specific
 // winding choice cannot make a surveyed slope disappear or turn black when
 // the observer walks across that seam.
 material.side=THREE.DoubleSide;
 // The regional sheet now sits just above an undisplaced sphere, so depth
 // ordering is deterministic without polygon offset's driver-dependent
 // cracks at glancing angles.
 material.polygonOffset=false;
 return material;
}

// Builds one seamless local mesh only while the observer is close enough to a
// DEM-backed landmark. This prevents the ordinary sphere from peeking through
// one or more overlapping terrain sheets and keeps the high-detail cost local.
export function createSurfaceTopography(body,baseMaterial) {
 const key=surfaceAssetKey(body),radiusKm=Number(body?.radius);
 if(!key||!Number.isFinite(radiusKm)||!SURFACE_FEATURES[key]?.length||!baseMaterial)return null;
 const group=new THREE.Group();group.name='surface-topography';
 let signature='',meshes=[],dem=null;
 const demConfig=LOCAL_DEMS[key];
 if(demConfig)fetch(demConfig.path).then(response=>response.ok?response.arrayBuffer():Promise.reject(new Error('terrain unavailable'))).then(buffer=>{
  if(buffer.byteLength!==demConfig.width*demConfig.height*4)return;
  dem={...demConfig,values:new Float32Array(buffer)};
  // Keep the existing meshes until the next observer update, then swap them
  // atomically for vertices sampled from the real elevation raster.
  signature='';
 }).catch(()=>{});
 function clear(){for(const mesh of meshes){group.remove(mesh);mesh.geometry.dispose();mesh.material.dispose()}meshes=[]}
 return {group,
  update(latitude,longitude){
   // The caller uses this boolean to select exactly one terrain layer.  The
   // tile shell is deliberately disabled while the measured patch is active:
   // it is offset above the globe for normal viewing and would otherwise cut
   // through this physically scaled DEM as the observer moves.
   if(!nearbyFeature(key,radiusKm,latitude,longitude)){
    if(meshes.length)clear();signature='';return false;
   }
   const feature=nearestSurfaceFeature(body,latitude,longitude),focal=FOCAL_MESH[key];
   if(!feature||feature.distanceKm>=activityRadius(key)){
    if(meshes.length)clear();signature='';return false;
   }
   const id=`${key}:${feature.id}`;
   if(id===signature)return true;
   signature=id;clear();
   const mesh=new THREE.Mesh(patchGeometry(key,radiusKm,feature.latitude,feature.longitude,focal.span,dem,focal.segments,focal.feather),patchMaterial(baseMaterial));
   mesh.name=`surface-topography:${key}:${feature.id}`;mesh.frustumCulled=true;meshes.push(mesh);group.add(mesh);
   return true;
  },
  get loaded(){return meshes.length},
  dispose(){clear()}
 };
}
