import * as THREE from 'three';
import {G,AU} from './physics.js';
import {eccentricAnomaly,toSceneFrame} from './ephemeris.js';
import {satelliteOffset} from './scene-scale.js';

// Saturn has 293 confirmed moons (IAU, as of mid-2026); the 23 large enough
// or well enough imaged to size individually are simulated as real N-body
// bodies in physics.js. The remaining ~268 are small, distant, captured
// objects, each with its own independently determined orbit but none with a
// measured size worth an individual body - exactly the population a
// decorative statistical swarm is for, the way asteroid-belt.js already
// stands in for the main asteroid belt. Real dynamicists sort them into
// three families by how they got here, and this reuses that same grouping
// and its own real orbital-element ranges (Wikipedia, "Inuit group" /
// "Gallic group" / "Saturn's Norse group of satellites", both citing Denk et
// al. and the Minor Planet Center):
//  - Inuit: 39 moons, prograde, inclination 43-51 deg, semi-major axis
//    11-19 million km, eccentricity 0.08-0.39 - a collisional family sharing
//    one progenitor's rough orbit.
//  - Gallic: 19 moons, prograde, inclination 34-41 deg, semi-major axis
//    16-23.3 million km, eccentricity 0.44-0.57.
//  - Norse: 210 moons (by far the largest group - most of Saturn's moons
//    are Norse), retrograde, inclination 136-178 deg, semi-major axis
//    11-30 million km, eccentricity 0.13-0.53. Phoebe, its largest and best
//    characterised member, is real enough to simulate individually in a
//    future commit, but the single shared per-parent inclination
//    initialSystem() gives every other Saturn moon does not fit an object
//    tilted this far from the ring plane; it stays part of the decorative
//    swarm for now rather than being shoehorned into that model.
// Radii are not individually known for this population; each fragment gets
// a small, randomised, plausible size (most known members run a few
// kilometres to a few tens of kilometres across) rather than a specific,
// invented measurement.
export const IRREGULAR_MOON_GROUPS=[
 {name:'Inuit',count:39,prograde:true,incMinDeg:43,incMaxDeg:51,aMinKm:11e6,aMaxKm:19e6,eMin:.08,eMax:.39},
 {name:'Gallic',count:19,prograde:true,incMinDeg:34,incMaxDeg:41,aMinKm:16e6,aMaxKm:23.3e6,eMin:.44,eMax:.57},
 {name:'Norse',count:210,prograde:false,incMinDeg:136,incMaxDeg:178,aMinKm:11e6,aMaxKm:30e6,eMin:.13,eMax:.53}
];
export const IRREGULAR_MOON_COUNT=IRREGULAR_MOON_GROUPS.reduce((sum,group)=>sum+group.count,0);

// One orbit's position, in AU, in the same scene basis physics.js's moon
// offsets already use (x/z horizontal, y the out-of-plane component) - the
// exact rotation ephemeris.js's planetState uses for the real planets,
// reused here for a synthetic set of elements rather than a tabulated one,
// then carried into that basis with the same toSceneFrame it uses. A real
// inclination past 90 degrees (every Norse-group orbit) flips the apparent
// direction of travel on its own through this rotation - retrograde motion
// falls out of the standard formula rather than needing a separate sign flip.
export function irregularMoonOffset({a,e,inclinationDeg,nodeDeg,argumentDeg,meanAnomalyDeg}){
 const DEG=Math.PI/180,i=inclinationDeg*DEG,node=nodeDeg*DEG,argument=argumentDeg*DEG;
 const E=eccentricAnomaly(meanAnomalyDeg,e)*DEG,cosE=Math.cos(E),sinE=Math.sin(E),root=Math.sqrt(Math.max(0,1-e*e));
 const x=a*(cosE-e),y=a*root*sinE;
 const cw=Math.cos(argument),sw=Math.sin(argument),cn=Math.cos(node),sn=Math.sin(node),ci=Math.cos(i),si=Math.sin(i);
 const rotate=(u,w)=>[
  (cw*cn-sw*sn*ci)*u+(-sw*cn-cw*sn*ci)*w,
  (cw*sn+sw*cn*ci)*u+(-sw*sn+cw*cn*ci)*w,
  (sw*si)*u+(cw*si)*w
 ];
 return toSceneFrame(rotate(x,y));
}

