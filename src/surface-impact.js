import {SOLAR_MASS,AU} from './physics.js';
export function surfaceImpact(a,b,speed){
 const c=299792458,v=Math.min(speed*AU*1000/86400,c*.999999),beta2=(v/c)**2;
 // Reduced-mass estimate with relativistic kinetic-energy correction; dynamics remain Newtonian.
 const reduced=a.mass*b.mass/(a.mass+b.mass)*SOLAR_MASS;
 const energyJ=reduced*v*v/(Math.sqrt(1-beta2)*(1+Math.sqrt(1-beta2)));
 const target=a.mass>=b.mass?a:b,fluence=energyJ/(4*Math.PI*(target.radius*1000)**2);
 // Uniform-sphere binding energy is enough to distinguish a planet-wide impact
 // catastrophe from actual gravitational dispersal of the target.
 const bindingJ=.6*6.67430e-11*(target.mass*SOLAR_MASS)**2/(target.radius*1000);
 const disruptionRatio=energyJ/bindingJ;
 return {energyJ,globalHeat:Math.max(0,Math.min(1,(Math.log10(Math.max(1,fluence))-7)/7)),targetBindingJ:bindingJ,disruptionRatio,targetSurvives:disruptionRatio<.01};
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
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float angle=acos(clamp(dot(normalize(impactLocal),impactAxis),-1.0,1.0));
    float spread=min(3.14159,0.3+impactAge*0.15);
    float affected=(1.0-smoothstep(spread-0.15,spread,angle))*impactHeat;
    vec3 terrain=texture2D(map,vMapUv).rgb;
    float land=smoothstep(-0.025,0.045,max(terrain.r,terrain.g)-terrain.b);
    float patch=0.5+0.5*sin(impactLocal.x*233.0+sin(impactLocal.z*157.0)*3.0)*sin(impactLocal.y*193.0);
    float fire=land*smoothstep(0.55,0.85,patch)*affected*exp(-impactAge/(3600.0+impactHeat*86400.0));
    float pulse=0.8+0.2*sin(impactAge*4.0+patch*20.0);
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
