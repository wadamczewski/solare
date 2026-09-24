// Approximate daylight scattering for a ground observer.  The geometry that
// supplies the solar altitude lives in surface-frame.js; this module only
// turns that measured angle into a restrained visual atmosphere and a label.
// It deliberately avoids treating airless worlds as blue-sky worlds.
const ATMOSPHERES={
 earth:{day:'#6fb6ea',twilight:'#d8865a',density:1},
 mars:{day:'#c98d67',twilight:'#d27a58',density:.34},
 titan:{day:'#d69a43',twilight:'#bd7040',density:1.9},
 venus:{day:'#d8b786',twilight:'#b37d5a',density:2.5}
};

export function surfaceAtmosphere(key, sunAltitude, enabled = true, observerHeightKm = 0) {
 const atmosphere=ATMOSPHERES[key];
 if (!atmosphere) return {phase:sunAltitude >= 0 ? 'sunlit' : 'night',opacity:0,color:'transparent',stars:1,clouds:0,density:0};
 const altitude=Math.max(-18,Math.min(90,Number(sunAltitude)||-90));
 // The surface camera may stand on a mountain.  Approximate the remaining
 // column of air with Earth's 8.5 km scale height (and a restrained value for
 // the other model atmospheres) so the visible haze changes with viewpoint
 // elevation without making a high summit look like open space.
 const scaleHeight=key==='earth'?8.5:key==='mars'?11.1:key==='titan'?20:15;
 const density=Math.max(.12,Math.min(1,Math.exp(-Math.max(0,Number(observerHeightKm)||0)/scaleHeight)));
 // Disabling the Earth control means opting out of the optical atmosphere as
 // a whole. The naked catalogue must return too; otherwise daytime remained
 // unnaturally starless even though the visible air had been removed.
 if(!enabled)return {phase:altitude>=6?'day':altitude>=-12?'twilight':'night',opacity:0,color:atmosphere.day,stars:1,clouds:0,density:0};
 if (altitude >= 6) {
  const brightness=Math.min(1,(altitude-6)/60);
  return {phase:'day',opacity:(.20+.06*brightness)*density,color:atmosphere.day,stars:0,clouds:1,density};
 }
 if (altitude >= -12) {
  const progress=(altitude+12)/18;
  // Astronomical twilight starts below -12°. The non-linear star fade keeps
  // the sky blue through civil twilight, then returns the real sky smoothly.
  return {phase:'twilight',opacity:.32*progress*density,color:atmosphere.twilight,stars:(1-progress)**2.4,clouds:progress**1.35,density};
 }
 return {phase:'night',opacity:0,color:atmosphere.day,stars:1,clouds:0,density};
}

export function surfaceLightLabel(phase) {
 return ({day:'Dzień',twilight:'Zmierzch',night:'Noc',sunlit:'Oświetlona strona'})[phase] || 'Noc';
}
