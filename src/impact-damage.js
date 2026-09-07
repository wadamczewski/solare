import {attachSurfaceImpact} from './surface-impact.js';
import {Vector3,Color,Float32BufferAttribute} from 'three';
// Persistent reduced-order surface scar; no claim of crust/fluid simulation.
export function applyImpactDamage(view,b){
 if(!b.damage||view.damage===b.damage)return;
 view.damage=b.damage;const {strength,kind}=b.damage,mesh=view.mesh;
 mesh.updateWorldMatrix(true,false);
 const axis=new Vector3(...b.damage.direction).normalize().applyQuaternion(mesh.getWorldQuaternion(mesh.quaternion.clone()).invert());
 view.lastImpactAxis=axis.clone();attachSurfaceImpact(view,b,axis);
 if(!view.undamagedGeometry)view.undamagedGeometry=mesh.geometry.clone();
 const oldGeometry=mesh.geometry,geometry=oldGeometry.clone(),positions=geometry.attributes.position,previousColors=geometry.attributes.color,colors=new Float32Array(positions.count*3);
 const n=new Vector3(),color=new Color(),dark=new Color('#211713'),rimColor=new Color('#bd8360');
 // A bounded, deliberately legible crater in the display model, not a measured crater diameter.
 const width=kind==='graze'?.16:kind==='disrupt'?.55:.26+strength*.18;
 for(let i=0;i<positions.count;i++){
  n.fromBufferAttribute(positions,i).normalize();const angle=Math.acos(Math.max(-1,Math.min(1,n.dot(axis)))),q=angle/width;
  const bowl=Math.pow(Math.max(0,1-q*q),2),rim=Math.exp(-Math.pow((q-1)/.16,2)),ejecta=Math.exp(-Math.pow((q-1.25)/.45,2));
  const noise=Math.sin(n.x*47+n.y*29+n.z*61),depth=kind==='accrete'?0:bowl*(.055+strength*.18)*(1+.08*noise)-rim*(.014+strength*.025);
  const scale=Math.max(.4,1-depth);positions.setXYZ(i,positions.getX(i)*scale,positions.getY(i)*scale,positions.getZ(i)*scale);
  if(previousColors)color.fromBufferAttribute(previousColors,i);else color.setRGB(1,1,1);
  if(kind==='accrete')color.lerp(rimColor,Math.exp(-q*q)*.5);else color.lerp(dark,bowl*.88).lerp(rimColor,Math.min(.65,rim*.5+ejecta*.18));
  color.toArray(colors,i*3);
 }
 geometry.setAttribute('color',new Float32BufferAttribute(colors,3));geometry.computeVertexNormals();geometry.computeBoundingSphere();mesh.geometry=geometry;
 if(view.hasDamageGeometry)oldGeometry.dispose();view.hasDamageGeometry=true;
 mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
 if(mesh.material.emissive){mesh.material.emissive.set('#000000');mesh.material.emissiveIntensity=1;}
 for(const child of mesh.children)if(child.material?.transparent)child.material.opacity*=1-strength*.6;
}
