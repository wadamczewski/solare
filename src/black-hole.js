import * as THREE from 'three';

const ADDITIVE={transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false};

function lensedDiskMaterial(){
 return new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,toneMapped:false,
  uniforms:{time:{value:0},fuel:{value:0}},
  vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:`varying vec2 vUv;uniform float time;uniform float fuel;
   float band(float r,float lo,float hi,float feather){return smoothstep(lo,lo+feather,r)*(1.-smoothstep(hi-feather,hi,r));}
   void main(){
    vec2 p=vUv*2.-1.; vec2 circle=vec2(p.x*1.65,p.y); float r=length(circle);
    float flicker=.82+.18*sin(p.x*95.+p.y*41.-time*5.)+.08*sin(p.x*227.-time*2.);
    float directR=length(vec2(p.x,(p.y+.012)/.118));
    float direct=band(directR,.39,1.05,.035)*(1.-smoothstep(.56,.67,r));
    float upperR=length(vec2(p.x,(p.y-.185)/.465));
    float lowerR=length(vec2(p.x,(p.y+.185)/.465));
    float upper=band(upperR,.58,1.03,.024)*smoothstep(.015,.12,p.y);
    float lower=band(lowerR,.58,1.03,.024)*(1.-smoothstep(-.015,.12,p.y));
    float lens=(upper+lower*.72)*(1.-smoothstep(.54,.68,r));
    float approaching=pow(clamp(.52-.72*p.x,0.,1.),2.2);
    float heat=clamp(1.-abs(p.x)*.72,0.,1.);
    vec3 outer=vec3(.22,.003,.001), ember=vec3(.95,.055,.004), whiteHot=vec3(1.,.62,.18);
    vec3 diskColor=mix(outer,ember,heat);diskColor=mix(diskColor,whiteHot,approaching*.72);
    vec3 lensedColor=mix(vec3(.30,.006,.001),vec3(1.,.22,.015),heat)*(.55+.75*approaching);
    float photon=band(r,.605,.622,.004);
    float shadow=1.-smoothstep(.582,.613,r);
    float diskAlpha=(direct*(.70+.25*fuel)+lens*(.52+.30*fuel))*flicker;
    vec3 color=diskColor*direct*(.72+.46*fuel)*flicker+lensedColor*lens*(.64+.42*fuel)*flicker+vec3(1.,.72,.38)*photon*.64;
    color=mix(color,vec3(0.),shadow);
    float alpha=max(diskAlpha+photon*.72,shadow);
    gl_FragColor=vec4(color,alpha);
   }`
 });
}

function glowMaterial(color,opacity){return new THREE.MeshBasicMaterial({...ADDITIVE,color,opacity,side:THREE.DoubleSide});}

export function createBlackHoleVisual(){
 const group=new THREE.Group(),material=lensedDiskMaterial();
 const lensedImage=new THREE.Mesh(new THREE.PlaneGeometry(8.6,5.2),material);
 lensedImage.name='lensed-far-disk';lensedImage.renderOrder=2;group.add(lensedImage);
 const photonRings=new THREE.Group();photonRings.name='photon-rings';group.add(photonRings);
 const shadow=lensedImage;shadow.name='black-hole-shadow';
 const jets=new THREE.Group();
 for(const sign of [-1,1]){const jet=new THREE.Mesh(new THREE.CylinderGeometry(.035,.24,5.5,20,1,true),glowMaterial('#9dd8ff',.7));jet.position.y=sign*3.6;jet.userData.sign=sign;jets.add(jet);}
 jets.visible=false;group.add(jets);
 const cameraQuaternion=new THREE.Quaternion(),parentQuaternion=new THREE.Quaternion();
 return {group,material,jets,shadow,photonRings,lensedArcs:new THREE.Group(),
  update(time,accretion=0,jetActive=false,camera){
   material.uniforms.time.value=time;material.uniforms.fuel.value=accretion;
   jets.visible=jetActive&&accretion>.08;
   jets.children.forEach(jet=>{jet.material.opacity=.20+.60*accretion;jet.scale.setScalar(.7+accretion*.8);});
   if(camera){camera.getWorldQuaternion(cameraQuaternion);group.parent?.getWorldQuaternion(parentQuaternion);parentQuaternion.invert();lensedImage.quaternion.copy(parentQuaternion.multiply(cameraQuaternion));}
  }
 };
}

export function accretionStateFor(absorber,absorbed){
 const gas=absorbed.gas||['sun','jupiter','saturn','uranus','neptune'].includes(absorbed.key);
 const fuel=Math.min(1,.34+(gas?.46:.16)+Math.log10(1+absorbed.mass/Math.max(absorber.mass,1e-30))*2);
 return {fuel:Math.max(.12,fuel),jets:gas&&absorber.mass>=1e5&&Math.abs(absorber.spin)<=48,age:0};
}
