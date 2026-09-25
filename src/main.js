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
import {applyCentralStarPreset,blackbodyColor,centralStarDetails,centralStars,effectiveLuminosity,starPreset,visualLuminosity} from './central-stars.js';
import {SOLAR_EVOLUTION_SECONDS,SOLAR_PHASES,SOLAR_RADIUS_KM,adiabaticExpansion,solarEvolutionBodyState,solarEvolutionState,solarPhaseNote} from './solar-evolution.js';
import {captureCollisionView,collisionFocusTransfer,framingDistance,viewContact} from './collision-view.js';
import {catalog,createCatalogBody,horizonRadius,validDimensions} from './catalog.js';
import {bodyKind} from './body-search.js';
import {constellationLabel,createSky,deepSkyKind,equatorialFromDirection,RADIUS as SKY_RADIUS} from './sky.js';
import {knownPlacesFor,wikipediaSubjectForPlace} from './surface-places.js';
import {deepSkyRingPixelRadius,projectedPoint,quaternionChanged,ringPixelRadius} from './sky-labels.js';
import {findOccluder} from './marker-occlusion.js';
import {nearestMarkerId} from './marker-hit.js';
import {constellationNote,deepSkyNote} from './sky-descriptions.js';
import {formatAngularSize,formatDeclination,formatRightAscension} from './sky-detail.js';
import {wikipediaReference,wikipediaSearchUrl,wikipediaTitle,wikipediaSubjectForBody,wikipediaSubjectForConstellation,wikipediaSubjectForDeepSky} from './wikipedia-reference.js';
import {applyCometAppearance,cometNucleusGeometry,createCometTails} from './comet.js';
import {fastStepSize,splitStep} from './fast-step.js';
import {STAR_SYSTEMS,orbitSpanAU,systemBodies,systemNote} from './star-systems.js';
import {systemBodyKey,systemBodyRadius,systemCameraDistance,systemDrawnExtent,systemLayout,systemMaxDistance} from './system-view.js';
import {angularDiameter,horizontal,rotatingBodies,skyObjects,surfaceFrame,synchronousFrame} from './surface-frame.js';
import {earthObserverCoordinates,isEarthSurface} from './surface-observer.js';
import {equirectangularSurfaceBasis} from './surface-texture-frame.js';
import {createSurfaceRadar} from './surface-radar.js';
import {moonIllumination,moonPhaseName} from './lunar-theory.js';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {G,AU,SOLAR_MASS,planets,initialSystem,body,relativeVelocity,step,stableStep,velocityKmPerSecond} from './physics.js';
import './style.css';
import {LightFlight,lightTravelSeconds,flightRouteProgress,flightRouteStopPosition} from './light-flight.js';
import {surfaceTemperatures} from './solar-thermal.js';
import {resolveCollisions} from './collisions.js';
import {changeSimulationRate} from './simulation-rate.js';
import {buildLandmarkMarkers,createBodyPreview} from './preview.js';
import {createImpactEffects} from './impact-effects.js';
import {isShapeGeometry,keepsAuthoredGeometry,shapeGeometry,updateShapeLod} from './scene-lod.js';
import {bodyAxes,largestAxis,measuredIrregularGeometry,hasMeasuredIrregularShape,surfaceRadialScale} from './body-shapes.js';
import {enterSurfaceDetail,leaveSurfaceDetail,surfaceReliefClearance,updateSurfaceDetailTiles} from './surface-detail.js';
import {nearestSurfaceFeature,terrainActivationRadius,topographyHeightKm} from './surface-topography.js';
import {createOrbitRibbon,updateOrbitRibbon} from './orbit-ribbon.js';
import {auRadius,maxViewDistance,satelliteOffset,scaleRatio,sceneRadius} from './scene-scale.js';
import {configureSolarShadow,participatesInSolarShadow} from './solar-shadows.js';
import {applyExtendedSolarShadow,solarOccludersForReceiver} from './extended-solar-shadow.js';
import {accretionStateFor,createBlackHoleVisual} from './black-hole.js';
import {createNeutronStarVisual} from './neutron-star.js';
import {createBlackHoleLensingPass,updateBlackHoleLensing} from './black-hole-lensing.js';
import {blackHoleFallState,createBlackHoleFallPass,updateBlackHoleFallPass} from './black-hole-fall.js';
import {tidalStretch,tidalStreamStrength} from './tidal-disruption.js';
import {createTidalStreams} from './tidal-stream.js';
import {asteroidBeltVisible,createAsteroidBelt} from './asteroid-belt.js';
import {DEFAULT_IMPACT_SPEED_KMS,buildCustomScenario,clampImpactSpeed,collisionScenarios,collisionLaunchState,findScenarioTarget,scenarioCollisionReady,scenarioContactNormal,scenarioContactSpeed,scenarioVisualSeparation} from './collision-scenarios.js';
import {SATURN_RING_INNER,SATURN_RING_BANDS,URANUS_RING_INNER,URANUS_RING_BANDS,ringBandAt,ringGrain} from './planet-rings.js';
import {createRingParticles} from './ring-particles.js';
import {spinAxis} from './planet-poles.js';
import {createIrregularMoonSwarm} from './irregular-moon-swarm.js';
import {applyRingPlanetShadow} from './ring-planet-shadow.js';
import {SOLAR_ECLIPSES,SOLAR_LEAD_MINUTES,formatEclipseDuration} from './solar-eclipses.js';
import {LUNAR_ECLIPSES,lunarEclipseLeadMinutes} from './lunar-eclipses.js';
import {createShareState,shareTokenFromLocation,shareUrl} from './share-state.js';
import {timelineEvents} from './event-timeline.js';
import {surfaceAtmosphere,surfaceLightLabel} from './surface-atmosphere.js';
import {createEarthCloudCover} from './earth-clouds.js';
import {moveSurfaceCoordinates,surfaceTraversalSpeed} from './surface-navigation.js';
import {educationMetrics,vectorLength} from './education-metrics.js';
import {CINEMATIC_DURATION_SECONDS,cinematicPose} from './cinematic-camera.js';
import {createAdaptiveQuality} from './adaptive-quality.js';
const mount=document.querySelector('#universe'),panel=document.querySelector('#panel'),tip=document.querySelector('#tooltip');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false,logarithmicDepthBuffer:true});renderer.setClearColor('#000000');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.NeutralToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;mount.append(renderer.domElement);renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Mapa 3D. Przeciągnij, aby obrócić. Kółko: zoom. WASD: lot i sterowanie myszą. Q/E: dół/góra. Shift: szybciej. Escape: zwolnij mysz i zamknij panel. Shift i lewy przycisk: przesuwanie. Kliknij ciało lub przestrzeń. Spacja: pauza.');
// Rates the clock can run at, in days per second of wall time. The slowest is
// real time, where the simulated clock keeps step with the one on the wall.
// That is what a surface view opens on - standing on the ground, the point is
// the sky as it is outside the window, and a system already spinning is no use
// there. Everywhere else the scene still opens at two days a second, because
// from outside a Solar System that does not visibly move is no use either.
const REAL_TIME=1/86400, MINUTE_PER_SECOND=1/1440;
const RATES=[REAL_TIME,MINUTE_PER_SECOND,.02,.1,.5,2,10,50,100,200,365];
const rateLabel=rate=>rate===REAL_TIME?'1 s / s':rate===MINUTE_PER_SECOND?'1 min / s':`${rate} dni / s`;
const rateOptions=(selected)=>RATES.map(rate=>`<option value="${rate}"${rate===selected?' selected':''}>${rateLabel(rate)}</option>`).join('');
const CAMERA_NEAR=.0000001;
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,CAMERA_NEAR,2000);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.065;controls.minDistance=.00001;controls.maxDistance=maxViewDistance(true);controls.zoomToCursor=true;controls.enablePan=true;controls.panSpeed=.7;
const educationGroup=new THREE.Group(),velocityArrow=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),new THREE.Vector3(),1,'#78c7ff'),gravityArrow=new THREE.ArrowHelper(new THREE.Vector3(-1,0,0),new THREE.Vector3(),1,'#ffd38c');educationGroup.add(velocityArrow,gravityArrow);educationGroup.visible=false;scene.add(educationGroup);
const educationHud=document.createElement('aside');educationHud.id='education-hud';educationHud.hidden=true;document.body.append(educationHud);
const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));const SOLAR_BLOOM_STRENGTH=.65,SOLAR_LIGHT_INTENSITY=Math.PI;const solarBloom=new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),SOLAR_BLOOM_STRENGTH,.45,2),blackHoleLensing=createBlackHoleLensingPass(ShaderPass),blackHoleFallPass=createBlackHoleFallPass(ShaderPass);composer.addPass(solarBloom);composer.addPass(blackHoleLensing);composer.addPass(blackHoleFallPass);composer.addPass(new OutputPass());
const adaptiveQuality=createAdaptiveQuality({maxDpr:Math.min(devicePixelRatio,2)});let adaptiveDetail=1;
const home=new THREE.Vector3(0,31,43).multiplyScalar(Math.max(1,1.15/(innerWidth/innerHeight)));camera.position.copy(home);controls.target.set(0,0,0);controls.update();const ambient=new THREE.AmbientLight('#ffffff',.035);const AMBIENT_BASE=.035;scene.add(ambient);const sunlight=new THREE.PointLight('#ffffff',SOLAR_LIGHT_INTENSITY,0,0);configureSolarShadow(sunlight,renderer);scene.add(sunlight);
const preview=createBodyPreview(),impactEffects=createImpactEffects(scene),tidalStreams=createTidalStreams(scene),solarInterior=createSolarInterior();
const interiorHud=document.createElement('aside');interiorHud.id='solar-interior';interiorHud.hidden=true;interiorHud.innerHTML='<span>Model wnętrza Słońca</span><strong id=interior-zone></strong><div id=interior-values></div><p>Przekrój edukacyjny. Plazma jest nieprzezroczysta; rzeczywiste fotony rozpraszają się zamiast lecieć prostą.</p>';document.body.append(interiorHud);
const sky=createSky(renderer.getPixelRatio());sky.setViewport(innerWidth,innerHeight);scene.add(sky.group);
const loadSkyWhenIdle=()=>sky.load().then(info=>{skyInfo=info;sky.setConstellations(showConstellations);sky.setDeepSkyMarkers(showDeepSkyMarkers)}).catch(error=>{skyInfo={error:error.message};console.warn('Nie udało się wczytać mapy nieba:',error.message)});
if(typeof requestIdleCallback==='function')requestIdleCallback(loadSkyWhenIdle,{timeout:450});else setTimeout(loadSkyWhenIdle,80);
const cometTails=createCometTails(scene);cometTails.setPixelRatio(renderer.getPixelRatio());
function applyAdaptiveQuality(profile){
 adaptiveDetail=profile.detail;renderer.setPixelRatio(profile.dpr);renderer.setSize(innerWidth,innerHeight);composer.setPixelRatio?.(profile.dpr);composer.setSize(innerWidth,innerHeight);cometTails.setPixelRatio(profile.dpr);
 performanceHud.hidden=profile.id==='high';performanceHud.textContent=`${profile.label} · ${formatNumber(1000/profile.average,0)} FPS`;
}
let skyInfo=null,showConstellations=false,showDeepSkyMarkers=false,showLandmarks=false,showOrbits=true;
// The landmark-marker group currently sitting on a real body mesh in the
// main scene (not the small object-details preview, which keeps its own
// separate copy) - at most one at a time, for whichever body's panel is
// open, so a tracked body shows the same pins close up that the preview
// already shows in miniature.
let bodyLandmarks=null;
function clearBodyLandmarks(){if(!bodyLandmarks)return;bodyLandmarks.group.parent?.remove(bodyLandmarks.group);bodyLandmarks=null}
function attachBodyLandmarks(b,view,places){
 clearBodyLandmarks();if(!places.length)return;
 const group=buildLandmarkMarkers(places);group.visible=showLandmarks;view.mesh.add(group);bodyLandmarks={bodyId:b.id,group};
}
let epoch=new Date(),bs=initialSystem(epoch),views=new Map(),selected=null,follow=null,paused=false,speed=2,elapsed=0,compressed=true,spawnAt=new THREE.Vector3(),restoreFocus=null;
let lightFlight=null,flightPrevious=null,flightStops=[],flightTrueScale=false,solarBrightness=100,solarInfall=0,blackHoleFall=null;
let earthCloudCover=null;
// A loaded star system replaces the Solar System entirely: `systemMode` holds
// the preset and the widest orbit everything on screen is measured against.
let systemMode=null;
const flightTextureKeys=new Set();
// Standing on a body: which one, where on it, and which way the head is
// turned. The camera is driven directly while this is set, so the orbit
// controls are switched off and the scale is forced to real - a horizon is
// meaningless against radii that have been enlarged to be seen from outside.
let surfaceView=null,surfaceReturn=null,earthLocationWatch=null;
let educationEnabled=false,educationSubjectId=null;
let cinematic=null;
const flightLabels=document.createElement("div");flightLabels.id="flight-labels";document.body.append(flightLabels);
// Persistent labels over whatever the surface-view radar is tracking, drawn
// directly on the rendered sky rather than on the radar sphere, so a bright
// point overhead can be matched to a name by eye instead of read off a list.
// Surface-view only: the objects it tracks (surfaceEntries) only make sense
// relative to a horizon.
const skyLabels=document.createElement('div');skyLabels.id='sky-labels';skyLabels.hidden=true;document.body.append(skyLabels);
// Deep-sky name+outline markers, opt-in via the same toggle that lights up
// their dots on the dome itself (sky.js) - and, like those dots, shown in
// whatever view is currently active, not only while standing on a surface.
const deepSkyLabels=document.createElement('div');deepSkyLabels.id='deep-sky-labels';deepSkyLabels.hidden=!showDeepSkyMarkers;document.body.append(deepSkyLabels);
const flightHud=document.createElement('div');flightHud.id='light-flight';flightHud.hidden=true;document.body.append(flightHud);
const deathHud=document.createElement('div');deathHud.id='solar-death';deathHud.hidden=true;document.body.append(deathHud);
const blackHoleFallHud=document.createElement('aside');blackHoleFallHud.id='black-hole-fall';blackHoleFallHud.hidden=true;document.body.append(blackHoleFallHud);
const flightRail=document.createElement('nav');flightRail.id='flight-rail';flightRail.hidden=true;flightRail.setAttribute('aria-label','Postęp lotu przez planety');document.body.append(flightRail);
const timeDock=document.createElement('nav');timeDock.id='time-dock';timeDock.setAttribute('aria-label','Sterowanie czasem i lotem');
timeDock.innerHTML=`<button id="dock-pause" aria-label="Wstrzymaj symulację"><span id="dock-pause-icon">Ⅱ</span><span id="dock-pause-label">Pauza</span></button><div class="dock-divider"></div><label for="dock-speed">Tempo</label><select id="dock-speed" aria-label="Tempo symulacji"><option value="realtime" hidden>1 : 1</option>${rateOptions(2)}</select><label class="dock-scale" id="dock-scale-label"><input id="dock-scale" type="checkbox"> Rzeczywista skala</label><div class="dock-divider"></div><button id="dock-flight"><span class="dock-c">c</span><span id="dock-flight-label">Lot światła</span></button><button id="dock-death"><span class="dock-c">☉</span><span id="dock-death-label">Śmierć Słońca</span></button><button id="dock-black-hole" aria-label="Uruchom symulację wpadania do czarnej dziury"><span class="dock-c dock-hole">◉</span><span id="dock-black-hole-label">Wpadanie</span></button><button id="share-simulation" aria-label="Kopiuj link do bieżącej symulacji">Udostępnij</button>`;
document.body.append(timeDock);
const performanceHud=document.createElement('output');performanceHud.id='performance-hud';performanceHud.hidden=true;performanceHud.setAttribute('aria-live','polite');document.body.append(performanceHud);
const collisionCourseButton=document.createElement('button');collisionCourseButton.id='collision-course';collisionCourseButton.textContent='Kurs kolizyjny';collisionCourseButton.setAttribute('aria-label','Ustaw scenariusz zderzenia');timeDock.append(collisionCourseButton);
const eclipseButton=document.createElement('button');eclipseButton.id='eclipse-scenarios';eclipseButton.textContent='Zaćmienia';eclipseButton.setAttribute('aria-label','Pokaż scenariusze zaćmień Słońca i Księżyca');timeDock.append(eclipseButton);
const eventTimelineButton=document.createElement('button');eventTimelineButton.id='event-timeline';eventTimelineButton.textContent='Zdarzenia';eventTimelineButton.setAttribute('aria-label','Pokaż przewidywane zdarzenia');timeDock.append(eventTimelineButton);
const cinematicButton=document.createElement('button');cinematicButton.id='cinematic-camera';cinematicButton.textContent='Kamera';cinematicButton.setAttribute('aria-label','Otwórz kamerę filmową');timeDock.append(cinematicButton);
const freeFlightHelp=document.createElement('aside');freeFlightHelp.id='free-flight-help';freeFlightHelp.hidden=true;freeFlightHelp.setAttribute('aria-label','Sterowanie swobodnym lotem');freeFlightHelp.innerHTML='<strong class="free-flight-title">Swobodny lot</strong><div class="free-flight-layout"><div class="free-flight-keys" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><div class="free-flight-list"><span>WASD · ruch</span><span>Q / E · dół / góra</span><span>Shift · szybciej</span><span>Mysz · rozglądanie</span><span>Prawy przycisk lub WASD aktywuje mysz</span><span>Escape · zwolnij mysz</span></div></div>';document.body.append(freeFlightHelp);
const solarControl=document.createElement('aside');solarControl.id='solar-control';solarControl.setAttribute('aria-label','Regulacja gwiazdy centralnej');solarControl.innerHTML=`<label for="central-star"><span>Gwiazda centralna</span></label><select id="central-star" aria-label="Gwiazda centralna">${centralStars.map(star=>`<option value="${star.id}">${star.name}</option>`).join('')}</select><label for="solar-brightness"><span>Jasność gwiazdy</span><output id="solar-brightness-value">100%</output></label><input id="solar-brightness" type="range" min="5" max="100" step="1" value="100" aria-label="Jasność gwiazdy"><label class="sky-toggle" for="orbits"><span>Orbity</span><input id="orbits" type="checkbox" role="switch" aria-label="Pokaż orbity wszystkich ciał niebieskich"${showOrbits?' checked':''}><i aria-hidden="true"></i></label><label class="sky-toggle" for="education"><span>Warstwa edukacyjna</span><input id="education" type="checkbox" role="switch" aria-label="Pokaż wektory fizyczne zaznaczonego ciała"><i aria-hidden="true"></i></label><div class="sky-explorer"><label class="field-title" for="body-search">Szukaj ciała lub obiektu</label><div class="body-search"><input id="body-search" type="text" autocomplete="off" placeholder="Nazwa ciała lub obiektu…" aria-label="Szukaj ciała lub obiektu" role="combobox" aria-expanded="false" aria-controls="body-results" aria-autocomplete="list"><ul id="body-results" class="body-results" role="listbox" aria-label="Wyniki wyszukiwania" hidden></ul></div><label class="sky-toggle" for="constellations"><span>Gwiazdozbiory</span><input id="constellations" type="checkbox" role="switch" aria-label="Pokaż linie gwiazdozbiorów"><i aria-hidden="true"></i></label><label class="sky-toggle" for="deep-sky-markers"><span>Obiekty głębokiego nieba</span><input id="deep-sky-markers" type="checkbox" role="switch" aria-label="Pokaż punkty orientacyjne obiektów głębokiego nieba"><i aria-hidden="true"></i></label><button id="systems" class="sky-mode" aria-label="Otwórz bibliotekę układów gwiazdowych">Symulacja układów</button><button id="surface" class="sky-mode" aria-label="Stań na powierzchni ciała i spójrz w niebo">Widok z powierzchni</button></div>`;
document.body.append(solarControl);setupBodySearch();document.querySelector('#orbits').onchange=e=>setOrbitsVisible(e.target.checked);document.querySelector('#education').onchange=e=>setEducationVisible(e.target.checked);document.querySelector('#constellations').onchange=e=>setConstellationsVisible(e.target.checked);document.querySelector('#deep-sky-markers').onchange=e=>setDeepSkyMarkersVisible(e.target.checked);document.querySelector('#systems').onclick=()=>showSystemLibrary();document.querySelector('#surface').onclick=()=>surfaceView?stopSurfaceView():startSurfaceView((bs.find(b=>b.key==='earth')||surfaceCandidates()[0])?.id);
const solarBrightnessInput=document.querySelector('#solar-brightness'),solarBrightnessValue=document.querySelector('#solar-brightness-value'),centralStarInput=document.querySelector('#central-star');
function applySolarBrightness(){
 const sun=bs.find(body=>body.key==='sun'),sunView=sun&&views.get(sun.id);
 const scale=solarBrightness/100*(1-solarInfall*.78);
 // Absolute luminosity sets the exposure for the one star of the Solar System.
 // A star system is watched as a whole: its brightest member is the reference
 // and the others are shown relative to it, so a B star and a red dwarf can
 // share a frame without the B star washing it out.
 const output=systemMode?scale:visualLuminosity(effectiveLuminosity(sun))*scale;
 sunlight.intensity=SOLAR_LIGHT_INTENSITY*output;
 sunlight.color.set(blackbodyColor(sun?.colorTemperature??5778));
 solarBloom.strength=SOLAR_BLOOM_STRENGTH*(.08+.92*Math.sqrt(output));
 if(systemMode)paintSystem();
 else if(sunView?.mesh.material?.color){sunView.mesh.material.color.set(blackbodyColor(sun?.colorTemperature??5778)).multiplyScalar(24*output);setSolarSpotBrightness(sunView.spots,solarBrightness)}
 solarBrightnessInput.value=String(solarBrightness);solarBrightnessValue.value=`${solarBrightness}%`;solarBrightnessValue.textContent=`${solarBrightness}%`;
 updateTemperatureReadout();
}
solarBrightnessInput.oninput=event=>{solarBrightness=Math.max(5,Math.min(100,Number(event.target.value)||100));applySolarBrightness()};
function replaceCentralStar(id){
 const sun=bs.find(body=>body.key==='sun');if(!sun||systemMode)return;
 const selectedSun=selected===sun.id,followSun=follow===sun.id,wasPanelVisible=!panel.hidden;
 applyCentralStarPreset(sun,starPreset(id),bs);disposeView(sun.id);addView(sun);clearTrails();updateOrbits();applySolarBrightness();centralStarInput.value=sun.starPresetId;
 if(surfaceView)updateSurfaceView();
 if(followSun)focusBody(sun.id,{keepPanel:true});
 if(selectedSun&&wasPanelVisible){selected=sun.id;showBody()}
}
centralStarInput.onchange=event=>replaceCentralStar(event.target.value);
// Simulated instant: the epoch the system was built for, advanced by `elapsed`.
const clock=document.createElement('div');clock.id='sim-clock';clock.setAttribute('role','status');clock.setAttribute('aria-live','off');
clock.innerHTML='<span id="sim-date"></span><span class="clock-dash">-</span><span id="sim-time"></span><span class="clock-zone">UTC</span>';
document.body.append(clock);
let dateFormat, timeFormat, localDateFormat, localTimeFormat;
function refreshClockFormats(){
 const locale=getLocale();
 dateFormat=new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
 timeFormat=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'UTC'});
 localDateFormat=new Intl.DateTimeFormat(locale,{day:'numeric',month:'long',year:'numeric'});
 localTimeFormat=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
