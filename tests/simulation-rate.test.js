import test from 'node:test';
import assert from 'node:assert/strict';
import {changeSimulationRate} from '../src/simulation-rate.js';

test('lowering the rate clears the obsolete high-rate integration backlog',()=>{
 assert.deepEqual(changeSimulationRate(365,137.2,.02),{speed:.02,pendingDays:0});
 assert.deepEqual(changeSimulationRate(365,137.2,2),{speed:2,pendingDays:0});
});

test('an invalid rate leaves the active rate and accumulated integration untouched',()=>{
 assert.deepEqual(changeSimulationRate(10,3.5,0),{speed:10,pendingDays:3.5});
});
