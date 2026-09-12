import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';
import {catalog} from '../src/catalog.js';

test('every selectable exoplanet has a dedicated local simulation texture and reference source',()=>{
 const exoplanets=catalog.filter(body=>body.group==='Egzoplanety');
 assert.equal(exoplanets.length,4);
 assert.equal(new Set(exoplanets.map(body=>body.textureKey)).size,exoplanets.length);
 const sources=JSON.parse(readFileSync(new URL('../public/textures/exoplanets/sources.json',import.meta.url)));
 for(const body of exoplanets){
  assert.ok(existsSync(new URL(`../public/textures/exoplanets/${body.textureKey}.webp`,import.meta.url)),body.name);
  assert.match(body.visualSource,/^https:\/\//,body.name);
  assert.equal(sources[body.textureKey].reference,body.visualSource,body.name);
 }
});
