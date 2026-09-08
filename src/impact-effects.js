import * as THREE from 'three';
// Bounded visual debris pool. Massive ejecta are integrated separately by N-body.
export function createImpactEffects(scene){
 const active=[],maxEvents=8,count=1024,shardCount=32;
 const dummy=new THREE.Object3D();
 function dispose(e){scene.remove(e.group);e.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
 function add(event,position,size){
  if(active.length>=maxEvents)dispose(active.shift());const group=new THREE.Group();group.position.copy(position);scene.add(group);
  const absorb=event.kind==='absorb',geometry=new THREE.BufferGeometry(),positions=new Float32Array(count*3),colors=new Float32Array(count*3),sizes=new Float32Array(count),brightness=new Float32Array(count),seeds=[];
  const normal=new THREE.Vector3(...(event.normal||[0,1,0])).normalize(),tangent=new THREE.Vector3().crossVectors(normal,Math.abs(normal.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0)).normalize(),bitangent=new THREE.Vector3().crossVectors(normal,tangent).normalize();
  for(let i=0;i<count;i++){const theta=i*2.399963,spread=.35+.65*(i%37)/36,direction=tangent.clone().multiplyScalar(Math.cos(theta)*spread).addScaledVector(bitangent,Math.sin(theta)*spread).addScaledVector(normal,(absorb?0:.12+(i%11)/55)).normalize();seeds.push({direction,theta,variation:.4+(i%31)/20});positions.set(direction.clone().multiplyScalar(size*.8).toArray(),i*3);const color=new THREE.Color().setHSL(.035+(i%17)/240,.8,.55+(i%7)/20);colors.set(color.toArray(),i*3);sizes[i]=1.5+(i%11)*.35;brightness[i]=1;}
  for(const [name,array,n] of [['position',positions,3],['color',colors,3],['pointSize',sizes,1],['brightness',brightness,1]])geometry.setAttribute(name,new THREE.BufferAttribute(array,n).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false,uniforms:{dpr:{value:Math.min(devicePixelRatio,2)}},vertexShader:`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 color;attribute float pointSize;attribute float brightness;uniform float dpr;varying vec3 tint;varying float alpha;
void main(){tint=color;alpha=brightness;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=pointSize*dpr;
#include <logdepthbuf_vertex>
}`,fragmentShader:`
#include <common>
#include <logdepthbuf_pars_fragment>
varying vec3 tint;varying float alpha;
void main(){
#include <logdepthbuf_fragment>
float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(tint,alpha*exp(-r*r*5.));
}`});
  const dust=new THREE.Points(geometry,material);dust.frustumCulled=false;group.add(dust);
  const shards=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshStandardMaterial({color:'#8a5a3a',emissive:'#ff6b20',emissiveIntensity:2,roughness:1,transparent:true}),shardCount);shards.instanceMatrix.setUsage(THREE.DynamicDrawUsage);shards.frustumCulled=false;group.add(shards);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),new THREE.MeshBasicMaterial({color:'#fff0cf',transparent:true,opacity:.7,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));flash.visible=false;flash.scale.setScalar(size);group.add(flash);
  const wave=new THREE.Mesh(new THREE.RingGeometry(.82,1,80),new THREE.MeshBasicMaterial({color:'#ffad66',transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));wave.visible=!absorb;wave.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),normal);group.add(wave);
  const light=new THREE.PointLight('#ff9c52',0,0,0);group.add(light);
  active.push({group,dust,shards,flash,wave,light,seeds,normal,size,age:0,absorb,survivor:event.survivor,p:[...event.p],v:[...event.v],duration:absorb?7:event.kind==='graze'?3.5:6});
 }
 function update(dt,map,simulationDelta,findSurvivor){for(let i=active.length-1;i>=0;i--){const e=active[i];e.age+=dt;e.p=e.p.map((x,k)=>x+e.v[k]*simulationDelta);const anchor=e.absorb?findSurvivor?.(e.survivor):null;e.group.position.copy(anchor||map(e.p));const t=e.age/e.duration;if(t>=1){dispose(e);active.splice(i,1);continue}
  const a=e.dust.geometry.attributes.position,b=e.dust.geometry.attributes.brightness;
  for(let j=0;j<count;j++){const seed=e.seeds[j],local=Math.max(0,Math.min(1,t*1.25-(j%13)*.015));let p;
   if(e.absorb){const radius=e.size*(.08+2.4*(1-local)**1.7),angle=seed.theta+local*12+seed.variation*local*5;p=new THREE.Vector3(Math.cos(angle)*radius,seed.direction.y*e.size*(1-local)**2*.8,Math.sin(angle)*radius);}
   else{p=seed.direction.clone().multiplyScalar(e.size*(.65+4.5*local*seed.variation));p.addScaledVector(e.normal,e.size*local*(.12+Math.sin(seed.theta*2)*.08));}
   a.setXYZ(j,p.x,p.y,p.z);b.setX(j,(1-local)**1.4*(.7+.3*Math.sin(j+t*18)**2));
  }a.needsUpdate=true;b.needsUpdate=true;
  for(let j=0;j<shardCount;j++){const index=j*29%count;dummy.position.fromBufferAttribute(a,index);dummy.rotation.set(t*(j%3+1)*4,t*5+j,t*3);if(e.absorb){const filament=Math.max(.01,1-t);dummy.scale.set(e.size*.025*filament,e.size*.025*filament,e.size*.52*filament)}else dummy.scale.set(e.size*.055*(1-t),e.size*.035*(1-t),e.size*.08*(1-t));dummy.updateMatrix();e.shards.setMatrixAt(j,dummy.matrix)}e.shards.instanceMatrix.needsUpdate=true;e.shards.material.opacity=(1-t)**.7;e.shards.material.emissiveIntensity=2.5*(1-t)**2;
  e.flash.scale.setScalar(e.size*(e.absorb?Math.max(.02,.65-t):.7+t*2));e.flash.material.opacity=e.absorb?Math.max(0,.2-t*.5):Math.max(0,.8-t*5);
  e.wave.scale.setScalar(e.size*(1+t*7));e.wave.material.opacity=.12*(1-t)**3;e.light.intensity=e.absorb?.4*(1-t):1.5*Math.exp(-t*12);
 }}
 return {add,update,clear(){active.splice(0).forEach(dispose)}};
}
