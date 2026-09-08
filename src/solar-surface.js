// Sunspots are cooler magnetically inhibited convection cells. This adds a
// restrained umbra/penumbra layer over the photosphere map; it is deliberately
// most readable after the observer lowers the display brightness.
export function applySolarSurface(material){
 material.onBeforeCompile=shader=>{
  shader.uniforms.sunSpotVisibility={value:.15};
  material.userData.sunSpotVisibility=shader.uniforms.sunSpotVisibility;
  shader.vertexShader='attribute vec2 uv; varying vec2 sunUv;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nsunUv=uv;');
  shader.fragmentShader='uniform float sunSpotVisibility; varying vec2 sunUv;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec2 solarSpotDelta(vec2 uv,vec2 center){vec2 delta=uv-center;delta.x=fract(delta.x+.5)-.5;delta.x*=cos((uv.y-.5)*3.14159265);return delta;}
float solarSpot(vec2 uv,vec2 center,float radius){float distanceToSpot=length(solarSpotDelta(uv,center));float penumbra=1.0-smoothstep(radius*.38,radius,distanceToSpot);float umbra=1.0-smoothstep(radius*.14,radius*.42,distanceToSpot);return penumbra*.32+umbra*.68;}
float spots=min(1.0,solarSpot(sunUv,vec2(.19,.44),.065)+solarSpot(sunUv,vec2(.27,.48),.042)+solarSpot(sunUv,vec2(.62,.59),.078)+solarSpot(sunUv,vec2(.72,.57),.038)+solarSpot(sunUv,vec2(.84,.35),.052)+solarSpot(sunUv,vec2(.47,.28),.035));
diffuseColor.rgb*=1.0-spots*sunSpotVisibility*.84;`);
 };
 material.customProgramCacheKey=()=> 'solar-surface-spots-2';
 return material;
}

export function setSunspotVisibility(material,brightnessPercent){
 const scale=Math.max(.05,Math.min(1,brightnessPercent/100));
 const visibility=.15+.85*(1-Math.sqrt(scale));
 if(material.userData.sunSpotVisibility)material.userData.sunSpotVisibility.value=visibility;
 return visibility;
}
