// AU, solar masses, days. G = Gaussian gravitational constant squared.
export const G=0.0002959122082855911, AU=149597870.7, SOLAR_MASS=1.98847e30;
export const planets=[
 ['Merkury','mercury',.3871,.2056,7.005,1.6601e-7,2439.7,1407.6,.034,'#a79a87',.3],
 ['Wenus','venus',.7233,.0068,3.395,2.4478e-6,6051.8,5832.5,177.36,'#d6b777',2.8],
 ['Ziemia','earth',1,.0167,0,3.0035e-6,6371,23.934,23.44,'#629ed1',5.55],
 ['Mars','mars',1.5237,.0934,1.85,3.227e-7,3389.5,24.623,25.19,'#c47953',3.85],
 ['Jowisz','jupiter',5.2029,.0484,1.303,.00095479,69911,9.925,3.13,'#d2b99a',.5],
 ['Saturn','saturn',9.537,.0542,2.489,.00028589,58232,10.656,26.73,'#d9c69c',3.35],
 ['Uran','uranus',19.191,.0472,.773,.00004366,25362,17.24,97.77,'#91d4d9',2.3],
 ['Neptun','neptune',30.07,.0086,1.77,.00005151,24622,16.11,28.32,'#4c73c9',5.65]
];
// name, parent, orbital radius km, mass kg, radius km, period days, irregular
export const moons=[
 ['Księżyc','earth',384400,7.342e22,1737.4,27.322,false],
 ['Fobos','mars',9376,1.0659e16,11.267,.3189,true],['Deimos','mars',23463,1.4762e15,6.2,1.263,true],
 ['Io','jupiter',421700,8.932e22,1821.6,1.769,false],['Europa','jupiter',671034,4.8e22,1560.8,3.551,false],['Ganimedes','jupiter',1070412,1.4819e23,2634.1,7.155,false],['Kallisto','jupiter',1882709,1.0759e23,2410.3,16.689,false],
 ['Mimas','saturn',185539,3.75e19,198.2,.942,false],['Enceladus','saturn',238042,1.08e20,252.1,1.37,false],['Tetyda','saturn',294672,6.175e20,531.1,1.888,false],['Dione','saturn',377415,1.095e21,561.4,2.737,false],['Rea','saturn',527068,2.307e21,763.8,4.518,false],['Tytan','saturn',1221870,1.3452e23,2574.7,15.945,false],['Japet','saturn',3560820,1.8056e21,734.5,79.321,false],['Hyperion','saturn',1481000,5.6e18,135,21.277,true],
 ['Miranda','uranus',129390,6.59e19,235.8,1.413,false],['Ariel','uranus',190900,1.353e21,578.9,2.52,false],['Umbriel','uranus',266000,1.172e21,584.7,4.144,false],['Tytania','uranus',436300,3.527e21,788.9,8.706,false],['Oberon','uranus',583500,3.014e21,761.4,13.463,false],
 ['Tryton','neptune',354759,2.139e22,1353.4,-5.877,false],['Proteusz','neptune',117647,4.4e19,210,1.122,true],['Nereida','neptune',5513400,3.1e19,170,360.13,true]
];
let nextId=0;
export function body(o){return {id:++nextId,p:[0,0,0],v:[0,0,0],mass:1,radius:1,spin:24,tilt:0,color:'#bab9b4',...o};}
export function initialSystem(){
 const result=[body({name:'Słońce',key:'sun',mass:1,radius:695700,spin:609.12,tilt:7.25,color:'#ffc475'})];
 for(const [name,key,a,e,inc,mass,radius,spin,tilt,color,theta] of planets){
  const r=a*(1-e*e)/(1+e*Math.cos(theta)),h=Math.sqrt(G*a*(1-e*e)),rad=inc*Math.PI/180;
  result.push(body({name,key,a,e,mass,radius,spin,tilt,color,p:[r*Math.cos(theta),r*Math.sin(theta)*Math.sin(rad),r*Math.sin(theta)*Math.cos(rad)],v:[-G/h*Math.sin(theta),G/h*(e+Math.cos(theta))*Math.sin(rad),G/h*(e+Math.cos(theta))*Math.cos(rad)]}));
 }
 moons.forEach(([name,parent,dist,kg,radius,days,irregular],i)=>{
  const host=result.find(b=>b.key===parent),r=dist/AU,t=i*2.399,speed=Math.sqrt(G*host.mass/r)*Math.sign(days),incl=parent==='uranus'?1.706:parent==='neptune'?-0.41:.08;
  const off=[r*Math.cos(t),r*Math.sin(t)*Math.sin(incl),r*Math.sin(t)*Math.cos(incl)];
  result.push(body({name,key:'moon',parent:host.id,mass:kg/SOLAR_MASS,radius,spin:days*24,tilt:incl*180/Math.PI,irregular,color:name==='Io'?'#d8c67d':name==='Tytan'?'#d6a668':'#b8b8b6',p:host.p.map((x,k)=>x+off[k]),v:host.v.map((x,k)=>x+[-speed*Math.sin(t),speed*Math.cos(t)*Math.sin(incl),speed*Math.cos(t)*Math.cos(incl)][k])}));
 });
 const total=result.reduce((s,b)=>s+b.mass,0),com=[0,0,0],mom=[0,0,0];result.forEach(b=>b.p.forEach((x,k)=>{com[k]+=x*b.mass/total;mom[k]+=b.v[k]*b.mass/total}));result.forEach(b=>b.p.forEach((_,k)=>{b.p[k]-=com[k];b.v[k]-=mom[k]}));return result;
}
export function accelerations(bs){const acc=bs.map(()=>[0,0,0]);for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const a=bs[i],b=bs[j],dx=b.p[0]-a.p[0],dy=b.p[1]-a.p[1],dz=b.p[2]-a.p[2],r2=dx*dx+dy*dy+dz*dz+1e-20,f=G/(r2*Math.sqrt(r2)),fa=f*b.mass,fb=f*a.mass;acc[i][0]+=dx*fa;acc[i][1]+=dy*fa;acc[i][2]+=dz*fa;acc[j][0]-=dx*fb;acc[j][1]-=dy*fb;acc[j][2]-=dz*fb}return acc}

export function step(bs,dt){const a=accelerations(bs);for(let i=0;i<bs.length;i++)for(let k=0;k<3;k++){bs[i].v[k]+=.5*dt*a[i][k];bs[i].p[k]+=dt*bs[i].v[k]}const a2=accelerations(bs);for(let i=0;i<bs.length;i++)for(let k=0;k<3;k++)bs[i].v[k]+=.5*dt*a2[i][k];}
export function stableStep(bs){let dt=.02;for(let i=0;i<bs.length;i++)for(let j=i+1;j<bs.length;j++){const r=Math.hypot(...bs[i].p.map((x,k)=>x-bs[j].p[k]));dt=Math.min(dt,.035*Math.sqrt(r*r*r/(G*(bs[i].mass+bs[j].mass))),.035*r/(Math.hypot(...bs[i].v.map((x,k)=>x-bs[j].v[k]))+1e-12))}return Math.max(1e-9,dt)}
