// The first-person radar: a small rendered sky sphere ("kula", not a flat
// ring) standing in for the observer's surroundings, so a tracked body's
// full 3D direction - which way to turn *and* how far up or down to look -
// is something to see at a glance rather than read off a bearing number.
//
// One reusable WebGL context, following the same pattern as preview.js: the
// scene and renderer are built once and redrawn from update(), driven by the
// main render loop rather than a rAF loop of their own.
import * as THREE from 'three';
import {relativeBearing, sphericalToRadar} from './surface-compass.js';
import {projectedPoint} from './sky-labels.js';

export const RADAR_SIZE = 208;
const SPHERE_RADIUS = 1;
const MARKER_RADIUS = SPHERE_RADIUS * 1.03; // just outside the dome shell, so nothing z-fights it

// A soft radial dot, reused (tinted per marker) instead of drawing a shape
// per body: this is the same additive-glow look the rest of the sky uses.
function glowTexture() {
 const canvas = document.createElement('canvas');
 canvas.width = canvas.height = 64;
 const ctx = canvas.getContext('2d');
 const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
 gradient.addColorStop(0, 'rgba(255,255,255,1)');
 gradient.addColorStop(.4, 'rgba(255,255,255,.85)');
 gradient.addColorStop(1, 'rgba(255,255,255,0)');
 ctx.fillStyle = gradient;
 ctx.fillRect(0, 0, 64, 64);
 const texture = new THREE.CanvasTexture(canvas);
 texture.colorSpace = THREE.SRGBColorSpace;
 return texture;
}

export function createSurfaceRadar() {
 const element = document.createElement('div');
 element.className = 'surface-radar-view';
 const labelLayer = document.createElement('div');
 labelLayer.className = 'surface-radar-labels';
 let renderer = null;

 const scene = new THREE.Scene();
 // Fixed just above the horizon plane, looking down at the dome: nothing
 // ever rotates the dome itself, since a bare sphere and its own equator
 // look the same from any heading - only the markers move, by relative
 // bearing, exactly as a flat compass ring used to move them.
 const camera = new THREE.PerspectiveCamera(38, 1, .05, 10);
 camera.position.set(0, .78, 2.35);
 camera.lookAt(0, 0, 0);

 scene.add(new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 24, 16),
  new THREE.MeshBasicMaterial({color: '#8fc4ff', transparent: true, opacity: .055, depthWrite: false})));
 scene.add(new THREE.Mesh(new THREE.SphereGeometry(SPHERE_RADIUS, 24, 16),
  new THREE.MeshBasicMaterial({color: '#bfe3ff', wireframe: true, transparent: true, opacity: .1, depthWrite: false})));
 const horizon = new THREE.Mesh(new THREE.TorusGeometry(SPHERE_RADIUS, .0035, 8, 96),
  new THREE.MeshBasicMaterial({color: '#dcf0ff', transparent: true, opacity: .55}));
 horizon.rotation.x = Math.PI / 2;
 scene.add(horizon);

 const texture = glowTexture();
 const spriteMaterial = () => new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending});

 // Marks the direction the observer is currently facing - always on the
 // dead-ahead meridian (relative bearing 0) by construction, sliding up and
 // down that line with the current pitch. Distinct from a tracked body's
 // marker so "start here, the target is over there" reads at a glance.
 const lookMarker = new THREE.Sprite(spriteMaterial());
 lookMarker.material.color.set('#ffffff');
 lookMarker.scale.setScalar(.09);
 scene.add(lookMarker);

 const markers = [], labels = [];
 function ensurePoolSize(count) {
  while (markers.length < count) {
   const sprite = new THREE.Sprite(spriteMaterial());
   sprite.visible = false;
   scene.add(sprite);
   markers.push(sprite);
   const label = document.createElement('span');
   label.className = 'surface-radar-label';
   label.innerHTML = '<i></i><b></b>';
   label.hidden = true;
   labelLayer.append(label);
   labels.push(label);
  }
 }

 function ensureRenderer() {
  if (renderer) return;
  renderer = new THREE.WebGLRenderer({alpha: true, antialias: true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(RADAR_SIZE, RADAR_SIZE);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  element.append(renderer.domElement, labelLayer);
 }

 function project(x, y, z) {
  const clip = new THREE.Vector3(x, y, z).project(camera);
  return projectedPoint(clip.x, clip.y, clip.z, RADAR_SIZE, RADAR_SIZE, 1.35);
 }

 return {
  element,
  // objects: [{name, key, azimuth, altitude}], heading/altitude: the
  // observer's current look direction in degrees.
  update({objects = [], heading = 0, altitude = 0} = {}) {
   ensureRenderer();
   ensurePoolSize(objects.length);

   const look = sphericalToRadar(0, altitude, MARKER_RADIUS);
   lookMarker.position.set(look.x, look.y, look.z);

   objects.forEach((object, index) => {
    const relative = relativeBearing(object.azimuth, heading);
    const point = sphericalToRadar(relative, object.altitude, MARKER_RADIUS);
    const sprite = markers[index], label = labels[index];
    sprite.visible = true;
    sprite.position.set(point.x, point.y, point.z);
    const isSun = object.key === 'sun', isMoon = object.key === 'moon';
    sprite.scale.setScalar(isSun ? .155 : isMoon ? .125 : .095);
    sprite.material.color.set(isSun ? '#ffd58a' : isMoon ? '#e6ded2' : '#b7e2ff');
    // A body on the far side of the dome (behind the observer) still shows
    // through the translucent sphere - dimmed, rather than hidden - so the
    // radar answers "is it even worth turning around for?" too.
    const facingCamera = point.x * camera.position.x + point.y * camera.position.y + point.z * camera.position.z > 0;
    sprite.material.opacity = facingCamera ? 1 : .4;
    const screen = project(point.x, point.y, point.z);
    label.hidden = !screen.visible;
    if (screen.visible) {
     label.style.left = `${screen.x.toFixed(1)}px`;
     label.style.top = `${screen.y.toFixed(1)}px`;
     label.style.opacity = facingCamera ? '1' : '.55';
     label.dataset.object = object.key || '';
     label.querySelector('b').textContent = object.name;
    }
   });
   for (let i = objects.length; i < markers.length; i++) markers[i].visible = false;
   for (let i = objects.length; i < labels.length; i++) labels[i].hidden = true;

   renderer.render(scene, camera);
  }
 };
}
