import {AU} from './physics.js';
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const length=vector=>Math.hypot(...vector);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

// Uniform-density sphere, matching the assumption bindingEnergyJ already makes.
// A differentiated body concentrates mass inwards and would spin up a little
// more readily (Earth measures 0.3307), so this errs towards inventing less.
const MOMENT_FACTOR=.4;

// A reduced-order angular-momentum transfer. It preserves the N-body linear
// momentum solution and uses the tangential impact component to update the
// visible rotation period and obliquity of a surviving solid remnant.
//
// The transferred amount is an actual angular-momentum ratio, not a shape
// factor: what a strike does to a day depends on how much momentum the
// impactor carries about the target's centre, m*b*v, against the spin the
// target already has, I*omega. Without the mass term a comet nucleus changed
// Earth's day by six hours, where its own angular momentum is eight orders of
// magnitude below Earth's - a difference of a fraction of a microsecond.
//
// The lever arm is the contact radius, not the integrator's separation: a
// scripted encounter is resolved at a rendered contact while its bodies are
// still far apart, and the impact parameter can never exceed where they touch.
export function collisionSpinState(primary,impactor,relativePosition,relativeVelocity,contactRadiusAU){
 const angular=cross(relativePosition,relativeVelocity),angularLength=length(angular);
 const speed=length(relativeVelocity),impactLength=Math.max(1e-20,length(relativePosition)*speed);
 const tangential=angularLength/impactLength;
 const spinRate=2*Math.PI/Math.max(1e-9,Math.abs(primary.spin)/24);          // rad per day
 const inertia=MOMENT_FACTOR*primary.mass*(primary.radius/AU)**2;            // M☉·AU²
 const delivered=(impactor?.mass||0)*Math.max(0,contactRadiusAU)*speed*tangential;
 // Only the magnitude is modelled: a retrograde strike slowing a body down is
 // left out, as it was before, so this cannot spin anything to a standstill.
 const impulse=inertia*spinRate>0?clamp(delivered/(inertia*spinRate),0,.82):0;
 const orientation=angularLength?angular[1]/angularLength:0;
 return {period:clamp(Math.abs(primary.spin)/(1+impulse),.08,1e6),tilt:clamp(primary.tilt+orientation*impulse*35,-90,90),impulse};
}
