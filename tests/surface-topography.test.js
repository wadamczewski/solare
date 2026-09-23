import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SURFACE_FEATURES,focalTerrainProfile,greatCircleDistanceKm,localTerrainPoint,nearestSurfaceFeature,terrainActivationRadius,topographyHeightKm} from '../src/surface-topography.js';

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
 assert.equal(bytes.byteLength,1440*1800*4);
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

test('local terrain uses the same prime meridian and east direction as the surface frame',()=>{
 const prime=localTerrainPoint(0,0),east=localTerrainPoint(0,90),north=localTerrainPoint(90,0);
 assert.ok(prime[0]>.999&&Math.abs(prime[1])<1e-12&&Math.abs(prime[2])<1e-12);
 assert.ok(east[2]<-.999);
 assert.ok(north[1]>.999);
});


test('focal landmark meshes approach the native survey spacing without tessellating a whole globe',()=>{
 const earth=focalTerrainProfile('earth'),mars=focalTerrainProfile('mars'),moon=focalTerrainProfile('moon');
 assert.equal(earth.segments,1024);
 assert.equal(moon.segments,640);
 assert.ok(earth.span/earth.segments*111_000<80,'Everest sheet should resolve sub-80 m cells across its full panorama');
 assert.ok(mars.span/mars.segments*59_000<1_000,'Olympus sheet should resolve sub-kilometre cells across the full shield');
 assert.ok(moon.span/moon.segments*30_000<300,'Tycho sheet should resolve a few hundred metres across the full crater');
});


test('a rounded known-place coordinate resolves to the nearby surveyed landmark',()=>{
 const everest=nearestSurfaceFeature({key:'earth',radius:6371},28,87);
 const tycho=nearestSurfaceFeature({key:'moon',name:'Księżyc',radius:1737.4},-43,-11);
 assert.equal(everest?.id,'everest');
 assert.equal(tycho?.id,'tycho');
 assert.ok(everest.distanceKm<10);
});

test('surveyed terrain only activates near its own landmark',()=>{
 assert.equal(terrainActivationRadius({key:'earth'}),140);
 const grandCanyon=nearestSurfaceFeature({key:'earth',radius:6371},36,-112);
 assert.ok(grandCanyon.distanceKm>terrainActivationRadius({key:'earth'}));
});
