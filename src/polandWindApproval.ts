import type {WindRange} from './windRanges';
import type {ForecastSpot} from './windForecast';
import type {SiteMetadata} from './siteCatalog';

// Explicit owner confirmations from reports/poland-owner-wind-review-2026-10-26.json.
// GPS, guide associations and videos remain independent of wind approval.
export const ownerPolandWindRanges:Record<string,WindRange[]> = {
  "pl-bezmiechowa": [
    {
      "start": 175,
      "end": 220
    }
  ],
  "pl-map-bialogora": [
    {
      "start": 310,
      "end": 30
    }
  ],
  "pl-map-bubusiowa-kopa": [
    {
      "start": 150,
      "end": 210
    }
  ],
  "pl-map-cergowa": [
    {
      "start": 10,
      "end": 35
    }
  ],
  "pl-map-chelm-grybow": [
    {
      "start": 330,
      "end": 10
    }
  ],
  "pl-chelmiec": [
    {
      "start": 75,
      "end": 100
    }
  ],
  "pl-map-chlapowo": [
    {
      "start": 0,
      "end": 60
    }
  ],
  "pl-cwilin": [
    {
      "start": 145,
      "end": 220
    }
  ],
  "pl-map-czarna-gora-sienna": [
    {
      "start": 40,
      "end": 80
    }
  ],
  "pl-map-czeszka": [
    {
      "start": 55,
      "end": 90
    }
  ],
  "pl-map-debina": [
    {
      "start": 300,
      "end": 350
    }
  ],
  "pl-dziurkowiec": [
    {
      "start": 280,
      "end": 315
    }
  ],
  "pl-dzwiniacz": [
    {
      "start": 90,
      "end": 150
    }
  ],
  "pl-map-orlowo-lower": [
    {
      "start": 60,
      "end": 130
    }
  ],
  "pl-map-orlowo-upper": [
    {
      "start": 60,
      "end": 100
    }
  ],
  "pl-map-gologlowy": [
    {
      "start": 150,
      "end": 210
    }
  ],
  "pl-map-wapno": [
    {
      "start": 10,
      "end": 50
    }
  ],
  "pl-grzmiaca": [
    {
      "start": 120,
      "end": 180
    }
  ],
  "pl-map-hala-biegunska": [
    {
      "start": 120,
      "end": 180
    }
  ],
  "pl-map-hel": [
    {
      "start": 210,
      "end": 270
    }
  ],
  "pl-map-hel-peninsula-reference": [
    {
      "start": 0,
      "end": 50
    }
  ],
  "pl-map-holica": [
    {
      "start": 200,
      "end": 240
    }
  ],
  "pl-map-janikowa-grapa": [
    {
      "start": 200,
      "end": 240
    }
  ],
  "pl-map-janowiec": [
    {
      "start": 150,
      "end": 210
    }
  ],
  "pl-map-jastrzebia-gora": [
    {
      "start": 330,
      "end": 30
    }
  ],
  "pl-map-jaworzyna-krynicka": [
    {
      "start": 110,
      "end": 130
    }
  ],
  "pl-map-jaworzynka": [
    {
      "start": 280,
      "end": 330
    }
  ],
  "pl-map-just-roznowskie": [
    {
      "start": 120,
      "end": 160
    }
  ],
  "pl-map-katy-rybackie": [
    {
      "start": 320,
      "end": 30
    }
  ],
  "pl-map-klimczok": [
    {
      "start": 150,
      "end": 210
    }
  ],
  "pl-map-klonowka": [
    {
      "start": 190,
      "end": 240
    }
  ],
  "pl-kopa": [
    {
      "start": 340,
      "end": 40
    }
  ],
  "pl-map-krynica-morska": [
    {
      "start": 310,
      "end": 30
    }
  ],
  "pl-kudowa": [
    {
      "start": 200,
      "end": 260
    }
  ],
  "pl-laworta": [
    {
      "start": 30,
      "end": 60
    }
  ],
  "pl-map-losiowa-gora": [
    {
      "start": 240,
      "end": 290
    }
  ],
  "pl-map-lubogoszcz": [
    {
      "start": 130,
      "end": 150
    }
  ],
  "pl-map-mikulin": [
    {
      "start": 130,
      "end": 230
    }
  ],
  "pl-rog": [
    {
      "start": 220,
      "end": 265
    }
  ],
  "pl-skrzetla": [
    {
      "start": 140,
      "end": 230
    }
  ],
  "pl-map-szukalowy-garb": [
    {
      "start": 30,
      "end": 90
    }
  ],
  "pl-tokarnia": [
    {
      "start": 30,
      "end": 120
    }
  ],
  "pl-map-trzesacz": [
    {
      "start": 300,
      "end": 20
    }
  ],
  "pl-map-unislaw": [
    {
      "start": 280,
      "end": 340
    }
  ],
  "pl-weremien": [
    {
      "start": 30,
      "end": 70
    }
  ],
  "pl-map-wiag": [
    {
      "start": 150,
      "end": 210
    }
  ],
  "pl-zar": [
    {
      "start": 160,
      "end": 210
    }
  ],
  "pl-map-zmij": [
    {
      "start": 200,
      "end": 240
    }
  ]
};

export function applyPolishWindApproval<T extends ForecastSpot & SiteMetadata>(site:T):T{
 const ranges=ownerPolandWindRanges[site.id];if(!ranges)return site;
 const note=(site.reviewNote??'').replace('Wind sector remains unverified.','').replace('Exact take-off position, access and wind sector need confirmation.','Exact take-off position and access need confirmation.').trim();
 return {...site,windRanges:ranges.map(range=>({...range})),sectorStart:ranges[0].start,sectorEnd:ranges[0].end,directionUnverified:false,
  reviewNote:(note?note+' ':'')+'Wind ranges confirmed by the owner on 26 October 2026.'};
}
