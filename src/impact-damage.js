import {Vector3,Color} from 'three';
// Persistent reduced-order surface scar; no claim of crust/fluid simulation.
export function applyImpactDamage(view,b){
 if(!b.damage||view.damage===b.damage)return;
 view.damage=b.damage;const {strength,kind}=b.damage,mesh=view.mesh;
 mesh.updateWorldMatrix(true,false);
 const axis=new Vector3(...b.damage.direction).normalize().applyQuaternion(mesh.getWorldQuaternion(mesh.quaternion.clone()).invert());
 if(!view.undamagedGeometry)view.undamagedGeometry=mesh.geometry.clone();
 if(mesh.geometry!==view.undamagedGeometry&&view.hasDamageGeometry)mesh.geometry.dispose();
 const geometry=view.undamagedGeometry.clone(),positions=geometry.attributes.position,colors=new Float32Array(positions.count*3);
 const n=new Vector3(),color=new Color(),width=kind==='graze'?.12:.18+strength*.35;
 for(let i=0;i<positions.count;i++){
  n.fromBufferAttribute(positions,i).normalize();const alignment=n.dot(axis),scar=Math.exp(-(1-alignment)/width),noise=Math.sin(n.x*47+n.y*29+n.z*61);
  const depth=kind==='accrete'?0:scar*strength*(kind==='disrupt'?.32:.16)*(1+.2*noise);
  positions.setXYZ(i,positions.getX(i)*(1-depth),positions.getY(i)*(1-depth),positions.getZ(i)*(1-depth));
  color.setRGB(1,1,1).lerp(new Color(kind==='accrete'?'#ad6340':'#351911'),Math.min(.9,scar*(.5+strength*.5)));color.toArray(colors,i*3);
 }
 geometry.setAttribute('color',positions.clone());geometry.attributes.color.array.set(colors);geometry.computeVertexNormals();mesh.geometry=geometry;view.hasDamageGeometry=true;
 mesh.material.vertexColors=true;mesh.material.needsUpdate=true;
 if(mesh.material.emissive){mesh.material.emissive.set('#742009');mesh.material.emissiveIntensity=strength*.25;}
 for(const child of mesh.children)if(child.material?.transparent)child.material.opacity*=1-strength*.6;
}
