import {Vector3,Euler} from 'three';
export function createNavigation({camera,controls,element,blocked,onMove,pace}){
 const keys=new Set(),movement=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE']);
 const editable=e=>e.target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName);
 let looking=false,pointerId=null,pointerLocked=false;
 const direction=new Vector3(),right=new Vector3(),up=new Vector3(),offset=new Vector3(),angles=new Euler(0,0,0,'YXZ');
 function syncLookState(){pointerLocked=document.pointerLockElement===element;if(pointerLocked){if(pointerId!==null&&element.hasPointerCapture(pointerId))element.releasePointerCapture(pointerId);pointerId=null;looking=true;controls.enabled=false;element.classList.add('mouse-steering')}else if(pointerId===null){looking=false;controls.enabled=!blocked();element.classList.remove('mouse-steering')}}
 function requestMouseSteering(){
  if(blocked()||pointerLocked||!element.requestPointerLock)return;
  // Pointer Lock is the native mouse-look primitive used by desktop games.
  // It keeps steering continuous at viewport edges and lets Escape return the
  // cursor without changing the camera position.
  const lock=element.requestPointerLock();lock?.catch?.(()=>{});
 }
 function release({unlock=true}={}){keys.clear();if(unlock&&document.pointerLockElement===element)document.exitPointerLock?.();if(looking&&!pointerLocked){looking=false;controls.enabled=!blocked();if(pointerId!==null&&element.hasPointerCapture(pointerId))element.releasePointerCapture(pointerId);pointerId=null;element.classList.remove('mouse-steering')}}
 document.addEventListener('pointerlockchange',syncLookState);
 window.addEventListener('keydown',e=>{if(blocked()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;if(movement.has(e.code)||e.code==='ShiftLeft'||e.code==='ShiftRight'){keys.add(e.code);if(movement.has(e.code)){e.preventDefault();onMove();requestMouseSteering();}}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
 document.addEventListener('focusin',e=>{if(editable(e))release()});
 element.addEventListener('contextmenu',e=>e.preventDefault());
 element.addEventListener('pointerdown',e=>{
  if(e.button!==2||blocked())return;
  e.preventDefault();e.stopImmediatePropagation();onMove();element.focus();
  requestMouseSteering();if(document.pointerLockElement===element)return;
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  looking=true;pointerId=e.pointerId;controls.enabled=false;element.setPointerCapture(e.pointerId);
 },true);
 function steer(e){
  if(!looking)return;e.preventDefault();e.stopImmediatePropagation();
  angles.setFromQuaternion(camera.quaternion,'YXZ');angles.y-=e.movementX*.003;angles.x=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,angles.x-e.movementY*.003));angles.z=0;
  const distance=Math.max(controls.minDistance,camera.position.distanceTo(controls.target));
  camera.quaternion.setFromEuler(angles);camera.getWorldDirection(direction);controls.target.copy(camera.position).addScaledVector(direction,distance);
 }
 element.addEventListener('pointermove',steer,true);
 // Pointer Lock emits MouseEvents in every supported desktop browser. Keep the
 // PointerEvent handler above for the unlocked right-button fallback.
 document.addEventListener('mousemove',e=>{if(pointerLocked)steer(e)},true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,e=>{if(!pointerLocked&&looking&&e.pointerId===pointerId){e.stopImmediatePropagation();release()}},true);
 return {reset:release,update(dt){
  if(blocked()){release();return}if(![...keys].some(k=>movement.has(k)))return;
  onMove();camera.getWorldDirection(direction);right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
  offset.set(0,0,0).addScaledVector(direction,Number(keys.has('KeyW'))-Number(keys.has('KeyS'))).addScaledVector(right,Number(keys.has('KeyD'))-Number(keys.has('KeyA'))).addScaledVector(up,Number(keys.has('KeyE'))-Number(keys.has('KeyQ')));
  if(offset.lengthSq()===0)return;
  offset.normalize().multiplyScalar(pace()*Math.min(dt,.05)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?4:1));camera.position.add(offset);controls.target.add(offset);
 }};
}