refreshClockFormats();
let clockShown='';
function simulatedDate(){return new Date(epoch.getTime()+elapsed*86400000)}
function updateClock(){
 if(lightFlight){clock.hidden=true;return}
 const at=simulatedDate();
 if(!Number.isFinite(at.getTime())){clock.hidden=true;return}
 clock.hidden=false;
 const deviceLocalTime=surfaceView?.deviceLocalTime===true;
 const zone=deviceLocalTime?translate('czas lokalny'):'UTC';
 const stamp=(deviceLocalTime?localDateFormat:dateFormat).format(at)+'|'+(deviceLocalTime?localTimeFormat:timeFormat).format(at)+'|'+zone;
 if(stamp===clockShown)return;
 clockShown=stamp;
 const [date,time,clockZone]=stamp.split('|');
 document.querySelector('#sim-date').textContent=date;
 document.querySelector('#sim-time').textContent=time;
 document.querySelector('.clock-zone').textContent=clockZone;
}
document.querySelector('#dock-pause').onclick=()=>setPaused(!paused);
function setSimulationSpeed(nextRate){const next=changeSimulationRate(speed,lag,nextRate);speed=next.speed;lag=next.pendingDays;last=performance.now();}
document.querySelector('#dock-speed').onchange=e=>{if(lightFlight)lightFlight.setRate(+e.target.value,performance.now());else if(blackHoleFall)blackHoleFall.setRate(+e.target.value,performance.now());else setSimulationSpeed(e.target.value)};
// Switching the mapping moves every body at once, so the camera has to move with
// it: true scale spreads the system about sevenfold, and a camera left where it
// was ends up somewhere inside Jupiter's orbit instead of viewing the whole thing.
function setSystemScale(){if(!systemMode)return;systemMode.extent=systemDrawnExtent(systemMode.preset.root,systemMode.span,compressed);systemFrame=null;systemStamp=null;controls.maxDistance=systemMaxDistance(systemMode.extent);}
function setScaleMode(next){
 if(next===compressed||surfaceView)return;
 // A star system is measured against its own widest orbit, so switching the
 // scale changes how large it is drawn by the ratio of the two drawn extents,
 // not by the Solar System's mapping.
 if(systemMode){const before=systemMode.extent;compressed=next;setSystemScale();
  const zoom=camera.position.distanceTo(controls.target)/Math.max(1e-9,before);
  const direction=camera.position.clone().sub(controls.target).normalize();
  controls.target.set(0,0,0);camera.position.copy(direction.multiplyScalar(Math.max(systemMode.extent*.2,systemMode.extent*zoom)));
  controls.update();clearTrails();updateOrbits();
  const chooser=document.querySelector('#scale');if(chooser)chooser.value=compressed?'visual':'real';
  document.querySelector('#dock-scale').checked=!compressed;return;}
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
document.querySelector('#dock-death').onclick=()=>solarDeath?stopSolarDeath():startSolarDeath();
document.querySelector('#dock-black-hole').onclick=()=>blackHoleFall?stopBlackHoleFall():startBlackHoleFall();
let dockState='';
// Accelerated stellar evolution. The Sun's own parameters are driven from the
// phase table while the integrator keeps running underneath, so the planets go
// on orbiting a star that is changing mass, size and colour around them.
const DEATH_CAVEAT={
 pl:'Czas na ekranie nie jest proporcjonalny do rzeczywistego: ciąg główny ma jeszcze 5 miliardów lat, mgławica planetarna około dziesięciu tysięcy. Model nie zawiera tarcia pływowego, przez które publikowane rachunki wciągają Ziemię w otoczkę olbrzyma mimo poszerzenia jej orbity.',
 en:'Screen time is not proportional to real time: the main sequence has five billion years left, the planetary nebula about ten thousand. The model has no tidal drag, which is why published calculations pull Earth into the giant despite its widening orbit.',
 de:'Die Bildschirmzeit ist nicht proportional zur realen Zeit: der Hauptreihe bleiben fünf Milliarden Jahre, dem planetarischen Nebel rund zehntausend. Das Modell enthält keine Gezeitenreibung, durch die veröffentlichte Rechnungen die Erde trotz ihrer weiter werdenden Bahn in den Riesen ziehen.',
 es:'El tiempo en pantalla no es proporcional al real: a la secuencia principal le quedan cinco mil millones de años, a la nebulosa planetaria unos diez mil. El modelo no incluye el rozamiento de marea, por el que los cálculos publicados arrastran a la Tierra al interior de la gigante pese a que su órbita se ensancha.'};
let solarDeath=null;
function startSolarDeath(){
 if(solarDeath)return;
 const sun=bs.find(b=>b.key==='sun');
 if(systemMode||surfaceView||!sun||sun.starPresetId&&sun.starPresetId!=='sun'){shell('Śmierć Słońca','<p class="muted">Ten przebieg jest na razie policzony wyłącznie dla naszej gwiazdy. Przywróć Słońce jako gwiazdę centralną i spróbuj ponownie.</p>');return}
 if(lightFlight)stopLightFlight();
 closePanel();
 solarDeath={startedAt:performance.now(),paused:0,pausedAt:null,mass:sun.mass,swallowed:[]};
 deathHud.innerHTML=`<div class="death-head"><strong id="death-phase"></strong><span id="death-age" class="muted"></span></div><div class="death-track"><div class="death-fill"></div></div><div class="death-values"><span id="death-radius"></span><span id="death-luminosity"></span><span id="death-temperature"></span><span id="death-mass"></span></div><p class="death-note" id="death-note" data-no-translate></p><p class="muted" id="death-caveat" data-no-translate></p><div class="actions"><button class="action" id="death-stop">Zakończ</button></div>`;
 deathHud.hidden=false;
 document.querySelector('#death-caveat').textContent=DEATH_CAVEAT[getLanguage()]||DEATH_CAVEAT.en;
 document.querySelector('#death-stop').onclick=stopSolarDeath;
 updateSolarDeath(performance.now());
}
function stopSolarDeath(){if(!solarDeath){document.body.classList.remove('in-solar-death');return}solarDeath=null;deathHud.hidden=true;document.body.classList.remove('in-solar-death');dockState='';}
function updateSolarDeath(now){
 const sun=bs.find(b=>b.key==='sun');
 if(!sun){stopSolarDeath();return}
 const state=solarEvolutionState(paused?solarDeath.frozen??0:(solarDeath.frozen=(now-solarDeath.startedAt)/1000));
 if(!state)return;
 // Wind loss widens every orbit; see adiabaticExpansion. Applied against the
 // star, so a body's distance from it grows while the star's own drift stays.
 const factor=adiabaticExpansion(solarDeath.mass,state.mass);
 if(factor.position!==1)for(const b of bs)if(b!==sun&&!b.parent){
  b.p=b.p.map((value,axis)=>sun.p[axis]+(value-sun.p[axis])*factor.position);
  b.v=b.v.map((value,axis)=>sun.v[axis]+(value-sun.v[axis])*factor.velocity);
 }
 solarDeath.mass=state.mass;
 Object.assign(sun,solarEvolutionBodyState(state),{color:blackbodyColor(state.temperature)});
 applySolarBrightness();
 const format=(value,digits=2)=>formatNumber(value,digits);
 document.querySelector('#death-phase').textContent=state.name;
 document.querySelector('#death-age').textContent=`+${format(state.ageGyr,2)} mld lat`;
 document.querySelector('#death-note').textContent=solarPhaseNote(state.phase,getLanguage());
 const done=SOLAR_PHASES.slice(0,state.index).reduce((sum,item)=>sum+item.seconds,0)+SOLAR_PHASES[state.index].seconds*state.progress;
 deathHud.querySelector('.death-fill').style.width=`${(done/SOLAR_EVOLUTION_SECONDS*100).toFixed(1)}%`;
 document.querySelector('#death-radius').textContent=`${format(state.radiusSolar,state.radiusSolar<1?4:1)} R☉`;
 document.querySelector('#death-luminosity').textContent=`${format(state.luminosity,state.luminosity<1?5:0)} L☉`;
 document.querySelector('#death-temperature').textContent=`${format(Math.round(state.temperature),0)} K`;
 document.querySelector('#death-mass').textContent=`${format(state.mass,3)} M☉`;
}
function syncTimeDock(){const special=lightFlight||blackHoleFall;const state=`${paused}:${speed}:${lightFlight?.rate??0}:${blackHoleFall?.clock?.rate??0}:${compressed}:${!!solarDeath}:${systemMode?.id??''}:${surfaceView?.bodyId??''}:${cinematic?.bodyId??''}`;
 // The light flight, the fall, the collision courses and the Sun's death all
 // describe the Solar System seen from outside: none of them has a meaning
 // while a star system is loaded or the camera is standing on the ground.
 for(const id of ['dock-flight','dock-death','dock-black-hole'])document.querySelector('#'+id).disabled=!!systemMode||!!surfaceView;
 collisionCourseButton.disabled=!!systemMode||!!surfaceView;eclipseButton.disabled=!!systemMode||!!surfaceView;eventTimelineButton.disabled=!!systemMode||!!surfaceView;cinematicButton.disabled=!!surfaceView||!!lightFlight||!!blackHoleFall;cinematicButton.setAttribute('aria-pressed',String(!!cinematic));centralStarInput.disabled=!!systemMode;
 document.querySelector('#systems').setAttribute('aria-pressed',String(!!systemMode));
 const surfaceButton=document.querySelector('#surface');
 surfaceButton.setAttribute('aria-pressed',String(!!surfaceView));surfaceButton.disabled=!!systemMode||!!lightFlight||!!blackHoleFall;document.querySelector('#dock-death').setAttribute('aria-pressed',String(!!solarDeath));document.body.classList.toggle('in-light-flight',!!lightFlight);document.body.classList.toggle('in-solar-death',!!solarDeath);document.body.classList.toggle('in-black-hole-fall',!!blackHoleFall);if(state===dockState)return;dockState=state;
 document.querySelector('#dock-scale-label').hidden=!!special;document.querySelector('#dock-scale').checked=!compressed;
 const pauseButton=document.querySelector('#dock-pause');pauseButton.setAttribute('aria-label',paused?'Wznów symulację':'Wstrzymaj symulację');pauseButton.setAttribute('aria-pressed',String(paused));document.querySelector('#dock-pause-icon').textContent=paused?'▶':'Ⅱ';document.querySelector('#dock-pause-label').textContent=paused?'Wznów':'Pauza';
 const select=document.querySelector('#dock-speed');select.disabled=false;const mode=special?'flight':'normal';if(select.dataset.mode!==mode){select.dataset.mode=mode;select.innerHTML=special?[.25,.5,1,2,4,8].map(rate=>`<option value="${rate}">${rate} ×</option>`).join(''):rateOptions()}select.value=String(lightFlight?lightFlight.rate:blackHoleFall?blackHoleFall.clock.rate:speed);
 document.querySelector('#dock-flight-label').textContent=lightFlight?'Zakończ lot':'Lot światła';document.querySelector('#dock-flight').setAttribute('aria-pressed',String(!!lightFlight));document.querySelector('#dock-black-hole-label').textContent=blackHoleFall?'Zakończ wpadanie':'Wpadanie';document.querySelector('#dock-black-hole').setAttribute('aria-pressed',String(!!blackHoleFall));timeDock.classList.toggle('in-flight',!!special);
 const panelPause=document.querySelector('#pause');if(panelPause)panelPause.textContent=paused?'▶':'Ⅱ';const panelSpeed=document.querySelector('#speed');if(panelSpeed){if(special)panelSpeed.options[0].textContent=`Lot · ${lightFlight?lightFlight.rate:blackHoleFall.clock.rate} ×`;else panelSpeed.value=String(speed);}}
const loader=new THREE.TextureLoader(),textures={},textureRequests=new Set(),moonMaps={};
const textureManifest={
 mercury:'/textures/mercury.jpg',uranus:'/textures/uranus.jpg',venus:'/textures/venus.webp',earth:'/textures/earth.webp',mars:'/textures/mars.webp',jupiter:'/textures/jupiter.webp',saturn:'/textures/saturn.webp',neptune:'/textures/neptune.webp',
 'proxima-centauri-b':'/textures/exoplanets/proxima-centauri-b.webp','trappist-1-e':'/textures/exoplanets/trappist-1-e.webp','51-pegasi-b':'/textures/exoplanets/51-pegasi-b.webp','55-cancri-e':'/textures/exoplanets/55-cancri-e.webp'
};
const textureAnisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
function configureTexture(map){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=textureAnisotropy;map.wrapS=THREE.RepeatWrapping;map.generateMipmaps=true;map.minFilter=THREE.LinearMipmapLinearFilter;map.magFilter=THREE.LinearFilter;return map}
function loadTexture(key,onLoad,onError){if(textures[key]){onLoad?.(textures[key]);return textures[key]}const path=textureManifest[key];if(!path)return null;const map=loader.load(path,loaded=>onLoad?.(loaded),undefined,error=>{delete textures[key];onError?.(error)});textures[key]=configureTexture(map);return map}
function requestSurfaceTexture(b){const key=b.textureKey||b.key;if(!textureManifest[key]||textureRequests.has(key))return;textureRequests.add(key);loadTexture(key,map=>{textureRequests.delete(key);for(const candidate of bs)if((candidate.textureKey||candidate.key)===key){const view=views.get(candidate.id),material=view?.mesh.material;if(material){if(view.surfaceDetail?.material.dedicatedColor)view.surfaceDetail.material.baseMap=map;else material.map=map;if(view.surfaceDetail)map.anisotropy=Math.max(map.anisotropy||1,renderer.capabilities.getMaxAnisotropy());material.color.set('#ffffff');material.needsUpdate=true}}},()=>textureRequests.delete(key))}
function requestMoonTexture(b){const profile=moonAppearance[b.name],path=profile&&moonMapPath(profile);if(!profile||!path||moonMaps[profile.id]||textureRequests.has(path))return;textureRequests.add(path);const map=loader.load(path,loaded=>{textureRequests.delete(path);moonMaps[profile.id]=configureTexture(loaded);for(const candidate of bs)if(candidate.name===b.name){const view=views.get(candidate.id),material=view?.mesh.material;if(material){applyMoonAppearance(material,candidate,moonMaps);if(view.surfaceDetail?.material.dedicatedColor)view.surfaceDetail.material.baseMap=moonMaps[profile.id];else material.map=moonMaps[profile.id];if(view.surfaceDetail)moonMaps[profile.id].anisotropy=Math.max(moonMaps[profile.id].anisotropy||1,renderer.capabilities.getMaxAnisotropy());material.needsUpdate=true}}},undefined,()=>{textureRequests.delete(path);delete moonMaps[profile.id]});moonMaps[profile.id]=configureTexture(map)}
function requestDetailTexture(b){if(b.key==='moon')requestMoonTexture(b);else requestSurfaceTexture(b)}
const vector=(a)=>new THREE.Vector3(...a);
function mapped(p){const v=vector(p),r=v.length();return r?v.multiplyScalar(sceneRadius(r,compressed)/r):v}
// A star system is laid out from its hierarchy rather than by mapping each
// position independently, so the whole set is computed together and cached for
// the frame. `systemStamp` is what invalidates it: the bodies move every step.
let systemFrame=null,systemStamp=null;
function systemPlacement(){
 const stamp=`${elapsed}:${compressed}:${bs.length}`;
 if(systemStamp===stamp&&systemFrame)return systemFrame;
 const live=new Map(bs.map(b=>[b.name,b.p]));
 systemFrame=systemLayout(systemMode.preset.root,name=>live.get(name),systemMode.span,compressed);
 systemStamp=stamp;return systemFrame;
}
function displayed(b){if(systemMode){const place=systemPlacement().get(b.name);return place?vector(place.p):mapped(b.p)}if(lightFlight){const stop=flightStops.find(s=>s.id===b.id);if(stop)return mapped(lightFlight.origin).addScaledVector(vector(lightFlight.direction),stop.distance*6);if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host)return displayed(host).add(flightTrueScale?vector(b.p).sub(vector(host.p)).multiplyScalar(6):vector(b.p).sub(vector(host.p)).normalize().multiplyScalar(radius(host)*2.5))}if(b.key==='sun')return mapped(lightFlight.origin);}if(!compressed)return mapped(b.p);if(b.collisionScenario){const target=bs.find(candidate=>candidate.id===b.collisionScenario.targetId);if(target){const direction=vector(b.collisionScenario.visualDirection||[1,0,0]).normalize(),contactRadius=radius(b)+radius(target),separation=scenarioVisualSeparation(b.collisionScenario,elapsed,contactRadius);return displayed(target).addScaledVector(direction,separation)}}if(b.parent){const host=bs.find(x=>x.id===b.parent);if(host){const d=vector(b.p).sub(vector(host.p)),r=d.length();return displayed(host).add(d.multiplyScalar(r?satelliteOffset(radius(host),r)/r:1))}}return mapped(b.p)}
function radius(b){
 if(systemMode)return systemPlacement().get(b.name)?.r??systemBodyRadius(b.radius,systemMode.span,compressed);
 const stellarScale=Math.pow(Math.max(.01,b.radius/695700),.42);
 if(lightFlight){
  if(flightTrueScale)return b.radius/AU*6;
  if(b.key==='sun')return .12*stellarScale;
  if(b.key==='neutron-star')return .04;
  if(b.parent)return .008;
  return .018+.095*Math.pow(b.radius/69911,.6);
 }
 if(!compressed)return b.radius/AU*6;
 // Compared against the compressed orbit mapping rather than a size curve of
 // its own: a red giant has to swallow exactly the orbits it physically
 // reaches, and 1.02 is only the floor that keeps today's Sun visible.
 if(b.key==='sun')return Math.max(1.02,sceneRadius(b.radius/AU,true));
 if(b.key==='blackhole')return .5*Math.pow(b.mass,.15);
 if(b.key==='neutron-star')return .028;
 const host=b.parent&&bs.find(candidate=>candidate.id===b.parent);
 if(host){
  // Satellites inherit a readable fraction of their primary, but never the
  // former uniform moon size. The exponent keeps kilometre-scale moons on
  // screen while retaining the many-orders-of-magnitude size hierarchy. The
  // floor was lowered when Saturn's ring shepherds and co-orbitals (a few
  // km to a few tens of km, only a couple of thousand km apart in real
  // orbital radius) joined the round moons here: at the old .004 floor every
  // sub-hydrostatic moonlet was clamped to the same displayed size, close
  // enough together that Atlas and Daphnis's compressed spheres touched
  // despite never coming near each other in the real orbit. The lower floor
  // keeps these rubble-pile moonlets legitimately tiny next to Saturn's
  // round moons, which fixes the crowding rather than papering over it.
  const physicalFraction=Math.max(1e-10,b.radius/host.radius);
  return radius(host)*Math.min(.34,Math.max(.0015,.54*Math.pow(physicalFraction,.68)));
 }
 if(b.key==='comet')return Math.min(.029,.006+.018*Math.pow(Math.max(1e-6,b.radius/5.5),.28));
 if(b.key==='fragment'||b.key==='asteroid')return .0015+.045*Math.pow(Math.max(1e-9,b.radius/1000),.32);
 // A smaller baseline and steeper curve make terrestrial and giant planets
 // visibly distinct without changing their positions or orbital paths.
 return .035+.625*Math.pow(Math.max(1e-9,b.radius/69911),.85);
}
function meshEnvelope(view,fallback){return view?Math.max(view.mesh.scale.x,view.mesh.scale.y,view.mesh.scale.z):fallback;}
const sphere=shapeGeometry('high');
// A fresh deterministic generator seeded from the same constant ringGrain
// below uses for that planet, not Math.random: a reset rebuilds every view
// from scratch (see resetSystem), and Saturn's and Uranus's ring fragments
// must scatter the same way every time that happens rather than reshuffling
// on each reset, exactly as the fixed grain seed already keeps the ring
// texture itself identical across reloads.
// Points a body's `axis` group along its spin axis (planet-poles.js): the
// tabulated tilt, in the direction of the IAU pole where one is known. The
// rings, the ring particles and the equator all hang off this group, and the
// moons' orbits are built around the same axis, so they agree by
// construction. Cached per body so an unchanged axis costs one comparison.
const spinUp=new THREE.Vector3(0,1,0),spinTarget=new THREE.Vector3();
function orientSpinAxis(axis,b){const stamp=`${b.tilt}:${b.poleAzimuth}`;if(axis.userData.spinStamp===stamp)return;axis.userData.spinStamp=stamp;spinTarget.fromArray(spinAxis(b));axis.quaternion.setFromUnitVectors(spinUp,spinTarget)}
function seededRandom(seed){let state=seed>>>0;return()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296}}
function addView(b){const group=new THREE.Group();scene.add(group);const authoredGeometry=keepsAuthoredGeometry(b);let geo=shapeGeometry('medium');if(b.key==='comet'||b.key==='fragment'&&b.irregular)geo=cometNucleusGeometry(b.id,12,b.cometProfile);else if(hasMeasuredIrregularShape(b))geo=measuredIrregularGeometry(b);else if(b.irregular){geo=new THREE.IcosahedronGeometry(1,3);const a=geo.attributes.position;for(let i=0;i<a.count;i++){const x=a.getX(i),y=a.getY(i),z=a.getZ(i),f=1+.12*Math.sin(x*18+y*13+z*8)+.05*Math.sin(x*37+y*29+z*23);a.setXYZ(i,x*f*1.3,y*f*.78,z*f)}geo.computeVertexNormals()}
 const textureKey=b.textureKey||b.key;const surfaceMap=textures[textureKey]||null;const mat=b.key==='sun'?new THREE.MeshBasicMaterial({color:new THREE.Color('#ffffff').multiplyScalar(24),toneMapped:true}):new THREE.MeshStandardMaterial({map:b.key==='moon'?null:surfaceMap,color:surfaceMap?'#ffffff':b.key==='moon'?b.color:b.key==='blackhole'?'#000000':b.key==='neutron-star'?'#d6efff':b.color||'#ffffff',roughness:b.key==='neutron-star'?.34:1,metalness:0,emissive:b.key==='neutron-star'?'#2570a8':'#000000',emissiveIntensity:b.key==='neutron-star'?.75:0});if(b.key==='blackhole')mat.map=null;if(b.key==='comet'){mat.map=null;applyCometAppearance(mat,b.cometProfile)}if(b.textureKey&&!surfaceMap){mat.map=null;mat.color.set(b.gas?'#b0aaa0':'#77736c')}naturalColorMaterial(mat,b.key);applyMoonAppearance(mat,b,moonMaps);makeOpaqueSurface(mat);
 const axis=new THREE.Group();orientSpinAxis(axis,b);group.add(axis);const mesh=new THREE.Mesh(geo,mat);const eclipseShadow=participatesInSolarShadow(b)?applyExtendedSolarShadow(mat):null;const ringPlanetShadow=['saturn','uranus'].includes(b.key)?applyRingPlanetShadow(mat,{inner:b.key==='saturn'?SATURN_RING_INNER:URANUS_RING_INNER,bands:b.key==='saturn'?SATURN_RING_BANDS:URANUS_RING_BANDS}):null;mesh.castShadow=participatesInSolarShadow(b);mesh.receiveShadow=!eclipseShadow;if(b.key==='comet'){mesh.renderOrder=1;mesh.frustumCulled=false}axis.add(mesh);mesh.userData.id=b.id;const spots=b.key==='sun'&&b.starPresetId==='sun'?createSolarSpots():null;if(spots)mesh.add(spots);
 let halo=null; // Solar glare is generated from visible HDR pixels, not an unoccluded billboard.
 if(b.key==='earth'){const atmo=new THREE.Mesh(sphere,new THREE.ShaderMaterial({vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}',fragmentShader:'varying vec3 n;varying vec3 v;void main(){float a=pow(1.-max(dot(n,v),0.),4.);gl_FragColor=vec4(.18,.46,.9,a*.38);}',transparent:true,depthWrite:false}));atmo.name='Earth orbital atmosphere';atmo.scale.setScalar(1.035);mesh.add(atmo)}
 // Real ring geometry (see planet-rings.js): named rings and gaps sit at
 // their referenced positions, and each band's alpha stands in for its
 // measured optical depth, so a gap - the Cassini Division, the Encke and
 // Keeler gaps, or the wide true emptiness between every named Uranus ring -
 // is actually transparent rather than merely a darker tone on an otherwise
 // solid disc. Vertex alpha (a 4-component colour attribute, not the usual
 // 3) is what makes that per-band transparency possible on one mesh.
 let ringEclipseShadow=null,ringParticles=null;if(['saturn','uranus'].includes(b.key)){const saturn=b.key==='saturn',inner=saturn?SATURN_RING_INNER:URANUS_RING_INNER,bands=saturn?SATURN_RING_BANDS:URANUS_RING_BANDS,outer=bands[bands.length-1].to,ringGeo=new THREE.RingGeometry(inner,outer,224,saturn?420:260),arr=ringGeo.attributes.position,rgba=[],grainSeed=saturn?4111:7331,grainAmount=saturn?.5:.35;for(let i=0;i<arr.count;i++){const r=Math.hypot(arr.getX(i),arr.getY(i)),band=ringBandAt(bands,r),texture=1+ringGrain(r,grainSeed)*grainAmount,c=new THREE.Color(band.tone).multiplyScalar(Math.max(.15,texture));rgba.push(c.r,c.g,c.b,band.alpha)}ringGeo.setAttribute('color',new THREE.Float32BufferAttribute(rgba,4));const ringMaterial=new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,depthWrite:false,roughness:.82});ringEclipseShadow=applyExtendedSolarShadow(ringMaterial);const ring=new THREE.Mesh(ringGeo,ringMaterial);ring.castShadow=true;ring.receiveShadow=false;ring.rotation.x=Math.PI/2;mesh.add(ring);
  // Individually orbiting fragments (src/ring-particles.js), each on its own
  // real Keplerian orbit around the planet rather than the planet's spin.
  // They therefore join `axis` - which only carries the fixed axial tilt -
  // and never `mesh`, which is spun once per planet-day every frame; a
  // fragment a few thousand kilometres from the inner edge must complete
  // many more orbits per Saturn-day than one near the outer edge; parenting
  // it to the spinning mesh instead would incorrectly lock every fragment
  // to the planet's own rotation regardless of its own orbital radius.
  ringParticles=createRingParticles({inner,bands,random:seededRandom(grainSeed)});axis.add(ringParticles.mesh);
 }const blackHoleVisual=b.key==='blackhole'?createBlackHoleVisual():null;if(blackHoleVisual)mesh.add(blackHoleVisual.group);const neutronStarVisual=b.key==='neutron-star'?createNeutronStarVisual(b):null;if(neutronStarVisual)mesh.add(neutronStarVisual.group);
 const orbit=createOrbitRibbon({color:b.color,opacity:b.parent?.13:.3});scene.add(orbit);
 const trailGeo=new THREE.BufferGeometry();trailGeo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(512*3),3).setUsage(THREE.DynamicDrawUsage));trailGeo.setDrawRange(0,0);const trail=new THREE.Line(trailGeo,new THREE.LineBasicMaterial({color:b.color,transparent:true,opacity:.3}));trail.frustumCulled=false;scene.add(trail);views.set(b.id,{group,axis,mesh,halo,spots,blackHoleVisual,neutronStarVisual,eclipseShadow,ringEclipseShadow,ringPlanetShadow,ringParticles,orbit,trail,orbitPath:Array.from({length:257},()=>new THREE.Vector3()),history:[],lodLevel:authoredGeometry?null:'medium',irregular:authoredGeometry});}
