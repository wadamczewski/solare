import test from 'node:test';
import assert from 'node:assert/strict';
import {impactVisualProfile} from '../src/impact-effects.js';

test('a surviving planetary impact uses a surface ejecta plume, not a planet-wide explosion',()=>{
 const profile=impactVisualProfile({kind:'impact',surface:{targetSurvives:true}});
 assert.equal(profile.planetaryImpact,true);assert.equal(profile.shardCount,7);assert.ok(profile.plumeScale<.25);
});

test('disruptive collisions retain their larger debris treatment',()=>{
 const profile=impactVisualProfile({kind:'disrupt'});
 assert.equal(profile.planetaryImpact,false);assert.equal(profile.shardCount,32);assert.equal(profile.plumeScale,1);
});
