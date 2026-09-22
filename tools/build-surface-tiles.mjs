import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import jpeg from 'jpeg-js';

const root = new URL('..', import.meta.url).pathname;
const entries = [
 {id:'earth', source:'public/textures/surface/earth-blue-marble-4k.jpg', columns:8, rows:4},
 {id:'moon', source:'public/textures/surface/moon-lroc-color.jpg', columns:4, rows:2},
 {id:'mars', source:'public/textures/surface/mars-color.jpg', columns:4, rows:2, convert:'public/textures/mars.webp'}
];

for (const entry of entries) {
 const source = path.join(root, entry.source);
 try { await fs.access(source); }
 catch {
  if (!entry.convert) throw new Error(`Missing source image: ${entry.source}`);
  execFileSync('sips', ['-s', 'format', 'jpeg', path.join(root, entry.convert), '--out', source], {stdio:'inherit'});
 }
 const image = jpeg.decode(await fs.readFile(source), {useTArray:true});
 const output = path.join(root, 'public/textures/surface/tiles', entry.id);
 await fs.mkdir(output, {recursive:true});
 const width = Math.floor(image.width / entry.columns), height = Math.floor(image.height / entry.rows);
 for (let row = 0; row < entry.rows; row++) for (let column = 0; column < entry.columns; column++) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
   const from = ((row * height + y) * image.width + column * width) * 4;
   pixels.set(image.data.subarray(from, from + width * 4), y * width * 4);
  }
  const tile = jpeg.encode({data:pixels, width, height}, 88).data;
  await fs.writeFile(path.join(output, `${column}-${row}.jpg`), tile);
 }
 console.log(`${entry.id}: ${entry.columns * entry.rows} tiles`);
}
