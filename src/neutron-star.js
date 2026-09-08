import * as THREE from 'three';

// A compact visual cue for an observed pulsar: a hot, blue-white surface,
// magnetic equator and two polar radio/X-ray beams. The beam is deliberately
// illustrative; its reach is not a literal magnetosphere scale.
const beamMaterial=()=>new THREE.MeshBasicMaterial({color:'#bfeaff',transparent:true,opacity:.55,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});

export function createNeutronStarVisual(body){
 const group=new THREE.Group();
 const glow=new THREE.Mesh(new THREE.SphereGeometry(1.045,20,14),new THREE.MeshBasicMaterial({color:'#77c8ff',transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
 group.add(glow);
 const equator=new THREE.Mesh(new THREE.TorusGeometry(1.22,.018,6,48),new THREE.MeshBasicMaterial({color:'#78c6ff',transparent:true,opacity:.38,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
 equator.rotation.x=Math.PI/2;group.add(equator);
 const beams=new THREE.Group(),tilt=THREE.MathUtils.degToRad(body.beamTilt??body.tilt??30);beams.rotation.z=tilt;
 for(const sign of [-1,1]){const beam=new THREE.Mesh(new THREE.CylinderGeometry(.02,.14,4.8,12,1,true),beamMaterial());beam.position.y=sign*2.9;beams.add(beam)}
 group.add(beams);
 return {group,update(time){const pulse=.17+.83*Math.pow(Math.max(0,Math.sin(time*7.2)),10);for(const beam of beams.children)beam.material.opacity=.08+.5*pulse;glow.material.opacity=.10+.18*pulse;}};
}
