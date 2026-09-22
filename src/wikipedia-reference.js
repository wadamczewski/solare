// Wikipedia and photo lookups use the object's own proper name in the
// selected interface language, not a fixed English/IAU identifier. The
// scene's own translation table (src/locales/messages.js) already carries
// accurate pl/en/de/es proper names for every planet, moon and named
// deep-sky object - the same names shown in the interface itself - so this
// module reuses that table directly instead of keeping a second, English
// -only copy that could drift out of sync with it.
import {rows} from './locales/messages.js';
const LANGUAGES=['pl','en','de','es'];
const properNames=new Map(rows.map(row=>[row[0],row]));

// A handful of names collide with a translation meant for interface chrome
// rather than the object itself - "Własna czarna dziura" translates to the
// English UI label "Custom black hole", which no encyclopedia article is
// titled - so those are excluded from the reuse above and fall back to the
// generic identifier below instead.
const EXCLUDE_PROPER_NAME=new Set(['Własna czarna dziura']);

// Objects with no interface translation row, either because their name is
// already the same across languages (catalogue and scientific designators)
// or because only a couple of languages need a distinct search term. Each
// entry gives the identifier used for the REST lookup / URL (English is
// mandatory, since it is also the last-resort language) plus any language
// that needs its own proper name.
const FALLBACK_NAMES={
 'Kometa':{en:'Comet'},'1P/Halley':{en:"Halley's_Comet",de:'Halleyscher Komet',es:'Cometa Halley'},
 'Supermasywna czarna dziura':{en:'Supermassive_black_hole'},'Własna czarna dziura':{en:'Black_hole',de:'Schwarzes Loch',es:'Agujero negro'},
 'Sagittarius A*':{en:'Sagittarius_A*'},'M87*':{en:'M87*'},'Cygnus X-1':{en:'Cygnus_X-1'},'PSR J0740+6620':{en:'PSR_J0740+6620'},
 'Pulsar Kraba':{en:'Crab_Pulsar',de:'Krebspulsar',es:'Púlsar del Cangrejo'},'Pulsar Vela':{en:'Vela_Pulsar',de:'Vela-Pulsar',es:'Púlsar Vela'},
 'Magnetar SGR 1806−20':{en:'SGR_1806−20'},
 'Dimorphos':{en:'Dimorphos'},'99942 Apophis':{en:'99942_Apophis'},'101955 Bennu':{en:'101955_Bennu'},'1 Ceres':{en:'Ceres_(dwarf_planet)',de:'Ceres (Zwergplanet)',es:'Ceres (planeta enano)'},
 'Proxima Centauri b':{en:'Proxima_Centauri_b'},'TRAPPIST-1 e':{en:'TRAPPIST-1e'},'51 Pegasi b':{en:'51_Pegasi_b'},'55 Cancri e':{en:'55_Cancri_e'},
 'Sirius A':{en:'Sirius'},'Vega':{en:'Vega',de:'Wega'},'Betelgeuse':{en:'Betelgeuse'},'R136a1':{en:'R136a1'},'WOH G64':{en:'WOH_G64'},
 // Deep-sky objects whose scene label is either just its catalogue code
 // (no distinct proper name to look up) or, for the two Double Cluster
 // components, a label the interface table only translates in part.
 'M 6':{en:'Butterfly_Cluster'},'M 4':{en:'Messier_4'},'ω Cen':{en:'Omega_Centauri'},'47 Tuc':{en:'47_Tucanae'},
 'h Per':{en:'Double_Cluster',de:'Doppelsternhaufen',es:'Cúmulo Doble'},'χ Per':{en:'Double_Cluster',de:'Doppelsternhaufen',es:'Cúmulo Doble'},
 'Serpens Caput':{en:'Serpens'},'Serpens Cauda':{en:'Serpens'}
};

const fallbackArticle=subject=>String(subject?.id||subject?.name||subject?.label||'Astronomical object')
 .replace(/\s+→.*$/,'').trim().replaceAll(' ','_');

export function wikipediaTitle(subject={},language='en'){
 const explicit=subject.titles?.[language];
 if(explicit)return explicit;
 const name=String(subject.name||subject.label||'').replace(/\s+→.*$/,'').trim();
 if(!name)return FALLBACK_NAMES[subject.id]?.[language]||FALLBACK_NAMES[subject.id]?.en||fallbackArticle(subject);
 if(language==='pl')return name;
 const row=!EXCLUDE_PROPER_NAME.has(name)&&properNames.get(name);
 if(row)return row[LANGUAGES.indexOf(language)];
 const fallback=FALLBACK_NAMES[name]||FALLBACK_NAMES[subject.id];
 return fallback?.[language]||fallback?.en||fallbackArticle(subject);
}

