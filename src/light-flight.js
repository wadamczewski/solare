import {AU} from './physics.js';
export const LIGHT_SPEED_KM_S=299792.458;
export const LIGHT_SPEED_AU_S=LIGHT_SPEED_KM_S/AU;
export const lightTravelSeconds=distanceAU=>distanceAU/LIGHT_SPEED_AU_S;
// Coordinate-time trajectory in the simulation frame, not a photon rest frame.
export class LightFlight {
 constructor(origin,direction,now){const length=Math.hypot(...direction);if(!length||![...origin,...direction,now].every(Number.isFinite))throw new Error('Invalid light trajectory');this.origin=[...origin];this.direction=direction.map(x=>x/length);this.anchor=now;this.accumulated=0;this.rate=1;this.pausedAt=null;}
 seconds(now){return this.accumulated+(this.pausedAt===null?Math.max(0,now-this.anchor)/1000*this.rate:0);}
 setRate(rate,now){if(!Number.isFinite(rate)||rate<=0||rate>1000)throw new Error('Invalid flight rate');this.accumulated=this.seconds(now);this.anchor=now;this.rate=rate;}
 pause(now){if(this.pausedAt===null){this.accumulated=this.seconds(now);this.anchor=now;this.pausedAt=now;}}
 resume(now){if(this.pausedAt!==null){this.anchor=now;this.pausedAt=null;}}
 distance(now){return this.seconds(now)*LIGHT_SPEED_AU_S;}
 position(now){const d=this.distance(now);return this.origin.map((x,k)=>x+this.direction[k]*d);}
}
