import {pointModelSupported} from './forecastModels.ts';

type Dependencies = {
    store: {get(key: any): any; on(key: any, callback: () => void): any; off(key: any, callback: () => void): any};
    broadcast: {on(key: any, callback: (plugin: string) => void): any; off(key: any, callback: (plugin: string) => void): any};
    modelName(model: string): string | undefined;
    modelFromName(name: string): string | undefined;
    onNativeModel?(model: string): void;
    keepSelection?(selected: string, mapModel: string): boolean;
    onUnavailable?(model?: string): void;
};
const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
const buttonName = (button: HTMLElement) => normalize([...button.childNodes]
    .filter(node => node.nodeType === 3).map(node => node.textContent ?? '').join(''));

// Windy 51 keeps the detail Source in a separate store and ignores product on
// subsequent rqstOpen calls. Use its own Source controls; never import private
// Svelte stores or change the user's saved forecast defaults.
export function createDetailModelSync({store, broadcast, modelName, modelFromName, onNativeModel, keepSelection, onUnavailable}: Dependencies) {
    let pending: string | undefined;
    let opening = false, disposed = false, queued = false, applying = false, triedBasic = false, choseModel = false;
    let watchedRoot: HTMLElement | undefined, observer: MutationObserver | undefined;
    let openedSource: HTMLElement | undefined;
    let lastNativeModel: string | undefined;
    const detailRoot = () => document.getElementById('plugin-detail');
    const modelButtons = (root: HTMLElement) => [...root.querySelectorAll<HTMLElement>('.switch__item:not([data-icon])')];
    const selectedName = (root: HTMLElement) => {
        const source = root.querySelector('.ddmenu');
        if (source) return source.textContent?.split(':').slice(1).join(':').trim() ?? '';
        // Mobile has a model switch rather than the desktop Source dropdown.
        const selected = modelButtons(root).find(button => button.classList.contains('selected'));
        return selected ? buttonName(selected) : '';
    };
    const nativeModel = () => {
        const root = detailRoot();
        if (!root?.classList.contains('open')) return;
        const name = selectedName(root);
        const model = name ? modelFromName(name) : undefined;
        if (model) lastNativeModel = model;
        return model;
    };
    function nativeChoice(event: Event) {
        if (applying) return; // The sidebar has already selected this model.
        const choice = (event.target as Element | null)?.closest?.<HTMLElement>('#plugin-detail .switch__item:not([data-icon])');
        if (!choice || choice.classList.contains('disabled')) return;
        const model = modelFromName(buttonName(choice));
        if (model) onNativeModel?.(model);
    }
    const act = (action: () => void) => {
        applying = true;
        try { action(); } finally { applying = false; }
    };
    function stopWatching() {
        observer?.disconnect(); observer = undefined;
        watchedRoot?.removeEventListener('click', nativeInteraction, true);
        watchedRoot = undefined;
    }
    function clear(restoreMenu = true) {
        pending = undefined; opening = false; triedBasic = false; choseModel = false;
        stopWatching();
        const source = openedSource; openedSource = undefined;
        if (restoreMenu && source?.isConnected && source.classList.contains('opened')) act(() => source.click());
    }
    function nativeInteraction(event: Event) {
        const target = event.target as Element | null;
        if (!applying && target?.closest?.('.switch__item,.ddmenu')) clear(false);
    }
    function watch(root: HTMLElement) {
        if (watchedRoot === root) return;
        stopWatching(); watchedRoot = root;
        root.addEventListener('click', nativeInteraction, true);
        observer = new MutationObserver(schedule);
        observer.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class']});
    }
    function basic(root: HTMLElement) {
        const button = root.querySelector<HTMLElement>('.switch__item[data-icon="&"]');
        if (triedBasic || !button) return false;
        triedBasic = true;
        act(() => button.click()); schedule();
        return true;
    }
    function unavailable() {
        const model = pending;
        clear(); onUnavailable?.(model);
    }
    function synchronize() {
        queued = false;
        if (disposed || !pending) return;
        const root = detailRoot();
        if (!root) return; // pluginOpened retries once the native module mounts.
        if (!root.classList.contains('open')) {
            if (opening) watch(root);
            return;
        }
        watch(root);
        const source = root.querySelector<HTMLElement>('.ddmenu');
        const name = modelName(pending);
        if (!name) { unavailable(); return; }
        const selected = selectedName(root);
        if (normalize(selected) === normalize(name)) { lastNativeModel = pending; clear(); return; }
        if (source?.classList.contains('disabled')) {
            if (!basic(root)) unavailable();
            return;
        }
        // Text nodes contain the native product name; child spans contain its
        // resolution. Exact names keep ICON/ICON-EU and AROME variants distinct.
        const buttons = modelButtons(root);
        const choice = buttons.find(button => buttonName(button) === normalize(name));
        if (choice) {
            if (choice.classList.contains('disabled')) {
                if (!basic(root)) unavailable();
            } else if (choseModel) {
                // A changed native UI must not turn a no-op click into an
                // endless microtask loop that freezes Windy's timeline.
                unavailable();
            } else {
                choseModel = true;
                act(() => choice.click()); schedule();
            }
        } else if (source && !source.classList.contains('opened')) {
            openedSource = source;
            act(() => source.click()); schedule();
        } else if (buttons.length) unavailable();
        // The native Svelte render may still be mounting the choices. Its DOM
        // changes wake this request; there is no polling timer or idle observer.
    }
    function schedule() {
        if (!disposed && pending && !queued) {
            queued = true;
            queueMicrotask(synchronize);
        }
    }
    function onOpen(plugin: string) {
        if (plugin === 'detail' && pending) { opening = true; schedule(); }
    }
    function onClose(plugin: string) {
        if (plugin !== 'detail') return;
        const root = detailRoot(), name = root ? selectedName(root) : '';
        if (name) lastNativeModel = modelFromName(name) ?? lastNativeModel;
        opening = false; stopWatching(); openedSource = undefined;
    }
    function onProduct() {
        // A newer map choice while the detail is closed supersedes a queued
        // sidebar choice. During opening the stale native Source must not win.
        if (!pending || opening || detailRoot()?.classList.contains('open')) return;
        const model = store.get('product');
        if (keepSelection?.(pending, model)) return;
        // A closing detail can finish its old asynchronous map update after a
        // newer sidebar choice. Keep that queued choice for the next opening.
        if (model === lastNativeModel && model !== pending) return;
        if (pointModelSupported(model)) pending = model;
        else clear();
    }
    broadcast.on('rqstOpen', onOpen);
    broadcast.on('pluginOpened', onOpen);
    broadcast.on('pluginClosed', onClose);
    store.on('product', onProduct);
    // One click listener, no idle DOM observer. It also handles point-only
    // Source changes that leave the map product unchanged (e.g. mblue -> ECMWF).
    document.addEventListener('click', nativeChoice, true);
    return {
        getNativeModel: nativeModel,
        getRequestedModel: () => pending,
        select(model: string) {
            if (disposed || !pointModelSupported(model)) return;
            clear(); pending = model; onUnavailable?.();
            const root = detailRoot();
            opening = !!root?.classList.contains('open');
            if (opening && root) watch(root);
            schedule();
        },
        destroy() {
            disposed = true; clear();
            broadcast.off('rqstOpen', onOpen);
            broadcast.off('pluginOpened', onOpen);
            broadcast.off('pluginClosed', onClose);
            store.off('product', onProduct);
            document.removeEventListener('click', nativeChoice, true);
        },
    };
}
