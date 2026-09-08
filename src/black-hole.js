import * as THREE from 'three';

const diskMaterial=()=>new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,toneMapped:false,
 uniforms:{time:{value:0},fuel:{value:0}},
 vertexShader:'varying vec2 diskUv;void main(){diskUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:`varying vec2 diskUv;uniform float time;uniform float fuel;
 void main(){float radial=diskUv.y;float bands=.58+.42*sin(radial*92.-time*4.+sin(diskUv.x*30.)*2.);float core=pow(1.-radial,.38);float edge=smoothstep(0.,.08,radial)*smoothstep(1.,.84,radial);vec3 hot=mix(vec3(.42,.025,.006),vec3(1.,.76,.4),core);float beam=.58+.42*sin(diskUv.x*6.2831853-time*.35);gl_FragColor=vec4(hot*(.55+bands*.85+fuel*.9)*beam,edge*(.56+.34*fuel));}`
});

export function createBlackHoleVisual(){
 const group=new THREE.Group(),material=diskMaterial();
 const top=new THREE.Mesh(new THREE.RingGeometry(1.28,3.25,192,8),material),bottom=top.clone();
 top.rotation.x=-Math.PI/2;bottom.rotation.x=-Math.PI/2;top.position.y=.09;bottom.position.y=-.09;group.add(top,bottom);
 const inner=new THREE.Mesh(new THREE.TorusGeometry(1.29,.09,8,192),new THREE.MeshBasicMaterial({color:'#ffba76',transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));inner.rotation.x=Math.PI/2;group.add(inner);
 const outer=new THREE.Mesh(new THREE.TorusGeometry(3.24,.09,8,192),new THREE.MeshBasicMaterial({color:'#7c1b06',transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));outer.rotation.x=Math.PI/2;group.add(outer);
 const photonRing=new THREE.Mesh(new THREE.TorusGeometry(1.08,.025,8,192),new THREE.MeshBasicMaterial({color:'#fff1d8',transparent:true,opacity:.9,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));photonRing.rotation.x=Math.PI/2;group.add(photonRing);
 const jets=new THREE.Group();for(const sign of [-1,1]){const jet=new THREE.Mesh(new THREE.CylinderGeometry(.05,.28,6,20,1,true),new THREE.MeshBasicMaterial({color:'#9dd8ff',transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));jet.position.y=sign*4;jet.userData.sign=sign;jets.add(jet)}jets.visible=false;group.add(jets);
 return {group,material,jets,photonRing,update(time,accretion=0,jetActive=false){material.uniforms.time.value=time;material.uniforms.fuel.value=accretion;jets.visible=jetActive&&accretion>.08;jets.children.forEach(jet=>{jet.material.opacity=.25+.55*accretion;jet.scale.setScalar(.7+accretion*.8)});photonRing.material.opacity=.55+.4*accretion;}};
}

export function accretionStateFor(absorber,absorbed){
 const gas=absorbed.gas||['sun','jupiter','saturn','uranus','neptune'].includes(absorbed.key);
 const fuel=Math.min(1,.34+(gas?.46:.16)+Math.log10(1+absorbed.mass/Math.max(absorber.mass,1e-30))*2);
 return {fuel:Math.max(.12,fuel),jets:gas&&absorber.mass>=1e5&&Math.abs(absorber.spin)<=48,age:0};
}
