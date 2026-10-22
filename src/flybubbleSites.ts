import type {SiteMetadata} from './siteCatalog';
import {rangesFromFlybubble} from './windRanges.ts';

// Public Flybubble catalogue snapshot, 2026-10-21. 38 launch records in 33 areas.
// Owner excluded Flagstaff (15458) and Gortin (14732) after location review.
// Owner accepted the remaining locations. Direction ratings refreshed from
// https://api.theparaglider.com/v1/weather/sites on 2026-10-21 (unchanged).
// Keep original 16-bin ratings for provenance; use ratings 1 and 2, not 0.
type ReviewRecord = SiteMetadata & {id:string;name:string;lat:number;lon:number;sourceWindSectors:number[]};
const records: ReviewRecord[] = [
    {"id":"flybubble-9562","name":"Monavullagh","lat":52.19,"lon":-7.5887,"region":"south-east","reviewGroup":"Monavullagh","sourceUrl":"https://weather.flybubble.com/monavullagh-9562","sourceWindSectors":[0,0,0,0,0,0,0,1,1,1,1,2,2,1,1,0]},
    {"id":"flybubble-9564","name":"The Vee","lat":52.2471,"lon":-7.943,"region":"south-east","reviewGroup":"The Vee","sourceUrl":"https://weather.flybubble.com/the-vee-9564","sourceWindSectors":[2,1,1,0,0,0,0,0,0,0,0,0,0,1,1,2]},
    {"id":"flybubble-9565","name":"Knockanaffrin","lat":52.3024,"lon":-7.5945,"region":"south-east","reviewGroup":"Knockanaffrin","sourceUrl":"https://weather.flybubble.com/knockanaffrin-9565","sourceWindSectors":[0,0,0,0,0,0,0,0,0,1,1,2,2,1,1,0]},
    {"id":"flybubble-9899","name":"Seefin NE (Co.Kerry)","lat":52.058,"lon":-9.9,"region":"south-west","reviewGroup":"Seefin NE (Co.Kerry)","sourceUrl":"https://weather.flybubble.com/seefin-ne-co-kerry-9899","sourceWindSectors":[2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,2]},
    {"id":"flybubble-9922","name":"Clara","lat":52.049,"lon":-9.094,"region":"south-west","reviewGroup":"Clara","sourceUrl":"https://weather.flybubble.com/clara-9922","sourceWindSectors":[2,2,2,0,0,0,0,0,0,0,0,2,2,2,2,2]},
    {"id":"flybubble-9923","name":"Gneeves NE","lat":52.017,"lon":-9.117,"region":"south-west","reviewGroup":"Gneeves","sourceUrl":"https://weather.flybubble.com/gneeves-ne-9923","sourceWindSectors":[1,2,2,1,1,0,0,0,0,0,0,0,0,0,0,1]},
    {"id":"flybubble-9926","name":"Mweelin","lat":51.89,"lon":-9.264,"region":"south-west","reviewGroup":"Mweelin","sourceUrl":"https://weather.flybubble.com/mweelin-9926","sourceWindSectors":[0,0,0,0,0,2,2,2,2,2,2,1,1,0,0,0]},
    {"id":"flybubble-9936","name":"Caherdaniel - Cahernageeha Mtn.","lat":51.798,"lon":-10.0854,"region":"south-west","reviewGroup":"Caherdaniel - Cahernageeha Mtn.","sourceUrl":"https://weather.flybubble.com/caherdaniel-cahernageeha-mtn-9936","sourceWindSectors":[0,0,0,0,0,2,2,2,2,2,2,0,0,0,0,0]},
    {"id":"flybubble-11470","name":"Scalp","lat":55.0819,"lon":-7.38393,"region":"north-west","reviewGroup":"Scalp","sourceUrl":"https://weather.flybubble.com/scalp-11470","sourceWindSectors":[1,0,0,0,0,1,2,2,1,0,0,0,0,1,2,2]},
    {"id":"flybubble-11471","name":"Mamore Gap","lat":55.2465,"lon":-7.4981,"region":"north-west","reviewGroup":"Mamore / Urris Hills","sourceUrl":"https://weather.flybubble.com/mamore-gap-11471","sourceWindSectors":[0,0,0,0,0,0,0,0,0,0,0,0,1,1,2,1]},
    {"id":"flybubble-12830","name":"Dunworly Bay","lat":51.5795,"lon":-8.7506,"region":"south-west","reviewGroup":"Dunworly Bay","sourceUrl":"https://weather.flybubble.com/dunworly-bay-12830","sourceWindSectors":[1,0,0,0,0,0,0,0,0,0,0,0,0,2,2,1]},
    {"id":"flybubble-12833","name":"Benglenesky","lat":53.4864,"lon":-9.85902,"region":"west","reviewGroup":"Benglenesky","sourceUrl":"https://weather.flybubble.com/benglenesky-12833","sourceWindSectors":[0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0]},
    {"id":"flybubble-12844","name":"Croagh Patrick","lat":53.7599,"lon":-9.65878,"region":"west","reviewGroup":"Croagh Patrick","sourceUrl":"https://weather.flybubble.com/croagh-patrick-12844","sourceWindSectors":[2,2,2,0,0,1,1,2,2,2,2,1,1,2,2,2]},
    {"id":"flybubble-12845","name":"Croaghmoyle","lat":53.926,"lon":-9.3741,"region":"west","reviewGroup":"Croaghmoyle","sourceUrl":"https://weather.flybubble.com/croaghmoyle-12845","sourceWindSectors":[0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0]},
    {"id":"flybubble-12847","name":"Maumtrasna","lat":53.6186,"lon":-9.5533,"region":"west","reviewGroup":"Maumtrasna","sourceUrl":"https://weather.flybubble.com/maumtrasna-12847","sourceWindSectors":[0,0,1,0,1,0,0,0,0,1,1,0,0,1,1,1]},
    {"id":"flybubble-12851","name":"Knocknarea","lat":54.2587,"lon":-8.57388,"region":"north-west","reviewGroup":"Knocknarea","sourceUrl":"https://weather.flybubble.com/knocknarea-12851","sourceWindSectors":[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]},
    {"id":"flybubble-12853","name":"Truskmore","lat":54.3745,"lon":-8.37084,"region":"north-west","reviewGroup":"Truskmore","sourceUrl":"https://weather.flybubble.com/truskmore-12853","sourceWindSectors":[1,1,0,0,0,0,1,1,0,0,0,1,1,1,0,0]},
    {"id":"flybubble-12874","name":"Slieve Elva","lat":53.0835,"lon":-9.2685,"region":"west","reviewGroup":"Slieve Elva","sourceUrl":"https://weather.flybubble.com/slieve-elva-12874","sourceWindSectors":[0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,0]},
    {"id":"flybubble-12881","name":"Mullaghanish","lat":51.983,"lon":-9.14256,"region":"south-west","reviewGroup":"Mullaghanish","sourceUrl":"https://weather.flybubble.com/mullaghanish-12881","sourceWindSectors":[1,0,0,0,0,0,0,1,1,0,0,0,0,0,0,1]},
    {"id":"flybubble-12882","name":"Seefin - Bantry Bay","lat":51.5989,"lon":-9.69576,"region":"south-west","reviewGroup":"Seefin - Bantry Bay","sourceUrl":"https://weather.flybubble.com/seefin-bantry-bay-12882","sourceWindSectors":[1,0,0,0,0,0,1,2,1,0,0,0,0,0,1,2]},
    {"id":"flybubble-12896","name":"Arra","lat":52.8467,"lon":-8.39407,"region":"west","reviewGroup":"Arra","sourceUrl":"https://weather.flybubble.com/arra-12896","sourceWindSectors":[0,0,0,0,0,0,0,0,0,2,2,2,2,1,1,0]},
    {"id":"flybubble-12900","name":"Slievenamon","lat":52.4272,"lon":-7.56192,"region":"south-east","reviewGroup":"Slievenamon","sourceUrl":"https://weather.flybubble.com/slievenamon-12900","sourceWindSectors":[1,0,0,0,2,1,1,1,2,1,1,0,0,0,0,0]},
    {"id":"flybubble-12905","name":"Croaghmuckros","lat":54.6207,"lon":-8.58206,"region":"north-west","reviewGroup":"Croaghmuckros","sourceUrl":"https://weather.flybubble.com/croaghmuckros-12905","sourceWindSectors":[1,0,0,0,0,0,1,2,2,1,0,0,0,0,1,1]},
    {"id":"flybubble-12912","name":"Mamore - Urris Hills","lat":55.2372,"lon":-7.49071,"region":"north-west","reviewGroup":"Mamore / Urris Hills","sourceUrl":"https://weather.flybubble.com/mamore-urris-hills-12912","sourceWindSectors":[0,0,0,0,0,1,2,1,0,0,0,0,0,1,2,1]},
    {"id":"flybubble-13887","name":"Sky Road","lat":53.5006,"lon":-10.0962,"region":"west","reviewGroup":"Sky Road","sourceUrl":"https://weather.flybubble.com/sky-road-13887","sourceWindSectors":[0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0]},
    {"id":"flybubble-14020","name":"Croagh Patrick South take-off","lat":53.7628,"lon":-9.6364,"region":"west","reviewGroup":"Croagh Patrick","sourceUrl":"https://weather.flybubble.com/croagh-patrick-south-take-off-14020","sourceWindSectors":[0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0]},
    {"id":"flybubble-14042","name":"Silver Strand","lat":53.2503,"lon":-9.1224,"region":"west","reviewGroup":"Silver Strand","sourceUrl":"https://weather.flybubble.com/silver-strand-14042","sourceWindSectors":[0,0,0,0,0,0,0,1,1,2,2,0,0,0,0,0]},
    {"id":"flybubble-14265","name":"Slivecarran","lat":53.1081,"lon":-9.014,"region":"west","reviewGroup":"Slievecarran","sourceUrl":"https://weather.flybubble.com/slivecarran-14265","sourceWindSectors":[0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0]},
    {"id":"flybubble-14349","name":"Gneeves (E)","lat":52.0275,"lon":-9.125,"region":"south-west","reviewGroup":"Gneeves","sourceUrl":"https://weather.flybubble.com/gneeves-e-14349","sourceWindSectors":[1,2,2,2,2,1,1,0,0,0,0,0,0,0,0,1]},
    {"id":"flybubble-14362","name":"Croagh Patrick East Site","lat":53.7628,"lon":-9.6351,"region":"west","reviewGroup":"Croagh Patrick","sourceUrl":"https://weather.flybubble.com/croagh-patrick-east-site-14362","sourceWindSectors":[2,2,2,0,0,0,0,0,0,0,0,0,0,2,2,2]},
    {"id":"flybubble-14437","name":"Slievecarran North","lat":53.1249,"lon":-9.0253,"region":"west","reviewGroup":"Slievecarran","sourceUrl":"https://weather.flybubble.com/slievecarran-north-14437","sourceWindSectors":[0,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0]},
    {"id":"flybubble-14687","name":"Croaghanmoira","lat":52.917,"lon":-6.33928,"region":"east","reviewGroup":"Croaghanmoira","sourceUrl":"https://weather.flybubble.com/croaghanmoira-14687","sourceWindSectors":[1,2,1,1,1,1,1,1,2,1,0,0,0,0,0,0]},
    {"id":"flybubble-10683","name":"Kadeen","lat":52.951,"lon":-6.58948,"region":"east","reviewGroup":"Kadeen","sourceUrl":"https://weather.flybubble.com/kadeen-10683","sourceWindSectors":[0,0,0,0,0,0,0,0,0,1,1,2,2,1,1,0]},
    {"id":"flybubble-12857","name":"Bournabrena","lat":53.2365,"lon":-6.37801,"region":"east","reviewGroup":"Bournabrena","sourceUrl":"https://weather.flybubble.com/bournabrena-12857","sourceWindSectors":[0,0,1,2,0,0,0,0,0,0,0,0,0,0,0,0]},
    {"id":"flybubble-12858","name":"Corn Hill","lat":53.8069,"lon":-7.71464,"region":"east","reviewGroup":"Corn Hill","sourceUrl":"https://weather.flybubble.com/corn-hill-12858","sourceWindSectors":[0,0,0,0,0,1,1,1,0,0,0,0,0,1,1,1]},
    {"id":"flybubble-12863","name":"Arklow Rock","lat":52.7695,"lon":-6.15093,"region":"east","reviewGroup":"Arklow Rock","sourceUrl":"https://weather.flybubble.com/arklow-rock-12863","sourceWindSectors":[0,0,0,0,0,1,2,1,0,0,0,0,0,0,0,0]},
    {"id":"flybubble-12864","name":"Church Mt.","lat":53.054,"lon":-6.58472,"region":"east","reviewGroup":"Church Mt.","sourceUrl":"https://weather.flybubble.com/church-mt-12864","sourceWindSectors":[0,1,2,2,2,2,1,0,0,1,2,1,0,0,0,0]},
    {"id":"flybubble-12866","name":"Djouce Mtn.","lat":53.1303,"lon":-6.24007,"region":"east","reviewGroup":"Djouce Mtn.","sourceUrl":"https://weather.flybubble.com/djouce-mtn-12866","sourceWindSectors":[0,0,0,1,1,2,2,0,0,0,0,0,0,0,0,0]},
];
// Practical terrain categories, consistent with the existing catalogue.
const coastalIds=new Set(['flybubble-12830','flybubble-12882','flybubble-12905',
    'flybubble-13887','flybubble-14042','flybubble-12863']);
export const flybubbleSites = records.map(record => {
    const ranges=rangesFromFlybubble(record.sourceWindSectors);
    return {...record,toVerify:false,siteType:coastalIds.has(record.id)?'coastal' as const:'inland' as const,
        windRanges:ranges,sectorStart:ranges[0]?.start??Number.NaN,sectorEnd:ranges[0]?.end??Number.NaN,
        youtube:[] as string[]};
});
