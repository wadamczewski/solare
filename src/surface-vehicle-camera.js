import {Vector3} from 'three';
import {surfaceVehicleCoordinates} from './surface-vehicle-drive.js';

// Mouse orbits a third-person chase camera. Steering remains on A/D rather
// than turning a vehicle whenever the player wants to inspect its side.
export function createSurfaceVehicleCamera({camera,bodyFrame,sampleRadiusKm}){
 const up=new Vector3(),forward=new Vector3(),right=new Vector3(),desired=new Vector3(),target=new Vector3(),localCamera=new Vector3(),previousVehicle=new Vector3(),delta=new Vector3();
 let yaw=0,pitch=.34,ready=false;
 return {
  look(dx,dy){yaw-=dx*.003;pitch=Math.max(.12,Math.min(1.3,pitch+dy*.003));},
  update(state,sceneUnitsPerKm,dt=0){
   up.copy(state.positionKm).normalize();forward.set(0,0,-1).applyQuaternion(state.quaternion).addScaledVector(up,-forward.dot(up)).normalize();right.crossVectors(forward,up).normalize();
   const shortHalfFov=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));
   const distance=Math.max(state.lengthKm*1.8,state.lengthKm*.75/Math.tan(shortHalfFov));
   desired.copy(state.positionKm).addScaledVector(forward,-Math.cos(yaw)*Math.cos(pitch)*distance).addScaledVector(right,Math.sin(yaw)*Math.cos(pitch)*distance).addScaledVector(up,Math.sin(pitch)*distance);
   if(!ready){localCamera.copy(desired);ready=true;}
   else{delta.copy(state.positionKm).sub(previousVehicle);localCamera.add(delta).lerp(desired,1-Math.exp(-Math.max(0,dt)*8));}
   previousVehicle.copy(state.positionKm);
   // Camera never sinks into relief while rounding a crater wall or a ridge.
   if(sampleRadiusKm){
    const coordinates=surfaceVehicleCoordinates(localCamera.clone().normalize()),floor=sampleRadiusKm(coordinates.latitude,coordinates.longitude)+state.lengthKm*.2;
    if(Number.isFinite(floor)&&localCamera.length()<floor)localCamera.setLength(floor);
   }
   bodyFrame.updateWorldMatrix(true,false);
   camera.position.copy(localCamera).multiplyScalar(sceneUnitsPerKm).applyMatrix4(bodyFrame.matrixWorld);
   target.copy(state.positionKm).addScaledVector(up,state.lengthKm*.2).addScaledVector(forward,state.lengthKm*.45).multiplyScalar(sceneUnitsPerKm).applyMatrix4(bodyFrame.matrixWorld);
   camera.up.copy(up).transformDirection(bodyFrame.matrixWorld);camera.near=Math.max(1e-12,state.lengthKm*sceneUnitsPerKm*.02);
   camera.updateProjectionMatrix();camera.lookAt(target);camera.updateMatrixWorld();
  },
  reset(){ready=false;yaw=0;pitch=.34;}
 };
}
