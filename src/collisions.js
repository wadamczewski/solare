import {collisionBindingState,surfaceImpact} from './surface-impact.js';
import {horizonRadius} from './catalog.js';
import {AU,G,SOLAR_MASS,body} from './physics.js';
import {accretionStateFor} from './black-hole.js';
import {collisionSpinState} from './collision-dynamics.js';
const dot=(a,b)=>a.reduce((s,x,k)=>s+x*b[k],0);
const sub=(a,b)=>a.map((x,k)=>x-b[k]);
const norm=a=>Math.hypot(...a);
export const collisionRadius=b=>b.key==='blackhole'?horizonRadius(b.mass*SOLAR_MASS)/AU:b.radius/AU;

// A lost primary does not drag its satellites onto the collision remnant. Their
// barycentric state is continuous at the impact instant; direct N-body gravity
// then decides whether they escape, are captured, or form a new orbit.
export function releaseSatellites(bodies,parentIds,event){
 const removed=new Set(parentIds);
 for(const candidate of bodies)if(removed.has(candidate.parent)){
  delete candidate.parent;
  event?.orphaned?.push(candidate.id);
 }
}

// Reduced-order gravity-regime model, not hydrodynamics or fitted SPH scaling laws.
export function resolveCollisions(bodies,{maxBodies=100,contactTest=null,contactNormal=null}={}){
 const events=[],touched=new Set();
 for(let i=0;i<bodies.length;i++)for(let j=bodies.length-1;j>i;j--){
  const a=bodies[i],b=bodies[j];if(touched.has(a.id)||touched.has(b.id))continue;
  const delta=sub(b.p,a.p),distance=norm(delta),contact=collisionRadius(a)+collisionRadius(b);
  if(contactTest?!contactTest(a,b):distance>contact)continue;
  const m=a.mass+b.mass,rel=sub(b.v,a.v),speed=norm(rel),mu=a.mass*b.mass/m;
  // A scripted encounter may supply the approach direction it was staged along;
  // its rendered contact happens where the integrator's separation vector says
  // nothing useful about the geometry of the hit.
  const normal=contactNormal?.(a,b)||(distance>1e-20?delta.map(x=>x/distance):speed>0?rel.map(x=>-x/speed):[1,0,0]);
  const center=a.p.map((x,k)=>(x*a.mass+b.p[k]*b.mass)/m),velocity=a.v.map((x,k)=>(x*a.mass+b.v[k]*b.mass)/m);
  const volumeRadius=Math.cbrt(a.radius**3+b.radius**3),escape=Math.sqrt(2*G*m/Math.max(contact,1e-20));
  const specificEnergy=.5*mu*speed**2/m,binding=collisionBindingState(a,b,speed),severity=binding.pairDisruptionRatio;
  const grazing=speed>0?Math.sqrt(Math.max(0,1-(dot(rel,normal)/speed)**2)):0;
  const blackhole=a.key==='blackhole'||b.key==='blackhole';
  const gas=a.gas||b.gas||['sun','jupiter','saturn','uranus','neptune'].includes(a.key)||['sun','jupiter','saturn','uranus','neptune'].includes(b.key);
  const primary=blackhole?(a.key==='blackhole'?a:b):(a.mass>=b.mass?a:b),secondary=primary===a?b:a;
  const cometImpact=!blackhole&&!gas&&secondary.key==='comet';
  const event={kind:'merge',p:center,v:velocity,normal,radius:volumeRadius,energy:severity,binding,removed:[],added:[],survivor:primary.id,sourceIds:[a.id,b.id],replacements:{},orphaned:[],color:primary.color};
  touched.add(a.id);touched.add(b.id);
  // Grazing rocky impact: dissipate normal kinetic energy, retain tangential motion.
  if(!blackhole&&!gas&&grazing>.72&&speed>1.3*escape&&severity<3&&distance>0){
   const incoming=dot(rel,normal);if(incoming>=0&&a.lastGraze===b.id&&b.lastGraze===a.id)continue;if(incoming<0){const impulse=-(1+.25)*incoming/(1/a.mass+1/b.mass);for(let k=0;k<3;k++){a.v[k]-=impulse*normal[k]/a.mass;b.v[k]+=impulse*normal[k]/b.mass}}
   const aSpin=collisionSpinState(a,delta,rel,escape,severity),bSpin=collisionSpinState(b,delta.map(x=>-x),rel.map(x=>-x),escape,severity);a.spin=aSpin.period;a.tilt=aSpin.tilt;b.spin=bSpin.period;b.tilt=bSpin.tilt;
   a.lastGraze=b.id;b.lastGraze=a.id;
   const separation=contactTest?0:contact*1.002-distance;for(let k=0;k<3;k++){a.p[k]-=normal[k]*separation*b.mass/m;b.p[k]+=normal[k]*separation*a.mass/m}
   a.damage={kind:'graze',strength:Math.min(.45,.08+severity*.15),direction:normal};b.damage={kind:'graze',strength:Math.min(.45,.08+severity*.15),direction:normal.map(x=>-x)};event.kind='graze';events.push(event);continue;
  }
  // A pair may only be replaced by debris once the impact can unbind *each*
  // precursor and their contact system. This prevents a small impactor from
  // incorrectly annihilating a massive target simply because it is destroyed.
  // Horizon crossing remains an absorption event, not material disruption.
  const totalDisruption=!blackhole&&!gas&&a.key!=='fragment'&&b.key!=='fragment'&&binding.a.disruptionRatio>=2&&binding.b.disruptionRatio>=2&&severity>=7&&maxBodies-(bodies.length-2)>=2;
  let fraction=blackhole||gas||a.key==='fragment'||b.key==='fragment'||severity<.15?0:totalDisruption?1:Math.min(.65,severity*.22);
  const slots=Math.max(0,maxBodies-(bodies.length-(totalDisruption?2:1)));
  const fragments=fraction>0?Math.min(totalDisruption?10:6,totalDisruption?slots:Math.floor(slots/2)*2):0;
  if(!fragments)fraction=0;
  const remnantMass=m*(1-fraction),fragmentMass=m*fraction/Math.max(1,fragments);
  const remnantRadius=volumeRadius*Math.cbrt(1-fraction),fragmentRadius=volumeRadius*Math.cbrt(fraction/Math.max(1,fragments));
  const surface=surfaceImpact(a,b,speed);const hitDirection=primary===a?normal:normal.map(x=>-x);
  event.surface=surface;event.impactSpeed=speed;event.impactDirection=hitDirection;
  const primaryDelta=primary===a?delta:delta.map(x=>-x),primaryVelocity=primary===a?rel:rel.map(x=>-x),spinState=collisionSpinState(primary,primaryDelta,primaryVelocity,escape,severity);
  if(!totalDisruption){
   primary.spin=spinState.period;primary.tilt=spinState.tilt;
   primary.p=[...center];primary.v=[...velocity];primary.mass=remnantMass;
   if(blackhole){primary.accretion=accretionStateFor(primary,secondary);event.accretion=primary.accretion;}
   if(!blackhole)primary.damage={kind:gas?'accrete':fraction>.25?'disrupt':'crater',strength:Math.min(.85,.12+Math.max(severity*.25,surface.globalHeat*.6)),surface,direction:hitDirection};
   primary.radius=blackhole?collisionRadius(primary)*AU:remnantRadius;
   if(primary.parent===secondary.id)delete primary.parent;
   // A moon retains its instantaneous state when its primary disappears. It
   // cannot be reassigned to an absorber or merger remnant: that would invent
   // a new Kepler orbit and violate the velocity it had at the impact instant.
   releaseSatellites(bodies,[secondary.id],event);
   bodies.splice(bodies.indexOf(secondary),1);event.removed.push(secondary.id);
   event.replacements[secondary.id]=null;
  }else{
   event.survivor=null;event.removed.push(a.id,b.id);
   releaseSatellites(bodies,[a.id,b.id],event);
   const aIndex=bodies.indexOf(a),bIndex=bodies.indexOf(b);bodies.splice(Math.max(aIndex,bIndex),1);bodies.splice(Math.min(aIndex,bIndex),1);
  }
  // Symmetric equal-mass pairs conserve total mass, linear momentum and barycenter.
  // At most 20% of impact energy is converted to ejecta kinetic energy.
  const launch=fraction?Math.sqrt(.4*specificEnergy/fraction):0;
  for(let k=0;k<fragments;k++){
   const pair=Math.floor(k/2),sign=k%2?1:-1,t=pair*2.399+.4;
   const tangent=Math.abs(normal[1])<.9?[normal[2],0,-normal[0]]:[0,-normal[2],normal[1]],length=norm(tangent);
   const side=tangent.map(x=>x/length),cross=[normal[1]*side[2]-normal[2]*side[1],normal[2]*side[0]-normal[0]*side[2],normal[0]*side[1]-normal[1]*side[0]];
   const direction=normal.map((x,i)=>sign*(.8*x+.6*(Math.cos(t)*side[i]+Math.sin(t)*cross[i])));
   const offset=(Math.max(remnantRadius,fragmentRadius)+fragmentRadius)*2.5/AU;
   const fragment=body({name:`Odłamek · ${a.name} + ${b.name}`,key:'fragment',irregular:true,fragmentOf:[a.id,b.id],mass:fragmentMass,radius:fragmentRadius,spin:spinState.period,tilt:spinState.tilt,color:primary.color,p:center.map((x,k)=>x+direction[k]*offset),v:velocity.map((x,k)=>x+direction[k]*launch)});
   bodies.push(fragment);touched.add(fragment.id);event.added.push(fragment.id);
  }
  const largest=event.added.map(id=>bodies.find(candidate=>candidate.id===id)).filter(Boolean).sort((left,right)=>right.mass-left.mass)[0];
  if(totalDisruption){event.replacements[a.id]=largest?.id||null;event.replacements[b.id]=largest?.id||null;}
  else if(largest)event.replacements[secondary.id]=largest.id;
  event.kind=blackhole?'absorb':gas?'accrete':cometImpact?'impact':totalDisruption||fraction>.25?'disrupt':fraction>0?'eject':'merge';events.push(event);
  // Restart scanning after array removal; touched remnants are resolved next substep.
  i=-1;break;
 }
 return events;
}
