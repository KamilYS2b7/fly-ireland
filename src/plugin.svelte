<script lang="ts">
// @ts-nocheck
/// <reference types="@windycom/plugin-devtools" />

import { onMount, onDestroy } from 'svelte';
import { map } from '@windy/map';
import store from '@windy/store';
import broadcast from '@windy/broadcast';
import { iconsDir } from '@windy/rootScope';
import { getAllPointProducts } from '@windy/models';
import products from '@windy/products';
import { getPointForecastData, getMeteogramForecastData } from '@windy/fetch';
import { forecastModelLabel, pointModelSupported, forecastModelOptions } from './forecastModels';
import { createPointWindForecast as createWindForecast } from './pointForecast';
import { watchTimelinePreview } from './timelinePreview';
import { buildSitePanel } from './sitePanel';
import SitePanel from './SitePanel.svelte';
import { getSiteMetadata } from './siteCatalog';
import { defaultSiteFilters, normalizeSiteFilters, scopeSitePanel, sitesForView, readSiteFilters, saveSiteFilters } from './siteFilters';
import type { SiteFilters } from './siteFilters';
import {rainDisplay} from './rainForecast';
import {gustWarningDisplay,GUST_WARNING_SVG} from './gustWarning';
import {weatherDisplay,weatherIconUrl,cloudBaseDisplay} from './weatherForecast';
import {flybubbleSites} from './flybubbleSites';
import {approvedParaglidingMapSites,paraglidingMapReviewCandidates} from './paraglidingMapSites';
import {applySiteReview,readSiteReview,saveSiteReview,setSiteReviewDecision,siteReviewCounts,exportSiteReview,SITE_REVIEW_STORAGE_KEY} from './siteReview';
import type {SiteReviewDecision,SiteReviewDecisions} from './siteReview';
import {windRanges,formatWindRanges} from './windRanges';
import {normalizeWindUnit,readWindUnit,saveWindUnit,convertWindSpeed,formatWindSpeed,windSpeedRange} from './windUnits';
import type {WindUnit} from './windUnits';
import {windLevelLabel} from './windLayers';
import {formatForecastTime} from './forecastTime';
import {createDetailModelSync} from './detailModelSync';
import {watchModelRunRefresh} from './modelRunRefresh';
import {createVideoReview,applyVideoDecisions,mapVideoButtonHTML,VIDEO_REVIEW_STORAGE_KEY} from './siteVideos';
import type {VideoDecision,VideoDecisions,SiteVideo} from './siteVideos';
// @ts-ignore
declare const L: any;

/* ======= KONFIG ======= */
const initialZoom     = 10;   // początkowe przybliżenie mapy
const minZoomToShow   = 14;   // below this zoom: miniature roses; then large roses where space permits
const faceOpacity     = 0.35; // przezroczystość tarczy
const collisionPadPx  = 2;    // bufor między rozetami (px)

// viewport/filter
const VIEWPORT_PAD_PX = 200;  // px bufora poza ekranem dla płynnego dociągania

/* łuki/animacje */
const GREEN_SW        = 10;
const RED_SW          = 5;
const GREEN_ANIM_MS   = 700;
const GREEN_PRE_LAG   = 140;
const RED_ANIM_MS     = 700;
const RED_START_SLACK = 60;

