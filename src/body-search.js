import {planets} from './physics.js';
const planetKeys=new Set(planets.map(p=>p[1]));
// Diacritic-insensitive so 'ksiezyc' finds 'Ksiezyc' (Moon) without a Polish keyboard.
const normalize=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ł/g,'l');
export function searchBodies(bodies,query,label=b=>b.name){const q=normalize((query||'').trim());return q?bodies.filter(b=>(normalize(b.name).includes(q)||normalize(label(b)).includes(q))):bodies;}
export function bodyKind(body,bodies){
 if(body.key==='sun')return 'Gwiazda';
 if(body.key==='moon'){const host=bodies.find(b=>b.id===body.parent);return host?`Księżyc · ${host.name}`:'Księżyc'}
 if(body.key==='comet')return 'Kometa';
 if(body.key==='blackhole')return 'Czarna dziura';
 if(body.key==='fragment')return 'Odłamek';
 return planetKeys.has(body.key)?'Planeta':'Egzoplaneta';
}
