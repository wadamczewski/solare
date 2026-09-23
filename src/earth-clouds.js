import * as THREE from 'three';

// Earth cloud cover remains procedural, so opening a surface view does not
// require a multi-megabyte weather texture. The 2D map drives the ground
// shadow; the sky-facing volume below uses the same moving weather phase.
const CLOUD_SIZE = Object.freeze({width: 256, height: 128});
const SHADOW_RADIUS = 1.0012;
const CLOUD_VOLUME_RADIUS = 1.028;
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
function createCloudBillowTexture() {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,192,192);ctx.filter='blur(2px)';
 for(let i=0;i<22;i++){
  const angle=i*2.399963229728653,spread=18+(i%6)*8,x=96+Math.cos(angle)*spread,y=99+Math.sin(angle)*spread*.56,r=15+(i%5)*4,a=.17+(i%4)*.045;
  const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,255,255,${a})`);g.addColorStop(.46,`rgba(231,241,251,${a*.72})`);g.addColorStop(1,'rgba(185,207,230,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
 }
 ctx.filter='none';
 const veil=ctx.createRadialGradient(96,102,20,96,102,90);veil.addColorStop(0,'rgba(255,255,255,.22)');veil.addColorStop(.58,'rgba(210,226,242,.10)');veil.addColorStop(1,'rgba(180,204,229,0)');ctx.fillStyle=veil;ctx.fillRect(0,0,192,192);
 const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.magFilter=THREE.LinearFilter;texture.generateMipmaps=true;return texture;
}
const cloudRandom=index=>{const value=Math.sin(index*127.1+41.7)*43758.5453123;return value-Math.floor(value);};
function createCloudBillows(){
 const texture=createCloudBillowTexture(),group=new THREE.Group(),entries=[];group.name='Earth volumetric cloud billows';
 for(let i=0;i<46;i++){
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false,depthTest:true,color:'#e8f2fb',opacity:.26+cloudRandom(i+90)*.25}));
  const distance=.18+cloudRandom(i+160)*.46,angle=cloudRandom(i+240)*Math.PI*2,size=.014+cloudRandom(i+320)*.025;
  sprite.scale.set(size*1.7,size,1);sprite.renderOrder=6;group.add(sprite);entries.push({sprite,distance,angle,altitude:.10+cloudRandom(i+400)*.12});
 }
 const observer=new THREE.Vector3(0,1,0),east=new THREE.Vector3(),north=new THREE.Vector3();
 return {group,texture,setObserver(next,time=0){
  observer.copy(next).normalize();east.crossVectors(new THREE.Vector3(0,1,0),observer);if(east.lengthSq()<1e-6)east.crossVectors(new THREE.Vector3(1,0,0),observer);east.normalize();north.crossVectors(observer,east).normalize();
  for(const entry of entries){const drift=entry.angle+time*.012;entry.sprite.position.copy(observer).multiplyScalar(1+entry.altitude).addScaledVector(east,Math.cos(drift)*entry.distance).addScaledVector(north,Math.sin(drift)*entry.distance);}
 },dispose(){group.traverse(node=>{if(node.isSprite)node.material.dispose();});texture.dispose();}};
}

// Based on Wedekind's cloud model: a low-frequency cover field is carved by
// 3D Worley detail, sampled along the view ray with Beer-Lambert extinction.
// The two light samples are a compact self-shadowing approximation; the phase
// term is Cornette-Shanks, giving the bright forward-scattering edge near Sun.
const VOLUME_VERTEX = `
varying vec3 vCloudDirection;
void main(){
 vCloudDirection=normalize(position);
 gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
}`;
const VOLUME_FRAGMENT = `
precision highp float;
varying vec3 vCloudDirection;
uniform float time;
uniform float daylight;
uniform float samples;
uniform vec3 sunDirection;
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float worley(vec3 p){
 vec3 cell=floor(p),local=fract(p);float nearest=1.0;
 for(int z=-1;z<=1;z++)for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){
  vec3 offset=vec3(float(x),float(y),float(z));
  vec3 feature=offset+vec3(hash31(cell+offset),hash31(cell+offset+17.0),hash31(cell+offset+41.0));
  nearest=min(nearest,length(feature-local));
 }
 return nearest;
}
float remap(float value,float originalMin,float originalMax,float newMin,float newMax){return newMin+(value-originalMin)/(originalMax-originalMin)*(newMax-newMin);}
float phase(float g,float mu){return 3.0*(1.0-g*g)*(1.0+mu*mu)/(8.0*3.14159265*(2.0+g*g)*pow(1.0+g*g-2.0*g*mu,1.5));}
float densityAt(vec3 point,float height){
 vec3 wind=vec3(time*.010,0.0,time*.006);
 // Fine 3D Worley cells shape a cloud only after the view ray has entered a
 // weather system. The system mask is intentionally evaluated once per ray
 // below: marching across unrelated cells made the whole sky overcast.
 float detail=1.0-worley(point*2.40+wind);
 float vertical=smoothstep(0.05,0.23,height)*(1.0-smoothstep(0.62,0.94,height));
 return smoothstep(0.38,0.82,detail)*vertical;
}
void main(){
 if(daylight<0.002)discard;
 vec3 ray=normalize(vCloudDirection);
 vec3 weatherWind=vec3(time*.0018,0.0,time*.0011);
 float rayCover=1.0-worley(ray*2.15+weatherWind);
 float weatherSystem=smoothstep(0.55,0.73,rayCover);
 if(weatherSystem<.012)discard;
 vec3 side=normalize(cross(ray,abs(ray.y)>.92?vec3(1.0,0.0,0.0):vec3(0.0,1.0,0.0)));
 float jitter=hash31(ray*97.0+time*.01);
 float transmittance=1.0;
 vec3 scatter=vec3(0.0);
 vec3 light=normalize(sunDirection);
 float phaseAmount=mix(0.42,phase(.68,dot(ray,light))*5.7,.72);
 for(int i=0;i<12;i++){
  if(float(i)>=samples)break;
  float h=(float(i)+jitter)/samples;
  vec3 point=ray*3.45+side*(h-.5)*.62+vec3(0.0,h*.72,0.0);
  float density=weatherSystem*densityAt(point,h);
  float shadow=0.0;
  for(int j=1;j<=2;j++)shadow+=densityAt(point+light*(float(j)*.24),min(1.0,h+float(j)*.16));
  float lightTransmittance=exp(-shadow*.82);
  float extinction=exp(-density*.76);
  float powder=1.0-exp(-density*1.35);
  vec3 cloudColor=mix(vec3(.43,.55,.69),vec3(1.0,.985,.94),lightTransmittance*.72+.28);
  scatter+=transmittance*(1.0-extinction)*cloudColor*(.48+phaseAmount*.33+powder*.42);
  transmittance*=extinction;
  if(transmittance<.025)break;
 }
 float alpha=clamp((1.0-transmittance)*1.18,0.0,.78)*daylight;
 gl_FragColor=vec4(scatter*daylight,alpha);
}`;

function volumeMaterial() {
 return new THREE.ShaderMaterial({
  uniforms:{time:{value:0},daylight:{value:1},samples:{value:9},sunDirection:{value:new THREE.Vector3(.35,.8,.48)}},
  vertexShader:VOLUME_VERTEX,fragmentShader:VOLUME_FRAGMENT,transparent:true,depthWrite:false,depthTest:true,
  side:THREE.BackSide,toneMapped:true
 });
}

export function createEarthCloudCover() {
 const group = new THREE.Group(); group.name = 'Volumetric Earth clouds';
 const volumeGeometry = new THREE.SphereGeometry(1, 72, 48), volume = new THREE.Mesh(volumeGeometry, volumeMaterial());
 volume.name = 'Earth volumetric cloud layer'; volume.scale.setScalar(CLOUD_VOLUME_RADIUS); volume.renderOrder = 3; volume.frustumCulled = false; group.add(volume);
 const billows=createCloudBillows();billows.group.renderOrder=6;group.add(billows.group);
 const shadowMap = createProceduralCloudTexture(CLOUD_SIZE.width, CLOUD_SIZE.height, 41);
 const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), shadowMaterial(shadowMap));
 shadow.name = 'Earth cloud shadows'; shadow.scale.setScalar(SHADOW_RADIUS); shadow.renderOrder = 2; shadow.frustumCulled = false; group.add(shadow);
 let enabled = true, daylight = 1; const observerDirection=new THREE.Vector3(0,1,0);
 const applyVisibility=()=>{group.visible=enabled&&daylight>.002;volume.material.uniforms.daylight.value=daylight;shadow.material.opacity=.28*daylight;};
 return {
  group,
  setEnabled(next){enabled=!!next;applyVisibility();},
  setObserver(direction){if(direction)observerDirection.copy(direction).normalize();},
  setLighting({daylight:nextDaylight=daylight,sunDirection,quality=1}={}){
   daylight=Math.max(0,Math.min(1,Number(nextDaylight)||0));
   if(sunDirection)volume.material.uniforms.sunDirection.value.copy(sunDirection).normalize();
   volume.material.uniforms.samples.value=quality>=.82?10:quality>=.55?8:6;
   applyVisibility();
  },
  update({wallSeconds=0,simulatedDays=0}={}){
   if(!enabled||daylight<=.002)return;
   volume.material.uniforms.time.value=wallSeconds+simulatedDays*86400*.03;
   const drift=cloudDrift({wallSeconds,simulatedDays,drift:1,shadow:true});
   shadowMap.offset.set(wrap(drift.x+.038),wrap(drift.y-.016));
   billows.setObserver(observerDirection,wallSeconds*.0016+simulatedDays*.042);
  },
  dispose(){volumeGeometry.dispose();volume.material.dispose();billows.dispose();shadow.geometry.dispose();shadowMap.dispose();shadow.material.dispose();}
 };
}
