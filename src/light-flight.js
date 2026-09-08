import {AU} from './physics.js';
export const LIGHT_SPEED_KM_S=299792.458;
export const LIGHT_SPEED_AU_S=LIGHT_SPEED_KM_S/AU;
export const lightTravelSeconds=distanceAU=>distanceAU/LIGHT_SPEED_AU_S;

// The vertical route is a navigation aid, not a ruler.  It gives every
// destination an equally legible stop while progress between two stops remains
// continuous and proportional to the real distance being travelled.
const ROUTE_FIRST_STOP=10;
export const flightRouteStopPosition=(index,count)=>{
 if(!Number.isInteger(index)||!Number.isInteger(count)||index<0||count<1||index>=count)throw new Error('Invalid flight route stop');
 return count===1?100:ROUTE_FIRST_STOP+index*(100-ROUTE_FIRST_STOP)/(count-1);
};
export const flightRouteProgress=(distanceAU,stopDistances)=>{
 if(!Number.isFinite(distanceAU)||!Array.isArray(stopDistances)||!stopDistances.length||stopDistances.some((d,i)=>!Number.isFinite(d)||d<=0||(i&&d<=stopDistances[i-1])))return 0;
 const first=stopDistances[0],count=stopDistances.length;
 if(distanceAU<=0)return 0;
 if(distanceAU<first)return flightRouteStopPosition(0,count)*distanceAU/first;
 for(let i=0;i<count-1;i++){
  const start=stopDistances[i],end=stopDistances[i+1];
  if(distanceAU<end){
   const from=flightRouteStopPosition(i,count),to=flightRouteStopPosition(i+1,count);
   return from+(to-from)*(distanceAU-start)/(end-start);
  }
 }
 return 100;
};
// Coordinate-time trajectory in the simulation frame, not a photon rest frame.
export class LightFlight {
 constructor(origin,direction,now){const length=Math.hypot(...direction);if(!length||![...origin,...direction,now].every(Number.isFinite))throw new Error('Invalid light trajectory');this.origin=[...origin];this.direction=direction.map(x=>x/length);this.anchor=now;this.accumulated=0;this.rate=1;this.pausedAt=null;}
 seconds(now){return this.accumulated+(this.pausedAt===null?Math.max(0,now-this.anchor)/1000*this.rate:0);}
 setRate(rate,now){if(!Number.isFinite(rate)||rate<=0||rate>1000)throw new Error('Invalid flight rate');this.accumulated=this.seconds(now);this.anchor=now;this.rate=rate;}
 seekDistance(distanceAU,now){if(!Number.isFinite(distanceAU)||distanceAU<0||!Number.isFinite(now))throw new Error('Invalid flight distance');this.accumulated=lightTravelSeconds(distanceAU);this.anchor=now;if(this.pausedAt!==null)this.pausedAt=now;}
 pause(now){if(this.pausedAt===null){this.accumulated=this.seconds(now);this.anchor=now;this.pausedAt=now;}}
 resume(now){if(this.pausedAt!==null){this.anchor=now;this.pausedAt=null;}}
 distance(now){return this.seconds(now)*LIGHT_SPEED_AU_S;}
 position(now){const d=this.distance(now);return this.origin.map((x,k)=>x+this.direction[k]*d);}
}
