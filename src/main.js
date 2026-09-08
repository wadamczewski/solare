import {moonAppearance,loadMoonMaps,applyMoonAppearance} from './moon-appearance.js';
import {createSolarInterior,solarInteriorState} from './solar-interior.js';
import {applySolarSurface,setSunspotVisibility} from './solar-surface.js';
import {installLanguageUI,getLanguage,getLocale,translate,formatNumber} from './i18n.js';
import {makeOpaqueSurface} from './opaque-surface.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {updateSurfaceImpact} from './surface-impact.js';
import {naturalColorMaterial} from './natural-color.js';
import {applyImpactDamage} from './impact-damage.js';
import {createNavigation} from './navigation.js';
import {captureCollisionView,viewContact} from './collision-view.js';
import {catalog,createCatalogBody,horizonRadius,validDimensions} from './catalog.js';
import {searchBodies,bodyKind} from './body-search.js';
import {constellationLabel,createSky} from './sky.js';
import {cometNucleusGeometry,createCometTails} from './comet.js';
import {fastStepSize,splitStep} from './fast-step.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {G,AU,SOLAR_MASS,planets,initialSystem,body,relativeVelocity,step,stableStep,velocityKmPerSecond} from './physics.js';
import './style.css';
import {LightFlight,lightTravelSeconds,flightRouteProgress,flightRouteStopPosition} from './light-flight.js';
import {surfaceTemperatures} from './solar-thermal.js';
import {resolveCollisions} from './collisions.js';
import {changeSimulationRate} from './simulation-rate.js';
import {createBodyPreview} from './preview.js';
import {createImpactEffects} from './impact-effects.js';
const mount=document.querySelector('#universe'),panel=document.querySelector('#panel'),tip=document.querySelector('#tooltip');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false,logarithmicDepthBuffer:true});renderer.setClearColor('#000000');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Mapa 3D. Przeciągnij, aby obrócić. Kółko: zoom. WASD: ruch. Q/E: dół/góra. Shift: szybciej. Prawy przycisk i mysz: rozglądanie. Shift i lewy przycisk: przesuwanie. Kliknij ciało lub przestrzeń. Spacja: pauza. Escape: zamknij.');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.0000001,2000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.00001;controls.maxDistance=260;controls.zoomToCursor=true;controls.enablePan=true;controls.panSpeed=.7;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const SOLAR_BLOOM_STRENGTH=.65,SOLAR_LIGHT_INTENSITY=Math.PI;const solarBloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),SOLAR_BLOOM_STRENGTH,.45,2);composer.addPass(solarBloom);composer.addPass(new OutputPass());
const home=new THREE.Vector3(0,31,43).multiplyScalar(Math.max(1,1.15/(innerWidth/innerHeight)));camera.position.copy(home);controls.target.set(0,0,0);controls.update();scene.add(new THREE.AmbientLight('#ffffff',.035));const sunlight=new THREE.PointLight('#ffffff',SOLAR_LIGHT_INTENSITY,0,0);scene.add(sunlight);
const preview=createBodyPreview(),impactEffects=createImpactEffects(scene),solarInterior=createSolarInterior();
const interiorHud=document.createElement('aside');interiorHud.id='solar-interior';interiorHud.hidden=true;interiorHud.innerHTML='<span>Model wnętrza Słońca</span><strong id=interior-zone></strong><div id=interior-values></div><p>Przekrój edukacyjny. Plazma jest nieprzezroczysta; rzeczywiste fotony rozpraszają się zamiast lecieć prostą.</p>';document.body.append(interiorHud);
const sky=createSky(renderer.getPixelRatio());scene.add(sky.group);
sky.load().then(info=>{skyInfo=info;sky.setConstellations(showConstellations)}).catch(error=>{skyInfo={error:error.message};console.warn('Nie udało się wczytać mapy nieba:',error.message)});
const cometTails=createCometTails(scene);cometTails.setPixelRatio(renderer.getPixelRatio());
let skyInfo=null,showConstellations=false;
let epoch=new Date(),bs=initialSystem(epoch),views=new Map(),selected=null,follow=null,paused=false,speed=2,elapsed=0,compressed=true,lastOrbit=0,spawnAt=new THREE.Vector3(),restoreFocus=null;
let lightFlight=null,flightPrevious=null,flightStops=[],flightTrueScale=false,solarBrightness=100;
const flightLabels=document.createElement("div");flightLabels.id="flight-labels";document.body.append(flightLabels);
const flightHud=document.createElement('div');flightHud.id='light-flight';flightHud.hidden=true;document.body.append(flightHud);
const flightRail=document.createElement('nav');flightRail.id='flight-rail';flightRail.hidden=true;flightRail.setAttribute('aria-label','Postęp lotu przez planety');document.body.append(flightRail);
const timeDock=document.createElement('nav');timeDock.id='time-dock';timeDock.setAttribute('aria-label','Sterowanie czasem i lotem');
timeDock.innerHTML=`<button id="dock-pause" aria-label="Wstrzymaj symulację"><span id="dock-pause-icon">Ⅱ</span><span id="dock-pause-label">Pauza</span></button><div class="dock-divider"></div><label for="dock-speed">Tempo</label><select id="dock-speed" aria-label="Tempo symulacji"><option value="realtime" hidden>1 : 1</option>${[.02,.1,.5,2,10,50,100,200,365].map(s=>`<option value="${s}" ${s===2?'selected':''}>${s} dni / s</option>`).join('')}</select><label class="dock-scale" id="dock-scale-label"><input id="dock-scale" type="checkbox"> Rzeczywista skala</label><div class="dock-divider"></div><button id="dock-flight"><span class="dock-c">c</span><span id="dock-flight-label">Lot światła</span></button>`;
document.body.append(timeDock);
const solarControl=document.createElement('aside');solarControl.id='solar-control';solarControl.setAttribute('aria-label','Regulacja jasności Słońca');solarControl.innerHTML='<label for="solar-brightness"><span>Jasność Słońca</span><output id="solar-brightness-value">100%</output></label><input id="solar-brightness" type="range" min="5" max="100" step="1" value="100" aria-label="Jasność Słońca">';document.body.append(solarControl);
const solarBrightnessInput=document.querySelector('#solar-brightness'),solarBrightnessValue=document.querySelector('#solar-brightness-value');
function applySolarBrightness(){
 const scale=solarBrightness/100;
 sunlight.intensity=SOLAR_LIGHT_INTENSITY*scale;
 solarBloom.strength=SOLAR_BLOOM_STRENGTH*(.08+.92*Math.sqrt(scale));
 const sun=bs.find(body=>body.key==='sun'),sunView=sun&&views.get(sun.id);
 if(sunView?.mesh.material?.color){sunView.mesh.material.color.setRGB(24*scale,24*scale,24*scale);setSunspotVisibility(sunView.mesh.material,solarBrightness)}
 solarBrightnessInput.value=String(solarBrightness);solarBrightnessValue.value=`${solarBrightness}%`;solarBrightnessValue.textContent=`${solarBrightness}%`;
 updateTemperatureReadout();
}
solarBrightnessInput.oninput=event=>{solarBrightness=Math.max(5,Math.min(100,Number(event.target.value)||100));applySolarBrightness()};
// Simulated instant: the epoch the system was built for, advanced by `elapsed`.
const clock=document.createElement('div');clock.id='sim-clock';clock.setAttribute('role','status');clock.setAttribute('aria-live','off');
clock.innerHTML='<span id="sim-date"></span><span class="clock-dash">-</span><span id="sim-time"></span><span class="clock-zone">UTC</span>';
document.body.append(clock);
let dateFormat=new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
let timeFormat=new Intl.DateTimeFormat(getLocale(),{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'});
let clockShown='';
function simulatedDate(){return new Date(epoch.getTime()+elapsed*86400000)}
function updateClock(){
 if(lightFlight){clock.hidden=true;return}
 const at=simulatedDate();
 if(!Number.isFinite(at.getTime())){clock.hidden=true;return}
 clock.hidden=false;
 const stamp=dateFormat.format(at)+'|'+timeFormat.format(at);
 if(stamp===clockShown)return;
 clockShown=stamp;
 const [date,time]=stamp.split('|');
 document.querySelector('#sim-date').textContent=date;
 document.querySelector('#sim-time').textContent=time;
}
document.querySelector('#dock-pause').onclick=()=>setPaused(!paused);
function setSimulationSpeed(nextRate){const next=changeSimulationRate(speed,lag,nextRate);speed=next.speed;lag=next.pendingDays;last=performance.now();}
document.querySelector('#dock-speed').onchange=e=>{if(lightFlight)lightFlight.setRate(+e.target.value,performance.now());else setSimulationSpeed(e.target.value)};
document.querySelector('#dock-scale').onchange=e=>{compressed=!e.target.checked;clearTrails();updateOrbits();if(follow){const b=bs.find(b=>b.id===follow);if(b){const offset=camera.position.clone().sub(controls.target);controls.target.copy(displayed(b));camera.position.copy(controls.target).add(offset)}}const scale=document.querySelector('#scale');if(scale)scale.value=compressed?'visual':'real';};
document.querySelector('#dock-flight').onclick=()=>lightFlight?stopLightFlight():startLightFlight();
let dockState='';
function syncTimeDock(){const state=`${paused}:${speed}:${lightFlight?.rate??0}:${compressed}`;if(state===dockState)return;dockState=state;document.querySelector('#dock-scale-label').hidden=!!lightFlight;document.querySelector('#dock-scale').checked=!compressed;const pauseButton=document.querySelector('#dock-pause');pauseButton.setAttribute('aria-label',paused?'Wznów symulację':'Wstrzymaj symulację');pauseButton.setAttribute('aria-pressed',String(paused));document.querySelector('#dock-pause-icon').textContent=paused?'▶':'Ⅱ';document.querySelector('#dock-pause-label').textContent=paused?'Wznów':'Pauza';const select=document.querySelector('#dock-speed');select.disabled=false;const mode=lightFlight?'flight':'normal';if(select.dataset.mode!==mode){select.dataset.mode=mode;select.innerHTML=(lightFlight?[1,10,60,300,1000]:[.02,.1,.5,2,10,50,100,200,365]).map(s=>`<option value="${s}">${s}${lightFlight?' ×':' dni / s'}</option>`).join('')}select.value=String(lightFlight?lightFlight.rate:speed);document.querySelector('#dock-flight-label').textContent=lightFlight?'Zakończ lot':'Lot światła';document.querySelector('#dock-flight').setAttribute('aria-pressed',String(!!lightFlight));timeDock.classList.toggle('in-flight',!!lightFlight);const panelPause=document.querySelector('#pause');if(panelPause)panelPause.textContent=paused?'▶':'Ⅱ';const panelSpeed=document.querySelector('#speed');if(panelSpeed){if(lightFlight)panelSpeed.options[0].textContent=`Lot · ${lightFlight.rate} ×`;else panelSpeed.value=String(speed);}}
const loader=new THREE.TextureLoader(),textures={};const textureManifest={sun:'/textures/sun.jpg',mercury:'/textures/mercury.jpg',venus:'/textures/venus.jpg',earth:'/textures/earth.jpg',mars:'/textures/mars.jpg',jupiter:'/textures/jupiter.jpg',saturn:'/textures/saturn.jpg',uranus:'/textures/uranus.jpg',neptune:'/textures/neptune.jpg',moon:'/textures/moon.jpg','proxima-centauri-b':'/textures/exoplanets/proxima-centauri-b.png','trappist-1-e':'/textures/exoplanets/trappist-1-e.png','51-pegasi-b':'/textures/exoplanets/51-pegasi-b.png','55-cancri-e':'/textures/exoplanets/55-cancri-e.png'};for(const [key,path] of Object.entries(textureManifest)){textures[key]=loader.load(path);textures[key].colorSpace=THREE.SRGBColorSpace;textures[key].anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures[key].wrapS=THREE.RepeatWrapping}
const moonMaps=loadMoonMaps(loader,Math.min(8,renderer.capabilities.getMaxAnisotropy()));
const vector=(a)=>new THREE.Vector3(...a);
function mapped(p){const v=vector(p),r=v.length();return compressed?v.multiplyScalar(r?3.6*Math.pow(r,.57)/r:1):v.multiplyScalar(6)}
function displayed(b){if(lightFlight){const stop=flightStops.find(s=>s.id===b.id);if(stop)return mapped(lightFlight.origin).addScaledVector(vector(lightFlight.direction),stop.distance*6);if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host)return displayed(host).add(flightTrueScale?vector(b.p).sub(vector(host.p)).multiplyScalar(6):vector(b.p).sub(vector(host.p)).normalize().multiplyScalar(radius(host)*2.5))}if(b.key==='sun')return mapped(lightFlight.origin);}if(!compressed)return mapped(b.p);if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host){const d=vector(b.p).sub(vector(host.p)),r=d.length();return displayed(host).add(d.multiplyScalar(r?((radius(host)*1.8+Math.pow(r*AU/200000,.55)*.8)/r):1))}}return mapped(b.p)}
function radius(b){if(lightFlight){if(flightTrueScale)return b.radius/AU*6;if(b.key==='sun')return .12;if(b.parent)return .008;return .018+.095*Math.pow(b.radius/69911,.6)}if(!compressed)return b.radius/AU*6;if(b.key==='sun')return 1.02;if(b.key==='blackhole')return .5*Math.pow(b.mass,.15);if(b.parent)return b.irregular?.029:Math.max(.035,b.radius/22000);if(b.key==='comet')return .055;if(b.key==='fragment')return .035+.16*Math.pow(b.radius/69911,.5);return .10+.57*Math.pow(b.radius/69911,.62)}
const sphere=new THREE.SphereGeometry(1,56,40);
function addView(b){const group=new THREE.Group();scene.add(group);let geo=sphere;if(b.key==='comet'||b.key==='fragment'&&b.irregular)geo=cometNucleusGeometry(b.id,12);else if(b.irregular){geo=new THREE.IcosahedronGeometry(1,3);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),f=1+.12*Math.sin(x*18+y*13+z*8)+.05*Math.sin(x*37+y*29+z*23);a.setXYZ(i,x*f*1.3,y*f*.78,z*f)}geo.computeVertexNormals()}
 const surfaceMap=textures[b.textureKey||b.key];const mat=b.key==='sun'?new THREE.MeshBasicMaterial({color:new THREE.Color('#ffffff').multiplyScalar(24),toneMapped:true}):new THREE.MeshStandardMaterial({map:surfaceMap||textures.moon,color:surfaceMap?'#ffffff':b.key==='moon'?b.color:b.key==='blackhole'?'#000000':'#ffffff',roughness:1,metalness:0});if(b.key==='blackhole')mat.map=null;if(b.key==='comet'){mat.map=null;mat.color.set('#45413d')}if(b.textureKey&&!surfaceMap){mat.map=null;mat.color.set(b.gas?'#b0aaa0':'#77736c')}naturalColorMaterial(mat,b.key);applyMoonAppearance(mat,b,moonMaps);if(b.key==='sun')applySolarSurface(mat);makeOpaqueSurface(mat);
 const axis=new THREE.Group();axis.rotation.z=THREE.MathUtils.degToRad(b.tilt);group.add(axis);const mesh=new THREE.Mesh(geo,mat);axis.add(mesh);mesh.userData.id=b.id;
 let halo=null; // Solar glare is generated from visible HDR pixels, not an unoccluded billboard.
 if(b.key==='earth'){const atmo=new THREE.Mesh(sphere,new THREE.ShaderMaterial({vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-max(dot(n,v),0.),4.);gl_FragColor=vec4(.18,.46,.9,a*.38);}',transparent:true,depthWrite:false}));atmo.scale.setScalar(1.035);mesh.add(atmo)}
 if(['saturn','uranus','blackhole'].includes(b.key)){const ringGeo=new THREE.RingGeometry(b.key==='blackhole'?1.25:1.35,b.key==='uranus'?1.9:2.35,160,6);const arr=ringGeo.attributes.position,colors=[];for(let i=0;i<arr.count;i++){const r=Math.hypot(arr.getX(i),arr.getY(i)),f=.55+.28*Math.sin(r*100)+.13*Math.sin(r*270);const c=new THREE.Color(b.key==='blackhole'?'#ffaa53':b.key==='uranus'?'#555555':'#bcb5a5').multiplyScalar(f);colors.push(c.r,c.g,c.b)}ringGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const ring=new THREE.Mesh(ringGeo,new (b.key==='blackhole'?THREE.MeshBasicMaterial:THREE.MeshStandardMaterial)({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:b.key==='uranus'?.25:.65}));ring.rotation.x=Math.PI/2;mesh.add(ring)}
 const orbitGeo=new THREE.BufferGeometry();orbitGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(257*3),3).setUsage(THREE.DynamicDrawUsage));const orbit=new THREE.Line(orbitGeo,new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:b.parent?.10:.19,depthWrite:false}));orbit.frustumCulled=false;scene.add(orbit);
 const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(512*3),3).setUsage(THREE.DynamicDrawUsage));trailGeo.setDrawRange(0,0);const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:.3}));trail.frustumCulled=false;scene.add(trail);views.set(b.id,{group,axis,mesh,halo,orbit,trail,history:[]});}
