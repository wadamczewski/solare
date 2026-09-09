import {moonAppearance,moonMapPath,applyMoonAppearance} from './moon-appearance.js';
import {createSolarInterior,solarInteriorState} from './solar-interior.js';
import {createSolarSpots,setSolarSpotBrightness} from './solar-spots.js';
import {installLanguageUI,getLanguage,getLocale,translate,formatNumber} from './i18n.js';
import {makeOpaqueSurface} from './opaque-surface.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {updateSurfaceImpact} from './surface-impact.js';
import {naturalColorMaterial} from './natural-color.js';
import {applyImpactDamage} from './impact-damage.js';
import {createNavigation} from './navigation.js';
import {captureCollisionView,collisionFocusTransfer,framingDistance,viewContact} from './collision-view.js';
import {catalog,createCatalogBody,horizonRadius,validDimensions} from './catalog.js';
import {bodyKind} from './body-search.js';
import {constellationLabel,createSky,deepSkyKind,equatorialFromDirection} from './sky.js';
import {constellationNote,deepSkyNote} from './sky-descriptions.js';
import {formatAngularSize,formatDeclination,formatRightAscension} from './sky-detail.js';
import {applyCometAppearance,cometNucleusGeometry,createCometTails} from './comet.js';
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
import {isShapeGeometry,keepsAuthoredGeometry,shapeGeometry,updateShapeLod} from './scene-lod.js';
import {createOrbitRibbon,updateOrbitRibbon} from './orbit-ribbon.js';
import {auRadius,maxViewDistance,scaleRatio,sceneRadius} from './scene-scale.js';
import {configureSolarShadow,participatesInSolarShadow} from './solar-shadows.js';
import {applyExtendedSolarShadow,solarOccludersForReceiver} from './extended-solar-shadow.js';
import {accretionStateFor,createBlackHoleVisual} from './black-hole.js';
import {createNeutronStarVisual} from './neutron-star.js';
import {createBlackHoleLensingPass,updateBlackHoleLensing} from './black-hole-lensing.js';
import {tidalStretch,tidalStreamStrength} from './tidal-disruption.js';
import {createTidalStreams} from './tidal-stream.js';
import {createAsteroidBelt} from './asteroid-belt.js';
import {DEFAULT_IMPACT_SPEED_KMS,buildCustomScenario,clampImpactSpeed,collisionScenarios,collisionLaunchState,findScenarioTarget,scenarioCollisionReady,scenarioContactNormal,scenarioVisualSeparation} from './collision-scenarios.js';
const mount=document.querySelector('#universe'),panel=document.querySelector('#panel'),tip=document.querySelector('#tooltip');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false,logarithmicDepthBuffer:true});renderer.setClearColor('#000000');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Mapa 3D. Przeciągnij, aby obrócić. Kółko: zoom. WASD: ruch. Q/E: dół/góra. Shift: szybciej. Prawy przycisk i mysz: rozglądanie. Shift i lewy przycisk: przesuwanie. Kliknij ciało lub przestrzeń. Spacja: pauza. Escape: zamknij.');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.0000001,2000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.00001;controls.maxDistance=maxViewDistance(true);controls.zoomToCursor=true;controls.enablePan=true;controls.panSpeed=.7;
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const SOLAR_BLOOM_STRENGTH=.65,SOLAR_LIGHT_INTENSITY=Math.PI;const solarBloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),SOLAR_BLOOM_STRENGTH,.45,2),blackHoleLensing=createBlackHoleLensingPass(ShaderPass);composer.addPass(solarBloom);composer.addPass(blackHoleLensing);composer.addPass(new OutputPass());
const home=new THREE.Vector3(0,31,43).multiplyScalar(Math.max(1,1.15/(innerWidth/innerHeight)));camera.position.copy(home);controls.target.set(0,0,0);controls.update();scene.add(new THREE.AmbientLight('#ffffff',.035));const sunlight=new THREE.PointLight('#ffffff',SOLAR_LIGHT_INTENSITY,0,0);configureSolarShadow(sunlight,renderer);scene.add(sunlight);
const preview=createBodyPreview(),impactEffects=createImpactEffects(scene),tidalStreams=createTidalStreams(scene),solarInterior=createSolarInterior();
const interiorHud=document.createElement('aside');interiorHud.id='solar-interior';interiorHud.hidden=true;interiorHud.innerHTML='<span>Model wnętrza Słońca</span><strong id=interior-zone></strong><div id=interior-values></div><p>Przekrój edukacyjny. Plazma jest nieprzezroczysta; rzeczywiste fotony rozpraszają się zamiast lecieć prostą.</p>';document.body.append(interiorHud);
const sky=createSky(renderer.getPixelRatio());sky.setViewport(innerWidth,innerHeight);scene.add(sky.group);
sky.load().then(info=>{skyInfo=info;sky.setConstellations(showConstellations);sky.setDeepSkyMarkers(showDeepSkyMarkers)}).catch(error=>{skyInfo={error:error.message};console.warn('Nie udało się wczytać mapy nieba:',error.message)});
const cometTails=createCometTails(scene);cometTails.setPixelRatio(renderer.getPixelRatio());
let skyInfo=null,showConstellations=false,showDeepSkyMarkers=false;
let epoch=new Date(),bs=initialSystem(epoch),views=new Map(),selected=null,follow=null,paused=false,speed=2,elapsed=0,compressed=true,spawnAt=new THREE.Vector3(),restoreFocus=null;
let lightFlight=null,flightPrevious=null,flightStops=[],flightTrueScale=false,solarBrightness=100,solarInfall=0;
const flightLabels=document.createElement("div");flightLabels.id="flight-labels";document.body.append(flightLabels);
const flightHud=document.createElement('div');flightHud.id='light-flight';flightHud.hidden=true;document.body.append(flightHud);
const flightRail=document.createElement('nav');flightRail.id='flight-rail';flightRail.hidden=true;flightRail.setAttribute('aria-label','Postęp lotu przez planety');document.body.append(flightRail);
const timeDock=document.createElement('nav');timeDock.id='time-dock';timeDock.setAttribute('aria-label','Sterowanie czasem i lotem');
timeDock.innerHTML=`<button id="dock-pause" aria-label="Wstrzymaj symulację"><span id="dock-pause-icon">Ⅱ</span><span id="dock-pause-label">Pauza</span></button><div class="dock-divider"></div><label for="dock-speed">Tempo</label><select id="dock-speed" aria-label="Tempo symulacji"><option value="realtime" hidden>1 : 1</option>${[.02,.1,.5,2,10,50,100,200,365].map(s=>`<option value="${s}" ${s===2?'selected':''}>${s} dni / s</option>`).join('')}</select><label class="dock-scale" id="dock-scale-label"><input id="dock-scale" type="checkbox"> Rzeczywista skala</label><div class="dock-divider"></div><button id="dock-flight"><span class="dock-c">c</span><span id="dock-flight-label">Lot światła</span></button>`;
document.body.append(timeDock);
const collisionCourseButton=document.createElement('button');collisionCourseButton.id='collision-course';collisionCourseButton.textContent='Kurs kolizyjny';collisionCourseButton.setAttribute('aria-label','Ustaw scenariusz zderzenia');timeDock.append(collisionCourseButton);
const solarControl=document.createElement('aside');solarControl.id='solar-control';solarControl.setAttribute('aria-label','Regulacja jasności Słońca');solarControl.innerHTML='<label for="solar-brightness"><span>Jasność Słońca</span><output id="solar-brightness-value">100%</output></label><input id="solar-brightness" type="range" min="5" max="100" step="1" value="100" aria-label="Jasność Słońca"><div class="sky-explorer"><label class="field-title" for="body-search">Szukaj ciała lub obiektu</label><div class="body-search"><input id="body-search" type="text" autocomplete="off" placeholder="Nazwa ciała lub obiektu…" aria-label="Szukaj ciała lub obiektu" role="combobox" aria-expanded="false" aria-controls="body-results" aria-autocomplete="list"><ul id="body-results" class="body-results" role="listbox" aria-label="Wyniki wyszukiwania" hidden></ul></div><label class="sky-toggle" for="constellations"><span>Gwiazdozbiory</span><input id="constellations" type="checkbox" role="switch" aria-label="Pokaż linie gwiazdozbiorów"><i aria-hidden="true"></i></label><label class="sky-toggle" for="deep-sky-markers"><span>Obiekty głębokiego nieba</span><input id="deep-sky-markers" type="checkbox" role="switch" aria-label="Pokaż punkty orientacyjne obiektów głębokiego nieba"><i aria-hidden="true"></i></label></div>';
document.body.append(solarControl);setupBodySearch();document.querySelector('#constellations').onchange=e=>setConstellationsVisible(e.target.checked);document.querySelector('#deep-sky-markers').onchange=e=>setDeepSkyMarkersVisible(e.target.checked);
const solarBrightnessInput=document.querySelector('#solar-brightness'),solarBrightnessValue=document.querySelector('#solar-brightness-value');
function applySolarBrightness(){
 const scale=solarBrightness/100*(1-solarInfall*.78);
 sunlight.intensity=SOLAR_LIGHT_INTENSITY*scale;
 solarBloom.strength=SOLAR_BLOOM_STRENGTH*(.08+.92*Math.sqrt(scale));
 const sun=bs.find(body=>body.key==='sun'),sunView=sun&&views.get(sun.id);
 if(sunView?.mesh.material?.color){sunView.mesh.material.color.setRGB(24*scale,24*scale,24*scale);setSolarSpotBrightness(sunView.spots,solarBrightness)}
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
// Switching the mapping moves every body at once, so the camera has to move with
// it: true scale spreads the system about sevenfold, and a camera left where it
// was ends up somewhere inside Jupiter's orbit instead of viewing the whole thing.
function setScaleMode(next){
 if(next===compressed)return;
 const offset=camera.position.clone().sub(controls.target);
 const ratio=scaleRatio(Math.max(controls.target.length(),camera.position.length()),compressed,next);
 const target=controls.target.clone().multiplyScalar(scaleRatio(controls.target.length(),compressed,next));
 compressed=next;
 controls.maxDistance=maxViewDistance(compressed);
 const followed=follow&&bs.find(b=>b.id===follow);
 controls.target.copy(followed?displayed(followed):target);
 camera.position.copy(controls.target).add(offset.multiplyScalar(ratio));
 controls.update();
 clearTrails();updateOrbits();
 const select=document.querySelector('#scale');if(select)select.value=compressed?'visual':'real';
 document.querySelector('#dock-scale').checked=!compressed;
}
document.querySelector('#dock-scale').onchange=e=>setScaleMode(!e.target.checked);
document.querySelector('#dock-flight').onclick=()=>lightFlight?stopLightFlight():startLightFlight();
let dockState='';
function syncTimeDock(){const state=`${paused}:${speed}:${lightFlight?.rate??0}:${compressed}`;if(state===dockState)return;dockState=state;document.querySelector('#dock-scale-label').hidden=!!lightFlight;document.querySelector('#dock-scale').checked=!compressed;const pauseButton=document.querySelector('#dock-pause');pauseButton.setAttribute('aria-label',paused?'Wznów symulację':'Wstrzymaj symulację');pauseButton.setAttribute('aria-pressed',String(paused));document.querySelector('#dock-pause-icon').textContent=paused?'▶':'Ⅱ';document.querySelector('#dock-pause-label').textContent=paused?'Wznów':'Pauza';const select=document.querySelector('#dock-speed');select.disabled=false;const mode=lightFlight?'flight':'normal';if(select.dataset.mode!==mode){select.dataset.mode=mode;select.innerHTML=(lightFlight?[1,10,60,300,1000]:[.02,.1,.5,2,10,50,100,200,365]).map(s=>`<option value="${s}">${s}${lightFlight?' ×':' dni / s'}</option>`).join('')}select.value=String(lightFlight?lightFlight.rate:speed);document.querySelector('#dock-flight-label').textContent=lightFlight?'Zakończ lot':'Lot światła';document.querySelector('#dock-flight').setAttribute('aria-pressed',String(!!lightFlight));timeDock.classList.toggle('in-flight',!!lightFlight);const panelPause=document.querySelector('#pause');if(panelPause)panelPause.textContent=paused?'▶':'Ⅱ';const panelSpeed=document.querySelector('#speed');if(panelSpeed){if(lightFlight)panelSpeed.options[0].textContent=`Lot · ${lightFlight.rate} ×`;else panelSpeed.value=String(speed);}}
const loader=new THREE.TextureLoader(),textures={},textureRequests=new Set(),moonMaps={};const textureManifest={mercury:'/textures/mercury.jpg',venus:'/textures/venus.jpg',earth:'/textures/earth.jpg',mars:'/textures/mars.jpg',jupiter:'/textures/jupiter.jpg',saturn:'/textures/saturn.jpg',uranus:'/textures/uranus.jpg',neptune:'/textures/neptune.jpg','proxima-centauri-b':'/textures/exoplanets/proxima-centauri-b.png','trappist-1-e':'/textures/exoplanets/trappist-1-e.png','51-pegasi-b':'/textures/exoplanets/51-pegasi-b.png','55-cancri-e':'/textures/exoplanets/55-cancri-e.png'};const textureAnisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());function configureTexture(map){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=textureAnisotropy;map.wrapS=THREE.RepeatWrapping;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;return map}function loadTexture(key,onLoad){if(textures[key]){onLoad?.(textures[key]);return textures[key]}const path=textureManifest[key];if(!path)return null;const map=loader.load(path,loaded=>onLoad?.(loaded));textures[key]=configureTexture(map);return map}function requestSurfaceTexture(b){const key=b.textureKey||b.key;if(!textureManifest[key]||textureRequests.has(key))return;textureRequests.add(key);loadTexture(key,map=>{textureRequests.delete(key);for(const candidate of bs)if((candidate.textureKey||candidate.key)===key){const material=views.get(candidate.id)?.mesh.material;if(material){material.map=map;material.color.set('#ffffff');material.needsUpdate=true}}})}function requestMoonTexture(b){const profile=moonAppearance[b.name],path=profile&&moonMapPath(profile);if(!profile||!path||moonMaps[profile.id]||textureRequests.has(path))return;textureRequests.add(path);const map=loader.load(path,loaded=>{textureRequests.delete(path);moonMaps[profile.id]=configureTexture(loaded);for(const candidate of bs)if(candidate.name===b.name){const material=views.get(candidate.id)?.mesh.material;if(material){applyMoonAppearance(material,candidate,moonMaps);material.needsUpdate=true}}});moonMaps[profile.id]=configureTexture(map)}function requestDetailTexture(b){if(b.key==='moon')requestMoonTexture(b);else requestSurfaceTexture(b)}
const vector=(a)=>new THREE.Vector3(...a);
function mapped(p){const v=vector(p),r=v.length();return r?v.multiplyScalar(sceneRadius(r,compressed)/r):v}
function displayed(b){if(lightFlight){const stop=flightStops.find(s=>s.id===b.id);if(stop)return mapped(lightFlight.origin).addScaledVector(vector(lightFlight.direction),stop.distance*6);if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host)return displayed(host).add(flightTrueScale?vector(b.p).sub(vector(host.p)).multiplyScalar(6):vector(b.p).sub(vector(host.p)).normalize().multiplyScalar(radius(host)*2.5))}if(b.key==='sun')return mapped(lightFlight.origin);}if(!compressed)return mapped(b.p);if(b.collisionScenario){const target=bs.find(candidate=>candidate.id===b.collisionScenario.targetId);if(target){const direction=vector(b.collisionScenario.visualDirection||[1,0,0]).normalize(),contactRadius=radius(b)+radius(target),separation=scenarioVisualSeparation(b.collisionScenario,elapsed,contactRadius);return displayed(target).addScaledVector(direction,separation)}}if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host){const d=vector(b.p).sub(vector(host.p)),r=d.length();return displayed(host).add(d.multiplyScalar(r?((radius(host)*1.8+Math.pow(r*AU/200000,.55)*.8)/r):1))}}return mapped(b.p)}
function radius(b){if(lightFlight){if(flightTrueScale)return b.radius/AU*6;if(b.key==='sun')return .12;if(b.key==='neutron-star')return .04;if(b.parent)return .008;return .018+.095*Math.pow(b.radius/69911,.6)}if(!compressed)return b.radius/AU*6;if(b.key==='sun')return 1.02;if(b.key==='blackhole')return .5*Math.pow(b.mass,.15);if(b.key==='neutron-star')return .055;if(b.parent)return b.irregular?.029:Math.max(.035,b.radius/22000);if(b.key==='comet')return b.cometProfile==='halley'?.083:.055;if(b.key==='fragment')return .035+.16*Math.pow(b.radius/69911,.5);return .10+.57*Math.pow(b.radius/69911,.62)}
const sphere=shapeGeometry('high');
function addView(b){const group=new THREE.Group();scene.add(group);const authoredGeometry=keepsAuthoredGeometry(b);let geo=shapeGeometry('medium');if(b.key==='comet'||b.key==='fragment'&&b.irregular)geo=cometNucleusGeometry(b.id,12,b.cometProfile);else if(b.irregular){geo=new THREE.IcosahedronGeometry(1,3);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),f=1+.12*Math.sin(x*18+y*13+z*8)+.05*Math.sin(x*37+y*29+z*23);a.setXYZ(i,x*f*1.3,y*f*.78,z*f)}geo.computeVertexNormals()}
 const textureKey=b.textureKey||b.key;const surfaceMap=textures[textureKey]||null;const mat=b.key==='sun'?new THREE.MeshBasicMaterial({color:new THREE.Color('#ffffff').multiplyScalar(24),toneMapped:true}):new THREE.MeshStandardMaterial({map:b.key==='moon'?null:surfaceMap,color:surfaceMap?'#ffffff':b.key==='moon'?b.color:b.key==='blackhole'?'#000000':b.key==='neutron-star'?'#d6efff':b.color||'#ffffff',roughness:b.key==='neutron-star'?.34:1,metalness:0,emissive:b.key==='neutron-star'?'#2570a8':'#000000',emissiveIntensity:b.key==='neutron-star'?.75:0});if(b.key==='blackhole')mat.map=null;if(b.key==='comet'){mat.map=null;applyCometAppearance(mat,b.cometProfile)}if(b.textureKey&&!surfaceMap){mat.map=null;mat.color.set(b.gas?'#b0aaa0':'#77736c')}naturalColorMaterial(mat,b.key);applyMoonAppearance(mat,b,moonMaps);makeOpaqueSurface(mat);
 const axis=new THREE.Group();axis.rotation.z=THREE.MathUtils.degToRad(b.tilt);group.add(axis);const mesh=new THREE.Mesh(geo,mat);const eclipseShadow=participatesInSolarShadow(b)?applyExtendedSolarShadow(mat):null;mesh.castShadow=participatesInSolarShadow(b);mesh.receiveShadow=!eclipseShadow;if(b.key==='comet'){mesh.renderOrder=1;mesh.frustumCulled=false}axis.add(mesh);mesh.userData.id=b.id;const spots=b.key==='sun'?createSolarSpots():null;if(spots)mesh.add(spots);
 let halo=null; // Solar glare is generated from visible HDR pixels, not an unoccluded billboard.
 if(b.key==='earth'){const atmo=new THREE.Mesh(sphere,new THREE.ShaderMaterial({vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-max(dot(n,v),0.),4.);gl_FragColor=vec4(.18,.46,.9,a*.38);}',transparent:true,depthWrite:false}));atmo.scale.setScalar(1.035);mesh.add(atmo)}
 let ringEclipseShadow=null;if(['saturn','uranus'].includes(b.key)){const ringGeo=new THREE.RingGeometry(1.35,b.key==='uranus'?1.9:2.35,160,6);const arr=ringGeo.attributes.position,colors=[];for(let i=0;i<arr.count;i++){const r=Math.hypot(arr.getX(i),arr.getY(i)),f=.55+.28*Math.sin(r*100)+.13*Math.sin(r*270);const c=new THREE.Color(b.key==='uranus'?'#555555':'#bcb5a5').multiplyScalar(f);colors.push(c.r,c.g,c.b)}ringGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const ringMaterial=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:b.key==='uranus'?.25:.65});ringEclipseShadow=applyExtendedSolarShadow(ringMaterial);const ring=new THREE.Mesh(ringGeo,ringMaterial);ring.castShadow=true;ring.receiveShadow=false;ring.rotation.x=Math.PI/2;mesh.add(ring)}const blackHoleVisual=b.key==='blackhole'?createBlackHoleVisual():null;if(blackHoleVisual)mesh.add(blackHoleVisual.group);const neutronStarVisual=b.key==='neutron-star'?createNeutronStarVisual(b):null;if(neutronStarVisual)mesh.add(neutronStarVisual.group);
 const orbit=createOrbitRibbon({color:b.color,opacity:b.parent?.13:.3});scene.add(orbit);
 const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(512*3),3).setUsage(THREE.DynamicDrawUsage));trailGeo.setDrawRange(0,0);const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:.3}));trail.frustumCulled=false;scene.add(trail);views.set(b.id,{group,axis,mesh,halo,spots,blackHoleVisual,neutronStarVisual,eclipseShadow,ringEclipseShadow,orbit,trail,history:[],lodLevel:authoredGeometry?null:'medium',irregular:authoredGeometry});}
