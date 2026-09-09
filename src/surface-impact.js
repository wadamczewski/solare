import {SOLAR_MASS,AU} from './physics.js';
const G=6.67430e-11;

// A uniform-density sphere is deliberately conservative here: real differentiated
// bodies need at least this much energy to disperse gravitationally.  The value
// gives the collision model a physical baseline before it creates ejecta.
export function bindingEnergyJ(b){
 return .6*G*(b.mass*SOLAR_MASS)**2/Math.max(1,b.radius*1000);
}

export function collisionBindingState(a,b,speed){
 const c=299792458,v=Math.min(speed*AU*1000/86400,c*.999999),beta2=(v/c)**2;
 const reduced=a.mass*b.mass/(a.mass+b.mass)*SOLAR_MASS;
 // Centre-of-mass kinetic energy with a relativistic correction for deliberate
 // high-speed scenarios. Regular integration remains Newtonian.
 const energyJ=reduced*v*v/(Math.sqrt(1-beta2)*(1+Math.sqrt(1-beta2)));
 const aBindingJ=bindingEnergyJ(a),bBindingJ=bindingEnergyJ(b);
 const contactDistance=Math.max(1,(a.radius+b.radius)*1000);
 const mutualBindingJ=G*(a.mass*SOLAR_MASS)*(b.mass*SOLAR_MASS)/contactDistance;
 const pairBindingJ=aBindingJ+bBindingJ+mutualBindingJ;
 return {energyJ,mutualBindingJ,pairBindingJ,pairDisruptionRatio:energyJ/pairBindingJ,
  a:{id:a.id,bindingJ:aBindingJ,disruptionRatio:energyJ/aBindingJ},
  b:{id:b.id,bindingJ:bBindingJ,disruptionRatio:energyJ/bBindingJ}};
}

export function surfaceImpact(a,b,speed){
 const binding=collisionBindingState(a,b,speed),target=a.mass>=b.mass?a:b;
 const targetState=target===a?binding.a:binding.b;
 const fluence=binding.energyJ/(4*Math.PI*(target.radius*1000)**2);
 return {energyJ:binding.energyJ,globalHeat:Math.max(0,Math.min(1,(Math.log10(Math.max(1,fluence))-7)/7)),targetBindingJ:targetState.bindingJ,disruptionRatio:targetState.disruptionRatio,targetSurvives:targetState.disruptionRatio<.01,binding};
}
export function attachSurfaceImpact(view,b,axis){
 if(b.key!=='earth'||!b.damage?.surface)return;
 const material=view.mesh.material,heat=b.damage.surface.globalHeat;
 if(!view.surfaceUniforms){
  const u={impactAxis:{value:axis.clone()},impactHeat:{value:heat},impactAge:{value:0}};view.surfaceUniforms=u;
  const previous=material.onBeforeCompile;
  material.onBeforeCompile=shader=>{
   previous(shader);Object.assign(shader.uniforms,u);
   shader.vertexShader='varying vec3 impactLocal;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nimpactLocal=normalize(position);');
   shader.fragmentShader='varying vec3 impactLocal;uniform vec3 impactAxis;uniform float impactHeat;uniform float impactAge;\n'+shader.fragmentShader;
   // Local names here must dodge the GLSL ES 3.00 reserved list, which three
  // compiles to on WebGL2 and which is longer than the WebGL1 one: a float
  // called `patch` failed this fragment shader, and a material whose program
  // will not link draws nothing, so Earth turned see-through after an impact.
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float angle=acos(clamp(dot(normalize(impactLocal),impactAxis),-1.0,1.0));
    float spread=min(3.14159,0.3+impactAge*0.15);
    float affected=(1.0-smoothstep(spread-0.15,spread,angle))*impactHeat;
    vec3 terrain=texture2D(map,vMapUv).rgb;
    float land=smoothstep(-0.025,0.045,max(terrain.r,terrain.g)-terrain.b);
    float speckle=0.5+0.5*sin(impactLocal.x*233.0+sin(impactLocal.z*157.0)*3.0)*sin(impactLocal.y*193.0);
    float fire=land*smoothstep(0.55,0.85,speckle)*affected*exp(-impactAge/(3600.0+impactHeat*86400.0));
    float pulse=0.8+0.2*sin(impactAge*4.0+speckle*20.0);
    diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(0.24,0.20,0.18),affected*land*0.85);
    float haze=affected*(1.0-exp(-impactAge/8.0))*0.65;
    diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.16,0.14,0.12),haze);
    float hot=exp(-angle*angle/0.08)*impactHeat*exp(-impactAge/86400.0);
    totalEmissiveRadiance+=vec3(1.0,0.18,0.012)*(fire*pulse*2.5+hot*3.0);
   `);
  };
  material.customProgramCacheKey=()=> 'earth-impact-surface-1';material.needsUpdate=true;
 }else{view.surfaceUniforms.impactAxis.value.copy(axis);view.surfaceUniforms.impactHeat.value=Math.max(view.surfaceUniforms.impactHeat.value,heat);view.surfaceUniforms.impactAge.value=0;}
}
export function updateSurfaceImpact(view,days){if(view.surfaceUniforms)view.surfaceUniforms.impactAge.value+=days*86400;}
