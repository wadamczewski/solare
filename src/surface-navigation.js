// Surface view is a map-scale first-person explorer. These rates make a held
// key visibly change the terrain on worlds as large as Jupiter while keeping
// the fast option explicit and testable.
// Default traversal matches the former Shift pace: surface coordinates should
// change at a useful exploratory rate without requiring a modifier key.
// Shift remains a deliberate fast-traverse mode for crossing a large world.
export const SURFACE_TRAVERSAL_SPEED_KM_S=Object.freeze({normal:60,sprint:360});

const toDegrees=radians=>radians*180/Math.PI;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const wrapLongitude=value=>((value+180)%360+360)%360-180;

// Moves an observer over a great-circle path. Heading is the same azimuth
// used by the surface camera: 0° is north and 90° is east. The previous
// latitude/longitude approximation becomes singular at either pole: a small
// eastward move can look like a huge sideways jump there. A spherical
// destination point remains continuous across a pole and keeps the movement
// distance stable for W+D as well as a single key.
export function moveSurfaceCoordinates({latitude,longitude,azimuth,radiusKm,distanceKm,forward=0,right=0}){
 if(!Number.isFinite(radiusKm)||radiusKm<=0||!Number.isFinite(distanceKm)||distanceKm===0)return {latitude,longitude};
 const inputLength=Math.hypot(forward,right);
 if(!inputLength)return {latitude,longitude};
 const bearing=azimuth*Math.PI/180;
 const north=(forward*Math.cos(bearing)-right*Math.sin(bearing))/inputLength;
 const east=(forward*Math.sin(bearing)+right*Math.cos(bearing))/inputLength;
 const heading=Math.atan2(east,north),angular=distanceKm/radiusKm;
 const lat1=clamp(latitude,-90,90)*Math.PI/180,lon1=wrapLongitude(longitude)*Math.PI/180;
 const sinLat2=clamp(Math.sin(lat1)*Math.cos(angular)+Math.cos(lat1)*Math.sin(angular)*Math.cos(heading),-1,1);
 const lat2=Math.asin(sinLat2);
 const lon2=lon1+Math.atan2(Math.sin(heading)*Math.sin(angular)*Math.cos(lat1),Math.cos(angular)-Math.sin(lat1)*Math.sin(lat2));
 return {latitude:toDegrees(lat2),longitude:wrapLongitude(toDegrees(lon2))};
}