function disposeView(id){const v=views.get(id);if(!v)return;scene.remove(v.group,v.orbit,v.trail);v.undamagedGeometry?.dispose();v.group.traverse(o=>{if(o.isMesh){if(!isShapeGeometry(o.geometry))o.geometry.dispose();o.material.dispose()}});v.orbit.geometry.dispose();v.orbit.material.dispose();v.trail.geometry.dispose();v.trail.material.dispose();views.delete(id);if(selected===id){selected=null;panel.hidden=true}if(educationSubjectId===id){educationSubjectId=null;educationStamp=''}if(follow===id)follow=null;if(bodyLandmarks?.bodyId===id)bodyLandmarks=null}
bs.forEach(addView);applySolarBrightness();
// Every solid is evaluated as an occulting disc in the current scene scale.
// The material receives only bodies whose apparent disc can touch the Sun;
// this keeps the per-fragment analytic eclipse calculation bounded even after
// the user creates many fragments.
function updateExtendedSolarShadows(){
 const sun=bs.find(body=>body.key==='sun'),sunView=sun&&views.get(sun.id);
 if(!sunView)return;
 const sourcePosition=sunView.group.position,sourceRadius=meshEnvelope(sunView,radius(sun));
 const occluders=bs.filter(participatesInSolarShadow).map(body=>{
  const view=views.get(body.id);return view&&{id:body.id,position:view.group.position,radius:meshEnvelope(view,radius(body))};
 }).filter(Boolean);
 for(const body of bs){
  const view=views.get(body.id);if(!view?.eclipseShadow&&!view?.ringEclipseShadow&&!view?.ringPlanetShadow)continue;
  if(view.eclipseShadow){
   // A body cannot shadow itself, so its own id is excluded from its own
   // candidate list here.
   const candidates=solarOccludersForReceiver(view.group.position,sourcePosition,sourceRadius,occluders,body.id);
   view.eclipseShadow.update({sourcePosition,sourceRadius,occluders:candidates,viewMatrix:camera.matrixWorldInverse});
  }
  if(view.ringEclipseShadow){
   // The ring is a separate surface wrapped around the planet, not the
   // planet itself, so unlike the mesh above, the planet *is* a valid
   // occluder for its own ring - the dark band a planet casts across part
   // of its own rings, cut off from the Sun by the planet's own bulk, is
   // one of the most recognisable eclipse effects in the solar system. Pass
   // a receiver id no real body ever has so the exclusion above never
   // strips the planet back out of its own ring's candidate list.
   const candidates=solarOccludersForReceiver(view.group.position,sourcePosition,sourceRadius,occluders,-1);
   view.ringEclipseShadow.update({sourcePosition,sourceRadius,occluders:candidates,viewMatrix:camera.matrixWorldInverse});
  }
  if(view.ringPlanetShadow){
   const normal=new THREE.Vector3(0,-1,0).applyQuaternion(view.axis.getWorldQuaternion(new THREE.Quaternion())).normalize();
   view.ringPlanetShadow.update({sourcePosition,centre:view.group.position,normal,radius:meshEnvelope(view,radius(body)),viewMatrix:camera.matrixWorldInverse});
  }
 }
}
let asteroidSeed=72831;const asteroidRandom=()=>{asteroidSeed=(asteroidSeed*1664525+1013904223)>>>0;return asteroidSeed/4294967296};
const asteroidBelt=createAsteroidBelt({random:asteroidRandom});const asteroidDensity=()=>{const distance=camera.position.distanceTo(controls.target),base=distance<9?1:distance<20?.62:.28;return base*adaptiveDetail};asteroidBelt.update(elapsed,mapped,compressed,asteroidDensity());scene.add(asteroidBelt.mesh);
// The decorative population of Saturn's ~268 small, distant, individually
// uncharacterised irregular moons (src/irregular-moon-swarm.js) - real
// simulated bodies stop at the 23 well enough characterised to size. It
// follows Saturn's own current position every frame like any other view,
// but is not itself part of `bs`: it never takes part in gravity, so 268
// extra bodies never slow the N-body integrator down.
const irregularMoonSwarm=createIrregularMoonSwarm({random:seededRandom(190402)});scene.add(irregularMoonSwarm.mesh);
const selection=new THREE.Mesh(new THREE.RingGeometry(1.25,1.263,100),new THREE.MeshBasicMaterial({color:'#c7d9ef',transparent:true,opacity:.65,side:THREE.DoubleSide,depthTest:false}));selection.visible=false;scene.add(selection);
const orbitR=new THREE.Vector3(),orbitV=new THREE.Vector3(),orbitH=new THREE.Vector3(),orbitE=new THREE.Vector3(),orbitX=new THREE.Vector3(),orbitY=new THREE.Vector3(),orbitHostP=new THREE.Vector3(),orbitHostV=new THREE.Vector3(),orbitHostDisplay=new THREE.Vector3(),orbitPosition=new THREE.Vector3(),orbitDisplay=new THREE.Vector3();
function updateOrbits(){
 if(systemMode){for(const v of views.values())v.orbit.visible=false;return}
 if(lightFlight||surfaceView){for(const v of views.values()){v.orbit.visible=false;v.trail.visible=false}return}
 if(!showOrbits){for(const v of views.values())v.orbit.visible=false;return}
 for(const b of bs){const view=views.get(b.id),host=bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun');if(!host||host===b){view.orbit.visible=false;continue}
  orbitHostP.fromArray(host.p);orbitHostV.fromArray(host.v);orbitR.fromArray(b.p).sub(orbitHostP);orbitV.fromArray(b.v).sub(orbitHostV);
  const mu=G*(host.mass+b.mass);orbitH.crossVectors(orbitR,orbitV);orbitE.crossVectors(orbitV,orbitH).divideScalar(mu).sub(orbitX.copy(orbitR).normalize());
  const eccentricity=orbitE.length(),parameter=orbitH.lengthSq()/mu;if(!Number.isFinite(parameter)||parameter<1e-12){view.orbit.visible=false;continue}
  orbitX.copy(eccentricity>.00001?orbitE:orbitR).normalize();orbitY.crossVectors(orbitH,orbitX).normalize();
  const max=eccentricity<1?Math.PI:Math.acos(-1/eccentricity)*.96,path=view.orbitPath,hostRadius=radius(host),hostOffset=hostRadius*1.8;orbitHostDisplay.copy(displayed(host));
  for(let i=0;i<257;i++){const t=-max+i/256*max*2,radial=Math.min(200,parameter/(1+eccentricity*Math.cos(t)));orbitPosition.copy(orbitX).multiplyScalar(radial*Math.cos(t)).addScaledVector(orbitY,radial*Math.sin(t)).add(orbitHostP);if(b.parent&&compressed)orbitDisplay.copy(orbitPosition).sub(orbitHostP).normalize().multiplyScalar(hostOffset+Math.pow(radial*AU/200000,.55)*.8).add(orbitHostDisplay);else {const length=orbitPosition.length();orbitDisplay.copy(orbitPosition).multiplyScalar(length?sceneRadius(length,compressed)/length:1)}path[i].copy(orbitDisplay)}
  view.orbit.material.opacity=compressed?(b.parent?.13:.3):(b.parent?.035:.07);updateOrbitRibbon(view.orbit,path,camera,innerHeight,{realScale:!compressed});view.orbit.visible=true;
 }
}
updateOrbits();
const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);let down=null,lastTouchTimer,hoveredConstellation=null,hoveredDeepSky=null;
function pointRay(e){pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);ray.setFromCamera(pointer,camera)}
function hit(e){pointRay(e);const hits=ray.intersectObjects([...views.values()].map(v=>v.mesh),false);return hits[0]?.object.userData.id||nearestBodyMarker(e)}
// The exact-mesh raycast above needs the pointer on the sphere's own drawn
// pixels, which a distant or physically small body may barely have. This
// fallback projects every body's centre to screen space - the same
// projection getView() reports - and hands it to nearestMarkerId, the same
// idea already given to deep-sky markers (sky.pickDeepSkyMarker's
// Points.threshold) and constellation lines (pickConstellation's
// Line.threshold), just measured in screen pixels here since a body's
// apparent size spans many more orders of magnitude with distance than
// anything drawn on the fixed-radius sky dome.
const MARKER_HIT_PIXELS=16;
function nearestBodyMarker(e){
 const candidates=[];
 for(const b of bs){
  const world=displayed(b),screen=world.clone().project(camera);
  if(!(screen.z>-1&&screen.z<1))continue;
  candidates.push({id:b.id,x:(screen.x+1)*innerWidth/2,y:(1-screen.y)*innerHeight/2,
   radius:radius(b)*innerHeight/(2*world.distanceTo(camera.position)*Math.tan(camera.fov*Math.PI/360))});
 }
 return nearestMarkerId({x:e.clientX,y:e.clientY},candidates,MARKER_HIT_PIXELS);
}
// A landmark pin (attachBodyLandmarks, above) is a real sprite in the main
// scene - unlike a deep-sky marker, which sky.pickDeepSkyMarker locates by
// screen-space projection since those sit at effectively infinite distance
// - so an ordinary raycast against its own small group, the same way a body
// is picked, is enough. Only the currently open panel's body ever has one.
function pickLandmark(e){if(!bodyLandmarks?.group.visible)return null;pointRay(e);const hits=ray.intersectObjects(bodyLandmarks.group.children,false);return hits[0]?.object.userData.place||null}
function location(e){pointRay(e);const pos=new THREE.Vector3();if(!ray.ray.intersectPlane(plane,pos))pos.copy(controls.target);const r=pos.length();return r?pos.multiplyScalar(auRadius(r,compressed)/r):pos}
renderer.domElement.addEventListener('pointerdown',e=>{
 // The surface is a first-person camera. A touch there belongs to looking or
 // pinching, never to the long-press body spawner used by the orbital map.
 if(surfaceView){down=null;return}
 down={x:e.clientX,y:e.clientY};if(e.pointerType==='touch')lastTouchTimer=setTimeout(()=>{spawnAt.copy(location(e));showSpawner()},650)
});
renderer.domElement.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down.x,e.clientY-down.y)>6)clearTimeout(lastTouchTimer);if(e.buttons){hoveredConstellation=null;hoveredDeepSky=null;sky.clearConstellationHighlight();sky.clearDeepSkyHighlight();tip.hidden=true;return}const landmark=pickLandmark(e),id=landmark?null:hit(e),deepSky=id||landmark?null:showDeepSkyMarkers?sky.pickDeepSkyMarker(e,camera,renderer.domElement):null,constellation=id||landmark||deepSky?null:showConstellations?sky.pickConstellation(e,camera,renderer.domElement):null;hoveredConstellation=constellation;hoveredDeepSky=deepSky;if(id||deepSky||!constellation)sky.clearConstellationHighlight();if(id||constellation||!deepSky)sky.clearDeepSkyHighlight();renderer.domElement.style.cursor=id||constellation||deepSky||landmark?'pointer':'grab';tip.hidden=!id&&!constellation&&!deepSky&&!landmark;if(id||constellation||deepSky||landmark){tip.textContent=landmark?landmark.name:id?bs.find(b=>b.id===id)?.name:deepSky?deepSky.label:constellationLabel(constellation,getLanguage());tip.style.left=Math.min(innerWidth-180,e.clientX+16)+'px';tip.style.top=(e.clientY+16)+'px'}});
renderer.domElement.addEventListener('pointerleave',()=>{hoveredConstellation=null;hoveredDeepSky=null;sky.clearConstellationHighlight();sky.clearDeepSkyHighlight();tip.hidden=true});
document.addEventListener('languagechange',()=>{if(hoveredConstellation&&!tip.hidden)tip.textContent=constellationLabel(hoveredConstellation,getLanguage())});
document.addEventListener('languagechange',()=>{if(panel.hidden||!skySubject)return;const subject=skySubject;if(subject.kind==='constellation')showConstellation(subject.entry);else if(subject.kind==='place')showKnownPlace(subject.bodyId,subject.place);else showDeepSky(subject.entry)});
renderer.domElement.addEventListener('pointerup',e=>{clearTimeout(lastTouchTimer);if(surfaceView){down=null;return}if(lightFlight||e.button!==0||!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5){down=null;return}down=null;const landmark=pickLandmark(e);const id=landmark?null:hit(e);
 // Picking again rather than trusting the hover state, which a touch pointer
 // never produces. A marker, a landmark pin, or a figure under the cursor
 // opens its own sheet; only genuinely empty sky falls through to the body
 // spawner. A landmark pin jumps straight into surface view standing at
 // that place - the same as clicking it in the surface-view HUD's own
 // known-places list - since that is the actual answer to "what is this":
 // seeing it, not another line of panel text.
 const deepSky=id||landmark?null:showDeepSkyMarkers?sky.pickDeepSkyMarker(e,camera,renderer.domElement):null;
 const constellation=id||landmark||deepSky?null:showConstellations?sky.pickConstellation(e,camera,renderer.domElement):null;
 if(landmark)goToKnownPlace(bodyLandmarks.bodyId,landmark);else if(id){selected=id;showBody()}else if(deepSky)showDeepSky(deepSky);else if(constellation)showConstellation(constellation);else{spawnAt.copy(location(e));showSpawner()}tip.hidden=true});
renderer.domElement.addEventListener('dblclick',e=>{if(surfaceView)return;const id=hit(e);if(id)focusBody(id)});
function shell(title,content){preview.clear();delete panel.dataset.bodyId;restoreFocus=document.activeElement;panel.innerHTML=`<div class="panel-head"><h2>${title}</h2><button class="close" aria-label="Zamknij">×</button></div>${content}`;panel.hidden=false;panel.querySelector('.close').onclick=closePanel}
function closePanel(){preview.clear();clearBodyLandmarks();panel.hidden=true;selected=null;skySubject=null;restoreFocus?.focus?.()}
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
const standardTexturePaths={
 mercury:'/textures/mercury.jpg',venus:'/textures/venus.webp',earth:'/textures/earth.webp',mars:'/textures/mars.webp',
 jupiter:'/textures/jupiter.webp',saturn:'/textures/saturn.webp',uranus:'/textures/uranus.jpg',neptune:'/textures/neptune.webp'
};
function bodyReferenceImages(body){
 const profile=moonAppearance[body.name],moonPath=profile&&moonMapPath(profile),texture=standardTexturePaths[body.textureKey||body.key];
 const exoplanet=body.textureKey&&['proxima-centauri-b','trappist-1-e','51-pegasi-b','55-cancri-e'].includes(body.textureKey)?`/textures/exoplanets/${body.textureKey}.webp`:null;
 const sourceUrl=body.visualSource||profile?.sources?.[0]||null;
 return [moonPath,texture,exoplanet].filter(Boolean).map(url=>({
  thumbnailUrl:url,originalUrl:url,sourceUrl,
  sourceDescription:translate('Tekstura używana w wizualizacji sceny.')
 }));
}

