import type {SiteVideo} from './siteVideos';
export const REGIONS = [
    {id:'north-east', label:'North East'},
    {id:'north-west', label:'North West'},
    {id:'west', label:'West'},
    {id:'south-west', label:'South West'},
    {id:'east', label:'East'},
    {id:'south-east', label:'South East'},
] as const;
export type RegionId = typeof REGIONS[number]['id'];
export type SiteType = 'coastal' | 'inland';
export type SiteCountry = 'ireland' | 'poland';
export type SiteMetadata = {
    windReviewConfirmed?:boolean;
    country?: SiteCountry; locationNeedsVerification?: boolean; sourceName?: string;
    region?: RegionId; siteType?: SiteType; toVerify?: boolean; sourceUrl?: string; reviewGroup?: string;
    reviewState?: 'pending' | 'accepted'; reviewFinalized?: boolean; sourceDirections?: string; reviewNote?: string;
    videoCandidates?:SiteVideo[];
};

// Practical flying regions, reviewed against the coordinates in spotText.
// Keep neighbouring launch variants together; these are not county boundaries.
const regionSites: Record<RegionId, readonly string[]> = {
    'north-east': [
        'Big Colin','Dungiven','Dungiven NW','Dungiven Boviel','Mayobridge','Slemish',
        'Skerrywhirry','Skeagh','Gyles Quay Beach','Hill Beach','Agnews','Robin Youngs',
        'Shanes Hill','Knockagh Monument','Divis','Mayobridge North','Spelga','Carlingford','Slieve Foye',
        'Barnevave','Clermont Carn','Slieve Gullion','Slieve Gullion S','Slieveban',
        'Slieve Binnian East','Slieve Meelmore','Hen mountain','Ometh','Castle Roche',
        'White Mountain W','White Mountain S','Craigagh Hill','Coolnasillagh',
        'Magilligan Hells Hole','Magilligan N','Torr Head','White Park Bay','Lurigethan',
        'Slieve Croob','White Rock Beach','Dunany Co. Louth Ireland','Cave Hill','Ballycoos','Slievenamiskan',
    ],
    'north-west': [
        'Bencroy Coal Mines','Mt Errigal','Buncrana','Portsalon','Leenakeel Bay Beach',
        'Tullagh Strand','Five Finger Strand','Tramore','Dooey Beach','Muckish N',
        'Ballinreavy Strand','Tullan Strand','Cliffony Bay Beach','Ben Bulben','Cliffs of Magho',
    ],
    west: ['Fanore','Atlantic Drive','Minaun Heights','Keel Bay'],
    'south-west': [
        'Ballyhoura','Knockgour mountain','Castlefreke','Maulin','Old Head of Kinsale',
        'Inchydoney Beach','Knocknagantee','Rossbeigh Mountain','Binn Fhaiche',
        'Stradbally Beach','Ballingarraun','Smerwick','Seven Heads Bay',
    ],
    east: [
        'Bray Head','Gormanston','Ardgillan Demesne Bay Beach','Killiney Hill Park',
        'Great Sugar Loaf','Lough Tay View Point','Lough Tay S','Lough Tay E','Tonelagee',
        'Lough Bray Upper','Lough Bray Lower','Kilbeg','Sorrel Hill','Croghan Mountain','Maulin Peak',
    ],
    'south-east': ['Annagh Hill','Slieve Bui','Mount Leinster','Mount Leinster N','Blackstairs','Blackwater','Knocknasilloge Bay Beach'],
};

// Coastal means a sea-facing beach, dune, cliff or coastal ridge, not merely
// a mountain close to the coast. Inland includes lake-facing slopes (Magho).
// Initial terrain classification: site coordinates plus IHPA site descriptions.
// Sources for coastal ridges (Bray Head, Rossbeigh, Achill) and NI coast:
// https://ihpa.ie/images/ihpaie/Documents/Flying%20Site%20Guides/IHPA%20Site%20Guide.pdf
// https://ccght.org/wp-content/uploads/sites/10/2012/12/Countryside_Recreation_Strategy.pdf
// Knockgour's west-facing launch: https://www.flyappi.org/take_off/17359/
// This is editable catalogue metadata, not a flight-suitability assessment.
const coastalSites = new Set([
    'Knockgour mountain','Bray Head','Castlefreke','Gyles Quay Beach','Hill Beach',
    'Magilligan Hells Hole','Magilligan N','Torr Head','White Park Bay','Buncrana',
    'Portsalon','Leenakeel Bay Beach','Tullagh Strand','Five Finger Strand','Tramore',
    'Dooey Beach','White Rock Beach','Ballinreavy Strand','Tullan Strand','Cliffony Bay Beach',
    'Dunany Co. Louth Ireland','Gormanston','Ardgillan Demesne Bay Beach','Killiney Hill Park',
    'Blackwater','Knocknasilloge Bay Beach','Old Head of Kinsale','Inchydoney Beach',
    'Rossbeigh Mountain','Stradbally Beach','Fanore','Atlantic Drive','Minaun Heights',
    'Keel Bay','Smerwick','Seven Heads Bay',
]);
const catalog = new Map<string, SiteMetadata>();
for (const region of REGIONS) {
    for (const name of regionSites[region.id]) {
        catalog.set(name,{region:region.id,siteType:coastalSites.has(name)?'coastal':'inland'});
    }
}
export function getSiteMetadata(name: string): SiteMetadata {
    // New, unreviewed sites remain visible in All types; never guess Inland.
    return {...catalog.get(name)};
}
