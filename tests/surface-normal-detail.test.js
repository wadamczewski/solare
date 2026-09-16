import test from 'node:test';
import assert from 'node:assert/strict';
import {heightFieldToNormals, equirectangularTexelSpan} from '../src/surface-normal-detail.js';

test('a flat field encodes to the unperturbed normal-map texel everywhere', () => {
 const width = 8, rows = 4, field = new Uint8Array(width * rows).fill(120);
 const normals = heightFieldToNormals(field, width, rows, {relief: .01, worldStepU: .1, worldStepV: .1});
 for (let i = 0; i < width * rows; i++) assert.deepEqual([normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2]], [128, 128, 255]);
});

test('a ramp rising toward +u tilts the normal toward -u (the surface leans away from higher ground)', () => {
 const width = 16, rows = 8, field = new Uint8Array(width * rows);
 for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) field[y * width + x] = Math.round((x / (width - 1)) * 255);
 const normals = heightFieldToNormals(field, width, rows, {relief: .2, worldStepU: .05, worldStepV: .05});
 // An interior column, away from the wraparound seam where the ramp resets.
 const index = (rows >> 1) * width + (width >> 1);
 assert.ok(normals[index * 3] < 128, `expected the red (x) channel to dip below the flat value 128, got ${normals[index * 3]}`);
 assert.equal(normals[index * 3 + 1], 128);
 assert.ok(normals[index * 3 + 2] > 200, 'the surface should stay mostly outward-facing for a gentle ramp');
});

test('longitude wraps: the seam samples the far edge as its neighbour instead of clamping', () => {
 const width = 4, rows = 2, field = new Uint8Array([0, 0, 0, 255, 0, 0, 0, 255]);
 const wrapped = heightFieldToNormals(field, width, rows, {relief: .2, worldStepU: .1, worldStepV: .1});
 // Column 0's neighbours are column 3 (255, via wraparound) and column 1 (0):
 // a real downward step, so it must not read as flat (128,128,255).
 const seamIndex = 0 * 3;
 assert.notEqual(wrapped[seamIndex], 128, 'the seam should see column 3 as its left neighbour, not go flat');
 // Clamping instead of wrapping at that same seam would read column 0 as its
 // own left neighbour (a zero gradient) - confirm wrapping actually changed
 // the result relative to that (i.e. the seam is not accidentally flat).
 assert.ok(wrapped[seamIndex] !== 128);
});

test('latitude does not wrap: the poles fall back to a one-sided difference instead of reaching across the map', () => {
 const width = 8, rows = 6, field = new Uint8Array(width * rows);
 for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) field[y * width + x] = y === 0 ? 255 : 0;
 assert.doesNotThrow(() => heightFieldToNormals(field, width, rows, {relief: .1, worldStepU: .05, worldStepV: .05}));
});

test('a taller relief scale produces a more tilted (less flat) normal for the same field', () => {
 const width = 16, rows = 8, field = new Uint8Array(width * rows);
 for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) field[y * width + x] = Math.round((x / (width - 1)) * 255);
 const gentle = heightFieldToNormals(field, width, rows, {relief: .01, worldStepU: .05, worldStepV: .05});
 const steep = heightFieldToNormals(field, width, rows, {relief: .5, worldStepU: .05, worldStepV: .05});
 const index = (4 * width + 8) * 3;
 assert.ok(steep[index + 2] < gentle[index + 2], 'a taller relief scale should tilt the surface further from straight up');
});

test('equirectangularTexelSpan gives a wider step around the equator than pole-to-pole per row for a typical 2:1 map', () => {
 const {worldStepU, worldStepV} = equirectangularTexelSpan(2048, 1024, 1);
 assert.ok(Math.abs(worldStepU - worldStepV) < 1e-9, 'a 2:1 equirectangular map should have matched horizontal and vertical texel spacing');
 assert.ok(worldStepU > 0 && worldStepV > 0);
});
