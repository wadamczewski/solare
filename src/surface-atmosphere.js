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

export function surfaceAtmosphere(key, sunAltitude, enabled = true) {
 const atmosphere=ATMOSPHERES[key];
 if (!atmosphere) return {phase:sunAltitude >= 0 ? 'sunlit' : 'night',opacity:0,color:'transparent',stars:1,clouds:0};
 const altitude=Math.max(-18,Math.min(90,Number(sunAltitude)||-90));
 // Disabling the Earth control means opting out of the optical atmosphere as
 // a whole. The naked catalogue must return too; otherwise daytime remained
 // unnaturally starless even though the visible air had been removed.
 if(!enabled)return {phase:altitude>=6?'day':altitude>=-12?'twilight':'night',opacity:0,color:atmosphere.day,stars:1,clouds:0};
 if (altitude >= 6) {
  const brightness=Math.min(1,(altitude-6)/60);
  return {phase:'day',opacity:.20+.06*brightness,color:atmosphere.day,stars:0,clouds:1};
 }
 if (altitude >= -12) {
  const progress=(altitude+12)/18;
  // Astronomical twilight starts below -12°. The non-linear star fade keeps
  // the sky blue through civil twilight, then returns the real sky smoothly.
  return {phase:'twilight',opacity:.32*progress,color:atmosphere.twilight,stars:(1-progress)**2.4,clouds:progress**1.35};
 }
 return {phase:'night',opacity:0,color:atmosphere.day,stars:1,clouds:0};
}

export function surfaceLightLabel(phase) {
 return ({day:'Dzień',twilight:'Zmierzch',night:'Noc',sunlit:'Oświetlona strona'})[phase] || 'Noc';
}
