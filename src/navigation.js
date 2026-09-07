import {Vector3,Euler} from 'three';
export function createNavigation({camera,controls,element,blocked,onMove,pace}){
 const keys=new Set(),movement=new Set(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE']);
 const editable=e=>e.target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target?.tagName);
 let looking=false,pointerId=null;
 const direction=new Vector3(),right=new Vector3(),up=new Vector3(),offset=new Vector3(),angles=new Euler(0,0,0,'YXZ');
 function release(){keys.clear();if(looking){looking=false;controls.enabled=!blocked();if(pointerId!==null&&element.hasPointerCapture(pointerId))element.releasePointerCapture(pointerId);pointerId=null;}}
 window.addEventListener('keydown',e=>{if(blocked()||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;if(movement.has(e.code)||e.code==='ShiftLeft'||e.code==='ShiftRight'){keys.add(e.code);if(movement.has(e.code))e.preventDefault();}});
 window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',release);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)release()});
 document.addEventListener('focusin',e=>{if(editable(e))release()});
 element.addEventListener('contextmenu',e=>e.preventDefault());
 element.addEventListener('pointerdown',e=>{
  if(e.button!==2||blocked())return;
  e.preventDefault();e.stopImmediatePropagation();onMove();element.focus();
  controls.enableDamping=false;controls.update();controls.enableDamping=true;
  looking=true;pointerId=e.pointerId;controls.enabled=false;element.setPointerCapture(e.pointerId);
 },true);
 element.addEventListener('pointermove',e=>{
  if(!looking)return;e.preventDefault();e.stopImmediatePropagation();
  angles.setFromQuaternion(camera.quaternion,'YXZ');angles.y-=e.movementX*.003;angles.x=Math.max(-Math.PI/2+.01,Math.min(Math.PI/2-.01,angles.x-e.movementY*.003));angles.z=0;
  const distance=Math.max(controls.minDistance,camera.position.distanceTo(controls.target));
  camera.quaternion.setFromEuler(angles);camera.getWorldDirection(direction);controls.target.copy(camera.position).addScaledVector(direction,distance);
 },true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])element.addEventListener(event,e=>{if(looking&&e.pointerId===pointerId){e.stopImmediatePropagation();release()}},true);
 return {reset:release,update(dt){
  if(blocked()){release();return}if(![...keys].some(k=>movement.has(k)))return;
  onMove();camera.getWorldDirection(direction);right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);
  offset.set(0,0,0).addScaledVector(direction,Number(keys.has('KeyW'))-Number(keys.has('KeyS'))).addScaledVector(right,Number(keys.has('KeyD'))-Number(keys.has('KeyA'))).addScaledVector(up,Number(keys.has('KeyE'))-Number(keys.has('KeyQ')));
  if(offset.lengthSq()===0)return;
  offset.normalize().multiplyScalar(pace()*Math.min(dt,.05)*(keys.has('ShiftLeft')||keys.has('ShiftRight')?4:1));camera.position.add(offset);controls.target.add(offset);
 }};
}
