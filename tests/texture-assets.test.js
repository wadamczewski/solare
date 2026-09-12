import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

const root=new URL('../public/',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const isJpeg=buffer=>buffer[0]===0xff&&buffer[1]===0xd8&&buffer.at(-2)===0xff&&buffer.at(-1)===0xd9;
const isWebP=buffer=>buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';

test('all map assets used by the main scene are present and have a decodable container header',()=>{
 const jpegMaps=['mercury','uranus'];
 for(const name of jpegMaps){const path=`textures/${name}.jpg`;assert.ok(existsSync(new URL(path,root)),path);assert.ok(isJpeg(read(path)),`${path} is not a JPEG`)}
 const webpMaps=['venus','earth','mars','jupiter','saturn','neptune'];
 for(const name of webpMaps){const path=`textures/${name}.webp`;assert.ok(existsSync(new URL(path,root)),path);assert.ok(isWebP(read(path)),`${path} is not a WebP`)}
 assert.ok(isWebP(read('sky/milkyway.webp')),'the Milky Way luminance map is not a WebP');
 const exoplanetMaps=['proxima-centauri-b','trappist-1-e','51-pegasi-b','55-cancri-e'];
 for(const name of exoplanetMaps){const path=`textures/exoplanets/${name}.webp`;assert.ok(existsSync(new URL(path,root)),path);assert.ok(isWebP(read(path)),`${path} is not a WebP`)}
 assert.equal(existsSync(new URL('textures/sun.jpg',root)),false,'the solar photosphere is generated in the shader');
});
