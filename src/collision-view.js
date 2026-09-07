// Use rendered world-space spheres, independently of camera zoom/perspective.
export function captureCollisionView(bodies, position, radius){
 return new Map(bodies.map(b=>[b.id,{p:position(b).toArray(),r:radius(b)}]));
}
export function viewContact(a,b,current,previous){
 const x=current.get(a.id),y=current.get(b.id);if(!x||!y)return false;
 const end=y.p.map((n,k)=>n-x.p[k]),limit=x.r+y.r;
 if(Math.hypot(...end)<=limit)return true;
 // Sibling satellites follow curved orbits, not the chord between samples.
 if(a.parent&&a.parent===b.parent)return false;
 const oldX=previous?.get(a.id),oldY=previous?.get(b.id);if(!oldX||!oldY)return false;
 const start=oldY.p.map((n,k)=>n-oldX.p[k]),motion=end.map((n,k)=>n-start[k]);
 const length2=motion.reduce((s,n)=>s+n*n,0);
 const t=length2?Math.max(0,Math.min(1,-start.reduce((s,n,k)=>s+n*motion[k],0)/length2)):0;
 return Math.hypot(...start.map((n,k)=>n+t*motion[k]))<=limit;
}
