import {G,AU,accelerations,step,stableStep} from './physics.js';
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
// Exact two-body drift for a bound satellite; external forces remain in the kicks.
export function keplerDrift(r,v,mu,dt){
 const distance=Math.hypot(...r),energy=dot(v,v)/2-mu/distance;if(!(energy<0))return null;
 const a=-mu/(2*energy),h=cross(r,v),hNorm=Math.hypot(...h);if(hNorm<1e-20)return null;
 const ev=cross(v,h).map((x,k)=>x/mu-r[k]/distance),e=Math.hypot(...ev);if(e>=.98)return null;
 let x,y,E;
 if(e<1e-9){x=r.map(n=>n/distance);y=cross(h.map(n=>n/hNorm),x);E=Math.sqrt(mu/a**3)*dt;}
 else{x=ev.map(n=>n/e);y=cross(h.map(n=>n/hNorm),x);const E0=Math.atan2(dot(r,v)/(Math.sqrt(mu*a)*e),(1-distance/a)/e),M=E0-e*Math.sin(E0)+Math.sqrt(mu/a**3)*dt;E=M;for(let i=0;i<12;i++){const correction=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));E-=correction;if(Math.abs(correction)<1e-13)break}}
 const c=Math.cos(E),s=Math.sin(E),q=Math.sqrt(1-e*e),rho=a*(1-e*c),factor=Math.sqrt(mu*a)/rho;
 return {r:x.map((n,k)=>a*((c-e)*n+q*s*y[k])),v:x.map((n,k)=>factor*(-s*n+q*c*y[k]))};
}
function satelliteStates(bs){const result=[];for(let i=0;i<bs.length;i++){const b=bs[i];if(!b.parent)continue;const j=bs.findIndex(p=>p.id===b.parent);if(j<0)continue;const r=sub(b.p,bs[j].p),v=sub(b.v,bs[j].v),mu=G*(b.mass+bs[j].mass);if(!keplerDrift(r,v,mu,0))return null;result.push({i,j,r,v,mu})}return result}
export function fastStepSize(bs){
 const satellites=satelliteStates(bs);if(!satellites)return {dt:stableStep(bs),split:false,reason:'unbound'};let dt=.25;
 // Tight close approaches use the direct solver; tidal forces bound the split step.
 for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){
  const a=bs[i],b=bs[j],r=sub(b.p,a.p),v=sub(b.v,a.v),r2=dot(r,r),d=Math.sqrt(r2),mu=G*(a.mass+b.mass),contact=(a.radius+b.radius)/AU;
  const parentPair=a.parent===b.id||b.parent===a.id;
  if(d<contact*(parentPair?1.15:4))return {dt:stableStep(bs),split:false,reason:'contact '+a.name+' '+b.name};
  if(parentPair)continue;
  dt=Math.min(dt,.06*Math.sqrt(d**3/mu));
  const vv=dot(v,v),closest=vv?Math.max(0,Math.min(dt,-dot(r,v)/vv)):0;
  if(Math.hypot(...r.map((x,k)=>x+v[k]*closest))<contact*4)return {dt:stableStep(bs),split:false,reason:'swept '+a.name+' '+b.name};
 }
 for(const s of satellites){let tide=0;for(let k=0;k<bs.length;k++){if(k===s.i||k===s.j)continue;const r=sub(bs[k].p,bs[s.j].p),q=sub(bs[k].p,bs[s.i].p),d=Math.hypot(...r),e=Math.hypot(...q);tide+=G*bs[k].mass*Math.hypot(...q.map((v,k)=>v/e**3-r[k]/d**3))}if(tide>0)dt=Math.min(dt,.04*Math.sqrt(Math.hypot(...s.r)/tide))}
 return {dt:Math.max(1e-9,dt),split:true,states:satellites};
}
export function splitStep(bs,dt,preparedStates){
 const states=preparedStates||satelliteStates(bs);if(!states){step(bs,dt);return}const before=accelerations(bs),satIds=new Set(states.map(s=>s.i));
 for(const s of states){const length=Math.hypot(...s.r),central=s.mu/length**3;s.v=s.v.map((v,k)=>v+.5*dt*(before[s.i][k]-before[s.j][k]+central*s.r[k]));s.drift=keplerDrift(s.r,s.v,s.mu,dt);if(!s.drift){step(bs,dt);return}}
 for(let i=0;i<bs.length;i++)if(!satIds.has(i))for(let k=0;k<3;k++){bs[i].v[k]+=.5*dt*before[i][k];bs[i].p[k]+=dt*bs[i].v[k]}
 for(const s of states)bs[s.i].p=s.drift.r.map((x,k)=>x+bs[s.j].p[k]);
 const after=accelerations(bs);for(let i=0;i<bs.length;i++)if(!satIds.has(i))for(let k=0;k<3;k++)bs[i].v[k]+=.5*dt*after[i][k];
 for(const s of states){const r=s.drift.r,central=s.mu/Math.hypot(...r)**3;bs[s.i].v=s.drift.v.map((v,k)=>v+.5*dt*(after[s.i][k]-after[s.j][k]+central*r[k])+bs[s.j].v[k])}
}
