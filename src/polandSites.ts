import type {SiteMetadata} from './siteCatalog';
import type {WindRange} from './windRanges';
import type {ForecastSpot} from './windForecast';
import {polandMapSites} from './polandMapSites.ts';
import {polandMapVideos} from './polandMapVideos.ts';
import {videoPlaybackUrl} from './siteVideos.ts';
import {applyPolishWindApproval} from './polandWindApproval.ts';

// Official club/foundation descriptions checked on 2026-10-26. Areas with
// multiple launch faces remain single catalogue entries. No bearing tolerance
// is inferred from a preferred compass label. See the Polish sources report.
type PolishRecord = SiteMetadata & {id:string;name:string;lat:number;lon:number;sourceUrl:string;coordinateSourceUrl:string;guideDepth:'brief'|'narrative';windRanges:WindRange[]};
const records: PolishRecord[] = [
  {
    "id": "pl-ciecien",
    "name": "Ciecień",
    "lat": 49.7724722,
    "lon": 20.1411944,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/38",
    "coordinateSourceUrl": "https://spbw.pl/node/38",
    "sourceDirections": "W–WNW; source fields differ",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 270,
        "end": 292.5
      }
    ]
  },
  {
    "id": "pl-szczebel",
    "name": "Szczebel",
    "lat": 49.6893889,
    "lon": 20.0093333,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/50",
    "coordinateSourceUrl": "https://spbw.pl/node/50",
    "sourceDirections": "N–NE in the launch instructions; wider quick-reference fields",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 0,
        "end": 45
      }
    ]
  },
  {
    "id": "pl-snieznica",
    "name": "Śnieżnica",
    "lat": 49.71675,
    "lon": 20.1773889,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/39",
    "coordinateSourceUrl": "https://spbw.pl/node/39",
    "sourceDirections": "NNW–NNE; source also describes a wider northern sector",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 337.5,
        "end": 22.5
      }
    ]
  },
  {
    "id": "pl-podobin",
    "name": "Podobin",
    "lat": 49.6379722,
    "lon": 20.0933333,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/40",
    "coordinateSourceUrl": "https://spbw.pl/node/40",
    "sourceDirections": "S–SW preferred; wider directions described separately",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 180,
        "end": 225
      }
    ]
  },
  {
    "id": "pl-cwilin",
    "name": "Ćwilin",
    "lat": 49.687694,
    "lon": 20.191259,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/47",
    "coordinateSourceUrl": "https://spbw.pl/node/47",
    "sourceDirections": "SE preferred; summary and quick-reference limits conflict",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-skrzetla",
    "name": "Skrzętla",
    "lat": 49.7154167,
    "lon": 20.5879167,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://spbw.pl/node/41",
    "coordinateSourceUrl": "https://spbw.pl/node/41",
    "sourceDirections": "Northern to easterly directions; source limits conflict",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-szybowcowa",
    "name": "Góra Szybowcowa – Jeżów Sudecki",
    "lat": 50.94319239010474,
    "lon": 15.76358669832717,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/szybowcowa/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "S: 160–220°; N: 330–10°",
    "guideDepth": "narrative",
    "locationNeedsVerification": true,
    "windRanges": [
      {
        "start": 160,
        "end": 220
      },
      {
        "start": 330,
        "end": 10
      }
    ]
  },
  {
    "id": "pl-mieroszow",
    "name": "Jatki-Mieroszów",
    "lat": 50.67275699999999,
    "lon": 16.209839,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/krowiara-mieroszow/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "180–240°",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 180,
        "end": 240
      }
    ]
  },
  {
    "id": "pl-kopa",
    "name": "Kopa",
    "lat": 50.747873,
    "lon": 15.728194,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/kopa/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "See the club direction diagram; numeric tolerance unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-rog",
    "name": "Róg – Chełmsko Śląskie",
    "lat": 50.66875206938463,
    "lon": 16.10152285721401,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/rog-chelmsko-slaskie/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "SW; quoted slope bearing 250°, tolerance unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-rudnik",
    "name": "Rudnik",
    "lat": 50.774016,
    "lon": 15.866959,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/rudnik/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "310–330°",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 310,
        "end": 330
      }
    ]
  },
  {
    "id": "pl-stog",
    "name": "Stóg Izerski",
    "lat": 50.892419,
    "lon": 15.309827,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/stogizerski/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "10–80°",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 10,
        "end": 80
      }
    ]
  },
  {
    "id": "pl-wolowa",
    "name": "Wołowa Góra",
    "lat": 50.768554,
    "lon": 15.816439,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://kkp.net.pl/wolowa-gora/",
    "coordinateSourceUrl": "https://kkp.net.pl/wp-content/uploads/2023/05/Startowiska.kmz",
    "sourceDirections": "330–10°",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 330,
        "end": 10
      }
    ]
  },
  {
    "id": "pl-dzikowiec",
    "name": "Dzikowiec",
    "lat": 50.720596,
    "lon": 16.210896,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/dzikowiec/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/dzikowiec/",
    "sourceDirections": "0–75°, preferred 45°",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 0,
        "end": 75
      }
    ]
  },
  {
    "id": "pl-srebrna",
    "name": "Srebrna Góra",
    "lat": 50.570084,
    "lon": 16.657957,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/srebrna-gora/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/srebrna-gora/",
    "sourceDirections": "N–E",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 0,
        "end": 90
      }
    ]
  },
  {
    "id": "pl-klin",
    "name": "Andrzejówka (Klin)",
    "lat": 50.692204,
    "lon": 16.276079,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/andrzejowka-klin/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/andrzejowka-klin/",
    "sourceDirections": "315–330° in the narrative; heading differs",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": [
      {
        "start": 315,
        "end": 330
      }
    ]
  },
  {
    "id": "pl-kudowa",
    "name": "Kudowa-Zdrój – Czermna",
    "lat": 50.459366,
    "lon": 16.249779,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/kudowa-zdroj-czermna/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/kudowa-zdroj-czermna/",
    "sourceDirections": "SW (225°) preferred; tolerance unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-chelmiec",
    "name": "Chełmiec",
    "lat": 50.77972,
    "lon": 16.214443,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/chelmiec/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/chelmiec/",
    "sourceDirections": "E (90°) preferred; tolerance unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-grzmiaca",
    "name": "Grzmiąca",
    "lat": 50.693947,
    "lon": 16.323845,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/grzmiaca/",
    "coordinateSourceUrl": "https://www.paralotnie-sudety.pl/startowiska/opis/grzmiaca/",
    "sourceDirections": "SE (135°) preferred; tolerance unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": false,
    "windRanges": []
  },
  {
    "id": "pl-skrzyczne",
    "name": "Skrzyczne",
    "lat": 49.6878,
    "lon": 19.0317,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://bsp.beskidy.pl/skrzyczne/",
    "coordinateSourceUrl": "https://noga.es/paragliding/map/en/takeoff_pg-takeoff-123.html",
    "sourceDirections": "NE–ESE at the east face; other faces described in guide",
    "guideDepth": "narrative",
    "locationNeedsVerification": true,
    "windRanges": [
      {
        "start": 45,
        "end": 112.5
      }
    ]
  },
  {
    "id": "pl-zar",
    "name": "Żar",
    "lat": 49.7875,
    "lon": 19.2251,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://bsp.beskidy.pl/zar/",
    "coordinateSourceUrl": "https://noga.es/paragliding/map/en/takeoff_pg-takeoff-306.html",
    "sourceDirections": "Separate N, W and S faces; tolerances unverified",
    "guideDepth": "narrative",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-dzialy",
    "name": "Działy – Korczyna",
    "lat": 49.7373,
    "lon": 21.841,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://psp.org.pl/dzialy-meteo/",
    "coordinateSourceUrl": "https://flyappi.org/flysite/8097/",
    "sourceDirections": "S–SSW",
    "guideDepth": "narrative",
    "locationNeedsVerification": true,
    "windRanges": [
      {
        "start": 180,
        "end": 202.5
      }
    ]
  },
  {
    "id": "pl-bezmiechowa",
    "name": "Bezmiechowa",
    "lat": 49.52172610218224,
    "lon": 22.410478591918945,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "S preferred; tolerance unverified",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-weremien",
    "name": "Weremień",
    "lat": 49.44373343989441,
    "lon": 22.314897607624175,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "NE preferred; tolerance unverified",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-dzwiniacz",
    "name": "Dźwiniacz",
    "lat": 49.46466565503903,
    "lon": 22.53622055053711,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "NE preferred; tolerance unverified",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-laworta",
    "name": "Laworta",
    "lat": 49.44469133832174,
    "lon": 22.58244037628174,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "NE preferred; tolerance unverified",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-tokarnia",
    "name": "Tokarnia",
    "lat": 49.42973316993069,
    "lon": 22.048444747924805,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "NE preferred; tolerance unverified",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-makowka",
    "name": "Makówka",
    "lat": 49.464763,
    "lon": 22.262603,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "Not provided",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-male-jaslo",
    "name": "Małe Jasło",
    "lat": 49.17433915234302,
    "lon": 22.350740432739258,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "Not provided",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  },
  {
    "id": "pl-dziurkowiec",
    "name": "Dziurkowiec",
    "lat": 49.09851507725685,
    "lon": 22.428245544433594,
    "country": "poland",
    "siteType": "inland",
    "sourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "coordinateSourceUrl": "https://fundacja-prowing.pl/index.php/paragliding/miejsca",
    "sourceDirections": "Not provided",
    "guideDepth": "brief",
    "locationNeedsVerification": true,
    "windRanges": []
  }
];
export const polandGuideSites = records.map(site => ({...site,
    sectorStart:site.windRanges[0]?.start ?? 0,sectorEnd:site.windRanges[0]?.end ?? 0,
    directionUnverified:site.windRanges.length === 0,
    videoCandidates:polandMapVideos[site.id]??[],
    youtube:(polandMapVideos[site.id]??[]).map(video=>videoPlaybackUrl(video)!),
})).map(applyPolishWindApproval) satisfies (ForecastSpot & SiteMetadata & {name:string;youtube:string[]})[];
export const polandSites = [...polandGuideSites,...polandMapSites];
