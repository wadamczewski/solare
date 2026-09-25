import {uxText,uxShortcut,isEditableTarget} from './strings.js';

// The redesigned interface (index.html) is a layer over the classic one, not a
// fork of it: main.js builds exactly the same controls as on classic.html,
// with the same ids and listeners, and this module only regroups them,
// relabels what it must and adds what was missing. Moving a DOM node keeps
// its listeners and its id, and main.js always looks controls up by id, so
// the simulation keeps driving every one of them wherever it now sits. That
// is also why nothing here reimplements a control - it moves the original.
//
// `actions` supplies the few behaviours that need the running app (zoom,
// overview, spawner, reset); ux.js wires them to main.js, the tests to fakes.

const SVG={
 search:'<path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21"/>',
 layers:'<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
 chevron:'<path d="m6 9 6 6 6-6"/>',
 sparkle:'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 minus:'<path d="M5 12h14"/>',
 home:'<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8.5"/><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3"/>',
 help:'<circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.9v.6"/><path d="M12 17.3v.2"/>',
 more:'<circle cx="5.5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="18.5" cy="12" r="1.2"/>',
 camera:'<rect x="3" y="6.5" width="13" height="11" rx="2"/><path d="m16 10.5 5-3v9l-5-3"/>',
 share:'<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 13 4.5a4 4 0 0 1 5.6 5.6l-2 2"/><path d="m13 17.5-2 2a4 4 0 0 1-5.6-5.6l2-2"/>',
 stop:'<rect x="6.5" y="6.5" width="11" height="11" rx="1.5"/>',
 edit:'<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
 surface:'<path d="M2 19h20"/><path d="M4 19c2-4 5-6 8-6s6 2 8 6"/><circle cx="16.5" cy="6" r="1.6"/>',
 systems:'<circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="9.5" ry="4"/><circle cx="20.5" cy="11" r="1.1"/>',
 star:'<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M18.7 5.3l-1.8 1.8M7.1 16.9l-1.8 1.8"/>'
};
export function icon(doc,name,className='ux-icon'){
 const span=doc.createElement('span');span.className=className;span.setAttribute('aria-hidden','true');
 span.innerHTML=`<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${SVG[name]||''}</svg>`;
 return span;
}

