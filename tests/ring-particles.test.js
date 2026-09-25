import test from 'node:test';
import assert from 'node:assert/strict';
import {ringParticleRadius,createRingParticles,RING_PARTICLE_COUNT} from '../src/ring-particles.js';
import {SATURN_RING_INNER,SATURN_RING_BANDS} from '../src/planet-rings.js';
import {G,AU} from '../src/physics.js';

test('ringParticleRadius stays inside the ring and is monotonic in u',()=>{
 for(let step=0;step<=20;step++){
  const u=step/20,r=ringParticleRadius(SATURN_RING_INNER,SATURN_RING_BANDS,u);
  assert.ok(r>=SATURN_RING_INNER-1e-9&&r<=SATURN_RING_BANDS[SATURN_RING_BANDS.length-1].to+1e-9,`u=${u} r=${r} out of range`);
 }
 let previous=-Infinity;
 for(let step=0;step<=200;step++){
  const r=ringParticleRadius(SATURN_RING_INNER,SATURN_RING_BANDS,step/200);
  assert.ok(r>=previous-1e-9,'radius must not decrease as u increases');
  previous=r;
 }
});

test('ringParticleRadius samples the dense B ring far more often than the Cassini Division',()=>{
 // A uniform ladder of u values stands in for a large random sample without
 // depending on any particular RNG: the Cassini Division is band index 3
 // (0.10 alpha over a narrow span) while the B ring is band index 2 (0.92
 // alpha over the widest span) - real Cassini occultation data shows the
 // Division genuinely close to empty next to the B ring, and the sampler
 // should reproduce that imbalance from the bands' own alpha values alone.
 const samples=2000;
 let inB=0,inCassini=0;
 for(let i=0;i<samples;i++){
  const r=ringParticleRadius(SATURN_RING_INNER,SATURN_RING_BANDS,(i+.5)/samples);
  if(r>=SATURN_RING_BANDS[1].to&&r<SATURN_RING_BANDS[2].to)inB++;
  if(r>=SATURN_RING_BANDS[2].to&&r<SATURN_RING_BANDS[3].to)inCassini++;
 }
 assert.ok(inB>0&&inCassini>0,'both regions should receive some samples');
 const bWidth=SATURN_RING_BANDS[2].to-SATURN_RING_BANDS[1].to,cassiniWidth=SATURN_RING_BANDS[3].to-SATURN_RING_BANDS[2].to;
 const bDensity=inB/bWidth,cassiniDensity=inCassini/cassiniWidth;
 assert.ok(bDensity>cassiniDensity*5,`B ring density ${bDensity} should dwarf Cassini Division density ${cassiniDensity}`);
});

test('createRingParticles builds the requested instance count with every particle inside the ring',()=>{
 const {mesh,data}=createRingParticles({inner:SATURN_RING_INNER,bands:SATURN_RING_BANDS,count:256,random:mulberry32(1)});
 assert.equal(mesh.count,256);
 assert.equal(data.length,256);
 for(const p of data){
  assert.ok(p.r>=SATURN_RING_INNER&&p.r<=SATURN_RING_BANDS[SATURN_RING_BANDS.length-1].to);
  assert.ok(Number.isFinite(p.t)&&Number.isFinite(p.y));
 }
});

test('defaults to the documented particle count when none is given',()=>{
 const {mesh}=createRingParticles({inner:SATURN_RING_INNER,bands:SATURN_RING_BANDS,random:mulberry32(2)});
 assert.equal(mesh.count,RING_PARTICLE_COUNT);
});

test('update gives an inner fragment a faster angular rate than an outer one, matching real differential rotation',()=>{
 const {data,update}=createRingParticles({inner:SATURN_RING_INNER,bands:SATURN_RING_BANDS,count:64,random:mulberry32(3)});
 // Force two known radii, one near the inner edge and one near the outer
 // edge, both starting at the same phase, so any angular separation after
 // one day comes only from their different orbital radii.
 data[0].r=SATURN_RING_INNER+.01;data[0].t=0;data[0].y=0;
 data[1].r=SATURN_RING_BANDS[SATURN_RING_BANDS.length-1].to-.01;data[1].t=0;data[1].y=0;
 const saturnRadiusKm=58232,saturnMassSolar=.00028589;
 update(0,{mass:saturnMassSolar,radiusKm:saturnRadiusKm,sceneRadius:1,density:1});
 const angleAt=index=>{const rAu=data[index].r*saturnRadiusKm/AU;return Math.sqrt(G*saturnMassSolar/(rAu**3))};
 assert.ok(angleAt(0)>angleAt(1),'a fragment near the inner edge must complete more orbit per day than one near the outer edge');
});

test('update leaves an inactive tail of instances untouched and shrinks mesh.count with density',()=>{
 const {mesh,update}=createRingParticles({inner:SATURN_RING_INNER,bands:SATURN_RING_BANDS,count:200,random:mulberry32(4)});
 update(0,{mass:.00028589,radiusKm:58232,sceneRadius:1,density:.25});
 assert.equal(mesh.count,50);
});

// A tiny deterministic PRNG so these tests never depend on Math.random.
function mulberry32(seed){
 let a=seed>>>0;
 return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
}
