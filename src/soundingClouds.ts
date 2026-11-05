import type {SoundingProfile} from './sounding';
// Coverage is sampled at model levels; cell edges interpolate the vertical domain.
// They are not exact predicted cloud base/top boundaries, and never come from LCL.
export function soundingCloudBands(profile:SoundingProfile){
    const levels=profile.clouds??[],ground=profile.terrainM??levels[0]?.heightM??0;
    return levels.flatMap((level,index)=>{
        if(level.coverPct===undefined||level.coverPct<=0||level.coverPct>100)return[];
        const previous=levels[index-1],next=levels[index+1];
        const bottomM=Math.max(ground,previous?(previous.heightM+level.heightM)/2:level.heightM);
        const topM=next?(level.heightM+next.heightM)/2:level.heightM;
        if(topM<bottomM)return[];
        return[{heightM:level.heightM,bottomM,topM,coverPct:level.coverPct,pointOnly:levels.length===1}];
    });
}