export function enhanceInterface({doc=document,win=window,language=()=>'pl',actions={},storage=null}={}){
 const t=(key,values)=>uxText(key,language(),values);
 const store={get(key){try{return storage?.getItem(`solare-ux:${key}`)??null}catch{return null}},set(key,value){try{storage?.setItem(`solare-ux:${key}`,String(value))}catch{}}};
 const $=selector=>doc.querySelector(selector);
 const el=(tag,props={},...children)=>{
  const node=doc.createElement(tag);
  for(const [key,value] of Object.entries(props)){
   if(value==null||value===false)continue;
   if(key==='class')node.className=value;
   else if(key==='text'){node.dataset.uxText=value;node.dataset.noTranslate='true'}
   else if(key==='aria'){node.dataset.uxAria=value}
   else if(key==='title'){node.dataset.uxTitle=value}
   else if(key.startsWith('on'))node.addEventListener(key.slice(2),value);
   else node.setAttribute(key,value===true?'':value);
  }
  for(const child of children)if(child)node.append(child);
  return node;
 };
 const text=(key,className)=>el('span',{class:className,text:key});

 // Re-renders every string this layer owns. Original controls are left to
 // i18n.js; everything created here carries data-ux-* keys instead.
 function refresh(){
  for(const node of doc.querySelectorAll('[data-ux-text]'))node.textContent=t(node.dataset.uxText,node.dataset.uxValues?JSON.parse(node.dataset.uxValues):undefined);
  for(const node of doc.querySelectorAll('[data-ux-aria]'))node.setAttribute('aria-label',t(node.dataset.uxAria));
  for(const node of doc.querySelectorAll('[data-ux-title]'))node.setAttribute('title',t(node.dataset.uxTitle));
  for(const node of doc.querySelectorAll('[data-ux-placeholder]'))node.setAttribute('placeholder',t(node.dataset.uxPlaceholder));
 }

 doc.body.classList.add('ux');

 // ---- Menus and dialogs -------------------------------------------------
 const menus=new Set();
 function makeMenu(trigger,menu){
  menus.add({trigger,menu});
  trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');
  menu.hidden=true;
  trigger.addEventListener('click',event=>{event.stopPropagation();const open=menu.hidden;closeMenus();if(open)openMenu(trigger,menu)});
  menu.addEventListener('click',event=>{if(event.target.closest('button,a')&&!event.target.closest('select'))closeMenus()});
 }
 function openMenu(trigger,menu){menu.hidden=false;trigger.setAttribute('aria-expanded','true');menu.querySelector('button:not([disabled]),a')?.focus({preventScroll:true})}
 function closeMenus(){let closed=false;for(const {trigger,menu} of menus){if(!menu.hidden)closed=true;menu.hidden=true;trigger.setAttribute('aria-expanded','false')}return closed}
 doc.addEventListener('click',event=>{if(![...menus].some(({menu,trigger})=>menu.contains(event.target)||trigger.contains(event.target)))closeMenus()});

 const confirmDialog=el('dialog',{id:'ux-confirm',class:'ux-dialog','aria-labelledby':'ux-confirm-title'},
  el('h2',{id:'ux-confirm-title','data-no-translate':'true'}),
  el('p',{id:'ux-confirm-body','data-no-translate':'true'}),
  el('div',{class:'ux-dialog-actions'},el('button',{type:'button',class:'ux-button',id:'ux-confirm-cancel',text:'cancel'}),el('button',{type:'button',class:'ux-button danger',id:'ux-confirm-ok'})));
 doc.body.append(confirmDialog);
 let pendingConfirm=null;
 function confirmAction({title,body,ok,values}){
  confirmDialog.querySelector('#ux-confirm-title').textContent=t(title,values);
  confirmDialog.querySelector('#ux-confirm-body').textContent=t(body,values);
  const okButton=confirmDialog.querySelector('#ux-confirm-ok');okButton.textContent=t(ok);okButton.dataset.noTranslate='true';
  return new Promise(resolve=>{
   pendingConfirm?.(false);pendingConfirm=resolve;
   if(typeof confirmDialog.showModal==='function'&&!confirmDialog.open)confirmDialog.showModal();else confirmDialog.setAttribute('open','');
   // The safe choice has focus: Enter or Space on reflex never destroys.
   confirmDialog.querySelector('#ux-confirm-cancel').focus?.();
  });
 }
 function settleConfirm(value){const resolve=pendingConfirm;pendingConfirm=null;if(confirmDialog.open&&typeof confirmDialog.close==='function')confirmDialog.close();else confirmDialog.removeAttribute('open');resolve?.(value)}
 confirmDialog.querySelector('#ux-confirm-ok').addEventListener('click',()=>settleConfirm(true));
 confirmDialog.querySelector('#ux-confirm-cancel').addEventListener('click',()=>settleConfirm(false));
 confirmDialog.addEventListener('cancel',event=>{event.preventDefault();settleConfirm(false)});

 // A key written as '@name' is a localised word (Drag, Wheel…), any other
 // string a literal key cap.
 const shortcutRow=(keys,label)=>el('div',{class:'ux-shortcut'},el('span',{class:'ux-keys'},...keys.map(key=>key.startsWith('@')?el('kbd',{text:key.slice(1)}):el('kbd',{},doc.createTextNode(key)))),text(label));
 const helpDialog=el('dialog',{id:'ux-help',class:'ux-dialog ux-help','aria-labelledby':'ux-help-title'},
  el('div',{class:'ux-dialog-head'},el('h2',{id:'ux-help-title',text:'help.title'}),el('button',{type:'button',class:'ux-icon-button',id:'ux-help-close',aria:'close'},icon(doc,'plus','ux-icon ux-rotate'))),
  el('div',{class:'ux-help-grid'},
   el('section',{},el('h3',{text:'help.mouse'}),
    shortcutRow(['@key.drag'],'help.drag'),shortcutRow(['Shift','@key.drag'],'help.pan'),shortcutRow(['@key.wheel'],'help.wheel'),
    shortcutRow(['@key.click'],'help.click'),shortcutRow(['@key.dblclick'],'help.dblclick'),shortcutRow(['@key.empty'],'help.empty')),
   el('section',{},el('h3',{text:'help.keyboard'}),
    shortcutRow(['Space'],'help.space'),shortcutRow(['/'],'help.search'),shortcutRow(['+','−'],'help.zoom'),shortcutRow(['0'],'help.home'),
    shortcutRow(['W','A','S','D'],'help.fly'),shortcutRow(['Shift'],'help.shift'),shortcutRow(['N'],'help.new'),shortcutRow(['T'],'help.tools'),
    shortcutRow(['R'],'help.reset'),shortcutRow(['Esc'],'help.escape'),shortcutRow(['?'],'help.helpKey'))));
 doc.body.append(helpDialog);
 const openHelp=()=>{closeMenus();if(typeof helpDialog.showModal==='function'){if(!helpDialog.open)helpDialog.showModal()}else helpDialog.setAttribute('open','')};
 const closeHelp=()=>{if(typeof helpDialog.close==='function'&&helpDialog.open)helpDialog.close();else helpDialog.removeAttribute('open')};
 helpDialog.querySelector('#ux-help-close').addEventListener('click',closeHelp);
 helpDialog.addEventListener('click',event=>{if(event.target===helpDialog)closeHelp()});

 const requestReset=async()=>{if(await confirmAction({title:'confirm.reset.title',body:'confirm.reset.body',ok:'confirm.reset.ok'}))actions.reset?.()};

 // ---- Header: logo · search · help, language, more ---------------------
 const header=$('header'),logo=$('#logo'),reset=$('#reset'),languageSelect=$('#language');
 header.classList.add('ux-header');
 // The logo is where people click to get "home": it returns to the whole
 // system. The simulation panel it used to open is under More and on T.
 logo.dataset.uxAria='logo.home';logo.dataset.uxTitle='logo.home';
 // main.js wires both with an onclick property (restart and the panel
 // toggle), so replacing that property replaces its behaviour outright.
 logo.onclick=event=>{event?.preventDefault?.();actions.home?.()};
 reset.onclick=event=>{event?.preventDefault?.();closeMenus();requestReset()};

 const searchWrap=$('.body-search'),searchInput=$('#body-search'),searchResults=$('#body-results'),searchLabel=doc.querySelector('label[for="body-search"]');
 const search=el('div',{class:'ux-search',role:'search'});
 if(searchLabel){searchLabel.classList.add('ux-visually-hidden');search.append(searchLabel)}
 search.append(icon(doc,'search','ux-icon ux-search-icon'));
 if(searchWrap)search.append(searchWrap);
 search.append(el('kbd',{class:'ux-search-key','aria-hidden':'true'},doc.createTextNode('/')));
 if(searchInput){searchInput.dataset.uxPlaceholder='search.placeholder';searchInput.dataset.uxAria='search.label'}
 // Picking a result used to leave the list open over the scene until the
 // field lost focus; the choice is made, so the list goes away with it.
 const settleSearch=()=>(win.setTimeout||setTimeout)(()=>{searchInput?.blur();if(searchResults)searchResults.hidden=true},0);
 searchResults?.addEventListener('mousedown',event=>{if(event.target.closest('[data-key]'))settleSearch()});
 searchInput?.addEventListener('keydown',event=>{if(event.key==='Enter')settleSearch()});

 const helpButton=el('button',{type:'button',class:'ux-icon-button',id:'ux-help-button',aria:'more.help',title:'more.help',onclick:openHelp},icon(doc,'help'));
 const moreButton=el('button',{type:'button',class:'ux-icon-button',id:'ux-more',aria:'more',title:'more'},icon(doc,'more'));
 reset.innerHTML='';reset.className='ux-menu-row danger';reset.append(text('more.reset'),el('kbd',{},doc.createTextNode('R')));
 const classicLink=el('a',{class:'ux-menu-row',id:'ux-classic',href:`./classic.html${win.location?.search||''}`},text('more.classic'));
 const moreMenu=el('div',{class:'ux-menu ux-menu-right',id:'ux-more-menu',role:'menu'},
  el('button',{type:'button',class:'ux-menu-row',id:'ux-open-tools',onclick:()=>actions.openTools?.()},text('more.tools'),el('kbd',{},doc.createTextNode('T'))),
  el('button',{type:'button',class:'ux-menu-row',id:'ux-fullscreen',onclick:()=>{const root=doc.documentElement;if(doc.fullscreenElement)doc.exitFullscreen?.();else root.requestFullscreen?.()}},text('more.fullscreen')),
  el('button',{type:'button',class:'ux-menu-row',id:'ux-open-help',onclick:openHelp},text('more.help'),el('kbd',{},doc.createTextNode('?'))),
  classicLink,el('div',{class:'ux-menu-separator',role:'separator'}),reset);
 const moreWrap=el('div',{class:'ux-menu-anchor'},moreButton,moreMenu);
 makeMenu(moreButton,moreMenu);
 const headerActions=el('div',{class:'ux-header-actions'},helpButton,languageSelect,moreWrap);
 header.append(search,headerActions);
 // A phone header has room for the logo, the search field and one menu:
 // the language chooser moves into More there (it is the same element, so
 // i18n.js keeps driving it) and the placeholder shortens to one word.
 const languageRow=el('label',{class:'ux-menu-row ux-language-row'},text('language'));
 const phone=win.matchMedia?.('(max-width: 640px)');
 const placeLanguage=()=>{
  const small=!!phone?.matches;
  if(small&&languageSelect&&languageSelect.parentElement!==languageRow){languageRow.append(languageSelect);moreMenu.prepend(languageRow)}
  else if(!small&&languageSelect&&languageSelect.parentElement!==headerActions){headerActions.insertBefore(languageSelect,moreWrap);languageRow.remove()}
  if(searchInput)searchInput.dataset.uxPlaceholder=small?'search.short':'search.placeholder';
  refresh();
 };
 phone?.addEventListener?.('change',placeLanguage);

 // ---- Left: layers & view ------------------------------------------------
 const control=$('#solar-control');
 const mobile=()=>(win.innerWidth||1024)<=640;
 let setLayersOpen=null,layersToggle=null;
 if(control){
  control.classList.add('ux-view');
  control.setAttribute('aria-label',t('view.title'));control.dataset.uxAria='view.title';
  const byFor=id=>control.querySelector(`label[for="${id}"]`);
  const education=byFor('education');
  const educationSpan=education?.querySelector('span');
  if(educationSpan){educationSpan.dataset.uxText='layers.physics';educationSpan.dataset.noTranslate='true';education.dataset.uxTitle='layers.physics.hint'}
  const layers=el('section',{class:'ux-section'},el('h3',{text:'layers.heading'}),byFor('orbits'),byFor('constellations'),byFor('deep-sky-markers'),education);
  const modeButton=(button,iconName,desc)=>{if(!button)return null;const label=[...button.childNodes];const title=el('span',{class:'ux-item-title'});label.forEach(node=>title.append(node));button.classList.add('ux-mode');button.append(icon(doc,iconName),el('span',{class:'ux-item-text'},title,text(desc,'ux-item-desc')));return button};
  const modes=el('section',{class:'ux-section'},el('h3',{text:'modes.heading'}),modeButton($('#surface'),'surface','modes.surface.desc'),modeButton($('#systems'),'systems','modes.systems.desc'));
  const star=el('details',{class:'ux-section ux-star'},el('summary',{},icon(doc,'star'),text('star.heading'),icon(doc,'chevron','ux-icon ux-chevron')),
   byFor('central-star'),$('#central-star'),byFor('solar-brightness'),$('#solar-brightness'));
  if(store.get('star-open')==='1')star.open=true;
  star.addEventListener('toggle',()=>store.set('star-open',star.open?'1':'0'));
  control.querySelector('.sky-explorer')?.remove();
  const body=el('div',{class:'ux-view-body',id:'ux-view-body'},layers,modes,star);
  const toggle=el('button',{type:'button',class:'ux-view-toggle',id:'ux-view-toggle','aria-controls':'ux-view-body',aria:'view.toggle',title:'view.toggle'},icon(doc,'layers'),text('view.title','ux-view-title'),icon(doc,'chevron','ux-icon ux-chevron'));
  control.replaceChildren(toggle,body);
  const saved=store.get('view-open');
  const setOpen=open=>{control.classList.toggle('collapsed',!open);toggle.setAttribute('aria-expanded',String(open));body.hidden=!open;if(win.Event)win.dispatchEvent?.(new win.Event('resize'))};
  setOpen(saved==null?!mobile():saved==='1');
  toggle.addEventListener('click',()=>{const open=control.classList.contains('collapsed');setOpen(open);store.set('view-open',open?'1':'0')});
  setLayersOpen=setOpen;layersToggle=toggle;
 }

 // ---- Left column: the layers panel and the running mode's panel ---------
 // The surface view, the Sun's death and the black-hole fall each bring a
 // panel of their own. They used to be pinned at fixed offsets and slid under
 // (or over) the layers panel. They now share one column with it, between
 // the header and the dock, and behave as an accordion: a mode panel opening
 // folds the layers panel (and unfolds it again when the mode ends, unless the
 // viewer folded it themselves), unfolding the layers panel folds the mode
 // panel to its title, and a click on that title brings it back. Whatever is
 // open shares the column's height and scrolls inside it, never overlapping.
 const stack=el('div',{class:'ux-left-stack',id:'ux-left-stack'});
 doc.body.append(stack);
 if(control)stack.append(control);
 const MODE_HEADS={'surface-view':'.surface-head','solar-death':'.death-head','black-hole-fall':'.fall-head'};
 const modePanels=Object.keys(MODE_HEADS).map(id=>doc.getElementById(id)).filter(Boolean);
 modePanels.forEach(item=>stack.append(item));
 const physicsCard=doc.getElementById('education-hud');if(physicsCard)stack.append(physicsCard);
 const layersOpen=()=>!!control&&!control.classList.contains('collapsed');
 const shownModes=()=>modePanels.filter(item=>!item.hidden);
 let autoFolded=false,modeShown=false;
 const decorateHead=item=>{
  const head=item.querySelector(MODE_HEADS[item.id]);if(!head)return;
  // Only write what changed, so observing the panel never feeds itself.
  const folded=item.classList.contains('ux-collapsed'),set=(name,value)=>{if(head.getAttribute(name)!==value)head.setAttribute(name,value)};
  if(!head.classList.contains('ux-fold-head'))head.classList.add('ux-fold-head');
  set('role','button');set('tabindex','0');set('aria-expanded',String(!folded));set('title',t(folded?'fold.expand':'fold.collapse'));
 };
 const foldMode=(item,folded)=>{if(item.classList.contains('ux-collapsed')!==folded)item.classList.toggle('ux-collapsed',folded);decorateHead(item)};
 const toggleMode=item=>{
  const unfold=item.classList.contains('ux-collapsed');foldMode(item,!unfold);
  if(unfold&&layersOpen()&&setLayersOpen){setLayersOpen(false);autoFolded=true}
 };
 for(const item of modePanels){
  item.addEventListener('click',event=>{
   const head=event.target.closest?.(MODE_HEADS[item.id]);
   if(!head||event.target.closest('button,a,input,select,label'))return;
   toggleMode(item);
  });
  item.addEventListener('keydown',event=>{
   if(!event.target.classList?.contains('ux-fold-head')||(event.key!=='Enter'&&event.key!==' '))return;
   event.preventDefault();toggleMode(item);
  });
 }
 layersToggle?.addEventListener('click',()=>{
  // The viewer chose the layers panel's state; stop restoring it for them.
  autoFolded=false;
  if(layersOpen())shownModes().forEach(item=>foldMode(item,true));
 });
 const syncStack=()=>{
  const shown=shownModes();
  if(shown.length&&!modeShown){
   shown.forEach(item=>foldMode(item,false));
   if(layersOpen()&&setLayersOpen){setLayersOpen(false);autoFolded=true}
  }else if(!shown.length&&modeShown){
   modePanels.forEach(item=>foldMode(item,false));
   if(autoFolded&&setLayersOpen)setLayersOpen(true);
   autoFolded=false;
  }
  modeShown=shown.length>0;
  shown.forEach(decorateHead);
 };
 if(win.MutationObserver){
  // main.js rebuilds these panels' markup, so the title is decorated again
  // after every rebuild. (Two observers: some DOMs drop attribute records
  // when one observer also watches the child list.)
  const shownWatch=new win.MutationObserver(syncStack),markupWatch=new win.MutationObserver(syncStack);
  modePanels.forEach(item=>{shownWatch.observe(item,{attributes:true,attributeFilter:['hidden']});markupWatch.observe(item,{childList:true})});
 }
 syncStack();

 // ---- Bottom: time · scenarios · create · share ---------------------------
 const dock=$('#time-dock');
 const scenarioIds=[['dock-flight','scenarios.flight'],['dock-death','scenarios.death'],['dock-black-hole','scenarios.hole'],['collision-course','scenarios.collision'],['eclipse-scenarios','scenarios.eclipse'],['event-timeline','scenarios.events']];
 let stopChip=null;
 if(dock){
  dock.classList.add('ux-dock');
  const speedLabel=dock.querySelector('label[for="dock-speed"]');
  if(speedLabel){speedLabel.textContent='';speedLabel.append(text('dock.speed'))}
  const time=el('div',{class:'ux-dock-group ux-time'},$('#dock-pause'),el('div',{class:'ux-speed'},speedLabel,$('#dock-speed')),$('#sim-clock'),$('#dock-scale-label'));
  const scenarioMenu=el('div',{class:'ux-menu ux-scenarios',id:'ux-scenarios-menu',role:'menu'},el('p',{class:'ux-menu-hint',text:'scenarios.hint'}));
  for(const [id,desc] of scenarioIds){
   const button=$('#'+id);if(!button)continue;
   button.classList.add('ux-menu-item');button.setAttribute('role','menuitem');
   const glyph=button.querySelector('.dock-c');
   const title=el('span',{class:'ux-item-title'});
   for(const node of [...button.childNodes])if(node!==glyph)title.append(node);
   button.append(el('span',{class:'ux-item-text'},title,text(desc,'ux-item-desc')));
   // 'Zdarzenia' is the one scenario title the classic interface never
   // translated; it is set once at creation, so it can simply be replaced.
   if(id==='event-timeline'){title.replaceChildren(text('scenarios.events.title'))}
   if(!glyph)button.prepend(el('span',{class:'dock-c ux-glyph','aria-hidden':'true'},doc.createTextNode({'collision-course':'☄','eclipse-scenarios':'◐','event-timeline':'⋯'}[id]||'•')));
   scenarioMenu.append(button);
  }
  const scenarioButton=el('button',{type:'button',class:'ux-dock-button',id:'ux-scenarios',aria:'scenarios',title:'scenarios.hint'},icon(doc,'sparkle'),text('scenarios','ux-label'),icon(doc,'chevron','ux-icon ux-chevron ux-up'));
  makeMenu(scenarioButton,scenarioMenu);
  const addMenu=el('div',{class:'ux-menu',id:'ux-add-menu',role:'menu'},
   el('button',{type:'button',class:'ux-menu-item',role:'menuitem',id:'ux-add-catalog',onclick:()=>actions.addCatalog?.()},el('span',{class:'dock-c ux-glyph','aria-hidden':'true'},doc.createTextNode('✦')),el('span',{class:'ux-item-text'},text('add.catalog','ux-item-title'),text('add.catalog.desc','ux-item-desc')),el('kbd',{},doc.createTextNode('N'))),
   el('button',{type:'button',class:'ux-menu-item',role:'menuitem',id:'ux-add-hole',onclick:()=>actions.addBlackHole?.()},el('span',{class:'dock-c ux-glyph','aria-hidden':'true'},doc.createTextNode('●')),el('span',{class:'ux-item-text'},text('add.hole','ux-item-title'),text('add.hole.desc','ux-item-desc'))),
   el('p',{class:'ux-menu-hint',text:'add.tip'}));
  const addButton=el('button',{type:'button',class:'ux-dock-button',id:'ux-add',aria:'add',title:'add'},icon(doc,'plus'),text('add','ux-label'));
  makeMenu(addButton,addMenu);
  stopChip=el('button',{type:'button',class:'ux-dock-button ux-stop',id:'ux-stop-scenario',hidden:true,aria:'scenarios.stop'},icon(doc,'stop'),text('scenarios.stop','ux-label'));
  stopChip.addEventListener('click',()=>{const body=doc.body.classList;const target=body.contains('in-light-flight')?$('#dock-flight'):body.contains('in-black-hole-fall')?($('#fall-stop')||$('#dock-black-hole')):body.contains('in-solar-death')?$('#dock-death'):null;target?.click()});
  const explore=el('div',{class:'ux-dock-group'},stopChip,el('div',{class:'ux-menu-anchor'},scenarioButton,scenarioMenu),el('div',{class:'ux-menu-anchor'},addButton,addMenu));
  const camera=$('#cinematic-camera'),share=$('#share-simulation');
  // Both labels were never translated in the classic interface. The camera
  // button's text is set once, so it is simply replaced; the share button's
  // is rewritten by main.js on every copy ('Skopiowano', then back), so its
  // two Polish source texts are mapped to the interface language whenever
  // main.js puts one of them back.
  if(camera){camera.classList.add('ux-dock-button');camera.replaceChildren(icon(doc,'camera'),text('camera','ux-label'))}
  if(share){
   share.classList.add('ux-dock-button','ux-share');share.dataset.noTranslate='true';
   const sources={'Udostępnij':'share','Skopiowano':'share.copied'};
   const localise=()=>{const key=sources[share.textContent.trim()];if(key&&share.textContent!==t(key))share.textContent=t(key)};
   new win.MutationObserver(localise).observe(share,{childList:true,characterData:true,subtree:true});
   doc.addEventListener('languagechange',()=>{share.textContent='Udostępnij';localise()});
   localise();
  }
  const shareIcon=icon(doc,'share');
  const output=el('div',{class:'ux-dock-group ux-output'},camera,el('span',{class:'ux-share-wrap'},shareIcon,share));
  dock.replaceChildren(time,el('div',{class:'ux-divider'}),explore,el('div',{class:'ux-divider'}),output);
  // Everything that floats above the dock (menus, the camera controls, the
  // welcome card, the detail sheet on phones) keys off its real height, which
  // changes with the window width and with what the dock currently shows.
  const measure=()=>doc.body.style.setProperty('--ux-dock-height',`${Math.round(dock.getBoundingClientRect().height)}px`);
  if(win.ResizeObserver)new win.ResizeObserver(measure).observe(dock);
  measure();
 }
 // A running scenario used to be stoppable only from inside the menu it was
 // started from; its stop control now stays visible in the dock itself.
 const syncScenarioState=()=>{
  const classes=doc.body.classList,active=classes.contains('in-light-flight')||classes.contains('in-solar-death')||classes.contains('in-black-hole-fall');
  if(stopChip)stopChip.hidden=!active;
  $('#ux-scenarios')?.classList.toggle('active',active);
 };
 const bodyObserver=new win.MutationObserver(syncScenarioState);
 bodyObserver.observe(doc.body,{attributes:true,attributeFilter:['class']});
 syncScenarioState();

 // ---- Map controls ------------------------------------------------------
 const map=el('nav',{class:'ux-map',id:'ux-map',aria:'map.label'},
  el('button',{type:'button',class:'ux-icon-button',id:'ux-zoom-in',aria:'map.zoomIn',title:'map.zoomIn',onclick:()=>actions.zoom?.(1)},icon(doc,'plus')),
  el('button',{type:'button',class:'ux-icon-button',id:'ux-zoom-out',aria:'map.zoomOut',title:'map.zoomOut',onclick:()=>actions.zoom?.(-1)},icon(doc,'minus')),
  el('button',{type:'button',class:'ux-icon-button',id:'ux-home',aria:'map.home',title:'map.home',onclick:()=>actions.home?.()},icon(doc,'home')));
 doc.body.append(map);

 // ---- Body panel ----------------------------------------------------------
 const panel=$('#panel');
 const numberInputs=root=>[...root.querySelectorAll('input[type="number"]')];
 function enhancePanel(){
  if(!panel||panel.hidden)return;
  const head=panel.querySelector('.panel-head');
  if(!head||head.dataset.ux)return;
  head.dataset.ux='1';
  panel.classList.toggle('ux-body-panel',!!panel.dataset.bodyId);
  const apply=panel.querySelector('#apply');
  if(!panel.dataset.bodyId||!apply)return;
  // Following a body and standing on it are what most people open this
  // panel for; editing its physics is the exception, so it no longer
  // carries the primary button.
  apply.classList.remove('primary');panel.querySelector('#focus')?.classList.add('primary');
  const fieldInputs=['mass','radius','spin','tilt'].map(id=>panel.querySelector('#'+id)).filter(Boolean);
  const rows=fieldInputs.map(input=>input.closest('.row')).filter(Boolean);
  const vectors=[...panel.querySelectorAll('.vector')];
  const titles=vectors.map(vector=>vector.previousElementSibling).filter(node=>node?.classList.contains('field-title'));
  if(!rows.length)return;
  const fields=el('div',{class:'ux-params-fields'});
  const params=el('details',{class:'ux-section ux-params',id:'ux-params'},el('summary',{},text('body.params'),icon(doc,'chevron','ux-icon ux-chevron')),fields);
  if(store.get('params-open')!=='0')params.open=true;
  params.addEventListener('toggle',()=>store.set('params-open',params.open?'1':'0'));
  // Quick facts (speed, reference body) and the Wikipedia section stay
  // above; the editable parameters come after them, before the advanced
  // options - main.js inserts the Wikipedia section before .reference-anchor,
  // so placing this after the anchor keeps it below that section too.
  const anchor=panel.querySelector('.reference-anchor'),advanced=panel.querySelector('.advanced-fields');
  if(anchor)anchor.after(params);else if(advanced)advanced.before(params);else panel.append(params);
  const ordered=[...rows,...titles,...vectors].sort((a,b)=>a.compareDocumentPosition(b)&4?-1:1);
  fields.append(...ordered);
  const inputs=numberInputs(fields);
  for(const input of inputs){input.dataset.uxLocked=input.readOnly?'1':'0';input.readOnly=true}
  let snapshot=null;
  const cancel=el('button',{type:'button',class:'ux-button',id:'ux-edit-cancel',text:'cancel'});
  const editButton=el('button',{type:'button',class:'ux-button',id:'ux-edit'},icon(doc,'edit'),text('body.edit'));
  const note=el('p',{class:'ux-edit-note',text:'body.editing'});
  apply.textContent='';apply.append(text('body.apply'));apply.classList.add('ux-button','accent');
  const editBar=el('div',{class:'ux-edit-bar'},editButton,note,cancel,apply);
  fields.after(editBar);
  const validation=panel.querySelector('#validation');if(validation)editBar.after(validation);
  const setEditing=editing=>{
   params.classList.toggle('editing',editing);
   for(const input of inputs)input.readOnly=editing?input.dataset.uxLocked==='1':true;
   if(editing){params.open=true;snapshot=inputs.map(input=>input.value);inputs.find(input=>!input.readOnly)?.focus({preventScroll:true});editBar.scrollIntoView?.({block:'nearest'})}
  };
  setEditing(false);
  editButton.addEventListener('click',()=>setEditing(true));
  cancel.addEventListener('click',()=>{if(snapshot)inputs.forEach((input,index)=>{input.value=snapshot[index]});setEditing(false)});
  // main.js's own handler runs first (it was attached first) and reports a
  // rejected value in #validation, in its Polish source text until i18n.js
  // translates it a microtask later - so a message starting like that one
  // means stay in edit mode; anything else means the change was applied.
  apply.addEventListener('click',()=>{if(!/^Sprawdź/.test(validation?.textContent||''))setEditing(false)});
  // Removing a body cannot be undone short of a reset, so it asks first.
  // main.js sets #remove's onclick in the same showBody() that built this
  // panel, so it is already there to be wrapped.
  const remove=panel.querySelector('#remove');
  if(remove&&typeof remove.onclick==='function'){
   const run=remove.onclick;
   remove.onclick=async event=>{
    const name=panel.querySelector('.panel-head h2')?.textContent||'';
    if(await confirmAction({title:'confirm.remove.title',body:'confirm.remove.body',ok:'confirm.remove.ok',values:{name}}))run.call(remove,event);
   };
  }
  refresh();
 }
 if(panel){
  new win.MutationObserver(enhancePanel).observe(panel,{childList:true,attributes:true,attributeFilter:['hidden']});

 }

 // ---- Welcome -----------------------------------------------------------
 let welcome=null;
 // Someone opening a shared link has come to see that exact view, so the
 // first-visit card does not cover it (and is still shown on a later visit).
 const sharedLink=/^#solare=/.test(String(globalThis.location?.hash||''));
 if(store.get('welcomed')!=='1'&&!sharedLink){
  const dismiss=()=>{store.set('welcomed','1');welcome?.remove();welcome=null};
  welcome=el('aside',{class:'ux-welcome',id:'ux-welcome','aria-labelledby':'ux-welcome-title'},
   el('h2',{id:'ux-welcome-title',text:'welcome.title'}),
   el('ul',{},el('li',{text:'welcome.drag'}),el('li',{text:'welcome.select'}),el('li',{text:'welcome.scenarios'})),
   el('div',{class:'ux-dialog-actions'},el('button',{type:'button',class:'ux-button',id:'ux-welcome-help',onclick:()=>{dismiss();openHelp()},text:'welcome.shortcuts'}),el('button',{type:'button',class:'ux-button accent',id:'ux-welcome-start',onclick:dismiss,text:'welcome.start'})));
  doc.body.append(welcome);
 }

 // ---- Keyboard ----------------------------------------------------------
 const onKey=event=>{
  // Escape belongs to whatever this layer has open first: closing a menu or
  // a dialog must not also stop a running light flight or close the panel
  // underneath, which is what main.js does with the same key.
  if(event.key==='Escape'){if(closeMenus()||doc.querySelector?.('dialog[open]'))event.stopImmediatePropagation();return}
  if(isEditableTarget(event.target))return;
  if(doc.querySelector?.('dialog[open]'))return;
  const action=uxShortcut(event);if(!action)return;
  event.preventDefault();event.stopImmediatePropagation();
  if(action==='search'){searchInput?.focus();searchInput?.select?.()}
  else if(action==='help')openHelp();
  else if(action==='zoom-in')actions.zoom?.(1);
  else if(action==='zoom-out')actions.zoom?.(-1);
  else if(action==='home')actions.home?.();
  else if(action==='reset')requestReset();
 };
 win.addEventListener('keydown',onKey,true);

 doc.addEventListener('languagechange',refresh);
 placeLanguage();enhancePanel();
 return {refresh,confirmAction,openHelp,closeMenus,requestReset,enhancePanel};
}