function disposeView(id){const v=views.get(id);if(!v)return;scene.remove(v.group,v.orbit,v.trail);v.undamagedGeometry?.dispose();v.group.traverse(o=>{if(o.isMesh){if(o.geometry!==sphere)o.geometry.dispose();o.material.dispose()}});v.orbit.geometry.dispose();v.orbit.material.dispose();v.trail.geometry.dispose();v.trail.material.dispose();views.delete(id);if(selected===id){selected=null;panel.hidden=true}if(follow===id)follow=null}
bs.forEach(addView);applySolarBrightness();
// Dynamic point attributes are uploaded to WebGL for stars, asteroid belt and comet dust.
// Background stars now come from the real catalogue in sky.js; this buffer only
// carries the decorative asteroid belt.
const count=1200,pointGeo=new THREE.BufferGeometry(),attrs={position:new Float32Array(count*3),size:new Float32Array(count),color:new Float32Array(count*3),brightness:new Float32Array(count),params:new Float32Array(count*2)};let seed=72831;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296}const asteroidData=[];
for(let i=0;i<count;i++){const r=2.15+rand()*1.05,t=rand()*Math.PI*2;asteroidData.push({i,r,t,y:(rand()-.5)*.16});const p=mapped([r*Math.cos(t),(rand()-.5)*.12,r*Math.sin(t)]).toArray();attrs.size[i]=.55+rand()*.7;attrs.brightness[i]=.09+rand()*.15;attrs.position.set(p,i*3);const c=new THREE.Color().setHSL(.58+rand()*.08,.1+rand()*.2,.65+rand()*.3);attrs.color.set([c.r,c.g,c.b],i*3);attrs.params.set([rand()*Math.PI*2,rand()],i*2)}
for(const [key,value] of Object.entries(attrs))pointGeo.setAttribute(key,new THREE.BufferAttribute(value,key==='position'||key==='color'?3:key==='params'?2:1).setUsage(THREE.DynamicDrawUsage));
const pointMaterial=new THREE.ShaderMaterial({uniforms:{time:{value:0},dpr:{value:renderer.getPixelRatio()}},vertexShader:'attribute float size;attribute float brightness;attribute vec3 color;attribute vec2 params;varying vec3 c;varying float a;uniform float time;uniform float dpr;void main(){c=color;a=brightness*(.9+.1*sin(time*.3+params.x));vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=size*dpr;}',fragmentShader:'varying vec3 c;varying float a;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(c,a*(1.-smoothstep(.1,1.,r)));}',transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});const points=new THREE.Points(pointGeo,pointMaterial);points.frustumCulled=false;scene.add(points);
const selection=new THREE.Mesh(new THREE.RingGeometry(1.25,1.263,100),new THREE.MeshBasicMaterial({color:'#c7d9ef',transparent:true,opacity:.65,side:THREE.DoubleSide,depthTest:false}));selection.visible=false;scene.add(selection);
function updateOrbits(){if(lightFlight){for(const v of views.values()){v.orbit.visible=false;v.trail.visible=false}return}for(const b of bs){const view=views.get(b.id),host=bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun');if(!host||host===b){view.orbit.visible=false;continue}const r=vector(b.p).sub(vector(host.p)),v=vector(b.v).sub(vector(host.v)),mu=G*(host.mass+b.mass),h=r.clone().cross(v),ev=v.clone().cross(h).divideScalar(mu).sub(r.clone().normalize()),e=ev.length(),p=h.lengthSq()/mu;if(!Number.isFinite(p)||p<1e-12){view.orbit.visible=false;continue}const x=e>.00001?ev.normalize():r.clone().normalize(),y=h.normalize().cross(x).normalize();const max=e<1?Math.PI:Math.acos(-1/e)*.96,arr=view.orbit.geometry.attributes.position;for(let i=0;i<257;i++){const t=-max+i/256*max*2,rr=Math.min(200,p/(1+e*Math.cos(t))),pos=x.clone().multiplyScalar(rr*Math.cos(t)).addScaledVector(y,rr*Math.sin(t)).add(vector(host.p));let out;if(b.parent&&compressed){out=displayed(host).add(pos.sub(vector(host.p)).normalize().multiplyScalar(radius(host)*1.8+Math.pow(rr*AU/200000,.55)*.8))}else out=mapped(pos.toArray());arr.setXYZ(i,out.x,out.y,out.z)}arr.needsUpdate=true;view.orbit.visible=true;}}
updateOrbits();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let down=null,lastTouchTimer,hoveredConstellation=null;
function pointRay(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera)}
function hit(e){pointRay(e);const hits=ray.intersectObjects([...views.values()].map(v=>v.mesh),false);return hits[0]?.object.userData.id||null}
function location(e){pointRay(e);const pos=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,pos))pos.copy(controls.target);const r=pos.length();return compressed?pos.multiplyScalar(r?Math.pow(r/3.6,1/.57)/r:1):pos.divideScalar(6)}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};if(e.pointerType==='touch')lastTouchTimer=setTimeout(()=>{spawnAt.copy(location(e));showSpawner()},650)});
renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)clearTimeout(lastTouchTimer);if(e.buttons){hoveredConstellation=null;sky.clearConstellationHighlight();tip.hidden=true;return}const id=hit(e),constellation=id?null:showConstellations?sky.pickConstellation(e,camera,renderer.domElement):null;hoveredConstellation=constellation;if(id||!constellation)sky.clearConstellationHighlight();renderer.domElement.style.cursor=id||constellation?'pointer':'grab';tip.hidden=!id&&!constellation;if(id||constellation){tip.textContent=id?bs.find(b=>b.id===id)?.name:constellationLabel(constellation,getLanguage());tip.style.left=Math.min(innerWidth-180,e.clientX+16)+'px';tip.style.top=(e.clientY+16)+'px'}});
renderer.domElement.addEventListener('pointerleave',()=>{hoveredConstellation=null;sky.clearConstellationHighlight();tip.hidden=true});
document.addEventListener('languagechange',()=>{if(hoveredConstellation&&!tip.hidden)tip.textContent=constellationLabel(hoveredConstellation,getLanguage())});
renderer.domElement.addEventListener('pointerup',e=>{clearTimeout(lastTouchTimer);if(lightFlight||e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return}down=null;const id=hit(e);if(id){selected=id;showBody()}else{spawnAt.copy(location(e));showSpawner()}tip.hidden=true});
renderer.domElement.addEventListener('dblclick',e=>{const id=hit(e);if(id)focusBody(id)});
function shell(title,content){preview.clear();restoreFocus=document.activeElement;panel.innerHTML=`<div class="panel-head"><h2>${title}</h2><button class="close" aria-label="Zamknij">×</button></div>${content}`;panel.hidden=false;panel.querySelector('.close').onclick=closePanel}
function closePanel(){preview.clear();panel.hidden=true;selected=null;restoreFocus?.focus?.()}
const row=(label,html)=>`<div class="row"><label>${label}</label>${html}</div>`;
const inputLabel=id=>({mass:'Masa · kg','spawn-mass':'Masa · kg','spawn-solar-mass':'Masa · M☉',radius:'Promień · km','spawn-radius':'Promień · km',spin:'Obrót · godz.',tilt:'Nachylenie osi · °',launch:'Prędkość · km/s',angle:'Kierunek · °',pitch:'Wznoszenie · °'}[id]||`${id.startsWith('v')?'Prędkość':'Położenie'} ${id.slice(-1)} · ${id.startsWith('v')?'km/s':'AU'}`);
const num=(id,value,step='any')=>`<input id="${id}" type="number" step="${step}" value="${Number(value.toPrecision(7))}" aria-label="${inputLabel(id)}">`;
const vecFields=(prefix,arr,label)=>`<label class="field-title">${label}</label><div class="vector">${arr.map((n,i)=>num(prefix+['X','Y','Z'][i],n)).join('')}</div>`;
function getVec(prefix){return ['X','Y','Z'].map(k=>Number(document.getElementById(prefix+k).value))}
const temperatureLabel=value=>`${formatNumber(Math.round(value),0)} °C`;
function temperatureMarkup(body){
 const temperature=surfaceTemperatures(body,bs,solarBrightness);if(!temperature)return '';
 return `<section class="thermal-readout" id="thermal-readout" aria-live="polite"><span>Temperatura powierzchni</span><div><b>Strona oświetlona</b><output id="temperature-lit">${temperatureLabel(temperature.litC)}</output></div><div><b>Strona zacieniona</b><output id="temperature-dark">${temperatureLabel(temperature.darkC)}</output></div><small>Szacunek termiczny · zależy od odległości i jasności Słońca</small></section>`;
}
function updateTemperatureReadout(){
 const readout=document.querySelector('#thermal-readout'),body=bs.find(candidate=>candidate.id===selected);
 if(!readout||!body)return;
 const temperature=surfaceTemperatures(body,bs,solarBrightness);
 if(!temperature){readout.hidden=true;return}
 readout.hidden=false;readout.querySelector('#temperature-lit').textContent=temperatureLabel(temperature.litC);readout.querySelector('#temperature-dark').textContent=temperatureLabel(temperature.darkC);
}
function showBody(){if(lightFlight){const id=selected;stopLightFlight();selected=id}const b=bs.find(x=>x.id===selected);if(!b)return;const velocity=b.v.map(x=>x*AU/86400),primary=b.key==='sun'?null:bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun'),orbitalVelocity=primary?relativeVelocity(b,primary):b.v,speedMagnitude=velocityKmPerSecond(orbitalVelocity),speedLabel=b.key==='sun'?'Prędkość barycentryczna · km/s':b.parent?'Prędkość względem planety · km/s':'Prędkość względem Słońca · km/s';shell(b.name,`${temperatureMarkup(b)}${row('Masa · kg',num('mass',b.mass*SOLAR_MASS))}${row(b.key==='blackhole'?'Horyzont · km':'Promień · km',num('radius',b.radius))}${row(speedLabel,`<output class="value-readout">${formatNumber(speedMagnitude,3)}</output>`)}${primary?row('Punkt odniesienia',`<output class="value-readout">${primary.name}</output>`):''}${row('Obrót · godz.',num('spin',b.spin))}${row('Nachylenie osi · °',num('tilt',b.tilt))}${vecFields('p',b.p,'Położenie X / Y / Z · AU')}${vecFields('v',velocity,'Prędkość X / Y / Z · km/s')}<div class="actions"><button class="action primary" id="apply">Zastosuj</button><button class="action" id="focus">Śledź</button></div><div class="separator"></div>${row('Zamień orbitę',`<select id="swap"><option value="">Wybierz ciało</option>${bs.filter(x=>x.a&&x.id!==b.id).map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select>`)}<div class="actions"><button class="action" id="tools">Symulacja</button><button class="action danger" id="remove">Usuń</button></div><p class="muted" id="validation" role="status"></p>`);
 if(b.key==='blackhole'){const r=document.querySelector('#radius');r.setAttribute('aria-label','Horyzont · km');r.readOnly=true;document.querySelector('#mass').oninput=e=>r.value=horizonRadius(+e.target.value)}
 if(views.get(b.id)?.lastImpactAxis){const button=document.createElement('button');button.className='action';button.textContent='Pokaż miejsce uderzenia';button.onclick=()=>{focusBody(b.id);const view=views.get(b.id);view.mesh.updateWorldMatrix(true,false);const direction=view.lastImpactAxis.clone().applyQuaternion(view.mesh.getWorldQuaternion(new THREE.Quaternion()));camera.position.copy(displayed(b)).addScaledVector(direction,Math.max(radius(b)*4,controls.minDistance*2));controls.target.copy(displayed(b));controls.update()};panel.querySelector('.actions').append(button)}
 const appearance=moonAppearance[b.name];if(b.key==='moon'&&appearance){const note=document.createElement('p');note.className='muted appearance-note';note.append(document.createTextNode(appearance.unknown?'Szczegóły powierzchni nieznane':appearance.haze?'Atmosfera w świetle widzialnym · barwa przybliżona':appearance.map?'Mapa misji · barwa przybliżona':'Wygląd orientacyjny · brak pełnej mapy'));const links=document.createElement('span');links.textContent=' · ';appearance.sources.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`[${i+1}]`;a.setAttribute('aria-label',`Zdjęcia i źródła ${i+1}`);links.append(a)});note.append(links);panel.querySelector('.panel-head').after(note)}
 if(b.textureKey){const note=document.createElement('p');note.className='muted appearance-note';note.textContent='Wizualizacja naukowa · tekstura symulowana';if(b.visualSource){const link=document.createElement('a');link.href=b.visualSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · Materiały źródłowe ↗';note.append(link)}panel.querySelector('.panel-head').after(note)}
 const previewHost=document.createElement('div');previewHost.className='body-preview';panel.querySelector('.panel-head').prepend(previewHost);preview.attach(previewHost,b,views.get(b.id));
 document.querySelector('#apply').onclick=()=>{const m=+document.querySelector('#mass').value,r=+document.querySelector('#radius').value,s=+document.querySelector('#spin').value,t=+document.querySelector('#tilt').value,p=getVec('p'),v=getVec('v');if(![m,r,s,t,...p,...v].every(Number.isFinite)||!validDimensions(m,r)||s===0||p.some(x=>Math.abs(x)>1e5)||v.some(x=>Math.abs(x)>299792)){document.querySelector('#validation').textContent='Sprawdź wartości: masa i promień muszą być dodatnie, obrót różny od zera.';return}b.mass=m/SOLAR_MASS;b.radius=b.key==='blackhole'?horizonRadius(m):r;b.spin=s;b.tilt=t;b.p=p;b.v=v.map(x=>x*86400/AU);clearTrails();updateOrbits();document.querySelector('#validation').textContent='Zapisano parametry.'};document.querySelector('#focus').onclick=()=>focusBody(b.id,{keepPanel:true});document.querySelector('#tools').onclick=showTools;document.querySelector('#remove').onclick=()=>{bs=bs.filter(x=>x.id!==b.id);disposeView(b.id);closePanel();updateOrbits()};document.querySelector('#swap').onchange=e=>{const other=bs.find(x=>x.id===+e.target.value);if(!other)return;const oldP=[...b.p],oldV=[...b.v],otherP=[...other.p],otherV=[...other.v];for(const moon of bs.filter(x=>x.parent===b.id)){moon.p=moon.p.map((x,k)=>x+otherP[k]-oldP[k]);moon.v=moon.v.map((x,k)=>x+otherV[k]-oldV[k])}for(const moon of bs.filter(x=>x.parent===other.id)){moon.p=moon.p.map((x,k)=>x+oldP[k]-otherP[k]);moon.v=moon.v.map((x,k)=>x+oldV[k]-otherV[k])}b.p=otherP;b.v=otherV;other.p=oldP;other.v=oldV;clearTrails();updateOrbits();showBody()}}
function showSpawner(presetId='comet'){
 if(lightFlight)stopLightFlight();selected=null;
 const groups=[...new Set(catalog.map(p=>p.group))];
 shell('Nowe ciało',`${row('Rodzaj ciała',`<select id="kind">${groups.map(g=>`<optgroup label="${g}">${catalog.filter(p=>p.group===g).map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</optgroup>`).join('')}</select>`)}${row('Masa · kg',num('spawn-mass',1))}<div id="solar-mass-field">${row('Masa · M☉',num('spawn-solar-mass',10))}</div>${row('<span id="radius-label">Promień · km</span>',num('spawn-radius',1))}<p class="muted" id="physical-summary" aria-live="polite"></p><p class="muted" id="catalog-note"></p>${vecFields('spawn',spawnAt.toArray(),'Położenie X / Y / Z · AU')}${row('Prędkość · km/s',num('launch',25))}${row('Kierunek · °',num('angle',120))}${row('Wznoszenie · °',num('pitch',0))}<div class="actions"><button class="action primary" id="create">Dodaj</button><button class="action" id="tools">Symulacja</button></div><p class="muted" id="validation" role="status"></p>`);
 const kind=document.querySelector('#kind'),mass=document.querySelector('#spawn-mass'),size=document.querySelector('#spawn-radius');
 kind.value=catalog.some(p=>p.id===presetId)?presetId:'comet';
 const solarMass=document.querySelector('#spawn-solar-mass');
 const preset=()=>catalog.find(p=>p.id===kind.value);
 function updateDimensions(){
  if(preset().key==='blackhole')size.value=horizonRadius(+mass.value);
  const m=+mass.value,r=+size.value;solarMass.value=m/SOLAR_MASS;
  document.querySelector('#physical-summary').textContent=validDimensions(m,r)?`${(m/SOLAR_MASS).toLocaleString(getLocale(),{maximumSignificantDigits:4})} mas Słońca · średnica ${(2*r).toLocaleString(getLocale(),{maximumSignificantDigits:5})} km`:'';
 }
 function fillPreset(){
  const p=preset();document.querySelector('#solar-mass-field').hidden=p.key!=='blackhole';mass.value=p.mass*SOLAR_MASS;size.value=p.radius;size.readOnly=p.key==='blackhole';
  document.querySelector('#radius-label').textContent=size.readOnly?'Horyzont · km':'Promień · km';
  document.querySelector('#catalog-note').innerHTML=p.note+(p.source?` <a href="${p.source}" target="_blank" rel="noopener noreferrer">Źródło NASA ↗</a>`:'');
  document.querySelector('#validation').textContent='';updateDimensions();
 }
 kind.onchange=fillPreset;mass.oninput=size.oninput=updateDimensions;solarMass.oninput=()=>{mass.value=+solarMass.value*SOLAR_MASS;updateDimensions()};fillPreset();
 document.querySelector('#tools').onclick=showTools;
 document.querySelector('#create').onclick=()=>{
  const p=getVec('spawn'),sp=+document.querySelector('#launch').value,a=+document.querySelector('#angle').value*Math.PI/180,pitch=+document.querySelector('#pitch').value*Math.PI/180;
  const validation=document.querySelector('#validation');
  if(![...p,sp,a,pitch].every(Number.isFinite)||Math.abs(sp)>299792||p.some(x=>Math.abs(x)>1e5)){validation.textContent='Podaj prawidłowe położenie i prędkość.';return}
  if(bs.length>=100){validation.textContent='Osiągnięto limit 100 ciał.';return}
  try{
   const b=createCatalogBody(kind.value,{massKg:+mass.value,radiusKm:+size.value,p,v:[Math.cos(a)*Math.cos(pitch)*sp*86400/AU,Math.sin(pitch)*sp*86400/AU,Math.sin(a)*Math.cos(pitch)*sp*86400/AU]});
   bs.push(b);addView(b);selected=b.id;updateOrbits();showBody();
  }catch(error){validation.textContent=error.message}
 };
}
function showTools(){selected=null;shell('Symulacja',`<div class="tools"><button id="pause" aria-label="Pauza">${paused?'▶':'Ⅱ'}</button><button id="zoom-in" aria-label="Przybliż">＋</button><button id="zoom-out" aria-label="Oddal">−</button><button id="home" aria-label="Domyślny widok">⌖</button></div>${row('Tempo',`<select id="speed">${lightFlight?`<option selected>Lot · ${lightFlight.rate} ×</option>`:''}${[.02,.1,.5,2,10,50,100,200,365].map(s=>`<option value="${s}" ${s===speed?'selected':''}>${s} dni / s</option>`).join('')}</select>`)}${row('Widok',`<select id="scale"><option value="visual" ${compressed?'selected':''}>Czytelny</option><option value="real" ${!compressed?'selected':''}>Rzeczywista skala</option></select>`)}${row('Gwiazdozbiory',`<input id="constellations" type="checkbox" ${showConstellations?'checked':''} aria-label="Pokaż linie gwiazdozbiorów">`)}<label class="field-title" for="body-search">Szukaj ciała</label><div class="body-search"><input id="body-search" type="text" autocomplete="off" placeholder="Nazwa ciała…" aria-label="Szukaj ciała" role="combobox" aria-expanded="false" aria-controls="body-results" aria-autocomplete="list"><ul id="body-results" class="body-results" role="listbox" aria-label="Wyniki wyszukiwania ciał" hidden></ul></div><div class="actions"><button class="action" id="light-start">${lightFlight?'Zakończ lot światła':'Symulacja prędkości światła'}</button></div><div class="actions"><button class="action" id="add">Dodaj ciało</button><button class="action" id="custom-blackhole">Własna czarna dziura</button><button class="action danger" id="restart">Od nowa</button></div>`);document.querySelector('#pause').onclick=e=>{setPaused(!paused);e.target.textContent=paused?'▶':'Ⅱ'};document.querySelector('#light-start').onclick=()=>lightFlight?stopLightFlight():startLightFlight();for(const id of ['speed','scale','zoom-in','zoom-out','home'])document.getElementById(id).disabled=!!lightFlight;document.querySelector('#zoom-in').onclick=()=>camera.position.lerp(controls.target,.25);document.querySelector('#zoom-out').onclick=()=>camera.position.sub(controls.target).multiplyScalar(1.3).add(controls.target);document.querySelector('#home').onclick=resetView;document.querySelector('#speed').onchange=e=>setSimulationSpeed(e.target.value);document.querySelector('#scale').onchange=e=>{compressed=e.target.value==='visual';clearTrails();updateOrbits()};document.querySelector('#constellations').onchange=e=>{showConstellations=e.target.checked;sky.setConstellations(showConstellations)};document.querySelector('#add').onclick=()=>{spawnAt.set(2,0,0);showSpawner()};document.querySelector('#custom-blackhole').onclick=()=>{spawnAt.set(2,0,0);showSpawner('custom-blackhole')};document.querySelector('#restart').onclick=restart;setupBodySearch()}
function setupBodySearch(){
 const input=document.querySelector('#body-search'),list=document.querySelector('#body-results');
 let matches=[],active=-1;
 function render(query){matches=searchBodies(bs,query,body=>translate(body.name));active=-1;list.innerHTML=matches.length?matches.map(b=>`<li role="option" id="body-result-${b.id}" data-id="${b.id}">${b.name}<span class="body-kind">${bodyKind(b,bs)}</span></li>`).join(''):'<li class="empty">Brak wyników.</li>';list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant')}
 function highlight(i){const items=[...list.children].filter(el=>el.dataset.id);items.forEach(el=>el.classList.remove('active'));const el=items[i];if(el){el.classList.add('active');el.scrollIntoView({block:'nearest'});input.setAttribute('aria-activedescendant',el.id)}active=i}
 function pick(b){if(b){selected=b.id;showBody()}}
 input.addEventListener('focus',()=>render(input.value));
 input.addEventListener('input',()=>render(input.value));
 input.addEventListener('blur',()=>setTimeout(()=>{list.hidden=true;input.setAttribute('aria-expanded','false')},120));
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();if(matches.length)highlight(Math.min(active+1,matches.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();if(matches.length)highlight(Math.max(active-1,0))}else if(e.key==='Enter'){e.preventDefault();pick(matches[active]||matches[0])}else if(e.key==='Escape'){if(input.value){input.value='';render('')}else input.blur()}});
 list.addEventListener('mousedown',e=>{const li=e.target.closest('[data-id]');if(li){e.preventDefault();pick(bs.find(x=>x.id===+li.dataset.id))}});
}
function focusBody(id,{keepPanel=false}={}){if(lightFlight)stopLightFlight();follow=id;const b=bs.find(x=>x.id===id),target=displayed(b);controls.target.copy(target);camera.position.copy(target).add(new THREE.Vector3(0,2,4).multiplyScalar(Math.max(radius(b)*3,compressed?.3:.00001)));if(!keepPanel)panel.hidden=true}
const navigation=createNavigation({camera,controls,element:renderer.domElement,blocked:()=>!!lightFlight||!panel.hidden,onMove:()=>{follow=null;tip.hidden=true},pace:()=>{let distance=Infinity;for(const b of bs)distance=Math.min(distance,Math.max(0,camera.position.distanceTo(displayed(b))-radius(b)));return Math.max(compressed?.08:.000002,Math.min(40,distance*.6))}});
function resetView(){navigation.reset();camera.fov=43;camera.updateProjectionMatrix();if(lightFlight)stopLightFlight();follow=null;controls.enabled=true;controls.enableDamping=false;camera.position.copy(home);controls.target.set(0,0,0);controls.update();controls.enableDamping=true;closePanel()}
function clearTrails(){for(const v of views.values()){v.history=[];v.trail.geometry.setDrawRange(0,0)}}
function restart(){lightFlight=null;flightPrevious=null;flightStops=[];flightTrueScale=false;flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;controls.enabled=true;lag=0;last=performance.now();spawnAt.set(0,0,0);lastOrbit=0;selected=null;follow=null;down=null;clearTimeout(lastTouchTimer);tip.hidden=true;selection.visible=false;preview.clear();impactEffects.clear();[...views.keys()].forEach(disposeView);epoch=new Date();bs=initialSystem(epoch);bs.forEach(addView);solarBrightness=100;applySolarBrightness();cometTails.clear();elapsed=0;paused=false;speed=2;compressed=true;updateOrbits();resetView()}
document.querySelector('#logo').onclick=()=>panel.hidden?showTools():closePanel();document.querySelector('#reset').onclick=restart;
window.addEventListener('keydown',e=>{if(e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'&&e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();setPaused(!paused);if(!panel.hidden)showTools()}if(e.key==='Escape'){if(lightFlight)stopLightFlight();closePanel()};if(e.key.toLowerCase()==='r')restart();if(e.key.toLowerCase()==='n'){spawnAt.set(2,0,0);showSpawner()}if(e.key.toLowerCase()==='t')showTools()});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);layoutRail()});

document.addEventListener("visibilitychange",()=>{last=performance.now()});
function setPaused(value){const now=performance.now();if(lightFlight){if(value)lightFlight.pause(now);else lightFlight.resume(now)}paused=value;last=now;}
function startLightFlight(){
 if(lightFlight)return;
 const sun=bs.find(b=>b.key==='sun');if(!sun){shell('Brak Słońca','<p class="muted">Użyj Reset, aby przywrócić Słońce i rozpocząć lot.</p>');return}
 flightPrevious={speed,compressed,paused,camera:camera.position.clone(),target:controls.target.clone()};
 const direction=new THREE.Vector3(1,0,0);
 flightStops=planets.flatMap(p=>{const b=bs.find(b=>b.key===p[1]);return b?[{id:b.id,name:b.name,distance:p[2]}]:[]});
 flightLabels.innerHTML=flightStops.map(s=>`<span class="flight-body-label" data-body="${s.id}">${s.name}</span>`).join('');
 lightFlight=new LightFlight(sun.p,direction.toArray(),performance.now());follow=null;paused=false;speed=1/86400;compressed=false;lag=0;last=performance.now();
 controls.enabled=false;controls.enableDamping=false;controls.update();controls.enableDamping=true;closePanel();clearTrails();updateOrbits();
 flightHud.innerHTML=`<div class="flight-summary"><span class="flight-symbol">c</span><div><div class="flight-title">Lot światła <span id="flight-rate">1 ×</span></div><div id="flight-distance"></div><div id="flight-time"></div></div></div><div class="flight-arrival"><span class="flight-eyebrow">NASTĘPNE CIAŁO</span><strong id="flight-next-name"></strong><div id="flight-next"></div></div><label class="flight-scale"><input id="flight-scale-toggle" type="checkbox" checked> Rzeczywiste rozmiary i odległości</label><div class="flight-note" id="flight-scale-note">Rzeczywista skala · bliski przelot kamery</div>`;flightHud.hidden=false;
 flightTrueScale=true;flightRail.innerHTML=`<div class="rail-title">TRASA LOTU</div><div class="rail-track"><div class="rail-fill"></div><div class="rail-head"></div>${flightStops.map(s=>`<button type="button" class="rail-stop" data-stop="${s.id}" aria-label="Przenieś lot do: ${s.name}, ${s.distance.toFixed(2)} AU od Słońca"><i></i><span class="rail-name">${s.name}</span></button>`).join('')}</div>`;flightRail.hidden=false;layoutRail();
 for(const button of flightRail.querySelectorAll('[data-stop]'))button.onclick=()=>{if(!lightFlight)return;const stop=flightStops.find(s=>s.id===Number(button.dataset.stop));if(!stop)return;const now=performance.now();lightFlight.seekDistance(stop.distance,now);updateLightFlight(now);};
 document.querySelector('#flight-scale-toggle').onchange=e=>{flightTrueScale=e.target.checked;document.querySelector('#flight-scale-note').textContent=flightTrueScale?'Rzeczywista skala · bliski przelot kamery':'Bliski przelot · rozmiary powiększone';};
 updateLightFlight(performance.now());
}
const railProgress=distance=>flightRouteProgress(distance,flightStops.map(s=>s.distance));
function layoutRail(){
 if(flightRail.hidden||!flightStops.length)return;
 for(const [index,stop] of flightStops.entries()){
  const button=flightRail.querySelector(`[data-stop="${stop.id}"]`);
  if(!button)continue;
  button.style.top=flightRouteStopPosition(index,flightStops.length)+'%';
 }
}
function stopLightFlight(){if(!lightFlight)return;lightFlight=null;flightStops=[];flightTrueScale=false;flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;flightRail.hidden=true;camera.fov=43;camera.updateProjectionMatrix();controls.enabled=true;const previous=flightPrevious;flightPrevious=null;speed=previous.speed;compressed=previous.compressed;paused=previous.paused;lag=0;last=performance.now();controls.enableDamping=false;camera.position.copy(previous.camera);controls.target.copy(previous.target);controls.update();controls.enableDamping=true;clearTrails();updateOrbits();if(!panel.hidden)showTools()}
const durationLabel=seconds=>{const s=Math.max(0,Math.floor(seconds));return `${Math.floor(s/3600)?Math.floor(s/3600)+':':''}${String(Math.floor(s/60)%60).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`};
function updateLightFlight(now){
 const flight=lightFlight,t=flight.seconds(now),distance=flight.distance(now),target=mapped(flight.origin);
 const nearest=[...flightStops].sort((a,b)=>Math.abs(a.distance-distance)-Math.abs(b.distance-distance))[0];
 const base=mapped(flight.position(now)).add(new THREE.Vector3(0,0,flightTrueScale?-.002:-.35));camera.position.copy(base);
 let look=target.clone();camera.fov=75;
 if(nearest){const planet=bs.find(b=>b.id===nearest.id),r=radius(planet),pos=displayed(planet),windowAU=Math.max(.12,nearest.distance*.08),gap=distance-nearest.distance,weight=Math.exp(-Math.pow(gap/windowAU,4));
 const earthRadius=6371/AU*6,framingRadius=flightTrueScale?Math.max(earthRadius*1.6,r*.9):r;
 const close=pos.clone().add(new THREE.Vector3(framingRadius*(2+.6*Math.tanh(gap/windowAU)),0,-framingRadius*2.2));camera.position.lerp(close,weight);
 const sunDirection=target.clone().sub(camera.position).normalize(),planetDirection=pos.clone().sub(camera.position).normalize();const framed=sunDirection.clone().add(planetDirection).normalize();look=camera.position.clone().add(sunDirection.lerp(framed,weight).normalize());}
 camera.updateProjectionMatrix();camera.lookAt(look);controls.target.copy(target);camera.updateMatrixWorld();
 document.querySelector('#flight-distance').textContent=`${formatNumber(distance,3)} AU · ${formatNumber(distance*AU/1e6,2)} mln km`;
 document.querySelector('#flight-time').textContent=`Czas podróży ${durationLabel(t)} · c = 299 792 km/s`;
 document.querySelector('#flight-rate').textContent=`${flight.rate} ×${paused?' · pauza':''}`;
 const next=flightStops.find(p=>p.distance>distance+1e-10);
 document.querySelector('#flight-next-name').textContent=next?next.name:'Za Neptunem';
 const remaining=next?Math.max(0,lightTravelSeconds(next.distance)-t):0;
 document.querySelector('#flight-next').textContent=next?`${formatNumber(next.distance-distance,3)} AU · ${durationLabel(remaining/flight.rate)} oglądania${paused?' (pauza)':''} · ${durationLabel(remaining)} lotu`:'Wszystkie planety za Tobą';
 for(const s of flightStops){const chip=flightRail.querySelector(`[data-stop="${s.id}"]`);chip.classList.toggle('passed',distance+1e-10>=s.distance);chip.classList.toggle('upcoming',next?.id===s.id);}
 const progress=railProgress(distance)/100;flightRail.style.setProperty('--progress',String(progress));flightRail.setAttribute('aria-label',`Postęp lotu ${Math.round(progress*100)} procent drogi do Neptuna`);
 const currentStop=flightStops.filter(s=>s.distance<=distance+1e-10).at(-1)||flightStops[0];
 for(const s of flightStops){const label=flightLabels.querySelector(`[data-body="${s.id}"]`),body=bs.find(b=>b.id===s.id),pos=displayed(body).project(camera);const visible=s===currentStop&&pos.z>-1&&pos.z<1&&Math.abs(pos.x)<.9&&Math.abs(pos.y)<.75;label.hidden=!visible;if(visible){label.style.left=((pos.x+1)*innerWidth/2)+'px';label.style.top=((-pos.y+1)*innerHeight/2+22)+'px'}}
}

function updateCometDust(now){
 const comets=bs.filter(b=>b.key==='comet');
 if(!comets.length){cometTails.clear();return}
 const sun=bs.find(b=>b.key==='sun'),sunDisplayed=sun?displayed(sun):new THREE.Vector3();
 cometTails.update({
  comets,sunDisplayed,displayed,
  velocityOf:b=>vector(b.v),
  distanceOf:b=>sun?vector(b.p).distanceTo(vector(sun.p)):10,
  span:compressed?.55:.9,
  time:now*.001
 });
}
let last=performance.now(),frame=0,lag=0;
function handleCollisions(previous){const oldSelected=selected,oldFollow=follow,wasPanelVisible=!panel.hidden;const visual=compressed?captureCollisionView(bs,displayed,radius):null;const events=resolveCollisions(bs,{contactTest:visual?(a,b)=>viewContact(a,b,visual,previous):null});if(!events.length)return;preview.clear();for(const event of events){const size=compressed?Math.max(.12,...event.sourceIds.map(id=>views.get(id)?.mesh.scale.x||.12)):event.radius/AU*6;const visualSources=visual&&event.sourceIds.map(id=>visual.get(id)).filter(Boolean);const impactPosition=visualSources?.length?vector(visualSources[0].p).lerp(vector(visualSources[1]?.p||visualSources[0].p),.5):mapped(event.p);impactEffects.add(event,impactPosition,size);for(const id of event.sourceIds){const body=bs.find(b=>b.id===id),view=views.get(id);if(body&&view)applyImpactDamage(view,body)}event.removed.forEach(disposeView);for(const id of event.added)addView(bs.find(b=>b.id===id));if(event.sourceIds.includes(oldSelected))selected=event.survivor;if(event.sourceIds.includes(oldFollow))follow=event.survivor;}clearTrails();updateOrbits();if(selected&&wasPanelVisible)showBody();}
function animate(now){requestAnimationFrame(animate);const beforeElapsed=elapsed;const realDelta=Math.max(0,(now-last)/1000),delta=Math.min(realDelta,.05);last=now;if(!lightFlight&&!paused&&!document.hidden){lag+=realDelta*speed;let steps=0;const deadline=performance.now()+24;handleCollisions();while(lag>1e-12&&steps<4096){const previous=compressed?captureCollisionView(bs,displayed,radius):null;const config=fastStepSize(bs),dt=Math.min(lag,config.dt);if(config.split)splitStep(bs,dt,config.states);else step(bs,dt);lag-=dt;elapsed+=dt;steps++;handleCollisions(previous);if(steps%8===0&&performance.now()>deadline)break}}
 for(const b of bs){const v=views.get(b.id);updateSurfaceImpact(v,elapsed-beforeElapsed);v.group.position.copy(displayed(b));v.mesh.scale.setScalar(radius(b));v.axis.rotation.z=b.tilt*Math.PI/180;v.mesh.rotation.y=((elapsed+(lightFlight?lightFlight.seconds(now)/86400:0))*24/b.spin*Math.PI*2)%(Math.PI*2);if(v.halo){v.halo.quaternion.copy(camera.quaternion);v.halo.scale.setScalar(radius(b)/1.02)};if(frame%8===0&&!paused&&!lightFlight){v.history.push(v.group.position.clone());if(v.history.length>512)v.history.shift();const a=v.trail.geometry.attributes.position;v.history.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z));a.needsUpdate=true;v.trail.geometry.setDrawRange(0,v.history.length);v.trail.visible=!b.parent;}}
 const sun=bs.find(b=>b.key==='sun');sunlight.visible=!!sun;if(sun)sunlight.position.copy(displayed(sun));if(follow){const b=bs.find(x=>x.id===follow);if(b){const p=displayed(b),offset=camera.position.clone().sub(controls.target);controls.target.copy(p);camera.position.copy(p).add(offset)}}
 selection.visible=!!selected;const chosen=bs.find(x=>x.id===selected);if(chosen){selection.position.copy(displayed(chosen));selection.scale.setScalar(radius(chosen));selection.quaternion.copy(camera.quaternion)}
 if(now-lastOrbit>800){updateOrbits();lastOrbit=now}if(frame%3===0){for(const a of asteroidData){const t=a.t+elapsed*Math.sqrt(G/a.r**3),p=mapped([a.r*Math.cos(t),a.y,a.r*Math.sin(t)]);attrs.position.set(p.toArray(),a.i*3)}pointGeo.attributes.position.needsUpdate=true}updateCometDust(now);pointMaterial.uniforms.time.value=now*.001;impactEffects.update(paused||lightFlight?0:delta,mapped,elapsed-beforeElapsed,id=>{const b=bs.find(b=>b.id===id);return b?displayed(b):null});if(!panel.hidden){preview.update(bs.find(b=>b.id===selected),delta);updateTemperatureReadout()}syncTimeDock();if(lightFlight)updateLightFlight(now);else{navigation.update(delta);controls.update();}for(const v of views.values())if(v.halo)v.halo.quaternion.copy(camera.quaternion);sky.update(camera);updateClock();const interior=lightFlight?solarInteriorState(lightFlight.distance(now),bs.find(b=>b.key==='sun')?.radius):null;interiorHud.hidden=!interior?.inside;flightLabels.hidden=!!interior?.inside;document.body.classList.toggle('inside-sun',!!interior?.inside);if(interior?.inside){document.querySelector('#interior-zone').textContent=interior.zone;document.querySelector('#interior-values').textContent=`${(interior.fraction*100).toLocaleString(getLocale(),{maximumFractionDigits:1})}% R☉ · T ≈ ${Number(interior.temperature.toPrecision(2)).toLocaleString(getLocale())} K`;solarInterior.render(renderer,interior,lightFlight.seconds(now),camera.aspect)}else composer.render();frame++}
installLanguageUI();
document.addEventListener('languagechange',()=>{dateFormat=new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});timeFormat=new Intl.DateTimeFormat(getLocale(),{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'});clockShown='';updateClock();layoutRail();if(!panel.hidden&&selected)showBody()});
requestAnimationFrame(animate);
// Exposed only as an explicit automation surface; no network or persistence.
window.solare={getState:()=>({paused,speed,elapsed,pendingDays:lag,compressed,lightFlight:lightFlight?{rate:lightFlight.rate,seconds:lightFlight.seconds(performance.now()),distanceAU:lightFlight.distance(performance.now())}:null,bodies:bs.map(b=>({id:b.id,name:b.name,mass:b.mass,p:[...b.p],v:[...b.v]}))}),reset:restart,pause:()=>setPaused(true),resume:()=>setPaused(false),startLightFlight,stopLightFlight};
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});for(const tool of [{name:'read_simulation',description:'Read current bodies, positions in AU and velocities in AU/day.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>window.solare.getState()},{name:'set_simulation_paused',description:'Pause or resume the current gravitational simulation.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(typeof input?.paused!=='boolean')throw new Error('paused must be a boolean');setPaused(input.paused);if(!panel.hidden)showTools();return {paused}}}]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}}
