import * as THREE from 'three';
// One reusable WebGL context. Geometry/materials belong to the main scene.
export function syncPreviewTransform(previewAxis,previewMesh,sourceAxis,sourceMesh){
 previewAxis.rotation.copy(sourceAxis.rotation);previewMesh.rotation.copy(sourceMesh.rotation);previewMesh.geometry=sourceMesh.geometry;previewMesh.material=sourceMesh.material;
}
export function createBodyPreview(){
 let renderer=null,root=null,bodyId=null,host=null,sourceAxis=null,sourceMesh=null;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.01,100);
 scene.add(new THREE.AmbientLight('#ffffff',.035));const light=new THREE.DirectionalLight('#ffffff',Math.PI);light.position.set(-3,2,4);scene.add(light);
 function clear(){if(root)scene.remove(root);root=null;bodyId=null;host=null;sourceAxis=null;sourceMesh=null;renderer?.domElement.remove()}
 function setLighting(lighting){const direction=lighting?.sunDirection;if(!direction||direction.lengthSq()===0){light.visible=false;return}light.visible=true;light.position.copy(direction).normalize().multiplyScalar(5);light.intensity=Math.PI*Math.max(.05,Math.min(1,(lighting.brightness||100)/100));}
 return {clear,
  attach(element,b,view,lighting){clear();if(!renderer){renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(76,76);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);renderer.domElement.setAttribute('role','img')}
   renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);host=element;host.append(renderer.domElement);bodyId=b.id;sourceAxis=view.axis;sourceMesh=view.mesh;root=view.axis.clone(true);const mesh=root.children.find(child=>child.isMesh);mesh.scale.setScalar(1);scene.add(root);setLighting(lighting);camera.position.set(0,1.5,['saturn','uranus','blackhole'].includes(b.key)?9.5:5);camera.lookAt(0,0,0);
  },
  update(b,lighting){if(!root||!host?.isConnected||!b||b.id!==bodyId)return;syncPreviewTransform(root,root.children.find(child=>child.isMesh),sourceAxis,sourceMesh);setLighting(lighting);renderer.render(scene,camera)},
 };
}
