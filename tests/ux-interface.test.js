import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseHTML} from 'linkedom';
import {UX_STRINGS,UX_LANGUAGES,uxText,uxShortcut,isEditableTarget} from '../src/ux/strings.js';
import {enhanceInterface} from '../src/ux/enhance.js';

const root=new URL('../',import.meta.url).pathname;
const read=path=>readFileSync(root+path,'utf8');
const ids=html=>[...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]).sort();

test('every string of the redesign exists, non-empty, in all four interface languages',()=>{
 assert.deepEqual(UX_LANGUAGES,['pl','en','de','es']);
 for(const [key,row] of Object.entries(UX_STRINGS)){
  assert.equal(row.length,4,`${key} needs four languages`);
  row.forEach((text,index)=>assert.ok(typeof text==='string'&&text.trim(),`${key} is empty in ${UX_LANGUAGES[index]}`));
  const placeholders=row.map(text=>[...text.matchAll(/\{(\w+)\}/g)].map(match=>match[1]).join());
  assert.equal(new Set(placeholders).size,1,`${key} must use the same placeholders in every language`);
 }
});

test('uxText picks the language, falls back to English and fills placeholders',()=>{
 assert.equal(uxText('add','pl'),'Dodaj ciało');
 assert.equal(uxText('add','de'),'Körper hinzufügen');
 assert.equal(uxText('add','fr'),'Add body');
 assert.equal(uxText('confirm.remove.title','en',{name:'Mars'}),'Remove Mars?');
 assert.equal(uxText('no.such.key','pl'),'no.such.key');
});

test('shortcuts the redesign claims never collide with the ones main.js owns',()=>{
 const key=(k,extra={})=>uxShortcut({key:k,...extra});
 assert.equal(key('/'),'search');assert.equal(key('k',{ctrlKey:true}),'search');assert.equal(key('k',{metaKey:true}),'search');
 assert.equal(key('?'),'help');assert.equal(key('+'),'zoom-in');assert.equal(key('-'),'zoom-out');assert.equal(key('0'),'home');
 assert.equal(key('r'),'reset');assert.equal(key('R',{shiftKey:true}),null,'Shift+R is not a reset');
 for(const owned of [' ','Escape','n','t','w','a','s','d','q','e','Shift'])assert.equal(key(owned),null,`${owned} belongs to main.js`);
 assert.equal(key('r',{ctrlKey:true}),null,'browser reload must keep working');
 assert.equal(key('/',{altKey:true}),null);
 assert.equal(isEditableTarget({tagName:'INPUT'}),true);assert.equal(isEditableTarget({tagName:'BUTTON'}),false);
 assert.equal(isEditableTarget({isContentEditable:true}),true);assert.equal(isEditableTarget(null),false);
});

