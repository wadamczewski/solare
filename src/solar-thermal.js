const CMB_K=2.725;

// Representative global surface temperatures in kelvin under present solar output.
// Earth's day/night pair uses the AIRS global mean skin-temperature climatology:
// 290.72 K at 13:30 and 286.08 K at 01:30 local solar time. The model is a
// global mean, not a claim that every point on the night hemisphere is this warm.
// They are intentionally separate for day and night so a slider can show the
// thermal contrast instead of treating a whole body as one uniform surface.
const profiles={
 mercury:[440,100],venus:[735,735],earth:[290.72,286.08],mars:[253,160],
 jupiter:[165,110],saturn:[134,85],uranus:[76,50],neptune:[72,45],
 moon:[260,100],comet:[230,85],fragment:[230,85]
};

const profileFor=body=>profiles[body.key]||profiles.moon;
const vectorDistance=(a,b)=>Math.hypot(...a.map((value,index)=>value-b[index]));

export function surfaceTemperatures(body,bodies,brightness=100){
 if(!body||body.key==='sun'||body.key==='blackhole'||body.key==='neutron-star'||!Number.isFinite(brightness))return null;
 const sun=bodies.find(candidate=>candidate.key==='sun');
 if(!sun)return null;
 const distance=Math.max(1e-9,vectorDistance(body.p,sun.p));
 const host=body.parent&&bodies.find(candidate=>candidate.id===body.parent);
 const measuredReference=vectorDistance(host?.p||body.p,sun.p);
 const reference=Math.max(1e-9,body.a||host?.a||body.thermalReferenceAU||(body.thermalReferenceAU=measuredReference));
 // The selected central star retains its measured bolometric luminosity. The
 // UI slider changes only the displayed/star-output multiplier, while this
 // term carries the physical luminosity through to the thermal estimate.
 const irradiance=Math.max(0,brightness/100)*Math.max(0,sun.luminosity??1)*(reference/distance)**2;
 const [litReference,darkReference]=profileFor(body);
 // Stefan–Boltzmann scaling: temperature follows radiant flux to the 1/4 power.
 const litK=Math.max(CMB_K,litReference*Math.pow(irradiance,.25));
 // The night side cools more slowly because stored heat and atmospheres move
 // energy around; it still tends to the cosmic background as the Sun is dimmed.
 const darkK=CMB_K+(darkReference-CMB_K)*Math.pow(irradiance,.18);
 return {litC:litK-273.15,darkC:darkK-273.15,distanceAU:distance,irradiance};
}
