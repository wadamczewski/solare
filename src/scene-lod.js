import * as THREE from 'three';

// Shared indexed meshes keep distant objects inexpensive while retaining the
// full silhouette where a body occupies a meaningful part of the viewport.
const geometries = Object.freeze({
 low: new THREE.SphereGeometry(1, 18, 12),
 medium: new THREE.SphereGeometry(1, 32, 22),
 high: new THREE.SphereGeometry(1, 56, 40)
});

export const shapeGeometry = level => geometries[level] || geometries.medium;
export const isShapeGeometry = geometry => Object.values(geometries).includes(geometry);

export function projectedDiameterPixels(radius, distance, fovDegrees, viewportHeight) {
 if (!(radius > 0 && distance > 0 && viewportHeight > 0)) return 0;
 const focalLength = viewportHeight / (2 * Math.tan(fovDegrees * Math.PI / 360));
 return radius * 2 / distance * focalLength;
}

export function shapeLodForDiameter(diameter) {
 if (diameter >= 170) return 'high';
 if (diameter >= 48) return 'medium';
 return 'low';
}

export function updateShapeLod(view, camera, viewportHeight) {
 if (!view || view.hasDamageGeometry || view.irregular) return view?.lodLevel;
 const diameter = projectedDiameterPixels(
  view.mesh.scale.x,
  camera.position.distanceTo(view.group.position),
  camera.fov,
  viewportHeight
 );
 const level = shapeLodForDiameter(diameter);
 if (level !== view.lodLevel) {
  view.mesh.geometry = shapeGeometry(level);
  view.lodLevel = level;
 }
 return level;
}
