export function guideAssetUrl(path: string,moduleUrl: string = import.meta.url): string {
    if (path !== 'assets/site_descriptions.json' && !/^assets\/sites\/[a-z0-9_-]+\.(?:jpe?g|png|webp)$/i.test(path)) {
        throw new Error('Invalid site guide asset path');
    }
    // Keep Windy's upload small. Pin photos to the immutable source release,
    // so later changes on main cannot change an already published guide.
    if (path.startsWith('assets/sites/') && new URL(moduleUrl).hostname === 'windy-plugins.com') {
        return new URL(path,'https://raw.githubusercontent.com/KamilYS2b7/fly-ireland/9c31a9a32f52f7876c3fd0ba5d9a282a8bcc85c2/assets/').href;
    }
    return new URL(path,moduleUrl).href;
}
