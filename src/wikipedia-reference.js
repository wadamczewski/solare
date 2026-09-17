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
 const name=String(subject.name||subject.label||'').replace(/\s+→.*$/,'').trim();
 if(!name)return FALLBACK_NAMES[subject.id]?.[language]||FALLBACK_NAMES[subject.id]?.en||fallbackArticle(subject);
 if(language==='pl')return name;
 const row=!EXCLUDE_PROPER_NAME.has(name)&&properNames.get(name);
 if(row)return row[LANGUAGES.indexOf(language)];
 const fallback=FALLBACK_NAMES[name]||FALLBACK_NAMES[subject.id];
 return fallback?.[language]||fallback?.en||fallbackArticle(subject);
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

async function resolveTitle(title,language,fetcher){
 try{return await request(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,fetcher)}catch{
  const search=await request(`https://${language}.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*&srlimit=1&srsearch=${encodeURIComponent(title.replaceAll('_',' '))}`,fetcher);
  const found=search?.query?.search?.[0]?.title;if(!found)throw new Error('Wikipedia article unavailable');
  return request(`https://${language}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(found)}`,fetcher);
 }
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
 let title=wikipediaTitle(subject,preferred),page,usedLanguage=preferred;
 try{page=await resolveTitle(title,preferred,fetcher)}catch{
  if(preferred==='en')throw new Error('Wikipedia article unavailable');
  usedLanguage='en';title=wikipediaTitle(subject,'en');page=await resolveTitle(title,'en',fetcher);
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
 const key=`${language}:${wikipediaTitle(subject,language)}`;
 if(!referenceCache.has(key))referenceCache.set(key,loadWikipediaReference(subject,language,fetcher).catch(error=>{referenceCache.delete(key);throw error}));
 return referenceCache.get(key);
}
