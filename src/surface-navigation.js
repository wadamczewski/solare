// Surface view is a map-scale first-person explorer. These rates make a held
// key visibly change the terrain on worlds as large as Jupiter while keeping
// the fast option explicit and testable.
export const SURFACE_TRAVERSAL_SPEED_KM_S=Object.freeze({normal:10,sprint:60});

const toDegrees=radians=>radians*180/Math.PI;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

// Moves an observer across a spherical body's tangent plane. Heading is the
// same azimuth used by the surface camera: 0° is north and 90° is east.
export function moveSurfaceCoordinates({latitude,longitude,azimuth,radiusKm,distanceKm,forward=0,right=0}){
 if(!Number.isFinite(radiusKm)||radiusKm<=0||!Number.isFinite(distanceKm)||distanceKm===0)return {latitude,longitude};
 const bearing=azimuth*Math.PI/180;
 const angular=toDegrees(distanceKm/radiusKm);
 const north=forward*Math.cos(bearing)-right*Math.sin(bearing);
 const east=forward*Math.sin(bearing)+right*Math.cos(bearing);
 const nextLatitude=clamp(latitude+north*angular,-89.99,89.99);
 const meanLatitude=(latitude+nextLatitude)*Math.PI/360;
 let nextLongitude=longitude+east*angular/Math.max(.01,Math.cos(meanLatitude));
 nextLongitude=((nextLongitude+180)%360+360)%360-180;
 return {latitude:nextLatitude,longitude:nextLongitude};
}
