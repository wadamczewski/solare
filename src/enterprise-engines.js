import {AdditiveBlending,BufferAttribute,BufferGeometry,Color,DataTexture,DynamicDrawUsage,Group,LinearFilter,Mesh,RGBAFormat,ShaderMaterial,Sprite,SpriteMaterial,Vector3} from 'three';

// Anchors measured on the normalized Sketchfab model: +Y up, nose toward -Z.
// Two nacelles and the two impulse ports at the back of the saucer.
export const ENTERPRISE_ENGINES=Object.freeze([
 {position:[-.098,.055,.502],radius:.011,color:0x65baff},
 {position:[.098,.055,.502],radius:.011,color:0x65baff},
 {position:[-.018,.037,-.049],radius:.005,color:0xff7050},
 {position:[.018,.037,-.049],radius:.005,color:0xff7050}
]);
export const TRAIL_LIFETIME=2.4;
const SAMPLES=128,INTERVAL=1/45;

function glowTexture(){
 const size=32,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const r=Math.hypot((x+.5)/size*2-1,(y+.5)/size*2-1),i=(y*size+x)*4;
  data[i]=data[i+1]=data[i+2]=255;data[i+3]=Math.round(255*Math.max(0,Math.exp(-r*r*7)-Math.exp(-7)));
 }
 const texture=new DataTexture(data,size,size,RGBAFormat);texture.magFilter=LinearFilter;texture.minFilter=LinearFilter;texture.needsUpdate=true;return texture;
}

