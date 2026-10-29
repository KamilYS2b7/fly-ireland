import type {SiteMetadata} from './siteCatalog';
import type {WindRange} from './windRanges';
import {polandMapVideos} from './polandMapVideos.ts';
import {videoPlaybackUrl} from './siteVideos.ts';
import {applyPolishWindApproval} from './polandWindApproval.ts';

// Reviewed public map import, 2026-10-26. Existing locations keep their GPS
// and wind sectors. Source references are not surveyed take-offs.
// See reports/poland-google-map-comparison-2026-10-26.json for every decision.
type MapRecord = SiteMetadata & {id:string;name:string;lat:number;lon:number;sourceMapIndices:number[]};
const records: MapRecord[] = [
  {
    "id": "pl-map-hala-biegunska",
    "name": "Hala Bieguńska",
    "lat": 49.5287051,
    "lon": 19.2100038,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      1
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-just-roznowskie",
    "name": "Just / Jezioro Rożnowskie",
    "lat": 49.722607,
    "lon": 20.645784,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": false,
    "sourceMapIndices": [
      4
    ],
    "reviewNote": "Take-off coordinates confirmed by the owner on 26 October 2026. Wind sector remains unverified."
  },
  {
    "id": "pl-map-hel",
    "name": "Hel",
    "lat": 54.628,
    "lon": 18.7736,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      5
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-roztoki-okraglik",
    "name": "Roztoki Górne / Okrąglik",
    "lat": 49.1439,
    "lon": 22.3535,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      6
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mrzezino-north",
    "name": "Mrzezino — northern map point",
    "lat": 54.652142,
    "lon": 18.437117,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      8
    ],
    "reviewNote": "A separate northern point from Górka Południowa. Keep both map references; the exact launch face needs verification."
  },
  {
    "id": "pl-map-mszana-m2",
    "name": "Mszana M2 — Południe",
    "lat": 49.5104003,
    "lon": 21.6532105,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      9
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-bialogora",
    "name": "Białogóra",
    "lat": 54.8275,
    "lon": 17.9401,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      11
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-chlapowo",
    "name": "Chłapowo",
    "lat": 54.811,
    "lon": 18.3727,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      12
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-jastrzebia-gora",
    "name": "Jastrzębia Góra",
    "lat": 54.835,
    "lon": 18.3012,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      13
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-zmij",
    "name": "Żmij",
    "lat": 50.6359,
    "lon": 16.5453,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      18
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-losiowa-gora",
    "name": "Łosiowa Góra",
    "lat": 53.5571,
    "lon": 18.7679,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      20
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-wiag",
    "name": "Wiąg",
    "lat": 53.4192,
    "lon": 18.5142,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      22
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-witkow",
    "name": "Witków — map point",
    "lat": 50.7952,
    "lon": 16.1147,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      23
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-unislaw",
    "name": "Unisław",
    "lat": 53.2173,
    "lon": 18.3805,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      25
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-huta-triangle",
    "name": "Trójkąt na Hucie",
    "lat": 50.3327,
    "lon": 16.5458,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      26
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-trzesacz",
    "name": "Trzęsacz",
    "lat": 54.0786709,
    "lon": 14.9967117,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      27
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-tobolow",
    "name": "Tobołów / Koninki",
    "lat": 49.5837,
    "lon": 20.0701,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      28
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-sedzisz",
    "name": "Sędzisz",
    "lat": 50.3533,
    "lon": 16.7135,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      29
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-szukalowy-garb",
    "name": "Szukalowy Garb",
    "lat": 49.4827,
    "lon": 22.6499,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      30
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-starogrod",
    "name": "Starogród",
    "lat": 53.2954,
    "lon": 18.3773,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      33
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-sokolec",
    "name": "Sokolec",
    "lat": 50.6534,
    "lon": 16.4806,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      35
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-rowy",
    "name": "Rowy — coastal map point",
    "lat": 54.6603,
    "lon": 17.0369,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      39
    ],
    "reviewNote": "Map note says Dębina/Rowy. This point corresponds to the Rowy area, separate from the Dębina pin about 3 km southwest."
  },
  {
    "id": "pl-map-prusow",
    "name": "Prusów",
    "lat": 49.5642,
    "lon": 19.1445,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      40
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-potaczkowa",
    "name": "Potaczkowa",
    "lat": 49.6268,
    "lon": 20.0621,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      41
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-piaski",
    "name": "Piaski",
    "lat": 54.4414,
    "lon": 19.606,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      43
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-parski",
    "name": "Parski nad Wisłą",
    "lat": 53.525,
    "lon": 18.7634,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      44
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-nowe",
    "name": "Nowe nad Wisłą",
    "lat": 53.6521,
    "lon": 18.7354,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      45
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-nowe-marzy",
    "name": "Nowe Marzy",
    "lat": 53.4665,
    "lon": 18.648,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      46
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mrzezino-south",
    "name": "Mrzezino — Górka Południowa",
    "lat": 54.6499,
    "lon": 18.4278,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      47
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mokre",
    "name": "Mokre",
    "lat": 49.4486,
    "lon": 22.159,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      48
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mogielica",
    "name": "Mogielica",
    "lat": 49.6595,
    "lon": 20.2761,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      49
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mikulin",
    "name": "Mikulin",
    "lat": 50.5812,
    "lon": 23.718,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      50
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mielnik",
    "name": "Mielnik",
    "lat": 50.3551,
    "lon": 16.6625,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      51
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-mechelinki",
    "name": "Mechelinki",
    "lat": 54.601256,
    "lon": 18.52118,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      52
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-makowica",
    "name": "Makowica — Rytro",
    "lat": 49.4965,
    "lon": 20.6999,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      53
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-lubon-wielki",
    "name": "Luboń Wielki",
    "lat": 49.6531,
    "lon": 20.0031,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      54
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-lubomir",
    "name": "Lubomir",
    "lat": 49.7691,
    "lon": 20.0555,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      55
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-lubogoszcz",
    "name": "Lubogoszcz",
    "lat": 49.6953,
    "lon": 20.0726,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      56
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-hel-peninsula-reference",
    "name": "Hel Peninsula — unnamed map point",
    "lat": 54.7254,
    "lon": 18.6118,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      57
    ],
    "reviewNote": "Unnamed source pin on the Hel Peninsula, with no linked video. Retained as an unverified map reference."
  },
  {
    "id": "pl-map-katy-rybackie",
    "name": "Kąty Rybackie",
    "lat": 54.3541,
    "lon": 19.2254,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      59
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-krynica-morska",
    "name": "Krynica Morska",
    "lat": 54.3812,
    "lon": 19.4152,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      60
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-klonowka",
    "name": "Klonówka — Masłów",
    "lat": 50.9075,
    "lon": 20.7535,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      61,
      95
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-klimczok",
    "name": "Klimczok",
    "lat": 49.735,
    "lon": 19.0091,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      62
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-kasprowy",
    "name": "Kasprowy Wierch",
    "lat": 49.2296,
    "lon": 19.9865,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      63
    ],
    "reviewNote": "A map reference is not confirmation of access or flying permission in the Tatra National Park. Verify the current local rules separately."
  },
  {
    "id": "pl-map-kamiennik",
    "name": "Kamiennik",
    "lat": 49.8003,
    "lon": 20.0382,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      64
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-jaworzynka",
    "name": "Jaworzynka — near Żar",
    "lat": 49.7639,
    "lon": 19.2231,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      65
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-jaworzyna-krynicka",
    "name": "Jaworzyna Krynicka",
    "lat": 49.4141,
    "lon": 20.8978,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      66
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-janikowa-grapa",
    "name": "Janikowa Grapa",
    "lat": 49.6615,
    "lon": 19.3238,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      67
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-huberek",
    "name": "Huberek",
    "lat": 50.4986,
    "lon": 16.6102,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      68
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-holica",
    "name": "Holica",
    "lat": 49.407,
    "lon": 22.542,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      69
    ],
    "reviewNote": "Map note spells Holnica; the supplied video identifies Holica."
  },
  {
    "id": "pl-map-gologlowy",
    "name": "Gołogłowy",
    "lat": 50.4728,
    "lon": 16.6241,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      71
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-orlowo-upper",
    "name": "Gdynia Orłowo — Górne",
    "lat": 54.4882,
    "lon": 18.5666,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      73
    ],
    "reviewNote": "Upper Orłowo reference; kept separate from the lower cliff launch."
  },
  {
    "id": "pl-map-orlowo-lower",
    "name": "Gdynia Orłowo — Dolne",
    "lat": 54.479,
    "lon": 18.5636,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      74
    ],
    "reviewNote": "Lower Orłowo reference; kept separate from the upper launch."
  },
  {
    "id": "pl-map-debina",
    "name": "Dębina",
    "lat": 54.6372,
    "lon": 17.0014,
    "country": "poland",
    "siteType": "coastal",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      75
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-czeszka",
    "name": "Czeszka",
    "lat": 50.6287,
    "lon": 16.6064,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      77
    ],
    "reviewNote": "APPI places Czeszka near this pin. The supplied film is hang-gliding/speedflying footage; verify its relevance to the intended launch."
  },
  {
    "id": "pl-map-czarna-gora-sienna",
    "name": "Czarna Góra — Sienna",
    "lat": 50.2536445,
    "lon": 16.8085434,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      78
    ],
    "reviewNote": "Polish Czarna Góra at Sienna; distinct from Litwinka and Czech Slamník. The source film shows speedflying."
  },
  {
    "id": "pl-map-litwinka",
    "name": "Litwinka / Czarna Góra",
    "lat": 49.381599,
    "lon": 20.12095,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      79
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-chelm-grybow",
    "name": "Chełm — Grybów",
    "lat": 49.5984789,
    "lon": 20.9960827,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      82
    ],
    "reviewNote": "Chełm near Grybów, not Chełmiec in the Sudetes. The supplied video names the Grybów mountain."
  },
  {
    "id": "pl-map-cergowa",
    "name": "Cergowa",
    "lat": 49.5315677,
    "lon": 21.7191152,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      83
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-bukowiec",
    "name": "Bukowiec",
    "lat": 50.699,
    "lon": 16.2537,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      84
    ],
    "reviewNote": "Bukowiec in the Sudetes, near Andrzejówka. Not a duplicate of Klin. Exact launch remains unverified."
  },
  {
    "id": "pl-map-adamczykowa",
    "name": "Adamczykowa",
    "lat": 49.6511,
    "lon": 20.0604,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      87
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-janowiec",
    "name": "Janowiec",
    "lat": 51.324186,
    "lon": 21.909629,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      89
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-pinczow",
    "name": "Pińczów",
    "lat": 50.5378009,
    "lon": 20.5118502,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      91
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-muszynka",
    "name": "Muszynka",
    "lat": 49.37261,
    "lon": 21.083658,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      92
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  },
  {
    "id": "pl-map-wapno",
    "name": "Góra Wapno — Mszana",
    "lat": 49.4828339,
    "lon": 21.6443851,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      93
    ],
    "reviewNote": "A separately named Wapno pin, about 3 km from Mszana M2. The film title refers broadly to Mszana; verify the precise take-off."
  },
  {
    "id": "pl-map-bubusiowa-kopa",
    "name": "Bubusiowa Kopa",
    "lat": 49.712882,
    "lon": 19.246622,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://maps.app.goo.gl/2HK9AYoaNehaKZ6p8",
    "sourceName": "Google Maps list",
    "locationNeedsVerification": true,
    "sourceMapIndices": [
      94
    ],
    "reviewNote": "Coordinates imported from your Google Maps list. Exact take-off position, access and wind sector need confirmation."
  }
];
export const polandMapSites = records.map(site=>({...site,
    sectorStart:0,sectorEnd:0,windRanges:[] as WindRange[],directionUnverified:true,
    videoCandidates:polandMapVideos[site.id]??[],
    youtube:(polandMapVideos[site.id]??[]).map(video=>videoPlaybackUrl(video)!),
})).map(applyPolishWindApproval);
