import type {SiteVideo} from './siteVideos';
import {videoReviewKey} from './siteVideos.ts';
import {finalizedParaglidingMapVideoDecisions} from './paraglidingMapVideoApproval.ts';

// Candidate flying videos researched on YouTube on 2026-10-22.
// Source/search/availability evidence: reports/paraglidingmap-youtube-review-2026-10-22.json.
// Historical research queue. Permanent owner decisions are applied below;
// video approval does not verify launch wind limits.
export const paraglidingMapVideos:Record<string,SiteVideo[]>={
    "pgmap-127756": [
        {
            "url": "https://www.youtube.com/watch?v=i2R1uszj2no",
            "title": "Paragliding - Cnoc Mordain Mt. in Connemara, Ireland",
            "channel": "Paw",
            "matchNote": "Title explicitly identifies paragliding at Cnoc Mordain in Connemara, Ireland. The precise launch and published wind sectors are not confirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=ekw7B_9s1-I",
            "title": "CNOC MORDAIN TANDEM PARAGLIDING WITH MARK- 04.06.2012.wmv",
            "channel": "Jacek Chodanowski",
            "matchNote": "Title and uploader description identify tandem soaring above Cnoc Mordain (Aconeera) in Connemara. The precise launch and wind sectors are not confirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-153939": [
        {
            "url": "https://www.youtube.com/watch?v=bFF2_-EzOxE",
            "title": "paragliding ardara co donegal (little cloud spiruline)",
            "channel": "taskmastaz",
            "matchNote": "Uploader identifies the waterfall ridge outside Ardara, County Donegal. This is a candidate for the Ardara site, but the exact Meentashesk catalogue launch is not established; review the terrain match.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=dJ5ITZCvGlg",
            "title": "Paragliding at Waterfall Ardara, Donegal, Ireland",
            "channel": "paragliderworld",
            "matchNote": "Title explicitly identifies paragliding at the Ardara waterfall in Donegal. The exact Meentashesk catalogue launch is not established; review the terrain match.",
            "confidence": "area"
        }
    ],
    "pgmap-159819": [
        {
            "url": "https://www.youtube.com/watch?v=I0NTFNi5E_c",
            "title": "Paragliding Ballybanaun Mountain 17-04-16",
            "channel": "Brendan Nutley",
            "matchNote": "Title and description identify a short paragliding flight at Ballybanaun Mountain. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=UfUC7FS1ZkU",
            "title": "Paragliding Ballybanaun  11-03-17",
            "channel": "Brendan Nutley",
            "matchNote": "Title identifies paragliding at Ballybanaun; uploader describes a West Ireland flying site. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-173407": [
        {
            "url": "https://www.youtube.com/watch?v=rhJYCZZrcoU",
            "title": "Coastal Soaring Paragliding at Ballycrenane",
            "channel": "TGOTS",
            "matchNote": "YouTube title explicitly identifies coastal paragliding at Ballycrenane. Exact takeoff point and wind sector have not been checked.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=B4Oyya8rI7o",
            "title": "Scratching Ballycrenane",
            "channel": "TGOTS",
            "matchNote": "Named Ballycrenane soaring clip by the same flying channel. The description says the wind was off the slope; suitability for the published sector has not been checked.",
            "confidence": "site"
        }
    ],
    "pgmap-189983": [
        {
            "url": "https://www.youtube.com/watch?v=xQ021km1hs4",
            "title": "Paragliding Benbulben, Co. Sligo, Ireland 2025",
            "channel": "FLY THROUGH LIFE",
            "matchNote": "Title and description identify paragliding at Benbulben, County Sligo. The additional west-facing launch in this catalogue record is not established.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=Tw_DS81BTcU",
            "title": "Paragliding at Benbulben, Ireland 18/04/2014",
            "channel": "Zsolt Lengyel",
            "matchNote": "Title and description identify flying at Benbulben in County Sligo, with a local parking coordinate. The additional west-facing launch is not established.",
            "confidence": "area"
        }
    ],
    "pgmap-153942": [
        {
            "url": "https://www.youtube.com/watch?v=JVjYfb236ZA",
            "title": "Paraglide Ben Levy, Ireland - March 2011",
            "channel": "David May",
            "matchNote": "Ben Levy is the spaced-name alias of Benlevy. Uploader gives launch 53.530386,-9.40743, approximately 0.26 km from the catalogue point; the exact slope and published wind sectors still need review.",
            "confidence": "site"
        }
    ],
    "pgmap-134498": [
        {
            "url": "https://www.youtube.com/watch?v=hsfe25GRt4g",
            "title": "Winter Paragliding in Ireland | Fly Dingle | Paragliding | Hike and Fly | Paragliding Ireland",
            "channel": "Markus Wiericks",
            "matchNote": "The description explicitly places this paragliding flight at Mount Brandon, County Kerry. The approved west/northwest launch is not identified.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=zoJV_2gU8SY",
            "title": "Brandon Mt.  foot hills, Mar. 15 2014  Paul is soaring",
            "channel": "Jacek Chodanowski",
            "matchNote": "The description identifies a tandem paraglider soaring Mount Brandon foothills on the Dingle Peninsula. This is mountain-area footage; the approved west/northwest launch is not established.",
            "confidence": "area"
        }
    ],
    "pgmap-146080": [
        {
            "url": "https://www.youtube.com/watch?v=FDfQ4_HL-WA",
            "title": "Eugene and Michael paragliding the Comeragh's",
            "channel": "Eugene Gardiner",
            "matchNote": "Title explicitly identifies paragliding in the Comeragh Mountains and the thumbnail shows a paraglider in flight. The exact N–NE launch at the catalogue coordinates is not established.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=Zgi2YHw0KCo",
            "title": "XC Paragliding  in Comeraghs June 2013 ,Irish Open, Camping",
            "channel": "Rafal Mac",
            "matchNote": "Irish Open cross-country paragliding footage explicitly named for the Comeraghs. Exact launch and N–NE sector are unverified. A flying-site directory also links this exact video for the Comeraghs.",
            "confidence": "area"
        }
    ],
    "pgmap-134496": [
        {
            "url": "https://www.youtube.com/watch?v=As6b5-OmdVI",
            "title": "A scenic route along the Conor Pass | Fly Dingle | Paragliding | Hike and fly | Paragliding Ireland",
            "channel": "Markus Wiericks",
            "matchNote": "Both title and description identify paragliding along Conor Pass, County Kerry. This is a spelling variant of Connor Pass; the exact approved launch has not been checked.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=W6ydZBeF_Gw",
            "title": "Conor Pass 18 Sep 2020",
            "channel": "Gary Wellock",
            "matchNote": "Description explicitly identifies soaring at Conor Pass, County Kerry, in northeast wind. Exact takeoff coordinates and the published sector limits have not been checked.",
            "confidence": "site"
        }
    ],
    "pgmap-127681": [
        {
            "url": "https://www.youtube.com/watch?v=B1F68a7zdR0",
            "title": "Speedflying @ Cruach Mhárin, Dún Chaoin, West Kerry 23rd Aug 2012",
            "channel": "podalaigh",
            "matchNote": "The title names Cruach Mharin at Dunquin in west Kerry, matching the Cruach Marthain location. This is explicitly speedflying footage, included as a related free-flight candidate for review. The exact launch slope and wind suitability remain unverified.",
            "confidence": "site"
        }
    ],
    "pgmap-127388": [
        {
            "url": "https://www.youtube.com/watch?v=blaZCexFCKY",
            "title": "Paragliding the Devils bit Co. Tipperary Ireland",
            "channel": "Gerry Kennedy",
            "matchNote": "Title and description identify a group paragliding flight at the Devil's Bit in County Tipperary. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=y88xfwmUJX8",
            "title": "Flying at Devils bit",
            "channel": "Evgeny Evstigneev",
            "matchNote": "Title identifies flying at Devils Bit and the uploader description specifies hang gliding in Ireland. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-207802": [
        {
            "url": "https://www.youtube.com/watch?v=Ct3Fjy-Djoo",
            "title": "Paragliding at Divis and the Black Mountain",
            "channel": "greenandbluespots",
            "matchNote": "Title identifies paragliding at Divis and Black Mountain. It does not establish the additional southeast/south launch represented by this catalogue entry.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=bbJ7mJLHcqM",
            "title": "Paragliding from Divis / Black Mountain",
            "channel": "greenandbluespots",
            "matchNote": "Title identifies paragliding from Divis/Black Mountain and description identifies UHPC pilots. The additional southeast/south launch is not established.",
            "confidence": "area"
        }
    ],
    "pgmap-127366": [
        {
            "url": "https://www.youtube.com/watch?v=tRhWdwCnHRg",
            "title": "Galtee hike and fly Nov 2024",
            "channel": "Joan Ryan",
            "matchNote": "The title and description explicitly identify paragliding in the Galtee Mountains. The uploader identifies the north side and a flight over Lough Curra. This supports the named mountain range; the launch at the source marker, near Temple Hill, is unverified.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=u_IRDXqVvGg",
            "title": "Galtee paragliding hike and fly",
            "channel": "Joan Ryan",
            "matchNote": "The uploader explicitly identifies the Galty Mountains and a paragliding hike-and-fly outing. This is a candidate for the named mountain range; the exact source-marker launch, slope and wind suitability remain unverified.",
            "confidence": "area"
        }
    ],
    "pgmap-146769": [
        {
            "url": "https://www.youtube.com/watch?v=FzWhwuBjqNk",
            "title": "Galtymore Mountain Paragliding Ireland 10.10.2021",
            "channel": "Tomasz Szewczyk",
            "matchNote": "Title explicitly identifies paragliding on Galtymore in Ireland. The antenna launch in this catalogue record is not identified; review the location before accepting.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=ohMfu3vvsr4",
            "title": "Flying Galtee mor 1st paragliding flight constant big ears .m4v",
            "channel": "Mark O'Gorman",
            "matchNote": "Title identifies Galtee Mor, and the description identifies a launch partway down its north face. This supports the named mountain but does not establish the antenna launch or the exact catalogue coordinates.",
            "confidence": "area"
        }
    ],
    "pgmap-146768": [
        {
            "url": "https://www.youtube.com/watch?v=JGC3hS5aJdw",
            "title": "Paragliding Galtees Dec 2023",
            "channel": "Joan Ryan",
            "matchNote": "Description identifies a hike and fly from the north of the Galtees, flying the cliffs around Lough Curra. This is relevant northern Galtees footage; the exact Galtymore N/NE catalogue launch is unverified.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=tRhWdwCnHRg",
            "title": "Galtee hike and fly Nov 2024",
            "channel": "Joan Ryan",
            "matchNote": "Description identifies paragliding on the Galtees north side over Lough Curra. The exact Galtymore N/NE takeoff at the catalogue coordinates is not established.",
            "confidence": "area"
        }
    ],
    "pgmap-127852": [
        {
            "url": "https://www.youtube.com/watch?v=QxmCi7K5OcI",
            "title": "Paragliding Glengesh - County Donegal - Mike Launch",
            "channel": "Martin Birrane",
            "matchNote": "The title and uploader description explicitly identify a paragliding launch at Glengesh in County Donegal. The named-site match is strong; the exact source-marker slope and wind suitability remain unverified.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=JjIRuvQUZKc",
            "title": "Paragliding Glengesh - County Donegal - My Flight",
            "channel": "Martin Birrane",
            "matchNote": "The title and uploader description explicitly identify a paragliding flight at Glengesh in County Donegal. The named-site match is strong; the exact source-marker slope and wind suitability remain unverified.",
            "confidence": "site"
        }
    ],
    "pgmap-127638": [
        {
            "url": "https://www.youtube.com/watch?v=sID2Fz_RcXk",
            "title": "Gleninagh Mt.- Soraya & Keith are Soaring Above- 07.07.2012.wmv",
            "channel": "Jacek Chodanowski",
            "matchNote": "Uploader describes tandem paragliding at Gleninagh Mountain in the Burren, County Clare. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=vN-y8I8peK0",
            "title": "Gleninagh 04 Nov. 2012 24 km XC Flight",
            "channel": "Jacek Chodanowski",
            "matchNote": "Uploader identifies a paragliding XC flight from Gleninagh Mountain, County Clare. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-134473": [
        {
            "url": "https://www.youtube.com/watch?v=oEPFUAPecTA",
            "title": "Flight over Gougane Barra-seen from above, Paragliding Xc From Mweelin ending in Borlin valley.",
            "channel": "digitalkicks",
            "matchNote": "Actual paragliding cross-country footage explicitly passes over Gougane Barra. The title states that launch was at Mweelin, so this does not establish a launch from the Gougane Barra catalogue point.",
            "confidence": "area"
        }
    ],
    "pgmap-127502": [
        {
            "url": "https://www.youtube.com/watch?v=whaqT_LWvdk",
            "title": "Paragliding Ireland Healy Pass-march 2009 Bantry, Glengarriff",
            "channel": "mirek717171",
            "matchNote": "The title explicitly identifies paragliding at Healy Pass in Ireland, with Bantry and Glengarriff as regional context. The exact launch slope and wind suitability remain unverified.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=1dC5b6-askI",
            "title": "Paragliding in Ireland-Healy Pass...march2009 ...Latanie w Irlandii-Healy Pass west cork",
            "channel": "mirek717171",
            "matchNote": "The title explicitly identifies paragliding at Healy Pass in west Cork. The exact launch slope and wind suitability remain unverified.",
            "confidence": "site"
        }
    ],
    "pgmap-127501": [
        {
            "url": "https://www.youtube.com/watch?v=jTFbDAxEvsg",
            "title": "Video0041",
            "channel": "Owen Boyden",
            "matchNote": "Despite its generic title, the watch-page description explicitly identifies paragliding at Hungry Hill, West Cork. This excludes the same-name Nova Scotia site; the exact launch and wind sector remain unchecked.",
            "confidence": "site"
        }
    ],
    "pgmap-127627": [
        {
            "url": "https://www.youtube.com/watch?v=4b8_JmszcOQ",
            "title": "Rossbeigh Paraglider Tour, Part 1, Knocknadobar",
            "channel": "Tony Taylor",
            "matchNote": "The title explicitly identifies Knocknadobar on a Rossbeigh paragliding tour. The uploader describes a coastal flight past mountains and sea cliffs. This is a named-mountain flight candidate; the takeoff at the source marker and its wind suitability remain unverified.",
            "confidence": "site"
        }
    ],
    "pgmap-132966": [
        {
            "url": "https://www.youtube.com/watch?v=M1UAmhuYywA",
            "title": "Knocknakilton Triangle | Fly Dingle | Paragliding | Hike and fly | Paragliding Ireland",
            "channel": "Markus Wiericks",
            "matchNote": "Title explicitly identifies a paragliding triangle from Knocknakilton, with the description placing it in Dingle, County Kerry. Exact launch and wind sector remain unchecked.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=KgzaGSGdyPw",
            "title": "Mini XC Knocknakilton | Fly Dingle | Paragliding | Hike and Fly | Paragliding Ireland",
            "channel": "Markus Wiericks",
            "matchNote": "Title explicitly identifies a short cross-country paraglider flight at Knocknakilton; description places it near Dingle, County Kerry. Exact launch and wind sector remain unchecked.",
            "confidence": "site"
        }
    ],
    "pgmap-127775": [
        {
            "url": "https://www.youtube.com/watch?v=ZkMDJfhH1l4",
            "title": "Paragliding Maumturks, Co. Galway",
            "channel": "Martin Mc Mahon",
            "matchNote": "Title explicitly identifies paragliding in the Maumturks, County Galway. The range matches; the particular catalogue launch is not identified.",
            "confidence": "area"
        },
        {
            "url": "https://www.youtube.com/watch?v=L0jQE60kAPA",
            "title": "Maumturks Hike & Fly",
            "channel": "Uli's Flights",
            "matchNote": "Uploader describes a hike and flight in the Irish Maumturks, including a trail from the official car park. The particular catalogue launch is not identified.",
            "confidence": "area"
        }
    ],
    "pgmap-127462": [
        {
            "url": "https://www.youtube.com/watch?v=omOgWeUhxNg",
            "title": "Mt.Gabriel 230111.mp4",
            "channel": "Gilbert McGlennon",
            "matchNote": "Watch-page description explicitly identifies paragliding at Mount Gabriel, County Cork, Ireland. Exact launch and wind sector remain unchecked.",
            "confidence": "site"
        }
    ],
    "pgmap-153941": [
        {
            "url": "https://www.youtube.com/watch?v=tBprK3qsgEk",
            "title": "Paragliding O'donnells Rock Co Leitrim Ireland",
            "channel": "Simon Finlay",
            "matchNote": "Title identifies paragliding at O'Donnell's Rock, County Leitrim; uploader places the flight near Manorhamilton. Exact launch and published wind sectors are unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-132961": [
        {
            "url": "https://www.youtube.com/watch?v=d368gqT5JTA",
            "title": "Paragliding Ireland, Silvermines Mountains, Independence Pioneer, 360 video, insta360",
            "channel": "MsPfpfpf",
            "matchNote": "Title identifies paragliding in the Silvermines Mountains, Ireland. Exact launch and wind sectors are unconfirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=lFwaG5MLSYo",
            "title": "Silvermine Mountains, Apr 27 2013- Patricia is Flying Like a Bird",
            "channel": "Jacek Chodanowski",
            "matchNote": "Title and uploader description identify a tandem paragliding flight in the Silvermine Mountains. The Irish pilot/channel and local search match support the Irish range; exact launch is unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-127483": [
        {
            "url": "https://www.youtube.com/watch?v=VnP0MvW2zhY",
            "title": "Slieve Bernagh, Apr. 06 2013- Soaring Above Irish Mountains",
            "channel": "Jacek Chodanowski",
            "matchNote": "Uploader explicitly identifies tandem paragliding at Slieve Bernagh in County Clare, distinguishing it from the similarly named Mourne mountain. Exact launch is unconfirmed.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=FhTW0h54d64",
            "title": "Slieve Bernagh, Apr.06.2013- Frances Is Flying Free",
            "channel": "Jacek Chodanowski",
            "matchNote": "Uploader identifies a paragliding flight at Slieve Bernagh and explicitly places the scenery in County Clare. Exact launch is unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-127588": [
        {
            "url": "https://www.youtube.com/watch?v=-vCQA3BfRX8",
            "title": "Paragliding Slieve Gallion NE face 17/6/21",
            "channel": "PJC Adventures",
            "matchNote": "Title and uploader description identify paragliding at Slieve Gallion in Northern Ireland, specifically the NE face. The footage has not been used to infer or validate wind limits.",
            "confidence": "site"
        },
        {
            "url": "https://www.youtube.com/watch?v=kuLwv_gCsyQ",
            "title": "Paragliding Slieve Gallion  Ireland",
            "channel": "Simon Finlay",
            "matchNote": "Title identifies Slieve Gallion, Ireland; uploader places the flight near Moneymore. Exact launch and published wind limits are unconfirmed.",
            "confidence": "site"
        }
    ],
    "pgmap-127392": [
        {
            "url": "https://www.youtube.com/watch?v=kFnJy_DD53g",
            "title": "Slievereagh",
            "channel": "Gilbert McGlennon",
            "matchNote": "Title identifies Slievereagh and the inspected thumbnail shows an apparent hang-glider launch. The description is empty, so the county and exact launch require visual review.",
            "confidence": "area"
        }
    ],
    "pgmap-134480": [
        {
            "url": "https://www.youtube.com/watch?v=EvzC8qj83Us",
            "title": "Torc Waterfall and watch paragliding land",
            "channel": "Michael Herlihy",
            "matchNote": "The title identifies Torc Waterfall and a paraglider landing; the inspected thumbnail also shows a paraglider beside the road. This supports flying in the Torc area but does not identify a launch on Torc Mountain.",
            "confidence": "area"
        }
    ]
};

// Final choices ship with the catalogue, independently of browser storage.
// Keep future unreviewed additions pending; rejected associations never ship.
export const cataloguedParaglidingMapVideos:Record<string,SiteVideo[]>=Object.fromEntries(
    Object.entries(paraglidingMapVideos).map(([id,videos])=>[id,videos.flatMap(video=>{
        const decision=finalizedParaglidingMapVideoDecisions[videoReviewKey(id,video.url)];
        if(decision==='rejected')return [];
        return [{...video,...(decision==='accepted'?{reviewStatus:'accepted' as const,reviewFinalized:true}:{})}];
    })]));
