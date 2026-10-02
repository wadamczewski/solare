import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {createNavigation} from '../src/navigation.js';

test('leaving pointer-lock flight resets activity synchronously and notifies session-owned effects',()=>{
 const previous={window:globalThis.window,document:globalThis.document};
 const win=new EventTarget(),doc=new EventTarget(),element=new EventTarget();
 Object.assign(element,{classList:{add(){},remove(){}},hasPointerCapture:()=>false,requestPointerLock:()=>{}});
 doc.pointerLockElement=null;doc.exitPointerLock=()=>{doc.pointerLockElement=null};
 globalThis.window=win;globalThis.document=doc;
 try{
  let exits=0;const controls={enabled:true,target:new Vector3(),minDistance:.001};
  const navigation=createNavigation({camera:new PerspectiveCamera(),controls,element,blocked:()=>false,onMove:()=>{},pace:()=>1,onExit:()=>exits++});
  doc.pointerLockElement=element;doc.dispatchEvent(new Event('pointerlockchange'));assert.equal(navigation.active(),true);
  navigation.reset();assert.equal(navigation.active(),false,'reset must not wait for the async pointerlockchange event');assert.equal(exits,1);assert.equal(controls.enabled,true);
  doc.dispatchEvent(new Event('pointerlockchange'));
  doc.pointerLockElement=element;doc.dispatchEvent(new Event('pointerlockchange'));
  doc.pointerLockElement=null;doc.dispatchEvent(new Event('pointerlockchange'));
  assert.equal(navigation.active(),false);assert.equal(exits,2,'browser-initiated unlocking also exits the session');
 }finally{globalThis.window=previous.window;globalThis.document=previous.document}
});

test('a pointer-lock grant racing drag capture still enters free flight without an exception',()=>{
 const previous={window:globalThis.window,document:globalThis.document};
 const win=new EventTarget(),doc=new EventTarget(),element=new EventTarget();
 Object.assign(element,{classList:{add(){},remove(){}},focus(){},hasPointerCapture:()=>false,requestPointerLock:()=>Promise.resolve(),setPointerCapture:()=>{
  doc.pointerLockElement=element;throw new DOMException('Pointer is locked','InvalidStateError');
 }});
 doc.pointerLockElement=null;doc.exitPointerLock=()=>{doc.pointerLockElement=null};
 globalThis.window=win;globalThis.document=doc;
 try{
  const controls={enabled:true,update(){},target:new Vector3(),minDistance:.001};
  const navigation=createNavigation({camera:new PerspectiveCamera(),controls,element,blocked:()=>false,onMove:()=>{},pace:()=>1});
  const event=new Event('pointerdown',{cancelable:true});Object.assign(event,{button:2,pointerId:1});element.dispatchEvent(event);
  assert.equal(navigation.active(),true);assert.equal(controls.enabled,false);navigation.reset();
 }finally{globalThis.window=previous.window;globalThis.document=previous.document}
});

test('WASD, vertical movement, boost and mouse are routed to the ship pilot without also moving the camera',()=>{
 const previous={window:globalThis.window,document:globalThis.document},win=new EventTarget(),doc=new EventTarget(),element=new EventTarget();
 Object.assign(element,{classList:{add(){},remove(){}},hasPointerCapture:()=>false,requestPointerLock:()=>{}});
 doc.pointerLockElement=element;doc.exitPointerLock=()=>{doc.pointerLockElement=null};globalThis.window=win;globalThis.document=doc;
 try{
  const moves=[],looks=[],camera=new PerspectiveCamera(),controls={enabled:true,target:new Vector3(),minDistance:.001},craft={update:(dt,input,pace)=>moves.push({dt,input,pace}),look:(dx,dy)=>looks.push([dx,dy])};
  const navigation=createNavigation({camera,controls,element,blocked:()=>false,onMove:()=>{},pace:()=>7,pilot:()=>craft});doc.dispatchEvent(new Event('pointerlockchange'));
  const key=(type,code)=>{const event=new Event(type,{cancelable:true});Object.assign(event,{code});win.dispatchEvent(event)};
  for(const code of ['KeyW','KeyD','KeyE','ShiftLeft'])key('keydown',code);
  const initial=camera.position.clone();navigation.update(.016);
  assert.deepEqual(moves[0],{dt:.016,input:{forward:1,right:1,up:1,boost:true},pace:7});assert.deepEqual(camera.position,initial);
  const mouse=new Event('mousemove',{cancelable:true});Object.assign(mouse,{movementX:30,movementY:-8});doc.dispatchEvent(mouse);assert.deepEqual(looks,[[30,-8]]);
  const pointer=new Event('pointermove',{cancelable:true});Object.assign(pointer,{movementX:30,movementY:-8});element.dispatchEvent(pointer);assert.equal(looks.length,1,'pointer-lock mouse movement is not applied twice');
  for(const code of ['KeyW','KeyD','KeyE','ShiftLeft'])key('keyup',code);
  navigation.update(.016);assert.deepEqual(moves[1].input,{forward:0,right:0,up:0,boost:false},'no held keys must still update braking');
  navigation.reset();
 }finally{globalThis.window=previous.window;globalThis.document=previous.document}
});
