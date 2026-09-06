import {AU} from './physics.js';
export const LIGHT_SPEED_KM_S=299792.458;
export const LIGHT_SPEED_AU_S=LIGHT_SPEED_KM_S/AU;
export const lightTravelSeconds=distanceAU=>distanceAU/LIGHT_SPEED_AU_S;
// Coordinate-time trajectory in the simulation frame, not a photon rest frame.
export class LightFlight {
 constructor(origin,direction,now){const length=Math.hypot(...direction);if(!length||![...origin,...direction,now].every(Number.isFinite))throw new Error('Invalid light trajectory');this.origin=[...origin];this.direction=direction.map(x=>x/length);this.startedAt=now;this.pausedAt=null;this.pausedMs=0;}
 pause(now){if(this.pausedAt===null)this.pausedAt=now;}
 resume(now){if(this.pausedAt!==null){this.pausedMs+=now-this.pausedAt;this.pausedAt=null;}}
 seconds(now){return Math.max(0,((this.pausedAt??now)-this.startedAt-this.pausedMs)/1000);}
 distance(now){return this.seconds(now)*LIGHT_SPEED_AU_S;}
 position(now){const d=this.distance(now);return this.origin.map((x,k)=>x+this.direction[k]*d);}
}
