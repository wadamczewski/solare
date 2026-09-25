import {AU} from './physics.js';
// The scene has two radial mappings from heliocentric AU to world units.
// "Readable" compresses the outer system so every planet stays on screen;
// "true scale" is linear. Both are radial and strictly increasing, so a scene
// point can be carried between them exactly: undo one, apply the other.
export const AU_TO_SCENE=6, COMPRESSED_FACTOR=3.6, COMPRESSED_EXPONENT=.57;
export function sceneRadius(au,compressed){return compressed?COMPRESSED_FACTOR*Math.pow(au,COMPRESSED_EXPONENT):au*AU_TO_SCENE;}
export function auRadius(scene,compressed){return compressed?Math.pow(scene/COMPRESSED_FACTOR,1/COMPRESSED_EXPONENT):scene/AU_TO_SCENE;}
// How much the scene grows (>1) or shrinks (<1) around a point this far from the
// Sun when the mapping changes. Camera distances scale by this, so the same slice
// of the system stays framed instead of the viewer being dropped inside it.
export function scaleRatio(sceneLength,from,to){
 if(!(sceneLength>0)||from===to)return 1;
 return sceneRadius(auRadius(sceneLength,from),to)/sceneLength;
}
// Neptune sits at 179 world units in true scale, so the readable mode's limit
// would stop the camera short of the outer system.
export function maxViewDistance(compressed){return compressed?260:1400;}
// A satellite's real distance from its own planet ranges from a few hundred
// kilometres (a ring shepherd) to tens of millions (an irregular moon),
// while the planet itself is drawn only a few scene units across - shown at
// that real ratio, every satellite but the very closest would sit off
// screen or on top of its planet. This compresses a real AU offset from the
// host the same sub-linear way sceneRadius compresses a planet's own
// heliocentric distance, anchored on the host's own drawn radius so a
// satellite always clears its planet first. Every satellite in the scene -
// the simulated moons in main.js's displayed(), and the decorative
// irregular-moon swarm - goes through this one function, so they stay
// visually consistent with each other and with each other's true relative
// distances.
export function satelliteOffset(hostSceneRadius,offsetAU){return hostSceneRadius*1.8+Math.pow(offsetAU*AU/200000,.55)*.8;}
// How far a followed body's camera starts from it. The readable map used a
// flat floor of 0.3 units, sized for planets and the large moons; a moon of a
// few kilometres such as Phobos, Pan or Aegaeon is drawn well under a
// thousandth of a unit across, so from there it covered less than a pixel and
// "Follow" showed its planet next to an empty patch of sky. The floor now
// shrinks with the body so a small one is framed at roughly twenty pixels,
// while everything whose drawn radius is above 0.025 units keeps the old view.
export function followDistance(drawnRadius,compressed){
 const r=Math.max(0,drawnRadius)||0;
 return Math.max(r*3,compressed?Math.min(.3,r*12):.00001);
}
