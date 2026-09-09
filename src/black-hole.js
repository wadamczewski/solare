import * as THREE from 'three';

const ADDITIVE={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false};

function diskMaterial(){
 return new THREE.ShaderMaterial({...ADDITIVE,side:THREE.DoubleSide,
  uniforms:{time:{value:0},fuel:{value:0}},
  vertexShader:'varying vec2 diskPoint;void main(){diskPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 diskPoint;uniform float time;uniform float fuel;
   float hash(vec2 p){return fract(sin(dot(p,vec2(91.7,47.3)))*43758.54);}
   void main(){
    float r=length(diskPoint);float a=atan(diskPoint.y,diskPoint.x);
    float inner=smoothstep(1.62,1.76,r),outer=1.-smoothstep(3.72,4.28,r);
    float core=pow(clamp(1.-(r-1.62)/2.66,0.,1.),.56);
    float sheared=sin(r*78.-time*(3.4+9.*core)+a*(5.+18.*core)+sin(a*9.-time)*2.);
    float filaments=.72+.28*sheared+.10*hash(floor(vec2(r*42.,a*36.)));
    float approach=pow(clamp(.5+.5*cos(a+.74),0.,1.),2.5);
    float doppler=.30+1.80*approach;
    vec3 cold=vec3(.19,.004,.002), ember=vec3(.92,.055,.006), hot=vec3(1.,.72,.28);
    vec3 color=mix(cold,ember,smoothstep(.08,.64,core));color=mix(color,hot,pow(core,2.6));
    float energy=(.26+.74*filaments)*(.60+.40*fuel)*doppler;
    float alpha=inner*outer*(.34+.46*fuel)*(.56+.44*filaments);
    gl_FragColor=vec4(color*energy,alpha);
   }`
 });
}

function glowMaterial(color,opacity){
 return new THREE.MeshBasicMaterial({...ADDITIVE,color,opacity,side:THREE.DoubleSide});
}

function lensedArc(sign){
 const points=[];
 for(let i=0;i<=64;i++){
  const t=i/64*Math.PI,x=Math.cos(t)*3.4;
  points.push(new THREE.Vector3(x,sign*(.18+1.02*Math.sin(t)),.18+.30*Math.sin(t)));
 }
 const arc=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),64,.072,6,false),glowMaterial('#ff7b18',.34));
 arc.userData.lensed=true;
 return arc;
}

export function createBlackHoleVisual(){
 const group=new THREE.Group(),material=diskMaterial(),diskGeometry=new THREE.RingGeometry(1.62,4.28,192,10);
 const upperDisk=new THREE.Mesh(diskGeometry,material),lowerDisk=new THREE.Mesh(diskGeometry,material.clone());
 upperDisk.rotation.x=-Math.PI/2;lowerDisk.rotation.x=-Math.PI/2;
 upperDisk.position.y=.055;lowerDisk.position.y=-.055;group.add(upperDisk,lowerDisk);

 const shadow=new THREE.Mesh(new THREE.SphereGeometry(1.57,48,32),new THREE.MeshBasicMaterial({color:'#000000',depthWrite:true,depthTest:true}));
 shadow.name='black-hole-shadow';group.add(shadow);

 const photonRings=new THREE.Group();
 [[1.60,.045,.92],[1.70,.020,.54],[1.79,.010,.22]].forEach(([radius,tube,opacity])=>{
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,192),glowMaterial('#fff4df',opacity));
  ring.rotation.x=Math.PI/2;photonRings.add(ring);
 });
 photonRings.name='photon-rings';group.add(photonRings);

 const rim=new THREE.Mesh(new THREE.TorusGeometry(4.25,.045,6,192),glowMaterial('#7d1003',.24));rim.rotation.x=Math.PI/2;group.add(rim);
 const lensedArcs=new THREE.Group();lensedArcs.name='lensed-far-disk';lensedArcs.add(lensedArc(1),lensedArc(-1));group.add(lensedArcs);

 const jets=new THREE.Group();
 for(const sign of [-1,1]){const jet=new THREE.Mesh(new THREE.CylinderGeometry(.04,.28,6,20,1,true),glowMaterial('#9dd8ff',.7));jet.position.y=sign*4;jet.userData.sign=sign;jets.add(jet);}
 jets.visible=false;group.add(jets);

 return {group,material,jets,shadow,photonRings,lensedArcs,
  update(time,accretion=0,jetActive=false){
   material.uniforms.time.value=time;material.uniforms.fuel.value=accretion;
   lowerDisk.material.uniforms.time.value=time+.18;lowerDisk.material.uniforms.fuel.value=accretion;
   jets.visible=jetActive&&accretion>.08;
   jets.children.forEach(jet=>{jet.material.opacity=.20+.60*accretion;jet.scale.setScalar(.7+accretion*.8)});
   photonRings.children.forEach((ring,index)=>{ring.material.opacity=(.82-index*.26)*(.62+.38*accretion);});
   lensedArcs.children.forEach((arc,index)=>{arc.material.opacity=(.26+.36*accretion)*(index?.78:1);arc.scale.setScalar(.96+.06*Math.sin(time*1.6+index));});
  }
 };
}

export function accretionStateFor(absorber,absorbed){
 const gas=absorbed.gas||['sun','jupiter','saturn','uranus','neptune'].includes(absorbed.key);
 const fuel=Math.min(1,.34+(gas?.46:.16)+Math.log10(1+absorbed.mass/Math.max(absorber.mass,1e-30))*2);
 return {fuel:Math.max(.12,fuel),jets:gas&&absorber.mass>=1e5&&Math.abs(absorber.spin)<=48,age:0};
}
