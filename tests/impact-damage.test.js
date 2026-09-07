import test from 'node:test';import assert from 'node:assert/strict';
import {Mesh,SphereGeometry,MeshStandardMaterial} from 'three';
import {applyImpactDamage} from '../src/impact-damage.js';
test('impact deforms impacted hemisphere without mutating shared planet geometry',()=>{
 const geometry=new SphereGeometry(1,32,24),original=Array.from(geometry.attributes.position.array),mesh=new Mesh(geometry,new MeshStandardMaterial()),view={mesh};
 const b={damage:{direction:[1,0,0],kind:'crater',strength:.8}};applyImpactDamage(view,b);
 assert.deepEqual(Array.from(geometry.attributes.position.array),original);assert.notDeepEqual(Array.from(mesh.geometry.attributes.position.array),original);
 const pos=mesh.geometry.attributes.position;let front=0,back=0;for(let i=0;i<pos.count;i++){const loss=1-Math.hypot(pos.getX(i),pos.getY(i),pos.getZ(i));if(pos.getX(i)>.7)front=Math.max(front,loss);if(pos.getX(i)<-.7)back=Math.max(back,loss)}assert.ok(front>back*10);assert.ok(mesh.material.vertexColors);
 const changed=mesh.geometry;applyImpactDamage(view,b);assert.equal(mesh.geometry,changed);
});
test('weak comet impact leaves a measurable bowl and raised rim; later impacts preserve it',()=>{
 const geometry=new SphereGeometry(1,96,64),mesh=new Mesh(geometry,new MeshStandardMaterial()),view={mesh};
 applyImpactDamage(view,{damage:{direction:[1,0,0],kind:'crater',strength:.12}});
 const p=mesh.geometry.attributes.position;let min=1,max=1;for(let i=0;i<p.count;i++){const r=Math.hypot(p.getX(i),p.getY(i),p.getZ(i));min=Math.min(min,r);max=Math.max(max,r)}assert.ok(min<.94);assert.ok(max>1.01);
 const before=Array.from(p.array);applyImpactDamage(view,{damage:{direction:[-1,0,0],kind:'crater',strength:.12}});
 const after=mesh.geometry.attributes.position;let index=0;for(let i=0;i<p.count;i++)if(before[i*3]>before[index*3])index=i;
 assert.ok(Math.abs(after.getX(index)-before[index*3])<1e-6);assert.ok(view.lastImpactAxis.x<0);
});
