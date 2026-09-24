import * as THREE from 'three';

// Earth cloud cover remains procedural, so opening a surface view does not
// require a multi-megabyte weather texture. The small 2D map below is used
// exclusively by the cloud-shadow receiver on the ground. Visible clouds are
// ray-marched in CLOUD_PASS_FRAGMENT; no cloud image or sprite is rendered.
const CLOUD_SIZE = Object.freeze({width: 256, height: 128});
const SHADOW_RADIUS = 1.0012;
const wrap = value => value - Math.floor(value);
// The simulation clock is deliberately the dominant source of cloud motion.
// One simulated day advances the weather phase enough to be apparent, while
// a small wall-clock term keeps the atmosphere alive while the simulation is
// paused.  The phase is unitless and deliberately visual: raw atmospheric
// speeds would alias at the app's high simulation rates.
export const CLOUD_WEATHER_PHASE_PER_SIMULATED_DAY = .075;
export const CLOUD_WEATHER_PHASE_PER_WALL_SECOND = .008;
export function cloudWeatherTime({wallSeconds = 0, simulatedDays = 0} = {}) {
 return (Number(wallSeconds) || 0) * CLOUD_WEATHER_PHASE_PER_WALL_SECOND
  + (Number(simulatedDays) || 0) * CLOUD_WEATHER_PHASE_PER_SIMULATED_DAY;
}
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
 const phase = wrap(cloudWeatherTime({wallSeconds, simulatedDays}) * drift);
 return {x: phase, y: wrap(.17 + phase * (shadow ? .13 : .19))};
}

const shadowMaterial = map => new THREE.MeshBasicMaterial({
 map, color: '#24384a', transparent: true, opacity: .25, alphaTest: .045,
 depthWrite: false, side: THREE.FrontSide, toneMapped: false
});

// A small field of overlapping ellipsoids forms actual cloud volumes above
// the observer. It deliberately has no image map: its positions, widths and
// heights are generated from stable seeds and evolve continuously with wind.
//
// The model follows the useful part of the reference WebGL Clouds study: a
// 3-D fBm-like density changes continuously with time.  It is applied to
// local volumes instead of a full-screen pass, because a full-screen ray
// marcher has no knowledge of the terrain depth and would paint through the
// mountain, ground and interface.
const CLOUD_CLUSTER_COUNT = 12;
const cloudRandom = (index, salt = 0) => {
 const value = Math.sin((index + 1) * 127.1 + (salt + 1) * 311.7) * 43758.5453123;
 return value - Math.floor(value);
};

