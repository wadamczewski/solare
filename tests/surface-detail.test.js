import test from 'node:test';
import assert from 'node:assert/strict';
import {missionAssetsForBody, surfaceDetailProfile, surfaceReliefClearance, updateSurfaceDetailTiles} from '../src/surface-detail.js';
import {shapeGeometry} from '../src/scene-lod.js';
import {initialSystem} from '../src/physics.js';

test('surface detail retains a far denser mesh than the ordinary high LOD', () => {
 assert.ok(shapeGeometry('surface').attributes.position.count > shapeGeometry('high').attributes.position.count * 10);
});

test('rocky surface profiles retain stronger relief than cloud tops', () => {
 const earth = surfaceDetailProfile({key: 'earth', name: 'Earth'});
 const jupiter = surfaceDetailProfile({key: 'jupiter', name: 'Jupiter', gas: true});
 assert.ok(earth.relief > jupiter.relief * 10);
 // Keep enough separation to avoid clipping, while allowing mountains and
 // crater rims to remain legible from a surface-level camera.
 assert.ok(surfaceReliefClearance({key: 'mars', name: 'Mars'}) > .001);
});

test('mapped worlds expose a nonzero physical relief profile', () => {
 const mars = surfaceDetailProfile({key: 'mars', name: 'Mars'});
 const moon = surfaceDetailProfile({key: 'moon', name: 'Moon'});
 assert.ok(mars.relief > 0);
 assert.ok(moon.relief > mars.relief * .8);
});

test('an unresolved moon never borrows the Moon’s height or tile profile',()=>{
 const nereid=surfaceDetailProfile({key:'moon',name:'Nereida'}),moon=surfaceDetailProfile({key:'moon',name:'Księżyc'});
 assert.equal(nereid.assetKey,null);
 assert.equal(nereid.key,'moon:Nereida');
 assert.equal(moon.assetKey,'moon');
});

test('mission surface products are assigned only to their measured worlds',()=>{
 const expected=new Map([
  ['Ziemia','/textures/surface/earth-blue-marble-4k.jpg'],
  ['Księżyc','/textures/surface/moon-lroc-color.jpg'],
  ['Mars','/textures/surface/mars-mola-height.jpg']
 ]);
 for(const body of initialSystem()){
  const assets=missionAssetsForBody(body);
  if(expected.has(body.name)) assert.equal(assets?.color||assets?.height,expected.get(body.name),body.name);
  else assert.equal(assets,null,`${body.name} must not inherit a mission surface product`);
 }
});

test('stale shared surface overrides fall back safely instead of leaking another world’s data',()=>{
 assert.equal(missionAssetsForBody({key:'moon',name:'Nereida',surface:'moon'}),null);
 assert.equal(missionAssetsForBody({key:'moon',name:'Deimos',surface:'mars'}),null);
 assert.equal(missionAssetsForBody({key:'mars',name:'Mars',surface:'mars'})?.height,'/textures/surface/mars-mola-height.jpg');
});


test('measured terrain replaces raised texture tiles while the observer is inside its survey', () => {
 const calls=[];
 const view={mesh:{material:{displacementScale:.23}},surfaceDetail:{
  surveyedDisplacementScale:.23,
  tiles:{group:{visible:true},update:(latitude,longitude)=>calls.push([latitude,longitude])},
  topography:{update:()=>true}
 }};
 updateSurfaceDetailTiles(view,27.99,86.93);
 assert.equal(view.surfaceDetail.tiles.group.visible,false);
 assert.equal(view.mesh.material.displacementScale,0);
 assert.deepEqual(calls,[]);
 view.surfaceDetail.topography.update=()=>false;
 updateSurfaceDetailTiles(view,26,86);
 assert.equal(view.surfaceDetail.tiles.group.visible,true);
 assert.equal(view.mesh.material.displacementScale,.23);
 assert.deepEqual(calls,[[26,86]]);
});
