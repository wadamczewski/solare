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
