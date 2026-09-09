import {AU} from './physics.js';

export const collisionScenarios=[
 {id:'halley-earth',name:'1P/Halley → Ziemia',projectile:'halley',target:'earth',durationDays:32,distanceAU:.14}
];

export function collisionLaunchState(target,{durationDays,distanceAU}){
 const direction=[1,.06,-.04],length=Math.hypot(...direction),unit=direction.map(value=>value/length);
 const speedAUPerDay=distanceAU/durationDays;
 return {
  p:target.p.map((value,index)=>value+unit[index]*distanceAU),
  v:target.v.map((value,index)=>value-unit[index]*speedAUPerDay),
  impactDays:durationDays,
  speedKmS:speedAUPerDay*AU/86400
 };
}

// Readable-scale bodies are deliberately enlarged for navigation. A scripted
// impact must not use that enlarged silhouette as its contact boundary before
// the planned physical approach has had time to play out.
export function scenarioCollisionReady(a,b,elapsedDays){
 const scenario=a.collisionScenario||b.collisionScenario;
 if(!scenario)return true;
 const other=a.collisionScenario?b:a;
 if(other.id!==scenario.targetId)return true;
 return elapsedDays-scenario.launchElapsed>=scenario.minDurationDays;
}
