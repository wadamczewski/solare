import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SURFACE_FEATURES,greatCircleDistanceKm,topographyHeightKm} from '../src/surface-topography.js';

test('surveyed landmark terrain is available only for Earth, Mars, and the Moon',()=>{
 assert.deepEqual(Object.keys(SURFACE_FEATURES).sort(),['earth','mars','moon']);
});

test('Everest retains its measured summit above the surrounding Earth terrain',()=>{
 const summit=topographyHeightKm('earth',6371,27.9881,86.9250);
 const foothills=topographyHeightKm('earth',6371,28.35,87.3);
 assert.ok(summit>8.7&&summit<8.9);
 assert.ok(foothills<summit*.15);
});

test('the Everest tile is a lossless numeric elevation raster, not a shaded image',()=>{
 const bytes=readFileSync(new URL('../public/textures/terrain/earth/everest-cop30-height.f32',import.meta.url));
 assert.equal(bytes.byteLength,512*512*4);
 const elevations=new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
 let highest=-Infinity;for(const elevation of elevations)highest=Math.max(highest,elevation);
 assert.ok(highest>8_700,'Copernicus crop must retain Everest-scale elevation');
});

test('Mars and Moon terrain tiles retain the measured MOLA and LOLA relief ranges',()=>{
 const readElevations=path=>{
  const bytes=readFileSync(new URL(path,import.meta.url));assert.equal(bytes.byteLength,512*512*4);
  return new Float32Array(bytes.buffer,bytes.byteOffset,bytes.byteLength/4);
 };
 const moon=readElevations('../public/textures/terrain/moon/tycho-lola-height.f32');
 const mars=readElevations('../public/textures/terrain/mars/olympus-mola-128ppd-height.f32');
 let moonLow=Infinity,marsHigh=-Infinity;
 for(const elevation of moon)moonLow=Math.min(moonLow,elevation);
 for(const elevation of mars)marsHigh=Math.max(marsHigh,elevation);
 assert.ok(moonLow<-6,'LOLA tile must preserve Tycho-scale depth');
 assert.ok(marsHigh>20,'MOLA tile must preserve Olympus Mons height');
});

test('Olympus Mons and Tycho have their characteristic relief signs',()=>{
 const olympus=topographyHeightKm('mars',3389.5,18.65,-133.8);
 const tychoFloor=topographyHeightKm('moon',1737.4,-43.31,-11.36);
 const tychoRim=topographyHeightKm('moon',1737.4,-43.31,-11.36+43/1737.4*180/Math.PI/Math.cos(-43.31*Math.PI/180));
 assert.ok(olympus>17,'Olympus must stand above its datum even with its caldera');
 assert.ok(tychoFloor<-4,'Tycho floor must sit below its datum');
 assert.ok(tychoRim>0,'Tycho needs a positive rim as well as a bowl');
});

test('great-circle distance wraps across the longitude seam',()=>{
 const across=greatCircleDistanceKm(6371,0,179.9,0,-179.9);
 assert.ok(across>20&&across<25);
});