function disposeView(id){const v=views.get(id);if(!v)return;scene.remove(v.group,v.orbit,v.trail);v.undamagedGeometry?.dispose();v.group.traverse(o=>{if(o.isMesh){if(!isShapeGeometry(o.geometry))o.geometry.dispose();o.material.dispose()}});v.orbit.geometry.dispose();v.orbit.material.dispose();v.trail.geometry.dispose();v.trail.material.dispose();views.delete(id);if(selected===id){selected=null;panel.hidden=true}if(follow===id)follow=null}
bs.forEach(addView);applySolarBrightness();
// Every solid is evaluated as an occulting disc in the current scene scale.
// The material receives only bodies whose apparent disc can touch the Sun;
// this keeps the per-fragment analytic eclipse calculation bounded even after
// the user creates many fragments.
function updateExtendedSolarShadows(){
 const sun=bs.find(body=>body.key==='sun'),sunView=sun&&views.get(sun.id);
 if(!sunView)return;
 const sourcePosition=sunView.group.position,sourceRadius=sunView.mesh.scale.x||radius(sun);
 const occluders=bs.filter(participatesInSolarShadow).map(body=>{
  const view=views.get(body.id);return view&&{id:body.id,position:view.group.position,radius:view.mesh.scale.x||radius(body)};
 }).filter(Boolean);
 for(const body of bs){
  const view=views.get(body.id);if(!view?.eclipseShadow&&!view?.ringEclipseShadow)continue;
  const candidates=solarOccludersForReceiver(view.group.position,sourcePosition,sourceRadius,occluders,body.id);
  const state={sourcePosition,sourceRadius,occluders:candidates,viewMatrix:camera.matrixWorldInverse};
  view.eclipseShadow?.update(state);view.ringEclipseShadow?.update(state);
 }
}
let asteroidSeed=72831;const asteroidRandom=()=>{asteroidSeed=(asteroidSeed*1664525+1013904223)>>>0;return asteroidSeed/4294967296};
const asteroidBelt=createAsteroidBelt({random:asteroidRandom});const asteroidDensity=()=>{const distance=camera.position.distanceTo(controls.target);return distance<9?1:distance<20?.62:.28};asteroidBelt.update(elapsed,mapped,compressed,asteroidDensity());scene.add(asteroidBelt.mesh);
const selection=new THREE.Mesh(new THREE.RingGeometry(1.25,1.263,100),new THREE.MeshBasicMaterial({color:'#c7d9ef',transparent:true,opacity:.65,side:THREE.DoubleSide,depthTest:false}));selection.visible=false;scene.add(selection);
function updateOrbits(){if(lightFlight){for(const v of views.values()){v.orbit.visible=false;v.trail.visible=false}return}for(const b of bs){const view=views.get(b.id),host=bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun');if(!host||host===b){view.orbit.visible=false;continue}const r=vector(b.p).sub(vector(host.p)),v=vector(b.v).sub(vector(host.v)),mu=G*(host.mass+b.mass),h=r.clone().cross(v),ev=v.clone().cross(h).divideScalar(mu).sub(r.clone().normalize()),e=ev.length(),p=h.lengthSq()/mu;if(!Number.isFinite(p)||p<1e-12){view.orbit.visible=false;continue}const x=e>.00001?ev.normalize():r.clone().normalize(),y=h.normalize().cross(x).normalize();const max=e<1?Math.PI:Math.acos(-1/e)*.96,path=[];for(let i=0;i<257;i++){const t=-max+i/256*max*2,rr=Math.min(200,p/(1+e*Math.cos(t))),pos=x.clone().multiplyScalar(rr*Math.cos(t)).addScaledVector(y,rr*Math.sin(t)).add(vector(host.p));let out;if(b.parent&&compressed){out=displayed(host).add(pos.sub(vector(host.p)).normalize().multiplyScalar(radius(host)*1.8+Math.pow(rr*AU/200000,.55)*.8))}else out=mapped(pos.toArray());path.push(out)}view.orbit.material.opacity=compressed?(b.parent?.13:.3):(b.parent?.035:.07);updateOrbitRibbon(view.orbit,path,camera,innerHeight,{realScale:!compressed});view.orbit.visible=true;}}
updateOrbits();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let down=null,lastTouchTimer,hoveredConstellation=null,hoveredDeepSky=null;
function pointRay(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera)}
function hit(e){pointRay(e);const hits=ray.intersectObjects([...views.values()].map(v=>v.mesh),false);return hits[0]?.object.userData.id||null}
function location(e){pointRay(e);const pos=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,pos))pos.copy(controls.target);const r=pos.length();return r?pos.multiplyScalar(auRadius(r,compressed)/r):pos}
renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};if(e.pointerType==='touch')lastTouchTimer=setTimeout(()=>{spawnAt.copy(location(e));showSpawner()},650)});
renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)clearTimeout(lastTouchTimer);if(e.buttons){hoveredConstellation=null;hoveredDeepSky=null;sky.clearConstellationHighlight();sky.clearDeepSkyHighlight();tip.hidden=true;return}const id=hit(e),deepSky=id?null:showDeepSkyMarkers?sky.pickDeepSkyMarker(e,camera,renderer.domElement):null,constellation=id||deepSky?null:showConstellations?sky.pickConstellation(e,camera,renderer.domElement):null;hoveredConstellation=constellation;hoveredDeepSky=deepSky;if(id||deepSky||!constellation)sky.clearConstellationHighlight();if(id||constellation||!deepSky)sky.clearDeepSkyHighlight();renderer.domElement.style.cursor=id||constellation||deepSky?'pointer':'grab';tip.hidden=!id&&!constellation&&!deepSky;if(id||constellation||deepSky){tip.textContent=id?bs.find(b=>b.id===id)?.name:deepSky?deepSky.label:constellationLabel(constellation,getLanguage());tip.style.left=Math.min(innerWidth-180,e.clientX+16)+'px';tip.style.top=(e.clientY+16)+'px'}});
renderer.domElement.addEventListener('pointerleave',()=>{hoveredConstellation=null;hoveredDeepSky=null;sky.clearConstellationHighlight();sky.clearDeepSkyHighlight();tip.hidden=true});
document.addEventListener('languagechange',()=>{if(hoveredConstellation&&!tip.hidden)tip.textContent=constellationLabel(hoveredConstellation,getLanguage())});
document.addEventListener('languagechange',()=>{if(panel.hidden||!skySubject)return;const subject=skySubject;if(subject.kind==='constellation')showConstellation(subject.entry);else showDeepSky(subject.entry)});
renderer.domElement.addEventListener('pointerup',e=>{clearTimeout(lastTouchTimer);if(lightFlight||e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return}down=null;const id=hit(e);
 // Picking again rather than trusting the hover state, which a touch pointer
 // never produces. A marker or a figure under the cursor opens its own sheet;
 // only genuinely empty sky falls through to the body spawner.
 const deepSky=id?null:showDeepSkyMarkers?sky.pickDeepSkyMarker(e,camera,renderer.domElement):null;
 const constellation=id||deepSky?null:showConstellations?sky.pickConstellation(e,camera,renderer.domElement):null;
 if(id){selected=id;showBody()}else if(deepSky)showDeepSky(deepSky);else if(constellation)showConstellation(constellation);else{spawnAt.copy(location(e));showSpawner()}tip.hidden=true});
