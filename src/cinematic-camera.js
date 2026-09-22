export const CINEMATIC_DURATION_SECONDS=12;

export function cinematicPose(target, radius, elapsed, duration=CINEMATIC_DURATION_SECONDS) {
 const progress=Math.max(0,Math.min(1,elapsed/duration));
 const angle=progress*Math.PI*2;
 const distance=Math.max(radius*5, radius+0.15);
 const lift=distance*(.24+.1*Math.sin(progress*Math.PI));
 return {
  progress,
  position:[target[0]+Math.cos(angle)*distance,target[1]+lift,target[2]+Math.sin(angle)*distance],
  lookAt:[...target]
 };
}
