import * as THREE from 'three';

// Earth cloud cover remains procedural, so opening a surface view does not
// require a multi-megabyte weather texture. The small 2D map below is used
// exclusively by the cloud-shadow receiver on the ground. Visible clouds are
// ray-marched in CLOUD_PASS_FRAGMENT; no cloud image or sprite is rendered.
const CLOUD_SIZE = Object.freeze({width: 256, height: 128});
const SHADOW_RADIUS = 1.0012;
const wrap = value => value - Math.floor(value);
const smooth = value => value * value * (3 - 2 * value);
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (edge0, edge1, value) => {
 const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};

function hash(x, y, seed) {
 const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
 return value - Math.floor(value);
}
function periodicNoise(x, y, periodX, periodY, seed) {
 const xi = Math.floor(x), yi = Math.floor(y), tx = smooth(x - xi), ty = smooth(y - yi);
 const cell = (column, row) => hash((column % periodX + periodX) % periodX, (row % periodY + periodY) % periodY, seed);
 const a = cell(xi, yi), b = cell(xi + 1, yi), c = cell(xi, yi + 1), d = cell(xi + 1, yi + 1);
 return mix(mix(a, b, tx), mix(c, d, tx), ty);
}
function cloudDensity(u, v, seed) {
 let sum = 0, weight = 0, amplitude = 1, frequency = 2;
 for (let octave = 0; octave < 5; octave++) {
  sum += (periodicNoise(u * frequency * 6, v * frequency * 3, frequency * 6, frequency * 3, seed + octave * 23) - .5) * amplitude;
  weight += amplitude; amplitude *= .52; frequency *= 2;
 }
 const latitude = Math.abs(v * 2 - 1);
 const bands = .10 * Math.sin((v * 2 - 1) * Math.PI * 5 + seed);
 return smoothstep(.56, .74, .5 + sum / weight * .8 + bands - Math.max(0, latitude - .78) * .24);
}

export function createProceduralCloudTexture(width = CLOUD_SIZE.width, height = CLOUD_SIZE.height, seed = 41) {
 const data = new Uint8Array(width * height * 4);
 for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const density = cloudDensity(x / (width - 1), y / (height - 1), seed), index = (y * width + x) * 4;
  const tint = 218 + Math.round(density * 35);
  data[index] = tint; data[index + 1] = Math.min(255, tint + 7); data[index + 2] = 255; data[index + 3] = Math.round(density * 228);
 }
 const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
 texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping;
 texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter; texture.generateMipmaps = true; texture.needsUpdate = true;
 return texture;
}

export function cloudDrift({wallSeconds = 0, simulatedDays = 0, drift = 1, shadow = false} = {}) {
 const simulated = Math.tanh(Math.max(0, simulatedDays) / 80) * .18;
 const phase = wrap((wallSeconds * .0005 + simulated) * drift);
 return {x: phase, y: wrap(.17 + phase * (shadow ? .13 : .19))};
}

const shadowMaterial = map => new THREE.MeshBasicMaterial({
 map, color: '#24384a', transparent: true, opacity: .25, alphaTest: .045,
 depthWrite: false, side: THREE.FrontSide, toneMapped: false
});

// The pass lives at the far depth plane. Normal depth testing therefore keeps
// it behind every terrain pixel and lets it shade only uncovered sky. This
// makes it a cloud layer in the 3D view rather than a translucent page overlay.
const CLOUD_PASS_VERTEX = `
varying vec2 vUv;
void main(){
 vUv=uv;
 gl_Position=vec4(position.xy,0.99998,1.0);
}`;

