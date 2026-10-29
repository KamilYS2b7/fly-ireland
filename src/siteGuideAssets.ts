export function guideAssetUrl(path: string,moduleUrl: string = import.meta.url): string {
    if (path !== 'assets/site_descriptions.json' && !/^assets\/sites\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path)) {
        throw new Error('Invalid site guide asset path');
    }
    return new URL(path,moduleUrl).href;
}
