// Sunspots are cooler magnetically inhibited convection cells. This adds a
// restrained umbra/penumbra layer over the photosphere map; it is deliberately
// most readable after the observer lowers the display brightness.
export function applySolarSurface(material){
 material.onBeforeCompile=shader=>{
  shader.uniforms.sunSpotVisibility={value:.15};
  material.userData.sunSpotVisibility=shader.uniforms.sunSpotVisibility;
  shader.fragmentShader='uniform float sunSpotVisibility;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
vec4 sampledDiffuseColor = texture2D( map, vMapUv );
vec2 solarSpotDelta(vec2 uv,vec2 center){vec2 delta=uv-center;delta.x=fract(delta.x+.5)-.5;delta.x*=cos((uv.y-.5)*3.14159265);return delta;}
float solarSpot(vec2 uv,vec2 center,float radius){float distanceToSpot=length(solarSpotDelta(uv,center));float penumbra=1.0-smoothstep(radius*.38,radius,distanceToSpot);float umbra=1.0-smoothstep(radius*.14,radius*.42,distanceToSpot);return penumbra*.32+umbra*.68;}
float spots=min(1.0,solarSpot(vMapUv,vec2(.19,.44),.065)+solarSpot(vMapUv,vec2(.27,.48),.042)+solarSpot(vMapUv,vec2(.62,.59),.078)+solarSpot(vMapUv,vec2(.72,.57),.038)+solarSpot(vMapUv,vec2(.84,.35),.052)+solarSpot(vMapUv,vec2(.47,.28),.035));
sampledDiffuseColor.rgb*=1.0-spots*sunSpotVisibility*.84;
diffuseColor *= sampledDiffuseColor;
#endif`);
 };
 material.customProgramCacheKey=()=> 'solar-surface-spots-1';
 return material;
}

export function setSunspotVisibility(material,brightnessPercent){
 const scale=Math.max(.05,Math.min(1,brightnessPercent/100));
 const visibility=.15+.85*(1-Math.sqrt(scale));
 if(material.userData.sunSpotVisibility)material.userData.sunSpotVisibility.value=visibility;
 return visibility;
}
