import * as THREE from 'three';

export function createOrbitRibbon({segments=256,color='#7f9ec5',opacity=.28}={}) {
 const samples=segments+1;
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(samples*2*3),3).setUsage(THREE.DynamicDrawUsage));
 const indices=new Uint16Array(segments*6);
 for(let index=0;index<segments;index++){
  const source=index*6,vertex=index*2;
  indices.set([vertex,vertex+1,vertex+2,vertex+1,vertex+3,vertex+2],source);
 }
 geometry.setIndex(new THREE.BufferAttribute(indices,1));
 const material=new THREE.MeshBasicMaterial({color,transparent:true,opacity,side:THREE.DoubleSide,depthWrite:false,depthTest:true});
 const ribbon=new THREE.Mesh(geometry,material);
 ribbon.frustumCulled=false;
 return ribbon;
}

export function orbitRibbonHalfWidth(distance,fovDegrees,viewportHeight,{realScale=false}={}) {
 // Width is fixed on screen, never in world units. A world-space cap that reads as
 // a hairline near Earth is a small fraction of a pixel out at Neptune, and a
 // sub-pixel strip rasterises into disconnected arcs that look like extra orbits.
 const pixels=realScale?.7:1.5;
 const worldPerPixel=2*distance*Math.tan(fovDegrees*Math.PI/360)/Math.max(1,viewportHeight);
 const halfWidth=worldPerPixel*pixels;
 return realScale?Math.max(halfWidth,.000025):THREE.MathUtils.clamp(halfWidth,.0025,.055);
}

const tangent=new THREE.Vector3(),viewDirection=new THREE.Vector3(),side=new THREE.Vector3(),fallback=new THREE.Vector3(0,1,0);

export function updateOrbitRibbon(ribbon,points,camera,viewportHeight,{realScale=false}={}) {
 const positions=ribbon.geometry.attributes.position;
 for(let index=0;index<points.length;index++){
  const point=points[index],previous=points[Math.max(0,index-1)],next=points[Math.min(points.length-1,index+1)];
  tangent.subVectors(next,previous).normalize();
  viewDirection.subVectors(camera.position,point).normalize();
  side.crossVectors(tangent,viewDirection);
  if(side.lengthSq()<1e-8)side.crossVectors(tangent,fallback);
  if(side.lengthSq()<1e-8)side.set(1,0,0);else side.normalize();
  const halfWidth=orbitRibbonHalfWidth(camera.position.distanceTo(point),camera.fov,viewportHeight,{realScale});
  const vertex=index*2;
  positions.setXYZ(vertex,point.x+side.x*halfWidth,point.y+side.y*halfWidth,point.z+side.z*halfWidth);
  positions.setXYZ(vertex+1,point.x-side.x*halfWidth,point.y-side.y*halfWidth,point.z-side.z*halfWidth);
 }
 positions.needsUpdate=true;
}
