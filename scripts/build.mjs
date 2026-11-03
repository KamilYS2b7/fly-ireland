import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {rollup} from 'rollup';

process.chdir(fileURLToPath(new URL('..',import.meta.url)));
process.env.SERVE = 'false';
const {default:config} = await import('../rollup.config.js');
// Windy's transform reads output.file in its options hook, before bundle.write.
const bundle = await rollup(config);
try {
    await mkdir('dist',{recursive:true});
    for (const target of config.output) await bundle.write(target);
    await copyFile('package.json','dist/package.json');
    // Keep Windy's library preview in every build, including custom entry points.
    await copyFile('src/screenshot.png','dist/screenshot.png');
    console.log('Built Fly Ireland: dist/plugin.js, dist/plugin.min.js dist/plugin.json and dist/screenshot.png');
} finally {
    await bundle.close();
}