// These two helpers keep the sky catalogue from relying on a loose text
// search. Several Latin constellation names also name locations or ordinary
// objects, and several deep-sky labels are shared with their constellation.
// Stable English article titles plus the interwiki relation above make the
// intended astronomical object unambiguous in all four interface languages.
export function wikipediaSubjectForConstellation(entry={}){
 const name=String(entry.name||'').replace(/\s+(Caput|Cauda)$/,'');
 return {titles:{en:name==='Serpens'?'Serpens':`${name.replaceAll(' ','_')}_(constellation)`},strict:true};
}

// The ordinary body-details path uses the same policy. A proper object has
// a canonical article; a user-created or collision fragment has no factual
// encyclopedia page to identify and retains the guarded name lookup below.
const BODY_ARTICLES={
 sun:'Sun',mercury:'Mercury_(planet)',venus:'Venus',earth:'Earth',mars:'Mars',jupiter:'Jupiter',saturn:'Saturn',uranus:'Uranus',neptune:'Neptune',
 'Księżyc':'Moon',Fobos:'Phobos_(moon)',Deimos:'Deimos_(moon)',Io:'Io_(moon)',Europa:'Europa_(moon)',Ganimedes:'Ganymede_(moon)',Kallisto:'Callisto_(moon)',Mimas:'Mimas_(moon)',Enceladus:'Enceladus_(moon)',Tetyda:'Tethys_(moon)',Dione:'Dione_(moon)',Rea:'Rhea_(moon)',Tytan:'Titan_(moon)',Japet:'Iapetus_(moon)',Hyperion:'Hyperion_(moon)',Miranda:'Miranda_(moon)',Ariel:'Ariel_(moon)',Umbriel:'Umbriel_(moon)',Tytania:'Titania_(moon)',Oberon:'Oberon_(moon)',Tryton:'Triton_(moon)',Proteusz:'Proteus_(moon)',Nereida:'Nereid_(moon)',
 comet:'Comet',halley:"Halley's_Comet",blackhole:'Supermassive_black_hole','custom-blackhole':'Black_hole',dimorphos:'Dimorphos',apophis:'99942_Apophis',bennu:'101955_Bennu','shoemaker-levy-9':'Comet_Shoemaker–Levy_9',chicxulub:'Chicxulub_impactor',vesta:'4_Vesta',ceres:'Ceres_(dwarf_planet)',theia:'Theia_(planet)',
 'sagittarius-a':'Sagittarius_A*',m87:'M87*','cygnus-x1':'Cygnus_X-1','psr-j0740':'PSR_J0740+6620','crab-pulsar':'Crab_Pulsar','vela-pulsar':'Vela_Pulsar','sgr-1806-20':'SGR_1806−20','proxima-centauri-b':'Proxima_Centauri_b','trappist-1-e':'TRAPPIST-1e','51-pegasi-b':'51_Pegasi_b','55-cancri-e':'55_Cancri_e',
 'sirius-a':'Sirius',vega:'Vega',betelgeuse:'Betelgeuse',r136a1:'R136a1','woh-g64':'WOH_G64'
};

export function wikipediaSubjectForBody(body={}){
 const key=body.presetId||body.starPresetId||(typeof body.id==='string'?body.id:(body.key==='moon'?body.name:body.key));
 const title=BODY_ARTICLES[key]||BODY_ARTICLES[body.name]||FALLBACK_NAMES[body.name]?.en||FALLBACK_NAMES[key]?.en;
 return title?{titles:{en:title},strict:true}:{name:body.name,id:key};
}

