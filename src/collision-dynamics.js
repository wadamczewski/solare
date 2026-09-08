const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const length=vector=>Math.hypot(...vector);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];

// A reduced-order angular-momentum transfer. It preserves the N-body linear
// momentum solution and uses the tangential impact component to update the
// visible rotation period and obliquity of a surviving solid remnant.
export function collisionSpinState(primary,relativePosition,relativeVelocity,escapeSpeed,severity){
 const angular=cross(relativePosition,relativeVelocity),angularLength=length(angular),impactLength=Math.max(1e-20,length(relativePosition)*length(relativeVelocity));
 const tangential=angularLength/impactLength;
 const impulse=clamp(tangential*Math.min(2.5,length(relativeVelocity)/Math.max(escapeSpeed,1e-20))*(.13+.16*Math.min(3,severity)),0,.82);
 const orientation=angularLength?angular[1]/angularLength:0;
 return {period:clamp(Math.abs(primary.spin)/(1+impulse),.08,1e6),tilt:clamp(primary.tilt+orientation*impulse*35,-90,90),impulse};
}
