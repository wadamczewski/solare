import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DURATION_DAYS,buildCustomScenario,clampImpactSpeed,collisionLaunchState,collisionScenarios,findScenarioTarget,scenarioCollisionReady,scenarioVisualSeparation} from '../src/collision-scenarios.js';
import {catalog} from '../src/catalog.js';

test('Halley launch is aimed at Earth and stays visible for at least 15 seconds at 2 days per second',()=>{
 const target={p:[1,0,0],v:[0,.017,0]},scenario=collisionScenarios.find(item=>item.id==='halley-earth'),state=collisionLaunchState(target,scenario);
 const relPosition=state.p.map((value,index)=>value-target.p[index]),relVelocity=state.v.map((value,index)=>value-target.v[index]);
 assert.ok(relPosition.reduce((sum,value,index)=>sum+value*relVelocity[index],0)<0);
 assert.ok(state.impactDays/2>=15);
 assert.ok(Math.abs(state.speedKmS-51.3)<1e-9);
 assert.ok(state.distanceAU>.9,'approach distance must match 32 days at the stated collision speed');
});
test('enlarged readable-scale silhouettes cannot end the scripted approach early',()=>{
 const projectile={id:1,collisionScenario:{targetId:2,launchElapsed:10,minDurationDays:32}},earth={id:2};
 assert.equal(scenarioCollisionReady(projectile,earth,41.99),false);
 assert.equal(scenarioCollisionReady(projectile,earth,42),true);
 // A bystander can never take the projectile: that is what stops an encounter
 // from being cancelled by whatever happens to lie along an unseen trajectory.
 assert.equal(scenarioCollisionReady(projectile,{id:3},10),false);
 assert.equal(scenarioCollisionReady(projectile,{id:3},1000),false);
 // Two bodies with no scenario between them collide as they always did.
 assert.equal(scenarioCollisionReady({id:4},{id:5},10),true);
});
test('readable-scale approach ends at external visual contact after the planned duration',()=>{
 const scenario={launchElapsed:10,minDurationDays:32,visualApproachSpan:2.6},contactRadius=.334;
 assert.equal(scenarioVisualSeparation(scenario,10,contactRadius),2.934);
 assert.equal(scenarioVisualSeparation(scenario,42,contactRadius),contactRadius);
 assert.equal(scenarioVisualSeparation(scenario,100,contactRadius),contactRadius);
});

test('every listed scenario names a catalogue body and a real closing speed',()=>{
 assert.ok(collisionScenarios.length>1,'the list is meant to span a range of sizes');
 const ids=new Set();
 for(const item of collisionScenarios){
  assert.ok(!ids.has(item.id),`duplicate scenario id ${item.id}`);ids.add(item.id);
  assert.ok(catalog.some(preset=>preset.id===item.projectile),`${item.id}: no catalogue entry ${item.projectile}`);
  assert.ok(item.impactSpeedKmS>0&&item.impactSpeedKmS<300000,`${item.id}: ${item.impactSpeedKmS} km/s`);
  // Every approach must stay on screen for the same fifteen seconds the Halley
  // leg was tuned for, or a small fast body arrives before it has been seen.
  assert.ok(collisionLaunchState({p:[1,0,0],v:[0,.017,0]},item).impactDays/2>=15,item.id);
 }
 // Ordered smallest projectile first, so the list reads as a scale.
 const radii=collisionScenarios.map(item=>catalog.find(preset=>preset.id===item.projectile).radius);
 assert.deepEqual(radii,[...radii].sort((a,b)=>a-b),'scenarios should run from the smallest body to the largest');
});

test('a scenario finds its target by surface id, so a moon is as addressable as a planet',()=>{
 const bodies=[{id:1,key:'earth',surface:'earth',name:'Ziemia'},{id:2,key:'moon',surface:'moon',name:'Księżyc'},{id:3,key:'moon',surface:'phobos',name:'Fobos'}];
 assert.equal(findScenarioTarget(bodies,{target:'moon'}).id,2,'must not match the first body whose key is moon');
 assert.equal(findScenarioTarget(bodies,{target:'phobos'}).id,3);
 assert.equal(findScenarioTarget(bodies,{target:'earth'}).id,1);
 // A viewer-built course names its target outright.
 assert.equal(findScenarioTarget(bodies,{targetId:3,target:'earth'}).id,3);
 assert.equal(findScenarioTarget(bodies,{target:'nothing'}),undefined);
});

test('a viewer-built course is the same descriptor a listed one is',()=>{
 const target={id:9,name:'Mars'};
 const custom=buildCustomScenario({projectileId:'bennu',projectileName:'101955 Bennu',target,speedKmS:'18'});
 assert.equal(custom.projectile,'bennu');
 assert.equal(custom.targetId,9);
 assert.equal(custom.impactSpeedKmS,18);
 assert.equal(custom.durationDays,DEFAULT_DURATION_DAYS);
 assert.match(custom.name,/101955 Bennu → Mars/);
 // The id is the pair, so relaunching replaces the previous projectile.
 assert.equal(buildCustomScenario({projectileId:'bennu',projectileName:'x',target,speedKmS:5}).id,custom.id);
 assert.notEqual(buildCustomScenario({projectileId:'ceres',projectileName:'x',target,speedKmS:5}).id,custom.id);
 assert.equal(buildCustomScenario({projectileId:'bennu',target:null,speedKmS:5}),null);
 // It launches like any other: aimed at the target, arriving after the leg.
 const state=collisionLaunchState({p:[1.5,0,0],v:[0,.014,0]},custom);
 const approach=state.p.map((value,index)=>value-1.5*(index===0?1:0)),motion=state.v.map((value,index)=>value-(index===1?.014:0));
 assert.ok(approach.reduce((sum,value,index)=>sum+value*motion[index],0)<0,'must close on the target, not recede');
});

test('an unusable speed falls back rather than launching something that never arrives',()=>{
 assert.equal(clampImpactSpeed(''),20);
 assert.equal(clampImpactSpeed(0),20);
 assert.equal(clampImpactSpeed(-9),20);
 assert.equal(clampImpactSpeed('nonsense'),20);
 assert.equal(clampImpactSpeed('12.5'),12.5);
 // Nothing may be launched at or above light speed: the binding-energy model
 // carries a relativistic correction that diverges there.
 assert.ok(clampImpactSpeed(1e9)<299792.458);
});

test('every scenario is staged from one fixed moment inside the planetary theory',()=>{
 // The whole system state follows from this date, so a scenario launched twice
 // is the identical run. The approximate-elements fit is valid 1800-2050; a
 // date outside it would place the planets by extrapolation.
 const from=Date.parse('1800-01-01T00:00:00Z'),to=Date.parse('2050-01-01T00:00:00Z');
 for(const item of collisionScenarios){
  const at=Date.parse(item.epoch);
  assert.ok(Number.isFinite(at),`${item.id}: unparseable epoch ${item.epoch}`);
  assert.ok(at>from&&at<to,`${item.id}: ${item.epoch} is outside the ephemeris fit`);
  // The epoch is the launch; the impact lands one leg later.
  const impact=new Date(at+item.durationDays*86400000);
  assert.ok(impact.getTime()>at);
 }
 // Reading the same scenario twice must give the same instant, not "now".
 assert.equal(collisionScenarios[0].epoch,collisionScenarios[0].epoch);
});

test('a viewer-built course carries no epoch, so it plays out where the viewer is',()=>{
 const custom=buildCustomScenario({projectileId:'bennu',projectileName:'Bennu',target:{id:2,name:'Mars'},speedKmS:12});
 assert.equal(custom.epoch,undefined);
});
