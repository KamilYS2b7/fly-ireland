export const LARGE_ROSES_STORAGE_KEY = 'fly-ireland.large-roses-visible.v1';
export const SITE_ROSE_VISIBILITY_STORAGE_KEY = 'fly-ireland.site-rose-visibility.v1';
type DisplayStorage = Pick<Storage,'getItem'|'setItem'>;

export function readLargeRosesVisible(storage?: Pick<DisplayStorage,'getItem'>): boolean {
    try {return (storage ?? globalThis.localStorage)?.getItem(LARGE_ROSES_STORAGE_KEY) !== 'false';}
    catch {return true;}
}

export function saveLargeRosesVisible(visible: boolean,storage?: Pick<DisplayStorage,'setItem'>) {
    try {(storage ?? globalThis.localStorage)?.setItem(LARGE_ROSES_STORAGE_KEY,visible ? 'true' : 'false');}
    catch { /* Changing visibility must work even when browser storage is blocked. */ }
}

export function normalizeSiteRoseVisibility(value: unknown): Record<string,boolean> {
    if(!value||typeof value!=='object'||Array.isArray(value))return {};
    return Object.fromEntries(Object.entries(value).filter(([id,visible])=>
        id.length>0&&id.length<=256&&!['__proto__','constructor','prototype'].includes(id)&&typeof visible==='boolean'));
}

export function readSiteRoseVisibility(storage?: Pick<DisplayStorage,'getItem'>): Record<string,boolean> {
    try {return normalizeSiteRoseVisibility(JSON.parse((storage??globalThis.localStorage)?.getItem(SITE_ROSE_VISIBILITY_STORAGE_KEY)??'{}'));}
    catch {return {};}
}

export function saveSiteRoseVisibility(value: Record<string,boolean>,storage?: Pick<DisplayStorage,'setItem'>) {
    try {(storage??globalThis.localStorage)?.setItem(SITE_ROSE_VISIBILITY_STORAGE_KEY,JSON.stringify(normalizeSiteRoseVisibility(value)));}
    catch { /* Per-site controls remain usable when storage is blocked. */ }
}