/* ======= LOKALIZACJE (prosty tekst) ======= */
const spotText = `
//
Big Colin
Location: 54.802333, -6.084265
Wind 145-180
Site Diff:1
Youtube: https://www.youtube.com/watch?v=K7tf7oSZNX8
Youtube: https://www.youtube.com/watch?v=USrytG5HsqY
Youtube: https://www.youtube.com/watch?v=bOvpQom5Z3Y
//
Ballyhoura
Location:52.312253, -8.506177
Wind 30-100
Site Diff:3
Youtube:https://www.youtube.com/watch?v=mUA7DhCa6z0
//
Bencroy Coal Mines
Location:54.118640, -7.923581
Wind 110-160
Site Diff:3
Youtube:https://www.youtube.com/watch?v=Oc17yiKWALs
//
Knockgour mountain
Location:51.643864, -10.000998
Wind 250-280
Site Diff:3
Youtube:https://www.youtube.com/watch?v=gCM3ZPMWtJo
Youtube:https://www.youtube.com/watch?v=muKzLR2RaZY
//
Bray Head
Location:53.191525, -6.084352
Wind 20-100
Site Diff:3
Youtube:https://www.youtube.com/watch?v=cOFnEa7BKJg
Youtube:https://www.youtube.com/watch?v=zevrClsu9pM
//
Dungiven
Location: 54.934995, -6.866763
Wind 220-290
Site Diff:2
Youtube: https://www.youtube.com/watch?v=XFIMLCErd-U
//
Dungiven NW
Location: 54.945514, -6.873402
Wind 300-340
Site Diff:2
Youtube:
//
Dungiven Boviel
Location: 54.919836, -6.850042
Wind 190-240
Site Diff:2
Youtube:https://www.youtube.com/watch?v=_dIO9i3QWGk
//
Castlefreke
Location: 51.556911, -8.966150
Wind 190-225
Site Diff:1
Youtube:https://www.youtube.com/watch?v=6uqQuc4lC3k
//
Mayobridge
Location: 54.170498, -6.192803
Wind 270-340
Site Diff:2
Youtube:https://www.youtube.com/watch?v=ThiWoi7RIxw
//
Maulin
Location: 51.682347, -9.870500
Wind 180-210
Site Diff:2
Youtube:https://www.youtube.com/watch?v=2-qoSH_6FjU
//
Slemish
Location: 54.881227, -6.097416
Wind 240-260
Site Diff:3
Youtube:https://www.youtube.com/watch?v=E8FT39Lmpjk
//
Skerrywhirry
Location: 54.834742, -5.998588
Wind 220-260
Site Diff:1
Youtube:https://www.youtube.com/watch?v=rrk76rOGhGY
//
Skeagh
Location: 54.886143, -5.971930
Wind 50-120
Site Diff:1
Youtube:
//
Gyles Quay Beach
Location: 53.986062, -6.233917
Wind 140-180
Site Diff:3
Youtube:https://www.youtube.com/watch?v=H9fEZEB9iXE
//
Hill Beach
Location: 53.979579, -6.156882
Wind 130-150
Site Diff:1
Youtube:https://www.youtube.com/watch?v=Ie8i_nUVUlU
Youtube:https://www.youtube.com/watch?v=GkvqmnQARRc
//
Agnews
Location: 54.844659, -5.932023
Wind 40-110
Site Diff:2
Youtube:https://www.youtube.com/watch?v=dSBLEpb9q6U
Youtube:https://www.youtube.com/watch?v=5Z_GsGIAKb4
//
Robin Youngs
Location: 54.891851, -5.916308
Wind 0-60
Site Diff:3
Youtube:https://www.youtube.com/watch?v=Py5EDPiIZ1w
Youtube:https://www.youtube.com/watch?v=k8X9hdfE54M
//
Shanes Hill
Location: 54.819792, -5.927578
Wind 60-120
Site Diff:2
Youtube:
//
Knockagh Monument
Location: 54.711187, -5.879283
Wind 110-180
Site Diff:4
Youtube:https://www.youtube.com/watch?v=TC1hpoydJ6Y
//
Divis
Location: 54.605172, -5.998758
Wind 40-120
Site Diff:4
Youtube:https://www.youtube.com/watch?v=bbJ7mJLHcqM
//
Mayobridge North
Location: 54.170883, -6.182196
Wind 340-20
Site Diff:3
Youtube:
//
Spelga
Location: 54.188606, -6.065619
Wind 290-340
Site Diff:3
Youtube:https://www.youtube.com/watch?v=ZtQLQRCCRFQ
//
Carlingford
Location: 54.032794, -6.205849
Wind 60-100
Site Diff:3
Youtube:https://www.youtube.com/watch?v=M8c4oCXRZ0U
//
Barnevave
Location: 54.025038, -6.204715
Wind 240-270
Site Diff:2
Youtube:https://www.youtube.com/watch?v=4340ALozBOo
//
Clermont Carn
Location: 54.078550, -6.319776
Wind 165-200
Site Diff:3
Youtube:https://www.youtube.com/watch?v=AotkCwwkYZo
//
Slieve Gullion
Location: 54.129181, -6.443139
Wind 230-280
Site Diff:3
Youtube:https://www.youtube.com/watch?v=FnOApdHAde4
//
Slieve Gullion S
Location: 54.121027, -6.434222
Wind 190-210
Site Diff:3
Youtube:https://www.youtube.com/watch?v=iQP6Q-KNC24
//
Slieveban
Location: 54.083209, -6.165797
Wind 195-245
Site Diff:2
Youtube:https://www.youtube.com/watch?v=ERI8Bu7wMAc&t=7s
//
Slieve Binnian East
Location: 54.140269, -5.972614
Wind 175-210
Site Diff:3
Youtube:https://www.youtube.com/watch?v=2YxPg1jXPRU
//
Slieve Meelmore
Location: 54.199431, -6.006449
Wind 350-45
Site Diff:3
Youtube:https://www.youtube.com/watch?v=XEufb-mxmf0
//
Hen mountain
Location: 54.182433, -6.097136
Wind 260-300
Site Diff:3
Youtube:
//
Mt Errigal
Location: 55.028833, -8.102669
Wind 140-200
Site Diff:3
Youtube:https://www.youtube.com/watch?v=04tjBVPjSQQ
//
Ometh
Location: 54.085152, -6.301297
Wind 60-95
Site Diff:2
Youtube:
//
Castle Roche
Location: 54.045962, -6.487850
Wind 205-245
Site Diff:3
Youtube:https://www.youtube.com/watch?v=z9IoTej_4MQ&t=130s
//
White Mountain W
Location: 54.863579, -6.851828
Wind 260-330
Site Diff:3
Youtube:https://www.youtube.com/watch?v=Bbr_EOHZNVY
//
White Mountain S
Location: 54.848923, -6.849018
Wind 155-230
Site Diff:4
Youtube:
//
Craigagh Hill
Location: 54.831109, -6.884755
Wind 90-130
Site Diff:3
Youtube:
//
Coolnasillagh
Location: 54.849832, -6.785004
Wind 120-150
Site Diff:2
Youtube:https://www.youtube.com/watch?v=ePU5OCOZ8Hs
//
Magilligan Hells Hole
Location: 55.138244, -6.884943
Wind 270-330
Site Diff:4
Youtube:https://www.youtube.com/watch?v=oYMbucOBkrw
//
Magilligan N
Location: 55.153811, -6.872439
Wind 290-360
Site Diff:4
Youtube:https://www.youtube.com/watch?v=YhpfmynQlTg
Youtube:https://www.youtube.com/watch?v=lgqMqsM8-fU
//
Torr Head
Location: 55.199925, -6.095361
Wind 30-60
Site Diff:4
Youtube:https://www.youtube.com/watch?v=qxVZLUWeCPI
//
White Park Bay
Location: 55.229423, -6.394838
Wind 315-360
Site Diff:3
Youtube:
//
Lurigethan
Location: 55.058276, -6.090163
Wind 305-335
Site Diff:0
Youtube:
//
Slieve Croob
Location: 54.339965, -5.973334
Wind 1-360
Site Diff:3
Youtube:
//
Buncrana
Location: 55.096366, -7.468954
Wind 270-335
Site Diff:2
Youtube:https://www.youtube.com/watch?v=BVrlsPU9FIs
Youtube:https://www.youtube.com/watch?v=3vMtDM-sIVs
ss
//
Portsalon
Location: 55.182947, -7.593076
Wind 290-330
Site Diff:3
Youtube:https://www.youtube.com/watch?v=fkdph_G9HQ8
//
Leenakeel Bay Beach
Location: 55.241737, -7.519642
Wind 230-250
Site Diff:0
Youtube:
//
Tullagh Strand
Location: 55.281352, -7.443092
Wind 330-45
Site Diff:0
Youtube:
//
Five Finger Strand
Location: 55.320426, -7.331312
Wind 240-290
Site Diff:1
Youtube:https://www.youtube.com/watch?v=L7r0AVohGxE
//
Tramore
Location: 55.168727, -7.827578
Wind 260-310
Site Diff:1
Youtube:
//
Dooey Beach
Location: 54.870663, -8.384738
Wind 255-300
Site Diff:1
Youtube:
//
White Rock Beach
Location: 55.206472, -6.614547
Wind 350-45
Site Diff:1
Youtube:https://www.youtube.com/watch?v=1GdWi4vI5C0
//
Muckish N
Location: 55.106324, -7.993092
Wind 330-15
Site Diff:3
Youtube:https://www.youtube.com/watch?v=UnmAKvqail4
//
Ballinreavy Strand
Location: 54.801462, -8.469882
Wind 200-270
Site Diff:1
Youtube:https://www.youtube.com/watch?v=BKi3SUB5hus
//
Tullan Strand
Location: 54.497779, -8.265295
Wind 260-310
Site Diff:1
Youtube:https://www.youtube.com/watch?v=n1aliUOTjMA
//
Cliffony Bay Beach
Location: 54.439267, -8.467590
Wind 250-320
Site Diff:1
Youtube:https://www.youtube.com/watch?v=eyJ7STciBRs&t=100s
//
Ben Bulben
Location: 54.364021, -8.490841
Wind 310-350
Site Diff:4
Youtube:https://www.youtube.com/watch?v=xQ021km1hs4
//
Dunany Co. Louth Ireland
Location: 53.857195, -6.244373
Wind 90-140
Site Diff:3
Youtube:https://www.youtube.com/watch?v=zdIddTiBN9w&t=147s
//
Gormanston
Location: 53.644512, -6.218042
Wind 50-100
Site Diff:3
Youtube:https://www.youtube.com/watch?v=sncqGk1DEgU
//
Ardgillan Demesne Bay Beach
Location: 53.593771, -6.157086
Wind 35-90
Site Diff:1
Youtube:https://www.youtube.com/watch?v=AT-he6Wo0aA
//
Killiney Hill Park
Location: 53.265444, -6.111444
Wind 90-150
Site Diff:1
Youtube:https://www.youtube.com/watch?v=7cmeyWkw2SY&t=12s
Youtube:https://www.youtube.com/watch?v=PDsqoFGR9JI
//
Great Sugar Loaf
Location: 53.153975, -6.150266
Wind 150-270
Site Diff:0
Youtube:https://www.youtube.com/watch?v=E8b95uvg4dg
//
Lough Tay View Point
Location: 53.113555, -6.263583
Wind 200-250
Site Diff:3
Youtube:https://www.youtube.com/watch?v=C3JIJko9MXI
//
Lough Tay S
Location: 53.102001, -6.257756
Wind 270-330
Site Diff:3
Youtube:https://www.youtube.com/watch?v=ACu-Oz1yS3s
//
Lough Tay E
Location: 53.105217, -6.254283
Wind 260-280
Site Diff:3
Youtube:https://www.youtube.com/watch?v=H9wFFQdUM3s
//
Tonelagee
Location: 53.047467, -6.391189
Wind 140-210
Site Diff:3
Youtube:https://www.youtube.com/watch?v=nZXAFIzD5FY
//
Lough Bray Upper
Location: 53.175377, -6.305293
Wind 30-90
Site Diff:3
Youtube:https://www.youtube.com/watch?v=v-AD3FtxDSw
//
Lough Bray Lower
Location: 53.189136, -6.307998
Wind 135-155
Site Diff:3
Youtube:https://www.youtube.com/watch?v=L2Q73KwdM6U
//
Kilbeg
Location: 53.129958, -6.446629
Wind 260-310
Site Diff:0
Youtube:https://www.youtube.com/watch?v=hxmeR_plTP0
//
Sorrel Hill
Location: 53.144645, -6.445282
Wind 190-220
Site Diff:2
Youtube:https://www.youtube.com/watch?v=9poWNaG34Rc
//
Croghan Mountain
Location: 52.793814, -6.332727
Wind 155-190
Site Diff:3
Youtube:https://www.youtube.com/watch?v=wU-79q1jqjs
//
Annagh Hill
Location: 52.752024, -6.370525
Wind 120-170
Site Diff:2
Youtube:https://www.youtube.com/watch?v=Hoj1Pxfn7-g
Youtube:https://www.youtube.com/watch?v=zDcmBMumsuo
//
Slieve Bui
Location: 52.658136, -6.475468
Wind 110-170
Site Diff:2
Youtube:https://www.youtube.com/watch?v=qN-Pk9SMDSU
//
Mount Leinster
Location: 52.616587, -6.779473
Wind 180-270
Site Diff:3
Youtube:https://www.youtube.com/watch?v=42zWDHP3Jyg
//
Mount Leinster N
Location: 52.636022, -6.813285
Wind 140-180
Site Diff:2
Youtube:https://www.youtube.com/watch?v=WU4YrSeDr-k
//
Maulin Peak
Location: 53.155384, -6.230267
Wind 350-30
Site Diff:3
Youtube:https://www.youtube.com/watch?v=1YrYhS4SHoc
//
Blackstairs
Location:52.532022, -6.842373
Wind 290-330
Site Diff:3
Youtube:https://www.youtube.com/watch?v=WHULL74xYfk
//
Blackwater
Location:52.463019, -6.296025
Wind 90-140
Site Diff:3
Youtube:https://www.youtube.com/watch?v=9aJ19osqRVk
//
Knocknasilloge Bay Beach
Location:52.450102, -6.307974
Wind 90-140
Site Diff:1
Youtube:https://www.youtube.com/watch?v=0rq_vsyj6C4
//
Old Head of Kinsale
Location:51.619034, -8.545797
Wind 210-240
Site Diff:5
Youtube:https://www.youtube.com/watch?v=ox1Bg-8J9C8&t=65s
Youtube:https://www.youtube.com/watch?v=BlHGhtGWZwM
Youtube:hhttps://www.youtube.com/watch?v=aL0TeHqb6rk
//
Inchydoney Beach
Location:51.599029, -8.858881
Wind 140-180
Site Diff:1
Youtube:https://www.youtube.com/watch?v=OlnKeloOBBY
//
Knocknagantee
Location:51.894073, -9.935079
Wind 130-200
Site Diff:5
Youtube:https://www.youtube.com/watch?v=_1EW0QJJL8U
//
Rossbeigh Mountain
Location:52.047600, -9.981986
Wind 320-360
Site Diff:3
Youtube:https://www.youtube.com/watch?v=Hm1c3ZE6PKM
//
Binn Fhaiche
Location:52.238595, -10.223504
Wind 120-170
Site Diff:3
Youtube:https://www.youtube.com/watch?v=oVQLUvJux9c
Youtube:https://www.youtube.com/watch?v=Z1OFQowXKCc
//
Stradbally Beach
Location:52.254627, -10.071163
Wind 290-330
Site Diff:1
Youtube:https://www.youtube.com/watch?v=bCrE_fxpP34
//
Fanore
Location:53.113834, -9.273628
Wind 270-310
Site Diff:3
Youtube:https://www.youtube.com/watch?v=tgpD4n1k3_E&t=131
//
Atlantic Drive
Location:53.897575, -9.992084
Wind 190-230
Site Diff:3
Youtube:https://www.youtube.com/watch?v=97WZrBFQCIw
//
Minaun Heights
Location:53.954746, -10.025487
Wind 100-160
Site Diff:3
Youtube:https://www.youtube.com/watch?v=Z2GIbs178Pg
//
Keel Bay
Location:53.962694, -10.046897
Wind 230-260
Site Diff:3
Youtube:https://www.youtube.com/watch?v=eiS9Y9HaeyY
//
Cliffs of Magho
Location:54.467065, -7.909476
Wind 330-30
Site Diff:4
Youtube:https://www.youtube.com/watch?v=Eb_9LW0n9vw
//
Ballingarraun
Location:52.175008, -10.194766
Wind 160-210
Site Diff:3
Youtube:https://www.youtube.com/watch?v=OG_peDzN3AQ
//
Cave Hill
Location:54.648056, -5.948841
Wind 60-140
Site Diff:4
Youtube:https://www.youtube.com/watch?v=QTLmrnX6wiQ
//
Smerwick
Location:52.151989, -10.349716
Wind 290-330
Site Diff:3
Youtube:https://www.youtube.com/watch?v=QTLmrnX6wiQ
//
Seven Heads Bay
Location:51.597994, -8.702313
Wind 110-130
Site Diff:3
Youtube:https://www.youtube.com/watch?v=54qPGCICok8
//
Ballycoos
Location:54.908072, -5.914561
Wind 50-120
Youtube:
//
Slievenamiskan
Location:54.179290, -6.073534
Wind 285-330
Youtube:
//
Slieve Foye
Location:54.037088, -6.214277
Wind 200-250
Youtube:
`;


