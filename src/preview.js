import * as THREE from 'three';
// One reusable WebGL context. Geometry/materials belong to the main scene.
export function createBodyPreview(){
 let renderer=null,root=null,bodyId=null,host=null,angle=0;
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(33,1,.01,100);
 scene.add(new THREE.AmbientLight('#ffffff',.035));const light=new THREE.DirectionalLight('#ffffff',Math.PI);light.position.set(-3,2,4);scene.add(light);
 function clear(){if(root)scene.remove(root);root=null;bodyId=null;host=null;renderer?.domElement.remove()}
 return {clear,
  attach(element,b,view){clear();if(!renderer){renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(76,76);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);renderer.domElement.setAttribute('role','img')}
   renderer.domElement.setAttribute('aria-label',`Podgląd ciała: ${b.name}`);host=element;host.append(renderer.domElement);bodyId=b.id;root=new THREE.Group();const mesh=view.mesh.clone(true);mesh.scale.setScalar(1);mesh.rotation.set(0,0,0);root.add(mesh);scene.add(root);angle=0;camera.position.set(0,1.5,['saturn','uranus','blackhole'].includes(b.key)?9.5:5);camera.lookAt(0,0,0);
  },
  update(b,dt){if(!root||!host?.isConnected||!b||b.id!==bodyId)return;angle+=dt*.22;root.rotation.z=b.tilt*Math.PI/180;root.children[0].rotation.y=angle;renderer.render(scene,camera)},
 };
}
