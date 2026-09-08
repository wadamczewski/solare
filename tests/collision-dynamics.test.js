import test from 'node:test';
import assert from 'node:assert/strict';
import {collisionSpinState} from '../src/collision-dynamics.js';

test('off-axis impact speeds a remnant rotation while a head-on impact does not invent spin',()=>{
 const body={spin:24,tilt:0};const headOn=collisionSpinState(body,[1,0,0],[-.1,0,0],.05,1),offAxis=collisionSpinState(body,[1,0,0],[0,0,.1],.05,1);
 assert.equal(headOn.period,24);assert.ok(offAxis.period<24);assert.notEqual(offAxis.tilt,0);
});
