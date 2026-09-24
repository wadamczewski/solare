import test from 'node:test';
import assert from 'node:assert/strict';
import {SURFACE_TILE_SHELL_SCALE,createSurfaceTileStream,surfaceAssetKey,surfaceTileAddress,surfaceTileWindow,surfaceTileset} from '../src/surface-tiles.js';

test('surface texture shell remains within a few metres of the globe', () => {
 assert.ok(SURFACE_TILE_SHELL_SCALE > 1);
 assert.ok(SURFACE_TILE_SHELL_SCALE < 1.00001);
});

test('surface tile addresses wrap longitude and clamp latitude', () => {
 assert.deepEqual(surfaceTileAddress('earth', 0, -180), {key:'earth',column:0,row:2,id:'earth/0-2'});
 assert.deepEqual(surfaceTileAddress('earth', 0, 180), {key:'earth',column:0,row:2,id:'earth/0-2'});
 assert.equal(surfaceTileAddress('moon', 91, 0).row, 0);
 assert.equal(surfaceTileAddress('moon', -91, 0).row, 1);
});

test('surface tile window crosses the dateline without duplicate tiles', () => {
 const tiles = surfaceTileWindow('earth', 0, 179);
 assert.equal(tiles.length, 9);
 assert.deepEqual(new Set(tiles.map(tile => tile.id)).size, 9);
 assert.ok(tiles.some(tile => tile.column === 0));
 assert.ok(tiles.some(tile => tile.column === 7));
});

test('only Earth, Moon and Mars have streamed surface tile sets', () => {
 assert.ok(surfaceTileset('earth'));
 assert.ok(surfaceTileset('moon'));
 assert.ok(surfaceTileset('mars'));
 assert.equal(surfaceTileset('jupiter'), null);
});

test('Earth does not draw the non-seamless preview tile shell in surface view', () => {
 assert.equal(createSurfaceTileStream({key:'earth',name:'Ziemia'}), null);
});

test('only Earth’s Moon inherits the moon tile source',()=>{
 assert.equal(surfaceAssetKey({key:'moon',name:'Księżyc'}),'moon');
 assert.equal(surfaceAssetKey({key:'moon',name:'Deimos'}),null);
 assert.equal(surfaceAssetKey({key:'moon',name:'Nereida'}),null);
 assert.equal(surfaceAssetKey({key:'moon',name:'Deimos',surface:'deimos-hires'}),'deimos-hires');
});
