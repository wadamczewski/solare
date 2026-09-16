import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

test('body details expose surface view only for supported observer bodies', async () => {
 const source = await readFile(new URL('../src/main.js', import.meta.url), 'utf8');
 assert.match(source, /surfaceCandidates\(\)\.some\(candidate=>candidate\.id===b\.id\)/);
 assert.match(source, /id="surface-open">Widok z powierzchni<\/button>/);
 assert.match(source, /surfaceOpen\.onclick=\(\)=>startSurfaceView\(b\.id\)/);
});