/* ======= TYPY / STAN ======= */
type Spot = {
  id:string; name:string; lat:number; lon:number;
  sectorStart:number; sectorEnd:number;
  windRanges?: {start:number;end:number;endExclusive?:boolean}[];
  youtube: string[];
  diff?: number;
  toVerify?: boolean; sourceUrl?: string; reviewGroup?: string;
  reviewState?: 'pending' | 'accepted'; reviewFinalized?: boolean; sourceDirections?: string; reviewNote?: string;
  videoCandidates?:SiteVideo[];
};
let spots: Spot[] = [];
let catalogueSpots: Spot[] = [];
let reviewDecisions: SiteReviewDecisions = {};
let reviewSummary = siteReviewCounts(reviewDecisions);
let reviewUndo: {id:string;previous?:SiteReviewDecision;name:string} | undefined;
let reviewMessage = '';
let reviewSaveError = false;
let siteStackOrder = new Map<string, number>();
let dialMarkers: any[] = [];       // rozety (niższy pane)
let uiMarkers: any[] = [];         // przyciski/menu (wyższy pane)
let miniDialMarkers: any[] = [];   // miniaturowe rozety dla dalekiego zoomu
let sitePanel = buildSitePanel([], () => ({ status: 'loading' }), store.get('timestamp'), store.get('product'));
let availablePointModels: string[] = [];
let forecastModels = forecastModelOptions(availablePointModels, store.get('product'));
let detailModelSync: ReturnType<typeof createDetailModelSync> | undefined;
let modelSyncNote = '';
let modelPreparation = 0;
let modelSelection = 0;
let writingMapProduct = false;
let modelSelectionTask: Promise<void> = Promise.resolve();
const forecastRunCalendars = new Map<string, {productIdent:string;refTimeTs:number}>();
let stopModelRunRefresh: (() => void) | undefined;
let selectedSiteId = '';
let hoveredSiteId = '';
let windUnit: WindUnit = 'mph';
let forecastUtcOffset: number | undefined;
let siteFilters = defaultSiteFilters();
let altitudeEnabled = false;
// Paused pending comparison with refreshed forecasts and observations.
const altitudeAvailable = false;
const altitudePreferenceKey = 'fly-ireland.launch-altitude.v1';
let filteredPanel = scopeSitePanel(sitePanel, siteFilters);
let sitePanelComponent: SitePanel | undefined;
let videoReview=createVideoReview([]);
let videoDecisions:VideoDecisions={};
let videoSummary=videoReview.count(videoDecisions);
let videoSaveError=false;
const windForecast = createWindForecast({
  store,
  getModelCalendar: model => {
    const product = products[model], refTimeTs = Date.parse(product?.minifest?.ref);
    return Number.isFinite(refTimeTs) ? {productIdent:model,refTimeTs} : forecastRunCalendars.get(model) ?? product?.calendar;
  },
  // Keep the finest available series even when the detail table is collapsed
  // or grouped. The returned timestamp grid determines its actual resolution.
  getPointForecast: (spot, abort, model, withLayers = false) => getPointForecastData(model,
    {lat:spot.lat, lon:spot.lon, step:1, extended:true}, {header:true,meteogram:true,airgram:withLayers},
    {abortSignal:abort.signal, timeout:15000}),
  getProfileForecast: (spot, abort) => getMeteogramForecastData('ukv',
    {lat:spot.lat, lon:spot.lon}, {days:'7'},
    {abortSignal:abort.signal, timeout:15000}),
  onChange: updateForecastUI,
});
let stopTimelinePreview: (() => void) | undefined;

const paneDial   = 'windRosePane';
const paneUi     = 'windRoseUiPane';
const paneLabels = 'windRoseLabelsPane';

// „kto był rozetą w poprzednim renderze” — do sterowania animacją
let lastDialVisible = new Set<string>();

/* ======= PARSER ======= */

function parseSpots(txt:string): Spot[] {
  const lines = txt.split('\n').map(l => l.trim());
  const out: Spot[] = [];
  for (let i=0; i<lines.length; i++){
    if (lines[i] !== '//') continue;
    const block:string[] = [];
    let k = i+1;
    while (k < lines.length && lines[k] !== '//') {
      if (lines[k]) block.push(lines[k]);
      k++;
    }

    const name = block[0] || '';
    const locLine  = block.find(l => /^Location:/i.test(l)) || '';
    const windLine = block.find(l => /^Wind\b/i.test(l))     || '';
    const diffLine = block.find(l => /^Site\s*Diff\b/i.test(l)) || '';   // <— DODANE

    const loc  = locLine.match(/Location:\s*([-\d.]+)\s*,\s*([-\d.]+)/i);
    const wind = windLine.match(/Wind\s+(\d+)\s*-\s*(\d+)/i);
    const diffMatch = diffLine.match(/Site\s*Diff\s*:\s*(\d+)/i);        // <— DODANE
    const diff = Math.max(0, Math.min(5, parseInt(diffMatch?.[1] ?? '0', 10))); // <— DODANE

    const ytAll = block
      .filter(l => /^Youtube\b/i.test(l))
      .map(l => l.match(/Youtube:\s*(\S+)/i)?.[1])
      .filter((u): u is string => !!u);

    if (name && loc && wind) {
      out.push({
        id: `${name}-${out.length}`,
        name,
        ...getSiteMetadata(name),
        lat: parseFloat(loc[1]),
        lon: parseFloat(loc[2]),
        sectorStart: parseInt(wind[1],10),
        sectorEnd:   parseInt(wind[2],10),
        youtube: ytAll,
        diff,                                                   // <— DODANE
      });
    }
    i = k-1;
  }
  return out;
}


/* ======= GEOMETRIA ======= */
function normDeg(d:number){ return ((d%360)+360)%360; }
function sweepDeg(start:number, end:number){
  let s=normDeg(start), e=normDeg(end);
  let sw = e - s; if (sw <= 0) sw += 360;
  return { s, e, sw };
}
function arcPath(r:number, startDeg:number, endDeg:number){
  const { s, sw } = sweepDeg(startDeg, endDeg);
  const large = sw > 180 ? 1 : 0;
  const p = (deg:number)=> {
    const rad = (deg - 90)*Math.PI/180;
    return { x: r*Math.cos(rad), y: r*Math.sin(rad) };
  };
  const p0 = p(s), p1 = p(s+sw);
  if(sw === 360){
    const opposite=p(s+180);
    return `M ${p0.x} ${p0.y} A ${r} ${r} 0 0 1 ${opposite.x} ${opposite.y} A ${r} ${r} 0 0 1 ${p0.x} ${p0.y}`;
  }
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${large} 1 ${p1.x} ${p1.y}`;
}
function complementArcPath(r:number, startDeg:number, endDeg:number){
  const { s, e } = sweepDeg(startDeg, endDeg);
  return arcPath(r, e, s); // łuk uzupełniający
}
function sizeForZoom(z:number){
  const zz = Math.max(7, Math.min(16, z || 10));
  return Math.round(160 + (zz - 10) * 18);
}
function buildCollisionComponentsAtZoom(spots: Spot[], targetZoom: number, diameterPx: number, paddingPx: number){
  const n = spots.length;
  const thresh = diameterPx + paddingPx;
  const pts = spots.map(s => map.project(L.latLng(s.lat, s.lon), targetZoom));
  const adj: number[][] = Array.from({length:n}, ()=>[]);
  for (let i=0;i<n;i++){
    for (let j=i+1;j<n;j++){
      const dx = pts[i].x - pts[j].x;
      const dy = pts[i].y - pts[j].y;
      if (Math.hypot(dx,dy) < thresh) { adj[i].push(j); adj[j].push(i); }
    }
  }
  const seen = Array(n).fill(false);
  const comps: number[][] = [];
  for (let i=0;i<n;i++){
    if (seen[i]) continue;
    const q=[i]; seen[i]=true; const comp=[i];
    while (q.length){
      const v=q.shift()!;
      for (const w of adj[v]) if (!seen[w]){ seen[w]=true; q.push(w); comp.push(w); }
    }
    comps.push(comp);
  }
  return { comps };
}
/* ======= PADDING DLA PASKA TRUDNOŚCI (poza rozetą) ======= */
function diffPadForD(D:number){
  const rectH = Math.round(Math.max(6, D * 0.045));
  const gap   = 4;
  const titlePad = Math.round(Math.max(6, D * 0.04)); // dodatkowy pad na napis
  return Math.ceil(rectH/2 + gap + 4 + titlePad);
}

/* ======= STAGGER ======= */
function staggerDelayMs(spot: Spot){
  const v = Math.abs(Math.sin(spot.lat*12.9898 + spot.lon*78.233)) % 1;
  const steps = Math.round(v * 5); // 0..5
  return steps * 40;               // 0–200ms
}

/* ======= GOOGLE MAPS LINK ======= */
function gmapsDirectionsUrl(spot: Spot){
  const dest = `${spot.lat},${spot.lon}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
}

