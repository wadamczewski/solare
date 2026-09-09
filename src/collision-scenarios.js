import {AU} from './physics.js';

export const collisionScenarios=[
 // Halley-type comets meet Earth at a most-probable 51.3 km/s. The start is
 // placed far enough away for that physical closing speed to remain visible for
 // sixteen seconds at the default 2 simulated days per real second.
 {id:'halley-earth',name:'1P/Halley → Ziemia',projectile:'halley',target:'earth',durationDays:32,impactSpeedKmS:51.3}
];

export function collisionLaunchState(target,{durationDays,distanceAU,impactSpeedKmS}){
 const direction=[1,.06,-.04],length=Math.hypot(...direction),unit=direction.map(value=>value/length);
 const speedAUPerDay=impactSpeedKmS?impactSpeedKmS*86400/AU:distanceAU/durationDays;
 const plannedDistance=distanceAU??speedAUPerDay*durationDays;
 return {
  p:target.p.map((value,index)=>value+unit[index]*plannedDistance),
  v:target.v.map((value,index)=>value-unit[index]*speedAUPerDay),
  impactDays:durationDays,
  distanceAU:plannedDistance,
  speedKmS:speedAUPerDay*AU/86400,
  direction:unit
 };
}

// In readable scale, sizes and distances no longer share one physical scale.
// Keep a scripted encounter legible, but converge exactly at the sum of the
// two rendered radii. This avoids the apparent "impact at the core" caused by
// freezing a geometrically oversized comet until its physical arrival time.
export function scenarioVisualSeparation(scenario,elapsedDays,contactRadius){
 const elapsed=Math.max(0,elapsedDays-scenario.launchElapsed);
 const progress=Math.min(1,elapsed/Math.max(1e-9,scenario.minDurationDays));
 return contactRadius+(scenario.visualApproachSpan||0)*(1-progress);
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
