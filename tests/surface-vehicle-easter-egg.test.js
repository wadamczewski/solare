import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera} from 'three';
import {KONAMI_CODE} from '../src/enterprise-easter-egg.js';
import {createSurfaceVehicleEasterEgg} from '../src/surface-vehicle-easter-egg.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(loader){
 const camera=new PerspectiveCamera(70,1,.001,1000),bodyFrame=new Group(),events=new EventTarget();
 let context={token:'earth/session1',radiusKm:6371,lengthKm:.06,latitude:0,longitude:0,azimuth:0,sceneUnitsPerKm:.001,bodyFrame,sampleRadiusKm:()=>6371},loads=0,disposed=0;
 const loadVehicle=loader??(async()=>{loads++;const model=new Group();const wheels=[-.22,.22].flatMap(x=>[-.34,0,.34].map(z=>{const node=new Group();model.add(node);return {node,center:[x,.08,z],radius:.08,steerable:z<0};}));return {model,wheels,dispose:()=>disposed++};});
 const changes=[],egg=createSurfaceVehicleEasterEgg({camera,getContext:()=>context,loadVehicle,events,onChange:change=>changes.push(change.status)});
 const key=(code,extra={})=>{const event=new Event('keydown',{cancelable:true});Object.assign(event,{code,...extra});events.dispatchEvent(event);return event;};
 return {egg,bodyFrame,changes,key,type:()=>KONAMI_CODE.forEach(code=>key(code)),setContext:value=>{context=value;},context,counts:()=>({loads,disposed})};
}

test('only surface context accepts Konami, consumes the last A and loads exactly one vehicle',async()=>{
 const f=fixture();f.setContext(null);f.type();await flush();assert.equal(f.counts().loads,0);
 f.setContext(f.context);for(const code of KONAMI_CODE)assert.equal(f.key(code).defaultPrevented,true);await flush();
 assert.ok(f.egg.object);assert.equal(f.bodyFrame.children.length,1);assert.deepEqual(f.changes,['loading','driving']);
 f.type();await flush();assert.equal(f.counts().loads,1);f.egg.update(.1,{throttle:1});assert.ok(f.egg.state.speedKmS>0);f.egg.dispose();
});

test('exit, Escape, site/body changes and focus loss remove the vehicle and require a fresh code',async()=>{
 for(const leave of [f=>f.key('Escape'),f=>{f.setContext(null);f.egg.update(.01);f.setContext(f.context);},f=>{f.setContext({...f.context,token:'moon/session2'});f.egg.update(.01);},f=>f.egg.reset()]){
  const f=fixture();f.type();await flush();leave(f);assert.equal(f.egg.object,null);assert.equal(f.counts().disposed,1);assert.equal(f.bodyFrame.children.length,0);
  KONAMI_CODE.slice(1).forEach(code=>f.key(code));await flush();assert.equal(f.egg.object,null);
  f.type();await flush();assert.ok(f.egg.object);f.egg.dispose();
 }
});

test('late downloads are aborted and disposed without spawning in a later session',async()=>{
 const pending=[];let released=0;
 const f=fixture((context,{signal})=>new Promise(resolve=>pending.push({resolve,signal})));
 f.type();f.egg.reset();assert.equal(pending[0].signal.aborted,true);
 const asset={model:new Group(),wheels:[],dispose:()=>released++};pending[0].resolve(asset);await flush();assert.equal(released,1);assert.equal(f.egg.object,null);
 f.type();f.setContext({...f.context,token:'other'});pending[1].resolve(asset);await flush();assert.equal(released,2);assert.equal(f.egg.object,null);f.egg.dispose();
});

test('failed downloads report unavailable, allow retry and preserve an empty scene',async()=>{
 const f=fixture(async()=>{throw new Error('model not supplied');});f.type();await flush();
 assert.deepEqual(f.changes,['loading','unavailable']);assert.equal(f.egg.loading,false);assert.equal(f.bodyFrame.children.length,0);
 f.type();await flush();assert.deepEqual(f.changes,['loading','unavailable','loading','unavailable']);f.egg.dispose();
});
