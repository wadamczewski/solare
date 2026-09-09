import * as THREE from 'three';

const MAX_BLACK_HOLES=4;
export function blackHoleScreenRadius(radius,distance,fovDegrees){
 return THREE.MathUtils.clamp(radius/Math.max(distance,.00001)/(2*Math.tan(fovDegrees*Math.PI/360)),0,.18);
}
export function createBlackHoleLensingPass(ShaderPass){
 const centers=Array.from({length:MAX_BLACK_HOLES},()=>new THREE.Vector2(-10,-10));
 const shader={uniforms:{tDiffuse:{value:null},centers:{value:centers},radii:{value:new Float32Array(MAX_BLACK_HOLES)}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:`uniform sampler2D tDiffuse;uniform vec2 centers[${MAX_BLACK_HOLES}];uniform float radii[${MAX_BLACK_HOLES}];varying vec2 vUv;
 void main(){vec2 uv=vUv;vec3 color=vec3(0.);for(int i=0;i<${MAX_BLACK_HOLES};i++){float r=radii[i];vec2 d=uv-centers[i];float l=length(d);if(r>0.){float safeL=max(l,.00001);if(l>r*1.45&&l<r*5.2){float x=l/r;float falloff=pow(clamp(1.-x/5.2,0.,1.),2.2);uv-=d/safeL*falloff*r*(.94/(.42+x*.33));}}}color=texture2D(tDiffuse,uv).rgb;for(int i=0;i<${MAX_BLACK_HOLES};i++){float r=radii[i];float l=length(vUv-centers[i]);if(r>0.){float shadow=1.-smoothstep(r*1.36,r*1.58,l);color*=1.-shadow;}}gl_FragColor=vec4(color,1.);}`};
 return new ShaderPass(shader);
}
export function updateBlackHoleLensing(pass,bodies,views,camera,radiusOf){
 const radii=pass.uniforms.radii.value,centers=pass.uniforms.centers.value;let index=0;
 for(const body of bodies)if(body.key==='blackhole'&&index<MAX_BLACK_HOLES){const view=views.get(body.id),point=view.group.position.clone(),distance=camera.position.distanceTo(point);point.project(camera);centers[index].set(point.x*.5+.5,point.y*.5+.5);radii[index++]=point.z>-1&&point.z<1?blackHoleScreenRadius(radiusOf(body),distance,camera.fov):0;}
 for(;index<MAX_BLACK_HOLES;index++){centers[index].set(-10,-10);radii[index]=0;}
}
