import {Color,SRGBColorSpace} from 'three';

// Palettes reconstruct broad visible-light appearance from mission imagery.
// Grayscale, false-colour and unresolved observations only support restrained
// neutral or ice/red-brown tints; they never justify an invented metallic look.
const nasa='https://science.nasa.gov/';
const saturn=[nasa+'photojournal/enhanced-color-maps-of-saturn-inner-moons/','https://arxiv.org/abs/2111.15541'];
const uranus=[nasa+'photojournal/uranus-family-portrait/',nasa+'gallery/voyager-at-uranus/'];
const galilean='https://www.jpl.nasa.gov/images/pia00012-galilean-satellites/';
const p=(id,base,map,sources,options={})=>({id,base,map,sources,...options});
export const moonAppearance={
 // Apollo's calibrated photographs show a warm, brownish grey Moon: neither
 // silver nor rust-coloured. The local mosaic supplies the albedo pattern.
 'Księżyc':p('moon','#756f65','/textures/moon.jpg',['https://www.nasa.gov/wp-content/uploads/static/history/afj/ap08fj/pdf/as08-analysis_photography_visual_obs.pdf','https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf']),
 // The martian moons are very dark, with only a subtle red-brown spectral trend.
 'Fobos':p('phobos','#514942','phobos',[nasa+'photojournal/crism-views-phobos-and-deimos/','https://www.jpl.nasa.gov/images/pia04589-phobos-over-the-martian-limb/']),
 'Deimos':p('deimos','#625247','deimos',[nasa+'photojournal/crism-views-phobos-and-deimos/',nasa+'resource/martian-moon-deimos-in-high-resolution/']),
 'Io':p('io','#d6bf85','io',[galilean,'https://www.usgs.gov/publications/volcanogenic-sulfur-earth-and-io-composition-and-spectroscopy'],{rgb:true}),
 'Europa':p('europa','#d7c9ad','europa',[galilean,'https://europa.nasa.gov/resources/91/natural-and-false-color-views-of-europa/'],{dark:'#80664d',missing:true}),
 'Ganimedes':p('ganymede','#9a8c7c','ganymede',[galilean,nasa+'jupiter/jupiter-moons/ganymede/'],{missing:true}),
 'Kallisto':p('callisto','#665b50','callisto',[galilean,nasa+'photojournal/global-color-variations-on-callisto/']),
 // Cassini's enhanced products reveal blue ice and red contamination; the
 // visible palette below retains those differences without using false-colour.
 'Mimas':p('mimas','#adb3b6','mimas',saturn),
 'Enceladus':p('enceladus','#e7edf1','enceladus',saturn,{contrast:.55}),
 'Tetyda':p('tethys','#cbd0cd','tethys',saturn),
 'Dione':p('dione','#b9ada4','dione',saturn),
 'Rea':p('rhea','#b8aea5','rhea',saturn),
 'Tytan':p('titan','#bb8752',null,[nasa+'resource/highlighting-titans-hazes/',nasa+'saturn/moons/facts/'],{haze:true,procedural:'haze'}),
 'Japet':p('iapetus','#c7c0a9','iapetus',[nasa+'resource/color-dichotomy-on-iapetus/',nasa+'photojournal/iapetus-bright-and-dark-terrains/'],{dark:'#33251e',dichotomy:true}),
 'Hyperion':p('hyperion','#826c57','hyperion',[nasa+'resource/saturns-battered-moon-hyperion/',nasa+'saturn/moons/hyperion/']),
 // Voyager finds only slight colour variations across Uranus's major moons;
 // retain their near-neutral tones rather than adding unsupported rust hues.
 'Miranda':p('miranda','#96938c',null,uranus,{procedural:'icy'}),
 'Ariel':p('ariel','#a2a09a',null,uranus,{procedural:'icy'}),
 'Umbriel':p('umbriel','#686764',null,uranus,{procedural:'dark-ice'}),
 'Tytania':p('titania','#84807a',null,uranus,{procedural:'icy'}),
 'Oberon':p('oberon','#77736d',null,uranus,{procedural:'dark-ice'}),
 'Tryton':p('triton','#c9b6ab','triton',[nasa+'resource/global-color-mosaic-of-triton/','https://astrogeology.usgs.gov/search/map/triton_voyager_2_global_color_mosaic_600m']),
 'Proteusz':p('proteus','#4b4a47',null,[nasa+'neptune/moons/proteus/',nasa+'neptune/moons/facts/'],{procedural:'dark-ice'}),
 'Nereida':p('nereid','#77736c',null,[nasa+'resource/nereid/',nasa+'neptune/moons/nereid/'],{unknown:true,procedural:'neutral'}),
};
export function moonMapPath(profile){return profile.map?.startsWith('/')?profile.map:profile.map?`/textures/moons/${profile.map}.jpg`:null;}
export function loadMoonMaps(loader,anisotropy){
 const maps={};for(const profile of Object.values(moonAppearance)){const path=moonMapPath(profile);if(!path)continue;const map=loader.load(path);map.colorSpace=SRGBColorSpace;map.anisotropy=anisotropy;maps[profile.id]=map;}return maps;
}
export function applyMoonAppearance(material,body,maps){
 const profile=body.key==='moon'?moonAppearance[body.name]:null;if(!profile)return;
 material.map=maps[profile.id]||null;material.color.set(profile.map?'#ffffff':profile.base);
 material.metalness=0;material.roughness=1;
 const previousCompile=material.onBeforeCompile,previousKey=material.customProgramCacheKey?.bind(material);
 if(!profile.map){
  material.color.set('#ffffff');
  material.onBeforeCompile=shader=>{
   previousCompile?.(shader);
   shader.uniforms.moonBase={value:new Color(profile.base)};
   shader.uniforms.moonSurfaceKind={value:profile.procedural==='haze'?1:profile.procedural==='icy'?2:profile.procedural==='dark-ice'?3:0};
   shader.vertexShader='varying vec3 vMoonSurface;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvMoonSurface=normalize(position);');
   shader.fragmentShader=`varying vec3 vMoonSurface;
uniform vec3 moonBase;
uniform float moonSurfaceKind;
float moonSurfaceNoise(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123);}
float moonSurfaceField(vec3 p){
 vec3 cell=floor(p),fraction=fract(p),curve=fraction*fraction*(3.0-2.0*fraction);
 float a=moonSurfaceNoise(cell),b=moonSurfaceNoise(cell+vec3(1.,0.,0.));
 float c=moonSurfaceNoise(cell+vec3(0.,1.,0.)),d=moonSurfaceNoise(cell+vec3(1.,1.,0.));
 return mix(mix(a,b,curve.x),mix(c,d,curve.x),curve.y);
}
`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
    vec3 p=normalize(vMoonSurface);
    float broad=moonSurfaceField(p*3.7)+0.45*moonSurfaceField(p*10.1)-0.72;
    float latitude=abs(p.y);
    vec3 surface=moonBase*(1.0+broad*0.12);
    if(moonSurfaceKind==1.0){
     float haze=pow(1.0-latitude,1.8)*0.10+moonSurfaceField(p*2.1)*0.025;
     surface=mix(surface,vec3(0.82,0.66,0.43),haze);
    }else if(moonSurfaceKind==2.0){
     surface*=1.0+broad*0.07;
    }else if(moonSurfaceKind==3.0){
     surface*=0.92+broad*0.10;
    }
    diffuseColor.rgb=surface;`);
  };
  material.customProgramCacheKey=()=>`${previousKey?.()||''}|moon-procedural-${profile.id}-2`;
  return;
 }
 material.onBeforeCompile=shader=>{
  previousCompile?.(shader);
  shader.uniforms.moonBase={value:new Color(profile.base)};
  shader.uniforms.moonDark={value:new Color(profile.dark||profile.base).multiplyScalar(profile.dark?1:.25)};
  shader.fragmentShader='uniform vec3 moonBase;\nuniform vec3 moonDark;\n'+shader.fragmentShader;
  let correction;
  if(profile.rgb)correction='sampledDiffuseColor.rgb=mix(vec3(detail),sampledDiffuseColor.rgb,0.7);';
  else if(profile.dichotomy)correction='sampledDiffuseColor.rgb=mix(moonDark,moonBase,smoothstep(0.035,0.6,detail));';
  else correction=`${profile.missing?'if(detail<0.002)detail=0.22;':''}sampledDiffuseColor.rgb=mix(moonDark,moonBase,clamp(0.7+${(profile.contrast??1.3).toFixed(2)}*(detail-0.22),0.0,1.0));`;
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);\nfloat detail=dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722));\n${correction}\ndiffuseColor*=sampledDiffuseColor;\n#endif`);
 };
 material.customProgramCacheKey=()=>`${previousKey?.()||''}|moon-appearance-${profile.id}-2`;
}
