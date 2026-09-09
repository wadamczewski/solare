import {AU} from './physics.js';

export const collisionScenarios=[
 {id:'halley-earth',name:'1P/Halley → Ziemia',projectile:'halley',target:'earth',speedKmS:70,distanceAU:.14}
];

export function collisionLaunchState(target,{speedKmS,distanceAU}){
 const direction=[1,.06,-.04],length=Math.hypot(...direction),unit=direction.map(value=>value/length);
 const speedAUPerDay=speedKmS*86400/AU;
 return {
  p:target.p.map((value,index)=>value+unit[index]*distanceAU),
  v:target.v.map((value,index)=>value-unit[index]*speedAUPerDay),
  impactDays:distanceAU/speedAUPerDay
 };
}
