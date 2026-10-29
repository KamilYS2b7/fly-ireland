import {polandGuideSites} from './polandSites.ts';
// Explicit Android, IHPA and Polish-guide associations, checked against the catalogue.
// Nearby sites never inherit a guide automatically. Anchors are catalogue
// references, not replacement launch coordinates.
export const SITE_GUIDE_INDEX = [
  ...polandGuideSites.map(site=>({key:`Poland: ${site.name}`,names:[site.name],lat:site.lat,lon:site.lon})),
  {
    "key": "Big Colin",
    "names": [
      "Big Colin"
    ],
    "lat": 54.802333,
    "lon": -6.084265
  },
  {
    "key": "Agnews Hill",
    "names": [
      "Agnews Hill",
      "Agnews"
    ],
    "lat": 54.844659,
    "lon": -5.932023
  },
  {
    "key": "Clermont Carn",
    "names": [
      "Clermont Carn"
    ],
    "lat": 54.07855,
    "lon": -6.319776
  },
  {
    "key": "Coolnasillagh",
    "names": [
      "Coolnasillagh"
    ],
    "lat": 54.849832,
    "lon": -6.785004
  },
  {
    "key": "Craigagh Hill",
    "names": [
      "Craigagh Hill"
    ],
    "lat": 54.831109,
    "lon": -6.884755
  },
  {
    "key": "Divis",
    "names": [
      "Divis"
    ],
    "lat": 54.605172,
    "lon": -5.998758
  },
  {
    "key": "Dungiven North-West",
    "names": [
      "Dungiven North-West",
      "Dungiven NW"
    ],
    "lat": 54.945514,
    "lon": -6.873402
  },
  {
    "key": "Dungiven SW (Boviel)",
    "names": [
      "Dungiven SW (Boviel)",
      "Dungiven Boviel"
    ],
    "lat": 54.919836,
    "lon": -6.850042
  },
  {
    "key": "Dungiven West",
    "names": [
      "Dungiven West",
      "Dungiven"
    ],
    "lat": 54.934995,
    "lon": -6.866763
  },
  {
    "key": "Knockagh",
    "names": [
      "Knockagh",
      "Knockagh Monument"
    ],
    "lat": 54.711187,
    "lon": -5.879283
  },
  {
    "key": "Lough Navar",
    "names": [
      "Lough Navar",
      "Cliffs of Magho"
    ],
    "lat": 54.467065,
    "lon": -7.909476
  },
  {
    "key": "Hell's Hole (WNW)",
    "names": [
      "Hell's Hole (WNW)",
      "Magilligan Hells Hole"
    ],
    "lat": 55.138244,
    "lon": -6.884943
  },
  {
    "key": "Magilligan North",
    "names": [
      "Magilligan North",
      "Magilligan N"
    ],
    "lat": 55.153811,
    "lon": -6.872439
  },
  {
    "key": "Mayobridge",
    "names": [
      "Mayobridge"
    ],
    "lat": 54.170498,
    "lon": -6.192803
  },
  {
    "key": "Mayobridge North",
    "names": [
      "Mayobridge North"
    ],
    "lat": 54.170883,
    "lon": -6.182196
  },
  {
    "key": "Robin Youngs Hill",
    "names": [
      "Robin Youngs Hill",
      "Robin Youngs"
    ],
    "lat": 54.891851,
    "lon": -5.916308
  },
  {
    "key": "Slieveban",
    "names": [
      "Slieveban"
    ],
    "lat": 54.083209,
    "lon": -6.165797
  },
  {
    "key": "Shanes Hill",
    "names": [
      "Shanes Hill"
    ],
    "lat": 54.819792,
    "lon": -5.927578
  },
  {
    "key": "Torr Head",
    "names": [
      "Torr Head"
    ],
    "lat": 55.199925,
    "lon": -6.095361
  },
  {
    "key": "Skeagh",
    "names": [
      "Skeagh"
    ],
    "lat": 54.886143,
    "lon": -5.97193
  },
  {
    "key": "Skerrywhirry",
    "names": [
      "Skerrywhirry"
    ],
    "lat": 54.834742,
    "lon": -5.998588
  },
  {
    "key": "Spelga",
    "names": [
      "Spelga"
    ],
    "lat": 54.188606,
    "lon": -6.065619
  },
  {
    "key": "Slieve Gullion",
    "names": [
      "Slieve Gullion",
      "Slieve Gullion S"
    ],
    "lat": 54.129181,
    "lon": -6.443139
  },
  {
    "key": "White Mountain",
    "names": [
      "White Mountain",
      "White Mountain W",
      "White Mountain S"
    ],
    "lat": 54.863579,
    "lon": -6.851828
  },
  {
    "key": "White Park Bay",
    "names": [
      "White Park Bay"
    ],
    "lat": 55.229423,
    "lon": -6.394838
  },
  {
    "key": "Slieve Croob",
    "names": [
      "Slieve Croob"
    ],
    "lat": 54.339965,
    "lon": -5.973334
  },
  {
    "key": "Barnavave",
    "names": [
      "Barnavave",
      "Barnevave"
    ],
    "lat": 54.025038,
    "lon": -6.204715
  },
  {
    "key": "Lacken",
    "names": [
      "Lacken",
      "Sorrel Hill"
    ],
    "lat": 53.144645,
    "lon": -6.445282
  },
  {
    "key": "Lough Bray",
    "names": [
      "Lough Bray",
      "Lough Bray Upper",
      "Lough Bray Lower"
    ],
    "lat": 53.175377,
    "lon": -6.305293
  },
  {
    "key": "Great Sugar Loaf",
    "names": [
      "Great Sugar Loaf"
    ],
    "lat": 53.153975,
    "lon": -6.150266
  },
  {key:'Mount Leinster',names:['Mount Leinster','Mount Leinster N'],lat:52.616587,lon:-6.779473},
  {key:'Croagh Patrick',names:['Croagh Patrick','Croagh Patrick South take-off','Croagh Patrick East Site'],lat:53.7599,lon:-9.65878},
  {key:'Sky Road',names:['Sky Road'],lat:53.5006,lon:-10.0962},
  {key:'Maumturks',names:['Maumturk Mts','Maumturks'],lat:53.4943,lon:-9.664},
  // One regional guide, with independent anchors for the two confirmed catalogue sites.
  // Keel Bay is deliberately unassociated: its relationship to Lower Cliffs is unconfirmed.
  {key:'Achill Island',names:['Minaun Heights'],lat:53.954746,lon:-10.025487},
  {key:'Achill Island',names:['Atlantic Drive'],lat:53.897575,lon:-9.992084},
  {key:'Rossbeigh',names:['Rossbeigh Mountain','Rossbeigh'],lat:52.0476,lon:-9.981986}
];
