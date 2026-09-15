import * as THREE from 'three';

// A deliberately bounded Schwarzschild-inspired observer model.  It retains
// the two facts that matter for a falling observer: the horizon is crossed in
// finite proper time, and the exterior sky is increasingly aberrated into a
// smaller apparent aperture after that crossing. It is not a full GR ray
// tracer and therefore does not claim an exact image inside the horizon.
export const SCHWARZSCHILD_KM_PER_SOLAR_MASS = 2.95325008;
export const BLACK_HOLE_FALL_DURATION = 42;
export const BLACK_HOLE_INTERIOR_DURATION = 13;

export function schwarzschildRadiusKm(massSolar){
 return Math.max(0,Number(massSolar)||0)*SCHWARZSCHILD_KM_PER_SOLAR_MASS;
}

export function blackHoleFallState(seconds,massSolar=4e6){
 const duration=BLACK_HOLE_FALL_DURATION;
 const t=Math.max(0,Number(seconds)||0);
 const progress=Math.min(1,t/duration);
 // The radial coordinate reaches Rs at a finite proper time. The easing only
 // determines the legible pacing of the experience, not a coordinate-time
 // freeze seen by a distant observer.
 const radiusRs=t<duration?1+11*Math.pow(1-progress,2):Math.max(.08,1-(t-duration)/BLACK_HOLE_INTERIOR_DURATION*.92);
 const outside=t<duration;
 const horizonKm=schwarzschildRadiusKm(massSolar);
 const redshift=outside?Math.sqrt(Math.max(0,1-1/radiusRs)):0;
 const lensing=THREE.MathUtils.clamp(.16+.9/(Math.max(radiusRs,1)*.72),0,1);
 const insideProgress=outside?0:THREE.MathUtils.clamp((t-duration)/BLACK_HOLE_INTERIOR_DURATION,0,1);
 // A freely falling observer does not encounter a visible wall. Once inside,
 // the directions that still connect to the exterior contract smoothly.
 const cosmicAperture=outside?1:Math.max(.035,1-insideProgress*.965);
 // At one Schwarzschild radius the tidal gradient scales as M^-2 for the same
 // object length, so a stellar black hole is harsher than a supermassive one.
 const tidalRelative=1/(Math.max(massSolar,.001)*Math.pow(Math.max(radiusRs,.08),3));
 return {seconds:t,progress,radiusRs,horizonKm,outside,crossed:!outside,redshift,lensing,insideProgress,cosmicAperture,tidalRelative,done:t>=duration+BLACK_HOLE_INTERIOR_DURATION};
}

export function createBlackHoleFallPass(ShaderPass){
 const shader={uniforms:{
  tDiffuse:{value:null},fallEnabled:{value:0},center:{value:new THREE.Vector2(.5,.5)},
  lensing:{value:0},redshift:{value:1},aperture:{value:1},inside:{value:0}
 },vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`
  uniform sampler2D tDiffuse;uniform float fallEnabled,lensing,redshift,aperture,inside;uniform vec2 center;varying vec2 vUv;
  vec3 shiftRed(vec3 c,float z){float lum=dot(c,vec3(.2126,.7152,.0722));vec3 red=vec3(lum*.92,lum*.23,lum*.08);return mix(red,c,z);}
  void main(){
   vec2 d=vUv-center;float r=length(d);vec2 direction=d/max(r,.00001);float bend=lensing*.15*exp(-r*8.)*(1.-smoothstep(.48,1.1,r));
   vec2 uv=vUv-direction*bend;
   vec3 color=texture2D(tDiffuse,uv).rgb;
   if(fallEnabled>.5){
    color=shiftRed(color,redshift);
    float photon=exp(-pow((r-(.09+.055*lensing))/.012,2.))*lensing;
    color+=vec3(1.,.35,.08)*photon*.32;
    if(inside>.001){
     float edge=1.-smoothstep(aperture-.055,aperture,r);
     float tunnel=1.-smoothstep(.0,1.,inside)*.72;
     color*=edge*tunnel;
    }
   }
   gl_FragColor=vec4(color,1.);
  }`};
 return new ShaderPass(shader);
}

export function updateBlackHoleFallPass(pass,state,center){
 const u=pass.uniforms;
 u.fallEnabled.value=state?1:0;
 if(!state)return;
 u.center.value.copy(center);
 u.lensing.value=state.lensing;
 u.redshift.value=state.redshift;
 u.aperture.value=state.cosmicAperture;
 u.inside.value=state.insideProgress;
}
