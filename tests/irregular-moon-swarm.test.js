import test from 'node:test';
import assert from 'node:assert/strict';
import {IRREGULAR_MOON_GROUPS,IRREGULAR_MOON_COUNT,irregularMoonOffset,createIrregularMoonSwarm} from '../src/irregular-moon-swarm.js';
import {AU} from '../src/physics.js';
import * as THREE from 'three';

test('the three groups reproduce the real, currently known population of 268 Saturn irregulars',()=>{
 assert.equal(IRREGULAR_MOON_COUNT,268);
 assert.deepEqual(IRREGULAR_MOON_GROUPS.map(g=>g.count),[39,19,210]);
});

test('irregularMoonOffset stays within the real perihelion-aphelion band for every phase',()=>{
 const a=15e6/AU,e=.3;
 for(let meanAnomalyDeg=-180;meanAnomalyDeg<=180;meanAnomalyDeg+=15){
  const offset=irregularMoonOffset({a,e,inclinationDeg:45,nodeDeg:20,argumentDeg:80,meanAnomalyDeg});
  const r=Math.hypot(...offset);
  assert.ok(r>=a*(1-e)-1e-9&&r<=a*(1+e)+1e-9,`meanAnomaly=${meanAnomalyDeg} r=${r}`);
 }
});

test('an Inuit/Gallic-like inclination (<90 deg) is prograde; a Norse-like one (>90 deg) is retrograde',()=>{
 // Prograde is counter-clockwise seen from the scene's +Y pole (see
 // ephemeris.js's toSceneFrame), so the same finite-difference angular
 // momentum check ephemeris.test.js uses for the real planets applies here:
 // L_y = z*vx - x*vz must be positive for a prograde orbit.
 const angularMomentumSign=inclinationDeg=>{
  const elements={a:15e6/AU,e:.2,inclinationDeg,nodeDeg:35,argumentDeg:110};
  const dM=1e-4,p1=irregularMoonOffset({...elements,meanAnomalyDeg:0}),p2=irregularMoonOffset({...elements,meanAnomalyDeg:dM});
  const v=p2.map((x,k)=>(x-p1[k])/dM);
  return p1[2]*v[0]-p1[0]*v[2];
 };
 assert.ok(angularMomentumSign(45)>0,'a 45 degree inclination (Inuit/Gallic-like) must be prograde');
 assert.ok(angularMomentumSign(160)<0,'a 160 degree inclination (Norse-like) must be retrograde');
});

test('createIrregularMoonSwarm builds one instance per real member across all three groups',()=>{
 const {mesh,data}=createIrregularMoonSwarm({random:mulberry32(7)});
 assert.equal(mesh.count,IRREGULAR_MOON_COUNT);
 assert.equal(data.length,IRREGULAR_MOON_COUNT);
 const byGroup={};
 for(const p of data)byGroup[p.group]=(byGroup[p.group]||0)+1;
 assert.deepEqual(byGroup,{Inuit:39,Gallic:19,Norse:210});
});

test('every generated member stays inside its own group\'s real orbital-element ranges',()=>{
 const {data}=createIrregularMoonSwarm({random:mulberry32(11)});
 const groupsByName=Object.fromEntries(IRREGULAR_MOON_GROUPS.map(g=>[g.name,g]));
 for(const p of data){
  const g=groupsByName[p.group];
  assert.ok(p.a>=g.aMinKm/AU-1e-9&&p.a<=g.aMaxKm/AU+1e-9,`${p.group} semi-major axis out of range`);
  assert.ok(p.e>=g.eMin-1e-9&&p.e<=g.eMax+1e-9,`${p.group} eccentricity out of range`);
  assert.ok(p.inclinationDeg>=g.incMinDeg-1e-9&&p.inclinationDeg<=g.incMaxDeg+1e-9,`${p.group} inclination out of range`);
 }
});

test('update places every active instance beyond the host\'s own drawn radius',()=>{
 const {mesh,update}=createIrregularMoonSwarm({random:mulberry32(3)});
 const hostPosition=new THREE.Vector3(1,0,0),hostSceneRadius=.57;
 update(0,{mass:.00028589,hostPosition,hostSceneRadius,density:1});
 const matrix=new THREE.Matrix4(),position=new THREE.Vector3();
 for(let i=0;i<mesh.count;i+=37){
  mesh.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);
  assert.ok(position.distanceTo(hostPosition)>hostSceneRadius,`instance ${i} sits inside its own host`);
 }
});

test('update shrinks mesh.count with density, like the other instanced swarms',()=>{
 const {mesh,update}=createIrregularMoonSwarm({random:mulberry32(5)});
 update(0,{mass:.00028589,hostPosition:new THREE.Vector3(),hostSceneRadius:.57,density:.5});
 assert.equal(mesh.count,Math.round(IRREGULAR_MOON_COUNT*.5));
});

function mulberry32(seed){
 let a=seed>>>0;
 return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
}