/* ======= ROZETA (HTML) ======= */
function buildDialHTML(spot:Spot, D:number, animate:boolean){
  const R = D/2;
  const pad = diffPadForD(D);          // dodatkowy margines na zewnętrzne prostokąty
  const cx = R + pad, cy = R + pad;    // centrum przesunięte o pad
  const svgW = D + 2*pad;              // większy obszar SVG
  const badge = windBadgeText(spot);
  const arrowScale = D / 250;
  const arrowTip = R - 8 * arrowScale, arrowShoulder = R + 7 * arrowScale, arrowTail = R + 22 * arrowScale;

  const ringR = R*0.985, faceR = R*0.975;
  const arcGapPx = 2;
  const arcR = ringR - (GREEN_SW/2) - arcGapPx;

  const tickOuter = R*0.97, tick10 = R*0.89, tick2 = R*0.94, tick30 = R*0.85;
  const labelR = R*0.74, cardR = R*0.58;

  const okArc = windRanges(spot).map(range=>arcPath(arcR,range.start,range.end)).join(' ');
  const restArc = arcPath(arcR,0,360); // red base; each allowed arc is painted above it

  const ticks2  = Array.from({length:180},(_,i)=>i*2);
  const ticks10 = Array.from({length:36}, (_,i)=>i*10);
  const ticks30 = Array.from({length:12}, (_,i)=>i*30);

  const mkTick = (deg:number, inner:number, outer:number, cls:string)=>{
    const a=(deg-90)*Math.PI/180;
    const x1=cx+inner*Math.cos(a), y1=cy+inner*Math.sin(a);
    const x2=cx+outer*Math.cos(a), y2=cy+outer*Math.sin(a);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
  };
  const t2  = ticks2 .map(d=> d%10? mkTick(d,tick2 ,tickOuter,'tick2'): '').join('');
  const t10 = ticks10.map(d=> d%30? mkTick(d,tick10,tickOuter,'tick10'): '').join('');
  const t30 = ticks30.map(d=> mkTick(d,tick30,tickOuter,'tick30')).join('');
  const labels30 = ticks30.map(d=>{
    const a=(d-90)*Math.PI/180, lx=cx+labelR*Math.cos(a), ly=cy+labelR*Math.sin(a);
    const extra = d===270 ? 'W' : d===90 ? 'E' : '';
    return `<text x="${lx}" y="${ly}" transform="rotate(${d} ${lx} ${ly})" text-anchor="middle" dominant-baseline="central" class="deg">${d}${extra}</text>`;
  }).join('');

  const cross = `
    <line x1="${cx}" y1="${cy - R*0.85}" x2="${cx}" y2="${cy + R*0.85}" class="axis"/>
    <line x1="${cx - R*0.85}" y1="${cy}" x2="${cx + R*0.85}" y2="${cy}" class="axis"/>
  `;
  const cards = `
    <text x="${cx}" y="${cy - cardR}"  text-anchor="middle" class="card">N</text>
    <text x="${cx + cardR}" y="${cy}"  text-anchor="middle" dominant-baseline="middle" class="card">E</text>
    <text x="${cx}" y="${cy + cardR}"  text-anchor="middle" class="card">S</text>
    <text x="${cx - cardR}" y="${cy}"  text-anchor="middle" dominant-baseline="middle" class="card">W</text>
  `;

    /* ======= WSKAŹNIK TRUDNOŚCI (NA ZEWNĄTRZ) ======= */
const MAX_DIFF = 5;
const diffVal = Math.max(0, Math.min(MAX_DIFF, spot.diff ?? 0));

// prostokąty: szersze wzdłuż łuku (tangens), niższe radialnie
const rectW = Math.round(Math.max(12, D * 0.11));
const rectH = Math.round(Math.max(6,  D * 0.045));
const rectGapFromRing = 4;
const rectR = ringR + rectH/2 + rectGapFromRing;

// wachlarz kątów dla prostokątów
const startDeg = -28, endDeg = 28;
const step = (endDeg - startDeg) / (MAX_DIFF - 1);

// NAPIS „Difficulty” — po zewnętrznym łuku, przed 1. prostokątem
const titleAngleStart = startDeg - 50;
const titleAngleEnd   = startDeg - 10;
const titleRadialOffset = rectH/10 + 2;   // odsunięcie poza „klocki”
const titleR = rectR + titleRadialOffset;

const safeSpotId  = String(spot.id).replace(/[^a-zA-Z0-9_-]/g, '');
const titlePathId = `diffArc-${safeSpotId}`;
const titlePathD  = arcPath(titleR, titleAngleStart, titleAngleEnd);

const diffTitleDefs = `<defs>
  <path id="${titlePathId}" d="${titlePathD}" transform="translate(${cx},${cy})"></path>
</defs>`;

const diffTitle = `<text class="diff-title" dominant-baseline="middle" text-anchor="end">
  <textPath href="#${titlePathId}" startOffset="100%"><tspan dx="-3">Site Difficulty</tspan></textPath>
</text>`;


// PROSTOKĄTY (z rotacją po stycznej)
const diffRects = Array.from({ length: MAX_DIFF }, (_, i) => {
  const d = startDeg + i * step;
  const a = (d - 90) * Math.PI / 180;
  const cxr = cx + rectR * Math.cos(a);
  const cyr = cy + rectR * Math.sin(a);
  const x = cxr - rectW/2;
  const y = cyr - rectH/2;
  const active = i < diffVal ? ' active' : '';
  return `<rect x="${x}" y="${y}" width="${rectW}" height="${rectH}"
                rx="${Math.max(2, rectH*0.3)}" ry="${Math.max(2, rectH*0.3)}"
                class="diff-rect${active}" transform="rotate(${d} ${cxr} ${cyr})" />`;
}).join('');


  const animClasses = animate ? ' animate-pre animate-arm' : '';

    return `
  <div class="wr wr-dial${animClasses}" data-spot-id="${spot.id}">
    <svg width="${svgW}" height="${svgW}" viewBox="0 0 ${svgW} ${svgW}" class="dial">
      ${diffTitleDefs}

      <circle cx="${cx}" cy="${cy}" r="${ringR}" class="ring"/>
      <circle cx="${cx}" cy="${cy}" r="${faceR}" class="face" style="fill-opacity:${faceOpacity}"/>

      <!-- CZERWONY łuk (uzupełnienie) — animowany, cieńszy -->
      <g transform="translate(${cx},${cy})">
        <path d="${restArc}" class="rest-arc draw-arc-red" style="stroke-width:${RED_SW}px"/>
      </g>

      <!-- ZIELONY łuk (zakres OK) — animowany -->
      <g transform="translate(${cx},${cy})">
        <path d="${okArc}" class="use-arc draw-arc" style="stroke-width:${GREEN_SW}px"/>
      </g>

      ${cross}
      ${t2}${t10}${t30}
      ${labels30}
      ${cards}

      <!-- PASEK TRUDNOŚCI NA ZEWNĄTRZ -->
      ${diffTitle}
      <g class="diff">${diffRects}</g>

      <g transform="translate(${cx},${cy})">
        <circle class="large-wind-center forecast-wind-center" r="${D * 0.13}" fill="${badge.color}"/>
        <text class="large-wind-reading forecast-wind-reading" x="0" y="-1" text-anchor="middle" style="font-size:${Math.round(D * 0.088)}px">${badge.speedText}</text>
        <text class="large-wind-unit forecast-wind-unit" x="0" y="${D * 0.07}" text-anchor="middle" style="font-size:${Math.round(D * 0.052)}px">${windUnit}</text>
        <g class="large-wind-direction forecast-wind-direction" transform="rotate(${badge.directionFrom ?? 0})" visibility="${badge.directionFrom === null ? 'hidden' : 'visible'}">
          <path d="M 0 ${-arrowTip} L ${-12 * arrowScale} ${-arrowShoulder} L ${-4 * arrowScale} ${-arrowShoulder} L ${-4 * arrowScale} ${-arrowTail} L ${4 * arrowScale} ${-arrowTail} L ${4 * arrowScale} ${-arrowShoulder} L ${12 * arrowScale} ${-arrowShoulder} Z"/>
        </g>
      </g>
    </svg>
    <div class="title">${spot.name}</div>
  </div>`;

}


/* ======= MENU YT + MAPS + (NOWE) INFO ======= */
function buildMenuHTML(spot:Spot, D:number){
  const BTN_SIZE = 34;
  // Leave space for the dial padding and site name above the action bar.
  const actionsTop = D + diffPadForD(D) + 28;
  const videos = (spot.youtube ?? []).slice(0, 8);
  const ytButtons = videos.map((url, index) => {
    const number = videos.length > 1 ? `<span class="video-number" aria-hidden="true">${index + 1}</span>` : '';
    const candidate = spot.videoCandidates?.find(video => video.url === url);
    if (candidate) return mapVideoButtonHTML({...spot, videoCandidates:[candidate]}).replace('</a>', `${number}</a>`);
    return `<a class="yt-btn yt-main" href="${url}" target="_blank" rel="noopener noreferrer"
        title="YouTube ${index + 1}: ${spot.name}" aria-label="YouTube ${index + 1}: ${spot.name}">
      <svg viewBox="0 0 24 18" width="22" height="18" aria-hidden="true"><rect width="24" height="18" rx="4" fill="#e62117"/><path d="M9 4.5 17 9 9 13.5Z" fill="#fff"/></svg>${number}</a>`;
  }).join('');
  const ytMenu = ytButtons ? `<div class="rose-videos" role="group" aria-label="Site videos">${ytButtons}</div>` : '';

  const mapsUrl = gmapsDirectionsUrl(spot);
  const mapsMenu = `
    <div class="gmaps-menu"
         style="--gm-size:${BTN_SIZE}px"
         data-spot-id="${spot.id}">
      <a class="gmaps-btn gmaps-main"
         href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
         title="Directions to: ${spot.name}" aria-label="Directions to: ${spot.name}">
        <svg viewBox="0 0 24 24" width="calc(var(--gm-size) - 2px)" height="calc(var(--gm-size) - 2px)" aria-hidden="true">
          <path d="M12 2c-3.3 0-6 2.65-6 5.92 0 4.43 6 13.16 6 13.16s6-8.73 6-13.16C18 4.65 15.3 2 12 2zm0 8.3a2.38 2.38 0 1 1 0-4.76 2.38 2.38 0 0 1 0 4.76z"/>
        </svg>
      </a>
    </div>
  `;

  const infoMenu = `
    <div class="info-menu"
         style="--info-size:${BTN_SIZE}px"
         data-spot-id="${spot.id}">
      <button class="info-btn info-main" type="button" title="Show site information: ${spot.name}" aria-label="Show site information: ${spot.name}">
        <svg viewBox="0 0 24 24" width="calc(var(--info-size) - 2px)" height="calc(var(--info-size) - 2px)" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <rect x="11" y="10" width="2" height="7" rx="1"></rect>
          <rect x="11" y="6"  width="2" height="2" rx="1"></rect>
        </svg>
      </button>
    </div>
  `;

  return `
    <div class="wr wr-ui" style="width:${D}px; height:${actionsTop + 46}px" data-spot-id="${spot.id}">
      <div class="rose-actions" style="top:${actionsTop}px" role="group" aria-label="Site actions">
        ${ytMenu}
        ${mapsMenu}
        ${infoMenu}
      </div>
    </div>
  `;
}

/* ======= ANIMACJE ======= */
function runDialAnimation(marker:any, delay:number, spotId:string){
  const root = marker.getElement?.() as HTMLElement;
  if (!root) return;

  const dialWrap = root.querySelector('.wr-dial') as HTMLElement;
  if (!dialWrap || !dialWrap.classList.contains('animate-pre')) return;

  // wejście wrappera
  dialWrap.getBoundingClientRect();
  requestAnimationFrame(() => {
    setTimeout(() => dialWrap.classList.remove('animate-pre'), delay);
  });

  const green = root.querySelector('.draw-arc') as SVGPathElement;
  const red   = root.querySelector('.draw-arc-red') as SVGPathElement;

  const prepDash = (el: SVGPathElement | null) => {
    if (!el || typeof el.getTotalLength !== 'function') return null;
    const len = el.getTotalLength();
    el.style.transition = 'none';
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    return len;
  };

  const lenG = prepDash(green);
  const lenR = prepDash(red);

  const greenStartAt = delay + GREEN_PRE_LAG;
  if (lenG !== null){
    setTimeout(() => {
      requestAnimationFrame(() => {
        green!.style.transition = `stroke-dashoffset ${GREEN_ANIM_MS}ms ease`;
        green!.style.strokeDashoffset = '0';
      });
    }, greenStartAt);
  }

  const startRed = () => {
    if (lenR === null) return;
    requestAnimationFrame(() => {
      red!.style.transition = `stroke-dashoffset ${RED_ANIM_MS}ms ease`;
      red!.style.strokeDashoffset = '0';
    });
  };

  if (green){
    let redLaunched = false;
    const onEnd = (ev: TransitionEvent) => {
      if (ev.propertyName === 'stroke-dashoffset' && !redLaunched){
        redLaunched = true;
        green.removeEventListener('transitionend', onEnd);
        startRed();
      }
    };
    green.addEventListener('transitionend', onEnd);

    // Fallback
    setTimeout(() => {
      if (!redLaunched){
        redLaunched = true;
        green.removeEventListener('transitionend', onEnd);
        startRed();
      }
    }, greenStartAt + GREEN_ANIM_MS + RED_START_SLACK);
  }
}

function triggerYoutubePop(spotId:string){
  const root = document.querySelector(`[data-spot-id="${spotId}"]`) as HTMLElement | null;
  if (!root) return;
  const btns = root.querySelectorAll('.yt-main, .gmaps-main') as NodeListOf<HTMLElement>;
  btns.forEach(btn => {
    btn.classList.remove('pop-spin'); void btn.offsetWidth; btn.classList.add('pop-spin');
  });
}

/* ======= SPRZĄTANIE ======= */
function clearDials(){ dialMarkers.forEach(m=>m.remove()); dialMarkers=[]; }
function clearUi(){ uiMarkers.forEach(m=>m.remove()); uiMarkers=[]; }
function clearMiniDials(){ miniDialMarkers.forEach(m=>m.remove()); miniDialMarkers=[]; }

/* ======= PANE ======= */
function ensurePanes(){
  if (!map.getPane(paneDial)) {
    const p = map.createPane(paneDial);
    p.style.zIndex = '900';
    p.style.pointerEvents = 'none';
  }
  if (!map.getPane(paneUi)) {
    const p = map.createPane(paneUi);
    p.style.zIndex = '901';
    p.style.pointerEvents = 'auto';
  }
  if (!map.getPane(paneLabels)) {
    const p = map.createPane(paneLabels);
    p.style.zIndex = '902';
    p.style.pointerEvents = 'auto';
  }
}

