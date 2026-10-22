import type {SiteMetadata} from './siteCatalog';
import {finalizedParaglidingMapDecisions} from './paraglidingMapApproval.ts';
import {rangesFromParaglidingMap} from './windRanges.ts';
import type {WindRange} from './windRanges';
import {cataloguedParaglidingMapVideos} from './paraglidingMapVideos.ts';

// Observed public Paragliding Map records, compared with the plugin on 2026-10-22.
// Only the 75 missing-area candidates and 4 additional-slope candidates are
// included. Uncertain counterparts, source-verification records, closures and
// previously rejected Gortin are excluded. See reports/paraglidingmap-ireland-comparison.json.
// Source compass categories are retained as labels, not precise wind limits.
// Approved entries use the source's eight compass wedges (45° each), checked
// against its public detail-card rose. Missing directions remain unassessed.
type Record = SiteMetadata & {id:string;name:string;lat:number;lon:number};
const records: Record[] = [
    {"id":"pgmap-127756","name":"Aconeera or Cnoc Mordain","lat":53.3842,"lon":-9.6772,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127756","sourceDirections":"SE, S, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-153939","name":"Ardara","lat":54.764744,"lon":-8.538297,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/153939","sourceDirections":"N, NE, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-156227","name":"Arroo","lat":54.4149,"lon":-8.2435,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/156227","sourceDirections":"N","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127565","name":"Ballaghasheen Gap","lat":51.9479,"lon":-9.9334,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127565","sourceDirections":"N, NE, E","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-133439","name":"Ballinglen","lat":52.8238,"lon":-6.45197,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/133439","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-159819","name":"Ballybanaun Mountain","lat":53.6738,"lon":-9.4101,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/159819","sourceDirections":"SE, S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-173407","name":"Ballycrenane","lat":51.867219,"lon":-7.972498,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/173407","sourceDirections":"SE, S","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127770","name":"Banagher Hill","lat":54.72,"lon":-8.07914,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127770","sourceDirections":"NE, E","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-189983","name":"Ben Bulbin - West","lat":54.355537,"lon":-8.466565,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/189983","sourceDirections":"W","reviewGroup":"Additional launch / slope","reviewNote":"West-facing launch; the existing Ben Bulben sector is 310–350°, while this record is W. The points are 1.83 km apart."},
    {"id":"pgmap-184435","name":"Benbeg","lat":54.175217,"lon":-7.818005,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/184435","sourceDirections":"S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-153942","name":"Benlevy","lat":53.5285,"lon":-9.409656,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/153942","sourceDirections":"S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134499","name":"Bentee","lat":51.9356,"lon":-10.2173,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134499","sourceDirections":"N, NE, S, SW, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127890","name":"Bloody Foreland","lat":55.1374,"lon":-8.26028,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127890","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127626","name":"Bolus Head","lat":51.8012,"lon":-10.321,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127626","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134498","name":"Brandon Mtn","lat":52.2479,"lon":-10.2607,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134498","sourceDirections":"W, NW","reviewGroup":"Additional launch / slope","reviewNote":"Brandon western/northwestern side versus the existing Binn Fhaiche southeast-facing sector (120–170°). The points are 2.74 km apart; exact launch identity still needs local confirmation."},
    {"id":"pgmap-134488","name":"Breanlee (Hydro Road)","lat":52.0152,"lon":-9.7813,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134488","sourceDirections":"W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127367","name":"Carrigeenina (Slievenamuck)","lat":52.4342,"lon":-8.17643,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/127367","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127493","name":"Castle (Castlegoat) Rock","lat":51.8184,"lon":-9.5908,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127493","sourceDirections":"SE, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134460","name":"Caum","lat":51.9018,"lon":-8.8837,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134460","sourceDirections":"S","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146080","name":"Comeragh N-NE","lat":52.2627,"lon":-7.5094,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/146080","sourceDirections":"N, NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134496","name":"Connor Pass","lat":52.1809,"lon":-10.2063,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134496","sourceDirections":"N, NE, NW","reviewGroup":"Additional launch / slope","reviewNote":"Northern Connor Pass sector (N/NE/NW) versus the existing southern Ballingarraun sector (160–210°); approximately 1.02 km apart."},
    {"id":"pgmap-157103","name":"Corranabinnia","lat":53.9595,"lon":-9.6843,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/157103","sourceDirections":"S, SW, W","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134474","name":"Crohane","lat":51.9911,"lon":-9.3829,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134474","sourceDirections":"N, NE, SE, SW, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127681","name":"Cruach Marthain","lat":52.1495,"lon":-10.4311,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127681","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-182659","name":"Delphi Hike and Fly","lat":53.621002,"lon":-9.721351,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/182659","sourceDirections":"SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127388","name":"Devil's Bit Mountain","lat":52.8207,"lon":-7.91397,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127388","sourceDirections":"SW, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-207802","name":"Divis Hill","lat":54.610908,"lon":-6.017868,"region":"north-east","sourceUrl":"https://www.paraglidingmap.com/site/207802","sourceDirections":"SE, S","reviewGroup":"Additional launch / slope","reviewNote":"Southeast/south-facing launch versus the existing northeast/east Divis sector (40–120°), approximately 1.39 km apart."},
    {"id":"pgmap-162917","name":"Doolin 2","lat":53.0135,"lon":-9.39033,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/162917","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127205","name":"Dunran Hill","lat":53.0556,"lon":-6.11782,"region":"east","sourceUrl":"https://www.paraglidingmap.com/site/127205","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127656","name":"Englishman's","lat":54.2637,"lon":-7.98465,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127656","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-133473","name":"Faher Mountain","lat":51.9096,"lon":-9.8458,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/133473","sourceDirections":"E, SE, S","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146770","name":"Farrandalouge","lat":52.2378,"lon":-10.1276,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/146770","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127414","name":"Fathom Wood","lat":54.1197,"lon":-6.30853,"region":"north-east","sourceUrl":"https://www.paraglidingmap.com/site/127414","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127366","name":"Galty Mountains","lat":52.3469,"lon":-8.25679,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/127366","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146769","name":"Galtymore Anteny NW,N","lat":52.3137,"lon":-8.3097,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/146769","sourceDirections":"N, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146768","name":"Galtymore NE ,N","lat":52.3731,"lon":-8.16928,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/146768","sourceDirections":"N, NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134484","name":"Gap of Dunloe","lat":52.0384,"lon":-9.6478,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134484","sourceDirections":"N, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-132964","name":"Glengarriff","lat":51.772,"lon":-9.582,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/132964","sourceDirections":"SE, S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127852","name":"Glengesh Hill","lat":54.7461,"lon":-8.46274,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127852","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127638","name":"Gleninagh Mt.","lat":53.1289,"lon":-9.2063,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127638","sourceDirections":"N, NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134473","name":"Gougane Barra","lat":51.8436,"lon":-9.3249,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134473","sourceDirections":"SE, S","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127502","name":"Healy Pass","lat":51.7247,"lon":-9.75836,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127502","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127501","name":"Hungry Hill","lat":51.676,"lon":-9.76515,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127501","sourceDirections":"S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134491","name":"Kerry Head (West)","lat":52.4122,"lon":-9.9429,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134491","sourceDirections":"SW, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-189986","name":"Kesh","lat":54.060764,"lon":-8.443554,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/189986","sourceDirections":"N, W","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134501","name":"Kilkeaveragh","lat":51.868,"lon":-10.3326,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134501","sourceDirections":"N, SE, S, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127835","name":"Kingarrow Mtn","lat":55.0613,"lon":-7.91549,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127835","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134494","name":"Knockavahaun","lat":51.9228,"lon":-10.1153,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134494","sourceDirections":"NE, E, SE, S, SW, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134465","name":"Knocknabro","lat":52.0135,"lon":-9.2323,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134465","sourceDirections":"SE, S, SW, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127627","name":"Knocknadobar","lat":51.9927,"lon":-10.1751,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127627","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-132966","name":"Knocknakilton","lat":52.19,"lon":-9.988,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/132966","sourceDirections":"N, NE, SE, S, SW, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127722","name":"Lackadunna","lat":53.3954,"lon":-9.49724,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127722","sourceDirections":"SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127846","name":"Loughcrillan RTE Transmitter","lat":54.817,"lon":-8.3189,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127846","sourceDirections":"SE, S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134483","name":"Madman's Seat","lat":51.9915,"lon":-9.6355,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134483","sourceDirections":"SE, S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-177385","name":"Magheraroaty Beach","lat":55.149971,"lon":-8.154523,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/177385","sourceDirections":"NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127496","name":"Mass Mt.","lat":51.6996,"lon":-9.69374,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127496","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134486","name":"Maulin Mtn (Kerry Head)","lat":52.416,"lon":-9.8608,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134486","sourceDirections":"NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127775","name":"Maumturk Mts","lat":53.4943,"lon":-9.664,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127775","sourceDirections":"S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127462","name":"Mt.Gabriel","lat":51.5586,"lon":-9.5402,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127462","sourceDirections":"N, NE, SE, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127442","name":"Mullaghmesha Mtn. (W)","lat":51.702,"lon":-9.33058,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127442","sourceDirections":"N, W, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127825","name":"Mulmosog Mountain","lat":54.732,"lon":-8.39117,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127825","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127423","name":"Mushera (N)","lat":52.0231,"lon":-8.9553,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127423","sourceDirections":"N, NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-153941","name":"O' Donell's Rock","lat":54.266464,"lon":-8.184647,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/153941","sourceDirections":"NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-182662","name":"Old Bawn","lat":52.537713,"lon":-6.209294,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/182662","sourceDirections":"NE, E, SE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146765","name":"Old Leighlin","lat":52.723519,"lon":-7.028787,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/146765","sourceDirections":"SE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127748","name":"Ox Mts.","lat":54.131,"lon":-8.75874,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127748","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134478","name":"Parkana","lat":51.8439,"lon":-9.428,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134478","sourceDirections":"NE, E, SE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-169153","name":"Rinvill Park","lat":53.246016,"lon":-8.956655,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/169153","sourceDirections":"SW, W","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127745","name":"Rocky Hill","lat":55.0918,"lon":-7.32654,"region":"north-east","sourceUrl":"https://www.paraglidingmap.com/site/127745","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134469","name":"Rossacroo","lat":52.0324,"lon":-9.3167,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134469","sourceDirections":"N, NE, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127809","name":"Scraigs","lat":54.8601,"lon":-8.10277,"region":"north-west","sourceUrl":"https://www.paraglidingmap.com/site/127809","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-146764","name":"Shillelagh","lat":52.7823,"lon":-6.55568,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/146764","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-132961","name":"Silvermine Mts.","lat":52.7771,"lon":-8.2524,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/132961","sourceDirections":"N, NE, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127483","name":"Slieve Bernagh","lat":52.8239,"lon":-8.55183,"region":"west","sourceUrl":"https://www.paraglidingmap.com/site/127483","sourceDirections":"S, SW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127588","name":"Slieve Gallion","lat":54.748525,"lon":-6.736658,"region":"north-east","sourceUrl":"https://www.paraglidingmap.com/site/127588","sourceDirections":"N, NE, E","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127568","name":"Slieve Mish Mts.","lat":52.2125,"lon":-9.71465,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/127568","sourceDirections":"","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-127392","name":"Slievereagh","lat":52.3779,"lon":-8.40382,"region":"south-east","sourceUrl":"https://www.paraglidingmap.com/site/127392","sourceDirections":"N, NE","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-134480","name":"Torc","lat":51.9982,"lon":-9.5215,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/134480","sourceDirections":"N, NE, SE, S, NW","reviewGroup":"New catalogue entry"},
    {"id":"pgmap-201264","name":"Youghal Crocodile","lat":51.935737,"lon":-7.856644,"region":"south-west","sourceUrl":"https://www.paraglidingmap.com/site/201264","sourceDirections":"E, SE, S","reviewGroup":"New catalogue entry"},
];
export const paraglidingMapSites = records.map(record=>({...record,
    toVerify:true,reviewState:'pending' as const,
    sectorStart:Number.NaN,sectorEnd:Number.NaN,windRanges:[],youtube:[] as string[],
}));

// Final location decisions ship with the plugin and take precedence over old
// browser-only review choices. The historical review snapshot above remains
// unchanged; approved locations use source directions or owner-confirmed limits.
// Numeric limits confirmed by the owner on 2026-10-22.
const ownerWindRanges:{[id:string]:WindRange[]}={
    'pgmap-146764':[{start:260,end:280}], // Shillelagh, 52.782, -6.556
    'pgmap-127205':[{start:80,end:150}], // Dunran Hill, 53.056, -6.118
    'pgmap-133439':[{start:45,end:130}], // Ballinglen, 52.824, -6.452
    'pgmap-127366':[{start:285,end:300}], // Galty Mountains, 52.347, -8.257
    'pgmap-127496':[{start:100,end:175}], // Mass Mt., 51.700, -9.694
    'pgmap-127502':[{start:300,end:360}], // Healy Pass, 51.725, -9.759
    'pgmap-127626':[{start:90,end:300}], // Bolus Head, 51.801, -10.322
    'pgmap-127627':[{start:60,end:330}], // Knocknadobar, 51.993, -10.175
    'pgmap-127681':[{start:320,end:360}], // Cruach Marthain, 52.150, -10.431
    'pgmap-146770':[{start:330,end:360}], // Farrandalouge, 52.238, -10.128
    'pgmap-127852':[{start:285,end:15}], // Glengesh Hill, 54.746, -8.463
    'pgmap-127825':[{start:80,end:130},{start:280,end:360}], // Mulmosog Mountain, 54.732, -8.391
    'pgmap-127809':[{start:30,end:360}], // Scraigs, 54.860, -8.103
    'pgmap-127890':[{start:280,end:15}], // Bloody Foreland, 55.137, -8.260
};
export const approvedParaglidingMapSites = paraglidingMapSites
    .filter(site=>finalizedParaglidingMapDecisions[site.id]==='accepted')
    .map(site=>{
        const ranges=ownerWindRanges[site.id]??rangesFromParaglidingMap(site.sourceDirections);
        const videos=cataloguedParaglidingMapVideos[site.id]??[];
        return {...site,reviewState:'accepted' as const,reviewFinalized:true,
            videoCandidates:videos,youtube:videos.map(video=>video.url),
            toVerify:ranges.length===0,windRanges:ranges,
            sectorStart:ranges[0]?.start??Number.NaN,sectorEnd:ranges[0]?.end??Number.NaN};
    });
export const paraglidingMapReviewCandidates = paraglidingMapSites
    .filter(site=>!Object.hasOwn(finalizedParaglidingMapDecisions,site.id));
