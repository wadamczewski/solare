import * as THREE from 'three';
import {localSurfacePoint} from './surface-texture-frame.js';
// One reusable WebGL context. Geometry/materials belong to the main scene.
export function syncPreviewTransform(previewAxis,previewMesh,sourceAxis,sourceMesh){
 previewAxis.rotation.copy(sourceAxis.rotation);previewMesh.rotation.copy(sourceMesh.rotation);previewMesh.geometry=sourceMesh.geometry;previewMesh.material=sourceMesh.material;
}
export function previewCameraPosition(sunDirection,distance){
 return sunDirection.clone().normalize().multiplyScalar(distance);
}
// A small glow dot, the same look the sky and surface-radar markers use for
// a point worth noticing, reused here (tinted white) for a named landmark.
let landmarkTexture=null;
function landmarkGlowTexture(){
 if(landmarkTexture)return landmarkTexture;
 const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
 const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(16,16,0,16,16,16);
 gradient.addColorStop(0,'rgba(255,255,255,1)');gradient.addColorStop(.45,'rgba(255,255,255,.8)');gradient.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=gradient;ctx.fillRect(0,0,32,32);
 landmarkTexture=new THREE.CanvasTexture(canvas);landmarkTexture.colorSpace=THREE.SRGBColorSpace;return landmarkTexture;
}
// One marker per known place (surface-places.js), sitting on the mesh's own
// unit-radius surface at its real latitude/longitude (surface-texture-frame.js
// - the same calibration surface view uses to orient the ground itself).
// Added as children of the mesh rather than the scene, so they turn with
// whatever is currently animating it: the ordinary decorative spin here, or
// the astronomically exact orientation once standing on the surface.
function buildLandmarkMarkers(places){
 const group=new THREE.Group();group.name='landmark-markers';
 const texture=landmarkGlowTexture();
 for(const place of places){
  const [x,y,z]=localSurfacePoint(place.latitude,place.longitude);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,color:'#ffe9b8',transparent:true,depthWrite:false,depthTest:true}));
  sprite.position.set(x*1.02,y*1.02,z*1.02);sprite.scale.setScalar(.16);
  group.add(sprite);
 }
 return group;
}
export function createBodyPreview(){
 let renderer=null,root=null,bodyId=null,host=null,sourceAxis=null,sourceMesh=null,markerGroup=null;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.01,100);
 scene.add(new THREE.AmbientLight('#ffffff',.035));const light=new THREE.DirectionalLight('#ffffff',Math.PI);light.castShadow=true;light.shadow.mapSize.set(512,512);scene.add(light);
 function clear(){if(root)scene.remove(root);root=null;bodyId=null;host=null;sourceAxis=null;sourceMesh=null;markerGroup=null;renderer?.domElement.remove()}
 function setLighting(lighting,distance){const direction=lighting?.sunDirection;if(!direction||direction.lengthSq()===0){light.visible=false;return}light.visible=true;light.position.copy(direction).normalize().multiplyScalar(5);light.intensity=Math.PI*Math.max(.05,Math.min(1,(lighting.brightness||100)/100));camera.position.copy(previewCameraPosition(direction,distance));camera.lookAt(0,0,0);}
 return {clear,
  attach(element,b,view,lighting,places=[],landmarksVisible=false){clear();if(!renderer){renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(76,76);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);renderer.domElement.setAttribute('role','img')}
   renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);host=element;host.append(renderer.domElement);bodyId=b.id;sourceAxis=view.axis;sourceMesh=view.mesh;root=view.axis.clone(true);const mesh=root.children.find(child=>child.isMesh);mesh.scale.setScalar(1);scene.add(root);setLighting(lighting,['saturn','uranus','blackhole','neutron-star'].includes(b.key)?9.5:5);
   if(places.length){markerGroup=buildLandmarkMarkers(places);markerGroup.visible=landmarksVisible;mesh.add(markerGroup)}
  },
  update(b,lighting){if(!root||!host?.isConnected||!b||b.id!==bodyId)return;syncPreviewTransform(root,root.children.find(child=>child.isMesh),sourceAxis,sourceMesh);setLighting(lighting,['saturn','uranus','blackhole','neutron-star'].includes(b.key)?9.5:5);renderer.render(scene,camera)},
  setLandmarksVisible(visible){if(markerGroup)markerGroup.visible=visible},
 };
}