export function createIrregularMoonSwarm({groups=IRREGULAR_MOON_GROUPS,random=Math.random}={}){
 const count=groups.reduce((sum,group)=>sum+group.count,0);
 const geometry=new THREE.IcosahedronGeometry(1,0);
 const material=new THREE.MeshStandardMaterial({color:'#ffffff',roughness:1,metalness:0,vertexColors:true});
 const mesh=new THREE.InstancedMesh(geometry,material,count);
 mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
 mesh.castShadow=false;mesh.receiveShadow=false;mesh.frustumCulled=false;
 const data=[],color=new THREE.Color();
 let index=0;
 for(const group of groups){
  // Prograde and retrograde tones give the two dynamical families a
  // legible identity at a glance without adding any labelling of their
  // own: warm rock tones for the prograde Inuit/Gallic families, a cooler,
  // darker tone for the far larger retrograde Norse family - not a
  // measured colour (none of these has ever been resolved well enough for
  // one), just a readable stand-in.
  const tone=group.prograde?'#a08a76':'#6a6f78';
  for(let member=0;member<group.count;member++,index++){
   const a=(group.aMinKm+random()*(group.aMaxKm-group.aMinKm))/AU,e=group.eMin+random()*(group.eMax-group.eMin),
    inclinationDeg=group.incMinDeg+random()*(group.incMaxDeg-group.incMinDeg),
    nodeDeg=random()*360,argumentDeg=random()*360,meanAnomalyDeg0=random()*360;
   data.push({index,group:group.name,a,e,inclinationDeg,nodeDeg,argumentDeg,meanAnomalyDeg0,
    scale:.0004+random()*.0016,stretch:.65+random()*.65,spin:(random()-.5)*.5,rotation:random()*Math.PI*2});
   color.set(tone).offsetHSL(0,0,(random()-.5)*.16);
   mesh.setColorAt(index,color);
  }
 }
 if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
 const position=new THREE.Vector3(),quaternion=new THREE.Quaternion(),scale=new THREE.Vector3(),matrix=new THREE.Matrix4(),offset=new THREE.Vector3();
 let lastStamp='';
 const update=(elapsed,{mass,hostPosition,hostSceneRadius,density=1}={})=>{
  const active=Math.min(count,Math.max(0,Math.round(count*density)));
  const stamp=`${elapsed.toFixed(4)}:${active}:${hostSceneRadius.toFixed(6)}:${hostPosition.x.toFixed(6)},${hostPosition.y.toFixed(6)},${hostPosition.z.toFixed(6)}`;
  if(stamp===lastStamp)return;
  lastStamp=stamp;
  mesh.count=active;
  for(let i=0;i<active;i++){
   const p=data[i],n=Math.sqrt(G*mass/(p.a**3))*180/Math.PI; // deg/day mean motion
   offset.fromArray(irregularMoonOffset({a:p.a,e:p.e,inclinationDeg:p.inclinationDeg,nodeDeg:p.nodeDeg,argumentDeg:p.argumentDeg,meanAnomalyDeg:p.meanAnomalyDeg0+n*elapsed}));
   const rAu=offset.length(),direction=offset.clone().divideScalar(rAu||1);
   position.copy(hostPosition).addScaledVector(direction,satelliteOffset(hostSceneRadius,rAu));
   quaternion.setFromEuler(new THREE.Euler(p.rotation+elapsed*p.spin,p.rotation*.71,p.rotation*.37));
   const s=p.scale*hostSceneRadius;scale.set(s*p.stretch,s,s*(1.3/p.stretch));
   matrix.compose(position,quaternion,scale);mesh.setMatrixAt(p.index,matrix);
  }
  mesh.instanceMatrix.needsUpdate=true;
 };
 return {mesh,data,update};
}
