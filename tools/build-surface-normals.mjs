// Offline data preparation for the surface-view ground shading. Not part of
// `npm run build`.
//
// Derives a tangent-space normal map from each real elevation model already
// shipped under public/textures/surface/ (Mars MOLA, Moon LOLA), so ground
// lighting in the surface view responds to actual slope instead of Three's
// screen-space bump trick, which goes flat once a texel covers many screen
// pixels - exactly the situation standing on the ground puts it in (see
// src/surface-normal-detail.js for the gradient math and its tests).
//
// No new source imagery: this only reads files already in the repository
// and writes a derived sibling next to each one.
//
//   node tools/build-surface-normals.mjs
//
// jpeg-js (pure JS, MIT) is a devDependency used only by this offline tool;
// nothing in the shipped app decodes or encodes JPEG.
import {readFileSync, writeFileSync} from 'node:fs';
import {decode, encode} from 'jpeg-js';
import {heightFieldToNormals, equirectangularTexelSpan} from '../src/surface-normal-detail.js';

// Matches the ROCKY relief scale used for these two bodies in
// src/surface-detail.js, so the baked slope agrees with the mesh's own
// displacement - normalScale at runtime is then a pure art-direction knob,
// not a correction for a mismatched baseline.
const SOURCES = [
 {input: 'public/textures/surface/mars-mola-height.jpg', output: 'public/textures/surface/mars-mola-normal.jpg', relief: .0078},
 {input: 'public/textures/surface/moon-lola-height.jpg', output: 'public/textures/surface/moon-lola-normal.jpg', relief: .0072}
];

for (const {input, output, relief} of SOURCES) {
 const jpeg = decode(readFileSync(input), {useTArray: true});
 const {width, height, data} = jpeg; // RGBA, but the source is greyscale: R=G=B
 const field = new Uint8Array(width * height);
 for (let i = 0; i < width * height; i++) field[i] = data[i * 4];
 const {worldStepU, worldStepV} = equirectangularTexelSpan(width, height);
 const normals = heightFieldToNormals(field, width, height, {relief, worldStepU, worldStepV});
 const rgba = new Uint8Array(width * height * 4);
 for (let i = 0; i < width * height; i++) {
  rgba[i * 4] = normals[i * 3]; rgba[i * 4 + 1] = normals[i * 3 + 1]; rgba[i * 4 + 2] = normals[i * 3 + 2]; rgba[i * 4 + 3] = 255;
 }
 const {data: encoded} = encode({data: rgba, width, height}, 92);
 writeFileSync(output, encoded);
 console.log(`${output}: ${width}x${height}, from ${input} (relief ${relief})`);
}
