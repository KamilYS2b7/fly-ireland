import type {SoundingProfile} from './sounding';
import {convertWindSpeed} from './windUnits.ts';
import type {WindUnit} from './windUnits';
export function buildSoundingChart(profile:SoundingProfile,unit:WindUnit,width=640){
    const height=440,left=52,top=30,bottom=396,windLeft=width-104,windRight=width-32,tempRight=windLeft-24;
    const ground=profile.terrainM??profile.levels[0].heightM;
    const minHeight=Math.floor(Math.min(ground,profile.levels[0].heightM)/250)*250;
    const maxHeight=Math.min(7000,Math.max(minHeight+1000,Math.ceil(profile.levels.at(-1)!.heightM/500)*500));
    const levels=profile.levels.filter(l=>l.heightM<=maxHeight);
    const values=levels.flatMap(l=>[l.temperatureC,...(l.dewPointC===undefined?[]:[l.dewPointC])]);
    const minTemp=Math.floor((Math.min(...values)-5)/5)*5,maxTemp=Math.ceil((Math.max(...values)+5)/5)*5;
    const windMax=Math.max(10,Math.ceil(Math.max(...levels.map(l=>l.windMps===undefined?0:convertWindSpeed(l.windMps*2.2369362921,unit)))/10)*10);
    const y=(z:number)=>bottom-(z-minHeight)/(maxHeight-minHeight)*(bottom-top);
    const xTemp=(c:number)=>left+(c-minTemp)/(maxTemp-minTemp)*(tempRight-left);
    const xWind=(mps:number)=>windLeft+convertWindSpeed(mps*2.2369362921,unit)/windMax*(windRight-windLeft);
    const trace=(values:({x:number;y:number}|undefined)[])=>{let drawing=false;return values.map(p=>{if(!p){drawing=false;return'';}const cmd=drawing?'L':'M';drawing=true;return`${cmd}${p.x.toFixed(2)},${p.y.toFixed(2)}`;}).join(' ');};
    const heightAt=(pressure:number)=>{
        const all=profile.levels,index=all.findIndex(l=>l.pressureHpa<=pressure);
        if(index<0||pressure>all[0].pressureHpa)return undefined;
        if(!index||all[index].pressureHpa===pressure)return all[index].heightM;
        const a=all[index-1],b=all[index],f=Math.log(pressure/a.pressureHpa)/Math.log(b.pressureHpa/a.pressureHpa);
        return a.heightM+(b.heightM-a.heightM)*f;
    };
    const parcel=profile.parcel?[...profile.parcel.dry,...profile.parcel.wet].map(([temp,pressure])=>{const z=heightAt(pressure);return z===undefined||z>maxHeight?undefined:{x:xTemp(temp-273.15),y:y(z)};}):[];
    const ticks:number[]=[];for(let h=Math.ceil(minHeight/1000)*1000;h<=maxHeight;h+=1000)ticks.push(h);
    const tempTicks=Array.from({length:5},(_,i)=>minTemp+(maxTemp-minTemp)*i/4);
    let previousY=-Infinity;
    const arrows=[...levels].reverse().filter(l=>{const pos=y(l.heightM);if(l.windDirection===undefined||l.windMps===undefined||pos-previousY<25)return false;previousY=pos;return true;});
    return{width,height,left,top,bottom,windLeft,windRight,tempRight,minHeight,maxHeight,ground,y,xTemp,xWind,ticks,tempTicks,windMax,arrows,
        temperature:trace(levels.flatMap(l=>[...(l.gapBefore?[undefined]:[]),{x:xTemp(l.temperatureC),y:y(l.heightM)}])),
        dewPoint:trace(levels.flatMap(l=>[...(l.gapBefore?[undefined]:[]),l.dewPointC===undefined?undefined:{x:xTemp(l.dewPointC),y:y(l.heightM)}])),
        wind:trace(levels.flatMap(l=>[...(l.gapBefore?[undefined]:[]),l.windMps===undefined?undefined:{x:xWind(l.windMps),y:y(l.heightM)}])),
        parcel:trace(parcel),
    };
}