renderer.domElement.addEventListener('dblclick',e=>{const id=hit(e);if(id)focusBody(id)});
function shell(title,content){preview.clear();restoreFocus=document.activeElement;panel.innerHTML=`<div class="panel-head"><h2>${title}</h2><button class="close" aria-label="Zamknij">×</button></div>${content}`;panel.hidden=false;panel.querySelector('.close').onclick=closePanel}
function closePanel(){preview.clear();panel.hidden=true;selected=null;skySubject=null;restoreFocus?.focus?.()}
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
function showBody(){if(lightFlight){const id=selected;stopLightFlight();selected=id}const b=bs.find(x=>x.id===selected);if(!b)return;requestDetailTexture(b);const velocity=b.v.map(x=>x*AU/86400),primary=b.key==='sun'?null:bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun'),orbitalVelocity=primary?relativeVelocity(b,primary):b.v,speedMagnitude=velocityKmPerSecond(orbitalVelocity),speedLabel=b.key==='sun'?'Prędkość barycentryczna · km/s':b.parent?'Prędkość względem planety · km/s':'Prędkość względem Słońca · km/s',magneticField=b.key==='neutron-star'?row('Pole magnetyczne · T',`<output class="value-readout">${formatNumber(b.magneticField,3)}</output>`):'';shell(b.name,`${temperatureMarkup(b)}${row('Masa · kg',num('mass',b.mass*SOLAR_MASS))}${row(b.key==='blackhole'?'Horyzont · km':'Promień · km',num('radius',b.radius))}${row(speedLabel,`<output class="value-readout">${formatNumber(speedMagnitude,3)}</output>`)}${magneticField}${primary?row('Punkt odniesienia',`<output class="value-readout">${primary.name}</output>`):''}${row('Obrót · godz.',num('spin',b.spin))}${row('Nachylenie osi · °',num('tilt',b.tilt))}${vecFields('p',b.p,'Położenie X / Y / Z · AU')}${vecFields('v',velocity,'Prędkość X / Y / Z · km/s')}<div class="actions"><button class="action primary" id="apply">Zastosuj</button><button class="action" id="focus">Śledź</button></div><div class="separator"></div>${row('Zamień orbitę',`<select id="swap"><option value="">Wybierz ciało</option>${bs.filter(x=>x.a&&x.id!==b.id).map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select>`)}<div class="actions"><button class="action" id="tools">Symulacja</button><button class="action danger" id="remove">Usuń</button></div><p class="muted" id="validation" role="status"></p>`);
 if(b.key==='blackhole'){const r=document.querySelector('#radius');r.setAttribute('aria-label','Horyzont · km');r.readOnly=true;document.querySelector('#mass').oninput=e=>r.value=horizonRadius(+e.target.value)}
 if(views.get(b.id)?.lastImpactAxis){const button=document.createElement('button');button.className='action';button.textContent='Pokaż miejsce uderzenia';button.onclick=()=>{focusBody(b.id);const view=views.get(b.id);view.mesh.updateWorldMatrix(true,false);const direction=view.lastImpactAxis.clone().applyQuaternion(view.mesh.getWorldQuaternion(new THREE.Quaternion()));camera.position.copy(displayed(b)).addScaledVector(direction,Math.max(radius(b)*4,controls.minDistance*2));controls.target.copy(displayed(b));controls.update()};panel.querySelector('.actions').append(button)}
 const appearance=moonAppearance[b.name];if(b.key==='moon'&&appearance){const note=document.createElement('p');note.className='muted appearance-note';note.append(document.createTextNode(appearance.unknown?'Szczegóły powierzchni nieznane':appearance.haze?'Atmosfera w świetle widzialnym · barwa przybliżona':appearance.map?'Mapa misji · barwa przybliżona':'Wygląd orientacyjny · brak pełnej mapy'));const links=document.createElement('span');links.textContent=' · ';appearance.sources.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`[${i+1}]`;a.setAttribute('aria-label',`Zdjęcia i źródła ${i+1}`);links.append(a)});note.append(links);panel.querySelector('.panel-head').after(note)}
 if(b.textureKey){const note=document.createElement('p');note.className='muted appearance-note';note.textContent='Wizualizacja naukowa · tekstura symulowana';if(b.visualSource){const link=document.createElement('a');link.href=b.visualSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · Materiały źródłowe ↗';note.append(link)}panel.querySelector('.panel-head').after(note)}
 const previewLighting=body=>{const sun=bs.find(candidate=>candidate.key==='sun');return {sunDirection:sun?displayed(sun).sub(displayed(body)):null,brightness:solarBrightness}};const previewHost=document.createElement('div');previewHost.className='body-preview';panel.querySelector('.panel-head').prepend(previewHost);preview.attach(previewHost,b,views.get(b.id),previewLighting(b));
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
function launchCollisionScenario(scenario){
 const target=scenario&&findScenarioTarget(bs,scenario);if(!scenario||!target)return;
 const id=scenario.id,existing=bs.find(item=>item.scenarioId===id);if(existing){bs=bs.filter(item=>item!==existing);disposeView(existing.id)}
 const preset=catalog.find(item=>item.id===scenario.projectile),state=collisionLaunchState(target,scenario);
 const projectile=createCatalogBody(preset.id,{massKg:preset.mass*SOLAR_MASS,radiusKm:preset.radius,p:state.p,v:state.v});
 projectile.name=`${preset.name} → ${target.name}`;projectile.scenarioId=id;projectile.collisionScenario={targetId:target.id,launchElapsed:elapsed,minDurationDays:state.impactDays,visualDirection:state.direction,visualApproachSpan:Math.max(2.6,radius(target)*8)};bs.push(projectile);addView(projectile);selected=projectile.id;paused=false;updateOrbits();focusBody(projectile.id,{keepPanel:true});
}
function showCollisionLauncher(){
 const options=collisionScenarios.map(item=>`<option value="${item.id}">${item.name}</option>`).join('');
 // Anything in the catalogue may be thrown, and anything in the scene may be
 // hit, including a body the viewer added a moment ago. Grouping mirrors the
 // spawner so the same object is found in the same place in both panels.
 const groups=[...new Set(catalog.map(item=>item.group))];
 const projectiles=groups.map(group=>`<optgroup label="${group}">${catalog.filter(item=>item.group===group).map(item=>`<option value="${item.id}">${item.name}</option>`).join('')}</optgroup>`).join('');
 // Default to Earth when it is still there: the Sun merely happens to be first
 // in the body list, and is nobody's first choice of thing to aim at.
 const preferred=bs.find(item=>item.key==='earth')||bs[1]||bs[0];
 const targets=bs.map(item=>`<option value="${item.id}"${item===preferred?' selected':''}>${item.name}</option>`).join('');
 shell('Kurs kolizyjny',`${row('Scenariusz',`<select id="collision-scenario">${options}</select>`)}<p class="muted">Obiekty są tworzone z katalogowymi rozmiarami i masą. Wektor prędkości jest ustawiony na środek celu.</p><div class="actions"><button class="action primary" id="launch-collision">Uruchom</button></div><div class="separator"></div><label class="field-title">Własny kurs</label>${row('Pocisk',`<select id="custom-projectile">${projectiles}</select>`)}${row('Cel',`<select id="custom-target">${targets}</select>`)}${row('Prędkość · km/s',`<input id="custom-speed" type="number" min="0.1" step="0.1" value="${DEFAULT_IMPACT_SPEED_KMS}" aria-label="Prędkość zderzenia · km/s">`)}<p class="muted" id="custom-note"></p><div class="actions"><button class="action primary" id="launch-custom">Uruchom własny</button><button class="action" id="tools">Symulacja</button></div>`);
 const scenarioOf=id=>collisionScenarios.find(item=>item.id===id);
 document.querySelector('#launch-collision').onclick=()=>launchCollisionScenario(scenarioOf(document.querySelector('#collision-scenario').value));
 document.querySelector('#launch-custom').onclick=()=>{
  const preset=catalog.find(item=>item.id===document.querySelector('#custom-projectile').value);
  const target=bs.find(item=>item.id===+document.querySelector('#custom-target').value);
  const note=document.querySelector('#custom-note');
  if(!preset||!target){note.textContent='Wybierz pocisk i cel.';return}
  const speed=clampImpactSpeed(document.querySelector('#custom-speed').value);
  document.querySelector('#custom-speed').value=String(speed);
  note.textContent='';
  launchCollisionScenario(buildCustomScenario({projectileId:preset.id,projectileName:preset.name,target,speedKmS:speed}));
 };
 document.querySelector('#tools').onclick=showTools;
}
collisionCourseButton.onclick=showCollisionLauncher;
function showTools(){selected=null;shell('Symulacja',`<div class="tools"><button id="pause" aria-label="Pauza">${paused?'▶':'Ⅱ'}</button><button id="zoom-in" aria-label="Przybliż">＋</button><button id="zoom-out" aria-label="Oddal">−</button><button id="home" aria-label="Domyślny widok">⌖</button></div>${row('Tempo',`<select id="speed">${lightFlight?`<option selected>Lot · ${lightFlight.rate} ×</option>`:''}${[.02,.1,.5,2,10,50,100,200,365].map(s=>`<option value="${s}" ${s===speed?'selected':''}>${s} dni / s</option>`).join('')}</select>`)}${row('Widok',`<select id="scale"><option value="visual" ${compressed?'selected':''}>Czytelny</option><option value="real" ${!compressed?'selected':''}>Rzeczywista skala</option></select>`)}<div class="actions"><button class="action" id="light-start">${lightFlight?'Zakończ lot światła':'Symulacja prędkości światła'}</button></div><div class="actions"><button class="action" id="add">Dodaj ciało</button><button class="action" id="custom-blackhole">Własna czarna dziura</button><button class="action danger" id="restart">Od nowa</button></div>`);document.querySelector('#pause').onclick=e=>{setPaused(!paused);e.target.textContent=paused?'▶':'Ⅱ'};document.querySelector('#light-start').onclick=()=>lightFlight?stopLightFlight():startLightFlight();for(const id of ['speed','scale','zoom-in','zoom-out','home'])document.getElementById(id).disabled=!!lightFlight;document.querySelector('#zoom-in').onclick=()=>camera.position.lerp(controls.target,.25);document.querySelector('#zoom-out').onclick=()=>camera.position.sub(controls.target).multiplyScalar(1.3).add(controls.target);document.querySelector('#home').onclick=resetView;document.querySelector('#speed').onchange=e=>setSimulationSpeed(e.target.value);document.querySelector('#scale').onchange=e=>setScaleMode(e.target.value==='visual');document.querySelector('#add').onclick=()=>{spawnAt.set(2,0,0);showSpawner()};document.querySelector('#custom-blackhole').onclick=()=>{spawnAt.set(2,0,0);showSpawner('custom-blackhole')};document.querySelector('#restart').onclick=restart;}
function setConstellationsVisible(visible){showConstellations=visible;sky.setConstellations(visible);const checkbox=document.querySelector('#constellations');if(checkbox)checkbox.checked=visible;}
function setDeepSkyMarkersVisible(visible){showDeepSkyMarkers=visible;sky.setDeepSkyMarkers(visible);const checkbox=document.querySelector('#deep-sky-markers');if(checkbox)checkbox.checked=visible;}
function focusSkyTarget(direction){if(lightFlight)stopLightFlight();follow=null;const target=camera.position.clone().add(direction.clone().normalize().multiplyScalar(100));controls.target.copy(target);controls.update();}
// A sky object has no simulated state to edit, so its panel is a read-only
// sheet: measured values from the catalogues, then a note about what is there.
const skyRow=(label,value)=>row(label,`<output class="value-readout">${value}</output>`);
let skySubject=null;
function skyPanel(title,rows,note,source){
 // The note is already written in the viewer's language, so the interface
 // phrase substituter must leave it alone; it only knows single labels.
 shell(title,`${rows.join('')}${note?`<p class="sky-note" data-no-translate>${note}</p>`:''}<p class="muted">${source}</p><div class="actions"><button class="action primary" id="sky-center">Wyśrodkuj</button></div>`);
}
function showConstellation(entry){
 skySubject={kind:'constellation',entry};
 focusSkyTarget(entry.target);
 const star=entry.star,brightest=star?(star.name?`${star.name} · ${formatNumber(star.magnitude,2)} mag`:`${formatNumber(star.magnitude,2)} mag`):'—';
 const [ra,dec]=equatorialFromDirection(entry.target.toArray());
 skyPanel(constellationLabel(entry,getLanguage()),[
  skyRow('Skrót IAU',entry.id),
  skyRow('Najjaśniejsza gwiazda figury',brightest),
  skyRow('Rektascensja',formatRightAscension(ra)),
  skyRow('Deklinacja',formatDeclination(dec))
 ],constellationNote(entry.name,getLanguage()),'Figura gwiazdozbioru wg d3-celestial · gwiazda z katalogu sceny');
 document.querySelector('#sky-center').onclick=()=>focusSkyTarget(entry.target);
}
function showDeepSky(object){
 skySubject={kind:'deep-sky',entry:object};
 focusSkyTarget(object.target);
 skyPanel(`${object.label} · ${object.id}`,[
  skyRow('Rodzaj',translate(deepSkyKind(object))),
  ...(object.type==='pos'?[]:[skyRow('Jasność wizualna',`${formatNumber(object.mag,1)} mag`)]),
  skyRow('Rozmiar kątowy',formatAngularSize(object.arcmin)),
  skyRow('Rektascensja',formatRightAscension(object.ra)),
  skyRow('Deklinacja',formatDeclination(object.dec))
 ],deepSkyNote(object.id,getLanguage()),'Współrzędne i jasności z katalogu obiektów sceny');
 document.querySelector('#sky-center').onclick=()=>focusSkyTarget(object.target);
}
function setupBodySearch(){
 const input=document.querySelector('#body-search'),list=document.querySelector('#body-results');
 let matches=[],active=-1;
 const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l').toLowerCase();
 const escapeHtml=value=>String(value).replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]));
 function targets(query){const needle=normalize(query.trim()),all=[...bs.map(body=>({kind:'body',key:`body:${body.id}`,body,label:translate(body.name),type:translate(bodyKind(body,bs))})),...sky.getConstellations().map(entry=>({kind:'constellation',key:`constellation:${entry.start}`,entry,label:constellationLabel(entry,getLanguage()),type:translate('Gwiazdozbiór')})),...sky.getDeepSkyObjects().map(entry=>({kind:'deep-sky',key:`deep-sky:${entry.id}`,entry,label:entry.label,type:translate(deepSkyKind(entry))}))];return needle?all.filter(item=>normalize(`${item.label} ${item.type} ${item.entry?.id||''}`).includes(needle)):all;}
 function render(query){matches=targets(query);active=-1;list.innerHTML=matches.length?matches.map(item=>`<li role="option" id="body-result-${item.key}" data-key="${item.key}">${escapeHtml(item.label)}<span class="body-kind">${item.type}</span></li>`).join(''):'<li class="empty">Brak wyników.</li>';list.hidden=false;input.setAttribute('aria-expanded','true');input.removeAttribute('aria-activedescendant')}
 function highlight(i){const items=[...list.children].filter(el=>el.dataset.key);items.forEach(el=>el.classList.remove('active'));const el=items[i];if(el){el.classList.add('active');el.scrollIntoView({block:'nearest'});input.setAttribute('aria-activedescendant',el.id)}active=i}
 function pick(item){if(!item)return;if(item.kind==='body'){selected=item.body.id;focusBody(item.body.id,{keepPanel:true});showBody();return}if(item.kind==='constellation'){setConstellationsVisible(true);showConstellation(item.entry);return}setDeepSkyMarkersVisible(true);showDeepSky(item.entry);}
 input.addEventListener('focus',()=>render(input.value));
 input.addEventListener('input',()=>render(input.value));
 input.addEventListener('blur',()=>setTimeout(()=>{list.hidden=true;input.setAttribute('aria-expanded','false')},120));
 input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();if(matches.length)highlight(Math.min(active+1,matches.length-1))}else if(e.key==='ArrowUp'){e.preventDefault();if(matches.length)highlight(Math.max(active-1,0))}else if(e.key==='Enter'){e.preventDefault();pick(matches[active]||matches[0])}else if(e.key==='Escape'){if(input.value){input.value='';render('')}else input.blur()}});
 list.addEventListener('mousedown',e=>{const li=e.target.closest('[data-key]');if(li){e.preventDefault();pick(matches.find(item=>item.key===li.dataset.key))}});
}
function focusBody(id,{keepPanel=false}={}){if(lightFlight)stopLightFlight();follow=id;const b=bs.find(x=>x.id===id),target=displayed(b),distance=Math.max(radius(b)*3,compressed?.3:.00001);controls.target.copy(target);if(b.key==='comet'){const sun=bs.find(candidate=>candidate.key==='sun'),sunward=sun?displayed(sun).sub(target).normalize():new THREE.Vector3(0,0,1),side=new THREE.Vector3(0,1,0).cross(sunward).normalize();camera.position.copy(target).addScaledVector(sunward,distance*4.3).addScaledVector(side,distance*1.4)}else camera.position.copy(target).add(new THREE.Vector3(0,2,4).multiplyScalar(distance));if(!keepPanel)panel.hidden=true}
const navigation=createNavigation({camera,controls,element:renderer.domElement,blocked:()=>!!lightFlight||!panel.hidden,onMove:()=>{follow=null;tip.hidden=true},pace:()=>{let distance=Infinity;for(const b of bs)distance=Math.min(distance,Math.max(0,camera.position.distanceTo(displayed(b))-radius(b)));return Math.max(compressed?.08:.000002,Math.min(40,distance*.6))}});
function resetView(){navigation.reset();camera.fov=43;camera.updateProjectionMatrix();if(lightFlight)stopLightFlight();follow=null;controls.enabled=true;controls.enableDamping=false;controls.maxDistance=maxViewDistance(compressed);camera.position.copy(home).multiplyScalar(scaleRatio(home.length(),true,compressed));controls.target.set(0,0,0);controls.update();controls.enableDamping=true;closePanel()}
function clearTrails(){for(const v of views.values()){v.history=[];v.trail.geometry.setDrawRange(0,0)}}
function restart(){lightFlight=null;flightPrevious=null;flightStops=[];flightTrueScale=false;flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;controls.enabled=true;lag=0;last=performance.now();spawnAt.set(0,0,0);selected=null;follow=null;down=null;clearTimeout(lastTouchTimer);tip.hidden=true;selection.visible=false;preview.clear();impactEffects.clear();tidalStreams.clear();[...views.keys()].forEach(disposeView);epoch=new Date();bs=initialSystem(epoch);bs.forEach(addView);solarBrightness=100;solarInfall=0;applySolarBrightness();cometTails.clear();elapsed=0;paused=false;speed=2;compressed=true;updateOrbits();resetView()}
document.querySelector('#logo').onclick=()=>panel.hidden?showTools():closePanel();document.querySelector('#reset').onclick=restart;
window.addEventListener('keydown',e=>{if(e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'&&e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();setPaused(!paused);if(!panel.hidden)showTools()}if(e.key==='Escape'){if(lightFlight)stopLightFlight();closePanel()};if(e.key.toLowerCase()==='r')restart();if(e.key.toLowerCase()==='n'){spawnAt.set(2,0,0);showSpawner()}if(e.key.toLowerCase()==='t')showTools()});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);sky.setViewport(innerWidth,innerHeight);layoutRail()});

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
function stopLightFlight(){if(!lightFlight)return;lightFlight=null;flightStops=[];flightTrueScale=false;flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;flightRail.hidden=true;camera.fov=43;camera.updateProjectionMatrix();controls.enabled=true;const previous=flightPrevious;flightPrevious=null;speed=previous.speed;compressed=previous.compressed;paused=previous.paused;controls.maxDistance=maxViewDistance(compressed);lag=0;last=performance.now();controls.enableDamping=false;camera.position.copy(previous.camera);controls.target.copy(previous.target);controls.update();controls.enableDamping=true;clearTrails();updateOrbits();if(!panel.hidden)showTools()}
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
  radiusOf:radius,
  span:compressed?.55:.9,
  time:now*.001
 });
}
let last=performance.now(),frame=0,lag=0;
function handleCollisions(previous){const oldSelected=selected,oldFollow=follow,wasPanelVisible=!panel.hidden;const visual=compressed?captureCollisionView(bs,displayed,radius):null;const events=resolveCollisions(bs,{contactTest:visual?(a,b)=>scenarioCollisionReady(a,b,elapsed)&&viewContact(a,b,visual,previous):null,contactNormal:scenarioContactNormal});if(!events.length)return;preview.clear();for(const event of events){const survivorVisual=visual?.get(event.survivor),otherVisual=visual&&event.sourceIds.map(id=>visual.get(id)).find(item=>item&&item!==survivorVisual),planetaryImpact=event.kind==='impact'&&event.surface?.targetSurvives;const size=planetaryImpact?Math.max(.018,(survivorVisual?.r||.12)*.2):compressed?Math.max(.12,...event.sourceIds.map(id=>views.get(id)?.mesh.scale.x||.12)):event.radius/AU*6;const impactPosition=survivorVisual&&otherVisual?vector(survivorVisual.p).lerp(vector(otherVisual.p),survivorVisual.r/(survivorVisual.r+otherVisual.r)):mapped(event.p);for(const id of event.sourceIds){const body=bs.find(b=>b.id===id),view=views.get(id);if(body&&view){if(!view.irregular&&!view.hasDamageGeometry){view.mesh.geometry=shapeGeometry('high');view.lodLevel='high'}applyImpactDamage(view,body)}}const survivorView=views.get(event.survivor);impactEffects.add(event,impactPosition,size,planetaryImpact&&survivorView?{surfaceMesh:survivorView.mesh,surfaceAxis:survivorView.lastImpactAxis,surfaceRadius:survivorVisual?.r}:undefined);const selectedReplacement=collisionFocusTransfer(event,oldSelected),followReplacement=collisionFocusTransfer(event,oldFollow);event.removed.forEach(disposeView);for(const id of event.added)addView(bs.find(b=>b.id===id));selected=selectedReplacement;
 // The camera inherits the projectile's close-up distance, which for a comet is
 // a fraction of the planet it just struck; pull back far enough to see what
 // survived, keeping the viewing direction the impact was watched from.
 if(followReplacement!==oldFollow&&followReplacement!=null){const survivor=bs.find(item=>item.id===followReplacement);if(survivor){const target=displayed(survivor),offset=camera.position.clone().sub(controls.target);const wanted=framingDistance(radius(survivor),camera.fov);if(offset.lengthSq()>0&&wanted>offset.length())offset.setLength(wanted);controls.target.copy(target);camera.position.copy(target).add(offset);}}
 follow=followReplacement;}clearTrails();updateOrbits();if(selected&&wasPanelVisible)showBody();}
