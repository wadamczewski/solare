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
