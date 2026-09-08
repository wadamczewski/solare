import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML,NodeFilter} from 'linkedom';
import {detectLanguage,translate,setLanguage,getLanguage,installLanguageUI} from '../src/i18n.js';
import {rows} from '../src/locales/messages.js';
import {initialSystem} from '../src/physics.js';
import {searchBodies} from '../src/body-search.js';

test('browser language negotiation supports regions and ordered fallback',()=>{
 assert.equal(detectLanguage(['de-AT','en-US']),'de');
 assert.equal(detectLanguage(['fr-FR','es-MX']),'es');
 assert.equal(detectLanguage(['PL_pl']),'pl');
 assert.equal(detectLanguage(['ja']), 'en');
 assert.equal(detectLanguage([]),'en');
});
test('every message is unique and complete in four languages',()=>{
 assert.equal(new Set(rows.map(r=>r[0])).size,rows.length);
 for(const row of rows){assert.equal(row.length,4);for(const value of row)assert.ok(typeof value==='string'&&value.length>0);for(const [i,lang] of ['pl','en','de','es'].entries())assert.equal(translate(row[0],lang),row[i],row[0]);}
 assert.equal(translate('Czas podróży 00:05 · Księżyc','en'),'Travel time 00:05 · Moon');
 assert.equal(translate('Przenieś lot do: Ziemia, 1.00 AU od Słońca','de'),'Flug versetzen zu: Erde, 1.00 AU von der Sonne');
 assert.equal(translate('TRAPPIST-1 e · 1.234e+24 kg','es'),'TRAPPIST-1 e · 1.234e+24 kg');
});
test('search accepts translated names without changing physical body identity',()=>{
 const bs=initialSystem(),original=structuredClone(bs);
 for(const [lang,query,name] of [['en','earth','Ziemia'],['de','mond','Księżyc'],['es','ganimedes','Ganimedes'],['pl','slonce','Słońce']])assert.ok(searchBodies(bs,query,b=>translate(b.name,lang)).some(b=>b.name===name));
 assert.deepEqual(bs,original);
});
test('language changes and live updates are reversible without rebuilding controls',async()=>{
 const {window}=parseHTML('<html><head><meta name="description" content="Interaktywny układ słoneczny 3D i piaskownica grawitacyjna."></head><body><header><button id="logo">solare°</button><button id="reset">Reset ↺</button></header><label id="caption">Masa · kg</label><input id="mass" value="123"><p id="metric">Czas podróży 00:05 · Księżyc</p><button id="action" aria-label="Wstrzymaj symulację">Pauza</button><script>const raw="Ziemia";</script></body></html>');
 const old={};for(const key of ['document','MutationObserver','NodeFilter','Event','localStorage'])old[key]=Object.getOwnPropertyDescriptor(globalThis,key);
 const storage=new Map();
 Object.assign(globalThis,{document:window.document,MutationObserver:window.MutationObserver,NodeFilter,Event:window.Event,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 // LinkeDOM implements select.value as read-only; match the browser setter.
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return this.querySelector('option[selected]')?.value},set(v){for(const o of this.querySelectorAll('option'))o.toggleAttribute('selected',o.value===v)}});
 let ui;
 try{
  setLanguage('en');ui=installLanguageUI();const input=document.querySelector('#mass'),metric=document.querySelector('#metric');input.value='456';let clicks=0;document.querySelector('#action').onclick=()=>clicks++;
  assert.equal(metric.textContent,'Travel time 00:05 · Moon');assert.equal(document.querySelector('#action').getAttribute('aria-label'),'Pause simulation');
  setLanguage('de');assert.equal(metric.textContent,'Reisezeit 00:05 · Mond');
  metric.textContent='Czas podróży 01:23 · Ziemia';
  await new Promise(resolve=>setTimeout(resolve,0));
  assert.equal(metric.textContent,'Reisezeit 01:23 · Erde');
  setLanguage('es');assert.equal(metric.textContent,'Tiempo de viaje 01:23 · Tierra');
  assert.equal(input,document.querySelector('#mass'));assert.equal(input.value,'456');document.querySelector('#action').click();assert.equal(clicks,1);
  assert.equal(storage.get('solare-language'),'es');assert.equal(document.documentElement.lang,'es');
  setLanguage('pl');assert.equal(metric.textContent,'Czas podróży 01:23 · Ziemia');assert.equal(document.querySelector('#action').getAttribute('aria-label'),'Wstrzymaj symulację');
  assert.equal(document.querySelector('script').textContent,'const raw="Ziemia";');
  setLanguage('invalid');assert.equal(getLanguage(),'pl');
 }finally{ui?.dispose();for(const [key,descriptor] of Object.entries(old)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
