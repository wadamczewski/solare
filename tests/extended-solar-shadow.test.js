import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {apparentDiskOcclusion,solarOccludersForReceiver,solarShadowCone} from '../src/extended-solar-shadow.js';

test('solar shadow cone closes at the physical umbra length and opens into a penumbra',()=>{
 const cone=solarShadowCone(10,1,100);
 assert.ok(Math.abs(cone.umbraLength-100/9)<1e-12);
 assert.ok(Math.abs(cone.umbraRadius(100/9))<1e-12);
 assert.ok(cone.umbraRadius(100/9+.01)<0,'past the apex is the antumbra');
 assert.ok(cone.penumbraRadius(100)>1,'finite solar disc makes the outer edge open');
});

test('apparent disc overlap models a soft penumbra and a full umbra',()=>{
 assert.equal(apparentDiskOcclusion(.01,.01,.03),0);
 assert.equal(apparentDiskOcclusion(.01,.02,.001),1);
 const partial=apparentDiskOcclusion(.01,.01,.01);
 assert.ok(partial>0&&partial<1,'the edge is a continuous penumbra, not a binary line');
});

test('occluder selection keeps only bodies whose apparent discs reach the solar disc',()=>{
 const receiver=new Vector3(0,0,0),sun=new Vector3(100,0,0);
 const candidates=[
  {id:1,position:new Vector3(40,0,0),radius:2},
  {id:2,position:new Vector3(40,20,0),radius:1},
  {id:3,position:new Vector3(120,0,0),radius:10}
 ];
 assert.deepEqual(solarOccludersForReceiver(receiver,sun,10,candidates,0).map(item=>item.id),[1]);
});