function cloudVolumeMaterial(seed) {
 return new THREE.ShaderMaterial({
  // March from the entry face. Rendering the back face of a transparent box
  // made its result depend on driver-specific transparent sorting and could
  // make an otherwise valid cloud vanish in bright daylight.
  transparent:true,depthWrite:false,depthTest:true,side:THREE.FrontSide,
  uniforms:{uTime:{value:0},uSeed:{value:seed},uOpacity:{value:.5},uCamera:{value:new THREE.Vector3()},uSun:{value:new THREE.Vector3(0,1,0)}},
  vertexShader:`varying vec3 vBox;void main(){vBox=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  // Adapted from the reference's 3-D fBm/raymarch approach, but marched only
  // inside each cloud proxy. The terrain therefore stays depth-tested and
  // cannot be covered by a full-screen weather pass.
  fragmentShader:`
varying vec3 vBox;uniform vec3 uCamera;uniform vec3 uSun;uniform float uTime;uniform float uSeed;uniform float uOpacity;
float hash(float n){return fract(sin(n)*43758.5453);} float noise(vec3 x){vec3 p=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);float n=p.x+p.y*57.0+113.0*p.z;return mix(mix(mix(hash(n),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(17.0,11.0,7.0);a*=.5;}return v;}
float density(vec3 p){vec3 flow=vec3(uTime*.018,0.,uTime*.011);float edge=1.0-length(vec3(p.x*1.12,p.y*1.7,p.z*1.12))*1.18;float body=fbm((p+flow)*3.1+uSeed*9.7)*.72+fbm((p-flow*.4)*7.2+uSeed*3.1)*.28;return smoothstep(.49,.74,body+edge*.58);}
vec2 boxHit(vec3 ro,vec3 rd){vec3 inv=1.0/rd;vec3 a=(-.5-ro)*inv,b=(.5-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
void main(){vec3 ro=uCamera,rd=normalize(vBox-ro);vec2 hit=boxHit(ro,rd);if(hit.y<=max(hit.x,0.))discard;float t=max(hit.x,0.),end=hit.y,stepSize=(end-t)/16.;vec3 colour=vec3(0.0);float trans=1.0;vec3 light=normalize(uSun);for(int i=0;i<16;i++){vec3 p=ro+rd*(t+(float(i)+.5)*stepSize);float d=density(p);if(d>.01){float lit=.48+.52*max(0.,dot(light,normalize(vec3(-p.x,.9,-p.z))));float alpha=d*.22;colour+=trans*alpha*mix(vec3(.48,.61,.72),vec3(.98,1.0,1.0),lit);trans*=1.0-alpha;if(trans<.025)break;}}float alpha=(1.0-trans)*uOpacity;if(alpha<.012)discard;gl_FragColor=vec4(colour,alpha);}`
 });
}

function createCloudField() {
 const field = new THREE.Group(); field.name = 'Earth dynamic cloud field';
 const anchor = new THREE.Group(); anchor.name = 'Earth cloud observer anchor'; field.add(anchor);
 const geometry = new THREE.BoxGeometry(1,1,1);
 const volumes = [];
 for (let cluster = 0; cluster < CLOUD_CLUSTER_COUNT; cluster++) {
   // Evenly cover the local horizon and retain a small deterministic jitter.
   // Pure random bearings could leave the active camera sector cloudless.
   const direction = (cluster / CLOUD_CLUSTER_COUNT) * Math.PI * 2 + (cloudRandom(cluster, 1) - .5) * .24;
  // Cloud bases are physical heights above mean sea level. Most are low or
  // middle-level clouds (and therefore below Everest); a smaller high layer
  // gives an observer on the summit something above the horizon as well.
  const layer = cloudRandom(cluster, 3);
  // Stay inside the geometric horizon for each deck. The former common
  // 46–280 km range placed most low cloud below the curved horizon, making a
  // perfectly valid cloud field look empty from the ground.
  const distance = layer < .6 ? 26 + cloudRandom(cluster, 2) * 82
   : layer < .84 ? 52 + cloudRandom(cluster, 2) * 160
    : 78 + cloudRandom(cluster, 2) * 238;
  const baseX = Math.cos(direction) * distance;
  const baseZ = Math.sin(direction) * distance;
  const baseY = layer < .6 ? .55 + cloudRandom(cluster, 4) * 2.95
   : layer < .84 ? 3.4 + cloudRandom(cluster, 4) * 3.1
    : 7.2 + cloudRandom(cluster, 4) * 5.2;
  const width = layer < .6 ? 14 + cloudRandom(cluster, 5) * 24
   : layer < .84 ? 26 + cloudRandom(cluster, 5) * 38
    : 42 + cloudRandom(cluster, 5) * 54;
  const material=cloudVolumeMaterial(cloudRandom(cluster,6));
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Ray-marched cloud volume';mesh.renderOrder=2;anchor.add(mesh);
  volumes.push({mesh,material,seed:cloudRandom(cluster,7)*Math.PI*2,baseX,baseY,baseZ,width,height:layer<.6?.75+cloudRandom(cluster,8)*1.1:layer<.84?1.15+cloudRandom(cluster,8)*1.7:.7+cloudRandom(cluster,8)*1.25,depth:width*(.48+cloudRandom(cluster,9)*.28)});
 }
 const up = new THREE.Vector3(0, 1, 0), observer = new THREE.Vector3(0, 1, 0);
 let radiusKm = 6371, surfaceHeightKm = 0;
 const setObserver = (direction, {radiusKm: nextRadiusKm = radiusKm, surfaceHeightKm: nextSurfaceHeightKm = surfaceHeightKm, surfaceRadius = 1} = {}) => {
  if (!direction) return;
  radiusKm = Math.max(1, Number(nextRadiusKm) || 6371);
  surfaceHeightKm = Math.max(0, Number(nextSurfaceHeightKm) || 0);
  observer.copy(direction).normalize();
  anchor.position.copy(observer).multiplyScalar(Math.max(.1, Number(surfaceRadius) || 1) + surfaceHeightKm / radiusKm);
  anchor.quaternion.setFromUnitVectors(up, observer);
 };
 const update = ({wallSeconds = 0, simulatedDays = 0, daylight = 1, cameraPosition, sunDirection} = {}) => {
  const weatherTime = cloudWeatherTime({wallSeconds, simulatedDays});
  const kilometre = 1 / radiusKm;
  for (const puff of volumes) {
   const wind = weatherTime + puff.seed;
   const breathing = .78 + .22 * Math.sin(weatherTime * 1.27 + puff.seed * 1.71);
   const xKm = puff.baseX + Math.sin(wind * .71) * 4.4;
   const zKm = puff.baseZ + weatherTime * 1.15 + Math.cos(wind * .63) * 3.4;
   // A cloud that remains a fixed height above sea level is lower than the
   // tangent plane at range because Earth curves away. This term also lets
   // low clouds sit visibly below an 8.849 km Everest observer.
   const curvatureKm = (xKm * xKm + zKm * zKm) / (2 * radiusKm);
   puff.mesh.position.set(
    xKm * kilometre,
    (puff.baseY - surfaceHeightKm - curvatureKm + Math.sin(wind * 1.13) * .18) * kilometre,
    zKm * kilometre
   );
   puff.mesh.scale.set(puff.width * breathing * kilometre, puff.height * (1 + .28 * Math.cos(wind)) * kilometre, puff.depth * breathing * kilometre);
   puff.mesh.rotation.set(.03*Math.sin(wind*.43),puff.seed+weatherTime*.019,.02*Math.cos(wind*.37));
   puff.material.uniforms.uTime.value=weatherTime;
   puff.material.uniforms.uOpacity.value=(.8+.2*Math.min(1,daylight))*daylight;
   puff.material.uniforms.uSun.value.copy(sunDirection||new THREE.Vector3(Math.sin(weatherTime*.01),.9,Math.cos(weatherTime*.01))).normalize();
  }
  if(cameraPosition){
   field.updateMatrixWorld(true);
   for(const puff of volumes)puff.material.uniforms.uCamera.value.copy(puff.mesh.worldToLocal(cameraPosition.clone()));
  }
 };
 setObserver(observer);
 return {field, setObserver, update, dispose(){geometry.dispose();for(const volume of volumes)volume.material.dispose();}};
}

export function createEarthCloudCover() {
 const group = new THREE.Group(); group.name = 'Volumetric Earth clouds';
 const cloudField = createCloudField(); group.add(cloudField.field);
 const shadowMap = createProceduralCloudTexture(CLOUD_SIZE.width, CLOUD_SIZE.height, 41);
 const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), shadowMaterial(shadowMap));
 shadow.name = 'Earth cloud shadows'; shadow.scale.setScalar(SHADOW_RADIUS); shadow.renderOrder = 2; shadow.frustumCulled = false; group.add(shadow);
 let enabled = true, daylight = 1;
 const applyVisibility=()=>{
  group.visible=enabled&&daylight>.002;
  // A spherical shadow receiver encloses the surface camera. From inside it
  // becomes a translucent fog wall, so it cannot be used as a ground shadow
  // in surface mode. Local projected shadows are added separately; keep this
  // legacy orbital receiver invisible until that pass exists.
  shadow.visible=false;
  shadow.material.opacity=.33*daylight;
 };
 return {
  group,
  setEnabled(next){enabled=!!next;applyVisibility();},
  setObserver(direction, options){cloudField.setObserver(direction, options);},
  setLighting({daylight:nextDaylight=daylight,sunDirection,quality=1}={}){
   daylight=Math.max(0,Math.min(1,Number(nextDaylight)||0));
   if(sunDirection){
    // Orient the visual cloud lighting with the real scene light. The material
    // receives the directional sunlight too; this tint only restores soft
    // forward scattering in the thin cloud edges.
    shadow.rotation.y=Math.atan2(sunDirection.x,sunDirection.z)*.04;
   }
   applyVisibility();
  },
  update({wallSeconds=0,simulatedDays=0,cameraPosition,sunDirection}={}){
   if(!enabled||daylight<=.002)return;
   cloudField.update({wallSeconds,simulatedDays,daylight,cameraPosition,sunDirection});
   const drift=cloudDrift({wallSeconds,simulatedDays,drift:1,shadow:true});
   shadowMap.offset.set(wrap(drift.x+.038),wrap(drift.y-.016));
  },
  dispose(){cloudField.dispose();shadow.geometry.dispose();shadowMap.dispose();shadow.material.dispose();}
 };
}
