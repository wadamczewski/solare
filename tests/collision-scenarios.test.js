import test from 'node:test';
import assert from 'node:assert/strict';
import {collisionLaunchState,collisionScenarios} from '../src/collision-scenarios.js';

test('Halley launch is aimed at Earth and stays visible for at least 15 seconds at 2 days per second',()=>{
 const target={p:[1,0,0],v:[0,.017,0]},scenario=collisionScenarios[0],state=collisionLaunchState(target,scenario);
 const relPosition=state.p.map((value,index)=>value-target.p[index]),relVelocity=state.v.map((value,index)=>value-target.v[index]);
 assert.ok(relPosition.reduce((sum,value,index)=>sum+value*relVelocity[index],0)<0);
 assert.ok(state.impactDays/2>=15);
});