let imageLightbox;
function ensureImageLightbox(){
 if(imageLightbox)return imageLightbox;
 const dialog=document.createElement('dialog'),content=document.createElement('article'),close=document.createElement('button'),prev=document.createElement('button'),next=document.createElement('button'),image=document.createElement('img'),caption=document.createElement('footer'),description=document.createElement('p'),links=document.createElement('div'),sourceLink=document.createElement('a'),originalLink=document.createElement('a');
 dialog.id='image-lightbox';dialog.dataset.noTranslate='true';dialog.setAttribute('aria-label',translate('Podgląd zdjęcia'));
 content.className='image-lightbox-content';close.className='image-lightbox-close';close.type='button';close.textContent='×';close.onclick=()=>dialog.close();
 prev.className='image-lightbox-nav image-lightbox-prev';prev.type='button';prev.textContent='‹';prev.setAttribute('aria-label',translate('Poprzednie zdjęcie'));
 next.className='image-lightbox-nav image-lightbox-next';next.type='button';next.textContent='›';next.setAttribute('aria-label',translate('Następne zdjęcie'));
 prev.onclick=()=>showReferenceImage(modal.index-1);next.onclick=()=>showReferenceImage(modal.index+1);
 image.className='image-lightbox-image';image.alt='';caption.className='image-lightbox-caption';description.className='image-lightbox-description';links.className='image-lightbox-links';
 [sourceLink,originalLink].forEach(link=>{link.target='_blank';link.rel='noopener noreferrer'});links.append(sourceLink,originalLink);caption.append(description,links);content.append(close,prev,image,next,caption);dialog.append(content);
 dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});
 dialog.addEventListener('close',()=>{image.removeAttribute('src');image.onerror=null});
 // Left/right only make sense once more than one photo is open in the same
 // gallery - modal.sources is set by openReferenceImage right before this
 // can fire, so a lightbox opened for a single image (or before any gallery
 // ever opened one) simply ignores the arrow keys.
 dialog.addEventListener('keydown',event=>{
  if(!modal.sources||modal.sources.length<2)return;
  if(event.key==='ArrowLeft'){event.preventDefault();showReferenceImage(modal.index-1)}
  else if(event.key==='ArrowRight'){event.preventDefault();showReferenceImage(modal.index+1)}
 });
 document.body.append(dialog);const modal={dialog,close,prev,next,image,description,sourceLink,originalLink,sources:[],index:0};imageLightbox=modal;return modal;
}
// Renders sources[index] into the already-open lightbox and updates the
// prev/next affordance. Navigation wraps around cyclically rather than
// stopping at the ends, since the gallery it browses is always a short,
// fixed set (capped at 5 images) rather than an open-ended list where
// wrapping could feel disorienting.
function showReferenceImage(index){
 const modal=imageLightbox;if(!modal)return;
 const count=modal.sources.length;modal.index=((index%count)+count)%count;
 const source=modal.sources[modal.index],thumbnail=source.thumbnailUrl||source;
 modal.image.alt=translate('Zdjęcie obiektu');modal.image.onerror=()=>{if(modal.image.src!==thumbnail)modal.image.src=thumbnail};modal.image.src=source.originalUrl||thumbnail;
 modal.description.textContent=source.sourceDescription||translate('Źródło zdjęcia nie jest opisane.');
 modal.sourceLink.hidden=!source.sourceUrl;modal.sourceLink.href=source.sourceUrl||'#';modal.sourceLink.textContent=translate('Źródło ↗');
 modal.originalLink.href=source.originalUrl||thumbnail;modal.originalLink.textContent=translate('Otwórz oryginał ↗');
 modal.prev.hidden=modal.next.hidden=count<2;
}
function openReferenceImage(sources,index){
 const modal=ensureImageLightbox();
 modal.dialog.setAttribute('aria-label',translate('Podgląd zdjęcia'));modal.close.setAttribute('aria-label',translate('Zamknij podgląd zdjęcia'));
 modal.sources=sources;showReferenceImage(index);
 if(!modal.dialog.open)modal.dialog.showModal();
}
// `description` is shown once above the photos, with Wikipedia's own
// summary as a fallback once it loads if there is no local text at all -
// for a body whose panel has nowhere else to put a description. A caller
// that already showed this same text higher up in the panel (a sky
// object's own note, a star's appearance note) instead passes
// `hasDescriptionElsewhere: true`, which drops this section's text
// altogether - not the local note, and not the Wikipedia fallback either,
// so the photos are not captioned with a second, differently-worded
// description right under the first one.
function mountWikipediaReference(subject,{description='',images=[],hasDescriptionElsewhere=false}={}){
 const section=document.createElement('section'),eyebrow=document.createElement('p'),gallery=document.createElement('div'),link=document.createElement('a');
 const copy=hasDescriptionElsewhere?null:document.createElement('p');
 section.className='object-reference';section.dataset.noTranslate='true';
 eyebrow.className='reference-eyebrow';eyebrow.textContent=translate('Zdjęcia');
 if(copy){copy.className='reference-description';copy.textContent=description||translate('Ładowanie opisu i zdjęć…')}
 gallery.className='reference-gallery';gallery.setAttribute('aria-busy','true');const spinner=document.createElement('div');spinner.className='gallery-spinner';spinner.setAttribute('aria-hidden','true');gallery.append(spinner);
 link.className='reference-wikipedia';link.target='_blank';link.rel='noopener noreferrer';link.href=wikipediaSearchUrl(wikipediaTitle(subject,getLanguage()),getLanguage());link.textContent=translate('Wikipedia ↗');
 section.append(eyebrow,...(copy?[copy]:[]),gallery,link);const referenceAnchor=panel.querySelector('.reference-anchor'),beforeActions=referenceAnchor||panel.querySelector('.primary-actions');if(beforeActions)panel.insertBefore(section,beforeActions);else panel.append(section);
 const renderGallery=sources=>{
  const unique=sources.filter(Boolean).map(source=>typeof source==='string'?{thumbnailUrl:source,originalUrl:source}:source).filter((source,index,list)=>list.findIndex(candidate=>candidate.thumbnailUrl===source.thumbnailUrl)===index).slice(0,5);gallery.replaceChildren();gallery.setAttribute('aria-busy','false');
  unique.forEach((source,index)=>{const button=document.createElement('button'),image=document.createElement('img');button.className='reference-image-button';button.type='button';button.setAttribute('aria-label',translate('Otwórz zdjęcie obiektu'));image.loading='lazy';image.decoding='async';image.src=source.thumbnailUrl;image.alt=translate('Zdjęcie obiektu');image.onerror=()=>button.remove();button.onclick=()=>openReferenceImage(unique,index);button.append(image);gallery.append(button)});
  if(!unique.length){const unavailable=document.createElement('span');unavailable.textContent=translate('Zdjęcie Wikipedii niedostępne.');gallery.append(unavailable)}
 };
 wikipediaReference(subject,getLanguage()).then(reference=>{
  if(!section.isConnected)return;
  if(copy)copy.textContent=description||reference.description||translate('Opis artykułu jest niedostępny.');
  link.href=reference.url;renderGallery([...images,...(reference.imageDetails||reference.images)]);
 }).catch(()=>{if(!section.isConnected)return;renderGallery(images)});
}
function knownPlacesMarkup(places){
 if(!places.length)return '';
 const items=places.map((place,i)=>`<button type="button" class="known-place" data-index="${i}">${place.name}</button>`).join('');
 return `<section class="known-places"><p class="reference-eyebrow">Znane miejsca</p><div class="known-places-list">${items}</div><p class="muted known-places-hint">Przenosi w to miejsce.</p></section>`;
}
function showBody(){if(blackHoleFall)stopBlackHoleFall();if(lightFlight){const id=selected;stopLightFlight();selected=id}const b=bs.find(x=>x.id===selected);if(!b)return;requestDetailTexture(b);const velocity=b.v.map(x=>x*AU/86400),primary=b.key==='sun'?null:bs.find(x=>x.id===b.parent)||bs.find(x=>x.key==='sun'),orbitalVelocity=primary?relativeVelocity(b,primary):b.v,speedMagnitude=velocityKmPerSecond(orbitalVelocity),speedLabel=b.key==='sun'?'Prędkość barycentryczna · km/s':b.parent?'Prędkość względem planety · km/s':'Prędkość względem Słońca · km/s',magneticField=b.key==='neutron-star'?row('Pole magnetyczne · T',`<output class="value-readout">${formatNumber(b.magneticField,3)}</output>`):'',star=centralStarDetails(b),starRows=star?`${row('Typ widmowy',`<output class="value-readout">${star.spectralType}</output>`)}${row('Galaktyka',`<output class="value-readout">${star.galaxy}</output>`)}${row('Temperatura efektywna · K',`<output class="value-readout">${formatNumber(star.temperature,0)}</output>`)}${row('Ciepłota barwowa · K',`<output class="value-readout">${formatNumber(star.colorTemperature,0)}</output>`)}${row('Jasność · L☉',`<output class="value-readout">${formatNumber(star.luminosity,2)}</output>`)}`:'',isSurfaceCandidate=surfaceCandidates().some(candidate=>candidate.id===b.id),surfaceAction=isSurfaceCandidate?'<button class="action" id="surface-open">Widok z powierzchni</button>':'',places=isSurfaceCandidate?knownPlacesFor(b):[],landmarksToggle=places.length?`<label class="sky-toggle landmarks-toggle" for="landmarks-toggle"><span>Punkty orientacyjne</span><input id="landmarks-toggle" type="checkbox" role="switch" aria-label="Pokaż punkty orientacyjne na podglądzie"${showLandmarks?' checked':''}><i aria-hidden="true"></i></label>`:'';shell(b.name,`${landmarksToggle}${temperatureMarkup(b)}${starRows}${row('Masa · kg',num('mass',b.mass*SOLAR_MASS))}${row(b.key==='blackhole'?'Horyzont · km':'Promień · km',num('radius',b.radius))}${row(speedLabel,`<output class="value-readout">${formatNumber(speedMagnitude,3)}</output>`)}${magneticField}${primary?row('Punkt odniesienia',`<output class="value-readout">${primary.name}</output>`):''}${row('Obrót · godz.',num('spin',b.spin))}${row('Nachylenie osi · °',num('tilt',b.tilt))}${vecFields('p',b.p,'Położenie X / Y / Z · AU')}${vecFields('v',velocity,'Prędkość X / Y / Z · km/s')}<div class="actions primary-actions"><button class="action primary" id="apply">Zastosuj</button><button class="action" id="focus">Śledź</button>${surfaceAction}</div><div class="reference-anchor"></div><details class="advanced-fields"><summary>Dodatkowe opcje</summary>${row('Zamień orbitę',`<select id="swap"><option value="">Wybierz ciało</option>${bs.filter(x=>x.a&&x.id!==b.id).map(x=>`<option value="${x.id}">${x.name}</option>`).join('')}</select>`)}<div class="actions"><button class="action" id="tools">Symulacja</button><button class="action danger" id="remove">Usuń</button></div></details><p class="muted" id="validation" role="status"></p>`);panel.dataset.bodyId=String(b.id);setEducationSubject(b.id);
 if(b.key==='blackhole'){const r=document.querySelector('#radius');r.setAttribute('aria-label','Horyzont · km');r.readOnly=true;document.querySelector('#mass').oninput=e=>r.value=horizonRadius(+e.target.value)}
 if(views.get(b.id)?.lastImpactAxis){const button=document.createElement('button');button.className='action';button.textContent='Pokaż miejsce uderzenia';button.onclick=()=>{focusBody(b.id);const view=views.get(b.id);view.mesh.updateWorldMatrix(true,false);const direction=view.lastImpactAxis.clone().applyQuaternion(view.mesh.getWorldQuaternion(new THREE.Quaternion()));camera.position.copy(displayed(b)).addScaledVector(direction,Math.max(radius(b)*4,controls.minDistance*2));controls.target.copy(displayed(b));controls.update()};panel.querySelector('.actions').append(button)}
 const appearance=moonAppearance[b.name];if(b.key==='moon'&&appearance){const note=document.createElement('p');note.className='muted appearance-note';note.append(document.createTextNode(appearance.unknown?'Szczegóły powierzchni nieznane':appearance.haze?'Atmosfera w świetle widzialnym · barwa przybliżona':appearance.map?'Mapa misji · barwa przybliżona':'Wygląd orientacyjny · brak pełnej mapy'));const links=document.createElement('span');links.textContent=' · ';appearance.sources.forEach((url,i)=>{const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`[${i+1}]`;a.setAttribute('aria-label',`Zdjęcia i źródła ${i+1}`);links.append(a)});note.append(links);panel.querySelector('.panel-head').after(note)}
 if(b.textureKey){const note=document.createElement('p');note.className='muted appearance-note';note.textContent='Wizualizacja naukowa · tekstura symulowana';if(b.visualSource){const link=document.createElement('a');link.href=b.visualSource;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · Materiały źródłowe ↗';note.append(link)}panel.querySelector('.panel-head').after(note)}
 const previewLighting=body=>{const sun=bs.find(candidate=>candidate.key==='sun');return {sunDirection:sun?displayed(sun).sub(displayed(body)):null,brightness:solarBrightness}};const previewHost=document.createElement('div');previewHost.className='body-preview';const panelHead=panel.querySelector('.panel-head'),primaryActions=panel.querySelector('.primary-actions');panelHead.prepend(previewHost);panelHead.after(primaryActions);preview.attach(previewHost,b,views.get(b.id),previewLighting(b),places,showLandmarks);attachBodyLandmarks(b,views.get(b.id),places);
 const landmarksInput=document.querySelector('#landmarks-toggle');if(landmarksInput)landmarksInput.onchange=e=>setLandmarksVisible(e.target.checked);
 if(star){const note=document.createElement('p');note.className='muted appearance-note';note.textContent=star.note||'';if(star.source){const link=document.createElement('a');link.href=star.source;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · Źródło ↗';note.append(link)}panel.querySelector('.panel-head').after(note)}
 panelHead.after(primaryActions);
 const preset=catalog.find(item=>item.id===b.presetId||item.id===b.key);mountWikipediaReference(wikipediaSubjectForBody(b),{description:translate(star?'':b.note||preset?.note||''),images:bodyReferenceImages(b),hasDescriptionElsewhere:!!star});
 document.querySelector('#apply').onclick=()=>{const m=+document.querySelector('#mass').value,r=+document.querySelector('#radius').value,s=+document.querySelector('#spin').value,t=+document.querySelector('#tilt').value,p=getVec('p'),v=getVec('v');if(![m,r,s,t,...p,...v].every(Number.isFinite)||!validDimensions(m,r)||s===0||p.some(x=>Math.abs(x)>1e5)||v.some(x=>Math.abs(x)>299792)){document.querySelector('#validation').textContent='Sprawdź wartości: masa i promień muszą być dodatnie, obrót różny od zera.';return}b.mass=m/SOLAR_MASS;b.radius=b.key==='blackhole'?horizonRadius(m):r;b.spin=s;b.tilt=t;b.p=p;b.v=v.map(x=>x*86400/AU);if(b.key==='sun')applySolarBrightness();clearTrails();updateOrbits();document.querySelector('#validation').textContent='Zapisano parametry.'};document.querySelector('#focus').onclick=()=>focusBody(b.id,{keepPanel:true});const surfaceOpen=document.querySelector('#surface-open');if(surfaceOpen)surfaceOpen.onclick=()=>startSurfaceView(b.id);document.querySelector('#tools').onclick=showTools;document.querySelector('#remove').onclick=()=>{bs=bs.filter(x=>x.id!==b.id);disposeView(b.id);closePanel();updateOrbits()};document.querySelector('#swap').onchange=e=>{const other=bs.find(x=>x.id===+e.target.value);if(!other)return;const oldP=[...b.p],oldV=[...b.v],otherP=[...other.p],otherV=[...other.v];for(const moon of bs.filter(x=>x.parent===b.id)){moon.p=moon.p.map((x,k)=>x+otherP[k]-oldP[k]);moon.v=moon.v.map((x,k)=>x+otherV[k]-oldV[k])}for(const moon of bs.filter(x=>x.parent===other.id)){moon.p=moon.p.map((x,k)=>x+oldP[k]-otherP[k]);moon.v=moon.v.map((x,k)=>x+oldV[k]-otherV[k])}b.p=otherP;b.v=otherV;other.p=oldP;other.v=oldV;clearTrails();updateOrbits();showBody()}}
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
 // A listed encounter carries the moment it is staged from. Rewinding the whole
 // system to that date is what makes it repeatable: every planet, and therefore
 // everything the projectile could meet on the way, is back where it was the
 // last time this scenario ran. A course the viewer built has no such date and
 // leaves the clock alone, so it plays out in the system they are looking at.
 if(scenario?.epoch)resetSystem(new Date(scenario.epoch));
 const target=scenario&&findScenarioTarget(bs,scenario);if(!scenario||!target)return;
 const id=scenario.id,existing=bs.find(item=>item.scenarioId===id);if(existing){bs=bs.filter(item=>item!==existing);disposeView(existing.id)}
 const preset=catalog.find(item=>item.id===scenario.projectile),state=collisionLaunchState(target,scenario);
 const projectile=createCatalogBody(preset.id,{massKg:preset.mass*SOLAR_MASS,radiusKm:preset.radius,p:state.p,v:state.v});
 projectile.name=`${preset.name} → ${target.name}`;projectile.scenarioId=id;projectile.collisionScenario={targetId:target.id,launchElapsed:elapsed,minDurationDays:state.impactDays,impactSpeedAUPerDay:state.speedAUPerDay,visualDirection:state.direction,visualApproachSpan:Math.max(2.6,radius(target)*8)};bs.push(projectile);addView(projectile);selected=projectile.id;paused=false;updateOrbits();focusBody(projectile.id,{keepPanel:true});
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
// A listed eclipse opens standing at the real spot of greatest eclipse, a
// lead time before it, aimed at whichever of the Sun or Moon is worth
// looking at - during totality that is essentially both, overlapping. The
// occlusion itself needs no scripting at all: the Moon is a real 3D body at
// its real ephemeris position, so it simply passes in front of the Sun's
// disc, and Earth already receives the same per-fragment eclipse shadow a
// planet's rings do (updateExtendedSolarShadows below) - the umbra sweeping
// across the ground is that shadow, evaluated as the real geometry moves.
function launchSolarEclipse(item){
 if(!item)return;
 const start=new Date(Date.parse(item.greatest)-SOLAR_LEAD_MINUTES*60000);
 resetSystem(start);
 const earth=bs.find(b=>b.key==='earth');if(!earth)return;
 startSurfaceView(earth.id);
 if(!surfaceView)return;
 // Standing on Earth normally opens on the device's real "now"
 // (beginEarthSurfaceContext, called from inside startSurfaceView above) -
 // exactly what a scripted date must not be second-guessed by, so it is put
 // back here once surface view has finished its own setup. bs is already
 // built for `start` by resetSystem, and is unaffected by that reset.
 epoch=start;elapsed=0;lag=0;last=performance.now();clockShown='';
 surfaceView.latitude=item.location.latitude;surfaceView.longitude=item.location.longitude;surfaceView.locationOverride=true;
 surfaceView.trackBrightest=true;
 aimAtSomethingWorthSeeing(earth);
 // At the Sun's real half-degree apparent size, the default field of view
 // draws it a few pixels across - correct, but too small to actually watch
 // the Moon cross it. The closest zoom the surface view allows is still wide
 // enough to keep both discs comfortably framed even with imperfect aim.
 surfaceView.fov=SURFACE_FOV.min;
 speed=MINUTE_PER_SECOND;paused=false;
 buildSurfaceHud();updateSurfaceView();paintEarthLocation();
}
// Built from whole reusable phrases (each registered as one row in
// messages.js) rather than single translated words stitched together: the
// eclipse kind and its phase noun invert order or inflect differently enough
// across Polish, English, German and Spanish that translating word-by-word
// would not reliably agree. The interpolated duration and place name carry
// no Polish text of their own, so the automatic DOM translator (i18n.js)
// still renders the whole sentence correctly once it reaches the page.
const SOLAR_ECLIPSE_LABEL={total:'Całkowite zaćmienie Słońca',annular:'Obrączkowe zaćmienie Słońca',hybrid:'Hybrydowe zaćmienie Słońca'};
const SOLAR_ECLIPSE_PHASE={total:'fazy całkowitej',annular:'fazy obrączkowej',hybrid:'fazy całkowitej'};
function solarEclipseNote(item){
 const label=SOLAR_ECLIPSE_LABEL[item.kind]||item.kind,phase=SOLAR_ECLIPSE_PHASE[item.kind]||'',duration=formatEclipseDuration(item.durationSeconds);
 return `${label}. Maksymalny czas trwania ${phase} (w miejscu największego zaćmienia): ${duration}. Scenariusz otwiera widok z okolic ${item.location.name}.`;
}
// A lunar eclipse needs none of the surface-view machinery a solar one does:
// it is visible from an entire hemisphere at once rather than one narrow
// path, so the scenario simply follows the Moon from outside, in real scale
// - compressed mode would distort exactly the relative sizes and distances
// the eclipse shader's overlap calculation depends on, the same reason
// surface view always forces it. Earth already receives the shadow through
// the ordinary occluder list updateExtendedSolarShadows builds every frame;
// nothing here scripts the umbra itself.
const LUNAR_ECLIPSE_PHASE_LABEL={totality:'Faza całkowita',partial:'Faza częściowa',penumbral:'Faza półcieniowa'};
function lunarEclipseNote(item){
 const parts=[`${item.name}.`];
 if(item.totalitySeconds)parts.push(`${LUNAR_ECLIPSE_PHASE_LABEL.totality}: ${formatEclipseDuration(item.totalitySeconds)}.`);
 if(item.partialSeconds)parts.push(`${LUNAR_ECLIPSE_PHASE_LABEL.partial}: ${formatEclipseDuration(item.partialSeconds)}.`);
 parts.push(`${LUNAR_ECLIPSE_PHASE_LABEL.penumbral}: ${formatEclipseDuration(item.penumbralSeconds)}.`);
 return parts.join(' ');
}
function launchLunarEclipse(item){
 if(!item)return;
 const start=new Date(Date.parse(item.greatest)-lunarEclipseLeadMinutes(item)*60000);
 resetSystem(start);
 const moon=bs.find(b=>b.key==='moon'&&bs.find(host=>host.id===b.parent)?.key==='earth');if(!moon)return;
 compressed=false;controls.maxDistance=maxViewDistance(false);clearTrails();updateOrbits();
 focusBody(moon.id,{keepPanel:false});
 speed=MINUTE_PER_SECOND;paused=false;
}
function showEclipseLauncher(){
 const solarOptions=SOLAR_ECLIPSES.map(item=>`<option value="${item.id}">${item.name} · ${dateFormat.format(new Date(item.greatest))}</option>`).join('');
 const lunarOptions=LUNAR_ECLIPSES.map(item=>`<option value="${item.id}">${item.name} · ${dateFormat.format(new Date(item.greatest))}</option>`).join('');
 shell('Zaćmienia',`<label class="field-title">Zaćmienia Słońca</label>${row('Wydarzenie',`<select id="solar-eclipse">${solarOptions}</select>`)}<p class="muted" id="solar-eclipse-note"></p><div class="actions"><button class="action primary" id="launch-solar-eclipse">Uruchom</button><button class="action" id="tools">Symulacja</button></div><div class="separator"></div><label class="field-title">Zaćmienia Księżyca</label>${row('Wydarzenie',`<select id="lunar-eclipse">${lunarOptions}</select>`)}<p class="muted" id="lunar-eclipse-note"></p><div class="actions"><button class="action primary" id="launch-lunar-eclipse">Uruchom</button></div>`);
 const solarSelect=document.querySelector('#solar-eclipse'),solarNote=document.querySelector('#solar-eclipse-note');
 const refreshSolarNote=()=>{
  const item=SOLAR_ECLIPSES.find(x=>x.id===solarSelect.value);if(!item)return;
  solarNote.textContent=solarEclipseNote(item);
 };
 solarSelect.onchange=refreshSolarNote;refreshSolarNote();
 document.querySelector('#launch-solar-eclipse').onclick=()=>launchSolarEclipse(SOLAR_ECLIPSES.find(item=>item.id===solarSelect.value));
 const lunarSelect=document.querySelector('#lunar-eclipse'),lunarNote=document.querySelector('#lunar-eclipse-note');
 const refreshLunarNote=()=>{
  const item=LUNAR_ECLIPSES.find(x=>x.id===lunarSelect.value);if(!item)return;
  lunarNote.textContent=lunarEclipseNote(item);
 };
 lunarSelect.onchange=refreshLunarNote;refreshLunarNote();
 document.querySelector('#launch-lunar-eclipse').onclick=()=>launchLunarEclipse(LUNAR_ECLIPSES.find(item=>item.id===lunarSelect.value));
 document.querySelector('#tools').onclick=showTools;
}
eclipseButton.onclick=showEclipseLauncher;
// Standing on a body and looking up.
//
// The whole point is that the sky is the real one: the stars come from the
// catalogue, the planets from the ephemeris, the Moon from its own theory, and
// the horizon from the body's measured pole and prime meridian. Real scale is
// forced on, because an enlarged radius would put the observer's eye tens of
// thousands of kilometres up and the parallax of everything nearby would be
// wrong. Bodies with tabulated rotational elements get a true horizon; a
// satellite locked to its primary gets one built from the scene's geometry,
// which keeps its primary overhead where it belongs.
const SURFACE_TABULATED = new Set(rotatingBodies());
// Hyperion tumbles chaotically and has no fixed face to stand on, which is the
// one thing that would make a horizon meaningless there.
const SURFACE_EXCLUDED = new Set(['Hyperion']);
// The eye, as a fraction of a mean radius up. Measured irregular moons use
// their own longest semiaxis; generic spawned rocks retain the deliberately
// larger clearance needed for their procedural envelope.
const SURFACE_EYE = 1.0008, SURFACE_EYE_IRREGULAR = 1.6;
const surfaceBaseRadiusFactor=(body,latitude=surfaceView?.latitude??0,longitude=surfaceView?.longitude??0)=>body.irregular?1:surfaceRadialScale(body,latitude,longitude);
const surfaceEyeFactor=(body,latitude=surfaceView?.latitude??0,longitude=surfaceView?.longitude??0)=>{
 const base=surfaceBaseRadiusFactor(body,latitude,longitude);
 // An ellipsoid's polar and equatorial radii are not interchangeable.  The
 // eye must clear the surface at the current latitude, particularly on
 // Saturn and Uranus where a mean-radius eye falls inside the polar mesh.
 const standingRadius=body.irregular?(hasMeasuredIrregularShape(body)?Math.max(1.02,largestAxis(body)*1.08):SURFACE_EYE_IRREGULAR):base*SURFACE_EYE;
 // The high-resolution landmark mesh is an additional physical shell. Lift
 // the eye by its surveyed elevation at the observer's own coordinate, then
 // retain only a small clearance; otherwise Everest and crater rims end up
 // below a camera parked unrealistically far above the surface.
 const key=body.key==='moon'&&['Księżyc','Moon'].includes(body.name)?'moon':body.key;
 const terrain=Math.max(0,topographyHeightKm(key,body.radius,latitude,longitude)/body.radius);
 return standingRadius+terrain+surfaceReliefClearance(body);
};
const SURFACE_FOV = {min: 14, max: 100, start: 70};

function surfaceCandidates(){
 return bs.filter(b=>{
  if(b.key==='sun'||b.key==='blackhole'||b.key==='comet'||b.key==='fragment')return false;
  if(SURFACE_EXCLUDED.has(b.name))return false;
  return SURFACE_TABULATED.has(b.key)||!!b.parent;
 });
}
function surfaceBody(){return surfaceView&&bs.find(b=>b.id===surfaceView.bodyId);}
// Which set of rotational elements applies, if any. Every satellite in the
// scene shares the key 'moon', so the key alone would hand Europa and Titan
// the Earth's Moon's pole; only the satellite of the Earth is the Moon.
function surfaceRotationKey(body){
 if(body.key==='moon')return bs.find(b=>b.id===body.parent)?.key==='earth'?'moon':null;
 return SURFACE_TABULATED.has(body.key)?body.key:null;
}
// A tabulated frame where there is one, and the geometry of the orbit where
// there is not. The Moon has both and takes the tabulated one, because its
// position is real and its libration is worth a degree and a half.
function surfaceFrameNow(body){
 const key=surfaceRotationKey(body);
 if(key)return surfaceFrame(key,surfaceView.latitude,surfaceView.longitude,simulatedDate());
 const host=bs.find(b=>b.id===body.parent);
 return host?synchronousFrame(body.p,host.p,body.v,host.v,surfaceView.latitude,surfaceView.longitude):null;
}
// Facing due north at whatever happens to be there is a poor first frame.
// The view opens on the largest thing above the horizon - Jupiter from Europa,
// Saturn from Titan, the Sun from a planet - and falls back to a comfortable
// angle above the horizon when the sky is empty.
function aimAtSomethingWorthSeeing(body){
 if(!body)return;
 const horizon=surfaceFrameNow(body);
 if(!horizon){surfaceView.azimuth=0;surfaceView.altitude=24;return}
 const above=skyObjects(surfaceEntries(body),surfaceEye(body,horizon),horizon).filter(item=>item.altitude>3);
 const target=above.sort((one,two)=>two.diameter-one.diameter)[0];
 surfaceView.azimuth=target?target.azimuth:0;
 surfaceView.altitude=target?Math.max(6,Math.min(78,target.altitude)):24;
}
// A named place (see surface-places.js) is a feature of the ground itself,
// not something to sight in the sky, so jumping to one looks down at it
// instead of hunting for the biggest thing above the horizon: a shallow dip
// below the horizon (rather than aimAtSomethingWorthSeeing's upward angles)
// keeps the ground - and whatever the eye height's relief and texture show of
// the feature - in the lower part of the frame, with the horizon and open sky
// still filling the rest, instead of either the ground or the sky alone.
const KNOWN_PLACE_ALTITUDE=-18;
function aimAtLocalGround(){
 surfaceView.azimuth=0;surfaceView.altitude=KNOWN_PLACE_ALTITUDE;
}
function aimAtTerrainFeature(body){
 const feature=nearestSurfaceFeature(body,surfaceView.latitude,surfaceView.longitude);
 if(!feature||feature.distanceKm>terrainActivationRadius(body))return false;
 const fromLatitude=surfaceView.latitude*Math.PI/180,toLatitude=feature.latitude*Math.PI/180;
 const longitudeDelta=(feature.longitude-surfaceView.longitude)*Math.PI/180;
 const east=Math.sin(longitudeDelta)*Math.cos(toLatitude);
 const north=Math.cos(fromLatitude)*Math.sin(toLatitude)-Math.sin(fromLatitude)*Math.cos(toLatitude)*Math.cos(longitudeDelta);
 // azimuth 0 is north and positive angles rotate eastward, the same local
 // convention surfaceLook() and the compass use.
 surfaceView.azimuth=(Math.atan2(east,north)*180/Math.PI+360)%360;
 const observerHeight=Math.max(0,topographyHeightKm(body.key==='moon'?'moon':body.key,body.radius,surfaceView.latitude,surfaceView.longitude));
 const targetHeight=feature.kind==='peak'?feature.heightKm:feature.kind==='shield'?feature.heightKm-feature.calderaDepthKm:-feature.depthKm;
 const elevation=Math.atan2(targetHeight-observerHeight-1.5,Math.max(1,feature.distanceKm))*180/Math.PI;
 // Put the landform in the first frame even when the point's published
 // coordinate was rounded to whole degrees.
 surfaceView.altitude=Math.max(-16,Math.min(38,elevation));
 return true;
}
function terrainShowcasePosition(body,feature){
 // A named landmark opens from far enough away to contain its whole profile,
 // rather than placing the camera on its summit, caldera floor or crater rim.
 // The viewer can then walk toward it with the normal surface controls.
 const distanceKm=Math.max(
  feature.radiusKm*4.2,
  feature.kind==='shield'?930:feature.kind==='crater'?165:76
 );
 const angular=distanceKm/body.radius, bearing=225*Math.PI/180;
 const latitude=feature.latitude*Math.PI/180,longitude=feature.longitude*Math.PI/180;
 const targetLatitude=Math.asin(Math.sin(latitude)*Math.cos(angular)+Math.cos(latitude)*Math.sin(angular)*Math.cos(bearing));
 const targetLongitude=longitude+Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(latitude),Math.cos(angular)-Math.sin(latitude)*Math.sin(targetLatitude));
 return {latitude:targetLatitude*180/Math.PI,longitude:((targetLongitude*180/Math.PI+540)%360)-180};
}
function startSurfaceView(bodyId){
 if(cinematic)stopCinematic();
 const body=bs.find(b=>b.id===bodyId);if(!body)return;
 if(lightFlight)stopLightFlight();
 stopSolarDeath();
 if(!surfaceView)surfaceReturn={compressed,camera:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,follow,speed};
 surfaceView={bodyId,key:body.key,name:body.name,latitude:0,longitude:0,azimuth:0,altitude:24,fov:SURFACE_FOV.start,deviceLocalTime:isEarthSurface(body),locationState:isEarthSurface(body)?'requesting':null,locationOverride:false,cloudsRecenter:true,earthAtmosphereEnabled:false};
 if(isEarthSurface(body))beginEarthSurfaceContext();
 aimAtSomethingWorthSeeing(body);
 navigation.reset();surfaceNavigation.reset();follow=null;selected=null;closePanel();
 compressed=false;controls.maxDistance=maxViewDistance(false);controls.enabled=false;
 requestDetailTexture(body);enterSurfaceDetail(views.get(body.id),body,renderer.capabilities.getMaxAnisotropy());
 attachEarthCloudCover(body);
 speed=REAL_TIME;lag=0;last=performance.now();
 document.body.classList.add('on-a-surface');
 clearTrails();updateOrbits();surfaceHud.hidden=false;surfaceControlsHelp.hidden=false;surfaceRadar.hidden=false;skyLabels.hidden=false;buildSurfaceHud();updateSurfaceView();
 if(isEarthSurface(body))requestEarthObserverLocation();
}
// Jumps straight into surface view already standing at a named "known place"
// (see surface-places.js) instead of the default latitude/longitude zero,
// looking down at the ground so the feature is actually visible, and marks
// the position as chosen by hand: on Earth this is the whole point of
// clicking a place at all, so a device location fix that is already in
// flight (or still arrives later from the ongoing watch) must not silently
// carry the view back to wherever the device actually is.
function goToKnownPlace(bodyId,place){
 const body=bs.find(candidate=>candidate.id===bodyId);if(!body)return;
 startSurfaceView(bodyId);
 if(!surfaceView)return;
 surfaceView.latitude=place.latitude;surfaceView.longitude=place.longitude;surfaceView.locationOverride=true;surfaceView.cloudsRecenter=true;
 const landmark=nearestSurfaceFeature(body,surfaceView.latitude,surfaceView.longitude);
 // Only the surveyed landmarks use the cinematic overview. Other named
 // places remain exact point-of-interest destinations.
 if(landmark&&landmark.distanceKm<=Math.max(40,landmark.radiusKm*1.5)){
  const overview=terrainShowcasePosition(body,landmark);
  surfaceView.latitude=overview.latitude;surfaceView.longitude=overview.longitude;
  surfaceView.fov=80;
 }
 if(!aimAtTerrainFeature(body))aimAtLocalGround();
 buildSurfaceHud();updateSurfaceView();paintEarthLocation();
 // A known place deserves the same treatment as a body, constellation, or
 // deep-sky object: a panel with what it is and, when Wikipedia has an
 // article on it, a description and photos - not just a silent camera jump.
 // startSurfaceView() above already closed any previously open panel, so
 // this reopens it, and it works identically whether the place was clicked
 // from the surface-view HUD's own list or from a landmark pin back in the
 // standard orbital view, since both paths call this same function.
 showKnownPlace(bodyId,place);
}
function stopSurfaceView(){
 if(!surfaceView)return;
 surfaceNavigation.reset();
 detachEarthCloudCover();
 leaveSurfaceDetail(views.get(surfaceView.bodyId));
 clearEarthObserverLocation();
 const previous=surfaceReturn;surfaceView=null;surfaceReturn=null;clockShown='';
 document.body.classList.remove('on-a-surface');surfaceHud.hidden=true;surfaceControlsHelp.hidden=true;surfaceRadar.hidden=true;surfaceAtmosphereLayer.hidden=true;skyLabels.hidden=true;skyLabels.replaceChildren();releaseSurfaceOrientation();
 controls.enabled=true;camera.fov=previous?.fov??43;camera.near=CAMERA_NEAR;camera.up.set(0,1,0);camera.updateProjectionMatrix();
 if(previous){compressed=previous.compressed;follow=previous.follow;speed=previous.speed??2;lag=0;last=performance.now();
  controls.maxDistance=maxViewDistance(compressed);controls.enableDamping=false;
  camera.position.copy(previous.camera);controls.target.copy(previous.target);controls.update();controls.enableDamping=true;}
 clearTrails();updateOrbits();
}
// An Earth surface session starts at the user's present instant. The physics
// sandbox stays intact, while the local horizon, Moon phase and displayed
// clock all begin at the same moment as the device clock.
function beginEarthSurfaceContext(){
 epoch=new Date();elapsed=0;lag=0;last=performance.now();clockShown='';
}
function clearEarthObserverLocation(){
 if(earthLocationWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(earthLocationWatch);
 earthLocationWatch=null;
}
function applyEarthObserverLocation(position){
 if(!surfaceView||surfaceView.key!=='earth')return;
 // A place picked by hand - a known place, or the latitude/longitude fields
 // themselves - wins outright: the watch keeps running underneath so a plain
 // "back to Earth" still gets a live fix, but it must not silently drag a
 // chosen position back to wherever the device actually is.
 if(surfaceView.locationOverride)return;
 const point=earthObserverCoordinates(position.coords);
 if(!point){surfaceView.locationState='unavailable';paintEarthLocation();return}
 const firstLocation=surfaceView.locationState!=='granted';
 surfaceView.latitude=point.latitude;surfaceView.longitude=point.longitude;surfaceView.locationAccuracy=point.accuracy;surfaceView.locationState='granted';
 // The first permitted device location defines the weather cell for this
 // visit. Subsequent position updates leave clouds in the world so walking
 // can carry the observer toward or through them.
 if(firstLocation)surfaceView.cloudsRecenter=true;
 const latitudeInput=document.querySelector('#surface-latitude'),longitudeInput=document.querySelector('#surface-longitude');
 if(latitudeInput)latitudeInput.value=String(point.latitude);
 if(longitudeInput)longitudeInput.value=String(point.longitude);
 if(firstLocation)aimAtSomethingWorthSeeing(surfaceBody());
 updateSurfaceView();
}
function markEarthObserverLocationUnavailable(){
 if(!surfaceView||surfaceView.key!=='earth'||surfaceView.locationOverride)return;
 surfaceView.locationState='unavailable';paintEarthLocation();
}
function requestEarthObserverLocation(){
 if(!surfaceView||surfaceView.key!=='earth')return;
 clearEarthObserverLocation();
 if(!navigator.geolocation){markEarthObserverLocationUnavailable();return}
 // A zero maximum age requests a new device fix every time Earth is opened.
 // The watch then keeps sliders and the observer point in step if the device
 // moves while its surface view stays open.
 earthLocationWatch=navigator.geolocation.watchPosition(applyEarthObserverLocation,markEarthObserverLocationUnavailable,
  {enableHighAccuracy:true,maximumAge:0,timeout:15000});
}
// Direction of gaze in the local frame, from the azimuth and altitude the
// viewer has turned to.
function surfaceLook(frame){
 const azimuth=surfaceView.azimuth*Math.PI/180,altitude=surfaceView.altitude*Math.PI/180;
 const horizontalPart=Math.cos(altitude);
 return new THREE.Vector3(...[0,1,2].map(axis=>
  frame.north[axis]*horizontalPart*Math.cos(azimuth)+frame.east[axis]*horizontalPart*Math.sin(azimuth)
  +frame.zenith[axis]*Math.sin(altitude)));
}
function detachEarthCloudCover(){
 const parent=earthCloudCover?.group.parent;
 const orbitalAtmosphere=parent?.getObjectByName('Earth orbital atmosphere');
 if(orbitalAtmosphere)orbitalAtmosphere.visible=true;
 if(!earthCloudCover)return;
 parent?.remove(earthCloudCover.group);earthCloudCover.dispose();earthCloudCover=null;
}
function attachEarthCloudCover(body){
 detachEarthCloudCover();
 if(body?.key!=='earth')return;
 const view=views.get(body.id);if(!view)return;
 // The orbital halo is a cheap outside-view effect. From within it, it is a
 // full-screen translucent shell and obscures both terrain and cloud volume.
 view.mesh.getObjectByName('Earth orbital atmosphere').visible=false;
 earthCloudCover=createEarthCloudCover();view.mesh.add(earthCloudCover.group);earthCloudCover.setEnabled(surfaceView?.earthAtmosphereEnabled!==false);
}
function updateSurfaceAtmosphere(body,frame){
 const sun=skyObjects(surfaceEntries(body),surfaceEye(body,frame),frame).find(item=>item.key==='sun');
 const key=body.key==='moon'?body.name.toLowerCase():body.key;
 const surfaceKey=body.key==='moon'&&['Księżyc','Moon'].includes(body.name)?'moon':body.key;
 const observerHeightKm=Math.max(0,topographyHeightKm(surfaceKey,body.radius,surfaceView.latitude,surfaceView.longitude));
 const state=surfaceAtmosphere(key,sun?.altitude??-90,body.key!=='earth'||surfaceView?.earthAtmosphereEnabled!==false,observerHeightKm);
 surfaceView.light={...state,sunAltitude:sun?.altitude??-90};
 sky.setAtmosphereVisibility(state.stars);
 const cloudOpacity=body.key==='earth'?(state.clouds||0):0;
 if(earthCloudCover){
  const altitude=(sun?.altitude??-90)*Math.PI/180,azimuth=(sun?.azimuth??0)*Math.PI/180;
  const horizontalPart=Math.cos(altitude);
  const worldSun=new THREE.Vector3(...[0,1,2].map(axis=>frame.north[axis]*horizontalPart*Math.cos(azimuth)+frame.east[axis]*horizontalPart*Math.sin(azimuth)+frame.zenith[axis]*Math.sin(altitude)));
  const cloudView=views.get(body.id),localSun=worldSun,localObserver=new THREE.Vector3(...frame.zenith);
  if(cloudView?.mesh){const rotation=cloudView.mesh.getWorldQuaternion(new THREE.Quaternion()).invert();localSun.applyQuaternion(rotation);localObserver.applyQuaternion(rotation);}
  const recenterClouds=surfaceView?.cloudsRecenter===true;
  earthCloudCover.setObserver(localObserver,{
   radiusKm:body.radius,
   surfaceHeightKm:observerHeightKm,
   surfaceRadius:surfaceBaseRadiusFactor(body,surfaceView.latitude,surfaceView.longitude),
   recenter:recenterClouds,
   follow:true
  });
  if(recenterClouds)surfaceView.cloudsRecenter=false;
  earthCloudCover.setLighting({daylight:cloudOpacity,sunDirection:localSun,quality:adaptiveDetail});
 }
 surfaceAtmosphereLayer.hidden=state.opacity<=0;
 surfaceAtmosphereLayer.style.setProperty('--surface-atmosphere-color',state.color);
 surfaceAtmosphereLayer.style.setProperty('--surface-atmosphere-opacity',state.opacity.toFixed(3));
 surfaceAtmosphereLayer.style.setProperty('--surface-atmosphere-density',state.density.toFixed(3));
}
function updateSurfaceView(tick=0){
 const body=surfaceBody();if(!body){stopSurfaceView();return}
 // An eclipse scenario starts aimed at the Sun, but standing still means the
 // sky turns underneath: without this the Sun and Moon would drift out of
 // frame well before the interesting part. Nothing but that one scenario ever
 // sets the flag, so every other surface view keeps its fixed, hand-aimed
 // direction exactly as before.
 if(surfaceView.trackBrightest&&tick%15===0)aimAtSomethingWorthSeeing(body);
 const horizon=surfaceFrameNow(body);if(!horizon){stopSurfaceView();return}
 surfaceView.horizon=horizon;
 const centre=displayed(body),up=new THREE.Vector3(...horizon.zenith);
 const surfaceRadius=surfaceBaseRadiusFactor(body),eyeRadius=surfaceEyeFactor(body);
 const height=radius(body)*Math.max(1e-12,eyeRadius-surfaceRadius);
 const eye=centre.clone().addScaledVector(up,radius(body)*eyeRadius);
 const lookDirection=surfaceLook(horizon);
 camera.position.copy(eye);camera.up.copy(up);
 // The near plane has to come down with the eye. It is a fixed distance for
 // the rest of the application, and an observer on the ground stands a
 // thousandth of a radius above it: on anything smaller than the Earth the
 // ground falls behind that plane and is clipped away, so the view looks
 // straight through the body at the sky on the other side. Phobos was the
 // worst of them, standing 277 near-planes too low.
 camera.near=Math.max(1e-12,height/20);
 orientSurfaceBody(body,horizon);
 const surfaceDetailView=views.get(body.id);
 updateSurfaceDetailTiles(surfaceDetailView,surfaceView.latitude,surfaceView.longitude);
 // New colour/terrain tiles can arrive after the surface view is already
 // open. Attach the shared procedural cloud-shadow uniforms to each receiver
 // as it appears; the effect is shader-based, so it cannot z-fight terrain.
 earthCloudCover?.applyGroundShadows(surfaceDetailView?.mesh);
 earthCloudCover?.update({wallSeconds:performance.now()/1000,simulatedDays:elapsed,cameraPosition:camera.position,cameraDirection:lookDirection,cameraFov:surfaceView.fov,cameraAspect:camera.aspect});
 camera.fov=surfaceView.fov;camera.updateProjectionMatrix();
 camera.lookAt(eye.clone().add(lookDirection));
 controls.target.copy(eye.clone().add(lookDirection));
 camera.updateMatrixWorld();
 // The circles and names are DOM overlays while the bodies themselves are
 // rendered every frame. Once time is running, even a modest simulation rate
 // can move a nearby body by several pixels per display frame; throttling
 // these labels made them visibly trail the WebGL object. Keep the idle,
 // paused view cheap, but repaint every running simulation frame.
 const surfaceRefreshStep=paused?6:1;
 if(tick%surfaceRefreshStep===0){updateSurfaceAtmosphere(body,horizon);paintSurfaceHud(body,horizon);paintSurfaceRadar(body,horizon);paintSkyLabels(body,horizon)}
}
// What is worth listing, and where it really is.
//
// The positions are the physical ones in AU, never the drawn ones: the scene
// stretches an AU to six units and squeezes it again in the readable scale, and
// an angular diameter taken from drawn positions comes out six times too small.
// The eye is put on the physical surface for the same reason.
//
// A moon of another planet is never anything but an invisible point from here,
// so the list is the Sun, the planets, this body's host and its siblings.
// Turn the body you are standing on by the rotation its horizon was built
// from. The renderer otherwise spins every body on its own approximate rate
// from a composed phase, which has nothing to do with the measured prime
// meridian: the camera stands still in space, correctly, while the ground
// rotates underneath it and the landscape slides away. Three.js builds a
// sphere with its poles on +y and the texture seam on -x. A geographic map's
// centre is local +x, therefore Greenwich must follow `prime`, and the map's
// eastward direction (local -z) must follow `quarter`.
const surfaceOrientation=new THREE.Matrix4();
function orientSurfaceBody(body,horizon){
 const view=views.get(body.id);if(!view)return;
 const basis=equirectangularSurfaceBasis(horizon);
 surfaceOrientation.makeBasis(new THREE.Vector3(...basis.x),new THREE.Vector3(...basis.y),new THREE.Vector3(...basis.z));
 view.axis.quaternion.setFromRotationMatrix(surfaceOrientation);
 view.axis.rotation.order='XYZ';
 view.mesh.rotation.set(0,0,0);
 view.surfaceOriented=true;
}
function releaseSurfaceOrientation(){
 for(const view of views.values()){if(view.surfaceOriented){view.axis.quaternion.identity();view.axis.userData.spinStamp=null;view.surfaceOriented=false}}
}
function surfaceEntries(body){
 return bs.filter(other=>other!==body&&(other.key!=='moon'||other.id===body.parent
  ||other.parent===body.id||(body.parent&&other.parent===body.parent)))
  .map(other=>({id:other.id,name:other.name,key:other.key,position:other.p,radiusKm:other.radius}));
}
const surfaceEye=(body,horizon)=>body.p.map((value,axis)=>value+horizon.zenith[axis]*body.radius*surfaceEyeFactor(body)/AU);
// Looking around and walking from the ground uses the same native pointer-lock
// primitive as desktop games.  Camera orientation stays local to the body,
// while WSAD changes latitude/longitude along its tangent plane.
let surfaceDrag=null;
function createSurfaceNavigation(element){
 const keys=new Set(),movement=new Set(['KeyW','KeyA','KeyS','KeyD']),surfaceKeys=new Set([...movement,'ShiftLeft','ShiftRight']);
 const editable=event=>event.target?.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(event.target?.tagName);
 let pointerLocked=false,fallbackLooking=false,lastMouse=null;
 const active=()=>!!surfaceView&&([...keys].some(key=>movement.has(key))||pointerLocked||fallbackLooking);
 function release(){keys.clear();fallbackLooking=false;lastMouse=null;if(document.pointerLockElement===element)document.exitPointerLock?.();pointerLocked=false;element.classList.remove('mouse-steering')}
 function requestLook(){if(!surfaceView||pointerLocked||!element.requestPointerLock)return;element.focus?.({preventScroll:true});const lock=element.requestPointerLock();lock?.catch?.(()=>{})}
 function turn(dx,dy){
  if(!surfaceView)return;
  const scale=surfaceView.fov/innerHeight;
  // Surface azimuth is measured clockwise from north. This is the same
  // convention as a first-person game: mouse right turns east, mouse down
  // looks down towards the ground.
  surfaceView.azimuth=((surfaceView.azimuth+dx*scale)%360+360)%360;
  surfaceView.altitude=Math.max(-89,Math.min(89,surfaceView.altitude-dy*scale));
  updateSurfaceView();
 }
 document.addEventListener('pointerlockchange',()=>{
  pointerLocked=document.pointerLockElement===element;
  // A normal left-button drag is the fallback for browsers which deny pointer
  // lock. Once lock succeeds, cancel that drag so one mouse movement cannot
  // turn the view twice.
  if(pointerLocked){fallbackLooking=false;lastMouse=null;surfaceDrag=null;element.classList.add('mouse-steering')}else if(!fallbackLooking)element.classList.remove('mouse-steering');
 });
 function move(delta){
  if(!surfaceView||![...keys].some(key=>movement.has(key)))return;
  const body=surfaceBody();if(!body)return;
  const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'));
  const right=Number(keys.has('KeyD'))-Number(keys.has('KeyA'));
  if(!forward&&!right)return;
  const sprint=keys.has('ShiftLeft')||keys.has('ShiftRight');
  const speedKmS=surfaceTraversalSpeed(body.radius,sprint);
  const next=moveSurfaceCoordinates({latitude:surfaceView.latitude,longitude:surfaceView.longitude,azimuth:surfaceView.azimuth,radiusKm:body.radius,distanceKm:speedKmS*Math.min(delta,.05),forward,right});
  surfaceView.latitude=next.latitude;surfaceView.longitude=next.longitude;surfaceView.locationOverride=true;
  paintEarthLocation();updateSurfaceView();
 }
 window.addEventListener('keydown',event=>{
  if(!surfaceView||editable(event)||event.ctrlKey||event.metaKey||event.altKey||!surfaceKeys.has(event.code))return;
  event.preventDefault();event.stopImmediatePropagation();keys.add(event.code);requestLook();
  // A short tap must still have a perceptible effect. Holding a key is
  // continuous through update(), while this nudge also makes the control
  // responsive when the browser delivers keydown and keyup in one frame.
  if(movement.has(event.code)&&!event.repeat)move(1/60);
 },true);
 window.addEventListener('keyup',event=>{if(surfaceKeys.has(event.code))keys.delete(event.code)},true);
 window.addEventListener('blur',release);
 // Standard first-person behaviour: a normal click on the world starts mouse
 // steering. Right click still works for people accustomed to the old camera.
 element.addEventListener('pointerdown',event=>{
  if(!surfaceView||event.pointerType==='touch'||![0,2].includes(event.button))return;
  if(event.button===2)event.preventDefault();
  // Pointer Lock is ideal. Some embedded browsers refuse it, though; retain
  // an explicit click-to-look mode in that case so the camera never regresses
  // to a grab-and-drag orbit control.
  fallbackLooking=true;lastMouse={x:event.clientX,y:event.clientY};element.classList.add('mouse-steering');
  requestLook();
 },true);
 document.addEventListener('mousemove',event=>{
  if(pointerLocked&&surfaceView){event.preventDefault();event.stopImmediatePropagation();turn(event.movementX,event.movementY);return}
  if(!surfaceView||!fallbackLooking||event.buttons)return;
  if(lastMouse){turn(event.clientX-lastMouse.x,event.clientY-lastMouse.y)}
  lastMouse={x:event.clientX,y:event.clientY};
 },true);
 return {reset:release,active,locked:()=>pointerLocked,looking:()=>pointerLocked||fallbackLooking,update:move};
}
function surfaceLookHandlers(element){
 const touches=new Map();let pinch=null,gestureFov=null;
 const clampFov=value=>Math.max(SURFACE_FOV.min,Math.min(SURFACE_FOV.max,value));
 const touchDistance=()=>{
  const [a,b]=[...touches.values()];return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;
 };
 const beginPinch=()=>{const distance=touchDistance();if(distance>0)pinch={distance,fov:surfaceView?.fov??SURFACE_FOV.start}};
 element.addEventListener('pointerdown',event=>{
  if(!surfaceView)return;
  if(event.pointerType==='touch'){
   touches.set(event.pointerId,{x:event.clientX,y:event.clientY});element.setPointerCapture(event.pointerId);
   if(touches.size===2)beginPinch();
   event.preventDefault();return;
  }
  if(!surfaceView||event.button!==0||surfaceNavigation?.looking())return;
  surfaceDrag={x:event.clientX,y:event.clientY};element.setPointerCapture(event.pointerId);
 });
 element.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'&&touches.has(event.pointerId)){
   touches.set(event.pointerId,{x:event.clientX,y:event.clientY});
   if(surfaceView&&touches.size>=2){
    if(!pinch)beginPinch();
    const distance=touchDistance();if(pinch&&distance>0){surfaceView.fov=clampFov(pinch.fov*pinch.distance/distance);updateSurfaceView();}
   }
   event.preventDefault();return;
  }
  if(!surfaceView||!surfaceDrag||surfaceNavigation?.locked())return;
  const scale=surfaceView.fov/innerHeight;
  surfaceView.azimuth=((surfaceView.azimuth+(event.clientX-surfaceDrag.x)*scale)%360+360)%360;
  surfaceView.altitude=Math.max(-89,Math.min(89,surfaceView.altitude-(event.clientY-surfaceDrag.y)*scale));
  surfaceDrag={x:event.clientX,y:event.clientY};updateSurfaceView();
 });
 for(const name of ['pointerup','pointercancel','lostpointercapture'])
  element.addEventListener(name,event=>{touches.delete(event.pointerId);if(touches.size<2)pinch=null;surfaceDrag=null});
 element.addEventListener('wheel',event=>{
  if(!surfaceView)return;
  event.preventDefault();
  surfaceView.fov=clampFov(surfaceView.fov*(event.deltaY>0?1.12:1/1.12));
  updateSurfaceView();
 },{passive:false});
 // Safari reports trackpad pinch as GestureEvents rather than PointerEvents.
 // Supporting both pathways keeps the field of view identical on touch
 // screens, trackpads and Safari's native gesture implementation.
 element.addEventListener('gesturestart',event=>{if(!surfaceView)return;event.preventDefault();gestureFov=surfaceView.fov},{passive:false});
 element.addEventListener('gesturechange',event=>{if(!surfaceView||!gestureFov)return;event.preventDefault();surfaceView.fov=clampFov(gestureFov/event.scale);updateSurfaceView()},{passive:false});
 element.addEventListener('gestureend',()=>{gestureFov=null});
}
const surfaceNavigation=createSurfaceNavigation(renderer.domElement);
surfaceLookHandlers(renderer.domElement);
const surfaceHud=document.createElement('aside');surfaceHud.id='surface-view';surfaceHud.hidden=true;document.body.append(surfaceHud);
// Kept next to the clock rather than inside the scrollable inspector, so the
// input legend remains in sight while an observer changes body or location.
const surfaceControlsHelp=document.createElement('aside');surfaceControlsHelp.id='surface-controls-help';surfaceControlsHelp.hidden=true;surfaceControlsHelp.setAttribute('aria-label','Sterowanie widokiem z powierzchni');surfaceControlsHelp.innerHTML='<div class="surface-controls-keys" aria-hidden="true"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></div><div><strong>Sterowanie</strong><span>Kliknij scenę · mysz: rozglądanie</span><span>WSAD · ruch &nbsp; Shift · szybciej</span><span>Pinch / kółko · przybliżenie &nbsp; Esc · zwolnij mysz</span></div>';document.body.append(surfaceControlsHelp);
const surfaceAtmosphereLayer=document.createElement('div');surfaceAtmosphereLayer.id='surface-atmosphere';surfaceAtmosphereLayer.hidden=true;surfaceAtmosphereLayer.setAttribute('aria-hidden','true');document.body.append(surfaceAtmosphereLayer);
// A small rendered sky sphere standing in for the observer's surroundings -
// see surface-radar.js - rather than a flat compass ring, so a tracked
// body's full 3D direction (bearing *and* how far up or down to look) is
// something to see at a glance instead of read off a number.
const radarWidget=createSurfaceRadar();
const surfaceRadar=document.createElement('aside');surfaceRadar.id='surface-radar';surfaceRadar.hidden=true;surfaceRadar.setAttribute('aria-label','Radar kierunku');
surfaceRadar.innerHTML='<strong id="surface-heading" aria-live="off"></strong>';
surfaceRadar.append(radarWidget.element);
document.body.append(surfaceRadar);
// Keep the horizon readout in the left column, directly after the controls
// that open it.  Its height changes with the active locale and selected body,
// so a fixed offset would either overlap the controls or waste usable space.
function layoutSurfaceHud(){
 if(innerWidth<=600){surfaceHud.style.removeProperty('--surface-view-top');return}
 const controlsBox=solarControl.getBoundingClientRect();
 const top=Math.min(Math.round(controlsBox.bottom+14),Math.max(88,innerHeight-196));
 surfaceHud.style.setProperty('--surface-view-top',`${top}px`);
}
function buildSurfaceHud(){
 const body=bs.find(b=>b.id===surfaceView.bodyId);
 const options=surfaceCandidates().map(b=>`<option value="${b.id}"${b.id===surfaceView.bodyId?' selected':''}>${b.name}</option>`).join('');
 const tabulated=!!surfaceRotationKey(body||{});
 const coordinateStep=surfaceView.key==='earth'?'.0001':'1';
 const earthLocation=surfaceView.key==='earth'?'<p id="surface-location" class="muted surface-location"></p>':'';
 const earthAtmosphere=surfaceView.key==='earth'?`<label class="surface-toggle" for="surface-earth-atmosphere"><span>${translate('Atmosfera i chmury')}</span><input id="surface-earth-atmosphere" type="checkbox" role="switch"${surfaceView.earthAtmosphereEnabled!==false?' checked':''}><i aria-hidden="true"></i></label>`:'';
 // The place to jump straight to a named feature is here, in the HUD for the
 // body actually being stood on, rather than the general object-details
 // panel - that panel is about a body's physics, reachable for any body
 // whether or not it is the one under the observer's feet.
 const places=body?knownPlacesFor(body):[];
 surfaceHud.innerHTML=`<div class="surface-head"><strong id="surface-title"></strong><button id="surface-leave" aria-label="Wróć na orbitę">×</button></div><label class="surface-row"><span>Ciało</span><select id="surface-body">${options}</select></label><label class="surface-row"><span>Szerokość</span><input id="surface-latitude" type="range" min="-90" max="90" step="${coordinateStep}" value="${surfaceView.latitude}" aria-label="Szerokość planetograficzna"><output id="surface-latitude-value"></output></label><label class="surface-row"><span>Długość</span><input id="surface-longitude" type="range" min="-180" max="180" step="${coordinateStep}" value="${surfaceView.longitude}" aria-label="Długość planetograficzna"><output id="surface-longitude-value"></output></label><p class="muted surface-note">${tabulated?'Biegun i południk zerowy z tablic IAU. Długość liczona na wschód, planetocentrycznie.':'Satelita zwrócony stale ku planecie: biegun z normalnej orbity, południk zerowy pod planetą.'}</p>${earthLocation}${earthAtmosphere}${knownPlacesMarkup(places)}<p id="surface-light" class="surface-light"></p><div id="surface-objects" class="surface-objects"></div>`;
 document.querySelector('#surface-leave').onclick=stopSurfaceView;
 document.querySelector('#surface-body').onchange=event=>{const id=+event.target.value;detachEarthCloudCover();leaveSurfaceDetail(views.get(surfaceView.bodyId));surfaceView.bodyId=id;
  clearEarthObserverLocation();const body=bs.find(b=>b.id===id);surfaceView.key=body?.key;surfaceView.name=body?.name;surfaceView.deviceLocalTime=isEarthSurface(body);surfaceView.locationState=isEarthSurface(body)?'requesting':null;surfaceView.locationOverride=false;surfaceView.cloudsRecenter=true;surfaceView.trackBrightest=false;
  if(isEarthSurface(body))beginEarthSurfaceContext();else clockShown='';
  releaseSurfaceOrientation();requestDetailTexture(body);enterSurfaceDetail(views.get(body.id),body,renderer.capabilities.getMaxAnisotropy());attachEarthCloudCover(body);aimAtSomethingWorthSeeing(body);buildSurfaceHud();updateSurfaceView();if(isEarthSurface(body))requestEarthObserverLocation();};
 const earthAtmosphereToggle=document.querySelector('#surface-earth-atmosphere');if(earthAtmosphereToggle)earthAtmosphereToggle.onchange=event=>{surfaceView.earthAtmosphereEnabled=event.target.checked;earthCloudCover?.setEnabled(event.target.checked);updateSurfaceView()};
 surfaceHud.querySelectorAll('.known-place').forEach(button=>button.onclick=()=>goToKnownPlace(surfaceView.bodyId,places[+button.dataset.index]));
 // Dragging a coordinate by hand is exactly as much a manual override as
 // clicking a known place - it must stick the same way.
 document.querySelector('#surface-latitude').oninput=event=>{surfaceView.latitude=+event.target.value;surfaceView.locationOverride=true;surfaceView.cloudsRecenter=true;paintEarthLocation();updateSurfaceView()};
 document.querySelector('#surface-longitude').oninput=event=>{surfaceView.longitude=+event.target.value;surfaceView.locationOverride=true;surfaceView.cloudsRecenter=true;paintEarthLocation();updateSurfaceView()};
 requestAnimationFrame(layoutSurfaceHud);
}
function paintEarthLocation(){
 const location=document.querySelector('#surface-location');if(!location||!surfaceView)return;
 const point=`${formatNumber(surfaceView.latitude,4)}°, ${formatNumber(surfaceView.longitude,4)}°`;
 // A chosen known place overrides whatever the device reports, so the label
 // must say so too - otherwise it would keep calling a hand-picked landmark
 // the "device location" once a fix arrives, or sit blank while one is still
 // pending.
 if(surfaceView.locationOverride)location.textContent=`${translate('Wybrana lokalizacja')}: ${point}`;
 else if(surfaceView.locationState==='granted'){
  const accuracy=surfaceView.locationAccuracy==null?'':` · ±${formatNumber(surfaceView.locationAccuracy,0)} m`;
  location.textContent=`${translate('Lokalizacja urządzenia')}: ${point}${accuracy}`;
 }else if(surfaceView.locationState==='requesting')location.textContent=translate('Pobieranie lokalizacji urządzenia…');
 else if(surfaceView.locationState==='unavailable')location.textContent=translate('Lokalizacja urządzenia niedostępna');
}
const compass=azimuth=>{const names=['N','NE','E','SE','S','SW','W','NW'];return names[Math.round(((azimuth%360)+360)%360/45)%8]};
function paintSurfaceRadar(body,frame){
 if(surfaceRadar.hidden)return;
 const heading=surfaceView.azimuth;
 const headingText=compass(heading);
 document.querySelector('#surface-heading').textContent=headingText;
 surfaceRadar.setAttribute('aria-label',`${translate('Radar kierunku')}: ${headingText}`);
 // Not filtered to above the horizon: the radar's sphere is meant to be seen
 // whole, so a body currently blocked by the ground still shows through,
 // dimmed, on the far side - "is it even worth turning around for" is part
 // of what a radar is for.
 const objects=skyObjects(surfaceEntries(body),surfaceEye(body,frame),frame)
  .sort((one,two)=>two.diameter-one.diameter)
  .slice(0,6)
  .map(object=>({...object,name:translate(object.name)}));
 radarWidget.update({objects,heading,altitude:surfaceView.altitude});
}
// Name+outline markers drawn directly over the rendered sky, so a bright
// point overhead can be matched to a body by eye instead of read off the
// radar or the object list.
function appendSkyLabel(container,kind,key,name,point,pixelRadius){
 const label=document.createElement('span');label.className='sky-label';label.dataset.kind=kind;if(key)label.dataset.object=key;
 label.style.left=`${point.x.toFixed(1)}px`;label.style.top=`${point.y.toFixed(1)}px`;
 label.style.setProperty('--sky-label-size',`${(pixelRadius*2).toFixed(1)}px`);
 label.innerHTML='<i></i><b></b>';label.querySelector('b').textContent=name;
 container.append(label);
}
// Surface-view only: the same bodies the radar already tracks
// (surfaceEntries), relative to that body's own horizon.
function paintSkyLabels(body,frame){
 if(skyLabels.hidden)return;
 const radarObjects=skyObjects(surfaceEntries(body),surfaceEye(body,frame),frame).filter(item=>item.altitude>=0);
 skyLabels.replaceChildren();
 // A body can hide another one standing behind it just as surely as the
 // ground hides what is below the horizon - Jupiter is real enough to pass
 // in front of its own moons. The same candidate list is built once and
 // reused for every label this frame; a body already excludes itself and
 // never blocks its own marker (see marker-occlusion.js).
 // The body the observer is standing on is excluded here: from a point on
 // its own surface, its angular radius approaches 90 degrees, which would
 // make it swallow the entire sky above the horizon. Whether it blocks
 // something is already the horizon check (the altitude>=0 filter above) -
 // this second pass is only for one body in the sky hiding another.
 const observerPosition=[camera.position.x,camera.position.y,camera.position.z];
 const candidates=bs.filter(b=>b.id!==body.id).map(b=>{const p=displayed(b);return {id:b.id,position:[p.x,p.y,p.z],radius:radius(b)};});
 for(const item of radarObjects){
  const other=bs.find(b=>b.id===item.id);if(!other)continue;
  const worldPosition=displayed(other),clip=worldPosition.project(camera),point=projectedPoint(clip.x,clip.y,clip.z,innerWidth,innerHeight);
  if(!point.visible)continue;
  if(findOccluder(observerPosition,[worldPosition.x,worldPosition.y,worldPosition.z],other.id,candidates))continue;
  const pixelRadius=ringPixelRadius(radius(other),camera.position.distanceTo(worldPosition),camera.fov,innerHeight);
  appendSkyLabel(skyLabels,'radar',item.key||'',translate(item.name),point,pixelRadius);
 }
}
// Deep-sky objects join whatever view is currently active - not only surface
// view - matching what is actually lit up on the dome itself (sky.js) once
// the toggle is on: those marker dots already show through every view, so
// their name+outline overlay should too. While standing on a surface, the
// ground blocks anything below the horizon, so that case alone still filters
// by altitude the same way the radar labels do; every other view has no
// horizon to speak of, so nothing is filtered there beyond being in front of
// the camera.
function paintDeepSkyLabels(){
 if(deepSkyLabels.hidden)return;
 const horizon=surfaceView?.horizon;
 const deepSkyObjects=sky.getDeepSkyObjects().filter(entry=>!horizon||horizontal([entry.target.x,entry.target.y,entry.target.z],horizon).altitude>=0);
 deepSkyLabels.replaceChildren();
 for(const entry of deepSkyObjects){
  const worldPosition=camera.position.clone().addScaledVector(entry.target,SKY_RADIUS),clip=worldPosition.project(camera),point=projectedPoint(clip.x,clip.y,clip.z,innerWidth,innerHeight);
  if(!point.visible)continue;
  const pixelRadius=deepSkyRingPixelRadius(entry.arcmin,camera.fov,innerHeight);
  appendSkyLabel(deepSkyLabels,'deep',entry.type||'',entry.label,point,pixelRadius);
 }
}
function paintSurfaceHud(body,frame){
 document.querySelector('#surface-title').textContent=body.name;
 // Full-degree rounding made a real WSAD move look inert for a long time.
 // These are location controls, so show enough precision to acknowledge
 // every visible traversal rather than hiding it until dozens of kilometres.
 document.querySelector('#surface-latitude-value').textContent=`${formatNumber(surfaceView.latitude,3)}°`;
 document.querySelector('#surface-longitude-value').textContent=`${formatNumber(surfaceView.longitude,3)}°`;
 paintEarthLocation();
 const light=document.querySelector('#surface-light');if(light&&surfaceView.light)light.textContent=`${surfaceLightLabel(surfaceView.light.phase)} · Słońce ${formatNumber(surfaceView.light.sunAltitude,1)}°`;
 const above=skyObjects(surfaceEntries(body),surfaceEye(body,frame),frame).filter(item=>item.altitude>-1);
 const host=bs.find(b=>b.id===body.parent);
 const rows=above.slice(0,7).map(item=>{
  const size=item.diameter>=1?`${formatNumber(item.diameter,1)}°`
   :item.diameter*60>=1?`${formatNumber(item.diameter*60,1)}′`:`${formatNumber(item.diameter*3600,1)}″`;
  const moonPhase=item.name==='Księżyc'&&body.key==='earth'?` · ${translate(moonPhaseName(simulatedDate()))}`:'';
  return `<div class="surface-object"><span class="surface-object-name">${item.name}</span><span class="surface-object-value">${formatNumber(item.altitude,0)}° ${compass(item.azimuth)} · ${size}${moonPhase}</span></div>`;
 }).join('');
 document.querySelector('#surface-objects').innerHTML=rows||`<div class="surface-object"><span class="surface-object-name">Nic nad horyzontem</span></div>`;
 if(host){const separation=Math.hypot(...body.p.map((value,axis)=>value-host.p[axis]))*AU;
  document.querySelector('#surface-objects').dataset.host=`${host.name} ${formatNumber(angularDiameter(host.radius,separation),1)}°`;}
}

// Star systems.
//
// A preset replaces the Solar System outright: the bodies are rebuilt from the
// published orbital elements, the scale is remeasured against the system's own
// widest orbit (see system-view.js) and the clock is set to a rate at which its
// tightest orbit takes a second or so of screen time. Everything that belongs
// to the Solar System alone - the light flight, the collision courses, the
// Sun's death, the asteroid belt - is unavailable while one is loaded.
const STELLAR_KINDS={'star':'Gwiazda','white-dwarf':'Biały karzeł','neutron-star':'Gwiazda neutronowa','blackhole':'Czarna dziura','planet':'Planeta'};
// L/L☉ from the radius and the effective temperature, which is all the presets
// carry: the Stefan-Boltzmann law with the Sun as the unit.
const stellarLuminosity=(radiusKm,temperature)=>temperature>0?Math.pow(radiusKm/SOLAR_RADIUS_KM,2)*Math.pow(temperature/5772,4):0;
function systemModeBody(item,preset,language){
 const kind=item.kind||'star',key=systemBodyKey(kind),temperature=item.temperature||0;
 const created=body({name:item.name,key,mass:item.mass,radius:item.radiusKm,p:[...item.p],v:[...item.v],
  spin:kind==='neutron-star'?.0016:24,tilt:kind==='neutron-star'?32:0,systemKind:kind,
  color:key==='sun'?blackbodyColor(temperature):item.colour||'#8d9199'});
 if(key==='sun')Object.assign(created,{stellar:true,temperature,colorTemperature:temperature,
  luminosity:stellarLuminosity(item.radiusKm,temperature),luminosityRadius:item.radiusKm,
  spectralType:item.spectralType,galaxy:preset.name,note:systemNote(preset.id,language),source:preset.source});
 return created;
}
// The point light sits on the brightest star, so a white dwarf lights its
// companion when there is no main-sequence star to do it. A pair of neutron
// stars has nothing luminous at all, and there the ambient term carries the
// scene instead of leaving it black.
// Emitted colour is set from each star's luminosity relative to the brightest
// in its own system, on a fourth root so that a factor of two hundred in
// luminosity is a factor of four on screen. Without it Algol's B8 primary is
// two hundred times its companion and the bloom swallows the whole frame.
const SYSTEM_EMISSION=9;
function paintSystem(){
 const stars=bs.filter(b=>b.key==='sun');
 const brightest=Math.max(1e-12,...stars.map(b=>stellarLuminosity(b.radius,b.colorTemperature)));
 const scale=solarBrightness/100;
 for(const b of stars){
  const view=views.get(b.id);if(!view?.mesh.material?.color)continue;
  const share=Math.max(.3,Math.pow(stellarLuminosity(b.radius,b.colorTemperature)/brightest,.25));
  view.mesh.material.color.set(blackbodyColor(b.colorTemperature||5772)).multiplyScalar(SYSTEM_EMISSION*share*scale);
 }
 // A pair of neutron stars emits nothing the renderer treats as light, so the
 // ambient term has to carry the scene rather than leave it black.
 ambient.intensity=stars.length?.09:.42;
 solarBloom.strength=SOLAR_BLOOM_STRENGTH*.42*scale;
}
function startSystemMode(id){
 const preset=STAR_SYSTEMS.find(item=>item.id===id);if(!preset)return;
 if(lightFlight)stopLightFlight();
 stopSurfaceView();
 stopSolarDeath();follow=null;selected=null;down=null;clearTimeout(lastTouchTimer);tip.hidden=true;selection.visible=false;
 preview.clear();impactEffects.clear();tidalStreams.clear();cometTails.clear();[...views.keys()].forEach(disposeView);
 const span=orbitSpanAU(preset);
 systemMode={id:preset.id,name:preset.name,preset,span,extent:systemDrawnExtent(preset.root,span,compressed)};
 systemFrame=null;systemStamp=null;
 bs=systemBodies(preset).map(item=>systemModeBody(item,preset,getLanguage()))
  .sort((a,b)=>(b.key==='sun'?stellarLuminosity(b.radius,b.colorTemperature):-1)-(a.key==='sun'?stellarLuminosity(a.radius,a.colorTemperature):-1));
 bs.forEach(addView);paintSystem();
 elapsed=0;lag=0;last=performance.now();paused=false;speed=preset.daysPerSecond;solarBrightness=100;solarInfall=0;
 document.body.classList.add('in-star-system');applySolarBrightness();clearTrails();updateOrbits();frameSystem();
}
function frameSystem(){
 navigation.reset();camera.fov=43;camera.updateProjectionMatrix();
 const extent=systemMode.extent;
 controls.maxDistance=systemMaxDistance(extent);controls.enableDamping=false;
 const distance=systemCameraDistance(extent);
 camera.position.set(0,distance*.71,distance*.71);controls.target.set(0,0,0);controls.update();controls.enableDamping=true;
}
function stopSystemMode(){if(!systemMode)return;systemMode=null;document.body.classList.remove('in-star-system');ambient.intensity=AMBIENT_BASE;restart();}
function showSystemLibrary(preselect){
 selected=null;
 const chosen=preselect||systemMode?.id||STAR_SYSTEMS[0].id;
 const options=STAR_SYSTEMS.map(item=>`<option value="${item.id}"${item.id===chosen?' selected':''}>${item.name}</option>`).join('');
 shell('Symulacja układów',`${row('Układ',`<select id="system-choice">${options}</select>`)}<p class="sky-note" id="system-note" data-no-translate></p><p class="muted" id="system-facts"></p><p class="muted"><a id="system-source" href="#" target="_blank" rel="noopener noreferrer">Źródło ↗</a></p><div class="actions"><button class="action primary" id="system-run">Uruchom</button>${systemMode?'<button class="action" id="system-exit">Wróć do Układu Słonecznego</button>':''}</div><div class="actions"><button class="action" id="tools">Symulacja</button></div>`);
 const describe=()=>{
  const preset=STAR_SYSTEMS.find(item=>item.id===document.querySelector('#system-choice').value);
  document.querySelector('#system-note').textContent=systemNote(preset.id,getLanguage());
  const parts=systemBodies(preset).map(item=>`${item.name} · ${translate(STELLAR_KINDS[item.kind]||STELLAR_KINDS.star)}`);
  document.querySelector('#system-facts').textContent=`${parts.join(' · ')} · ${formatNumber(preset.daysPerSecond,2)} ${translate('dni / s')}`;
  document.querySelector('#system-source').href=preset.source;
 };
 describe();
 document.querySelector('#system-choice').onchange=describe;
 document.querySelector('#system-run').onclick=()=>{startSystemMode(document.querySelector('#system-choice').value);showSystemLibrary(systemMode?.id)};
 document.querySelector('#system-exit')?.addEventListener('click',()=>{stopSystemMode();closePanel()});
 document.querySelector('#tools').onclick=showTools;
}
function eventWhen(days){if(days<1/24)return `za ${formatNumber(days*60*24,0)} min`;if(days<1)return `za ${formatNumber(days*24,1)} godz.`;return `za ${formatNumber(days,1)} dni`}
function showEventTimeline(){
 const events=timelineEvents({bodies:bs,now:simulatedDate(),solar:SOLAR_ECLIPSES,lunar:LUNAR_ECLIPSES,horizonDays:365});
 const items=events.length?events.map((event,index)=>{
  const title=event.kind==='eclipse'?`Zaćmienie · ${event.name}`:event.kind==='collision'?`Możliwa kolizja · ${event.bodies.join(' / ')}`:`Bliski przelot · ${event.bodies.join(' / ')}`;
  const detail=event.kind==='eclipse'?event.eclipseKind:`${formatNumber(event.distanceAU,5)} AU`;
  const target=event.bodies?.[0]||'';
  return `<button class="timeline-event" data-event="${index}"${target?` data-body="${target}"`:''}><span>${eventWhen(event.days)}</span><strong>${title}</strong><small>${detail}</small></button>`;
 }).join(''):'<p class="muted">Brak przewidywanych bliskich zdarzeń w następnym roku symulacji.</p>';
 shell('Oś zdarzeń',`<p class="timeline-note">Prognoza odświeża się po każdej zmianie ciała, kursu lub orbity.</p><div class="event-timeline">${items}</div><p class="muted">Bliskie przeloty są wyznaczane z aktualnych wektorów ruchu i promieni fizycznych; zaćmienia pochodzą z dostępnych scenariuszy.</p>`);
 panel.querySelectorAll('[data-body]').forEach(button=>button.onclick=()=>{const body=bs.find(item=>item.name===button.dataset.body);if(body)focusBody(body.id)});
}
function showTools(){selected=null;shell('Symulacja',`<div class="tools"><button id="pause" aria-label="Pauza">${paused?'▶':'Ⅱ'}</button><button id="zoom-in" aria-label="Przybliż">＋</button><button id="zoom-out" aria-label="Oddal">−</button><button id="home" aria-label="Domyślny widok">⌖</button></div>${row('Tempo',`<select id="speed">${lightFlight?`<option selected>Lot · ${lightFlight.rate} ×</option>`:''}${rateOptions(speed)}</select>`)}${row('Widok',`<select id="scale"><option value="visual" ${compressed?'selected':''}>Czytelny</option><option value="real" ${!compressed?'selected':''}>Rzeczywista skala</option></select>`)}<div class="actions"><button class="action" id="light-start">${lightFlight?'Zakończ lot światła':'Symulacja prędkości światła'}</button></div><div class="actions"><button class="action" id="add">Dodaj ciało</button><button class="action" id="custom-blackhole">Własna czarna dziura</button><button class="action danger" id="restart">Od nowa</button></div>`);document.querySelector('#pause').onclick=e=>{setPaused(!paused);e.target.textContent=paused?'▶':'Ⅱ'};document.querySelector('#light-start').onclick=()=>lightFlight?stopLightFlight():startLightFlight();for(const id of ['speed','scale','zoom-in','zoom-out','home'])document.getElementById(id).disabled=!!lightFlight;document.querySelector('#light-start').disabled=!!systemMode;document.querySelector('#zoom-in').onclick=()=>camera.position.lerp(controls.target,.25);document.querySelector('#zoom-out').onclick=()=>camera.position.sub(controls.target).multiplyScalar(1.3).add(controls.target);document.querySelector('#home').onclick=resetView;document.querySelector('#speed').onchange=e=>setSimulationSpeed(e.target.value);document.querySelector('#scale').onchange=e=>setScaleMode(e.target.value==='visual');document.querySelector('#add').onclick=()=>{spawnAt.set(2,0,0);showSpawner()};document.querySelector('#custom-blackhole').onclick=()=>{spawnAt.set(2,0,0);showSpawner('custom-blackhole')};document.querySelector('#restart').onclick=restart;}
function setOrbitsVisible(visible){showOrbits=visible;updateOrbits();const checkbox=document.querySelector('#orbits');if(checkbox)checkbox.checked=visible;}
let educationStamp='';
function setEducationVisible(visible){educationEnabled=visible;educationStamp='';const checkbox=document.querySelector('#education');if(checkbox)checkbox.checked=visible;updateEducationLayer();}
function setEducationSubject(id){
 const body=bs.find(item=>item.id===id);
 if(!body)return;
 educationSubjectId=body.id;
 educationStamp='';
 updateEducationLayer();
}
const overlaps=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
function layoutEducationHud(){
 if(educationHud.hidden)return;
 const margin=innerWidth<=600?12:28,bottom=innerWidth<=600?88:102,width=educationHud.offsetWidth,height=educationHud.offsetHeight;
 const panelBox=!panel.hidden?panel.getBoundingClientRect():null;
 const candidates=[
  {right:margin,bottom},{left:margin,bottom},
  {right:margin,top:98},{left:margin,top:98}
 ].map(candidate=>{
  const left=candidate.left??innerWidth-candidate.right-width,top=candidate.top??innerHeight-candidate.bottom-height;
  return {...candidate,rect:{left,top,right:left+width,bottom:top+height}};
 });
 const choice=candidates.find(candidate=>!panelBox||!overlaps(candidate.rect,panelBox))||candidates[1];
 educationHud.style.left=choice.left==null?'auto':`${choice.left}px`;educationHud.style.right=choice.right==null?'auto':`${choice.right}px`;educationHud.style.top=choice.top==null?'auto':`${choice.top}px`;educationHud.style.bottom=choice.bottom==null?'auto':`${choice.bottom}px`;
}
function updateEducationLayer(){
 if(!educationEnabled||surfaceView||lightFlight||blackHoleFall){educationGroup.visible=false;educationHud.hidden=true;return}
 // The detail sheet is the visible selection. Its id must take precedence
 // over a formerly focused object: following Saturn must never leave a
 // Physics card for Earth on screen just because Earth was selected earlier.
 const shownId=panel.hidden?null:Number(panel.dataset.bodyId);
 const body=bs.find(item=>item.id===shownId)||bs.find(item=>item.id===educationSubjectId)||bs.find(item=>item.id===follow)||bs.find(item=>item.id===selected)||bs.find(item=>item.key==='earth')||bs[0];
 const primary=body?.parent?bs.find(item=>item.id===body.parent):body?.key==='sun'?null:bs.find(item=>item.key==='sun');
 const metrics=educationMetrics(body,primary);if(!body||!metrics){educationGroup.visible=false;educationHud.hidden=true;return}
 const position=displayed(body),arrowLength=Math.max(radius(body)*3,Math.min(2.4,camera.position.distanceTo(position)*.12));
 const direction=vector(metrics.direction),gravity=vector(metrics.gravityDirection||[0,0,0]);
 velocityArrow.visible=vectorLength(metrics.direction)>1e-12;gravityArrow.visible=vectorLength(metrics.gravityDirection||[])>1e-12;
 if(velocityArrow.visible){velocityArrow.position.copy(position);velocityArrow.setDirection(direction.normalize());velocityArrow.setLength(arrowLength,arrowLength*.22,arrowLength*.12)}
 if(gravityArrow.visible){gravityArrow.position.copy(position);gravityArrow.setDirection(gravity.normalize());gravityArrow.setLength(arrowLength*.8,arrowLength*.18,arrowLength*.1)}
 educationGroup.visible=true;educationHud.hidden=false;
 const stamp=`${body.id}:${metrics.speed.toFixed(3)}:${metrics.acceleration.toExponential(2)}`;
 if(stamp!==educationStamp){educationStamp=stamp;educationHud.innerHTML=`<strong>Fizyka · ${body.name}</strong><span><i class="education-velocity"></i>v ${formatNumber(metrics.speed,3)} km/s</span><span><i class="education-gravity"></i>a ${formatNumber(metrics.acceleration,4)} m/s²</span>${metrics.hillRadiusKm?`<span>Granica Hilla ${formatNumber(metrics.hillRadiusKm/1e6,3)} mln km</span>`:''}${metrics.rocheLimitKm?`<span>Granica Roche’a ${formatNumber(metrics.rocheLimitKm/1e3,1)} tys. km</span>`:''}<small>Niebieski: prędkość · złoty: grawitacja</small>`;}layoutEducationHud();
}
function setConstellationsVisible(visible){showConstellations=visible;sky.setConstellations(visible);const checkbox=document.querySelector('#constellations');if(checkbox)checkbox.checked=visible;}
function setDeepSkyMarkersVisible(visible){showDeepSkyMarkers=visible;sky.setDeepSkyMarkers(visible);deepSkyLabels.hidden=!visible;if(!visible)deepSkyLabels.replaceChildren();const checkbox=document.querySelector('#deep-sky-markers');if(checkbox)checkbox.checked=visible;}
// Which named surface features (surface-places.js) show as pins on the
// rotating object-details preview, off by default: most bodies have no such
// list, and the ones that do are still recognisable by shape alone.
function setLandmarksVisible(visible){showLandmarks=visible;preview.setLandmarksVisible(visible);if(bodyLandmarks)bodyLandmarks.group.visible=visible;const checkbox=document.querySelector('#landmarks-toggle');if(checkbox)checkbox.checked=visible;}
function focusSkyTarget(direction){if(lightFlight)stopLightFlight();follow=null;const target=camera.position.clone().add(direction.clone().normalize().multiplyScalar(100));controls.target.copy(target);controls.update();}
// A sky object has no simulated state to edit, so its panel is a read-only
// sheet: measured values from the catalogues, then a note about what is there.
const skyRow=(label,value)=>row(label,`<output class="value-readout">${value}</output>`);
let skySubject=null;
function skyPanel(title,rows,note,source,subject){
 // The note is already written in the viewer's language, so the interface
 // phrase substituter must leave it alone; it only knows single labels.
 shell(title,`${rows.join('')}${note?`<p class="sky-note" data-no-translate>${note}</p>`:''}<p class="muted">${source}</p><div class="actions"><button class="action primary" id="sky-center">Wyśrodkuj</button></div>`);
 mountWikipediaReference(subject,{hasDescriptionElsewhere:!!note});
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
 ],constellationNote(entry.name,getLanguage()),'Figura gwiazdozbioru wg d3-celestial · gwiazda z katalogu sceny',wikipediaSubjectForConstellation(entry));
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
 ],deepSkyNote(object.id,getLanguage()),'Współrzędne i jasności z katalogu obiektów sceny',wikipediaSubjectForDeepSky(object));
 document.querySelector('#sky-center').onclick=()=>focusSkyTarget(object.target);
}
// A known place (surface-places.js) has no hand-written note the way a
// constellation or deep-sky object does, so its Wikipedia section is left to
// show the article's own description - it is the only place that
// description comes from - rather than duplicating it here.
function showKnownPlace(bodyId,place){
 skySubject={kind:'place',bodyId,place};
 const body=bs.find(b=>b.id===bodyId);
 skyPanel(place.name,[
  skyRow('Ciało',body?translate(body.name):'—'),
  skyRow('Szerokość',`${formatNumber(place.latitude,0)}°`),
  skyRow('Długość',`${formatNumber(place.longitude,0)}°`)
 ],null,'Nazwa wg oficjalnego nazewnictwa IAU · planetarynames.wr.usgs.gov',wikipediaSubjectForPlace(body,place));
 document.querySelector('#sky-center').onclick=()=>goToKnownPlace(bodyId,place);
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
function focusBody(id,{keepPanel=false}={}){if(blackHoleFall)stopBlackHoleFall();if(lightFlight)stopLightFlight();const b=bs.find(x=>x.id===id);if(!b)return;follow=id;setEducationSubject(id);const target=displayed(b),distance=Math.max(radius(b)*3,compressed?.3:.00001);controls.target.copy(target);if(b.key==='comet'){const sun=bs.find(candidate=>candidate.key==='sun'),sunward=sun?displayed(sun).sub(target).normalize():new THREE.Vector3(0,0,1),side=new THREE.Vector3(0,1,0).cross(sunward).normalize();camera.position.copy(target).addScaledVector(sunward,distance*4.3).addScaledVector(side,distance*1.4)}else camera.position.copy(target).add(new THREE.Vector3(0,2,4).multiplyScalar(distance));if(!keepPanel)panel.hidden=true}
const navigation=createNavigation({camera,controls,element:renderer.domElement,blocked:()=>!!lightFlight||!!surfaceView||!panel.hidden,onMove:()=>{follow=null;tip.hidden=true},pace:()=>{let distance=Infinity;for(const b of bs)distance=Math.min(distance,Math.max(0,camera.position.distanceTo(displayed(b))-radius(b)));return Math.max(compressed?.08:.000002,Math.min(40,distance*.6))}});
function resetView(){navigation.reset();camera.fov=43;camera.updateProjectionMatrix();if(lightFlight)stopLightFlight();follow=null;controls.enabled=true;controls.enableDamping=false;controls.maxDistance=maxViewDistance(compressed);camera.position.copy(home).multiplyScalar(scaleRatio(home.length(),true,compressed));controls.target.set(0,0,0);controls.update();controls.enableDamping=true;closePanel()}
function clearTrails(){for(const v of views.values()){v.history=[];v.trail.geometry.setDrawRange(0,0)}}
// Rebuild the system at a given instant. Restart uses now; a listed collision
// scenario uses the date it is staged from, so the encounter is repeatable.
function resetSystem(at){stopCinematic();stopSolarDeath();stopBlackHoleFall();stopSurfaceView();systemMode=null;document.body.classList.remove('in-star-system');ambient.intensity=AMBIENT_BASE;solarBloom.strength=SOLAR_BLOOM_STRENGTH;controls.maxDistance=maxViewDistance(true);lightFlight=null;flightPrevious=null;flightStops=[];flightTextureKeys.clear();flightTrueScale=false;document.body.classList.remove('in-light-flight');flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;controls.enabled=true;lag=0;last=performance.now();spawnAt.set(0,0,0);selected=null;educationSubjectId=null;educationStamp='';follow=null;down=null;clearTimeout(lastTouchTimer);tip.hidden=true;selection.visible=false;preview.clear();impactEffects.clear();tidalStreams.clear();[...views.keys()].forEach(disposeView);epoch=at;bs=initialSystem(epoch);bs.forEach(addView);centralStarInput.value='sun';solarBrightness=100;solarInfall=0;applySolarBrightness();cometTails.clear();elapsed=0;paused=false;speed=2;compressed=true;updateOrbits();}
function restart(){resetSystem(new Date());resetView()}
function applySharedState(state){
 if(!state)return false;
 const date=new Date(state.e);if(Number.isNaN(date.valueOf()))return false;
 resetSystem(date);
 const current=new Map(bs.map(item=>[`${item.key}:${item.name}`,item]));
 const imported=new Map(state.x.map(item=>[`${item.key}:${item.name}`,item]));
 for(const [signature,target] of current){
  const saved=imported.get(signature);if(!saved)continue;
  Object.assign(target,saved,{p:[...saved.p],v:[...saved.v]});
 }
 for(const saved of state.x)if(!current.has(`${saved.key}:${saved.name}`)){
  const extra=body({...saved,p:[...saved.p],v:[...saved.v]});
  delete extra.parentName;bs.push(extra);addView(extra);current.set(`${extra.key}:${extra.name}`,extra);
 }
 for(const saved of state.x){
  const target=current.get(`${saved.key}:${saved.name}`);if(target)target.parent=saved.parentName?bs.find(item=>item.name===saved.parentName)?.id:undefined;
 }
 epoch=date;elapsed=Math.max(0,state.t);speed=Math.max(REAL_TIME,state.s);compressed=!!state.c;solarBrightness=Math.max(5,Math.min(100,state.b));centralStarInput.value=state.z||'sun';showOrbits=!!state.o;document.querySelector('#orbits').checked=showOrbits;setOrbitsVisible(showOrbits);applySolarBrightness();clearTrails();updateOrbits();resetView();
 return true;
}
// Sharing used to fall back to window.prompt() whenever the clipboard was
// refused - and embedded viewers, insecure (plain-http LAN) origins and some
// browsers refuse both the clipboard and prompt(), so the button looked as if
// it did nothing. A refused copy now opens the link in the page itself,
// selected and with its own copy button, and tries the older copy command.
let shareDialog=null;
function copySelectedText(input){try{input.focus();input.select();return document.execCommand('copy')}catch{return false}}
function showShareLink(url){
 if(!shareDialog){
  shareDialog=document.createElement('dialog');shareDialog.id='share-dialog';shareDialog.setAttribute('aria-labelledby','share-title');
  shareDialog.innerHTML='<h2 id="share-title">Link do symulacji</h2><p class="muted">Otwórz ten link w innej przeglądarce, aby zobaczyć tę samą symulację.</p><input id="share-link" type="text" readonly aria-label="Link do symulacji"><p class="muted" id="share-status" role="status"></p><div class="actions"><button class="action" id="share-close" type="button">Zamknij</button><button class="action primary" id="share-copy" type="button">Kopiuj</button></div>';
  document.body.append(shareDialog);
  const input=shareDialog.querySelector('#share-link'),status=shareDialog.querySelector('#share-status');
  const report=done=>{status.textContent=done?'Skopiowano':'Link jest zaznaczony – skopiuj go skrótem Ctrl+C lub ⌘C.'};
  shareDialog.querySelector('#share-close').onclick=()=>shareDialog.close?.()??shareDialog.removeAttribute('open');
  shareDialog.querySelector('#share-copy').onclick=()=>{const copied=navigator.clipboard?.writeText?.(input.value);if(copied)copied.then(()=>report(true),()=>report(copySelectedText(input)));else report(copySelectedText(input))};
  input.addEventListener('focus',()=>input.select());
 }
 const input=shareDialog.querySelector('#share-link');input.value=url;shareDialog.querySelector('#share-status').textContent='';
 if(typeof shareDialog.showModal==='function'){if(!shareDialog.open)shareDialog.showModal()}else shareDialog.setAttribute('open','');
 if(copySelectedText(input))shareDialog.querySelector('#share-status').textContent='Skopiowano';else input.select();
}
function copySharedSimulation(){
 const state=createShareState({bodies:bs,epoch,elapsed,speed,compressed,brightness:solarBrightness,centralStar:centralStarInput.value,showOrbits});
 // window.location on purpose: this module's own function location(e) (the
 // click-point raycast) shadows the global, and passing that made new URL()
 // throw, so Share did nothing and opening a shared link restored nothing.
 const url=shareUrl(window.location,state),button=document.querySelector('#share-simulation');
 const flash=()=>{button.textContent='Skopiowano';setTimeout(()=>button.textContent='Udostępnij',1600)};
 const copied=navigator.clipboard?.writeText?.(url);
 if(copied)copied.then(flash).catch(()=>showShareLink(url));
 else showShareLink(url);
}
document.querySelector('#logo').onclick=()=>panel.hidden?showTools():closePanel();document.querySelector('#reset').onclick=restart;
document.querySelector('#share-simulation').onclick=copySharedSimulation;
eventTimelineButton.onclick=showEventTimeline;cinematicButton.onclick=showCinematicControls;
window.addEventListener('keydown',e=>{if(e.target.isContentEditable||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Space'&&e.target.tagName==='BUTTON')return;if(e.code==='Space'){e.preventDefault();setPaused(!paused);if(!panel.hidden)showTools()}if(e.key==='Escape'){navigation.reset();surfaceNavigation.reset();if(blackHoleFall)stopBlackHoleFall();if(lightFlight)stopLightFlight();closePanel()};if(e.key.toLowerCase()==='r')restart();if(e.key.toLowerCase()==='n'){spawnAt.set(2,0,0);showSpawner()}if(e.key.toLowerCase()==='t')showTools()});window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);sky.setViewport(innerWidth,innerHeight);layoutRail();layoutSurfaceHud();layoutEducationHud()});

document.addEventListener("visibilitychange",()=>{last=performance.now()});
function setPaused(value){const now=performance.now();if(lightFlight){if(value)lightFlight.pause(now);else lightFlight.resume(now)}if(blackHoleFall){if(value)blackHoleFall.pause(now);else blackHoleFall.resume(now)}paused=value;last=now;}
function createFallClock(now){
 const clock={startedAt:now,pausedAt:null,pausedFor:0,rate:1,
  seconds(at){const end=this.pausedAt??at;return Math.max(0,(end-this.startedAt-this.pausedFor)/1000*this.rate)},
  pause(at){if(this.pausedAt==null)this.pausedAt=at},resume(at){if(this.pausedAt!=null){this.pausedFor+=at-this.pausedAt;this.pausedAt=null}},
  setRate(rate,at){const wasPaused=this.pausedAt!=null,elapsed=this.seconds(at);this.rate=Math.max(.25,Number(rate)||1);this.startedAt=at-elapsed*1000/this.rate;this.pausedFor=0;this.pausedAt=wasPaused?at:null}
 };return clock;
}
function startBlackHoleFall(){
 if(blackHoleFall||systemMode)return;
 if(lightFlight)stopLightFlight();if(solarDeath)stopSolarDeath();
 let hole=selected&&bs.find(b=>b.id===selected&&b.key==='blackhole')||bs.find(b=>b.key==='blackhole'),temporaryId=null;
 if(!hole){
  const massKg=4e6*SOLAR_MASS;
  hole=createCatalogBody('sagittarius-a',{massKg,radiusKm:horizonRadius(massKg),p:[0,0,0],v:[0,0,0]});
  hole.name='Sagittarius A* · widok';hole.scenarioOnly=true;bs.push(hole);addView(hole);temporaryId=hole.id;updateOrbits();
 }
 const direction=new THREE.Vector3(.52,.2,1).normalize(),now=performance.now(),fallView=views.get(hole.id),fallMaterial=fallView?.mesh.material,fallShadow=fallView?.blackHoleVisual?.shadow,visibility=new Map([...views].map(([id,view])=>[id,{group:view.group.visible,orbit:view.orbit.visible,trail:view.trail.visible}]));
 for(const [id,view] of views){view.group.visible=id===hole.id;view.orbit.visible=false;view.trail.visible=false}
 blackHoleFall={holeId:hole.id,temporaryId,direction,clock:createFallClock(now),previous:{speed,compressed,paused,camera:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,material:fallMaterial&&{transparent:fallMaterial.transparent,opacity:fallMaterial.opacity,depthWrite:fallMaterial.depthWrite},shadowVisible:fallShadow?.visible,visibility},finished:false,setRate(rate,at){this.clock.setRate(rate,at)},pause(at){this.clock.pause(at)},resume(at){this.clock.resume(at)},seconds(at){return this.clock.seconds(at)}};
 follow=null;closePanel();paused=false;speed=1/86400;compressed=true;lag=0;last=now;controls.enabled=false;controls.enableDamping=false;
 blackHoleFallHud.innerHTML=`<div class="fall-head"><span class="fall-eyebrow">Swobodny spadek</span><strong id="fall-stage">Zbliżanie do horyzontu</strong></div><div class="fall-track"><i id="fall-fill"></i></div><div class="fall-values"><span>Czas własny <b id="fall-time"></b></span><span>Promień radialny <b id="fall-radius"></b></span><span>Przesunięcie ku czerwieni <b id="fall-redshift"></b></span><span>Widoczność kosmosu <b id="fall-aperture"></b></span></div><p class="fall-note" id="fall-note"></p><p class="muted" id="fall-caveat"></p><div class="actions"><button class="action" id="fall-stop">Zakończ wpadanie</button></div>`;
 blackHoleFallHud.hidden=false;document.querySelector('#fall-stop').onclick=stopBlackHoleFall;document.body.classList.add('in-black-hole-fall');updateBlackHoleFall(now);
}
function stopBlackHoleFall(){
 if(!blackHoleFall){document.body.classList.remove('in-black-hole-fall');blackHoleFallPass.enabled=false;return}
 const fall=blackHoleFall,holeView=views.get(fall.holeId);blackHoleFall=null;blackHoleFallHud.hidden=true;document.body.classList.remove('in-black-hole-fall');blackHoleFallPass.enabled=false;for(const [id,state] of fall.previous.visibility||[]){const view=views.get(id);if(view)Object.assign(view.group,{visible:state.group}),view.orbit.visible=state.orbit,view.trail.visible=state.trail}if(holeView?.mesh.material&&fall.previous.material)Object.assign(holeView.mesh.material,fall.previous.material);if(holeView?.blackHoleVisual?.shadow&&fall.previous.shadowVisible!=null)holeView.blackHoleVisual.shadow.visible=fall.previous.shadowVisible;camera.fov=fall.previous.fov;camera.updateProjectionMatrix();controls.enabled=true;controls.enableDamping=false;camera.position.copy(fall.previous.camera);controls.target.copy(fall.previous.target);controls.update();controls.enableDamping=true;speed=fall.previous.speed;compressed=fall.previous.compressed;paused=fall.previous.paused;controls.maxDistance=maxViewDistance(compressed);lag=0;last=performance.now();if(fall.temporaryId){bs=bs.filter(b=>b.id!==fall.temporaryId);disposeView(fall.temporaryId);updateOrbits()}clearTrails();dockState='';
}
function updateBlackHoleFall(now){
 const fall=blackHoleFall,hole=fall&&bs.find(b=>b.id===fall.holeId);if(!fall||!hole){stopBlackHoleFall();return}
 const state=blackHoleFallState(fall.seconds(now),hole.mass),center=displayed(hole),visualRadius=radius(hole),side=new THREE.Vector3(0,1,0).cross(fall.direction).normalize(),holeView=views.get(hole.id);
 // Once the observer is through the horizon, the local view must not be
 // occluded by the outside-facing shadow mesh. The separate postprocess pass
 // supplies the causal aperture while the luminous disk remains visible.
 if(holeView?.mesh.material&&state.crossed){holeView.mesh.material.transparent=true;holeView.mesh.material.opacity=0;holeView.mesh.material.depthWrite=false;if(holeView.blackHoleVisual?.shadow)holeView.blackHoleVisual.shadow.visible=false}
 // The camera remains a hair outside the drawn shadow. Crossing is represented
 // by the observer shader, preventing a camera from clipping through a mesh.
 const distance=visualRadius*(state.outside?1.34+10.8*Math.pow(1-state.progress,2):1.31);
 camera.position.copy(center).addScaledVector(fall.direction,distance).addScaledVector(side,visualRadius*.32*(1-state.progress));camera.fov=66;camera.updateProjectionMatrix();camera.lookAt(center);controls.target.copy(center);camera.updateMatrixWorld();
 const stage=state.crossed?'Po horyzoncie zdarzeń':'Zbliżanie do horyzontu';
 document.querySelector('#fall-stage').textContent=translate(stage);document.querySelector('#fall-time').textContent=`${formatNumber(state.seconds,1)} s`;document.querySelector('#fall-radius').textContent=`${formatNumber(state.radiusRs,2)} Rₛ`;document.querySelector('#fall-redshift').textContent=`${formatNumber(state.redshift*100,1)}%`;document.querySelector('#fall-aperture').textContent=`${formatNumber(state.cosmicAperture*100,1)}%`;document.querySelector('#fall-fill').style.width=`${formatNumber(Math.min(100,state.progress*100),1)}%`;
 const note=state.crossed?'W lokalnej perspektywie nie ma ściany na horyzoncie: kierunki prowadzące do zewnętrznego kosmosu kurczą się wraz z dalszym spadaniem.':'Soczewkowanie oraz czerwienienie dotyczą światła dochodzącego z zewnątrz; czas własny obserwatora biegnie normalnie.';
 document.querySelector('#fall-note').textContent=translate(note);document.querySelector('#fall-caveat').textContent=translate('Model Schwarzschilda bez obrotu: obraz jest edukacyjną aproksymacją geodezyjnych światła, nie pełnym ray tracingiem ogólnej teorii względności.');
 if(state.done&&!fall.finished){fall.finished=true;setPaused(true)}
}
function startCinematic(bodyId){
 if(surfaceView||lightFlight||blackHoleFall)return;
 const body=bs.find(item=>item.id===bodyId)||bs.find(item=>item.id===(selected??follow))||bs.find(item=>item.key==='earth');if(!body)return;
 if(cinematic)stopCinematic();
 cinematic={bodyId:body.id,startedAt:performance.now(),previous:{camera:camera.position.clone(),target:controls.target.clone(),fov:camera.fov,enabled:controls.enabled,follow}};
 follow=null;controls.enabled=false;closePanel();
}
function stopCinematic(){
 if(!cinematic)return;const previous=cinematic.previous;cinematic=null;controls.enabled=previous.enabled;follow=previous.follow;camera.fov=previous.fov;camera.updateProjectionMatrix();camera.position.copy(previous.camera);controls.target.copy(previous.target);controls.update();
}
function updateCinematic(now){
 const body=cinematic&&bs.find(item=>item.id===cinematic.bodyId);if(!body){stopCinematic();return}
 const pose=cinematicPose(displayed(body).toArray(),radius(body),Math.max(0,(now-cinematic.startedAt)/1000));
 camera.position.fromArray(pose.position);camera.fov=52;camera.updateProjectionMatrix();camera.lookAt(new THREE.Vector3().fromArray(pose.lookAt));controls.target.fromArray(pose.lookAt);camera.updateMatrixWorld();
 if(pose.progress>=1)stopCinematic();
}
function recordCinematic(bodyId){
 if(!window.MediaRecorder||!renderer.domElement.captureStream){shell('Nagranie niedostępne','<p class="muted">Ta przeglądarka nie obsługuje nagrania WebM z obrazu WebGL.</p>');return}
 startCinematic(bodyId);const stream=renderer.domElement.captureStream(60),chunks=[];
 const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
 const recorder=new MediaRecorder(stream,{mimeType:mime});recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};recorder.onstop=()=>{const url=URL.createObjectURL(new Blob(chunks,{type:mime})),download=document.createElement('a');download.href=url;download.download='solare-cinematic.webm';download.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};recorder.start();setTimeout(()=>{if(recorder.state!=='inactive')recorder.stop()},CINEMATIC_DURATION_SECONDS*1000);
}
function showCinematicControls(){
 const target=bs.find(item=>item.id===(selected??follow))||bs.find(item=>item.key==='earth');
 const options=bs.filter(item=>item.key!=='fragment').map(item=>`<option value="${item.id}"${item.id===target?.id?' selected':''}>${item.name}</option>`).join('');
 shell('Kamera filmowa',`${row('Obiekt',`<select id="cinematic-target">${options}</select>`)}<p class="muted">Płynne, 12-sekundowe ujęcie po orbicie kamery. Nagranie zapisuje WebM wyłącznie na tym urządzeniu.</p><div class="actions"><button class="action primary" id="cinematic-start">Odtwórz ujęcie</button><button class="action" id="cinematic-record">Nagraj WebM</button></div>`);
 document.querySelector('#cinematic-start').onclick=()=>startCinematic(+document.querySelector('#cinematic-target').value);
 document.querySelector('#cinematic-record').onclick=()=>recordCinematic(+document.querySelector('#cinematic-target').value);
}
function startLightFlight(){
 if(cinematic)stopCinematic();
 if(lightFlight||systemMode||surfaceView)return;
 const sun=bs.find(b=>b.key==='sun');if(!sun){shell('Brak Słońca','<p class="muted">Użyj Reset, aby przywrócić Słońce i rozpocząć lot.</p>');return}
 flightPrevious={speed,compressed,paused,camera:camera.position.clone(),target:controls.target.clone()};
 const direction=new THREE.Vector3(1,0,0);
 flightStops=planets.flatMap(p=>{const b=bs.find(b=>b.key===p[1]);return b?[{id:b.id,name:b.name,distance:p[2]}]:[]});
 flightTextureKeys.clear();prewarmLightFlightTextures(0);
 flightLabels.innerHTML=flightStops.map(s=>`<span class="flight-body-label" data-body="${s.id}">${s.name}</span>`).join('');
 lightFlight=new LightFlight(sun.p,direction.toArray(),performance.now());document.body.classList.add('in-light-flight');follow=null;paused=false;speed=1/86400;compressed=false;lag=0;last=performance.now();
 controls.enabled=false;controls.enableDamping=false;controls.update();controls.enableDamping=true;closePanel();clearTrails();updateOrbits();
 flightHud.innerHTML=`<div class="flight-summary"><span class="flight-symbol">c</span><div><div class="flight-title">Lot światła <span id="flight-rate">1 ×</span></div><div id="flight-distance"></div><div id="flight-time"></div></div></div><div class="flight-arrival"><span class="flight-eyebrow">NASTĘPNE CIAŁO</span><strong id="flight-next-name"></strong><div id="flight-next"></div></div><label class="flight-scale"><input id="flight-scale-toggle" type="checkbox" checked> Rzeczywiste rozmiary i odległości</label><div class="flight-note" id="flight-scale-note">Rzeczywista skala · bliski przelot kamery</div>`;flightHud.hidden=false;
 flightTrueScale=true;flightRail.innerHTML=`<div class="rail-title">TRASA LOTU</div><div class="rail-track"><div class="rail-fill"></div><div class="rail-head"></div>${flightStops.map(s=>`<button type="button" class="rail-stop" data-stop="${s.id}" aria-label="Przenieś lot do: ${s.name}, ${s.distance.toFixed(2)} AU od Słońca"><i></i><span class="rail-name">${s.name}</span></button>`).join('')}</div>`;flightRail.hidden=false;layoutRail();
 for(const button of flightRail.querySelectorAll('[data-stop]'))button.onclick=()=>{if(!lightFlight)return;const stop=flightStops.find(s=>s.id===Number(button.dataset.stop));if(!stop)return;const now=performance.now();lightFlight.seekDistance(stop.distance,now);updateLightFlight(now);};
 document.querySelector('#flight-scale-toggle').onchange=e=>{flightTrueScale=e.target.checked;document.querySelector('#flight-scale-note').textContent=flightTrueScale?'Rzeczywista skala · bliski przelot kamery':'Bliski przelot · rozmiary powiększone';};
 updateLightFlight(performance.now());
}
function prewarmLightFlightTextures(distance){const start=Math.max(0,flightStops.findIndex(stop=>stop.distance>=distance-1e-10));for(const stop of flightStops.slice(start,start+2)){const body=bs.find(item=>item.id===stop.id),key=body&&(body.textureKey||body.key);if(body&&key&&!flightTextureKeys.has(key)){flightTextureKeys.add(key);requestDetailTexture(body)}}}
const railProgress=distance=>flightRouteProgress(distance,flightStops.map(s=>s.distance));
function layoutRail(){
 if(flightRail.hidden||!flightStops.length)return;
 for(const [index,stop] of flightStops.entries()){
  const button=flightRail.querySelector(`[data-stop="${stop.id}"]`);
  if(!button)continue;
  button.style.top=flightRouteStopPosition(index,flightStops.length)+'%';
 }
}
function stopLightFlight(){if(!lightFlight)return;lightFlight=null;flightTextureKeys.clear();document.body.classList.remove('in-light-flight');flightStops=[];flightTrueScale=false;flightRail.hidden=true;flightLabels.replaceChildren();flightHud.hidden=true;flightRail.hidden=true;camera.fov=43;camera.updateProjectionMatrix();controls.enabled=true;const previous=flightPrevious;flightPrevious=null;speed=previous.speed;compressed=previous.compressed;paused=previous.paused;controls.maxDistance=maxViewDistance(compressed);lag=0;last=performance.now();controls.enableDamping=false;camera.position.copy(previous.camera);controls.target.copy(previous.target);controls.update();controls.enableDamping=true;clearTrails();updateOrbits();if(!panel.hidden)showTools()}
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
 prewarmLightFlightTextures(next?.distance??distance);
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
 let nearest=Infinity;for(const comet of comets)nearest=Math.min(nearest,camera.position.distanceTo(displayed(comet)));
 const quality=(nearest<.75?1:nearest<3?.68:.36)*adaptiveDetail,frameStep=quality>=.9?1:quality>.42?2:3;if(frame%frameStep)return;
 const sun=bs.find(b=>b.key==='sun'),sunDisplayed=sun?displayed(sun):new THREE.Vector3();
 cometTails.update({comets,sunDisplayed,displayed,velocityOf:b=>vector(b.v),distanceOf:b=>sun?vector(b.p).distanceTo(vector(sun.p)):10,radiusOf:radius,quality,span:compressed?.55:.9,time:now*.001});
}
let last=performance.now(),frame=0,lag=0;
// The camera orientation last time the deep-sky label overlay was painted.
// [0,0,0,0] is not a valid unit quaternion, so it never matches a real
// camera and always forces the very first paint.
let deepSkyLabelQuaternion=[0,0,0,0];
function handleCollisions(previous){const oldSelected=selected,oldFollow=follow,wasPanelVisible=!panel.hidden;
 // Algol's pair is semi-detached and is drawn all but touching, so in a star
 // system only the physical radii decide contact, never the rendered discs.
 const visual=compressed&&!systemMode?captureCollisionView(bs,displayed,radius):null;const events=resolveCollisions(bs,{contactTest:visual?(a,b)=>viewContact(a,b,visual,previous):null,contactNormal:scenarioContactNormal,contactSpeed:scenarioContactSpeed,contactVeto:(a,b)=>!scenarioCollisionReady(a,b,elapsed)});if(!events.length)return;preview.clear();for(const event of events){const survivorVisual=visual?.get(event.survivor),otherVisual=visual&&event.sourceIds.map(id=>visual.get(id)).find(item=>item&&item!==survivorVisual),planetaryImpact=event.kind==='impact'&&event.surface?.targetSurvives;const size=planetaryImpact?Math.max(.018,(survivorVisual?.r||.12)*.2):compressed?Math.max(.12,...event.sourceIds.map(id=>views.get(id)?.mesh.scale.x||.12)):event.radius/AU*6;const impactPosition=survivorVisual&&otherVisual?vector(survivorVisual.p).lerp(vector(otherVisual.p),survivorVisual.r/(survivorVisual.r+otherVisual.r)):mapped(event.p);for(const id of event.sourceIds){const body=bs.find(b=>b.id===id),view=views.get(id);if(body&&view){if(!view.irregular&&!view.hasDamageGeometry){view.mesh.geometry=shapeGeometry('high');view.lodLevel='high'}applyImpactDamage(view,body)}}const survivorView=views.get(event.survivor);impactEffects.add(event,impactPosition,size,planetaryImpact&&survivorView?{surfaceMesh:survivorView.mesh,surfaceAxis:survivorView.lastImpactAxis,surfaceRadius:survivorVisual?.r}:undefined);const selectedReplacement=collisionFocusTransfer(event,oldSelected),followReplacement=collisionFocusTransfer(event,oldFollow);event.removed.forEach(disposeView);for(const id of event.added)addView(bs.find(b=>b.id===id));selected=selectedReplacement;
 // The camera inherits the projectile's close-up distance, which for a comet is
 // a fraction of the planet it just struck; pull back far enough to see what
 // survived, keeping the viewing direction the impact was watched from.
 if(followReplacement!==oldFollow&&followReplacement!=null){const survivor=bs.find(item=>item.id===followReplacement);if(survivor){const target=displayed(survivor),offset=camera.position.clone().sub(controls.target);const wanted=framingDistance(radius(survivor),camera.fov);if(offset.lengthSq()>0&&wanted>offset.length())offset.setLength(wanted);controls.target.copy(target);camera.position.copy(target).add(offset);}}
 follow=followReplacement;}clearTrails();updateOrbits();if(selected&&wasPanelVisible)showBody();}
function animate(now){requestAnimationFrame(animate);const beforeElapsed=elapsed;const realDelta=Math.max(0,(now-last)/1000),delta=Math.min(realDelta,.05);last=now;const profile=adaptiveQuality.update(realDelta*1000);if(profile.changed)applyAdaptiveQuality(profile);if(!lightFlight&&!blackHoleFall&&!paused&&!document.hidden){lag+=realDelta*speed;let steps=0;const deadline=performance.now()+24;handleCollisions();while(lag>1e-12&&steps<4096){const previous=compressed&&!systemMode?captureCollisionView(bs,displayed,radius):null;const config=fastStepSize(bs),dt=Math.min(lag,config.dt);if(config.split)splitStep(bs,dt,config.states);else step(bs,dt);lag-=dt;elapsed+=dt;steps++;handleCollisions(previous);if(steps%8===0&&performance.now()>deadline)break}}
 const blackHoles=bs.filter(body=>body.key==='blackhole'),tidalFlows=[];let nextSolarInfall=0;
 for(const b of bs){const v=views.get(b.id);updateSurfaceImpact(v,elapsed-beforeElapsed);v.group.position.copy(displayed(b));const baseRadius=radius(b),axes=bodyAxes(b);v.mesh.scale.set(baseRadius*axes[0],baseRadius*axes[1],baseRadius*axes[2]);
  if(v.ringParticles){
   // The individually orbiting fragment layer is a close-up detail: it
   // stays hidden, and its per-instance matrices unrecomputed, whenever the
   // camera is too far from that planet for individual fragments to read as
   // anything but the flat textured ring already drawn underneath them.
   const ringDistance=camera.position.distanceTo(v.group.position),ringDensity=ringDistance<baseRadius*35?1:ringDistance<baseRadius*90?.35:0;
   v.ringParticles.mesh.visible=ringDensity>0;
   if(ringDensity>0&&frame%2===0)v.ringParticles.update(elapsed,{mass:b.mass,radiusKm:b.radius,sceneRadius:baseRadius,density:ringDensity});
  }
  let strongestTide=0;for(const hole of blackHoles)if(hole!==b){const distance=vector(b.p).distanceTo(vector(hole.p)),tide=tidalStretch(b,hole,distance),stream=tidalStreamStrength(b,hole,distance);strongestTide=Math.max(strongestTide,tide);if(stream>.012)tidalFlows.push({id:`${b.id}:${hole.id}`,start:v.group.position.clone(),end:views.get(hole.id).group.position.clone(),strength:stream,color:b.key==='sun'?'#fff1c2':b.color||'#d9b38a'})}if(strongestTide){v.mesh.scale.set(baseRadius*axes[0]*(1+strongestTide*3.5),baseRadius*axes[1]*(1-strongestTide*.34),baseRadius*axes[2]*(1-strongestTide*.34));if(b.key==='sun')nextSolarInfall=Math.max(nextSolarInfall,strongestTide)}if(v.blackHoleVisual){const accretion=b.accretion;if(accretion){accretion.age=(accretion.age||0)+delta;accretion.fuel=Math.max(0,accretion.fuel-delta*.018)}v.blackHoleVisual.update(now*.001,accretion?.fuel||0,!!accretion?.jets,camera)}if(v.neutronStarVisual)v.neutronStarVisual.update(now*.001);updateShapeLod(v,camera,innerHeight);if(!v.surfaceOriented){orientSpinAxis(v.axis,b);v.mesh.rotation.y=((elapsed+(lightFlight?lightFlight.seconds(now)/86400:0))*24/b.spin*Math.PI*2)%(Math.PI*2);}if(v.halo){v.halo.quaternion.copy(camera.quaternion);v.halo.scale.setScalar(baseRadius*largestAxis(b)/1.02)};if(frame%8===0&&!paused&&!lightFlight&&!blackHoleFall&&!surfaceView){v.history.push(v.group.position.clone());if(v.history.length>512)v.history.shift();const a=v.trail.geometry.attributes.position;v.history.forEach((p,i)=>a.setXYZ(i,p.x,p.y,p.z));a.needsUpdate=true;v.trail.geometry.setDrawRange(0,v.history.length);v.trail.visible=!b.parent;}}
 tidalStreams.update(blackHoleFall?[]:tidalFlows,now*.001);
 if(Math.abs(nextSolarInfall-solarInfall)>.002){solarInfall=nextSolarInfall;applySolarBrightness()}
 const sun=bs.find(b=>b.key==='sun');sunlight.visible=!!sun;solarBloom.enabled=!!sun;blackHoleLensing.enabled=blackHoles.length>0&&!blackHoleFall;blackHoleFallPass.enabled=!!blackHoleFall;if(sun)sunlight.position.copy(displayed(sun));if(follow){const b=bs.find(x=>x.id===follow);if(b){const p=displayed(b),offset=camera.position.clone().sub(controls.target);controls.target.copy(p);camera.position.copy(p).add(offset)}}
 selection.visible=!!selected;const chosen=bs.find(x=>x.id===selected);if(chosen){selection.position.copy(displayed(chosen));selection.scale.setScalar(radius(chosen)*largestAxis(chosen));selection.quaternion.copy(camera.quaternion)}
 asteroidBelt.mesh.visible=asteroidBeltVisible({systemMode:!!systemMode,blackHoleFall:!!blackHoleFall,earthSurfaceDay:surfaceView?.key==='earth'&&surfaceView.light?.phase==='day'});if(frame%3===0&&!systemMode)asteroidBelt.update(elapsed,mapped,compressed,asteroidDensity());
 {const saturn=bs.find(b=>b.key==='saturn'),saturnView=saturn&&views.get(saturn.id);
  irregularMoonSwarm.mesh.visible=!!(saturn&&saturnView&&!systemMode&&!blackHoleFall&&!surfaceView&&!lightFlight);
  if(irregularMoonSwarm.mesh.visible&&frame%3===0){
   const distance=camera.position.distanceTo(saturnView.group.position),swarmDensity=distance<160?1:distance<400?.4:0;
   if(swarmDensity>0)irregularMoonSwarm.update(elapsed,{mass:saturn.mass,hostPosition:saturnView.group.position,hostSceneRadius:radius(saturn),density:swarmDensity});
   irregularMoonSwarm.mesh.visible=swarmDensity>0;
  }
 }
 updateCometDust(now);impactEffects.update(paused||lightFlight||blackHoleFall?0:delta,mapped,elapsed-beforeElapsed,id=>{const b=bs.find(b=>b.id===id);return b?displayed(b):null});if(!panel.hidden&&(frame&1)===0){const body=bs.find(b=>b.id===selected),sun=bs.find(b=>b.key==='sun');preview.update(body,{sunDirection:sun&&body?displayed(sun).sub(displayed(body)):null,brightness:solarBrightness});updateTemperatureReadout()}if((frame&1)===0)updateEducationLayer();syncTimeDock();if(solarDeath)updateSolarDeath(now);if(blackHoleFall)updateBlackHoleFall(now);else if(surfaceView){surfaceNavigation.update(delta);updateSurfaceView(frame)}else if(lightFlight)updateLightFlight(now);else if(cinematic)updateCinematic(now);else{navigation.update(delta);controls.update();const orbitFrameStep=speed>=100?1:2;if(!paused&&frame%orbitFrameStep===0)updateOrbits()}freeFlightHelp.hidden=!!(lightFlight||surfaceView||solarDeath||blackHoleFall||!navigation.active());camera.updateMatrixWorld();if((frame&1)===0)updateExtendedSolarShadows();if(frame%30===0)for(const b of bs){const view=views.get(b.id);if(view?.lodLevel==='high')requestDetailTexture(b)}if(blackHoleLensing.enabled)updateBlackHoleLensing(blackHoleLensing,bs,views,camera,radius);if(blackHoleFall){const hole=bs.find(b=>b.id===blackHoleFall.holeId),projected=hole?displayed(hole).project(camera):new THREE.Vector3();updateBlackHoleFallPass(blackHoleFallPass,blackHoleFallState(blackHoleFall.seconds(now),hole?.mass),new THREE.Vector2(projected.x*.5+.5,projected.y*.5+.5))}else updateBlackHoleFallPass(blackHoleFallPass,null,new THREE.Vector2(.5,.5));for(const v of views.values())if(v.halo)v.halo.quaternion.copy(camera.quaternion);sky.update(camera,delta);updateClock();const interior=lightFlight?solarInteriorState(lightFlight.distance(now),bs.find(b=>b.key==='sun')?.radius):null;interiorHud.hidden=!interior?.inside;flightLabels.hidden=!!interior?.inside;document.body.classList.toggle('inside-sun',!!interior?.inside);if(interior?.inside){document.querySelector('#interior-zone').textContent=interior.zone;document.querySelector('#interior-values').textContent=`${(interior.fraction*100).toLocaleString(getLocale(),{maximumFractionDigits:1})}% R☉ · T ≈ ${Number(interior.temperature.toPrecision(2)).toLocaleString(getLocale())} K`;solarInterior.render(renderer,interior,lightFlight.seconds(now),camera.aspect);deepSkyLabels.replaceChildren()}else{composer.render();
  // These markers share the same screen as moving bodies. During an active
  // simulation they repaint with the render frame, avoiding a visibly stale
  // DOM layer; while paused the old low-cost cadence remains sufficient.
  const cameraQuaternionNow=[camera.quaternion.x,camera.quaternion.y,camera.quaternion.z,camera.quaternion.w];
  const deepSkyRefreshStep=paused?6:1;
  if(frame%deepSkyRefreshStep===0||quaternionChanged(deepSkyLabelQuaternion,cameraQuaternionNow)){paintDeepSkyLabels();deepSkyLabelQuaternion=cameraQuaternionNow}
 }frame++}
installLanguageUI();
document.addEventListener('languagechange',()=>{refreshClockFormats();clockShown='';updateClock();layoutRail();if(surfaceView)buildSurfaceHud();if(!panel.hidden&&selected)showBody()});
const sharedState=shareTokenFromLocation(window.location); // not this module's location(e), see copySharedSimulation
if(sharedState)applySharedState(sharedState);
requestAnimationFrame(animate);
// Exposed only as an explicit automation surface; no network or persistence.
window.solare={
 // Where each body actually lands on screen and how large it is drawn, so a
 // headless run can check that a loaded system is framed and visible rather
 // than judging it from a screenshot.
 getView:()=>{camera.updateMatrixWorld();return {mode:systemMode?.id??null,compressed,fov:camera.fov,near:camera.near,
  surface:surfaceView?{body:surfaceView.name,latitude:surfaceView.latitude,longitude:surfaceView.longitude,
   azimuth:surfaceView.azimuth,altitude:surfaceView.altitude}:null,
  aim:(value)=>{if(!surfaceView)return null;surfaceView.altitude=Math.max(-89,Math.min(89,value.altitude??surfaceView.altitude));
   surfaceView.azimuth=value.azimuth??surfaceView.azimuth;updateSurfaceView();return true},
  distance:camera.position.distanceTo(controls.target),
  bodies:bs.map(b=>{const p=displayed(b),screen=p.clone().project(camera),r=radius(b);
   return {name:b.name,key:b.key,x:(screen.x+1)*innerWidth/2,y:(1-screen.y)*innerHeight/2,
    inFront:screen.z>-1&&screen.z<1,
    pixels:r*innerHeight/(2*p.distanceTo(camera.position)*Math.tan(camera.fov*Math.PI/360)),
    lod:views.get(b.id)?.lodLevel??null};})};},
 getState:()=>({paused,speed,elapsed,pendingDays:lag,compressed,lightFlight:lightFlight?{rate:lightFlight.rate,seconds:lightFlight.seconds(performance.now()),distanceAU:lightFlight.distance(performance.now())}:null,bodies:bs.map(b=>({id:b.id,name:b.name,mass:b.mass,p:[...b.p],v:[...b.v]}))}),reset:restart,pause:()=>setPaused(true),resume:()=>setPaused(false),startLightFlight,stopLightFlight};
const modelContext=document.modelContext;
if(modelContext?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});for(const tool of [{name:'read_simulation',description:'Read current bodies, positions in AU and velocities in AU/day.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>window.solare.getState()},{name:'set_simulation_paused',description:'Pause or resume the current gravitational simulation.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{if(typeof input?.paused!=='boolean')throw new Error('paused must be a boolean');setPaused(input.paused);if(!panel.hidden)showTools();return {paused}}}]){try{Promise.resolve(modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{})}catch{}}}
