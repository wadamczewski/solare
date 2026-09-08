import {Color,SRGBColorSpace} from 'three';

// Display approximations, not calibrated spectral reflectance. Mosaics encode
// surface structure; monochrome/enhanced products are not treated as true RGB.
const nasa='https://science.nasa.gov/';
const saturn=[nasa+'photojournal/enhanced-color-maps-of-saturn-inner-moons/','https://arxiv.org/abs/2111.15541'];
const uranus=[nasa+'photojournal/uranus-family-portrait/','https://ntrs.nasa.gov/citations/19900041690'];
const galilean='https://www.jpl.nasa.gov/images/pia00012-galilean-satellites/';
const p=(id,base,map,sources,options={})=>({id,base,map,sources,...options});
export const moonAppearance={
 'Księżyc':p('moon','#686660','/textures/moon.jpg',[nasa+'moon/moonlight/','https://apod.nasa.gov/apod/ap220515.html']),
 'Fobos':p('phobos','#514b46','phobos',[nasa+'resource/crism-views-phobos-and-deimos/','https://www.esa.int/Science_Exploration/Space_Science/Mars_Express/Mars_Express_tracks_the_phases_of_Phobos']),
 'Deimos':p('deimos','#57514b','deimos',[nasa+'resource/crism-views-phobos-and-deimos/','https://arxiv.org/abs/2509.12804']),
 'Io':p('io','#d1c29e','io',[galilean,'https://www.usgs.gov/publications/volcanogenic-sulfur-earth-and-io-composition-and-spectroscopy'],{rgb:true}),
 'Europa':p('europa','#d2cec2','europa',[galilean,'https://europa.nasa.gov/resources/91/natural-and-false-color-views-of-europa/'],{dark:'#796957',missing:true}),
 'Ganimedes':p('ganymede','#92877a','ganymede',[galilean,nasa+'jupiter/jupiter-moons/ganymede/'],{missing:true}),
 'Kallisto':p('callisto','#716a61','callisto',[galilean,nasa+'photojournal/global-color-variations-on-callisto/']),
 'Mimas':p('mimas','#b6b4b0','mimas',saturn),
 'Enceladus':p('enceladus','#f0f0ed','enceladus',saturn,{contrast:.55}),
 'Tetyda':p('tethys','#d0ceca','tethys',saturn),
 'Dione':p('dione','#bcbab5','dione',saturn),
 'Rea':p('rhea','#bfbbb5','rhea',saturn),
 'Tytan':p('titan','#bf935b',null,[nasa+'resource/highlighting-titans-hazes/',nasa+'saturn/moons/facts/'],{haze:true}),
 'Japet':p('iapetus','#cecbc1','iapetus',[nasa+'resource/color-dichotomy-on-iapetus/',nasa+'photojournal/iapetus-bright-and-dark-terrains/'],{dark:'#302a24',dichotomy:true}),
 'Hyperion':p('hyperion','#8b7a69','hyperion',[nasa+'resource/saturns-battered-moon-hyperion/',nasa+'saturn/moons/hyperion/']),
 'Miranda':p('miranda','#95948e',null,uranus),
 'Ariel':p('ariel','#999994',null,uranus),
 'Umbriel':p('umbriel','#696661',null,uranus),
 'Tytania':p('titania','#81796f',null,uranus),
 'Oberon':p('oberon','#7c736a',null,uranus),
 'Tryton':p('triton','#cec2bd','triton',[nasa+'resource/global-color-mosaic-of-triton/','https://www.nasa.gov/image-article/neptunes-moon-triton/']),
 'Proteusz':p('proteus','#514f4c',null,[nasa+'neptune/moons/proteus/',nasa+'neptune/moons/facts/']),
 'Nereida':p('nereid','#777571',null,[nasa+'resource/nereid/',nasa+'neptune/moons/nereid/'],{unknown:true}),
};
export function moonMapPath(profile){return profile.map?.startsWith('/')?profile.map:profile.map?`/textures/moons/${profile.map}.jpg`:null;}
export function loadMoonMaps(loader,anisotropy){
 const maps={};for(const profile of Object.values(moonAppearance)){const path=moonMapPath(profile);if(!path)continue;const map=loader.load(path);map.colorSpace=SRGBColorSpace;map.anisotropy=anisotropy;maps[profile.id]=map;}return maps;
}
export function applyMoonAppearance(material,body,maps){
 const profile=body.key==='moon'?moonAppearance[body.name]:null;if(!profile)return;
 material.map=maps[profile.id]||null;material.color.set(profile.map?'#ffffff':profile.base);
 material.metalness=0;material.roughness=1;
 if(!profile.map)return;
 material.onBeforeCompile=shader=>{
  shader.uniforms.moonBase={value:new Color(profile.base)};
  shader.uniforms.moonDark={value:new Color(profile.dark||profile.base).multiplyScalar(profile.dark?1:.25)};
  shader.fragmentShader='uniform vec3 moonBase;\nuniform vec3 moonDark;\n'+shader.fragmentShader;
  let correction;
  if(profile.rgb)correction='sampledDiffuseColor.rgb=mix(vec3(detail),sampledDiffuseColor.rgb,0.7);';
  else if(profile.dichotomy)correction='sampledDiffuseColor.rgb=mix(moonDark,moonBase,smoothstep(0.035,0.6,detail));';
  else correction=`${profile.missing?'if(detail<0.002)detail=0.22;':''}sampledDiffuseColor.rgb=mix(moonDark,moonBase,clamp(0.7+${(profile.contrast??1.3).toFixed(2)}*(detail-0.22),0.0,1.0));`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);\nfloat detail=dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\n${correction}\ndiffuseColor*=sampledDiffuseColor;\n#endif`);
 };
 material.customProgramCacheKey=()=>`moon-appearance-${profile.id}-1`;
}
