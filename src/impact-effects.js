import * as THREE from 'three';
// Short-lived light and dust visualization. Massive ejecta live in the N-body solver.
export function createImpactEffects(scene){
 const active=[],maxEvents=10,count=192;
 function dispose(effect){scene.remove(effect.group);effect.group.traverse(o=>{o.geometry?.dispose();o.material?.dispose()})}
 function add(event,position,size){
  if(active.length>=maxEvents)dispose(active.shift());const group=new THREE.Group();group.position.copy(position);scene.add(group);
  const data=new Float32Array(count*3),velocities=[],absorb=event.kind==='absorb';
  for(let i=0;i<count;i++){const z=1-2*(i+.5)/count,t=i*2.39996,r=Math.sqrt(1-z*z),v=new THREE.Vector3(r*Math.cos(t),z,r*Math.sin(t));velocities.push(v.multiplyScalar(.4+(i%11)/7));if(absorb)data.set(v.clone().multiplyScalar(size*2).toArray(),i*3)}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data,3).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.PointsMaterial({color:absorb?'#dba26c':event.kind==='accrete'?'#ffd296':'#ffb076',size:Math.max(.000001,size*.055),transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const dust=new THREE.Points(geometry,material);dust.frustumCulled=false;group.add(dust);
  const flash=new THREE.Mesh(new THREE.SphereGeometry(1,20,14),new THREE.MeshBasicMaterial({color:'#fff0cf',transparent:true,opacity:.75,depthWrite:false,blending:THREE.AdditiveBlending}));flash.scale.setScalar(size*.7);group.add(flash);
  active.push({group,dust,flash,velocities,size,age:0,absorb,p:[...event.p],v:[...event.v],duration:event.kind==='graze'?2.4:4.5});
 }
 function update(dt,map,simulationDelta){for(let i=active.length-1;i>=0;i--){const e=active[i];e.age+=dt;e.p=e.p.map((x,k)=>x+e.v[k]*simulationDelta);e.group.position.copy(map(e.p));const t=e.age/e.duration;if(t>=1){dispose(e);active.splice(i,1);continue}const a=e.dust.geometry.attributes.position;for(let j=0;j<count;j++){const p=e.velocities[j].clone().multiplyScalar(e.size*(e.absorb?2*(1-t):t*5));if(e.absorb)p.applyAxisAngle(new THREE.Vector3(0,1,0),t*5);a.setXYZ(j,p.x,p.y,p.z)}a.needsUpdate=true;e.dust.material.opacity=(1-t)**2;e.flash.scale.setScalar(e.size*(e.absorb?Math.max(.01,.7-t):.7+t*1.5));e.flash.material.opacity=Math.max(0,.7-t*3);}}
 return {add,update,clear(){active.splice(0).forEach(dispose)}};
}
