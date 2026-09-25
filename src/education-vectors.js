import {educationMetrics,vectorLength} from './education-metrics.js';

// Which bodies get physics vectors, measured against what, and how long to
// draw them. The physics layer used to draw one velocity and one gravity
// arrow for the selected body only; it now draws them for every body in view
// that moves, so the whole system's motion can be read at a glance.

// A body is measured against its parent when it has one (a moon against its
// planet), otherwise against the most massive other body - the Sun for a
// planet, the companion for a star in a binary. A body that outweighs
// everything else at least tenfold is the system's centre: its own drift
// around the barycentre is not motion worth an arrow.
export function educationPrimary(body,bodies){
 if(!body)return null;
 if(body.parent!=null){const parent=bodies.find(item=>item.id===body.parent);if(parent)return parent}
 let heaviest=null;
 for(const item of bodies)if(item!==body&&(!heaviest||item.mass>heaviest.mass))heaviest=item;
 return heaviest&&heaviest.mass*10>body.mass?heaviest:null;
}

// Bodies whose vectors to draw. `visible(body)` answers whether it is inside
// the view; a body without a primary, or that is not moving relative to it,
// is left out.
export function movingBodiesInView(bodies,visible,{minimumSpeedKmS=1e-6}={}){
 const out=[];
 for(const body of bodies){
  const primary=educationPrimary(body,bodies);
  if(!primary||!visible(body))continue;
  const metrics=educationMetrics(body,primary);
  if(!metrics||metrics.speed<minimumSpeedKmS||vectorLength(metrics.direction)<1e-15)continue;
  out.push({body,primary,metrics});
 }
 return out;
}

// World-space length that shows as `pixels` on screen at `distance` from a
// perspective camera, never shorter than `minimum` (so an arrow always clears
// the body it starts from). With dozens of arrows on screen they must be sized
// on screen, not in the scene: Saturn's moons sit a hair apart at system scale.
export function screenLength(pixels,distance,fovDeg,viewportHeight,minimum=0){
 const perPixel=2*Math.max(distance,1e-9)*Math.tan(fovDeg*Math.PI/360)/Math.max(1,viewportHeight);
 return Math.max(minimum,pixels*perPixel);
}
