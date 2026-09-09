import * as THREE from 'three';

// The Sun is not a point. At an eclipse, every point on a receiving surface
// sees a different overlap between two apparent discs: the solar photosphere
// and the body in front of it. Sampling that overlap gives a physical umbra,
// antumbra and penumbra without using a screen-space blur.
export const MAX_SOLAR_OCCLUDERS=48;

export function solarShadowCone(sourceRadius,occluderRadius,separation){
 const source=Math.max(0,sourceRadius),occluder=Math.max(0,occluderRadius),distance=Math.max(1e-12,separation);
 const slopeUmbra=(source-occluder)/distance;
 const umbraLength=slopeUmbra>0?occluder/slopeUmbra:Infinity;
 return {
  umbraLength,
  // Radius at distance x behind the occluder. A negative value means the
  // umbra has ended and the observer is in the antumbra.
  umbraRadius:x=>occluder-x*slopeUmbra,
  penumbraRadius:x=>occluder+x*(source+occluder)/distance
 };
}

// Exact planar overlap of the *apparent* solar and occluder discs. The shader
// uses the same calculation per fragment. It also makes the cone model easy
// to verify without a WebGL context.
export function apparentDiskOcclusion(sunRadius,occluderRadius,separation){
 const a=Math.max(0,sunRadius),b=Math.max(0,occluderRadius),d=Math.max(0,separation);
 if(!a||!b||d>=a+b)return 0;
 if(d<=Math.abs(a-b))return b>=a?1:(b*b)/(a*a);
 const ca=THREE.MathUtils.clamp((d*d+a*a-b*b)/(2*d*a),-1,1);
 const cb=THREE.MathUtils.clamp((d*d+b*b-a*a)/(2*d*b),-1,1);
 const area=a*a*Math.acos(ca)+b*b*Math.acos(cb)-.5*Math.sqrt(Math.max(0,(-d+a+b)*(d+a-b)*(d-a+b)*(d+a+b)));
 return THREE.MathUtils.clamp(area/(Math.PI*a*a),0,1);
}

const fragmentPreamble=`
#define SOLAR_ECLIPSE_MAX ${MAX_SOLAR_OCCLUDERS}
uniform int solarOccluderCount;
uniform vec3 solarSourcePosition;
uniform float solarSourceRadius;
uniform vec3 solarOccluderPosition[SOLAR_ECLIPSE_MAX];
uniform float solarOccluderRadius[SOLAR_ECLIPSE_MAX];

float solarDiskOcclusion(float sunRadius,float blockerRadius,float separation){
 if(sunRadius<=0.0||blockerRadius<=0.0||separation>=sunRadius+blockerRadius)return 0.0;
 if(separation<=abs(sunRadius-blockerRadius))return blockerRadius>=sunRadius?1.0:blockerRadius*blockerRadius/(sunRadius*sunRadius);
 float ca=clamp((separation*separation+sunRadius*sunRadius-blockerRadius*blockerRadius)/(2.0*separation*sunRadius),-1.0,1.0);
 float cb=clamp((separation*separation+blockerRadius*blockerRadius-sunRadius*sunRadius)/(2.0*separation*blockerRadius),-1.0,1.0);
 float radical=max(0.0,(-separation+sunRadius+blockerRadius)*(separation+sunRadius-blockerRadius)*(separation-sunRadius+blockerRadius)*(separation+sunRadius+blockerRadius));
 float area=sunRadius*sunRadius*acos(ca)+blockerRadius*blockerRadius*acos(cb)-0.5*sqrt(radical);
 return clamp(area/(3.14159265359*sunRadius*sunRadius),0.0,1.0);
}

float solarEclipseVisibility(vec3 receiver){
 vec3 toSun=solarSourcePosition-receiver;
 float sunDistance=length(toSun);
 if(sunDistance<=solarSourceRadius)return 1.0;
 vec3 sunDirection=toSun/sunDistance;
 float sunAngular=asin(clamp(solarSourceRadius/sunDistance,0.0,0.99995));
 float obscured=0.0;
 for(int index=0;index<SOLAR_ECLIPSE_MAX;index++){
  if(index>=solarOccluderCount)break;
  vec3 toBlocker=solarOccluderPosition[index]-receiver;
  float blockerDistance=length(toBlocker);
  if(blockerDistance<=solarOccluderRadius[index]||blockerDistance>=sunDistance)continue;
  vec3 blockerDirection=toBlocker/blockerDistance;
  float separation=acos(clamp(dot(sunDirection,blockerDirection),-1.0,1.0));
  float blockerAngular=asin(clamp(solarOccluderRadius[index]/blockerDistance,0.0,0.99995));
  // A union would require a costly arrangement solve. Taking the largest
  // projected blocker is exact for the usual single-body eclipse and avoids
  // multiplying unrelated, tiny distant bodies into a false total eclipse.
  obscured=max(obscured,solarDiskOcclusion(sunAngular,blockerAngular,separation));
 }
 return 1.0-obscured;
}
`;

