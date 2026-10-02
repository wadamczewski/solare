import {Euler,Quaternion,Vector3} from 'three';

export const KONAMI_CODE=Object.freeze(['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','KeyB','KeyA']);
const editable=target=>target?.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||!!target?.closest?.('[contenteditable="true"],[role="textbox"]');

// Keep the longest matching suffix: an extra Up does not swallow the next
// valid sequence. Autorepeat never counts as a second deliberate key press.
export function createKonamiSequence(){
 let prefix=[];
 return {
  reset(){prefix=[]},
  press(event){
   if(editable(event.target)||event.ctrlKey||event.metaKey||event.altKey||event.isComposing){prefix=[];return {consumed:false,complete:false}}
   if(event.repeat)return {consumed:prefix.length>0&&KONAMI_CODE.includes(event.code),complete:false};
   prefix.push(event.code);
   while(prefix.length&&!prefix.every((code,index)=>code===KONAMI_CODE[index]))prefix.shift();
   const consumed=prefix.length>0,complete=prefix.length===KONAMI_CODE.length;
   if(complete)prefix=[];
   return {consumed,complete};
  }
 };
}

// This object is deliberately outside the physical body catalogue and share
// state. Only this free-flight session owns it; neither saves nor later flights
// can restore an unlocked ship. The model code is fetched only on completion.
const loadEnterprise=async()=>({...await import('./enterprise-model.js'),...await import('./enterprise-flight.js')});
export function createEnterpriseEasterEgg({scene,camera,controls,isActive,spawnDistance,events=window,loadModel=loadEnterprise,onChange=()=>{}}){
 const sequence=createKonamiSequence();
 let ship=null,pending=false,generation=0,disposed=false,download=null,flight=null;
 function reset(){
  sequence.reset();if(ship||pending)generation++;pending=false;download?.abort();download=null;
  flight?.dispose();flight=null;
  if(ship){ship.removeFromParent();ship.userData.dispose?.();ship=null;onChange(null)}
 }
 async function reveal(){
  if(ship||pending)return;
  const ticket=++generation;pending=true;const request=new AbortController();download=request;
  // Capture the trigger view, not whichever direction a later download finds.
  const distance=Math.max(camera.near*100,Math.min(camera.far*.2,spawnDistance()));
  const position=camera.position.clone().addScaledVector(camera.getWorldDirection(new Vector3()),distance);
  const rotation=camera.quaternion.clone().multiply(new Quaternion().setFromEuler(new Euler(.26,Math.PI+.6,-.08)));
  try{
   const {createEnterpriseModel,createEnterpriseFlight}=await loadModel();
   if(disposed||ticket!==generation)return;
   if(!isActive()){reset();return}
   const model=await createEnterpriseModel({signal:request.signal});
   if(disposed||ticket!==generation||!isActive()){
    model.userData.dispose?.();
    if(ticket===generation)reset();
    return;
   }
   ship=model;
   ship.position.copy(position);ship.quaternion.copy(rotation);
   // Model is normalised to unit extent; fit both wide and portrait viewports.
   const halfFov=Math.atan(Math.tan(camera.fov*Math.PI/360)*Math.min(1,camera.aspect));
   ship.scale.setScalar(distance*Math.tan(halfFov)*1.1);
   scene.add(ship);
   if(controls&&createEnterpriseFlight)flight=createEnterpriseFlight({scene,ship,camera,controls});
   onChange(ship,flight?.piloting??false);
  }catch(error){if(ticket===generation&&!request.signal.aborted)console.warn('Enterprise model could not be loaded:',error)}
  finally{if(ticket===generation){pending=false;download=null}}
 }
 function keydown(event){
  if(event.code==='Escape'||event.key==='Escape'||!isActive()){reset();return}
  if(ship&&flight&&event.code==='KeyV'&&!editable(event.target)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!event.isComposing){
   event.preventDefault();event.stopImmediatePropagation();
   if(!event.repeat)onChange(ship,flight.toggle());
   return;
  }
  const {consumed,complete}=sequence.press(event);
  if(consumed){event.preventDefault();event.stopImmediatePropagation()}
  if(complete)void reveal();
 }
 events.addEventListener('keydown',keydown,true);
 events.addEventListener('blur',reset);
 return {
  reset,
  update(dt){if(!isActive())reset();else flight?.updateEffects(dt)},
  get pilot(){return flight?.piloting?flight:null},
  get flightState(){return flight?.state??null},
  get object(){return ship},
  dispose(){disposed=true;reset();events.removeEventListener('keydown',keydown,true);events.removeEventListener('blur',reset)}
 };
}
