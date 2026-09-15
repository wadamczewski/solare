import test from 'node:test';
import assert from 'node:assert/strict';
import {wikipediaReference,wikipediaSearchUrl,wikipediaTitle} from '../src/wikipedia-reference.js';

test('known scene objects resolve to stable Wikipedia article titles',()=>{
 assert.equal(wikipediaTitle({name:'Księżyc'}),'Moon');
 assert.equal(wikipediaTitle({id:'M 16',label:'Mgławica Orzeł'}),'Eagle_Nebula');
 assert.equal(wikipediaTitle({id:'M 16',name:'Mgławica Orzeł'}),'Eagle_Nebula');
 assert.equal(wikipediaTitle({id:'Ser',name:'Serpens Cauda'}),'Serpens');
 assert.match(wikipediaSearchUrl('Eagle_Nebula','pl'),/^https:\/\/pl\.wikipedia\.org\//);
});

test('Wikipedia reference uses the selected wiki and deduplicates gallery images',async()=>{
 const seen=[];
 const fetcher=async url=>{seen.push(url);return {ok:true,json:async()=>url.includes('summary')?({title:'Eagle Nebula',titles:{canonical:'Eagle_Nebula'},extract:'A nebula.',thumbnail:{source:'one.jpg'},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Eagle_Nebula'}}}):({query:{pages:{one:{imageinfo:[{thumburl:'one.jpg'}]},two:{imageinfo:[{thumburl:'two.jpg'}]}}}})}};
 const reference=await wikipediaReference({id:'M 16'},'en',fetcher);
 assert.deepEqual(reference.images,['one.jpg','two.jpg']);
 assert.ok(seen.every(url=>url.includes('en.wikipedia.org')));
});

test('Wikipedia gallery is bounded to five lazy-loadable images',async()=>{
 const fetcher=async url=>({ok:true,json:async()=>url.includes('summary')?({title:'Moon',titles:{canonical:'Moon'},extract:'A moon.',thumbnail:{source:'cover.jpg'},content_urls:{desktop:{page:'https://en.wikipedia.org/wiki/Moon'}}}):({query:{pages:Object.fromEntries(['one','two','three','four','five'].map(name=>[name,{imageinfo:[{thumburl:`${name}.jpg`}]}]))}})});
 const reference=await wikipediaReference({name:'Księżyc'},'en',fetcher);
 assert.deepEqual(reference.images,['cover.jpg','one.jpg','two.jpg','three.jpg','four.jpg']);
});
