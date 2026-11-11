import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
test('map CSS stays inside plugin-owned roots and the native close host is not hidden',()=>{
 const source=readFileSync(new URL('../src/FlyIrelandApp.svelte',import.meta.url),'utf8');
 const selectors=[...source.matchAll(/:global\(([^\n]+)/g)];assert.ok(selectors.length>50);
 for(const m of source.matchAll(/:global\(/g))assert.ok(source.slice(m.index).startsWith(':global(.fly-ireland-scope '));
 assert.doesNotMatch(source,/#plugin-windy-plugin-fly-ireland\)\s*\{display:none/);
 const entry=readFileSync(new URL('../src/plugin.svelte',import.meta.url),'utf8');
 assert.match(entry,/export function onopen/);assert.match(entry,/export function onclose/);
 assert.match(entry,/session\.close\(\)/);assert.match(entry,/app\.\$destroy\(\)/);
});
