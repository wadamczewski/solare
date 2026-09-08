import {rows} from './locales/messages.js';
export const languages=['pl','en','de','es'];
export function detectLanguage(preferences=[]){for(const preference of preferences){const code=String(preference).toLowerCase().split(/[-_]/)[0];if(languages.includes(code))return code;}return 'en';}
let current=detectLanguage(typeof navigator==='undefined'?[]:navigator.languages||[navigator.language]);
try{const saved=localStorage.getItem('solare-language');if(languages.includes(saved))current=saved;}catch{}
export const getLanguage=()=>current;
export const getLocale=()=>({pl:'pl-PL',en:'en-GB',de:'de-DE',es:'es-ES'}[current]);
const numberFormats=new Map();
export function formatNumber(value,digits=3){const key=`${current}:${digits}`;if(!numberFormats.has(key))numberFormats.set(key,new Intl.NumberFormat(getLocale(),{maximumFractionDigits:digits}));return numberFormats.get(key).format(value);}
const translations=new Map(rows.map(row=>[row[0],row]));
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const expression=new RegExp('(?<![\\p{L}])('+[...translations.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?![\\p{L}])','gu');
export function translate(source,language=current){const index=languages.indexOf(language);return index<=0?String(source):String(source).replace(expression,match=>translations.get(match)?.[index]||match);}
export function setLanguage(language){if(!languages.includes(language))return;current=language;try{localStorage.setItem('solare-language',language)}catch{}if(typeof document!=='undefined'){document.documentElement.lang=language;document.dispatchEvent(new Event('languagechange'));}}
export function installLanguageUI(){
 const select=document.createElement('select');select.id='language';select.dataset.noTranslate='true';select.setAttribute('aria-label',translate('Język'));
 const labels=['🇵🇱 Polski','🇬🇧 English','🇩🇪 Deutsch','🇪🇸 Español'];select.innerHTML=languages.map((code,i)=>`<option value="${code}">${labels[i]}</option>`).join('');select.value=current;
 document.querySelector('header').insertBefore(select,document.querySelector('#reset'));
 select.onchange=()=>setLanguage(select.value);
 const cache=new WeakMap(),attrs=['aria-label','title','placeholder','label','alt','content'];
 function text(node){if(node.parentElement?.closest('script,style,[data-no-translate]'))return;const before=node.nodeValue,old=cache.get(node);const source=old&&old.output===before?old.source:before;const output=translate(source);cache.set(node,{source,output});if(output!==before)node.nodeValue=output;}
 function element(el){if(el.closest?.('script,style,[data-no-translate]'))return;let data=cache.get(el)||{};for(const key of attrs){if(!el.hasAttribute(key)||key==='content'&&el.getAttribute('name')!=='description')continue;const value=el.getAttribute(key),old=data[key],source=old&&old.output===value?old.source:value,output=translate(source);data[key]={source,output};if(value!==output)el.setAttribute(key,output);}cache.set(el,data);}
 function visit(root){if(root.nodeType===3){text(root);return}if(root.nodeType!==1)return;element(root);const walker=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);let n;while(n=walker.nextNode()){if(n.nodeType===3)text(n);else element(n);}}
 const options={subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attrs};
 const observer=new MutationObserver(records=>{observer.disconnect();for(const record of records){if(record.type==='childList')record.addedNodes.forEach(visit);else visit(record.target)}observer.observe(document.documentElement,options)});
 function refresh(){observer.disconnect();visit(document.documentElement);select.value=current;select.setAttribute('aria-label',translate('Język'));observer.observe(document.documentElement,options);}
 document.documentElement.lang=current;document.addEventListener('languagechange',refresh);refresh();
 return {refresh,dispose(){observer.disconnect();document.removeEventListener('languagechange',refresh);select.remove();}};
}