/* ======= WIDOCZNE GRANICE MAPY (z buforem px) ======= */
function getPaddedLatLngBounds(padPx:number){
  const pb = map.getPixelBounds();
  // Leaflet GL accepts coordinate pairs; the old L.point factory is unavailable.
  const min = [pb.min.x - padPx, pb.min.y - padPx];
  const max = [pb.max.x + padPx, pb.max.y + padPx];
  const sw = map.unproject(min, map.getZoom());
  const ne = map.unproject(max, map.getZoom());
  return L.latLngBounds(sw, ne);
}

/* ======= DODAWANIE MARKERÓW ======= */
function addDial(s: Spot, D: number, animate:boolean){
  if (s.toVerify) { addReviewMarker(s); return; }
  const html = weatherMarkerHTML(s, D) + gustMarkerHTML(s, D) + buildDialHTML(s, D, animate);
  const pad = diffPadForD(D);
  const svgW = D + 2*pad;

  const icon = L.divIcon({
    className: 'wind-rose-icon dial-icon',
    html,
    iconSize: [svgW, svgW + 24],   // większe pudełko na powiększony SVG
    iconAnchor: [svgW/2, svgW/2],  // kotwica w środku powiększonego obrazka
  });

  const m = L.marker([s.lat, s.lon], { icon, interactive:false, pane:paneDial, title:windBadgeText(s).title }).addTo(map);
  m.flySpot = s;
  updateWeatherIndicator(m);
  updateWindIndicator(m);
  applySiteHighlight(m);
  dialMarkers.push(m);
  if (animate){
    const delay = staggerDelayMs(s);
    setTimeout(() => runDialAnimation(m, delay, s.id), 0);
  }
}

function addUiMenu(s: Spot, D: number){
  if (s.toVerify) return;
  const html = buildMenuHTML(s, D);
  const icon = L.divIcon({
    className: 'wind-rose-icon ui-icon',
    html,
    iconSize: [D, D + diffPadForD(D) + 74],
    iconAnchor: [D/2, D/2],
  });
  const m = L.marker([s.lat, s.lon], { icon, interactive:true, pane:paneUi, title:windBadgeText(s).title }).addTo(map);
  m.flySpot = s;
  bindCardNavigation(m);
  applySiteHighlight(m);
  uiMarkers.push(m);
}
function windBadgeText(s: Spot){
  const reading = windForecast.get(s);
  const gust = gustWarningDisplay(reading,windUnit);
  const modelLabel = forecastModelLabel(reading.model ?? windForecast.getModel());
  let label = `Loading ${modelLabel}…`;
  let color = '#94a3b8';
  let speedText = '…';
  let directionFrom: number | null = null;
  let detail = '';
  if (reading.status === 'settings') {
    label = 'Select a weather model / Wind';
    speedText = '—';
  } else if (reading.status === 'unavailable') {
    label = reading.windMode === 'altitude' ? 'No height estimate' : `No ${modelLabel} data`;
    speedText = '—';
  } else if (reading.status === 'pass' || reading.status === 'fail') {
    label = reading.status === 'pass' ? 'Wind OK' : reading.reason === 'too-light' ? 'Too light'
      : reading.reason === 'too-strong' ? 'Too strong' : 'Direction outside range';
    color = reading.status === 'pass' ? '#15803d' : reading.reason === 'too-light' ? '#2563eb'
      : reading.reason === 'too-strong' ? '#b91c1c' : '#c2410c';
    const direction = Number.isFinite(reading.direction) ? `${Math.round(reading.direction) % 360}°` : 'Calm';
    detail = `${modelLabel} · ${formatWindSpeed(reading.mph,windUnit)} · ${direction}`;
    speedText = convertWindSpeed(reading.mph,windUnit).toFixed(1);
    if (reading.mph > 0 && Number.isFinite(reading.direction)) directionFrom = reading.direction;
  }
  detail += `${detail ? ' · ' : ''}${windLevelLabel(reading.level ?? store.get('level'))}`;
  if (Number.isFinite(reading.levelHeightM)) detail += ` · ${Math.round(reading.levelHeightM)} m ASL`;
  if (reading.levelNote) detail += ` · ${reading.levelNote}`;
  if (reading.windMode === 'altitude') {
    detail += ` · Launch-height estimate${Number.isFinite(reading.targetHeightM) ? ` at ${Math.round(reading.targetHeightM)} m ASL` : ''}`;
    if (Number.isFinite(reading.surfaceMph)) detail += ` · Surface ${formatWindSpeed(reading.surfaceMph,windUnit)}`;
    if (reading.altitudeNote) detail += ` · ${reading.altitudeNote}`;
  }
  const date = Number.isFinite(reading.timestamp)
    ? formatForecastTime(reading.timestamp,forecastUtcOffset)
    : '';
  return {
    color, speedText, directionFrom, gust,
    title: `${s.name}: ${formatWindRanges(s)}\n${label}${detail ? ` · ${detail}` : ''}${gust.active ? `\n${gust.description}` : ''}\n${date}\n${weatherDisplay(reading).description}\n${rainDisplay(reading).description}\n${cloudBaseDisplay(reading).description}\nWind criteria: ${windSpeedRange(windUnit)} and direction within the site range. Gusts and rain do not change the wind filter.`,
  };
}

function weatherMarkerHTML(spot: Spot, diameter?: number){
  const weather = weatherDisplay(windForecast.get(spot));
  const sky = weatherIconUrl(weather,iconsDir);
  const center = diameter ? diameter / 2 + diffPadForD(diameter) : 0;
  const position = diameter ? ` style="left:${center + diameter * 0.18}px;top:${center - diameter * 0.18}px;--weather-size:${Math.round(diameter * 0.19)}px"` : '';
  return `<span class="map-weather-indicators"${position}><img class="map-weather-icon" style="display:${sky ? 'block' : 'none'}" ${sky ? `src="${sky}"` : ''} alt="Forecast weather" title="${weather.description}"/></span>`;
}

function gustMarkerHTML(spot: Spot, diameter?: number){
  const warning = gustWarningDisplay(windForecast.get(spot),windUnit);
  const center = diameter ? diameter / 2 + diffPadForD(diameter) : 0;
  const size = diameter ? Math.max(24,Math.round(diameter * 0.1)) : 20;
  const position = diameter ? `left:${center + diameter * 0.49 - size / 2}px;top:${center + diameter * 0.25 - size / 2}px;--gust-warning-size:${size}px;` : '';
  return `<span class="map-gust-warning" data-severity="${warning.severity}" role="img" aria-label="${warning.description || 'Gusts'}" title="${warning.description}" style="${position}display:${warning.active ? 'flex' : 'none'}">${GUST_WARNING_SVG}</span>`;
}

function updateWindIndicator(marker: any){
  if (marker.flySpot?.toVerify) return;
  const root = marker.getElement?.();
  const center = root?.querySelector('.forecast-wind-center');
  const text = root?.querySelector('.forecast-wind-reading');
  const unit = root?.querySelector('.forecast-wind-unit');
  const arrow = root?.querySelector('.forecast-wind-direction');
  if (!center || !text) return;
  const content = windBadgeText(marker.flySpot);
  center.setAttribute('fill', content.color);
  text.textContent = content.speedText;
  if (unit) unit.textContent = windUnit;
  arrow?.setAttribute('transform', `rotate(${content.directionFrom ?? 0})`);
  arrow?.setAttribute('visibility', content.directionFrom === null ? 'hidden' : 'visible');
  const warning = root.querySelector('.map-gust-warning');
  if (warning) {
    warning.style.display = content.gust.active ? 'flex' : 'none';
    warning.title = content.gust.description;
    warning.setAttribute('aria-label',content.gust.description || 'Gusts');
    warning.setAttribute('data-severity',content.gust.severity);
  }
  root.title = content.title;
}

function updateWeatherIndicator(marker: any){
  if (marker.flySpot?.toVerify) return;
  const root = marker.getElement?.();
  const icon = root?.querySelector('.map-weather-icon');
  if (icon) {
    const weather = weatherDisplay(windForecast.get(marker.flySpot));
    const source = weatherIconUrl(weather,iconsDir);
    icon.title = weather.description;
    icon.style.display = source ? 'block' : 'none';
    if (source && icon.getAttribute('src') !== source) icon.setAttribute('src',source);
    if (!source) icon.removeAttribute('src');
  }
}

let cancelSiteForecastOpen: (() => void) | undefined;

function openSiteForecast(spot: Spot){
  cancelSiteForecastOpen?.();
  const matches = (location: any) => location?.name === spot.name
    && Math.abs(location.lat - spot.lat) <= 0.00051 && Math.abs(location.lon - spot.lon) <= 0.00051;
  const cancel = () => {
    store.off('detailLocation', onLocation);
    broadcast.off('rqstOpen', onOpen);
    broadcast.off('rqstClose', onClose);
    if (cancelSiteForecastOpen === cancel) cancelSiteForecastOpen = undefined;
  };
  const onLocation = () => {
    const location = store.get('detailLocation');
    if (!location) return;
    cancel();
    // Windy's rendered forecast recentres external opens. This selection only
    // changes the forecast location; navigation belongs to the sidebar card.
    if (matches(location) && location.externalOpen) {
      store.set('detailLocation', {...location, externalOpen:false});
    }
  };
  const onOpen = (name: string, location: any) => { if (name !== 'detail' || !matches(location)) cancel(); };
  const onClose = (name: string) => { if (name === 'detail') cancel(); };
  cancelSiteForecastOpen = cancel;
  store.on('detailLocation', onLocation);
  broadcast.on('rqstOpen', onOpen);
  broadcast.on('rqstClose', onClose);
  broadcast.emit('rqstOpen', 'detail', {
    lat: spot.lat, lon: spot.lon, name: spot.name,
    product: windForecast.getModel(), source:'other',
  });
}

function selectSite(id: string){
  selectedSiteId = id;
  refreshSiteHighlights();
}

function bindCardNavigation(marker: any){
  marker.getElement?.()?.addEventListener('click', (event: MouseEvent) => {
    const control = (event.target as Element)?.closest?.('a,button');
    if (control && !control.matches?.('.info-main')) {event.stopPropagation();return;}
    event.stopPropagation();
    selectSite(marker.flySpot.id);
    sitePanelComponent?.revealSite(marker.flySpot.id);
    highlightSite(marker.flySpot.id);
    openSiteForecast(marker.flySpot);
  });
}

function focusSite(spot: Spot){
  selectSite(spot.id);
  // A card may point outside the rendered viewport. Attach its rose before
  // moving the map, using the forecast that is already cached for every site.
  if (![...miniDialMarkers, ...dialMarkers].some(marker => marker.flySpot.id === spot.id)) {
    ensurePanes();
    if (map.getZoom() < minZoomToShow || spot.toVerify) addMiniDial(spot);
    else {
      addDial(spot, sizeForZoom(map.getZoom()), false);
      addUiMenu(spot, sizeForZoom(map.getZoom()));
    }
  }
  map.setView([spot.lat, spot.lon], Math.max(12, map.getZoom()), {
    animate:true, duration:650, easeLinearity:0.25,
  });
}

