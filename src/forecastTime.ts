const fields = {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'} as const;
const utcTime = new Intl.DateTimeFormat('en-GB',{...fields,timeZone:'UTC'});
const irelandTime = new Intl.DateTimeFormat('en-GB',{
    ...fields,timeZone:'Europe/Dublin',timeZoneName:'shortOffset',
});
let lastTimestamp = NaN, lastOffset: number | undefined, lastLabel = '';

// Windy's point timeline displays local hours using the response's utcOffset.
// Only format the clock here: sampling continues to use the original UTC instant.
// Until metadata arrives, all catalogue sites share the Irish/UK local clock.
export function formatForecastTime(timestamp: number, utcOffset?: number): string {
    if (!Number.isFinite(timestamp)) return 'Forecast time unavailable';
    const offset = Number.isFinite(utcOffset) && Math.abs(utcOffset!) <= 14 ? utcOffset : undefined;
    if (timestamp === lastTimestamp && offset === lastOffset) return lastLabel;
    lastTimestamp = timestamp; lastOffset = offset;
    if (offset === undefined) {
        lastLabel = irelandTime.format(timestamp).replace('GMT','UTC').replace(/UTC[+-]0(?::00)?$/,'UTC');
    } else {
        const minutes = Math.round(offset * 60), absolute = Math.abs(minutes);
        const zone = minutes === 0 ? 'UTC' : `UTC${minutes < 0 ? '-' : '+'}${Math.floor(absolute / 60)}${absolute % 60 ? ':' + String(absolute % 60).padStart(2,'0') : ''}`;
        lastLabel = `${utcTime.format(timestamp + minutes * 60000)} ${zone}`;
    }
    return lastLabel;
}
