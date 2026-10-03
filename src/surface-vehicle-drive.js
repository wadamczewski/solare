import {Matrix4,Quaternion,Vector3} from 'three';

const DEG=Math.PI/180,clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const wrap=value=>((value+180)%360+360)%360-180;

// Enlarged enough to read in the surface explorer, without a planet-sized
// car on a small moon. All dynamics use kilometres in the body's own frame.
export function surfaceVehicleLengthKm(radiusKm){
 if(!(Number.isFinite(radiusKm)&&radiusKm>0))throw new RangeError('Invalid surface radius');
 return clamp(radiusKm*.00001,.008,.12);
}

export function surfaceVehicleCoordinates(direction){
 return {latitude:Math.asin(clamp(direction.y,-1,1))/DEG,longitude:wrap(Math.atan2(-direction.z,direction.x)/DEG)};
}
function frame(latitude,longitude){
 const lat=latitude*DEG,lon=longitude*DEG;
 return {
  up:new Vector3(Math.cos(lat)*Math.cos(lon),Math.sin(lat),-Math.cos(lat)*Math.sin(lon)),
  north:new Vector3(-Math.sin(lat)*Math.cos(lon),Math.cos(lat),Math.sin(lat)*Math.sin(lon)),
  east:new Vector3(-Math.sin(lon),0,-Math.cos(lon))
 };
}

