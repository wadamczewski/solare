import * as THREE from 'three';
import {G,AU} from './physics.js';

// A real ring is not a painted disc, or even the grained-but-flat texture
// ringGrain gives it (see planet-rings.js) - it is an uncountable population
// of individually orbiting ice and rock fragments, each on its own Keplerian
// orbit around the planet, moving strictly faster the closer it sits (the
// same differential rotation Cassini measured directly in the real rings:
// the B ring's inner edge completes an orbit in a bit over 7 hours, its
// outer edge in more than 14). A few thousand instanced fragments stand in
// for that population at close range - not a literal particle count (the
// real rings hold on the order of 10^12-10^13 individual objects), but
// enough to read as a swarm rather than a surface once the camera is close
// enough to tell the difference from the flat textured disc underneath.
export const RING_PARTICLE_COUNT=4000;

// Real optical depth already tells us where the ring actually has material:
// SATURN_RING_BANDS/URANUS_RING_BANDS's alpha values are a rounded stand-in
// for exactly that (see planet-rings.js). Sampling particle radii uniformly
// across [inner,outer) would seed the close-to-empty Cassini Division or the
// wide true gaps between Uranus's rings with as much material as the dense
// B ring - so instead each band's share of the population is weighted by
// its own (width x alpha), the same quantity a real occultation profile's
// area under the curve represents. This is a pure function of the bands and
// a single uniform sample u so it can be tested and reasoned about without
// any randomness of its own.
export function ringParticleRadius(inner,bands,u){
 let previous=inner,total=0;
 const spans=bands.map(band=>{const width=band.to-previous,weight=Math.max(0,width*band.alpha);total+=weight;previous=band.to;return {from:band.to-width,to:band.to,weight}});
 if(total<=0)return inner;
 let target=Math.min(.999999,Math.max(0,u))*total;
 for(const span of spans){
  if(target<=span.weight||span===spans[spans.length-1]){
   const fraction=span.weight>0?target/span.weight:0;
   return span.from+(span.to-span.from)*Math.min(1,Math.max(0,fraction));
  }
  target-=span.weight;
 }
 return bands[bands.length-1].to;
}

// One radial band's colour, reused verbatim so a particle drawn from the B
// ring reads as B-ring material and one drawn from a gap reads as the same
// near-black haze ringGrain already gives that gap, rather than the swarm
// introducing its own, unrelated palette.
function bandToneAt(bands,r){for(const band of bands)if(r<band.to)return band.tone;return bands[bands.length-1].tone;}

export function createRingParticles({inner,bands,count=RING_PARTICLE_COUNT,random=Math.random}={}){
 const geometry=new THREE.IcosahedronGeometry(1,0);
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,vertexColors:true});
 const mesh=new THREE.InstancedMesh(geometry,material,count);
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;
 const data=[],color=new THREE.Color();
 for(let index=0;index<count;index++){
  const r=ringParticleRadius(inner,bands,random()),t=random()*Math.PI*2;
  // Real vertical excitation is a fraction of a ring's own radius, not a
  // fixed height - moon resonances bend the ring plane itself, they do not
  // add a constant-thickness haze on top of it.
  const y=(random()-.5)*r*.006;
  data.push({index,r,t,y,spin:(random()-.5)*.4,scale:.00018+random()*.00048,stretch:.7+random()*.6,rotation:random()*Math.PI*2});
  const tone=new THREE.Color(bandToneAt(bands,r)),shade=.65+random()*.55;
  color.copy(tone).multiplyScalar(shade);
  mesh.setColorAt(index,color);
 }
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),matrix=new THREE.Matrix4();
 let lastStamp='';
 // elapsed is simulated days, exactly as everywhere else in this file; mass
 // is in solar masses and radiusKm the host's own physical radius, so the
 // mean motion below is the same vis-viva relation physics.js uses for every
 // other orbit in the scene, not a separate approximation - it is what makes
 // an inner fragment visibly outrun an outer one instead of the whole swarm
 // turning together like a solid wheel.
 const update=(elapsed,{mass,radiusKm,sceneRadius,density=1}={})=>{
  const active=Math.min(count,Math.max(0,Math.round(count*density)));
  const stamp=`${elapsed.toFixed(6)}:${active}:${sceneRadius.toFixed(6)}`;
  if(stamp===lastStamp)return;
  lastStamp=stamp;
  mesh.count=active;
  const rAuPerUnit=radiusKm/AU;
  for(let index=0;index<active;index++){
   const p=data[index],rAu=p.r*rAuPerUnit,n=Math.sqrt(G*mass/(rAu*rAu*rAu)),angle=p.t+elapsed*n;
   position.set(p.r*Math.cos(angle),p.y,p.r*Math.sin(angle)).multiplyScalar(sceneRadius);
   quaternion.setFromEuler(new THREE.Euler(p.rotation+elapsed*p.spin,angle*.53,p.rotation*.41));
   const s=p.scale*sceneRadius;scale.set(s*p.stretch,s,s*(1.3/p.stretch));
   matrix.compose(position,quaternion,scale);mesh.setMatrixAt(p.index,matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
 };
 return {mesh,data,update};
}