function applySiteHighlight(marker: any){
  const root = marker.getElement?.();
  if (!root) return;
  root.style.setProperty('--site-stack-order', String(siteStackOrder.get(marker.flySpot?.id) ?? 0));
  root.classList.toggle('site-hovered', marker.flySpot?.id === hoveredSiteId);
  root.classList.toggle('site-selected', marker.flySpot?.id === selectedSiteId);
}

function refreshSiteHighlights(){
  for (const marker of [...miniDialMarkers, ...dialMarkers, ...uiMarkers]) applySiteHighlight(marker);
}

function highlightSite(id: string){
  hoveredSiteId = id;
  refreshSiteHighlights();
}

function onMapClick(event: any){
  if (event?.originalEvent?.target?.closest?.('.wind-rose-icon')) return;
  if (!selectedSiteId && !hoveredSiteId) return;
  selectedSiteId = '';
  highlightSite('');
}

function setSiteFilter(filter: SiteFilters['wind']){
  setSiteFilters({...siteFilters,wind:filter});
}

function setSiteFilters(filters: SiteFilters){
  siteFilters = normalizeSiteFilters(filters);
  saveSiteFilters(siteFilters);
  filteredPanel = scopeSitePanel(sitePanel, siteFilters);
  const shown = sitesForView(filteredPanel,siteFilters.wind);
  if (!shown.some(site => site.id === hoveredSiteId)) highlightSite('');
  scheduleRender(0);
}

function refreshReviewedSites(){
  spots = applyVideoDecisions([...catalogueSpots,...applySiteReview(reviewDecisions)],videoDecisions);
  reviewSummary = siteReviewCounts(reviewDecisions);
  videoSummary = videoReview.count(videoDecisions);
  if (!spots.some(spot=>spot.id===selectedSiteId)) selectedSiteId='';
  if (!spots.some(spot=>spot.id===hoveredSiteId)) hoveredSiteId='';
  updateForecastUI();
  // Review choices affect locations only. Keep the existing forecast cache,
  // subscriptions and request queue intact while changing a marker's status.
  scheduleRender(0);
}

function decideReview(id: string, decision?: SiteReviewDecision){
  const candidate=paraglidingMapReviewCandidates.find(spot=>spot.id===id);
  if (!candidate) return;
  const latest=reviewSaveError?reviewDecisions:readSiteReview(undefined,reviewDecisions);
  if (latest[id]===decision) {
    reviewDecisions=latest;
    refreshReviewedSites();
    return;
  }
  reviewUndo={id,previous:latest[id],name:candidate.name};
  reviewDecisions=setSiteReviewDecision(latest,id,decision);
  reviewSaveError=!saveSiteReview(reviewDecisions);
  reviewMessage=`${decision==='accepted'?'Accepted':decision==='rejected'?'Rejected':'Reopened'}: ${candidate.name}`;
  refreshReviewedSites();
}

function undoReview(){
  if (!reviewUndo) return;
  const previous=reviewUndo;
  const latest=reviewSaveError?reviewDecisions:readSiteReview(undefined,reviewDecisions);
  reviewDecisions=setSiteReviewDecision(latest,previous.id,previous.previous);
  reviewSaveError=!saveSiteReview(reviewDecisions);
  reviewMessage=`Decision undone: ${previous.name}`;
  reviewUndo=undefined;
  refreshReviewedSites();
}

