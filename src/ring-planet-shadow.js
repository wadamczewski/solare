import * as THREE from 'three';

export const MAX_RING_SHADOW_BANDS=24;

// A ring's normal optical depth becomes more opaque toward grazing sunlight:
// a ray travels through more particles.  `alpha` is the normal-incidence
// opacity used by the renderer's visible ring bands.
export function ringTransmission(alpha, incidenceCosine) {
 const optical=Math.max(0,Math.min(.999,alpha));
 const path=Math.max(.12,Math.abs(incidenceCosine));
 return Math.pow(1-optical,1/path);
}

const pointLightDirectCall='RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );';
const preamble=`
#define RING_PLANET_SHADOW_MAX ${MAX_RING_SHADOW_BANDS}
uniform vec3 ringShadowSource;
uniform vec3 ringShadowCentre;
uniform vec3 ringShadowNormal;
uniform float ringShadowRadius;
uniform float ringShadowInner;
uniform int ringShadowBandCount;
uniform float ringShadowOuter[RING_PLANET_SHADOW_MAX];
uniform float ringShadowOpacity[RING_PLANET_SHADOW_MAX];
float ringShadowVisibility(vec3 receiver){
 vec3 toSun=ringShadowSource-receiver;
 float denom=dot(toSun,ringShadowNormal);
 if(abs(denom)<0.000001)return 1.0;
 float t=dot(ringShadowCentre-receiver,ringShadowNormal)/denom;
 if(t<=0.0||t>=1.0)return 1.0;
 vec3 hit=receiver+toSun*t;
 vec3 radial=hit-ringShadowCentre-dot(hit-ringShadowCentre,ringShadowNormal)*ringShadowNormal;
 float radius=length(radial)/max(ringShadowRadius,0.000001);
 if(radius<ringShadowInner)return 1.0;
 float opacity=0.0;
 for(int index=0;index<RING_PLANET_SHADOW_MAX;index++){
  if(index>=ringShadowBandCount)break;
  if(radius<ringShadowOuter[index]){opacity=ringShadowOpacity[index];break;}
 }
 float incidence=abs(dot(normalize(toSun),ringShadowNormal));
 return pow(max(0.001,1.0-opacity),1.0/max(.12,incidence));
}
`;

if(!THREE.ShaderChunk.lights_fragment_begin.includes('USE_RING_PLANET_SHADOW')){
 THREE.ShaderChunk.lights_fragment_begin=THREE.ShaderChunk.lights_fragment_begin.replace(pointLightDirectCall,
  `#ifdef USE_RING_PLANET_SHADOW\n\t\tdirectLight.color *= ringShadowVisibility( geometryPosition );\n\t\t#endif\n\t\t${pointLightDirectCall}`);
}

export function applyRingPlanetShadow(material,{inner,bands}) {
 const outer=new Float32Array(MAX_RING_SHADOW_BANDS),opacity=new Float32Array(MAX_RING_SHADOW_BANDS);
 bands.slice(0,MAX_RING_SHADOW_BANDS).forEach((band,index)=>{outer[index]=band.to;opacity[index]=band.alpha});
 const uniforms={ringShadowSource:{value:new THREE.Vector3()},ringShadowCentre:{value:new THREE.Vector3()},ringShadowNormal:{value:new THREE.Vector3(0,1,0)},ringShadowRadius:{value:1},ringShadowInner:{value:inner},ringShadowBandCount:{value:Math.min(bands.length,MAX_RING_SHADOW_BANDS)},ringShadowOuter:{value:outer},ringShadowOpacity:{value:opacity}};
 const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.bind(material);
 material.defines={...material.defines,USE_RING_PLANET_SHADOW:1};
 material.onBeforeCompile=shader=>{previousCompile?.(shader);Object.assign(shader.uniforms,uniforms);shader.fragmentShader=preamble+'\n'+shader.fragmentShader};
 material.customProgramCacheKey=()=>`${previousKey?.()||''}|ring-planet-shadow-v1`;material.needsUpdate=true;
 return {update({sourcePosition,centre,normal,radius,viewMatrix}){uniforms.ringShadowSource.value.copy(sourcePosition).applyMatrix4(viewMatrix);uniforms.ringShadowCentre.value.copy(centre).applyMatrix4(viewMatrix);uniforms.ringShadowNormal.value.copy(normal).transformDirection(viewMatrix);uniforms.ringShadowRadius.value=Math.max(radius,1e-9)}};
}
