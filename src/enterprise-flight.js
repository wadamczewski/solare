import {Euler,Quaternion,Vector3} from 'three';
import {createEnterpriseEngines} from './enterprise-engines.js';

const ROLL_AXIS=new Vector3(0,0,1);
export function createEnterpriseFlight({scene,ship,camera,controls}){
 const engines=createEnterpriseEngines({scene,ship});
 const heading=camera.quaternion.clone(),angles=new Euler().setFromQuaternion(heading,'YXZ'),velocity=new Vector3(),desired=new Vector3(),step=new Vector3(),offset=new Vector3(),target=new Vector3(),bank=new Quaternion();
 let piloting=true,cruiseSpeed=1,turn=0,roll=0,disposed=false;
 ship.quaternion.copy(heading);
 const span=ship.scale.x;
 function frame(snap,dt=0){
  // Fit the complete hull in portrait as well as landscape. Look a little
  // ahead of the bow: the ship sits below centre with room to see its course.
  const half=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));
  const distance=Math.max(span*1.65,span*.65/Math.tan(half),camera.near*50);
  offset.set(0,span*.46,distance).applyQuaternion(heading).add(ship.position);
  if(snap)camera.position.copy(offset);else camera.position.lerp(offset,1-Math.exp(-dt*7));
  target.set(0,span*.04,-span*.35).applyQuaternion(heading).add(ship.position);
  camera.up.set(0,1,0).applyQuaternion(heading);camera.lookAt(target);camera.updateMatrixWorld();controls.target.copy(target);
 }
 frame(true);
 return {
  get piloting(){return piloting},
  get state(){return {piloting,speed:velocity.length(),cruiseSpeed,...engines.state}},
  toggle(){
   piloting=!piloting;velocity.set(0,0,0);turn=0;roll=0;
   // Remove the cosmetic bank when inspecting. The craft remains in space.
   ship.quaternion.copy(heading);
   if(piloting)frame(true);else{camera.up.set(0,1,0);camera.updateMatrixWorld()}
   return piloting;
  },
  look(dx,dy){
   if(!piloting||disposed)return;
   angles.y-=dx*.0023;angles.x=Math.max(-Math.PI*.475,Math.min(Math.PI*.475,angles.x-dy*.0023));angles.z=0;
   heading.setFromEuler(angles);turn=Math.max(-.24,Math.min(.24,turn-dx*.004));
  },
  update(dt,input,pace){
   if(!piloting||disposed)return;
   dt=Math.max(0,Math.min(dt||0,.05));cruiseSpeed=Math.max(pace,span*.12,1e-12);
   desired.set(input.right,input.up,-input.forward);if(desired.lengthSq()>1)desired.normalize();
   desired.applyQuaternion(heading).multiplyScalar(cruiseSpeed*(input.boost?4:1));
   const response=desired.lengthSq()?5:8;
   const decay=Math.exp(-response*dt);
   step.copy(velocity).sub(desired).multiplyScalar((1-decay)/response).addScaledVector(desired,dt);
   velocity.lerp(desired,1-decay);if(!desired.lengthSq()&&velocity.length()<cruiseSpeed*.002)velocity.set(0,0,0);
   ship.position.add(step);camera.position.add(step);
   roll+=(turn-input.right*.1-roll)*(1-Math.exp(-dt*8));turn*=Math.exp(-dt*5);
   bank.setFromAxisAngle(ROLL_AXIS,roll);
   // Apply bank only to the hull, never the camera or movement basis.
   ship.quaternion.copy(heading).multiply(bank);
   frame(false,dt);
  },
  updateEffects(dt){if(!disposed)engines.update(dt,velocity.length(),cruiseSpeed,camera)},
  dispose(){if(disposed)return;disposed=true;velocity.set(0,0,0);engines.dispose();camera.up.set(0,1,0)}
 };
}
