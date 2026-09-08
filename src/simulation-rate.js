// Pending integration time belongs to the rate that created it. Dropping it on
// a deliberate rate change keeps the visible simulation responsive instead of
// completing an obsolete 365-days-per-second backlog at the new rate.
export function changeSimulationRate(speed,pendingDays,nextRate){
 const rate=Number(nextRate);
 if(!Number.isFinite(rate)||rate<=0)return {speed,pendingDays};
 return {speed:rate,pendingDays:0};
}
