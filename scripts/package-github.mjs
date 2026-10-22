import {cp, mkdir, readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';

const root = fileURLToPath(new URL('..',import.meta.url));
const destination = join(root,'release','Fly Ireland');
const files = ['package.json','package-lock.json','README.md','LICENSE','THIRD_PARTY_NOTICES.md',
    '.gitignore','.gitattributes','.nvmrc','.eslintrc.cjs','.prettierrc','rollup.config.js',
    'svelte.config.js','tsconfig.json','tsconfig.eslint.json'];
await mkdir(destination,{recursive:true});
for (const file of files) await cp(join(root,file),join(destination,file));
for (const directory of ['src','tests','reports','declarations','scripts','.github']) {
    await cp(join(root,directory),join(destination,directory),{recursive:true});
}
await mkdir(join(destination,'docs'),{recursive:true});
for (const file of await readdir(join(root,'docs'),{withFileTypes:true})) {
    if (file.name !== 'superpowers') await cp(join(root,'docs',file.name),join(destination,'docs',file.name),{recursive:true});
}
console.log(`GitHub source project ready: ${destination}`);
