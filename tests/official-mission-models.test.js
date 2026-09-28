import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {OFFICIAL_MODEL_SOURCES} from '../src/official-mission-models.js';

const publicRoot=new URL('../public/',import.meta.url);

test('official NASA mission models are shipped as valid-sized GLB assets',()=>{
 const expected=['apollo','iss','opportunity','perseverance','viking','voyager'];
 assert.deepEqual(Object.keys(OFFICIAL_MODEL_SOURCES).sort(),expected);
 for(const key of expected){
  const {url,source}=OFFICIAL_MODEL_SOURCES[key];
  assert.match(url,/^\/models\/missions\/.+\.glb$/,`${key} must use a local GLB`);
  const path=fileURLToPath(new URL(url.slice(1),publicRoot));
  assert.ok(existsSync(path),`${key} model is missing: ${url}`);
  assert.ok(statSync(path).size>1024,`${key} model is unexpectedly small`);
  assert.equal(readFileSync(path,{encoding:null}).subarray(0,4).toString(),'glTF',`${key} is not a binary glTF file`);
  assert.match(source,/NASA 3D Resources/);
 }
});
