import * as THREE from 'three';

// Earth cloud cover remains procedural, so opening a surface view does not
// require a multi-megabyte weather texture. The small 2D map below remains a
// deterministic data source for tests and diagnostics. Visible clouds are
// generated procedurally; no cloud image or sprite is rendered.
const CLOUD_SIZE = Object.freeze({width: 256, height: 128});
const wrap = value => value - Math.floor(value);
// The simulation clock is deliberately the dominant source of cloud motion.
// One simulated day advances the weather phase by almost one complete cloud
// evolution. Weather is frozen with the simulation: a paused observer must
// see a completely stationary atmosphere. The phase is deliberately visual:
// raw atmospheric speeds would alias at the app's high simulation rates.
export const CLOUD_WEATHER_PHASE_PER_SIMULATED_DAY = .85;
export const CLOUD_WEATHER_PHASE_PER_WALL_SECOND = 0;
// At the slowest offered simulation speed (0.02 d/s), cloud advection should
// still read as living weather. This factor makes it as visible as the former
// 2 d/s behaviour, then continues to scale linearly with every speed preset.
export const CLOUD_MOTION_SIMULATION_MULTIPLIER = 100;
export function cloudWeatherTime({wallSeconds = 0, simulatedDays = 0} = {}) {
 return (Number(simulatedDays) || 0) * CLOUD_WEATHER_PHASE_PER_SIMULATED_DAY;
}
export function cloudMotionTime({wallSeconds = 0, simulatedDays = 0} = {}) {
 return cloudWeatherTime({
  wallSeconds,
  simulatedDays: (Number(simulatedDays) || 0) * CLOUD_MOTION_SIMULATION_MULTIPLIER
 });
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
const CLOUD_SHADOW_KEY = '__solareCloudShadow';
const cloudRandom = (index, salt = 0) => {
 const value = Math.sin((index + 1) * 127.1 + (salt + 1) * 311.7) * 43758.5453123;
 return value - Math.floor(value);
};

function cloudVolumeMaterial(seed) {
 return new THREE.ShaderMaterial({
  // March from the entry face. Rendering the back face of a transparent box
  // made its result depend on driver-specific transparent sorting and could
  // make an otherwise valid cloud vanish in bright daylight.
  // Double-sided rendering lets the observer enter a cloud volume. The
  // shader below selects exactly one face for each ray, avoiding the usual
  // double-blended transparent-box artefact.
  transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,
  uniforms:{uTime:{value:0},uSeed:{value:seed},uOpacity:{value:.5},uCamera:{value:new THREE.Vector3()},uSun:{value:new THREE.Vector3(0,1,0)}},
  vertexShader:`varying vec3 vBox;void main(){vBox=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  // Adapted from the reference's 3-D fBm/raymarch approach, but marched only
  // inside each cloud proxy. The terrain therefore stays depth-tested and
  // cannot be covered by a full-screen weather pass.
  fragmentShader:`
varying vec3 vBox;uniform vec3 uCamera;uniform vec3 uSun;uniform float uTime;uniform float uSeed;uniform float uOpacity;
float hash(float n){return fract(sin(n)*43758.5453);} float noise(vec3 x){vec3 p=floor(x),f=fract(x);f=f*f*(3.0-2.0*f);float n=p.x+p.y*57.0+113.0*p.z;return mix(mix(mix(hash(n),hash(n+1.0),f.x),mix(hash(n+57.0),hash(n+58.0),f.x),f.y),mix(mix(hash(n+113.0),hash(n+114.0),f.x),mix(hash(n+170.0),hash(n+171.0),f.x),f.y),f.z);}
float fbm(vec3 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p=p*2.03+vec3(17.0,11.0,7.0);a*=.5;}return v;}
float density(vec3 p){vec3 flow=vec3(uTime*.19,0.,uTime*.13);float enclosure=max(0.,1.0-length(vec3(p.x*1.85,p.y*2.8,p.z*1.85)));float body=fbm((p+flow)*3.1+uSeed*9.7)*.66+fbm((p-flow*.4)*7.2+uSeed*3.1)*.34;return smoothstep(.55,.8,body*.55+enclosure*.92)*smoothstep(.03,.18,enclosure);}
vec2 boxHit(vec3 ro,vec3 rd){vec3 inv=1.0/rd;vec3 a=(-.5-ro)*inv,b=(.5-ro)*inv;vec3 lo=min(a,b),hi=max(a,b);return vec2(max(max(lo.x,lo.y),lo.z),min(min(hi.x,hi.y),hi.z));}
void main(){bool cameraInside=all(lessThan(abs(uCamera),vec3(.5)));if((cameraInside&&gl_FrontFacing)||(!cameraInside&&!gl_FrontFacing))discard;vec3 ro=uCamera,rd=normalize(vBox-ro);vec2 hit=boxHit(ro,rd);if(hit.y<=max(hit.x,0.))discard;float t=max(hit.x,0.),end=hit.y,stepSize=(end-t)/20.;vec3 colour=vec3(0.0);float trans=1.0;vec3 light=normalize(uSun);for(int i=0;i<20;i++){vec3 p=ro+rd*(t+(float(i)+.5)*stepSize);float d=density(p);if(d>.01){float lit=.48+.52*max(0.,dot(light,normalize(vec3(-p.x,.9,-p.z))));float alpha=d*.1;colour+=trans*alpha*mix(vec3(.48,.61,.72),vec3(.94,.98,1.0),lit);trans*=1.0-alpha;if(trans<.025)break;}}float alpha=(1.0-trans)*uOpacity;if(alpha<.012)discard;gl_FragColor=vec4(colour,alpha);}`
 });
}

// Ground shadows are evaluated inside the receiver material, rather than by
// laying transparent planes a few metres over terrain. The latter inevitably
// z-fights with streamed tiles and DEM patches at grazing angles. These
// shared uniforms are updated with the same cloud positions that are drawn in
// the sky, so the dark patches travel with the weather without new geometry.
function applyGroundCloudShadows(material, uniforms) {
 if (!material?.isMeshStandardMaterial || material.userData[CLOUD_SHADOW_KEY]) return;
 const previousCompile = material.onBeforeCompile;
 const previousKey = material.customProgramCacheKey?.bind(material);
 material.userData[CLOUD_SHADOW_KEY] = true;
 material.onBeforeCompile = shader => {
  previousCompile?.(shader);
  shader.uniforms.cloudShadowCenters = {value: uniforms.centers};
  shader.uniforms.cloudShadowRadii = {value: uniforms.radii};
  shader.uniforms.cloudShadowOpacity = uniforms.opacity;
  shader.vertexShader = 'varying vec3 vCloudShadowPoint;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace(
   '#include <begin_vertex>',
   '#include <begin_vertex>\nvCloudShadowPoint=position;'
  );
  shader.fragmentShader = `varying vec3 vCloudShadowPoint;
uniform vec3 cloudShadowCenters[${CLOUD_CLUSTER_COUNT}];
uniform float cloudShadowRadii[${CLOUD_CLUSTER_COUNT}];
uniform float cloudShadowOpacity;\n` + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <dithering_fragment>', `
{
 float cloudShade=0.0;
 for(int cloudIndex=0;cloudIndex<${CLOUD_CLUSTER_COUNT};cloudIndex++){
  float radius=cloudShadowRadii[cloudIndex];
  float distanceToCloud=length(vCloudShadowPoint-cloudShadowCenters[cloudIndex]);
  cloudShade=max(cloudShade,1.0-smoothstep(radius*.42,radius,distanceToCloud));
 }
 outgoingLight*=1.0-cloudShade*cloudShadowOpacity;
}
#include <dithering_fragment>`);
 };
 material.customProgramCacheKey = () => `${previousKey?.() || ''}|earth-cloud-ground-shadow-v1`;
 material.needsUpdate = true;
}

function createCloudField() {
 const field = new THREE.Group(); field.name = 'Earth dynamic cloud field';
 const anchor = new THREE.Group(); anchor.name = 'Earth cloud observer anchor'; field.add(anchor);
 const geometry = new THREE.BoxGeometry(1,1,1);
 const volumes = [];
 const shadowCenters = Array.from({length:CLOUD_CLUSTER_COUNT}, () => new THREE.Vector3());
 const shadowRadii = new Float32Array(CLOUD_CLUSTER_COUNT);
 const shadowOpacity = {value: 0};
 for (let cluster = 0; cluster < CLOUD_CLUSTER_COUNT; cluster++) {
   // Evenly cover the local horizon and retain a small deterministic jitter.
   // Pure random bearings could leave the active camera sector cloudless.
   const direction = (cluster / CLOUD_CLUSTER_COUNT) * Math.PI * 2 + (cloudRandom(cluster, 1) - .5) * .24;
  // Cloud bases are physical heights above mean sea level. Most are low or
  // middle-level clouds (and therefore below Everest); a smaller high layer
  // gives an observer on the summit something above the horizon as well.
  const layer = cloudRandom(cluster, 3);
  // Keep a dense lower deck around the observer, but leave a safe horizontal
  // margin so a ray-march proxy never encloses the camera. Earlier cells were
  // mostly 26–316 km away and therefore appeared only as horizon streaks.
  const distance = layer < .6 ? 6 + cloudRandom(cluster, 2) * 14
   : layer < .84 ? 14 + cloudRandom(cluster, 2) * 24
    : 22 + cloudRandom(cluster, 2) * 32;
  const baseX = Math.cos(direction) * distance;
  const baseZ = Math.sin(direction) * distance;
  const baseY = layer < .6 ? 1.8 + cloudRandom(cluster, 4) * 3.8
   : layer < .84 ? 5.6 + cloudRandom(cluster, 4) * 3.4
    : 10 + cloudRandom(cluster, 4) * 4;
  const width = layer < .6 ? 3.8 + cloudRandom(cluster, 5) * 4.8
   : layer < .84 ? 7 + cloudRandom(cluster, 5) * 7
    : 13 + cloudRandom(cluster, 5) * 11;
  const material=cloudVolumeMaterial(cloudRandom(cluster,6));
  const mesh=new THREE.Mesh(geometry,material);mesh.name='Ray-marched cloud volume';mesh.renderOrder=2;anchor.add(mesh);
  volumes.push({mesh,material,direction,flowDirection:direction+(cloudRandom(cluster,10)-.5)*.85,flowCycleKm:120+cloudRandom(cluster,11)*70,seed:cloudRandom(cluster,7)*Math.PI*2,baseX,baseY,baseZ,width,height:layer<.6?.8+cloudRandom(cluster,8)*1.05:layer<.84?1.2+cloudRandom(cluster,8)*1.5:1+cloudRandom(cluster,8)*1.3,depth:width*(.55+cloudRandom(cluster,9)*.18)});
 }
 const up = new THREE.Vector3(0, 1, 0), observer = new THREE.Vector3(0, 1, 0);
 let radiusKm = 6371, surfaceHeightKm = 0, anchored = false;
 const setObserver = (direction, {radiusKm: nextRadiusKm = radiusKm, surfaceHeightKm: nextSurfaceHeightKm = surfaceHeightKm, surfaceRadius = 1, recenter = false} = {}) => {
  if (!direction) return;
  // The cloud field belongs to the globe, not to the camera.  Keeping this
  // anchor stable means walking with WSAD changes the distance to a cloud,
  // so an observer can actually approach and pass through one.  A new
  // surface session or an explicit location jump may recenter the local
  // weather cell once.
  if (anchored && !recenter) return;
  radiusKm = Math.max(1, Number(nextRadiusKm) || 6371);
  surfaceHeightKm = Math.max(0, Number(nextSurfaceHeightKm) || 0);
  observer.copy(direction).normalize();
  anchor.position.copy(observer).multiplyScalar(Math.max(.1, Number(surfaceRadius) || 1) + surfaceHeightKm / radiusKm);
  anchor.quaternion.setFromUnitVectors(up, observer);
  anchored = true;
 };
 const update = ({wallSeconds = 0, simulatedDays = 0, daylight = 1, cameraPosition, sunDirection} = {}) => {
  const weatherTime = cloudWeatherTime({wallSeconds, simulatedDays});
  const motionTime = cloudMotionTime({wallSeconds, simulatedDays});
  // Each cloud travels through a finite atmospheric weather cell.  It fades
  // in at the upwind edge and out at the downwind edge, then is recycled
  // while invisible. This is translation over the globe rather than the
  // old side-to-side oscillation.
  const windDistanceKm = motionTime * 15;
  const kilometre = 1 / radiusKm;
  const light= (sunDirection||new THREE.Vector3(0,1,0)).clone().normalize();
  for (let cloudIndex = 0; cloudIndex < volumes.length; cloudIndex++) {
   const puff = volumes[cloudIndex];
   const wind = motionTime + puff.seed;
   const breathing = .7 + .3 * Math.sin(weatherTime * 1.27 + puff.seed * 1.71);
   const lifecyclePhase = wrap((windDistanceKm + puff.seed * 23) / puff.flowCycleKm);
   const lifecycle = smoothstep(.02, .16, lifecyclePhase) * (1 - smoothstep(.78, .96, lifecyclePhase));
   const travelKm = (lifecyclePhase - .5) * puff.flowCycleKm;
   const xKm = puff.baseX + Math.cos(puff.flowDirection) * travelKm;
   const zKm = puff.baseZ + Math.sin(puff.flowDirection) * travelKm;
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
   puff.mesh.rotation.set(.05*Math.sin(wind*.43),puff.seed+motionTime*.08,.04*Math.cos(wind*.37));
   puff.material.uniforms.uTime.value=weatherTime;
   puff.material.uniforms.uOpacity.value=(.72+.18*Math.min(1,daylight))*daylight*lifecycle;
   puff.material.uniforms.uSun.value.copy(light);
   // Intersect the sunlight ray with the tangent ground plane, then rotate
   // that point into the body's local coordinates. Receiver materials use
   // the same coordinate frame, avoiding any floating overlay geometry.
   const heightToGroundKm=Math.max(.25,puff.baseY);
   const verticalLight=Math.max(.16,light.y);
   const groundX=xKm-light.x/verticalLight*heightToGroundKm;
   const groundZ=zKm-light.z/verticalLight*heightToGroundKm;
   const groundCurvatureKm=(groundX*groundX+groundZ*groundZ)/(2*radiusKm);
   shadowCenters[cloudIndex].set(
    groundX*kilometre,
    (-surfaceHeightKm-groundCurvatureKm)*kilometre,
    groundZ*kilometre
   ).applyQuaternion(anchor.quaternion).add(anchor.position);
   shadowRadii[cloudIndex] = puff.width * 1.35 * breathing * lifecycle * kilometre;
  }
  if(cameraPosition){
   field.updateMatrixWorld(true);
   for(const puff of volumes)puff.material.uniforms.uCamera.value.copy(puff.mesh.worldToLocal(cameraPosition.clone()));
  }
 };
 return {
  field,
  setObserver,
  update,
  shadowUniforms: {centers:shadowCenters, radii:shadowRadii, opacity:shadowOpacity},
  dispose(){geometry.dispose();for(const volume of volumes)volume.material.dispose();}
 };
}

export function createEarthCloudCover() {
 const group = new THREE.Group(); group.name = 'Volumetric Earth clouds';
 const cloudField = createCloudField(); group.add(cloudField.field);
 let enabled = true, daylight = 1;
 const latestSunDirection=new THREE.Vector3(0,1,0);
 const applyVisibility=()=>{
  group.visible=enabled&&daylight>.002;
 };
 return {
  group,
  setEnabled(next){enabled=!!next;applyVisibility();},
  setObserver(direction, options){cloudField.setObserver(direction, options);},
  applyGroundShadows(root){
   root?.traverse(item => { if (item.isMesh) applyGroundCloudShadows(item.material, cloudField.shadowUniforms); });
  },
  setLighting({daylight:nextDaylight=daylight,sunDirection:nextSunDirection,quality=1}={}){
   daylight=Math.max(0,Math.min(1,Number(nextDaylight)||0));
   if(nextSunDirection){
   // Orient the visual cloud lighting with the real scene light. The material
   // receives the directional sunlight too; this tint only restores soft
   // forward scattering in the thin cloud edges.
    latestSunDirection.copy(nextSunDirection).normalize();
   }
   applyVisibility();
  },
  update({wallSeconds=0,simulatedDays=0,cameraPosition}={}){
   if(!enabled||daylight<=.002)return;
   cloudField.update({wallSeconds,simulatedDays,daylight,cameraPosition,sunDirection:latestSunDirection});
   cloudField.shadowUniforms.opacity.value=daylight>.05 ? .38*daylight : 0;
  },
  dispose(){cloudField.dispose();}
 };
}