function animate(now){requestAnimationFrame(animate);const beforeElapsed=elapsed;const realDelta=Math.max(0,(now-last)/1000),delta=Math.min(realDelta,.05);last=now;if(!lightFlight&&!paused&&!document.hidden){lag+=realDelta*speed;let steps=0;const deadline=performance.now()+24;handleCollisions();while(lag>1e-12&&steps<4096){const previous=compressed?captureCollisionView(bs,displayed,radius):null;const config=fastStepSize(bs),dt=Math.min(lag,config.dt);if(config.split)splitStep(bs,dt,config.states);else step(bs,dt);lag-=dt;elapsed+=dt;steps++;handleCollisions(previous);if(steps%8===0&&performance.now()>deadline)break}}
 const blackHoles=bs.filter(body=>body.key==='blackhole'),tidalFlows=[];let nextSolarInfall=0;
 for(const b of bs){const v=views.get(b.id);updateSurfaceImpact(v,elapsed-beforeElapsed);v.group.position.copy(displayed(b));const baseRadius=radius(b);v.mesh.scale.setScalar(baseRadius);let strongestTide=0;for(const hole of blackHoles)if(hole!==b){const distance=vector(b.p).distanceTo(vector(hole.p)),tide=tidalStretch(b,hole,distance),stream=tidalStreamStrength(b,hole,distance);strongestTide=Math.max(strongestTide,tide);if(stream>.012)tidalFlows.push({id:`${b.id}:${hole.id}`,start:v.group.position.clone(),end:views.get(hole.id).group.position.clone(),strength:stream,color:b.key==='sun'?'#fff1c2':b.color||'#d9b38a'})}if(strongestTide){v.mesh.scale.set(baseRadius*(1+strongestTide*3.5),baseRadius*(1-strongestTide*.34),baseRadius*(1-strongestTide*.34));if(b.key==='sun')nextSolarInfall=Math.max(nextSolarInfall,strongestTide)}if(v.blackHoleVisual){const accretion=b.accretion;if(accretion){accretion.age=(accretion.age||0)+delta;accretion.fuel=Math.max(0,accretion.fuel-delta*.018)}v.blackHoleVisual.update(now*.001,accretion?.fuel||0,!!accretion?.jets,camera)}if(v.neutronStarVisual)v.neutronStarVisual.update(now*.001);updateShapeLod(v,camera,innerHeight);v.axis.rotation.z=b.tilt*Math.PI/180;v.mesh.rotation.y=((elapsed+(lightFlight?lightFlight.seconds(now)/86400:0))*24/b.spin*Math.PI*2)%(Math.PI*2);if(v.halo){v.halo.quaternion.copy(camera.quaternion);v.halo.scale.setScalar(baseRadius/1.02)};if(frame%8===0&&!paused&&!lightFlight){v.history.push(v.group.position.clone());if(v.history.length>512)v.history.shift();const a=v.trail.geometry.attributes.position;v.history.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z));a.needsUpdate=true;v.trail.geometry.setDrawRange(0,v.history.length);v.trail.visible=!b.parent;}}
 tidalStreams.update(tidalFlows,now*.001);
 if(Math.abs(nextSolarInfall-solarInfall)>.002){solarInfall=nextSolarInfall;applySolarBrightness()}
 const sun=bs.find(b=>b.key==='sun');sunlight.visible=!!sun;if(sun)sunlight.position.copy(displayed(sun));if(follow){const b=bs.find(x=>x.id===follow);if(b){const p=displayed(b),offset=camera.position.clone().sub(controls.target);controls.target.copy(p);camera.position.copy(p).add(offset)}}
 selection.visible=!!selected;const chosen=bs.find(x=>x.id===selected);if(chosen){selection.position.copy(displayed(chosen));selection.scale.setScalar(radius(chosen));selection.quaternion.copy(camera.quaternion)}
 if(frame%3===0)asteroidBelt.update(elapsed,mapped,compressed,asteroidDensity());updateCometDust(now);impactEffects.update(paused||lightFlight?0:delta,mapped,elapsed-beforeElapsed,id=>{const b=bs.find(b=>b.id===id);return b?displayed(b):null});if(!panel.hidden){const body=bs.find(b=>b.id===selected),sun=bs.find(b=>b.key==='sun');preview.update(body,{sunDirection:sun&&body?displayed(sun).sub(displayed(body)):null,brightness:solarBrightness});updateTemperatureReadout()}syncTimeDock();if(lightFlight)updateLightFlight(now);else{navigation.update(delta);controls.update();const orbitFrameStep=speed>=100?1:2;if(!paused&&frame%orbitFrameStep===0)updateOrbits()}camera.updateMatrixWorld();updateExtendedSolarShadows();if(frame%30===0)for(const b of bs){const view=views.get(b.id);if(view?.lodLevel==='high')requestDetailTexture(b)}updateBlackHoleLensing(blackHoleLensing,bs,views,camera,radius);for(const v of views.values())if(v.halo)v.halo.quaternion.copy(camera.quaternion);sky.update(camera);updateClock();const interior=lightFlight?solarInteriorState(lightFlight.distance(now),bs.find(b=>b.key==='sun')?.radius):null;interiorHud.hidden=!interior?.inside;flightLabels.hidden=!!interior?.inside;document.body.classList.toggle('inside-sun',!!interior?.inside);if(interior?.inside){document.querySelector('#interior-zone').textContent=interior.zone;document.querySelector('#interior-values').textContent=`${(interior.fraction*100).toLocaleString(getLocale(),{maximumFractionDigits:1})}% R☉ · T ≈ ${Number(interior.temperature.toPrecision(2)).toLocaleString(getLocale())} K`;solarInterior.render(renderer,interior,lightFlight.seconds(now),camera.aspect)}else composer.render();frame++}
