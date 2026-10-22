export type WindRange = {start:number;end:number;endExclusive?:boolean};
export type DirectionRanges = {sectorStart:number;sectorEnd:number;windRanges?:WindRange[]};
const norm=(degrees:number)=>((degrees%360)+360)%360;

// Flybubble's public client uses floor(direction / 22.5): bins begin at N,
// rather than being centred on compass labels. Both ratings 1 and 2 are usable.
// Source: weather.flybubble.com public client and /v1/weather/sites wind_dir.
export function rangesFromFlybubble(sectors:unknown):WindRange[] {
    if(!Array.isArray(sectors)||sectors.length!==16||!sectors.every(v=>v===0||v===1||v===2))return [];
    const ranges:WindRange[]=[];
    for(let i=0;i<16;i++){
        if(sectors[i]===0)continue;
        const start=i;
        while(i+1<16&&sectors[i+1]>0)i++;
        ranges.push({start:start*22.5,end:(i+1)*22.5,endExclusive:true});
    }
    if(ranges.length>1&&ranges[0].start===0&&ranges[ranges.length-1].end===360){
        const first=ranges.shift()!;
        ranges[ranges.length-1].end=first.end;
    }
    return ranges;
}

// Paragliding Map's detail cards paint eight 45° wedges centred on N/NE/…/NW
// (windzeiger-*-green.png). These are compass categories, not measured degree
// limits. Keep separated wedges separate and use clockwise, half-open edges.
export function rangesFromParaglidingMap(directions:unknown):WindRange[] {
    if(typeof directions!=='string'||!directions.trim())return [];
    const compass=['N','NE','E','SE','S','SW','W','NW'];
    const labels=directions.split(',').map(label=>label.trim().toUpperCase());
    if(labels.some(label=>!compass.includes(label)))return [];
    const bins=compass.map(label=>labels.includes(label));
    if(bins.every(Boolean))return [{start:0,end:360,endExclusive:true}];
    const ranges:WindRange[]=[];
    for(let i=0;i<8;i++){
        if(!bins[i])continue;
        const start=i;
        while(i+1<8&&bins[i+1])i++;
        ranges.push({start:norm(start*45-22.5),end:(i+1)*45-22.5,endExclusive:true});
    }
    if(ranges.length>1&&bins[0]&&bins[7]){
        const first=ranges.shift()!;
        ranges[ranges.length-1].end=first.end;
    }
    return ranges;
}
export function windRanges(spot:DirectionRanges):WindRange[]{
    const ranges=spot.windRanges??[{start:spot.sectorStart,end:spot.sectorEnd}];
    return ranges.every(r=>Number.isFinite(r.start)&&Number.isFinite(r.end))?ranges:[];
}
export function directionMatches(ranges:WindRange[],direction:number):boolean{
    return ranges.some(range=>{
        const sweep=norm(range.end-range.start)||360;
        const offset=norm(direction-range.start);
        return sweep===360||offset>=360-1e-9
            ||(range.endExclusive?offset<sweep-1e-9:offset<=sweep+1e-9);
    });
}
export function formatWindRanges(spot:DirectionRanges):string{
    return windRanges(spot).map(r=>`${r.start}°–${r.end}°`).join(' / ')||'No direction range';
}
