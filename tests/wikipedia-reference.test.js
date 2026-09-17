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
