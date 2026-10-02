import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera,Scene,Vector3} from 'three';
import {createEnterpriseFlight} from '../src/enterprise-flight.js';
import {createEnterpriseEasterEgg,KONAMI_CODE} from '../src/enterprise-easter-egg.js';

const still={forward:0,right:0,up:0,boost:false},forward={...still,forward:1};
function fixture(aspect=16/9){
 const scene=new Scene(),ship=new Group(),camera=new PerspectiveCamera(43,aspect,.0001,1000),controls={target:new Vector3()};
 ship.scale.setScalar(2);scene.add(ship);camera.position.set(0,0,10);camera.lookAt(0,0,0);
 const flight=createEnterpriseFlight({scene,ship,camera,controls});
 const tick=(input,seconds=1,fps=60)=>{for(let i=0;i<seconds*fps;i++){flight.update(1/fps,input,3);flight.updateEffects(1/fps)}};
 return {scene,ship,camera,controls,flight,tick};
}

test('pilot movement accelerates the ship and chase camera; diagonal input is normalized',()=>{
 const a=fixture(),b=fixture(),cameraOffset=a.camera.position.clone().sub(a.ship.position);
 a.tick(forward,2);b.tick({...forward,right:1},2);
 assert.ok(a.ship.position.z<-5);assert.ok(Math.abs(a.ship.position.length()-b.ship.position.length())<1e-8);
 assert.ok(a.camera.position.clone().sub(a.ship.position).distanceTo(cameraOffset)<1e-8);
 assert.ok(a.flight.state.speed>2.99);assert.equal(a.ship.parent,a.scene);
 a.flight.dispose();b.flight.dispose();
});

test('boost increases actual speed and engine light; releasing input brakes and extinguishes all trails',()=>{
 const f=fixture();f.tick(forward,3);const cruise=f.flight.state;
 assert.ok(cruise.power>.24&&cruise.power<.26);assert.ok(cruise.visible);assert.ok(cruise.samples>50);
 f.tick({...forward,boost:true},3);const boosted=f.flight.state;
 assert.ok(boosted.speed>cruise.speed*3.99);assert.ok(boosted.power>cruise.power*3.9);assert.ok(boosted.samples<=128);
 f.tick(still,5);assert.equal(f.flight.state.speed,0);assert.equal(f.flight.state.power,0);assert.equal(f.flight.state.samples,0);assert.equal(f.flight.state.visible,false);
 const atRest=f.ship.position.clone();f.tick(still,1);assert.deepEqual(f.ship.position,atRest);f.flight.dispose();
});

test('mouse steers the bow and movement, while camera stays behind and outside the full hull in portrait',()=>{
 const f=fixture(.5);f.flight.look(260,-60);f.tick(forward,2);
 const heading=new Vector3(0,0,-1).applyQuaternion(f.ship.quaternion),offset=f.camera.position.clone().sub(f.ship.position);
 assert.ok(heading.x>.4);assert.ok(f.ship.position.x>2);assert.ok(offset.dot(heading)<-2);
 const distance=offset.length();assert.ok(distance>6,'portrait needs extra framing distance');
 for(const x of [-.45,.45])for(const y of [-.21,.21])for(const z of [-1,1]){
  const projected=new Vector3(x,y,z).applyQuaternion(f.ship.quaternion).add(f.ship.position).project(f.camera);
  assert.ok(Math.abs(projected.x)<1&&Math.abs(projected.y)<1&&projected.z<1,'the entire hull fits');
 }
 f.flight.dispose();
});

test('inspection preserves the ship in world space and resuming returns the chase camera',()=>{
 const f=fixture();f.tick(forward,2);assert.equal(f.flight.toggle(),false);const position=f.ship.position.clone();
 f.camera.position.add(new Vector3(12,8,0));f.tick(forward,5);
 assert.deepEqual(f.ship.position,position);assert.equal(f.flight.state.power,0);
 assert.equal(f.flight.toggle(),true);assert.ok(f.camera.position.distanceTo(f.ship.position)<6);f.tick(forward);assert.notDeepEqual(f.ship.position,position);f.flight.dispose();
});

test('flight acceleration and braking are independent of frame rate',()=>{
 const a=fixture(),b=fixture();a.tick(forward,3,30);b.tick(forward,3,120);
 assert.ok(a.ship.position.distanceTo(b.ship.position)<1e-8);
 a.tick(still,2,30);b.tick(still,2,120);assert.ok(a.ship.position.distanceTo(b.ship.position)<.001);
 a.flight.dispose();b.flight.dispose();
});

test('trail geometry retains earlier world positions and cleanup releases effects once',()=>{
 const f=fixture();f.tick(forward,1);
 const trail=f.scene.getObjectByName('Enterprise fading engine trails'),geometry=trail.geometry,array=geometry.attributes.position.array;
 const maxZ=()=>{let max=-Infinity;for(let i=0;i<geometry.drawRange.count;i++)max=Math.max(max,array[i*3+2]+trail.position.z);return max};
 const earlier=maxZ();f.tick(forward,.5);assert.ok(maxZ()>f.ship.position.z+2,'old trail remains behind the moving craft');assert.ok(Math.abs(maxZ()-earlier)<.2);
 let releases=0;geometry.addEventListener('dispose',()=>releases++);trail.material.addEventListener('dispose',()=>releases++);
 f.flight.dispose();f.flight.dispose();assert.equal(releases,2);assert.equal(f.scene.children.length,1);assert.equal(f.ship.children.length,0);
});

test('Konami enters piloting; V toggles inspection, ignores repeats and Escape clears all effects',async()=>{
 const scene=new Scene(),camera=new PerspectiveCamera(43,1,.001,1000),controls={target:new Vector3()},events=new EventTarget();let released=0;
 const egg=createEnterpriseEasterEgg({scene,camera,controls,events,isActive:()=>true,spawnDistance:()=>5,loadModel:async()=>({createEnterpriseModel:async()=>{const ship=new Group();ship.userData.dispose=()=>released++;return ship},createEnterpriseFlight})});
 const key=(code,extra={})=>{const e=new Event('keydown',{cancelable:true});Object.assign(e,{code,...extra});events.dispatchEvent(e)};
 KONAMI_CODE.forEach(code=>key(code));await new Promise(resolve=>setImmediate(resolve));assert.ok(egg.pilot);
 key('KeyV',{repeat:true});assert.ok(egg.pilot);key('KeyV');assert.equal(egg.pilot,null);assert.ok(egg.object);
 key('KeyV');assert.ok(egg.pilot);key('Escape');assert.equal(egg.pilot,null);assert.equal(egg.object,null);assert.equal(scene.children.length,0);assert.equal(released,1);egg.dispose();
});
