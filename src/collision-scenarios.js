import {AU} from './physics.js';

// Every leg lasts the same 32 simulated days so the approach stays visible for
// sixteen seconds at the default 2 days per real second; the launch distance
// follows from that and the closing speed, which is the quantity that carries
// the physics. Speeds are the encounter speeds these bodies would actually
// arrive at, including the target's gravitational focusing where it matters.
// `target` names a surface id, so a moon is as addressable as a planet.
export const DEFAULT_DURATION_DAYS=32;
export const DEFAULT_IMPACT_SPEED_KMS=20;
const LIGHT_SPEED_KMS=299792.458;
const scenario=(id,name,projectile,target,impactSpeedKmS)=>({id,name,projectile,target,durationDays:DEFAULT_DURATION_DAYS,impactSpeedKmS});

export const collisionScenarios=[
 // Smallest first: the list doubles as a sense of scale, from a body a probe
 // has already nudged to one that would remake the planet it hits.
 scenario('dimorphos-moon','Dimorphos → Księżyc','dimorphos','moon',15),
 scenario('apophis-earth','99942 Apophis → Ziemia','apophis','earth',12.6),
 scenario('bennu-earth','101955 Bennu → Ziemia','bennu','earth',12.7),
 // 1994's fragments entered Jupiter at about 60 km/s, most of it the planet's
 // own escape velocity rather than the comet's approach.
 scenario('shoemaker-levy-9-jupiter','Shoemaker-Levy 9 → Jowisz','shoemaker-levy-9','jupiter',60),
 scenario('halley-earth','1P/Halley → Ziemia','halley','earth',51.3),
 scenario('chicxulub-earth','Impaktor Chicxulub → Ziemia','chicxulub','earth',20),
 scenario('vesta-mars','4 Westa → Mars','vesta','mars',10),
 scenario('ceres-earth','1 Ceres → Ziemia','ceres','earth',15),
 scenario('mercury-venus','Merkury → Wenus','mercury','venus',30),
 scenario('theia-earth','Theia → Ziemia','theia','earth',9)
];

// A viewer-built encounter is the same descriptor a listed one is, so it takes
// exactly the same launch path; only the pair and the closing speed are chosen.
// The id is composed from the pair, so relaunching a pair replaces its previous
// projectile rather than leaving a stack of them converging on the same target.
export function buildCustomScenario({projectileId,projectileName,target,speedKmS,durationDays=DEFAULT_DURATION_DAYS}){
 if(!projectileId||!target)return null;
 return {id:`custom:${projectileId}:${target.id}`,name:`${projectileName||projectileId} → ${target.name}`,
  projectile:projectileId,targetId:target.id,durationDays,impactSpeedKmS:clampImpactSpeed(speedKmS),custom:true};
}

// Zero would never arrive and the model's relativistic correction diverges at c.
export function clampImpactSpeed(value,fallback=DEFAULT_IMPACT_SPEED_KMS){
 const speed=Number(value);
 return Number.isFinite(speed)&&speed>0?Math.min(speed,LIGHT_SPEED_KMS*.99):fallback;
}

// The body a scenario aims at: an explicit id for a viewer-built course, or the
// surface id for a listed one, which addresses moons and planets alike.
export function findScenarioTarget(bodies,item){
 return item?.targetId!=null?bodies.find(body=>body.id===item.targetId)
  :bodies.find(body=>body.surface===item?.target)||bodies.find(body=>body.key===item?.target);
}

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
 return elapsedDays-scenario.launchElapsed>=scenario.minDurationDays-1e-6;
}

// A scripted encounter draws the projectile along a planned approach while the
// integrator carries its real state somewhere else entirely, so the physical
// separation vector at the moment of visual contact points in an unrelated
// direction. Left alone it reads as a glancing blow: the pair registers a graze
// and an impulse before the real impact. The planned approach direction is the
// honest normal for a contact the script decided, so it is supplied instead.
export function scenarioContactNormal(a,b){
 const scenario=a.collisionScenario||b.collisionScenario;
 if(!scenario?.visualDirection)return null;
 const projectile=a.collisionScenario?a:b,target=projectile===a?b:a;
 if(target.id!==scenario.targetId)return null;
 const length=Math.hypot(...scenario.visualDirection);
 if(!(length>0))return null;
 // resolveCollisions expects the normal to run from the first body to the
 // second; visualDirection runs from the target out towards the projectile.
 const sign=projectile===b?1:-1;
 return scenario.visualDirection.map(value=>sign*value/length);
}