function exportReview(){
  const payload=JSON.stringify(exportSiteReview(reviewDecisions),null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
  const link=document.createElement('a');
  link.href=url;
  link.download=`fly-ireland-site-review-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function onReviewStorage(event: StorageEvent){
  if(event.key===VIDEO_REVIEW_STORAGE_KEY||event.key===null){
    videoDecisions=videoReview.read();videoSaveError=false;refreshReviewedSites();
    if(event.key!==null)return;
  }
  if (event.key!==SITE_REVIEW_STORAGE_KEY&&event.key!==null) return;
  reviewDecisions=readSiteReview();
  reviewUndo=undefined;
  reviewMessage='Review decisions updated from another tab.';
  reviewSaveError=false;
  refreshReviewedSites();
}

function decideVideo(id:string,url:string,decision?:VideoDecision){
  const latest=videoSaveError?videoDecisions:videoReview.read(undefined,videoDecisions);
  videoDecisions=videoReview.set(latest,id,url,decision);
  videoSaveError=!videoReview.save(videoDecisions);
  refreshReviewedSites();
}

function exportVideos(){
  const payload=JSON.stringify(videoReview.export(videoDecisions),null,2);
  const url=URL.createObjectURL(new Blob([payload],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;
  link.download=`fly-ireland-video-review-${new Date().toISOString().slice(0,10)}.json`;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function setAltitudeEnabled(enabled: boolean){
  altitudeEnabled = altitudeAvailable && enabled;
  try { localStorage.setItem(altitudePreferenceKey, String(altitudeEnabled)); } catch { /* Storage may be blocked. */ }
  windForecast.setAltitudeEnabled(altitudeEnabled);
}

function setWindUnit(value: unknown){
  windUnit = normalizeWindUnit(value);
  saveWindUnit(windUnit);
  updateForecastUI();
}

function setForecastModel(value: unknown){
  if (!pointModelSupported(value) || !forecastModels.some(model => model.id === value)) return;
  const token = ++modelSelection;
  selectPointModel(value);
  // Windy's asynchronous product setter has no stale-result guard. Serialize
  // our writes and skip superseded choices before operating native Source.
  modelSelectionTask = modelSelectionTask.catch(() => {}).then(async () => {
    if (!mounted || token !== modelSelection) return;
    try {
      writingMapProduct = true;
      // Meteoblue has no raster product to display on the map.
      if (value !== 'mblue' && store.get('product') !== value) await store.set('product', value);
    } catch {
      if (mounted && token === modelSelection) modelSyncNote = `Could not switch the map to ${forecastModelLabel(value)}.`;
    } finally { writingMapProduct = false; }
    if (mounted && token === modelSelection) detailModelSync?.select(value);
  });
  return modelSelectionTask;
}

function selectPointModel(model: string){
  const token = ++modelPreparation;
  windForecast.setPointModel(model);
  if (model === 'mblue') return;
  const product = products[model];
  const preparation = product?.loadMinifest?.();
  if (preparation) void preparation.then(minifest => {
    if (!mounted || token !== modelPreparation) return;
    const refTimeTs = Date.parse(minifest?.ref);
    if (Number.isFinite(refTimeTs)) forecastRunCalendars.set(model,{productIdent:model,refTimeTs});
    windForecast.refreshModel();
  }).catch(() => {
    if (mounted && token === modelPreparation) modelSyncNote = `Could not load ${forecastModelLabel(model)}. Select another model and try again.`;
  });
}

function isMapFallback(model: string, mapModel: string){
  const product = products[model];
  return product?.preferredProduct === mapModel && product?.boundsAreInViewport?.(map) === false;
}

function onMapModelChange(){
  if (writingMapProduct) return;
  const model = windForecast.getModel(), mapModel = store.get('product');
  if (detailModelSync?.getRequestedModel?.() === model) return;
  if (mapModel !== model && detailModelSync?.getNativeModel() !== model && !isMapFallback(model,mapModel)) {
    modelPreparation++;
    windForecast.setPointModel(undefined);
  }
}

function updateForecastUI(){
  const previousMatches = filteredPanel.sites.map(spot => spot.id).join('|');
  forecastUtcOffset = windForecast.getTimelineSeries()?.header?.utcOffset;
  sitePanel = buildSitePanel(spots, spot => windForecast.get(spot), windForecast.getTimestamp(), windForecast.getModel(),windUnit,store.get('level'),forecastUtcOffset);
  forecastModels = forecastModelOptions(availablePointModels, sitePanel.model);
  filteredPanel = scopeSitePanel(sitePanel, siteFilters);
  // Only redraw the filtered map when membership changes, not on gust updates.
  if (siteFilters.wind === 'matched' && previousMatches !== filteredPanel.sites.map(spot => spot.id).join('|')) {
    scheduleRender(0);
  }
  for (const marker of [...miniDialMarkers, ...dialMarkers]) {
    updateWeatherIndicator(marker);
    updateWindIndicator(marker);
  }
  for (const marker of uiMarkers) {
    const root = marker.getElement?.();
    if (root) root.title = windBadgeText(marker.flySpot).title;
  }
}

function addReviewMarker(s: Spot){
  const accepted=s.reviewState==='accepted';
  const source=s.sourceUrl?.includes('paraglidingmap.com')?'Paragliding Map':'Flybubble';
  const icon = L.divIcon({className:`wind-rose-icon review-site-icon${accepted?' review-accepted':''}`,
    html:`<span class="review-site-pin">${accepted?'✓':'?'}</span>${map.getZoom() >= minZoomToShow ? `<span class="review-site-name">${s.name}</span>` : ''}`,
    iconSize:[34,34],iconAnchor:[17,17]});
  const marker = L.marker([s.lat,s.lon],{icon,interactive:true,pane:paneLabels}).addTo(map);
  marker.flySpot = s;
  const element = marker.getElement?.();
  if (element) {
    element.dataset.siteId=s.id;
    element.title = `${s.name} — ${accepted?'Location accepted':'To verify'} (${source})\n${s.lat.toFixed(5)}, ${s.lon.toFixed(5)}\nLocation preview · wind criteria not assessed`;
    bindCardNavigation(marker);
  }
  applySiteHighlight(marker);
  miniDialMarkers.push(marker);
}

function addMiniDial(s: Spot){
  if (s.toVerify) { addReviewMarker(s); return; }
  const badge = windBadgeText(s);
  const range = windRanges(s).map(({start,end})=>sweepDeg(start,end).sw === 360
    ? '<circle r="13" class="mini-wind-range"/>'
    : `<path d="${arcPath(13,start,end)}" class="mini-wind-range"/>`).join('');
  const html = `${weatherMarkerHTML(s)}${gustMarkerHTML(s)}
    <svg class="mini-wind-rose" viewBox="0 0 36 36" width="54" height="54" aria-hidden="true">
      <circle cx="18" cy="18" r="15.5" fill="rgba(255,255,255,.92)" stroke="#334155" stroke-width="1"/>
      <g transform="translate(18,18)">
        <circle class="mini-wind-center forecast-wind-center" r="10.5" fill="${badge.color}"/>
        <circle r="13" fill="none" stroke="#e6a0a0" stroke-width="3"/>
        ${range}
        <path d="M 0 -16 L 0 -14 M 14 0 L 16 0 M 0 14 L 0 16 M -16 0 L -14 0"
              fill="none" stroke="#334155" stroke-width="1"/>
        <text class="mini-wind-reading forecast-wind-reading" x="0" y="1" text-anchor="middle">${badge.speedText}</text>
        <text class="mini-wind-unit forecast-wind-unit" x="0" y="6.5" text-anchor="middle">${windUnit}</text>
        <!-- Positioned on the wind-FROM side, pointing inward toward the site. -->
        <g class="mini-wind-direction forecast-wind-direction" transform="rotate(${badge.directionFrom ?? 0})"
           visibility="${badge.directionFrom === null ? 'hidden' : 'visible'}">
          <path d="M 0 -17 L -4 -23 L -1.5 -23 L -1.5 -26 L 1.5 -26 L 1.5 -23 L 4 -23 Z"/>
        </g>
      </g>
    </svg>`;
  const icon = L.divIcon({
    className: 'wind-rose-icon mini-dial-icon',
    html,
    iconSize: [54, 54],
    iconAnchor: [27, 27],
  });
  const m = L.marker([s.lat, s.lon], {
    icon, interactive:true, keyboard:false, bubblingMouseEvents:false, pane:paneUi,
    title: badge.title,
  }).addTo(map);
  m.flySpot = s;
  bindCardNavigation(m);
  updateWeatherIndicator(m);
  applySiteHighlight(m);
  miniDialMarkers.push(m);
}

/* ======= RENDER GŁÓWNY (widoczne + kolizje) ======= */
function renderAll(){
  const z = map.getZoom();
  const D = sizeForZoom(z);
  ensurePanes();

  // 1) granice ekranu z buforem
  const padded = getPaddedLatLngBounds(VIEWPORT_PAD_PX);
  // 2) odfiltruj tylko widoczne spoty (+ pad)
  const viewportSpots = spots.filter(s => s.id === selectedSiteId || padded.contains([s.lat, s.lon]));
  const selectedSites = sitesForView(filteredPanel,siteFilters.wind);
  const selectedIds = new Set(selectedSites.map(spot => spot.id));
  const visibleSpots = viewportSpots.filter(spot => selectedIds.has(spot.id));

  const currentDialVisible = new Set<string>();

  // miniaturowe rozety (daleki zoom)
  if (z < minZoomToShow) {
    lastDialVisible = new Set();
    clearDials(); clearUi(); clearMiniDials();
    for (const s of visibleSpots) addMiniDial(s);
    return;
  }

  // rozety + kolizje, ale tylko dla widocznych spotów
  clearMiniDials(); clearDials(); clearUi();

  const { comps } = buildCollisionComponentsAtZoom(visibleSpots, z, D, collisionPadPx);
  for (const comp of comps){
    if (comp.length === 1){
      const s = visibleSpots[comp[0]];
      currentDialVisible.add(s.id);
      const shouldAnimate = s.id !== selectedSiteId && !lastDialVisible.has(s.id);
      addDial(s, D, shouldAnimate);
      addUiMenu(s, D);
    } else {
      // Keep crowded sites clickable without bringing label cards back.
      for (const idx of comp) addMiniDial(visibleSpots[idx]);
    }
  }

  lastDialVisible = currentDialVisible;
}

/* ======= DEBOUNCE RENDER ======= */
let _renderT: any = null;
let mounted = false;
function scheduleRender(delay=80){
  if (!mounted) return;
  if (_renderT !== null) clearTimeout(_renderT);
  _renderT = setTimeout(() => {
    _renderT = null;
    if (mounted) renderAll();
  }, delay);
}

/* ======= SUBSKRYPCJE ======= */
function onZoomEnd(){ scheduleRender(60); }
function onMoveEnd(){ scheduleRender(80); }

/* ======= START ======= */
onMount(() => {
  windUnit = readWindUnit();
  siteFilters = readSiteFilters();
  try { altitudeEnabled = localStorage.getItem(altitudePreferenceKey) === 'true'; } catch { altitudeEnabled = false; }
  setAltitudeEnabled(altitudeEnabled);
  catalogueSpots = [...parseSpots(spotText), ...flybubbleSites,...approvedParaglidingMapSites];
  reviewDecisions = readSiteReview();
  reviewSummary = siteReviewCounts(reviewDecisions);
  videoReview=createVideoReview(catalogueSpots);
  videoDecisions=videoReview.read();videoSummary=videoReview.count(videoDecisions);
  spots = applyVideoDecisions([...catalogueSpots,...applySiteReview(reviewDecisions)],videoDecisions);
  // Introduce the new review once; subsequent reloads retain the user's view.
  let firstReview=paraglidingMapReviewCandidates.length>0;
  try { firstReview=firstReview&&localStorage.getItem(SITE_REVIEW_STORAGE_KEY)===null; } catch { /* Report blocked persistence below. */ }
  if(firstReview){
    siteFilters={...defaultSiteFilters(),wind:'review'};
    saveSiteFilters(siteFilters);
    reviewSaveError=!saveSiteReview(reviewDecisions);
  }
  // Leaflet's default rounded screen-Y ordering flips nearby sites between
  // ties and different pixel rows during zoom. Keep one geographic order for
  // the entire catalogue, independent of zoom, viewport, filters and readings.
  siteStackOrder = new Map([...catalogueSpots,...paraglidingMapReviewCandidates].sort((a,b) => b.lat-a.lat || a.lon-b.lon || a.id.localeCompare(b.id,'en'))
    .map((spot,index) => [spot.id,index+1]));
  // Coverage checks use Windy's local model metadata, not forecast requests.
  // Offer products for the whole catalog regardless of map position/filters.
  availablePointModels = [...new Set(spots.flatMap(spot => getAllPointProducts({lat:spot.lat,lon:spot.lon})))];
  forecastModels = forecastModelOptions(availablePointModels, store.get('product'));
  // Retire a persisted preview-only view once all candidates are activated.
  if(siteFilters.wind === 'review' && !spots.some(spot=>spot.toVerify&&!spot.reviewFinalized)){
    siteFilters = {...siteFilters,wind:'all'};
    saveSiteFilters(siteFilters);
  }
  if(siteFilters.wind==='video-review'&&videoSummary.total===0){
    siteFilters={...siteFilters,wind:'all'};
    saveSiteFilters(siteFilters);
  }
  if (!spots.length) return;
  mounted = true;
  window.addEventListener('storage',onReviewStorage);
  updateForecastUI();
  detailModelSync = createDetailModelSync({store,broadcast,
    modelName: model => products[model]?.modelName,
    modelFromName: name => Object.keys(products).find(model => pointModelSupported(model) && products[model]?.modelName?.trim().toLowerCase() === name.trim().toLowerCase()),
    onNativeModel: model => {
      // Native Source owns its map updates. Observe its point choice without
      // issuing a second asynchronous map write for the same interaction.
      modelSelection++;
      selectPointModel(model);
      modelSyncNote = '';
    },
    keepSelection: (model,mapModel) => writingMapProduct || isMapFallback(model,mapModel),
    onUnavailable: model => { modelSyncNote = model ? `Could not switch the bottom forecast to ${forecastModelLabel(model)} at this location.` : ''; },
  });
  store.on('product', onMapModelChange);
  stopModelRunRefresh = watchModelRunRefresh(() => {
    const model = windForecast.getModel();
    if (pointModelSupported(model)) selectPointModel(model);
  });

  // Subscribe once, before setView, which can emit moveend synchronously.
  // Keep plugin rendering outside Leaflet GL's own render/event queue.
  map.on('zoomend', onZoomEnd);
  map.on('moveend', onMoveEnd);
  map.on('click', onMapClick);
  map.setView(firstReview?[53.45,-8]:[spots[0].lat, spots[0].lon],
    firstReview?7:Math.max(map.getZoom()||0, initialZoom));
  // Also render when setView leaves the view unchanged and emits no event.
  scheduleRender(0);
  // One forecast snapshot for all sites, independent of viewport and zoom.
  windForecast.setSpots(spots.filter(spot=>!spot.toVerify));
  void windForecast.start();
  stopTimelinePreview = watchTimelinePreview({
    store,
    getSeries: () => windForecast.getTimelineSeries(),
    onPreview: timestamp => windForecast.setPreviewTimestamp(timestamp),
    loadSeries: async (step, abort) => {
      const location = store.get('detailLocation'), model = windForecast.getModel();
      if (!pointModelSupported(model) || !Number.isFinite(location?.lat) || !Number.isFinite(location?.lon)) return;
      const response = await getPointForecastData(model,
        {lat:location.lat, lon:location.lon, step, extended:true}, {header:true},
        {abortSignal:abort.signal, timeout:15000});
      return response?.status === 200 ? response.data : undefined;
    },
  });
});

onDestroy(() => {
  mounted = false;
  window.removeEventListener('storage',onReviewStorage);
  cancelSiteForecastOpen?.();
  modelSelection++; modelPreparation++;
  stopModelRunRefresh?.(); stopModelRunRefresh = undefined;
  detailModelSync?.destroy(); detailModelSync = undefined;
  store.off('product', onMapModelChange);
  stopTimelinePreview?.(); stopTimelinePreview = undefined;
  windForecast.stop();
  if (_renderT !== null) clearTimeout(_renderT);
  _renderT = null;
  map.off('zoomend', onZoomEnd);
  map.off('moveend', onMoveEnd);
  map.off('click', onMapClick);
  clearDials(); clearUi(); clearMiniDials();
});
</script>

<SitePanel bind:this={sitePanelComponent} snapshot={filteredPanel} onSelect={focusSite} onHover={highlightSite} selectedId={selectedSiteId} weatherIconsDir={iconsDir}
  modelOptions={forecastModels} onModelChange={setForecastModel} {modelSyncNote}
  {windUnit} onWindUnitChange={setWindUnit}
  filters={siteFilters} onFiltersChange={setSiteFilters} {altitudeEnabled} {altitudeAvailable} onAltitudeChange={setAltitudeEnabled}
  {reviewSummary} {reviewMessage} {reviewSaveError} canUndoReview={!!reviewUndo}
  onReviewDecision={decideReview} onUndoReview={undoReview} onExportReview={exportReview}
  {videoSummary} {videoSaveError} onVideoDecision={decideVideo} onExportVideos={exportVideos}
  onRetry={() => windForecast.retry()} />

<style>
/* ——— Ogólne ——— */
:global(.wind-rose-icon){ opacity: 1 !important; z-index:var(--site-stack-order,0) !important; }
:global(.review-site-icon){background:transparent;border:0;cursor:pointer;}
:global(.site-video-button){position:relative;display:grid;place-items:center;width:34px;height:34px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;box-shadow:0 1px 4px #0005;text-decoration:none;pointer-events:auto;z-index:4;}
:global(.site-video-button:hover),:global(.site-video-button:focus-visible){outline:2px solid #38bdf8;outline-offset:2px;}
:global(.video-review-dot){position:absolute;right:-5px;top:-6px;display:grid;place-items:center;width:12px;height:12px;border-radius:50%;background:#f3c45f;color:#5d4005;font:600 9px/1 system-ui;}
:global(.review-site-pin){display:grid;place-items:center;width:30px;height:30px;border:2px dashed #fff;border-radius:50%;background:#7c3aed;color:#fff;font:700 20px/1 system-ui;box-shadow:0 0 0 2px #5b21b6,0 2px 5px #0005;}
:global(.review-accepted .review-site-pin){background:#2563eb;border-style:solid;box-shadow:0 0 0 2px #1e40af,0 2px 5px #0005;}
:global(.review-site-name){position:absolute;top:39px;left:50%;transform:translateX(-50%);padding:3px 6px;border:1px solid #a78bfa;border-radius:5px;background:#f5f3ff;color:#5b21b6;white-space:nowrap;font:600 11px/1.3 system-ui;}
:global(.review-site-icon:is(.site-hovered,.site-selected) .review-site-pin){outline:3px solid #38d9ff;outline-offset:4px;box-shadow:0 0 18px 7px #0ea5e980;}
:global(.wind-rose-icon.site-hovered){z-index:calc(1000000 + var(--site-stack-order,0)) !important;}
:global(.wind-rose-icon.site-selected){z-index:calc(2000000 + var(--site-stack-order,0)) !important;}
:global(.mini-dial-icon:is(.site-hovered,.site-selected)){border-radius:50%;outline:3px solid #38d9ff;outline-offset:5px;background:#0ea5e933;box-shadow:0 0 0 7px #ffffffc9,0 0 22px 12px #0ea5e9a6;}
:global(.dial-icon:is(.site-hovered,.site-selected) .dial){filter:drop-shadow(0 0 3px #fff) drop-shadow(0 0 7px #00c8ff) drop-shadow(0 0 12px #00c8ff);}
:global(.wr){ position: relative; background: transparent; }
:global(.wr-dial){ pointer-events: none; isolation: isolate; display:flex; flex-direction:column; align-items:center; }
:global(.wr-ui){ pointer-events: auto; isolation: isolate; }
:global(.title){ margin-top:6px; max-width:calc(100% - 12px); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#000; font:12px/1.2 system-ui, sans-serif; pointer-events:none; }

/* ——— Rozeta ——— */
:global(.dial){
  position: relative;
  z-index: 1;
  background:transparent; user-select:none; overflow:visible;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,.25));
}
:global(.ring){  fill:none; stroke:#000; stroke-width:1.5; }
:global(.face){  fill:#e6e6e6; stroke:#000; stroke-width:0.8; }
:global(.axis){  stroke:#7a7a7a; stroke-width:1.2; }
:global(.tick2){ stroke:#000; stroke-width:0.8; opacity:.75; }
:global(.tick10){stroke:#000; stroke-width:1.2; }
:global(.tick30){stroke:#000; stroke-width:1.8; }
:global(.deg){   fill:#000; font:12px/1.1 system-ui, sans-serif; }
:global(.card){  fill:#000; font:14px/1.2 system-ui, sans-serif; font-weight:700; }
:global(.center){fill:#2ea4ff; stroke:#003a66; stroke-width:1.5; }
:global(.large-wind-center){stroke:#fff;stroke-width:2;}
:global(.large-wind-reading),:global(.large-wind-unit){font:400 22px system-ui,sans-serif;fill:#fff;stroke:none;pointer-events:none;}
:global(.large-wind-direction){fill:#0369a1;stroke:#fff;stroke-width:2;stroke-linejoin:round;paint-order:stroke fill;pointer-events:none;}

/* ——— Łuki ——— */
:global(.use-arc){  fill:none; stroke:#26c34a; stroke-linecap:round; }
:global(.rest-arc){ fill:none; stroke:rgba(255, 64, 64, .38); stroke-linecap:round; }

/* ——— ENTER ——— */
:global(.wr-dial){
  transition: opacity 420ms cubic-bezier(.19,.87,.32,1.12),
              transform 420ms cubic-bezier(.19,.87,.32,1.12);
}
:global(.wr-dial.animate-pre){
  opacity: 0;
  transform: translateY(6px) scale(.96) rotate(-1deg);
}
:global(.wr-dial.animate-arm .ring){
  filter: drop-shadow(0 0 8px rgba(46,164,255,.35));
  animation: ring-fade 520ms ease 420ms forwards;
}
@keyframes ring-fade{ to { filter: drop-shadow(0 0 0 rgba(46,164,255,0)); } }

/* ——— UI YouTube ——— */
:global(.yt-btn){
  display:grid; place-items:center;
  background: rgba(255,255,255,0.98);
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
  transition: transform .16s ease, box-shadow .2s ease, opacity .2s ease;
  width: var(--yt-size, 26px);
  height: var(--yt-size, 26px);
  box-sizing: border-box;
}
:global(.yt-btn:hover){ transform: translateY(-2px) scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.35); }
:global(.yt-btn svg rect){ fill:#FF0000; }
:global(.yt-btn svg polygon){ fill:#FFFFFF; }

:global(.yt-main){ width:100%; height:100%; position: relative; }

/* POP-SPIN */
@keyframes pop-spin {
  0%   { transform: translateY(0) scale(1) rotate(0deg); }
  25%  { transform: translateY(-6px) scale(1.08) rotate(90deg); }
  50%  { transform: translateY(-2px) scale(1.04) rotate(180deg); }
  75%  { transform: translateY(-1px) scale(1.02) rotate(270deg); }
  100% { transform: translateY(0) scale(1) rotate(360deg); }
}
:global(.yt-main.pop-spin),
:global(.gmaps-main.pop-spin){
  animation: pop-spin 520ms cubic-bezier(.2,.8,.2,1) 1;
}

:global(.rose-videos){display:contents;}
:global(.video-number){position:absolute;right:-2px;bottom:-2px;display:grid;place-items:center;min-width:12px;height:12px;box-sizing:border-box;padding:0 2px;border:1px solid #fff;border-radius:4px;background:#e2e8f0;color:#334155;font:500 9px/1 system-ui;pointer-events:none;}

/* — daleki zoom — */
:global(.mini-dial-icon){ background:transparent; border:0; cursor:pointer; }
:global(.map-weather-indicators){position:absolute;left:50%;top:-21px;transform:translateX(-50%);display:flex;align-items:center;justify-content:center;gap:1px;height:23px;pointer-events:none;z-index:0;}
:global(.mini-dial-icon .map-weather-indicators){top:-17px;}
:global(.map-weather-icon){width:23px;height:23px;object-fit:contain;}
:global(.map-gust-warning){position:absolute;left:calc(100% - 7px);top:calc(100% - 17px);align-items:center;width:var(--gust-warning-size,20px);height:var(--gust-warning-size,20px);z-index:4;pointer-events:auto;}
:global(.map-gust-warning svg){display:block;width:100%;height:100%;filter:drop-shadow(0 1px 2px #0008);}
:global(.map-gust-warning[data-severity="strong"]){--gust-warning-color:#dc2626;}
:global(.dial-icon .map-weather-indicators){transform:translate(-50%,-50%);width:var(--weather-size);height:var(--weather-size);z-index:2;}
:global(.dial-icon .map-weather-icon){width:100%;height:100%;}
:global(.mini-wind-rose){ position:relative; z-index:1; display:block; overflow:visible; filter:drop-shadow(0 1px 2px rgba(0,0,0,.3)); }
:global(.mini-wind-rose .mini-wind-range){ fill:none; stroke:#168a45; stroke-width:3; }
:global(.mini-wind-reading){font:400 8.5px system-ui,sans-serif;fill:#fff;stroke:none;pointer-events:none;}
:global(.mini-wind-unit){font:400 5.5px system-ui,sans-serif;fill:#fff;stroke:none;pointer-events:none;}
:global(.mini-wind-direction){fill:#0369a1;stroke:#fff;stroke-width:1;stroke-linejoin:round;paint-order:stroke fill;pointer-events:none;}

/* ——— Google Maps ——— */
:global(.gmaps-menu){
  position:absolute;
  z-index: 10;
  pointer-events:auto;
  --gm-size: 26px;
  width: var(--gm-size);
  height: var(--gm-size);
}
:global(.gmaps-btn){
  display:grid; place-items:center;
  background: rgba(255,255,255,0.98);
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(0,0,0,.3);
  transition: transform .16s ease, box-shadow .2s ease, opacity .2s ease;
  width: var(--gm-size);
  height: var(--gm-size);
  box-sizing: border-box;
}
:global(.gmaps-btn:hover){ transform: translateY(-2px) scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.35); }
:global(.gmaps-btn svg path){ fill:#1a73e8; }

/* ——— (NOWE) Info button ——— */
:global(.info-menu){
  position:absolute;
  z-index: 10;
  pointer-events:auto;
  --info-size: 26px;
  width: var(--info-size);
  height: var(--info-size);
}
:global(.info-btn){
  display:grid; place-items:center;
  background: #ffffff;
  border-radius: 7px;
  border: 1px solid rgba(0,0,0,.12);
  box-shadow: 0 2px 8px rgba(0,0,0,.25);
  width: 100%; height: 100%;
  cursor: default; /* na razie bez akcji */
  transition: transform .16s ease, box-shadow .2s ease;
}
:global(.info-btn:hover){ transform: translateY(-2px) scale(1.03); box-shadow: 0 4px 14px rgba(0,0,0,.35); }
:global(.info-btn svg circle){ fill:#1e88e5; }
:global(.info-btn svg rect){ fill:#ffffff; }

/* One aligned action bar, below the dial and its site name. */
:global(.rose-actions){position:absolute;left:50%;transform:translateX(-50%);display:flex;flex-wrap:wrap;align-items:center;justify-content:center;width:max-content;max-width:calc(100% - 26px);gap:6px;padding:5px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafcf5;box-shadow:0 2px 8px #0f172a26;--yt-size:34px;}
:global(.rose-actions .gmaps-menu),:global(.rose-actions .info-menu){position:relative;flex:0 0 34px;width:34px;height:34px;--gm-size:34px;--info-size:34px;}
:global(.rose-actions .yt-btn),:global(.rose-actions .gmaps-btn),:global(.rose-actions .info-btn),:global(.rose-actions .site-video-button){display:grid;place-items:center;box-sizing:border-box;flex:0 0 34px;width:34px;height:34px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;box-shadow:0 1px 2px #0f172a14;text-decoration:none;cursor:pointer;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease;}
:global(.rose-actions a:hover),:global(.rose-actions button:hover){border-color:#65a99a;transform:translateY(-1px);box-shadow:0 2px 5px #0f172a26;}
:global(.rose-actions a:focus-visible),:global(.rose-actions button:focus-visible){outline:2px solid #0284c7;outline-offset:2px;}
:global(.rose-actions svg){width:22px;height:22px;}
:global(.rose-videos svg){height:18px;}
/* ——— Wskaźnik trudności (0–5) ——— */

:global(.diff-rect){
  fill: #9e9e9e;         /* szare tło zawsze widoczne */
  opacity: .35;          /* półprzezroczyste */
  stroke: rgba(0,0,0,.18);
  stroke-width: 1;
  pointer-events: none;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,.12));
}
:global(.diff-rect.active){
  /* bardziej czerwone, nadal przyjemne */
  fill: #2ea4ff;         /* było #ffb3b3 */
  opacity: .95;
  stroke: rgba(176, 0, 0, .35);
}

/* ——— Etykieta "Site difficulty" ——— */
:global(.diff-label){
  font: 12px/1.2 system-ui, sans-serif;
  fill: #333;
  opacity: .9;
  dominant-baseline: central;
  user-select: none;
}
/* ——— Tytuł "Site Difficulty" ——— */
:global(.diff-title){
  font: 12px/1.2 system-ui, sans-serif;
  fill: #333;
  opacity: .9;
  dominant-baseline: central;
  user-select: none;
  /* delikatny cień dla czytelności nad mapą */
  paint-order: stroke fill;
  stroke: rgba(255,255,255,.9);
  stroke-width: 2px;
}



</style>

