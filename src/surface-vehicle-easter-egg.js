import {createKonamiSequence} from './enterprise-easter-egg.js';
import {createSurfaceVehicleDrive} from './surface-vehicle-drive.js';
import {createSurfaceVehicleRig} from './surface-vehicle-rig.js';
import {createSurfaceVehicleCamera} from './surface-vehicle-camera.js';

// getContext is null outside surface view. Its token identifies one surface
// session/body/location, so a late download cannot spawn at a different site.
// loadVehicle must return the licensed source model and its measured rig.
// No generated model or missing-asset request is used as a fallback.
export function createSurfaceVehicleEasterEgg({camera,getContext,loadVehicle,onChange=()=>{},events=null}){
 const sequence=createKonamiSequence();
 let loaded=null,rig=null,drive=null,chase=null,contextToken=null,request=null,generation=0,disposed=false;
 function clear(){
  const hadState=!!(rig||request);generation++;request?.abort();request=null;sequence.reset();
  rig?.dispose();loaded?.dispose?.();rig=null;loaded=null;drive=null;chase=null;contextToken=null;
  if(hadState)onChange({status:'off'});
 }
 async function reveal(context){
  if(rig||request||disposed)return;
  const ticket=++generation,download=new AbortController();request=download;contextToken=context.token;
  onChange({status:'loading'});
  let asset=null,newRig=null;
  try{
   asset=await loadVehicle(context,{signal:download.signal});
   if(disposed||ticket!==generation||getContext()?.token!==context.token){asset.dispose?.();if(ticket===generation)clear();return;}
   newRig=createSurfaceVehicleRig(asset);
   const controller=createSurfaceVehicleDrive({radiusKm:context.radiusKm,lengthKm:context.lengthKm,latitude:context.latitude,longitude:context.longitude,azimuth:context.azimuth,wheels:asset.wheels,sampleRadiusKm:context.sampleRadiusKm});
   const follower=createSurfaceVehicleCamera({camera,bodyFrame:context.bodyFrame,sampleRadiusKm:context.sampleRadiusKm});
   loaded=asset;rig=newRig;drive=controller;chase=follower;context.bodyFrame.add(rig.root);
   rig.apply(drive.state,context.sceneUnitsPerKm);chase.update(drive.state,context.sceneUnitsPerKm);
   onChange({status:'driving',source:asset.model.userData.source,state:drive.state});
  }catch(error){
   newRig?.dispose();asset?.dispose?.();
   if(ticket===generation){loaded=null;rig=null;drive=null;chase=null;contextToken=null;}
   if(ticket===generation&&!download.signal.aborted)onChange({status:'unavailable',error});
  }finally{if(ticket===generation)request=null;}
 }
 function keydown(event){
  const context=getContext();
  if(disposed)return;
  if(!context||event.code==='Escape'||event.key==='Escape'){clear();return;}
  if(contextToken!==null&&contextToken!==context.token)clear();
  const result=sequence.press(event);
  if(result.consumed){event.preventDefault();event.stopImmediatePropagation();}
  if(result.complete)void reveal(context);
 }
 events?.addEventListener('keydown',keydown,true);events?.addEventListener('blur',clear);
 return {
  handleKeydown:keydown,
  reset:clear,
  get object(){return rig?.root??null;},
  get state(){return drive?.state??null;},
  get loading(){return !!request;},
  look(dx,dy){chase?.look(dx,dy);},
  update(dt,input){
   const context=getContext();
   if(!context||(contextToken!==null&&contextToken!==context.token)){clear();return;}
   if(!drive)return;
   drive.update(dt,input);const state=drive.state;
   rig.apply(state,context.sceneUnitsPerKm);chase.update(state,context.sceneUnitsPerKm,dt);
   return state;
  },
  frame(dt=0){
   const context=getContext();if(!rig||!context)return;
   rig.apply(drive.state,context.sceneUnitsPerKm);chase.update(drive.state,context.sceneUnitsPerKm,dt);
  },
  dispose(){if(disposed)return;disposed=true;clear();events?.removeEventListener('keydown',keydown,true);events?.removeEventListener('blur',clear);}
 };
}
