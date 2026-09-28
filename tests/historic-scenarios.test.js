import test from 'node:test';
import assert from 'node:assert/strict';
import {HISTORIC_SCENARIOS,HOLD_SECONDS,milestonesReached,nextStop,scenarioDurationSeconds,scenarioSegment} from '../src/historic-scenarios.js';
import {OBSERVATION_WINDOWS,initialSystem,isObserved} from '../src/physics.js';

test('every comet, probe and the interstellar object has a scenario',()=>{
 assert.deepEqual(HISTORIC_SCENARIOS.map(item=>item.object).sort(),['67p','hale-bopp','new-horizons','oumuamua','tesla-roadster','viking-1','voyager-1']);
 for(const item of HISTORIC_SCENARIOS)assert.ok(initialSystem(new Date(item.start)).some(body=>body.kinematicType===item.object),item.id);
});

test('a scenario plays only inside the object’s observation window',()=>{
 for(const item of HISTORIC_SCENARIOS){
  assert.ok(isObserved(item.object,item.start),`${item.id} starts while observed`);
  assert.ok(isObserved(item.object,item.end),`${item.id} ends while observed`);
  assert.ok(OBSERVATION_WINDOWS[item.object],`${item.id} has a window`);
 }
});

test('each scenario lasts about a minute, milestones included',()=>{
 for(const item of HISTORIC_SCENARIOS){
  const seconds=scenarioDurationSeconds(item);
  assert.ok(seconds>25&&seconds<90,`${item.id} takes ${seconds.toFixed(1)} s`);
  assert.ok(item.segments.at(-1).until>=item.end,`${item.id} has a rate until its end`);
 }
 assert.ok(HOLD_SECONDS>1);
});

test('milestones are dated, ordered and inside the scenario',()=>{
 for(const item of HISTORIC_SCENARIOS){
  const times=item.milestones.map(entry=>entry.time);
  assert.deepEqual(times,[...times].sort((a,b)=>a-b),item.id);
  assert.ok(times.every(time=>time>=item.start&&time<=item.end),item.id);
  assert.ok(item.milestones.every(entry=>['minute','day','month'].includes(entry.precision)&&entry.label.length>5));
 }
});

test('the clock stops exactly on events and stage changes',()=>{
 const voyager=HISTORIC_SCENARIOS.find(item=>item.id==='voyager-1');
 const jupiter=Date.parse('1979-03-05T12:05:00Z');
 assert.equal(nextStop(voyager,Date.parse('1979-03-01T00:00:00Z')),jupiter);
 assert.deepEqual(milestonesReached(voyager,jupiter-1,jupiter).map(entry=>entry.label),['Najbliżej Jowisza · 349 000 km od środka planety']);
 assert.equal(scenarioSegment(voyager,jupiter).scale,'true','a flyby is shown in true scale');
 assert.equal(scenarioSegment(voyager,Date.parse('1990-01-01T00:00:00Z')).scale,'map','cruise is on the readable map');
});
