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
 if (!atmosphere) return {phase:sunAltitude >= 0 ? 'sunlit' : 'night',opacity:0,color:'transparent',stars:1};
 const altitude=Math.max(-18,Math.min(90,Number(sunAltitude)||-90));
 if (altitude >= 6) return {phase:'day',opacity:enabled?Math.min(.30,.05+altitude/480*atmosphere.density):0,color:atmosphere.day,stars:0};
 if (altitude >= -12) {
  const progress=(altitude+12)/18;
  return {phase:'twilight',opacity:enabled?(.035+.13*progress)*Math.min(1.2,atmosphere.density):0,color:atmosphere.twilight,stars:Math.max(0,.9-progress)};
 }
 return {phase:'night',opacity:0,color:atmosphere.day,stars:1};
}

export function surfaceLightLabel(phase) {
 return ({day:'Dzień',twilight:'Zmierzch',night:'Noc',sunlit:'Oświetlona strona'})[phase] || 'Noc';
}