// A compact implementation of the method described by Wedekind: fBm/Worley
// density, Beer-Lambert transmittance, two-step light marching and a
// Cornette-Shanks phase term. Time shifts all density samples through a 3D
// wind field, so the cloud volume continuously evolves instead of repeating a
// static texture.
const CLOUD_PASS_FRAGMENT = `
precision highp float;
varying vec2 vUv;
uniform float time;
uniform float daylight;
uniform float samples;
uniform vec3 sunDirection;
uniform float aspect;
#define PI 3.14159265359
float hash13(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float valueNoise(vec3 p){
 vec3 cell=floor(p),local=fract(p);local=local*local*(3.0-2.0*local);
 float a=hash13(cell),b=hash13(cell+vec3(1,0,0)),c=hash13(cell+vec3(0,1,0)),d=hash13(cell+vec3(1,1,0));
 float e=hash13(cell+vec3(0,0,1)),f=hash13(cell+vec3(1,0,1)),g=hash13(cell+vec3(0,1,1)),h=hash13(cell+vec3(1,1,1));
 return mix(mix(mix(a,b,local.x),mix(c,d,local.x),local.y),mix(mix(e,f,local.x),mix(g,h,local.x),local.y),local.z);
}
float fbm(vec3 p){float value=0.0,weight=.55;for(int i=0;i<4;i++){value+=valueNoise(p)*weight;p=p*2.03+13.7;weight*=.5;}return value;}
float worley(vec3 p){
 vec3 cell=floor(p),local=fract(p);float nearest=1.0;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec3 offset=vec3(float(x),float(y),float(z));
  vec3 feature=offset+vec3(hash13(cell+offset),hash13(cell+offset+19.1),hash13(cell+offset+43.7));
  nearest=min(nearest,length(feature-local));
 }
 return nearest;
}
float phase(float g,float mu){return 3.0*(1.0-g*g)*(1.0+mu*mu)/(8.0*PI*(2.0+g*g)*pow(1.0+g*g-2.0*g*mu,1.5));}
float densityAt(vec3 p,float height){
 vec3 wind=vec3(time*.025,0.0,time*.011);
 float cover=fbm(p*.36+wind*.18);
 float billows=1.0-worley(p*1.34+wind*.70);
 float wisps=fbm(p*2.7+wind*.92);
 float vertical=smoothstep(.07,.25,height)*(1.0-smoothstep(.70,.97,height));
 float shape=smoothstep(.61,.79,cover)*smoothstep(.42,.72,billows+wisps*.16);
 return shape*vertical*.72;
}
void main(){
 if(daylight<.002)discard;
 vec2 view=(vUv-.5)*vec2(aspect,1.0);
 vec3 ray=normalize(vec3(view.x,view.y+.08,1.25));
 vec3 light=normalize(vec3(sunDirection.x,abs(sunDirection.y)+.18,sunDirection.z));
 // Screen-space jitter remains stable from frame to frame: the wind moves the
 // cloud field while the sampling pattern does not shimmer.
 float jitter=hash13(vec3(gl_FragCoord.xy,0.0));
 float transmittance=1.0;
 vec3 scattering=vec3(0.0);
 float phaseAmount=.36+phase(.68,dot(ray,light))*4.8;
 for(int i=0;i<8;i++){
  if(float(i)>=samples)break;
  float t=(float(i)+jitter)/samples;
  vec3 samplePoint=vec3(ray.x*2.9,ray.y*1.9+t*.4,t*2.8)+vec3(0.0,t*1.08,0.0);
  float density=densityAt(samplePoint,t);
  float lightDensity=0.0;
  for(int j=1;j<=1;j++)lightDensity+=densityAt(samplePoint+light*(float(j)*.32),min(1.0,t+float(j)*.18));
  float lightTransmission=exp(-lightDensity*.86);
  float extinction=exp(-density*.92);
  float powder=1.0-exp(-density*1.7);
  vec3 cloudColor=mix(vec3(.42,.53,.66),vec3(1.0,.975,.91),lightTransmission*.72+.24);
  scattering+=transmittance*(1.0-extinction)*cloudColor*(.36+phaseAmount*.24+powder*.38);
  transmittance*=extinction;
  if(transmittance<.025)break;
 }
 float alpha=clamp((1.0-transmittance)*.78,0.0,.62)*daylight;
 if(alpha<.006)discard;
 // ShaderMaterial uses straight alpha. Normalize the integrated scattering to
 // the occupied ray fraction so thick clouds remain sunlit rather than
 // darkening the daylight sky.
 vec3 cloudColor=clamp(scattering/max(.025,1.0-transmittance),0.0,1.0);
 gl_FragColor=vec4(cloudColor,alpha);
}`;

function cloudPassMaterial() {
 return new THREE.ShaderMaterial({
  uniforms:{
   time:{value:0}, daylight:{value:1}, samples:{value:9}, aspect:{value:1},
   sunDirection:{value:new THREE.Vector3(.35,.8,.48)}
  },
  vertexShader:CLOUD_PASS_VERTEX, fragmentShader:CLOUD_PASS_FRAGMENT,
  transparent:true, depthTest:true, depthWrite:false, depthFunc:THREE.LessEqualDepth,
  toneMapped:false
 });
}

export function createEarthCloudCover() {
 const group = new THREE.Group(); group.name = 'Volumetric Earth clouds';
 const cloudPassGeometry = new THREE.PlaneGeometry(2, 2);
 const cloudPass = new THREE.Mesh(cloudPassGeometry, cloudPassMaterial());
 cloudPass.name = 'Earth ray-marched cloud layer'; cloudPass.renderOrder = 3; cloudPass.frustumCulled = false; group.add(cloudPass);
 const shadowMap = createProceduralCloudTexture(CLOUD_SIZE.width, CLOUD_SIZE.height, 41);
 const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), shadowMaterial(shadowMap));
 shadow.name = 'Earth cloud shadows'; shadow.scale.setScalar(SHADOW_RADIUS); shadow.renderOrder = 2; shadow.frustumCulled = false; group.add(shadow);
 let enabled = true, daylight = 1;
 const applyVisibility=()=>{
  group.visible=enabled&&daylight>.002;
  cloudPass.material.uniforms.daylight.value=daylight;
  shadow.material.opacity=.28*daylight;
 };
 const resize=()=>{
  const width=Number(globalThis.innerWidth)||1, height=Number(globalThis.innerHeight)||1;
  cloudPass.material.uniforms.aspect.value=Math.max(.2,width/height);
 };
 resize();
 return {
  group,
  setEnabled(next){enabled=!!next;applyVisibility();},
  setLighting({daylight:nextDaylight=daylight,sunDirection,quality=1}={}){
   daylight=Math.max(0,Math.min(1,Number(nextDaylight)||0));
   if(sunDirection)cloudPass.material.uniforms.sunDirection.value.copy(sunDirection).normalize();
   cloudPass.material.uniforms.samples.value=quality>=.82?7:quality>=.55?5:4;
   resize();applyVisibility();
  },
  update({wallSeconds=0,simulatedDays=0}={}){
   if(!enabled||daylight<=.002)return;
   cloudPass.material.uniforms.time.value=wallSeconds+simulatedDays*86400*.00003;
   const drift=cloudDrift({wallSeconds,simulatedDays,drift:1,shadow:true});
   shadowMap.offset.set(wrap(drift.x+.038),wrap(drift.y-.016));
  },
  dispose(){cloudPassGeometry.dispose();cloudPass.material.dispose();shadow.geometry.dispose();shadowMap.dispose();shadow.material.dispose();}
 };
}
