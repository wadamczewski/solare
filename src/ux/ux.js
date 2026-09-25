// Entry point of the redesigned interface (index.html, the default page).
// The app is imported first and runs unchanged - same scene, same
// simulation, same controls - and only once it has built its interface does
// the redesign regroup it (see enhance.js). classic.html, the original
// interface kept as a fallback, never loads this file.
import '../main.js';
import './ux.css';
import {getLanguage} from '../i18n.js';
import {enhanceInterface} from './enhance.js';

// Every action below goes through a path main.js already exposes to people,
// so the redesign never reaches into the simulation's internals: a wheel
// step on the canvas is exactly what the mouse wheel does, and T / N are
// main.js's own keyboard shortcuts for the simulation panel and the spawner.
const pressKey=key=>window.dispatchEvent(new KeyboardEvent('keydown',{key,code:`Key${key.toUpperCase()}`,bubbles:true}));
const canvas=()=>document.querySelector('#universe canvas');

function zoom(direction){
 const target=canvas();if(!target)return;
 const box=target.getBoundingClientRect();
 target.dispatchEvent(new WheelEvent('wheel',{deltaY:direction>0?-420:420,deltaMode:0,clientX:box.left+box.width/2,clientY:box.top+box.height/2,bubbles:true,cancelable:true}));
}

// The whole-system view lives behind the ⌖ button of the simulation panel;
// open that panel, press it and close the panel again in the same task, so
// nothing is ever painted in between.
function home(){
 if(document.body.classList.contains('on-a-surface'))return;
 pressKey('t');
 document.querySelector('#home')?.click();
 document.querySelector('#panel .close')?.click();
}

function addBlackHole(){pressKey('t');document.querySelector('#custom-blackhole')?.click()}

let storage=null;try{storage=window.localStorage}catch{}
const ui=enhanceInterface({
 doc:document,win:window,language:getLanguage,storage,
 actions:{zoom,home,addCatalog:()=>pressKey('n'),addBlackHole,openTools:()=>pressKey('t'),reset:()=>window.solare?.reset?.()}
});
window.solareUx=ui;