const shadowHook='directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;';

export function applyExtendedSolarShadow(material){
 const positions=Array.from({length:MAX_SOLAR_OCCLUDERS},()=>new THREE.Vector3(1e6,1e6,1e6));
 const radii=new Float32Array(MAX_SOLAR_OCCLUDERS);
 const uniforms={solarOccluderCount:{value:0},solarSourcePosition:{value:new THREE.Vector3()},solarSourceRadius:{value:0},solarOccluderPosition:{value:positions},solarOccluderRadius:{value:radii}};
 const previousCompile=material.onBeforeCompile;
 const previousKey=material.customProgramCacheKey?.bind(material);
 material.onBeforeCompile=shader=>{
  previousCompile?.(shader);
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=fragmentPreamble+'\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace(shadowHook,`${shadowHook}\n\t\tdirectLight.color *= solarEclipseVisibility( geometryPosition );`);
 };
 material.customProgramCacheKey=()=>`${previousKey?.()||''}|extended-solar-shadow-v2`;
 material.needsUpdate=true;
 return {
  update({sourcePosition,sourceRadius,occluders,viewMatrix}){
   uniforms.solarSourcePosition.value.copy(sourcePosition).applyMatrix4(viewMatrix);
   uniforms.solarSourceRadius.value=Math.max(0,sourceRadius);
  const selected=[];
  for(const occluder of occluders){
    const radius=Math.max(0,occluder.radius);
    // This updater accepts candidates already filtered for this receiver.
    if(radius>0)selected.push(occluder);
  }
   const count=Math.min(MAX_SOLAR_OCCLUDERS,selected.length);
   uniforms.solarOccluderCount.value=count;
   for(let index=0;index<count;index++){
    positions[index].copy(selected[index].position).applyMatrix4(viewMatrix);
    radii[index]=selected[index].radius;
   }
  },
  uniforms
 };
}

// Builds the short candidate list separately for every receiver. The source
// disc is evaluated at the receiving body's centre only for *selection*;
// fragment shader evaluation remains exact across its surface and rings.
export function solarOccludersForReceiver(receiverPosition,sourcePosition,sourceRadius,occluders,receiverId){
 const toSun=sourcePosition.clone().sub(receiverPosition),sunDistance=toSun.length();
 if(!(sunDistance>sourceRadius))return [];
 const sunDirection=toSun.multiplyScalar(1/sunDistance),sunAngular=Math.asin(THREE.MathUtils.clamp(sourceRadius/sunDistance,0,.99995));
 return occluders.filter(candidate=>{
  if(candidate.id===receiverId||candidate.radius<=0)return false;
  const toBlocker=candidate.position.clone().sub(receiverPosition),distance=toBlocker.length();
  if(!(distance>candidate.radius)&&distance<sunDistance)return true;
  if(distance>=sunDistance||distance<=candidate.radius)return false;
  const angular=Math.asin(THREE.MathUtils.clamp(candidate.radius/distance,0,.99995));
  const separation=Math.acos(THREE.MathUtils.clamp(toBlocker.multiplyScalar(1/distance).dot(sunDirection),-1,1));
  return separation<sunAngular+angular+.002;
 }).sort((a,b)=>b.radius/Math.max(1e-9,b.position.distanceTo(receiverPosition))-a.radius/Math.max(1e-9,a.position.distanceTo(receiverPosition))).slice(0,MAX_SOLAR_OCCLUDERS);
}