const DEEP_SKY_ARTICLES={
 LMC:'Large_Magellanic_Cloud','Mel 25':'Hyades_(star_cluster)','η Car':'Carina_Nebula',GalCtr:'Galactic_Center','M 45':'Pleiades','Mel 20':'Alpha_Persei_Cluster','Mel 111':'Coma_Star_Cluster','IC 2602':'IC_2602',SMC:'Small_Magellanic_Cloud','IC 2391':'IC_2391','NGC 6231':'NGC_6231','NGC 2451':'NGC_2451','NGC 3532':'NGC_3532','M 44':'Beehive_Cluster','M 7':'Ptolemy_Cluster','M 31':'Andromeda_Galaxy','Cr 140':'Collinder_140','Cr 399':'Coathanger_Cluster','h Per':'Double_Cluster','χ Per':'Double_Cluster','NGC 2516':'NGC_2516','NGC 2264':'NGC_2264','ω Cen':'Omega_Centauri','M 42':'Orion_Nebula','47 Tuc':'47_Tucanae','NGC 2362':'NGC_2362','M 6':'Butterfly_Cluster','M 47':'Messier_47','M 41':'Messier_41','NGC 2244':'NGC_2244','M 8':'Lagoon_Nebula','M 22':'Messier_22','M 35':'Messier_35','M 4':'Messier_4','M 33':'Triangulum_Galaxy','M 11':'Wild_Duck_Cluster','M 13':'Messier_13','M 16':'Eagle_Nebula','M 46':'Messier_46','M 3':'Messier_3','M 15':'Messier_15','M 81':"Bode's_Galaxy",'M 17':'Omega_Nebula','M 83':'Messier_83','M 101':'Pinwheel_Galaxy','M 110':'Messier_110','M 27':'Dumbbell_Nebula','M 51':'Whirlpool_Galaxy','M 32':'Messier_32','M 104':'Sombrero_Galaxy','M 1':'Crab_Nebula','M 82':'Cigar_Galaxy','M 20':'Trifid_Nebula','M 64':'Black_Eye_Galaxy','M 63':'Sunflower_Galaxy','M 87':'Messier_87','M 57':'Ring_Nebula','M 66':'Messier_66','M 65':'Messier_65','M 97':'Owl_Nebula'
};

export function wikipediaSubjectForDeepSky(object={}){
 const title=DEEP_SKY_ARTICLES[object.id];
 if(title)return {titles:{en:title},strict:true};
 // Kept only for newly added objects until they receive an explicit catalogue
 // identity above. The query carries its designation and type, never a bare
 // colloquial label.
 const type={s:'galaxy',sd:'galaxy',i:'galaxy',e:'galaxy',oc:'open cluster',gc:'globular cluster',sfr:'nebula',en:'nebula',pn:'planetary nebula',snr:'supernova remnant',pos:'astronomical object'}[object.type]||'astronomical object';
 return {name:object.label,id:object.id,searchQuery:`${object.id} ${type}`,searchFirst:true};
}

export function wikipediaSearchUrl(title,language='en'){
 const locale=['pl','en','de','es'].includes(language)?language:'en';
 return `https://${locale}.wikipedia.org/w/index.php?search=${encodeURIComponent(title.replaceAll('_',' '))}`;
}

const request=async(url,fetcher)=>{
 const response=await fetcher(url,{headers:{accept:'application/json'}});
 if(!response.ok)throw new Error(`Wikipedia ${response.status}`);
 return response.json();
};

async function resolveTitle(title,language,fetcher,{allowSearch=true,searchQuery='',searchFirst=false}={}){
 if(!searchFirst)try{return await request(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,fetcher)}catch{}
 if(!allowSearch)throw new Error('Wikipedia article unavailable');
 const query=searchQuery||title.replaceAll('_',' ');
 const search=await request(`https://${language}.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=${encodeURIComponent(query)}`,fetcher);
 const found=search?.query?.search?.[0]?.title;if(!found)throw new Error('Wikipedia article unavailable');
 return request(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(found)}`,fetcher);
}

const plainText=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();

// Article image lists also contain interface assets inherited from Wikimedia
// templates.  They are useful to the encyclopedia but never describe the
// selected astronomical object, so do not let a Commons/Wikipedia logo occupy
// one of the five deliberately scarce gallery positions.
const isGalleryArtwork=({title='',mime='',thumbnailUrl='',originalUrl=''})=>{
 const identity=`${title} ${thumbnailUrl} ${originalUrl}`.toLowerCase();
 return mime==='image/svg+xml'||/(?:commons|wikipedia|wikimedia|mediawiki)(?:[-_ ]?(?:logo|wordmark|button|icon))/.test(identity);
};

async function imageDetailsFor(title,language,fetcher){
 try{
  const data=await request(`https://${language}.wikipedia.org/w/api.php?action=query&generator=images&titles=${encodeURIComponent(title)}&prop=imageinfo&iiprop=url|extmetadata|mime&iiurlwidth=560&gimlimit=12&format=json&origin=*`,fetcher);
  return Object.values(data?.query?.pages||{}).map(page=>{
   const info=page.imageinfo?.[0],metadata=info?.extmetadata||{},thumbnailUrl=info?.thumburl||info?.url;
   if(!thumbnailUrl)return null;
   const image={
    title:page.title||'',mime:info?.mime||'',
    thumbnailUrl,
    originalUrl:info?.url||thumbnailUrl,
    sourceUrl:info?.descriptionurl||null,
    sourceDescription:plainText(metadata.ImageDescription?.value)||plainText(metadata.Credit?.value)||page.title||''
   };
   return isGalleryArtwork(image)?null:image;
  }).filter(Boolean);
 }catch{return []}
}

