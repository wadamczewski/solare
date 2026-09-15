// Directions for the first-person compass.  Bearings are measured clockwise
// from north, just like the local horizon produced by surface-frame.js.
export const relativeBearing=(bearing,heading)=>((bearing-heading+540)%360)-180;

// A point on the HUD ring.  North sits at the top; positive bearings move to
// the right, so a body moves around the ring exactly as the observer turns.
export function compassPoint(bearing,heading,radius){
 const angle=relativeBearing(bearing,heading)*Math.PI/180;
 return {x:Math.sin(angle)*radius,y:-Math.cos(angle)*radius,bearing:relativeBearing(bearing,heading)};
}
