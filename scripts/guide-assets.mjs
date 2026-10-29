import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {join} from 'node:path';

export async function copyGuideAssets(source,destination) {
    const descriptions=join(source,'site_descriptions.json');
    const data=JSON.parse(await readFile(descriptions,'utf8'));
    const photos=[...new Set(Object.values(data).flatMap(guide=>guide.images??[]))];
    if(photos.some(path=>typeof path!=='string'||!/^assets\/sites\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path)))throw new Error('Invalid site guide photo path');
    await mkdir(join(destination,'sites'),{recursive:true});
    await copyFile(descriptions,join(destination,'site_descriptions.json'));
    const sources=[descriptions];
    for(const photo of photos){
        const relative=photo.slice('assets/'.length);
        await copyFile(join(source,relative),join(destination,relative));
        sources.push(join(source,relative));
    }
    return sources;
}
