import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdaptiveQuality} from '../src/adaptive-quality.js';

test('sustained slow frames lower render quality gradually',()=>{
 const quality=createAdaptiveQuality();let state;
 for(let i=0;i<80;i++)state=quality.update(34);
 assert.equal(state.id,'balanced');
 for(let i=0;i<80;i++)state=quality.update(34);
 assert.equal(state.id,'efficient');
});

test('sustained fast frames recover quality one profile at a time',()=>{
 const quality=createAdaptiveQuality();let state;
 for(let i=0;i<160;i++)state=quality.update(35);
 for(let i=0;i<650;i++)state=quality.update(12);
 assert.equal(state.id,'balanced');
});
