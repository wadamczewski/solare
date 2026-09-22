import test from 'node:test';
import assert from 'node:assert/strict';
import {wikipediaReference,wikipediaSearchUrl,wikipediaTitle} from '../src/wikipedia-reference.js';

test('known scene objects resolve to stable Wikipedia article titles',()=>{
 assert.equal(wikipediaTitle({name:'Księżyc'}),'Moon');
 assert.equal(wikipediaTitle({id:'M 16',label:'Mgławica Orzeł'}),'Eagle Nebula');
 assert.equal(wikipediaTitle({id:'M 16',name:'Mgławica Orzeł'}),'Eagle Nebula');
 assert.equal(wikipediaTitle({id:'Ser',name:'Serpens Cauda'}),'Serpens');
 assert.match(wikipediaSearchUrl('Eagle_Nebula','pl'),/^https:\/\/pl\.wikipedia\.org\//);
});
test('the search criterion is the proper name in the selected language, not a fixed IAU/English identifier',()=>{
 // Every language, including Polish itself, gets the name actually shown in
 // the interface for that language - not the English catalogue identifier
 // kept only as a last-resort fallback.
 assert.equal(wikipediaTitle({name:'Merkury'},'pl'),'Merkury');
 assert.equal(wikipediaTitle({name:'Merkury'},'en'),'Mercury');
 assert.equal(wikipediaTitle({name:'Merkury'},'de'),'Merkur');
 assert.equal(wikipediaTitle({name:'Merkury'},'es'),'Mercurio');
 assert.equal(wikipediaTitle({id:'M 31',label:'Galaktyka Andromedy'},'pl'),'Galaktyka Andromedy');
 assert.equal(wikipediaTitle({id:'M 31',label:'Galaktyka Andromedy'},'de'),'Andromedagalaxie');
 assert.equal(wikipediaTitle({id:'M 31',label:'Galaktyka Andromedy'},'es'),'Galaxia de Andrómeda');
 // A body created in star-system mode keeps its Polish name internally
 // regardless of interface language, exactly like every other body - the
 // lookup still has to localize it rather than only matching the fixed
 // English identifier a naive keying-by-name would require.
 assert.equal(wikipediaTitle({name:'Syriusz A'},'de'),'Sirius A');
 assert.equal(wikipediaTitle({name:'Syriusz B'},'es'),'Sirio B');
});
test('a name whose translation is interface chrome, not an encyclopedia subject, keeps the generic fallback',()=>{
 assert.equal(wikipediaTitle({name:'Własna czarna dziura'},'en'),'Black_hole');
 assert.equal(wikipediaTitle({name:'Własna czarna dziura'},'de'),'Schwarzes Loch');
});
test('an object with no localized proper name still gets a workable, language-appropriate search term',()=>{
 assert.equal(wikipediaTitle({name:'Pulsar Kraba'},'de'),'Krebspulsar');
 assert.equal(wikipediaTitle({id:'M 6',label:'M 6'},'en'),'Butterfly_Cluster');
 assert.equal(wikipediaTitle({name:'Sagittarius A*'},'de'),'Sagittarius_A*');
});

test('Wikipedia reference uses the selected wiki and deduplicates gallery images',async()=>{
 const seen=[];
 const fetcher=async url=>{seen.push(url);return {ok:true,json:async()=>url.includes('summary')?({title:'Eagle Nebula',titles:{canonical:'Eagle_Nebula'},extract:'A nebula.',thumbnail:{source:'one.jpg'},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Eagle_Nebula'}}}):({query:{pages:{one:{imageinfo:[{thumburl:'one.jpg'}]},two:{imageinfo:[{thumburl:'two.jpg'}]}}}})}};
 const reference=await wikipediaReference({id:'M 16',name:'Mgławica Orzeł'},'en',fetcher);
 assert.deepEqual(reference.images,['one.jpg','two.jpg']);
 assert.deepEqual(reference.imageDetails.map(image=>image.originalUrl),['one.jpg','two.jpg']);
 assert.ok(seen.every(url=>url.includes('en.wikipedia.org')));
});

test('a non-English lookup searches with the localized proper name, not the English identifier',async()=>{
 const seen=[];
 const fetcher=async url=>{seen.push(url);return {ok:true,json:async()=>url.includes('summary')?({title:'Merkur',titles:{canonical:'Merkur'},extract:'Ein Planet.',thumbnail:{source:'merkur.jpg'},content_urls:{desktop:{page:'https://de.wikipedia.org/wiki/Merkur'}}}):({query:{pages:{}}})}};
 const reference=await wikipediaReference({name:'Merkury'},'de',fetcher);
 assert.equal(reference.language,'de');
 assert.ok(seen[0].includes('de.wikipedia.org'));
 assert.ok(seen[0].includes(encodeURIComponent('Merkur')),seen[0]);
 assert.ok(!seen[0].includes('Mercury'));
});

test('Wikipedia gallery is bounded to five lazy-loadable images',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>url.includes('summary')?({title:'Moon',titles:{canonical:'Moon'},extract:'A moon.',thumbnail:{source:'cover.jpg'},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Moon'}}}):({query:{pages:Object.fromEntries(['one','two','three','four','five'].map(name=>[name,{imageinfo:[{thumburl:`${name}.jpg`}]}]))}})});
 const reference=await wikipediaReference({name:'Księżyc'},'en',fetcher);
 assert.deepEqual(reference.images,['cover.jpg','one.jpg','two.jpg','three.jpg','four.jpg']);
});

test('Wikipedia gallery rejects Wikimedia interface artwork without reducing the photo limit',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>{
  if(url.includes('summary'))return {title:'Moon',titles:{canonical:'Moon'},extract:'A moon.',thumbnail:{source:'https://upload.wikimedia.org/commons-logo.svg'},originalimage:{source:'https://upload.wikimedia.org/commons-logo.svg'},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Moon'}}};
  return {query:{pages:{
   logo:{title:'File:Commons-logo.svg',imageinfo:[{thumburl:'commons-thumb.svg',url:'https://upload.wikimedia.org/commons-logo.svg',mime:'image/svg+xml'}]},
   photo:{title:'File:Moon Apollo 11.jpg',imageinfo:[{thumburl:'moon-thumb.jpg',url:'moon-full.jpg',mime:'image/jpeg'}]},
   diagram:{title:'File:Moon phases.svg',imageinfo:[{thumburl:'phases.svg',url:'phases.svg',mime:'image/svg+xml'}]}
  }}};
 }});
 const reference=await wikipediaReference({name:'Księżyc'},'en',fetcher);
 assert.deepEqual(reference.images,['moon-thumb.jpg']);
 assert.deepEqual(reference.imageDetails.map(image=>image.originalUrl),['moon-full.jpg']);
});

test('a strict feature subject falls back to its host instead of searching an ambiguous terrestrial name',async()=>{
 const seen=[];
 const feature={titles:{en:'North_Pole'},strict:true,fallback:{titles:{en:'Uranus'},strict:true}};
 const fetcher=async url=>{
  seen.push(url);
  if(url.includes('North_Pole'))return {ok:false,status:404,json:async()=>({})};
  if(url.includes('Uranus'))return {ok:true,json:async()=>({title:'Uranus',titles:{canonical:'Uranus'},extract:'The seventh planet.',content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Uranus'}}})};
  return {ok:true,json:async()=>({query:{pages:{}}})};
 };
 const reference=await wikipediaReference(feature,'en',fetcher);
 assert.equal(reference.title,'Uranus');
 assert.ok(!seen.some(url=>url.includes('list=search')),'strict references must never guess through search');
});

test('every constellation and deep-sky entry uses an explicit astronomical Wikipedia identity',async()=>{
 const {constellationFigures}=await import('../src/sky.js');
 const {readFile}=await import('node:fs/promises');
 const deepSky=JSON.parse(await readFile(new URL('../public/sky/deepsky.json',import.meta.url),'utf8'));
 const {wikipediaSubjectForConstellation,wikipediaSubjectForDeepSky}=await import('../src/wikipedia-reference.js');
 for(const [,name] of constellationFigures){
  const subject=wikipediaSubjectForConstellation({name});
  assert.equal(subject.strict,true,`constellation ${name}`);
  assert.match(subject.titles.en,/Serpens|_\(constellation\)$/,`constellation ${name}`);
 }
 assert.equal(deepSky.length,60,'the audited deep-sky catalogue changed; add an explicit article identity before release');
 for(const object of deepSky){
  const subject=wikipediaSubjectForDeepSky(object);
  assert.equal(subject.strict,true,`deep-sky ${object.id}`);
  assert.ok(subject.titles?.en,`deep-sky ${object.id}`);
 }
});

test('an English canonical subject follows Wikipedia’s authoritative language link',async()=>{
 const calls=[];
 const fetcher=async url=>{
  calls.push(url);
  if(url.includes('page/summary/Earth'))return {ok:true,json:async()=>({title:'Earth',titles:{canonical:'Earth'},extract:'English.',content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Earth'}}})};
  if(url.includes('prop=langlinks'))return {ok:true,json:async()=>({query:{pages:{one:{langlinks:[{'*':'Ziemia'}]}}}})};
  if(url.includes('page/summary/Ziemia'))return {ok:true,json:async()=>({title:'Ziemia',titles:{canonical:'Ziemia'},extract:'Polski.',content_urls:{desktop:{page:'https://pl.wikipedia.org/wiki/Ziemia'}}})};
  return {ok:true,json:async()=>({query:{pages:{}}})};
 };
 const reference=await wikipediaReference({titles:{en:'Earth'},strict:true},'pl',fetcher);
 assert.equal(reference.title,'Ziemia');
 assert.equal(reference.language,'pl');
 assert.match(reference.url,/pl\.wikipedia\.org\/wiki\/Ziemia/);
 assert.ok(calls.some(url=>url.includes('prop=langlinks')));
});

test('all predefined bodies use explicit celestial articles, never an ambiguous bare name',async()=>{
 const [{catalog},{planets,moons},{centralStars},{wikipediaSubjectForBody}]=await Promise.all([
  import('../src/catalog.js'),import('../src/physics.js'),import('../src/central-stars.js'),import('../src/wikipedia-reference.js')
 ]);
 const bodies=[
  ...catalog,
  ...planets.map(([name,key])=>({name,key})),
  ...moons.map(([name])=>({name,key:'moon'})),
  ...centralStars.map(star=>({name:star.name,key:'sun',starPresetId:star.id}))
 ];
 for(const body of bodies){
  const subject=wikipediaSubjectForBody(body);
  assert.equal(subject.strict,true,`${body.name} needs an explicit article`);
  assert.ok(subject.titles?.en,`${body.name} needs an English canonical article`);
 }
});
