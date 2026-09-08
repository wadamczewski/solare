import {Scene,OrthographicCamera,PlaneGeometry,Mesh,ShaderMaterial} from 'three';
const AU_KM=149597870.7;
// Radial boundaries from NASA/ESA. Temperatures are illustrative interpolation
// between order-of-magnitude landmarks, not a stellar structure calculation.
export function solarInteriorState(distanceAU,radiusKm=695700){
 const fraction=Math.max(0,distanceAU*AU_KM/radiusKm);
 const inside=Number.isFinite(fraction)&&radiusKm>0&&fraction<1;
 const zone=fraction<.25?'Jądro':fraction<.7?'Strefa promienista':fraction<.999?'Strefa konwekcyjna':'Fotosfera';
 const knots=[[0,15e6],[.25,7e6],[.7,2e6],[1,5772]];
 const i=fraction<.25?0:fraction<.7?1:2,[a,ta]=knots[i],[b,tb]=knots[i+1];
 const temperature=Math.exp(Math.log(ta)+(Math.log(tb)-Math.log(ta))*Math.min(1,Math.max(0,(fraction-a)/(b-a))));
 return {inside,fraction,zone,temperature};
}
export function createSolarInterior(){
 const scene=new Scene(),camera=new OrthographicCamera(-1,1,1,-1,0,1);
 const material=new ShaderMaterial({depthTest:false,depthWrite:false,transparent:false,toneMapped:false,
  uniforms:{radius:{value:0},time:{value:0},aspect:{value:1}},
  vertexShader:'varying vec2 uvScreen;void main(){uvScreen=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
  // Opaque local radiation field: no visible distant surfaces or stars. Low
  // contrast moving cells are a labelled educational schematic, not a photo.
  fragmentShader:`varying vec2 uvScreen;uniform float radius;uniform float time;uniform float aspect;
   void main(){vec2 p=(uvScreen-.5)*vec2(aspect,1.0);float cells=sin(p.x*14.0+sin(p.y*11.0+time*.2))*sin(p.y*13.0-time*.15);
   float convection=smoothstep(.68,.75,radius);float light=.965+cells*(.008+.025*convection);
   gl_FragColor=vec4(vec3(light),1.0);}`});
 const mesh=new Mesh(new PlaneGeometry(2,2),material);mesh.frustumCulled=false;scene.add(mesh);
 return {scene,camera,material,render(renderer,state,seconds,aspect){material.uniforms.radius.value=state.fraction;material.uniforms.time.value=seconds;material.uniforms.aspect.value=aspect;renderer.setRenderTarget(null);renderer.render(scene,camera);},dispose(){mesh.geometry.dispose();material.dispose();}};
}
