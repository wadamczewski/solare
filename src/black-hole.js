import * as THREE from 'three';

const ADDITIVE={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false};

function diskMaterial(){
 return new THREE.ShaderMaterial({...ADDITIVE,side:THREE.DoubleSide,
  uniforms:{time:{value:0},fuel:{value:0}},
  vertexShader:'varying vec2 diskPoint;void main(){diskPoint=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 diskPoint;uniform float time;uniform float fuel;
   float grain(vec2 p){return fract(sin(dot(p,vec2(91.7,47.3)))*43758.54);}
   void main(){
    float r=length(diskPoint),a=atan(diskPoint.y,diskPoint.x);
    float inner=smoothstep(1.20,1.34,r),outer=1.-smoothstep(3.40,3.84,r);
    float heat=pow(clamp(1.-(r-1.2)/2.64,0.,1.),.52);
    float strands=.62+.38*sin(r*92.-time*(4.+8.*heat)+a*(7.+18.*heat)+sin(a*7.-time)*2.);
    strands+=.12*grain(floor(vec2(r*38.,a*41.)));
    float toward=pow(clamp(.5+.5*cos(a+.5),0.,1.),2.7);
    vec3 red=vec3(.36,.006,.001),orange=vec3(1.,.075,.004),hot=vec3(1.,.72,.27);
    vec3 color=mix(red,orange,smoothstep(.05,.66,heat));color=mix(color,hot,pow(heat,2.8));
    float energy=(.42+.58*strands)*(.72+.28*fuel)*(.38+1.65*toward);
    float alpha=inner*outer*(.66+.22*fuel)*(.65+.35*strands);
    gl_FragColor=vec4(color*energy,alpha);
   }`
 });
}

function glowMaterial(color,opacity){return new THREE.MeshBasicMaterial({...ADDITIVE,color,opacity,side:THREE.DoubleSide});}

export function createBlackHoleVisual(){
 const group=new THREE.Group(),material=diskMaterial(),geometry=new THREE.RingGeometry(1.20,3.84,256,12);
 // Physical top and underside of a thin, luminous accretion disk.
 const upperDisk=new THREE.Mesh(geometry,material),lowerDisk=new THREE.Mesh(geometry,material.clone());
 upperDisk.rotation.x=-Math.PI/2;lowerDisk.rotation.x=-Math.PI/2;
 upperDisk.position.y=.105;lowerDisk.position.y=-.105;upperDisk.renderOrder=1;lowerDisk.renderOrder=1;group.add(upperDisk,lowerDisk);

 const shadow=new THREE.Mesh(new THREE.SphereGeometry(1.18,48,32),new THREE.MeshBasicMaterial({color:'#000000',depthWrite:true,depthTest:true}));
 shadow.name='black-hole-shadow';shadow.renderOrder=2;group.add(shadow);

 const photonRings=new THREE.Group();photonRings.name='photon-rings';
 [[1.20,.036,.88],[1.28,.016,.42],[1.35,.008,.18]].forEach(([radius,tube,opacity])=>{
  const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,tube,8,192),glowMaterial('#ffe2b2',opacity));ring.rotation.x=Math.PI/2;ring.renderOrder=3;photonRings.add(ring);
 });
 group.add(photonRings);
 const rim=new THREE.Mesh(new THREE.TorusGeometry(3.84,.032,6,192),glowMaterial('#831001',.25));rim.rotation.x=Math.PI/2;rim.renderOrder=1;group.add(rim);

 const lensedArcs=new THREE.Group();lensedArcs.name='lensed-far-disk';group.add(lensedArcs);
 const jets=new THREE.Group();
 for(const sign of [-1,1]){const jet=new THREE.Mesh(new THREE.CylinderGeometry(.035,.24,5.5,20,1,true),glowMaterial('#9dd8ff',.7));jet.position.y=sign*3.6;jet.userData.sign=sign;jets.add(jet);}
 jets.visible=false;group.add(jets);
 return {group,material,jets,shadow,photonRings,lensedArcs,
  update(time,accretion=0,jetActive=false){
   material.uniforms.time.value=time;material.uniforms.fuel.value=accretion;
   lowerDisk.material.uniforms.time.value=time+.18;lowerDisk.material.uniforms.fuel.value=accretion;
   jets.visible=jetActive&&accretion>.08;
   jets.children.forEach(jet=>{jet.material.opacity=.20+.60*accretion;jet.scale.setScalar(.7+accretion*.8);});
   photonRings.children.forEach((ring,index)=>{ring.material.opacity=(.78-index*.25)*(.62+.38*accretion);});
  }
 };
}

export function accretionStateFor(absorber,absorbed){
 const gas=absorbed.gas||['sun','jupiter','saturn','uranus','neptune'].includes(absorbed.key);
 const fuel=Math.min(1,.34+(gas?.46:.16)+Math.log10(1+absorbed.mass/Math.max(absorber.mass,1e-30))*2);
 return {fuel:Math.max(.12,fuel),jets:gas&&absorber.mass>=1e5&&Math.abs(absorber.spin)<=48,age:0};
}