export function createEnterpriseEngines({scene,ship}){
 const glowRoot=new Group();glowRoot.name='Enterprise engine glow';ship.add(glowRoot);
 const texture=glowTexture();
 const engines=ENTERPRISE_ENGINES.map(def=>{
  const material=new SpriteMaterial({map:texture,color:def.color,blending:AdditiveBlending,depthWrite:false,toneMapped:false});
  const sprite=new Sprite(material);sprite.position.fromArray(def.position);sprite.visible=false;glowRoot.add(sprite);
  return {def,sprite,base:new Color(def.color),anchor:new Vector3(...def.position),previous:new Vector3(),current:new Vector3()};
 });
 const maxVertices=engines.length*SAMPLES*6,positions=new Float32Array(maxVertices*3),colors=new Float32Array(maxVertices*3),uvs=new Float32Array(maxVertices*2),strengths=new Float32Array(maxVertices);
 const geometry=new BufferGeometry();
 for(const [name,array,size] of [['position',positions,3],['color',colors,3],['uv',uvs,2],['strength',strengths,1]])geometry.setAttribute(name,new BufferAttribute(array,size).setUsage(DynamicDrawUsage));
 const material=new ShaderMaterial({transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false,
  vertexShader:`attribute vec3 color; attribute float strength; varying vec3 vColor; varying vec2 vUv; varying float vStrength;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){vColor=color;vUv=uv;vStrength=strength;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);
#include <logdepthbuf_vertex>
}`,
  fragmentShader:`varying vec3 vColor; varying vec2 vUv; varying float vStrength;
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
float edge=exp(-pow((vUv.x-.5)*3.8,2.0));gl_FragColor=vec4(vColor*1.8,edge*vStrength*.58);
}`});
 const trail=new Mesh(geometry,material);trail.name='Enterprise fading engine trails';trail.frustumCulled=false;trail.visible=false;scene.add(trail);
 // Double-precision history remains fixed in world space. GPU vertices are
 // relative to the current ship origin to avoid jitter at astronomical scales.
 const history=engines.map(()=>({points:new Float64Array(SAMPLES*3),times:new Float64Array(SAMPLES),powers:new Float32Array(SAMPLES)}));
 let clock=0,lastEmission=0,head=0,count=0,power=0,disposed=false,first=true;
 const previousShip=new Vector3(),side=new Vector3(),direction=new Vector3(),view=new Vector3(),a=new Vector3(),b=new Vector3(),point=new Vector3(),worldScale=new Vector3();
 function store(t,alpha){
  head=(head+1)%SAMPLES;count=Math.min(count+1,SAMPLES);
  for(let e=0;e<engines.length;e++){
   point.lerpVectors(engines[e].previous,engines[e].current,alpha);history[e].points[head*3]=point.x;history[e].points[head*3+1]=point.y;history[e].points[head*3+2]=point.z;history[e].times[head]=t;history[e].powers[head]=power;
  }
 }
 function vertex(p,s,width,color,alpha,u,v){
  positions[v*3]=p.x-trail.position.x+s.x*width;positions[v*3+1]=p.y-trail.position.y+s.y*width;positions[v*3+2]=p.z-trail.position.z+s.z*width;
  colors[v*3]=color.r;colors[v*3+1]=color.g;colors[v*3+2]=color.b;strengths[v]=alpha;uvs[v*2]=u;uvs[v*2+1]=0;
 }
 return {
  get state(){return {power,samples:count,visible:trail.visible}},
  update(dt,speed,cruiseSpeed,camera){
   if(disposed)return;dt=Math.max(0,Math.min(dt||0,.05));clock+=dt;
   const ratio=speed/Math.max(cruiseSpeed,1e-12),target=speed>cruiseSpeed*.003?Math.min(1,ratio/4):0;
   power+=(target-power)*(1-Math.exp(-dt*(target>power?7:9)));if(power<.0001&&target===0)power=0;
   ship.updateWorldMatrix(true,false);ship.getWorldScale(worldScale);const scale=worldScale.x;
   for(const engine of engines){
    engine.current.copy(engine.anchor).applyMatrix4(ship.matrixWorld);
    if(first)engine.previous.copy(engine.current);
    engine.sprite.visible=power>.0001;engine.sprite.material.opacity=Math.min(1,Math.sqrt(power)*1.4);
    engine.sprite.material.color.copy(engine.base).multiplyScalar(1+power*8);
    engine.sprite.scale.setScalar(engine.def.radius*(5+7*power)*(1+.025*Math.sin(clock*17)));
   }
   // A stopped ship emits no new trail samples, even while its lamps fade out.
   if(speed>cruiseSpeed*.003){
    if(first||previousShip.distanceTo(ship.position)>Math.max(scale*100,speed*.25))count=0;
    if(!count){lastEmission=clock;store(clock,1)}
    while(clock-lastEmission>=INTERVAL){lastEmission+=INTERVAL;store(lastEmission,dt?Math.max(0,1-(clock-lastEmission)/dt):1)}
   }else lastEmission=clock;
   while(count&&clock-history[0].times[(head-count+1+SAMPLES)%SAMPLES]>TRAIL_LIFETIME)count--;
   trail.position.copy(ship.position);let v=0;
   for(let e=0;e<engines.length;e++){
    const h=history[e],engine=engines[e];
    for(let j=speed>cruiseSpeed*.003?-1:0;j<count-1;j++){
     const live=j<0,ia=(head-j+SAMPLES)%SAMPLES,ib=live?head:(head-j-1+SAMPLES)%SAMPLES;
     if(live)a.copy(engine.current);else a.fromArray(h.points,ia*3);
     b.fromArray(h.points,ib*3);direction.subVectors(a,b);
     if(direction.lengthSq()<1e-30)continue;
     view.subVectors(camera.position,a);side.crossVectors(direction,view);
     if(side.lengthSq()<1e-30)side.setFromMatrixColumn(camera.matrixWorld,0);side.normalize();
     const ageA=live?0:(clock-h.times[ia])/TRAIL_LIFETIME,ageB=(clock-h.times[ib])/TRAIL_LIFETIME;
     const alphaA=Math.max(0,1-ageA)**2*Math.sqrt(live?power:h.powers[ia]),alphaB=Math.max(0,1-ageB)**2*Math.sqrt(h.powers[ib]);
     const widthA=scale*engine.def.radius*(.65+ageA*2),widthB=scale*engine.def.radius*(.65+ageB*2);
     vertex(a,side,-widthA,engine.base,alphaA,0,v++);vertex(b,side,-widthB,engine.base,alphaB,0,v++);vertex(a,side,widthA,engine.base,alphaA,1,v++);
     vertex(a,side,widthA,engine.base,alphaA,1,v++);vertex(b,side,-widthB,engine.base,alphaB,0,v++);vertex(b,side,widthB,engine.base,alphaB,1,v++);
    }
   }
   geometry.setDrawRange(0,v);trail.visible=v>0;
   if(v)for(const attribute of Object.values(geometry.attributes))attribute.needsUpdate=true;
   for(const engine of engines)engine.previous.copy(engine.current);previousShip.copy(ship.position);first=false;
  },
  dispose(){if(disposed)return;disposed=true;glowRoot.removeFromParent();trail.removeFromParent();for(const engine of engines)engine.sprite.material.dispose();texture.dispose();geometry.dispose();material.dispose()}
 };
}
