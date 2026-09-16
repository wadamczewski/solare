// Article titles are kept in English because they are stable identifiers for
// the Wikimedia search fallback. The lookup starts on the selected Wikipedia,
// so a Polish, German or Spanish page is used whenever that wiki has it.
const TITLES={
 'Słońce':'Sun','Merkury':'Mercury','Wenus':'Venus','Ziemia':'Earth','Mars':'Mars','Jowisz':'Jupiter','Saturn':'Saturn','Uran':'Uranus','Neptun':'Neptune',
 'Księżyc':'Moon','Fobos':'Phobos (moon)','Deimos':'Deimos (moon)','Io':'Io (moon)','Europa':'Europa (moon)','Ganimedes':'Ganymede (moon)','Kallisto':'Callisto (moon)',
 'Mimas':'Mimas (moon)','Enceladus':'Enceladus (moon)','Tetyda':'Tethys (moon)','Dione':'Dione (moon)','Rea':'Rhea (moon)','Tytan':'Titan (moon)','Japet':'Iapetus (moon)','Hyperion':'Hyperion (moon)',
 'Miranda':'Miranda (moon)','Ariel':'Ariel (moon)','Umbriel':'Umbriel (moon)','Tytania':'Titania (moon)','Oberon':'Oberon (moon)','Tryton':'Triton (moon)','Proteusz':'Proteus (moon)','Nereida':'Nereid (moon)',
 'Kometa':'Comet','1P/Halley':"Halley's_Comet",'Shoemaker-Levy 9 (fragment)':'Comet_Shoemaker–Levy_9','Supermasywna czarna dziura':'Supermassive_black_hole','Własna czarna dziura':'Black_hole',
 'Sagittarius A*':'Sagittarius_A*','M87*':'M87*','Cygnus X-1':'Cygnus_X-1','PSR J0740+6620':'PSR_J0740+6620','Pulsar Kraba':'Crab_Pulsar','Pulsar Vela':'Vela_Pulsar','Magnetar SGR 1806−20':'SGR_1806−20',
 'Dimorphos':'Dimorphos','99942 Apophis':'99942_Apophis','101955 Bennu':'101955_Bennu','Impaktor Chicxulub':'Chicxulub_impactor','4 Westa':'4_Vesta','1 Ceres':'Ceres_(dwarf_planet)','Theia (hipotetyczna)':'Theia_(planet)',
 'Proxima Centauri b':'Proxima_Centauri_b','TRAPPIST-1 e':'TRAPPIST-1e','51 Pegasi b':'51_Pegasi_b','55 Cancri e':'55_Cancri_e',
 'Sirius A':'Sirius','Vega':'Vega','Betelgeuse':'Betelgeuse','R136a1':'R136a1','WOH G64':'WOH_G64',
 'M 16':'Eagle_Nebula','M 45':'Pleiades','M 31':'Andromeda_Galaxy','M 42':'Orion_Nebula','M 44':'Beehive_Cluster','M 7':'Ptolemy_Cluster','M 8':'Lagoon_Nebula','M 4':'Messier_4','M 33':'Triangulum_Galaxy','M 6':'Butterfly_Cluster','LMC':'Large_Magellanic_Cloud','SMC':'Small_Magellanic_Cloud','η Car':'Carina_Nebula','GalCtr':'Galactic_Center','h Per':'Double_Cluster','χ Per':'Double_Cluster','ω Cen':'Omega_Centauri','47 Tuc':'47_Tucanae','Serpens Caput':'Serpens','Serpens Cauda':'Serpens',
 'M 1':'Crab_Nebula','M 11':'Wild_Duck_Cluster','M 17':'Omega_Nebula','M 20':'Trifid_Nebula','M 27':'Dumbbell_Nebula','M 51':'Whirlpool_Galaxy','M 57':'Ring_Nebula','M 63':'Sunflower_Galaxy','M 97':'Owl_Nebula','M 101':'Pinwheel_Galaxy','M 104':'Sombrero_Galaxy'
};

const fallbackArticle=subject=>String(subject?.id||subject?.name||subject?.label||'Astronomical object')
 .replace(/\s+→.*$/,'').trim().replaceAll(' ','_');

export function wikipediaTitle(subject={}){
 const name=String(subject.name||subject.label||'').replace(/\s+→.*$/,'').trim();
 return TITLES[name]||TITLES[subject.id]||fallbackArticle(subject);
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
 const title=wikipediaTitle(subject);
 let page,usedLanguage=preferred;
 try{page=await resolveTitle(title,preferred,fetcher)}catch{
  if(preferred==='en')throw new Error('Wikipedia article unavailable');
  usedLanguage='en';page=await resolveTitle(title,'en',fetcher);
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
 // A supplied fetcher is used by tests; browser lookups are cached per article
 // and language so reopening a body never asks the network twice.
 if(fetcher!==globalThis.fetch)return loadWikipediaReference(subject,language,fetcher);
 const key=`${language}:${wikipediaTitle(subject)}`;
 if(!referenceCache.has(key))referenceCache.set(key,loadWikipediaReference(subject,language,fetcher).catch(error=>{referenceCache.delete(key);throw error}));
 return referenceCache.get(key);
}