test('index.html loads the redesign and classic.html keeps the original interface',()=>{
 const classic=read('classic.html'),redesign=read('index.html');
 // main.js needs exactly the same static skeleton on both pages.
 assert.deepEqual(ids(redesign),ids(classic));
 assert.match(redesign,/<script type="module" src="\/src\/ux\/ux\.js"><\/script>/);
 assert.doesNotMatch(redesign,/src\/main\.js/,'ux.js imports main.js itself, so the order is guaranteed');
 assert.doesNotMatch(classic,/src\/ux/);assert.match(classic,/<script type="module" src="\/src\/main\.js"><\/script>/);
 assert.match(read('src/ux/ux.js'),/^\s*(?:\/\/.*\n)*import '\.\.\/main\.js';/m);
 assert.doesNotMatch(read('src/main.js'),/src\/ux|\.\/ux\//,'the classic app must not know about the redesign');
 const config=read('vite.config.js');
 assert.match(config,/index\.html/);assert.match(config,/classic\.html/);
});

test('the redesign stylesheet only ever applies under body.ux',()=>{
 const css=read('src/ux/ux.css').replace(/\/\*[\s\S]*?\*\//g,'');
 const selectors=[];
 // Collect top-level and @media-nested rule selectors (keyframes excluded).
 for(const match of css.matchAll(/(?:^|[}{])\s*([^{}@]+?)\s*\{/g)){
  const selector=match[1].trim();
  if(!selector||/^(from|to|\d+%)$/.test(selector))continue;
  selectors.push(selector);
 }
 const unscoped=selectors.flatMap(group=>group.split(',')).map(part=>part.trim())
  .filter(part=>part&&!/^body\.ux\b/.test(part)&&!/^\.ux-|^#ux-|^\.ux\b/.test(part));
 assert.deepEqual(unscoped,[],'every rule targets body.ux or an element only the redesign creates');
});

// A minimal copy of the controls main.js builds, with the same ids, so the
// regrouping can be checked without WebGL.
function fixture(){
 const {window,document}=parseHTML(`<!doctype html><html><body>
  <main id="universe"></main>
  <header><button id="logo">solare°</button><select id="language"><option value="pl">Polski</option></select><button id="reset">Reset <span>↺</span></button></header>
  <aside id="panel" hidden></aside>
  <aside id="solar-control"><label for="central-star"><span>Gwiazda centralna</span></label><select id="central-star"></select><label for="solar-brightness"><span>Jasność gwiazdy</span></label><input id="solar-brightness" type="range">
   <label class="sky-toggle" for="orbits"><span>Orbity</span><input id="orbits" type="checkbox"><i></i></label><label class="sky-toggle" for="education"><span>Warstwa edukacyjna</span><input id="education" type="checkbox"><i></i></label>
   <div class="sky-explorer"><label class="field-title" for="body-search">Szukaj</label><div class="body-search"><input id="body-search" type="text"><ul id="body-results" hidden></ul></div>
    <label class="sky-toggle" for="constellations"><span>Gwiazdozbiory</span><input id="constellations" type="checkbox"><i></i></label><label class="sky-toggle" for="deep-sky-markers"><span>Obiekty</span><input id="deep-sky-markers" type="checkbox"><i></i></label>
    <button id="systems" class="sky-mode">Symulacja układów</button><button id="surface" class="sky-mode">Widok z powierzchni</button></div></aside>
  <nav id="time-dock"><button id="dock-pause"><span id="dock-pause-icon">Ⅱ</span><span id="dock-pause-label">Pauza</span></button><div class="dock-divider"></div><label for="dock-speed">Tempo</label><select id="dock-speed"></select><label class="dock-scale" id="dock-scale-label"><input id="dock-scale" type="checkbox"> Rzeczywista skala</label><div class="dock-divider"></div><button id="dock-flight"><span class="dock-c">c</span><span id="dock-flight-label">Lot światła</span></button><button id="dock-death"><span class="dock-c">☉</span><span id="dock-death-label">Śmierć Słońca</span></button><button id="dock-black-hole"><span class="dock-c">◉</span><span id="dock-black-hole-label">Wpadanie</span></button><button id="share-simulation">Udostępnij</button><button id="collision-course">Kurs kolizyjny</button><button id="eclipse-scenarios">Zaćmienia</button><button id="event-timeline">Zdarzenia</button><button id="cinematic-camera">Kamera</button></nav>
  <div id="sim-clock"><span id="sim-date"></span></div>
 </body></html>`);
 const calls=[];
 const actions=Object.fromEntries(['zoom','home','addCatalog','addBlackHole','openTools','reset'].map(name=>[name,(...args)=>calls.push([name,...args])]));
 const saved=new Map(),storage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 return {window,document,calls,actions,storage,saved};
}
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
const keydown=(window,target,key,extra={})=>{const event=new window.Event('keydown',{bubbles:true,cancelable:true});Object.assign(event,{key,...extra});(target||window).dispatchEvent(event);return event};

test('regrouping moves the original controls - same nodes, same listeners - instead of copying them',()=>{
 const {window,document,actions,storage}=fixture();
 const search=document.querySelector('#body-search'),flight=document.querySelector('#dock-flight'),orbits=document.querySelector('#orbits');
 let flights=0;flight.addEventListener('click',()=>flights++);
 enhanceInterface({doc:document,win:window,language:()=>'en',actions,storage});
 assert.equal(document.querySelector('#body-search'),search,'the search input is the same element');
 assert.ok(document.querySelector('header .ux-search').contains(search),'search now lives in the header');
 assert.ok(document.querySelector('#ux-scenarios-menu').contains(flight),'scenarios are grouped in one menu');
 flight.click();assert.equal(flights,1,'a moved button keeps the listener main.js attached');
 for(const id of ['collision-course','eclipse-scenarios','event-timeline','dock-death','dock-black-hole'])
  assert.ok(document.querySelector('#ux-scenarios-menu').contains(document.querySelector('#'+id)),id);
 assert.ok(document.querySelector('#solar-control').contains(orbits));
 assert.equal(document.querySelector('.sky-explorer'),null,'the emptied container is gone');
 assert.equal(document.querySelectorAll('#time-dock .dock-divider').length,0);
 assert.ok(document.querySelector('#time-dock').contains(document.querySelector('#sim-clock')),'the clock sits in the time group');
 assert.ok(document.querySelector('#ux-more-menu').contains(document.querySelector('#reset')),'reset moved out of the header row');
 assert.equal(search.getAttribute('placeholder'),'Search planets, moons, stars…');
 assert.equal(document.querySelector('label[for="education"] span').textContent,'Physics vectors');
 assert.ok(document.body.classList.contains('ux'));
});

test('the logo returns to the whole system instead of opening the simulation panel',()=>{
 const {window,document,actions,storage,calls}=fixture();
 let classic=0;document.querySelector('#logo').onclick=()=>classic++;
 enhanceInterface({doc:document,win:window,language:()=>'pl',actions,storage});
 document.querySelector('#logo').click();
 assert.equal(classic,0);assert.deepEqual(calls,[['home']]);
});

test('reset - button or R - asks first, and only a confirmation resets',async()=>{
 const {window,document,actions,storage,calls}=fixture();
 let classic=0;document.querySelector('#reset').onclick=()=>classic++;
 enhanceInterface({doc:document,win:window,language:()=>'pl',actions,storage});
 const dialog=document.querySelector('#ux-confirm');
 document.querySelector('#reset').click();
 assert.equal(classic,0,'main.js must not reset straight away');
 assert.ok(dialog.hasAttribute('open'));
 assert.equal(dialog.querySelector('#ux-confirm-title').textContent,'Zresetować symulację?');
 document.querySelector('#ux-confirm-cancel').click();await flush();
 assert.deepEqual(calls,[]);assert.ok(!dialog.hasAttribute('open'));
 const event=keydown(window,document.body,'r');
 assert.ok(event.defaultPrevented,'R is claimed so main.js does not reset');
 document.querySelector('#ux-confirm-ok').click();await flush();
 assert.deepEqual(calls,[['reset']]);
});

test('keyboard shortcuts stay silent while typing, and Escape closes a menu first',()=>{
 const {window,document,actions,storage,calls}=fixture();
 enhanceInterface({doc:document,win:window,language:()=>'pl',actions,storage});
 const search=document.querySelector('#body-search');
 const typed=keydown(window,search,'r');
 assert.equal(typed.defaultPrevented,false);assert.ok(!document.querySelector('#ux-confirm').hasAttribute('open'));
 keydown(window,document.body,'+');keydown(window,document.body,'-');keydown(window,document.body,'0');
 assert.deepEqual(calls,[['zoom',1],['zoom',-1],['home']]);
 document.querySelector('#ux-scenarios').click();
 assert.equal(document.querySelector('#ux-scenarios-menu').hidden,false);
 let reachedMain=false;window.addEventListener('keydown',()=>{reachedMain=true});
 keydown(window,document.body,'Escape');
 assert.equal(document.querySelector('#ux-scenarios-menu').hidden,true);
 assert.equal(reachedMain,false,'closing a menu must not also stop a light flight or close the panel');
});

test('menus open one at a time and the add menu drives the spawner actions',()=>{
 const {window,document,actions,storage,calls}=fixture();
 enhanceInterface({doc:document,win:window,language:()=>'pl',actions,storage});
 document.querySelector('#ux-scenarios').click();document.querySelector('#ux-add').click();
 assert.equal(document.querySelector('#ux-scenarios-menu').hidden,true);
 assert.equal(document.querySelector('#ux-add-menu').hidden,false);
 assert.equal(document.querySelector('#ux-add').getAttribute('aria-expanded'),'true');
 document.querySelector('#ux-add-hole').click();
 assert.deepEqual(calls,[['addBlackHole']]);
 assert.equal(document.querySelector('#ux-add-menu').hidden,true,'choosing an item closes the menu');
});

test('a running scenario keeps a visible stop control in the dock',async()=>{
 const {window,document,actions,storage}=fixture();
 enhanceInterface({doc:document,win:window,language:()=>'pl',actions,storage});
 const stop=document.querySelector('#ux-stop-scenario');
 assert.equal(stop.hidden,true);
 let stopped=0;document.querySelector('#dock-flight').addEventListener('click',()=>stopped++);
 document.body.classList.add('in-light-flight');await flush();
 assert.equal(stop.hidden,false);
 stop.click();assert.equal(stopped,1);
 document.body.classList.remove('in-light-flight');await flush();
 assert.equal(stop.hidden,true);
});

test('the layers panel remembers whether it was collapsed',()=>{
 const first=fixture();
 enhanceInterface({doc:first.document,win:first.window,language:()=>'pl',actions:first.actions,storage:first.storage});
 const toggle=first.document.querySelector('#ux-view-toggle');
 assert.equal(toggle.getAttribute('aria-expanded'),'true');
 toggle.click();
 assert.equal(toggle.getAttribute('aria-expanded'),'false');
 assert.equal(first.saved.get('solare-ux:view-open'),'0');
 const second=fixture();second.storage.setItem('solare-ux:view-open','0');
 enhanceInterface({doc:second.document,win:second.window,language:()=>'pl',actions:second.actions,storage:second.storage});
 assert.equal(second.document.querySelector('#ux-view-body').hidden,true);
});

function showBodyPanel(document){
 const panel=document.querySelector('#panel');
 panel.innerHTML=`<div class="panel-head"><h2>Mars</h2><button class="close">×</button></div><div class="actions primary-actions"><button class="action primary" id="apply">Zastosuj</button><button class="action" id="focus">Śledź</button></div>
  <div class="row"><label>Masa</label><input id="mass" type="number" value="6.4e23"></div><div class="row"><label>Promień</label><input id="radius" type="number" value="3389"></div>
  <div class="row"><label>Prędkość</label><output>24</output></div><div class="row"><label>Obrót</label><input id="spin" type="number" value="24.6"></div><div class="row"><label>Nachylenie</label><input id="tilt" type="number" value="25"></div>
  <label class="field-title">Położenie</label><div class="vector"><input id="pX" type="number" value="1"><input id="pY" type="number" value="0"><input id="pZ" type="number" value="0"></div>
  <div class="reference-anchor"></div><details class="advanced-fields"><button class="action danger" id="remove">Usuń</button></details><p class="muted" id="validation"></p>`;
 panel.dataset.bodyId='4';panel.hidden=false;
 return panel;
}

test('the body panel leads with Follow and keeps physics read-only until Edit',async()=>{
 const {window,document,actions,storage}=fixture();
 enhanceInterface({doc:document,win:window,language:()=>'en',actions,storage});
 const panel=showBodyPanel(document);
 let applied=0,reject=false;document.querySelector('#apply').onclick=()=>{applied++;if(reject)document.querySelector('#validation').textContent='Sprawdź wartości: …'};
 await flush();
 assert.ok(document.querySelector('#focus').classList.contains('primary'));
 assert.ok(!document.querySelector('#apply').classList.contains('primary'));
 const params=panel.querySelector('#ux-params');
 for(const id of ['mass','radius','spin','tilt','pX'])assert.ok(params.contains(panel.querySelector('#'+id)),id);
 assert.ok(!params.contains(panel.querySelector('output')),'read-only facts stay outside the editable section');
 assert.ok(panel.querySelector('.reference-anchor').compareDocumentPosition(params)&4,'parameters come after the reference section');
 assert.ok([...params.querySelectorAll('input')].every(input=>input.readOnly));
 panel.querySelector('#ux-edit').click();
 assert.ok(params.classList.contains('editing'));
 assert.equal(panel.querySelector('#mass').readOnly,false);
 panel.querySelector('#mass').value='1';
 panel.querySelector('#ux-edit-cancel').click();
 assert.equal(panel.querySelector('#mass').value,'6.4e23','cancel restores what was there');
 assert.ok(panel.querySelector('#mass').readOnly);
 panel.querySelector('#ux-edit').click();panel.querySelector('#apply').click();
 assert.equal(applied,1,'Apply still runs main.js\'s own handler');
 assert.ok(!params.classList.contains('editing'));
 panel.querySelector('#ux-edit').click();
 reject=true;panel.querySelector('#apply').click();
 assert.ok(params.classList.contains('editing'),'a rejected value keeps the form open');
});

test('removing a body asks first',async()=>{
 const {window,document,actions,storage}=fixture();
 enhanceInterface({doc:document,win:window,language:()=>'en',actions,storage});
 const panel=showBodyPanel(document);
 let removed=0;panel.querySelector('#remove').onclick=()=>removed++;
 await flush();
 panel.querySelector('#remove').click();
 assert.equal(removed,0);
 assert.equal(document.querySelector('#ux-confirm-title').textContent,'Remove Mars?');
 document.querySelector('#ux-confirm-ok').click();await flush();
 assert.equal(removed,1);
});

test('switching language re-renders every string the redesign owns',()=>{
 const {window,document,actions,storage}=fixture();
 let language='pl';
 enhanceInterface({doc:document,win:window,language:()=>language,actions,storage});
 assert.equal(document.querySelector('#ux-add .ux-label').textContent,'Dodaj ciało');
 language='es';document.dispatchEvent(new window.Event('languagechange'));
 assert.equal(document.querySelector('#ux-add .ux-label').textContent,'Añadir cuerpo');
 assert.equal(document.querySelector('#ux-zoom-in').getAttribute('aria-label'),'Acercar');
 assert.equal(document.querySelector('#share-simulation').textContent,'Compartir');
});

test('the welcome card shows once',()=>{
 const first=fixture();
 enhanceInterface({doc:first.document,win:first.window,language:()=>'pl',actions:first.actions,storage:first.storage});
 assert.ok(first.document.querySelector('#ux-welcome'));
 first.document.querySelector('#ux-welcome-start').click();
 assert.equal(first.document.querySelector('#ux-welcome'),null);
 const second=fixture();second.storage.setItem('solare-ux:welcomed','1');
 enhanceInterface({doc:second.document,win:second.window,language:()=>'pl',actions:second.actions,storage:second.storage});
 assert.equal(second.document.querySelector('#ux-welcome'),null);
});