installLanguageUI();
document.addEventListener('languagechange',()=>{dateFormat=new Intl.DateTimeFormat(getLocale(),{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});timeFormat=new Intl.DateTimeFormat(getLocale(),{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'});clockShown='';updateClock();layoutRail();if(!panel.hidden&&selected)showBody()});
requestAnimationFrame(animate);
// Exposed only as an explicit automation surface; no network or persistence.
window.solare={getState:()=>({paused,speed,elapsed,pendingDays:lag,compressed,lightFlight:lightFlight?{rate:lightFlight.rate,seconds:lightFlight.seconds(performance.now()),distanceAU:lightFlight.distance(performance.now())}:null,bodies:bs.map(b=>({id:b.id,name:b.name,mass:b.mass,p:[...b.p],v:[...b.v]}))}),reset:restart,pause:()=>setPaused(true),resume:()=>setPaused(false),startLightFlight,stopLightFlight};
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});for(const tool of [{name:'read_simulation',description:'Read current bodies, positions in AU and velocities in AU/day.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>window.solare.getState()},{name:'set_simulation_paused',description:'Pause or resume the current gravitational simulation.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(typeof input?.paused!=='boolean')throw new Error('paused must be a boolean');setPaused(input.paused);if(!panel.hidden)showTools();return {paused}}}]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}}