// This function deliberately returns at most five images. They are lazy
// loaded by the caller, so a compact detail card does not delay the 3D scene.
const referenceCache=new Map();
async function loadWikipediaReference(subject,language,fetcher){
 const preferred=['pl','en','de','es'].includes(language)?language:'en';
 const candidates=[],seen=new Set();
 const addCandidates=target=>{
  if(!target)return;
  for(const locale of [preferred,'en']){
   // A canonical English-only title has no trustworthy translated spelling
   // yet. Skip the synthetic “Astronomical object” placeholder and resolve
   // English first; the authoritative language-link bridge below can then
   // obtain the selected wiki’s real title.
   const hasLocalName=Boolean(target.name||target.label);
   const title=target.titles?.[locale]||((hasLocalName||locale==='en')?wikipediaTitle(target,locale):'');
   const key=`${locale}:${title}`;
   if(title&&!seen.has(key)){seen.add(key);candidates.push({title,locale,strict:!!target.strict,searchQuery:target.searchQueries?.[locale]||target.searchQuery||'',searchFirst:!!target.searchFirst})}
  }
  addCandidates(target.fallback);
 };
 addCandidates(subject);
 let title,page,usedLanguage;
 for(const candidate of candidates){
  try{page=await resolveTitle(candidate.title,candidate.locale,fetcher,{allowSearch:!candidate.strict,searchQuery:candidate.searchQuery,searchFirst:candidate.searchFirst});title=candidate.title;usedLanguage=candidate.locale;break}catch{}
 }
 if(!page)throw new Error('Wikipedia article unavailable');
 // Stable English identifiers are the source of truth for ambiguous surface
 // features and figures. If the selected Wikipedia has a linked translation,
 // follow that authoritative interwiki relation rather than searching a word
 // such as “pole”, “Mensa” or “Ariel” in isolation.
 if(usedLanguage==='en'&&preferred!=='en'&&subject.strict){
  try{
   const canonical=page.titles?.canonical||page.title||title;
   const links=await request(`https://en.wikipedia.org/w/api.php?action=query&prop=langlinks&lllang=${preferred}&titles=${encodeURIComponent(canonical)}&format=json&origin=*`,fetcher);
   const local=Object.values(links?.query?.pages||{})[0]?.langlinks?.[0]?.['*'];
   if(local){page=await resolveTitle(local,preferred,fetcher,{allowSearch:false});title=local;usedLanguage=preferred}
  }catch{}
 }
 const articleUrl=page.content_urls?.desktop?.page||wikipediaSearchUrl(title,usedLanguage);
 const gallery=await imageDetailsFor(page.titles?.canonical||page.title||title,usedLanguage,fetcher);
 const cover=page.thumbnail?.source?{
  title:page.title||title,
  thumbnailUrl:page.thumbnail.source,
  originalUrl:page.originalimage?.source||page.thumbnail.source,
  sourceUrl:articleUrl,
  sourceDescription:page.title||title
 }:null;
 const imageDetails=[cover,...gallery].filter(image=>image&&!isGalleryArtwork(image)).filter((image,index,list)=>list.findIndex(candidate=>candidate.thumbnailUrl===image.thumbnailUrl)===index).slice(0,5);
 // Keep the compact URL list for callers that only need thumbnails; the
 // companion records retain provenance for the full-screen viewer.
 return {title:page.title||title,description:page.extract||'',images:imageDetails.map(image=>image.thumbnailUrl),imageDetails,url:articleUrl,language:usedLanguage};
}

export function wikipediaReference(subject,language='en',fetcher=fetch){
 // A supplied fetcher is used by tests; browser lookups are cached per
 // article language and localized title so reopening a body, or switching
 // language, never asks the network twice for the same search.
 if(fetcher!==globalThis.fetch)return loadWikipediaReference(subject,language,fetcher);
 const key=`${language}:${JSON.stringify(subject)}`;
 if(!referenceCache.has(key))referenceCache.set(key,loadWikipediaReference(subject,language,fetcher).catch(error=>{referenceCache.delete(key);throw error}));
 return referenceCache.get(key);
}
