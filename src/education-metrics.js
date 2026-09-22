import {AU, G, SOLAR_MASS, velocityKmPerSecond} from './physics.js';

const density = body => body?.mass > 0 && body?.radius > 0 ? body.mass * SOLAR_MASS / (4 / 3 * Math.PI * body.radius ** 3) : null;
const distance = (a,b) => Math.hypot(...a.p.map((value,index)=>value-b.p[index]));

export function educationMetrics(body, primary) {
 if (!body) return null;
 const relativeVelocity=primary ? body.v.map((value,index)=>value-primary.v[index]) : body.v;
 const speed=velocityKmPerSecond(relativeVelocity);
 if (!primary) return {speed,acceleration:0,hillRadiusKm:null,rocheLimitKm:null,direction:relativeVelocity};
 const r=distance(body,primary), accelerationAUPerDay2=G * primary.mass / Math.max(r*r,1e-18);
 const acceleration=accelerationAUPerDay2 * AU * 1000 / 86400 ** 2;
 const hillRadiusKm=r * Math.cbrt(body.mass / Math.max(3*primary.mass,1e-30)) * AU;
 const primaryDensity=density(primary),bodyDensity=density(body);
 const rocheLimitKm=primaryDensity&&bodyDensity ? 2.44 * primary.radius * Math.cbrt(primaryDensity/bodyDensity) : null;
 return {speed,acceleration,hillRadiusKm,rocheLimitKm,direction:relativeVelocity,gravityDirection:primary.p.map((value,index)=>value-body.p[index])};
}

export const vectorLength = vector => Math.hypot(...vector);