// Wheel coordinates and radii come from the downloaded model's rig, not a
// replacement mesh. Canonical frame: +Y up, -Z front; model extent is one.
// sampleRadiusKm must use the rendered surface (including local DEM patches
// and ellipsoidal/irregular bodies); the controller never invents relief.
export function createSurfaceVehicleDrive({radiusKm,lengthKm=surfaceVehicleLengthKm(radiusKm),latitude=0,longitude=0,azimuth=0,wheels,sampleRadiusKm=()=>radiusKm}){
 if(!(Number.isFinite(radiusKm)&&radiusKm>0&&Number.isFinite(lengthKm)&&lengthKm>0))throw new RangeError('Invalid vehicle scale');
 if(!Array.isArray(wheels)||wheels.length<4||wheels.some(wheel=>!Array.isArray(wheel.center)||wheel.center.length!==3||!wheel.center.every(Number.isFinite)||!(wheel.radius>0)))throw new TypeError('Measured wheel pivots are required');
 const initial=frame(latitude,longitude),up=initial.up,forward=initial.north.multiplyScalar(Math.cos(azimuth*DEG)).addScaledVector(initial.east,Math.sin(azimuth*DEG));
 const right=new Vector3(),nextUp=new Vector3(),nextForward=new Vector3(),back=new Vector3(),normal=up.clone(),desiredNormal=new Vector3(),position=new Vector3(),rotation=new Quaternion(),matrix=new Matrix4();
 const contactPositions=wheels.map(()=>new Vector3()),travels=wheels.map(()=>0),spins=wheels.map(()=>0),steering=wheels.map(()=>0);
 let speed=0,steer=0,braking=0,exhaust=0,distance=0,bodyRadius=radiusKm,settled=false;
 const cruise=lengthKm*2,acceleration=lengthKm*1.1,brakeAcceleration=lengthKm*3.5;
 const track=Math.max(...wheels.map(w=>w.center[0]))-Math.min(...wheels.map(w=>w.center[0]));
 const wheelbase=Math.max(...wheels.map(w=>w.center[2]))-Math.min(...wheels.map(w=>w.center[2]));
 if(!(track>0&&wheelbase>0))throw new RangeError('Wheel track and wheelbase must be positive');
 const rideHeight=wheels.reduce((sum,w)=>sum+w.radius-w.center[1],0)/wheels.length*lengthKm;
 function radiusAt(direction){
  const coordinates=surfaceVehicleCoordinates(direction),r=sampleRadiusKm(coordinates.latitude,coordinates.longitude);
  if(!(Number.isFinite(r)&&r>0))throw new RangeError('Invalid sampled terrain radius');
  return r;
 }
 function suspension(dt){
  right.crossVectors(forward,up).normalize();back.copy(forward).negate();bodyRadius=radiusAt(up);
  // Sample actual contact points in body coordinates. Subtract the common
  // radius before fitting the plane, retaining small relief on large bodies.
  let sx=0,sz=0,sy=0,sxx=0,szz=0,sxz=0,sxy=0,szy=0;
  for(let i=0;i<wheels.length;i++){
   const w=wheels[i],x=w.center[0]*lengthKm,z=w.center[2]*lengthKm;
   const contact=contactPositions[i].copy(up).multiplyScalar(bodyRadius).addScaledVector(right,x).addScaledVector(back,z).normalize();
   contact.multiplyScalar(radiusAt(contact));
   const h=contact.dot(up)-bodyRadius;
   sx+=x;sz+=z;sy+=h;sxx+=x*x;szz+=z*z;sxz+=x*z;sxy+=x*h;szy+=z*h;
  }
  const count=wheels.length,xx=sxx-sx*sx/count,zz=szz-sz*sz/count,xz=sxz-sx*sz/count,xy=sxy-sx*sy/count,zy=szy-sz*sy/count,det=xx*zz-xz*xz;
  const gx=Math.abs(det)>1e-30?(xy*zz-zy*xz)/det:0,gz=Math.abs(det)>1e-30?(zy*xx-xy*xz)/det:0;
  desiredNormal.copy(up).addScaledVector(right,-clamp(gx,-1,1)*.8).addScaledVector(back,-clamp(gz,-1,1)*.8).normalize();
  // Damped chassis follows the terrain; independent actuators place each
  // tyre back on its own contact instead of an arbitrary sinusoidal bounce.
  normal.lerp(desiredNormal,settled?1-Math.exp(-dt*10):1).normalize();
  const fittedRight=nextForward.copy(right).addScaledVector(normal,-right.dot(normal)).normalize();
  back.crossVectors(fittedRight,normal).normalize();matrix.makeBasis(fittedRight,normal,back);rotation.setFromRotationMatrix(matrix);
  position.copy(up).multiplyScalar(bodyRadius+sy/count+rideHeight);
  for(let i=0;i<wheels.length;i++){
   const w=wheels[i];
   travels[i]=contactPositions[i].clone().sub(position).dot(normal)/lengthKm+w.radius-w.center[1];
  }
  settled=true;
 }
 suspension(0);
 return {
  get state(){
   const coordinates=surfaceVehicleCoordinates(up),local=frame(coordinates.latitude,coordinates.longitude);
   return {...coordinates,azimuth:((Math.atan2(forward.dot(local.east),forward.dot(local.north))/DEG)%360+360)%360,speedKmS:speed,cruiseKmS:cruise,lengthKm,distanceKm:distance,braking,exhaust,steer,positionKm:position.clone(),quaternion:rotation.clone(),wheelTravel:[...travels],wheelSpin:[...spins],wheelSteer:[...steering]};
  },
  update(dt,input={}){
   if(!(Number.isFinite(dt)&&dt>0))return;
   // Substeps keep steering/terrain contact stable after a long frame; speed
   // ramps are integrated analytically within each step to avoid FPS drift.
   const duration=Math.min(dt,.25),steps=Math.ceil(duration/.0125),step=duration/steps;
   for(let n=0;n<steps;n++){
    const throttle=clamp(Number(input.throttle)||0,-1,1),turn=clamp(Number(input.steer)||0,-1,1),handbrake=!!input.brake;
    const opposing=throttle!==0&&speed*throttle<0;
    const target=handbrake||opposing?0:throttle*cruise*(input.boost?2:1)*(throttle<0?.4:1);
    const limit=handbrake||opposing?brakeAcceleration:throttle?acceleration:acceleration*.8;
    const change=target-speed,maxChange=limit*step,nextSpeed=speed+clamp(change,-maxChange,maxChange);
    // Once a target speed is reached, integrate the remaining constant-speed
    // portion rather than treating a full frame as continued acceleration.
    const ramp=Math.min(step,Math.abs(change)/limit),travel=(speed+nextSpeed)*.5*ramp+nextSpeed*(step-ramp);
    braking=Number(handbrake||opposing||(!throttle&&Math.abs(speed)>cruise*.015));
    const power=throttle>0&&!handbrake&&!opposing?clamp(nextSpeed/(cruise*(input.boost?2:1))+.18,0,1):0;
    exhaust+=(power-exhaust)*(1-Math.exp(-step*9));speed=nextSpeed;
    steer+=(turn*.48-steer)*(1-Math.exp(-step*9));
    right.crossVectors(forward,up).normalize();
    const yaw=travel/(wheelbase*lengthKm)*Math.tan(steer);
    forward.multiplyScalar(Math.cos(yaw)).addScaledVector(right,Math.sin(yaw)).normalize();
    // Parallel transport the heading over the globe. Longitude can jump at
    // a pole, but neither the vehicle nor the chase camera jumps sideways.
    const angle=travel/bodyRadius;
    nextUp.copy(up).multiplyScalar(Math.cos(angle)).addScaledVector(forward,Math.sin(angle)).normalize();
    nextForward.copy(forward).multiplyScalar(Math.cos(angle)).addScaledVector(up,-Math.sin(angle)).normalize();
    up.copy(nextUp);forward.copy(nextForward);distance+=Math.abs(travel);
    for(let i=0;i<wheels.length;i++){
     spins[i]=(spins[i]-travel/(lengthKm*wheels[i].radius))%(2*Math.PI);
     steering[i]=wheels[i].steerable?steer:0;
    }
    suspension(step);
   }
  }
 };
}
