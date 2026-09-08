import * as THREE from 'three';

const POINTS=104,STRANDS=4;
function perpendicular(axis){
 const reference=Math.abs(axis.y)<.9?new THREE.Vector3(0,1,0):new THREE.Vector3(1,0,0);
 return new THREE.Vector3().crossVectors(axis,reference).normalize();
}

export function tidalSpiralPoint(start,end,strength,time,phase,u){
 const axis=new THREE.Vector3().subVectors(end,start),distance=axis.length(),direction=axis.normalize(),tangent=perpendicular(direction),bitangent=new THREE.Vector3().crossVectors(direction,tangent);
 const base=start.clone().lerp(end,u),turns=1.8+strength*4.8;
 const angle=phase+u*Math.PI*2*turns-time*(1.8+strength*5.2);
 const envelope=Math.pow(Math.sin(Math.PI*Math.min(.985,u)),.58)*Math.pow(1-u,.18);
 const radius=distance*(.012+strength*.13)*envelope;
 return base.addScaledVector(tangent,Math.cos(angle)*radius).addScaledVector(bitangent,Math.sin(angle)*radius);
}

export function createTidalStreams(scene){
 const streams=new Map();
 function make(flow){
  const group=new THREE.Group();scene.add(group);const strands=[];
  for(let strand=0;strand<STRANDS;strand++){const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(POINTS*3),3).setUsage(THREE.DynamicDrawUsage));const material=new THREE.LineBasicMaterial({color:flow.color,transparent:true,opacity:.1,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});const line=new THREE.Line(geometry,material);line.frustumCulled=false;group.add(line);strands.push(line)}
  const stream={group,strands};streams.set(flow.id,stream);return stream;
 }
 function remove(id){const stream=streams.get(id);if(!stream)return;scene.remove(stream.group);stream.group.traverse(object=>{object.geometry?.dispose();object.material?.dispose()});streams.delete(id)}
 return {update(flows,time){const ids=new Set(flows.map(flow=>flow.id));for(const id of streams.keys())if(!ids.has(id))remove(id);for(const flow of flows){const stream=streams.get(flow.id)||make(flow);stream.group.visible=flow.strength>.01;stream.strands.forEach((line,strand)=>{line.material.color.set(flow.color);line.material.opacity=Math.min(.92,.13+flow.strength*.7)*(strand===0?1:.62);const positions=line.geometry.attributes.position;for(let index=0;index<POINTS;index++){const point=tidalSpiralPoint(flow.start,flow.end,flow.strength,time,strand*Math.PI*.5,index/(POINTS-1));positions.setXYZ(index,point.x,point.y,point.z)}positions.needsUpdate=true;line.geometry.computeBoundingSphere()})}},clear(){for(const id of [...streams.keys()])remove(id)}};
}
