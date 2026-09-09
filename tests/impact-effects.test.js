import test from 'node:test';
import assert from 'node:assert/strict';
import {impactVisualProfile,createImpactEffects} from '../src/impact-effects.js';
import {Scene,Mesh,SphereGeometry,MeshBasicMaterial,Vector3} from 'three';

test('a surviving planetary impact uses a surface ejecta plume, not a planet-wide explosion',()=>{
 const profile=impactVisualProfile({kind:'impact',surface:{targetSurvives:true}});
 assert.equal(profile.planetaryImpact,true);assert.equal(profile.shardCount,7);assert.ok(profile.plumeScale<.25);
});

test('disruptive collisions retain their larger debris treatment',()=>{
 const profile=impactVisualProfile({kind:'disrupt'});
 assert.equal(profile.planetaryImpact,false);assert.equal(profile.shardCount,32);assert.equal(profile.plumeScale,1);
});

test('a surviving impact is attached to the rotating struck surface',()=>{
 const scene=new Scene(),surface=new Mesh(new SphereGeometry(),new MeshBasicMaterial());scene.add(surface);
 const effects=createImpactEffects(scene);
 const effect=effects.add({kind:'impact',surface:{targetSurvives:true},impactDirection:[1,0,0],p:[0,0,0],v:[0,0,0],energy:.2},new Vector3(),.08,{surfaceMesh:surface,surfaceAxis:new Vector3(1,0,0),surfaceRadius:.4});
 assert.equal(effect.group.parent,surface);
 assert.ok(Math.abs(effect.group.position.length()-1.012)<1e-6);
 surface.rotation.y=Math.PI/2;surface.updateMatrixWorld(true);
 assert.ok(effect.group.getWorldPosition(new Vector3()).z<-1,'effect inherits the planet rotation');
});
