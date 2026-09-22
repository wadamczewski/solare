import {AU} from './physics.js';

const dot = (a,b) => a.reduce((sum,value,index) => sum + value * b[index], 0);
const subtract = (a,b) => a.map((value,index) => value - b[index]);
const length = value => Math.hypot(...value);

export function predictCloseApproaches(bodies, horizonDays = 365) {
 const events = [];
 for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) {
  const a = bodies[i], b = bodies[j], separation = subtract(b.p,a.p), velocity = subtract(b.v,a.v);
  const speedSquared = dot(velocity,velocity);
  if (speedSquared <= 1e-18) continue;
  const days = -dot(separation,velocity) / speedSquared;
  if (days < 0 || days > horizonDays) continue;
  const closest = length(separation.map((value,index) => value + velocity[index] * days));
  const contact = (a.radius + b.radius) / AU;
  if (closest > Math.max(contact * 8, .002)) continue;
  events.push({kind:closest <= contact ? 'collision' : 'approach', days, distanceAU:closest, bodies:[a.name,b.name]});
 }
 return events.sort((a,b) => a.days - b.days);
}

export function scheduledEclipses(items, now, horizonDays = 3650) {
 const start = new Date(now).valueOf(), end = start + horizonDays * 86400000;
 return items.map(item => ({...item, at:new Date(item.greatest).valueOf()}))
  .filter(item => item.at >= start && item.at <= end)
  .map(item => ({kind:'eclipse',days:(item.at-start)/86400000,name:item.name,eclipseKind:item.kind}))
  .sort((a,b) => a.days - b.days);
}

export function timelineEvents({bodies, now, solar = [], lunar = [], horizonDays = 365}) {
 return [...predictCloseApproaches(bodies,horizonDays), ...scheduledEclipses([...solar,...lunar],now,horizonDays * 10)]
  .sort((a,b) => a.days - b.days).slice(0,16);
}

