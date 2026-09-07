import {Color} from 'three';
// Display approximations from visible-light references, NOT spectral calibration.
// Earth, Mercury, Jupiter and Saturn retain original map chromaticity.
export const appearanceProfiles={
 venus:{base:'#eeece1',contrast:.055,source:'https://science.nasa.gov/venus/venus-facts/'},
 uranus:{base:'#b3d4d2',contrast:.18,source:'https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0'},
 neptune:{base:'#a9cccf',contrast:.25,source:'https://www.ox.ac.uk/news/2024-01-05-new-images-reveal-what-neptune-and-uranus-really-look-0'},
 mars:{saturation:.58,source:'https://science.nasa.gov/asset/hubble/true-color-image-of-mars/'}
};
export function naturalColorMaterial(material,key){
 const profile=appearanceProfiles[key];if(!profile)return;
 material.onBeforeCompile=shader=>{
  let correction;
  if(profile.base){
   shader.uniforms.naturalBase={value:new Color(profile.base)};
   shader.fragmentShader='uniform vec3 naturalBase;\n'+shader.fragmentShader;
   correction=`float detail=dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722));sampledDiffuseColor.rgb=naturalBase*(1.0+${profile.contrast.toFixed(4)}*(detail-0.5));`;
  }else correction=`float luminance=dot(sampledDiffuseColor.rgb,vec3(0.2126,0.7152,0.0722));sampledDiffuseColor.rgb=mix(vec3(luminance),sampledDiffuseColor.rgb,${profile.saturation.toFixed(4)});`;
  // Run before vertex colors, so impact scars retain their contrast and shading.
  shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);\n${correction}\ndiffuseColor*=sampledDiffuseColor;\n#endif`);
 };
 material.customProgramCacheKey=()=>`natural-color-${key}-1`;
}
