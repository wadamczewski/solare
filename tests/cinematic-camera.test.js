import test from 'node:test';
import assert from 'node:assert/strict';
import {CINEMATIC_DURATION_SECONDS,cinematicPose} from '../src/cinematic-camera.js';

test('cinematic pose traces a safe orbit and returns to its opening bearing',()=>{
 const start=cinematicPose([2,3,4],1,0),end=cinematicPose([2,3,4],1,CINEMATIC_DURATION_SECONDS);
 assert.ok(Math.abs(start.position[0]-end.position[0])<1e-10);
 assert.ok(start.position[1]>3);
 assert.equal(end.progress,1);
});
