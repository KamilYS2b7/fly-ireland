// Refresh metadata, not site forecasts. The forecast cache decides whether a
// genuinely new model run requires any point requests.
export function watchModelRunRefresh(refresh: () => void) {
    const update = () => { if (document.visibilityState !== 'hidden') refresh(); };
    const timer = window.setInterval(update, 30 * 60 * 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', update);
        document.removeEventListener('visibilitychange', update);
    };
}
