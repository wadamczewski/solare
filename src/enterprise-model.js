import * as THREE from 'three';

// Original procedural fan model of the Constitution-class NCC-1701 silhouette.
// Local geometry: no downloaded artwork, licence-gated asset or startup cost.
export function createEnterpriseModel(){
 const ship=new THREE.Group();ship.name='USS Enterprise · NCC-1701';
 const hull=new THREE.MeshStandardMaterial({color:'#c6ccd0',metalness:.48,roughness:.4,emissive:'#8091a5',emissiveIntensity:.6});
 const trim=new THREE.MeshStandardMaterial({color:'#6e7d8b',metalness:.6,roughness:.35,emissive:'#253443',emissiveIntensity:.2});
 const dark=new THREE.MeshStandardMaterial({color:'#222c38',metalness:.6,roughness:.42});
 const copper=new THREE.MeshStandardMaterial({color:'#c08448',metalness:.72,roughness:.28,emissive:'#985020',emissiveIntensity:.35});
 const light=color=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:1.8,roughness:.2});
 const windowLight=light('#d6edff'),red=light('#ff3927'),blue=light('#699ee6');
 const group=name=>{const result=new THREE.Group();result.name=name;ship.add(result);return result};
 function mesh(parent,geometry,material,position=[0,0,0],scale){
  const result=new THREE.Mesh(geometry,material);result.position.set(...position);if(scale)result.scale.set(...scale);
  result.castShadow=true;result.receiveShadow=true;parent.add(result);return result;
 }
 function ellipsoid(parent,radius,material,position,scale){return mesh(parent,new THREE.SphereGeometry(radius,48,24),material,position,scale)}
 function cylinder(parent,top,bottom,length,material,position,alongZ=false){
  const result=mesh(parent,new THREE.CylinderGeometry(top,bottom,length,64),material,position);if(alongZ)result.rotation.x=Math.PI/2;return result;
 }
 function ring(parent,radius,tube,material,position,horizontal=false){
  const result=mesh(parent,new THREE.TorusGeometry(radius,tube,8,96),material,position);if(horizontal)result.rotation.x=Math.PI/2;return result;
 }
 function beam(parent,start,end,width,depth,material){
  const from=new THREE.Vector3(...start),to=new THREE.Vector3(...end),direction=to.clone().sub(from);
  const result=mesh(parent,new THREE.BoxGeometry(width,direction.length(),depth),material,from.clone().add(to).multiplyScalar(.5).toArray());
  result.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());return result;
 }
 function windows(parent,points){
  const result=new THREE.InstancedMesh(new THREE.BoxGeometry(.045,.025,.008),windowLight,points.length),matrix=new THREE.Matrix4(),q=new THREE.Quaternion(),size=new THREE.Vector3(1,1,1);
  points.forEach(({position,angle=0},i)=>{q.setFromAxisAngle(new THREE.Vector3(0,1,0),angle);matrix.compose(new THREE.Vector3(...position),q,size);result.setMatrixAt(i,matrix)});
  result.name='Illuminated viewports';result.instanceMatrix.needsUpdate=true;parent.add(result);
 }

 const saucer=group('Primary hull · saucer');saucer.position.set(0,.63,-1.65);
 // Lathed decks give the saucer its bevelled rim and shallow stepped domes.
 const profile=[[0,-.22],[.23,-.22],[.3,-.17],[.6,-.12],[1.42,-.06],[1.68,-.025],[1.7,.02],[1.7,.11],[1.59,.15],[1.3,.19],[.68,.25],[.47,.31],[.25,.32],[.25,.36],[0,.36]];
 mesh(saucer,new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(...p)),128),hull);
 for(const [r,y] of [[1.695,.01],[1.696,.1],[1.37,.18],[.65,.255]])ring(saucer,r,.007,trim,[0,y,0],true);
 cylinder(saucer,.21,.3,.12,hull,[0,.39,0]);ellipsoid(saucer,.18,hull,[0,.47,0],[1,.4,1]);
 ellipsoid(saucer,.23,blue,[0,-.215,0],[1,.23,1]);
 const rim=[];
 for(let i=0;i<100;i++){if(i%12>8)continue;const angle=i*Math.PI*2/100;rim.push({position:[Math.sin(angle)*1.704,.055,Math.cos(angle)*1.704],angle})}
 windows(saucer,rim);
 for(const x of [-1,1])ellipsoid(saucer,.027,x<0?red:blue,[x*1.66,.15,0],[1,1,1]);
 // Fine radial panel seams, impulse vents and a lower sensor assembly.
 const seamMaterial=new THREE.LineBasicMaterial({color:'#89949f',transparent:true,opacity:.42});
 const seams=[];
 for(let i=0;i<48;i++){
  const a=i*Math.PI/24,point=(r,y)=>new THREE.Vector3(Math.sin(a)*r,y,Math.cos(a)*r);
  seams.push(point(.72,.248),point(1.3,.192),point(1.3,.192),point(1.48,.167));
 }
 saucer.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seams),seamMaterial));
 for(const x of [-.24,.24]){mesh(saucer,new THREE.BoxGeometry(.38,.08,.09),dark,[x,.12,1.62]);mesh(saucer,new THREE.BoxGeometry(.3,.035,.012),red,[x,.12,1.67])}
 beam(ship,[0,-.24,.65],[0,.57,-.45],.22,.62,hull);

 const engineering=group('Secondary hull · engineering');engineering.position.set(0,-.36,1.12);
 cylinder(engineering,.43,.34,2.3,hull,[0,0,0],true);
 ellipsoid(engineering,.43,hull,[0,0,-1.12],[1,1,.65]);ellipsoid(engineering,.35,hull,[0,0,1.12],[1,1,.63]);
 for(const z of [-.9,.8])ring(engineering,z<0?.432:.358,.013,trim,[0,0,z]);
 // Forward copper deflector dish, rim, feed spike, and aft shuttle bay.
 const deflector=group('Navigational deflector');deflector.position.set(0,-.36,-.36);
 ellipsoid(deflector,.35,copper,[0,0,0],[1,1,.18]);ring(deflector,.35,.035,trim,[0,0,.01]);
 for(const radius of [.12,.22,.29])ring(deflector,radius,.006,copper,[0,0,-.07]);
 cylinder(deflector,.018,.037,.3,copper,[0,0,-.18],true);
 ellipsoid(engineering,.28,dark,[0,0,1.39],[1,.8,.1]);
 for(let i=-3;i<=3;i++)mesh(engineering,new THREE.BoxGeometry(.45,.015,.014),trim,[0,i*.055,1.416]);
 windows(engineering,[-1,1].flatMap(side=>Array.from({length:12},(_,i)=>({position:[side*.397,.11,-.8+i*.13],angle:side*Math.PI/2}))));

 for(const side of [-1,1]){
  beam(ship,[side*.24,-.23,1.64],[side*1.35,.9,1.96],.12,.68,hull);
  const nacelle=group(side<0?'Port warp nacelle':'Starboard warp nacelle');nacelle.position.set(side*1.36,.97,1.8);
  cylinder(nacelle,.255,.22,3.5,hull,[0,0,0],true);
  for(const z of [-1.69,1.55])ring(nacelle,z<0?.254:.226,.02,trim,[0,0,z]);
  ellipsoid(nacelle,.248,red,[0,0,-1.78],[1,1,.65]);
  for(let i=0;i<12;i++){const a=i*Math.PI/6;beam(nacelle,[Math.sin(a)*.12,Math.cos(a)*.12,-1.933],[Math.sin(a)*.22,Math.cos(a)*.22,-1.85],.01,.01,copper)}
  ellipsoid(nacelle,.218,trim,[0,0,1.77],[1,1,.5]);
  ellipsoid(nacelle,.155,blue,[0,0,1.88],[1,1,.12]);
  mesh(nacelle,new THREE.BoxGeometry(.028,.095,2.25),dark,[-side*.248,0,.03]);
  mesh(nacelle,new THREE.BoxGeometry(.031,.035,2.15),blue,[-side*.25,.015,.02]);
  for(let i=0;i<18;i++)mesh(nacelle,new THREE.BoxGeometry(.02,.12,.014),trim,[side*.241,0,-1.05+i*.13]);
 }

 // Only made when the easter egg is invoked; text remains crisp when approached.
 if(typeof document!=='undefined'){
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
  const ctx=canvas.getContext('2d');
  if(ctx){
   ctx.fillStyle='#24303a';ctx.textAlign='center';ctx.font='500 53px sans-serif';ctx.fillText('U.S.S. ENTERPRISE',512,80);
   ctx.font='bold 115px sans-serif';ctx.fillText('NCC-1701',512,220);
   ctx.fillStyle='#a74635';ctx.fillRect(115,300,300,9);ctx.fillRect(609,300,300,9);
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
   const markings=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
   const decal=mesh(saucer,new THREE.PlaneGeometry(1.65,.75),markings,[0,.267,-.79]);decal.rotation.x=-Math.PI/2;decal.castShadow=false;
  }
 }
 // A unit maximum extent lets the caller size it to the current camera scale.
 const box=new THREE.Box3().setFromObject(ship),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3());
 for(const child of ship.children)child.position.sub(center);
 const root=new THREE.Group();root.name=ship.name;ship.scale.setScalar(1/Math.max(size.x,size.y,size.z));root.add(ship);
 root.userData.dispose=()=>{
  const geometry=new Set(),materials=new Set(),textures=new Set();
  root.traverse(node=>{if(node.geometry)geometry.add(node.geometry);if(node.isInstancedMesh)node.dispose();for(const mat of Array.isArray(node.material)?node.material:node.material?[node.material]:[])materials.add(mat)});
  for(const mat of materials){for(const value of Object.values(mat))if(value?.isTexture)textures.add(value);mat.dispose()}
  for(const value of geometry)value.dispose();for(const value of textures)value.dispose();
 };
 return root;
}
