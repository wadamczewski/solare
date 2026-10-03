import {AdditiveBlending,DataTexture,Group,RGBAFormat,Sprite,SpriteMaterial,UnsignedByteType,Vector3} from 'three';

function glowTexture(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(Math.max(0,1-r)**2*255);
 }
 const texture=new DataTexture(data,size,size,RGBAFormat,UnsignedByteType);texture.needsUpdate=true;return texture;
}

// This rig requires explicit authored parts from the real model. It does not
// guess wheel names or replace the asset with generated vehicle geometry.
// Unit extent, +Y up, -Z nose; wheel centres and lamp anchors share that frame.
export function createSurfaceVehicleRig({model,wheels,brakeLights=[],exhausts=[],suspensionLinks=[]}){
 if(!model?.isObject3D||!wheels?.length)throw new TypeError('Vehicle model and measured wheel nodes are required');
 const wheelNodes=new Set();
 for(const wheel of wheels){
  if(!wheel.node?.isObject3D||!Array.isArray(wheel.center)||wheel.center.length!==3||!wheel.center.every(Number.isFinite)||!(wheel.radius>0)||wheelNodes.has(wheel.node))throw new TypeError('Invalid or repeated vehicle wheel');
  let parent=wheel.node.parent;while(parent&&parent!==model)parent=parent.parent;
  if(parent!==model)throw new TypeError('Wheel must belong to the vehicle model');
  wheelNodes.add(wheel.node);
 }
 for(const anchor of [...brakeLights,...exhausts])if(!Array.isArray(anchor.position)||anchor.position.length!==3||!anchor.position.every(Number.isFinite))throw new TypeError('Measured light anchor is required');
 for(const link of suspensionLinks){
  if(!link.node?.isObject3D||!wheels[link.wheelIndex]||!Array.isArray(link.pivot)||!Array.isArray(link.wheelPoint)||new Vector3().fromArray(link.wheelPoint).sub(new Vector3().fromArray(link.pivot)).lengthSq()===0)throw new TypeError('Invalid authored suspension link');
 }
 const restores=[...wheels,...suspensionLinks].map(({node})=>({node,parent:node.parent,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()}));
 const root=new Group();root.name='Surface vehicle';root.add(model);
 const pivotGroup=new Group();pivotGroup.name='Active wheel suspension';root.add(pivotGroup);
 root.updateMatrixWorld(true);
 const pivots=wheels.map(wheel=>{
  const suspension=new Group(),steering=new Group(),rolling=new Group();
  suspension.position.fromArray(wheel.center);suspension.name=`Suspension ${wheel.node.name}`;
  suspension.add(steering);steering.add(rolling);pivotGroup.add(suspension);
  root.updateMatrixWorld(true);rolling.attach(wheel.node);
  return {suspension,steering,rolling};
 });
 const links=suspensionLinks.map(link=>{
  if(!link.node?.isObject3D||!wheels[link.wheelIndex]||!Array.isArray(link.pivot)||!Array.isArray(link.wheelPoint))throw new TypeError('Invalid authored suspension link');
  const pivot=new Group();pivot.position.fromArray(link.pivot);pivotGroup.add(pivot);root.updateMatrixWorld(true);pivot.attach(link.node);
  const direction=new Vector3().fromArray(link.wheelPoint).sub(pivot.position);
  if(!direction.lengthSq())throw new TypeError('Suspension link has zero length');
  return {pivot,direction,unit:direction.clone().normalize(),wheelIndex:link.wheelIndex};
 });
 const texture=glowTexture(),lights=new Group();lights.name='Vehicle brake and exhaust lights';root.add(lights);
 function makeLight(anchor,color,size){
  if(!Array.isArray(anchor.position)||anchor.position.length!==3||!anchor.position.every(Number.isFinite))throw new TypeError('Measured light anchor is required');
  const material=new SpriteMaterial({map:texture,color,transparent:true,opacity:0,depthWrite:false,depthTest:true,blending:AdditiveBlending,toneMapped:false});
  const sprite=new Sprite(material);sprite.position.fromArray(anchor.position);sprite.scale.setScalar(anchor.size??size);sprite.visible=false;lights.add(sprite);
  return sprite;
 }
 const red=brakeLights.map(anchor=>makeLight(anchor,0xff1733,.065)),blue=exhausts.map(anchor=>makeLight(anchor,0x299dff,.15));
 let disposed=false;
 return {
  root,
  apply(state,sceneUnitsPerKm=1){
   if(disposed)return;
   root.position.copy(state.positionKm).multiplyScalar(sceneUnitsPerKm);root.quaternion.copy(state.quaternion);root.scale.setScalar(state.lengthKm*sceneUnitsPerKm);
   for(let i=0;i<pivots.length;i++){
    const p=pivots[i];p.suspension.position.y=wheels[i].center[1]+state.wheelTravel[i];
    p.steering.rotation.y=-state.wheelSteer[i];p.rolling.rotation.x=state.wheelSpin[i];
   }
   for(const link of links){const moved=link.direction.clone();moved.y+=state.wheelTravel[link.wheelIndex];link.pivot.quaternion.setFromUnitVectors(link.unit,moved.normalize());}
   for(const sprite of red){sprite.material.opacity=state.braking*.9;sprite.visible=state.braking>0;sprite.material.color.setRGB(3*state.braking,.035,.05);}
   for(const sprite of blue){sprite.material.opacity=state.exhaust*.85;sprite.visible=state.exhaust>.005;sprite.material.color.setRGB(.08,state.exhaust*2,state.exhaust*5);}
  },
  dispose(){
   if(disposed)return;disposed=true;root.removeFromParent();
   for(const sprite of [...red,...blue])sprite.material.dispose();texture.dispose();lights.removeFromParent();
   // Restore authored ownership before the GLB disposer traverses its tree.
   // The rig owns only effects; source geometry/materials/textures remain the
   // model loader's responsibility, including the reparented wheels and arms.
   for(const restore of restores){restore.parent.add(restore.node);restore.node.position.copy(restore.position);restore.node.quaternion.copy(restore.quaternion);restore.node.scale.copy(restore.scale);}
   pivotGroup.clear();model.removeFromParent();
  }
 };
}
