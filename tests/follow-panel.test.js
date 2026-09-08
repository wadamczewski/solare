import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('the Follow action keeps its selected body detail panel visible',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/document\.querySelector\('#focus'\)\.onclick=\(\)=>focusBody\(b\.id,\{keepPanel:true\}\)/);
 assert.match(source,/function focusBody\(id,\{keepPanel=false\}=\{\}\)[\s\S]*?if\(!keepPanel\)panel\.hidden=true/);
});
