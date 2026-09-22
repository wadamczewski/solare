const BASE_PROFILES=[
 {id:'high',label:'Pełna jakość',dpr:2,detail:1},
 {id:'balanced',label:'Zrównoważona jakość',dpr:1.5,detail:.68},
 {id:'efficient',label:'Oszczędna jakość',dpr:1,detail:.42}
];

export function createAdaptiveQuality({maxDpr=2}={}) {
 let index=0,average=16.7,slowFor=0,fastFor=0,changed=true;
 const profile=()=>({...BASE_PROFILES[index],dpr:Math.min(maxDpr,BASE_PROFILES[index].dpr)});
 return {
  update(frameMs) {
   const ms=Math.max(1,Math.min(100,Number(frameMs)||16.7));
   average=average*.92+ms*.08;
   if(average>26){slowFor+=ms;fastFor=0}else if(average<18){fastFor+=ms;slowFor=0}else{slowFor=0;fastFor=0}
   if(slowFor>1400&&index<BASE_PROFILES.length-1){index++;slowFor=0;changed=true}
   if(fastFor>6000&&index>0){index--;fastFor=0;changed=true}
   const value={...profile(),average,changed};changed=false;return value;
  },
  reset(){index=0;average=16.7;slowFor=0;fastFor=0;changed=true;return profile()},
  profile
 };
}
