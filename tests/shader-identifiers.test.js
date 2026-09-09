import test from 'node:test';
import assert from 'node:assert/strict';
import {readdirSync, readFileSync} from 'node:fs';

// three compiles to GLSL ES 3.00 on WebGL2, where a longer list of words is
// reserved than most shader authors carry in their head. Using one as a local
// name does not warn: the fragment shader fails to compile, the program never
// links, and the mesh silently stops drawing. That is how a surviving Earth
// turned into a see-through outline after a comet impact - the crater shader
// declared `float patch`, and the whole planet material went with it.
//
// Words three itself rewrites for WebGL2 (`attribute`, `varying`, `texture2D`)
// are deliberately absent: those are the WebGL1 spelling and are translated.
const RESERVED = [
 'active', 'asm', 'atomic_uint', 'buffer', 'cast', 'class', 'coherent', 'common', 'enum',
 'extern', 'external', 'filter', 'fixed', 'goto', 'half', 'image', 'inline', 'input',
 'interface', 'long', 'namespace', 'noinline', 'noperspective', 'output', 'partition',
 'patch', 'precise', 'public', 'readonly', 'resource', 'restrict', 'sample', 'shared',
 'short', 'sizeof', 'static', 'subroutine', 'superp', 'template', 'this', 'typedef',
 'union', 'unsigned', 'using', 'volatile', 'writeonly'
];
const TYPE = '(?:float|int|uint|bool|void|vec[234]|ivec[234]|uvec[234]|bvec[234]|mat[234](?:x[234])?|sampler2D|samplerCube)';

test('no shader in the project declares a variable with a GLSL ES 3.00 reserved word', () => {
 const pattern = new RegExp(`\\b${TYPE}\\s+(${RESERVED.join('|')})\\b`, 'g');
 const offences = [];
 for (const file of readdirSync('src').filter(name => name.endsWith('.js'))) {
  const source = readFileSync(`src/${file}`, 'utf8');
  for (const match of source.matchAll(pattern)) {
   // Skip the sentence in the comment that explains this very rule.
   const line = source.slice(0, match.index).split('\n').length;
   offences.push(`${file}:${line} ${match[0]}`);
  }
 }
 assert.deepEqual(offences, [], `reserved word used as a shader variable:\n${offences.join('\n')}`);
});

test('the scan would actually catch the declaration that broke Earth', () => {
 // A guard test is worth nothing if its pattern never matches anything.
 const pattern = new RegExp(`\\b${TYPE}\\s+(${RESERVED.join('|')})\\b`);
 assert.ok(pattern.test('float patch=0.5+0.5*sin(x);'));
 assert.ok(pattern.test('vec3 sample = texture2D(map, uv).rgb;'));
 // Ordinary names, and reserved words appearing inside longer identifiers, pass.
 assert.ok(!pattern.test('float speckle=0.5;'));
 assert.ok(!pattern.test('float patchwork=1.0;'));
 assert.ok(!pattern.test('float heat=patchArea;'));
});
