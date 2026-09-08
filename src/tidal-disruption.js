import {AU} from './physics.js';

export function tidalRadiusAU(target,hole){
 return target.radius/AU*Math.cbrt(Math.max(1,hole.mass/Math.max(target.mass,1e-30)));
}
export function tidalStretch(target,hole,distanceAU){
 if(!target||!hole||target.key==='blackhole'||!(distanceAU>0))return 0;
 const tidalRadius=tidalRadiusAU(target,hole),start=tidalRadius*4;
 return Math.max(0,Math.min(1,(start-distanceAU)/Math.max(start-tidalRadius*.9,1e-20)));
}
