import type {SoundingProfile} from './sounding';
import {soundingAtHeight} from './soundingInsights.ts';
import {estimateThermalUpdraft,thermalAtHeight} from './thermalUpdraft.ts';
const thermalCache=new WeakMap<SoundingProfile,ReturnType<typeof estimateThermalUpdraft>>();
import {saturationVaporPressure} from './vendor/flyxc/atmosphere.ts';
import {convertWindSpeed} from './windUnits.ts';
import type {WindUnit} from './windUnits';
export type DayLayer='wind'|'temperature'|'humidity'|'cloud'|'lapse'|'thermal';
export const dayLayers={thermal:{label:'Thermal strength (est.)',min:0,max:5},wind:{label:'Wind speed',min:0,max:40},temperature:{label:'Temperature',min:-20,max:30},humidity:{label:'Relative humidity',min:0,max:100},cloud:{label:'Cloud cover',min:0,max:100},lapse:{label:'Lapse rate',min:-3,max:12}};
export function dayValue(profile:SoundingProfile,height:number,layer:DayLayer,unit:WindUnit){
 if(layer==='thermal'){
  let estimate=thermalCache.get(profile);if(!estimate){estimate=estimateThermalUpdraft(profile);thermalCache.set(profile,estimate);}
  return estimate.status==='available'?thermalAtHeight(estimate,height)?.speedMps:undefined;
 }
 const point=soundingAtHeight(profile,height);if(!point)return undefined;
 if(layer==='wind')return point.windMps===undefined?undefined:convertWindSpeed(point.windMps*2.2369362921,unit);
 if(layer==='temperature')return point.temperatureC;
 if(layer==='humidity')return point.dewPointC===undefined?undefined:Math.max(0,Math.min(100,100*saturationVaporPressure(point.dewPointC+273.15)/saturationVaporPressure(point.temperatureC+273.15)));
 if(layer==='lapse'){
  const levels=profile.levels,index=levels.findIndex(l=>l.heightM>height),b=levels[index],a=levels[index-1];
  return a&&b&&!b.gapBefore?(a.temperatureC-b.temperatureC)*1000/(b.heightM-a.heightM):undefined;
 }
 const clouds=profile.clouds??[],index=clouds.findIndex(l=>l.heightM>=height);
 if(index<0||height<(clouds[0]?.heightM??Infinity))return undefined;
 const b=clouds[index],a=b.heightM===height?b:clouds[index-1];
 if(!a||a.coverPct===undefined||b.coverPct===undefined)return undefined;
 return a===b?b.coverPct:a.coverPct+(b.coverPct-a.coverPct)*(height-a.heightM)/(b.heightM-a.heightM);
}
export function dayColor(value:number,layer:DayLayer,max?:number){
 const spec=dayLayers[layer],f=Math.max(0,Math.min(1,(value-spec.min)/((max??spec.max)-spec.min)));
 if(layer==='thermal')return `hsl(${120-f*120} 78% ${92-f*45}%)`;
 if(layer==='cloud')return `hsl(210 16% ${97-f*65}%)`;
 return `hsl(${240-f*240} 72% ${52+Math.sin(f*Math.PI)*8}%)`;
}

// Bilinear interpolation within valid data; missing cells stay missing.
export function smoothGrid(grid:(number|undefined)[][],x:number,y:number){
 const width=grid.length,height=grid[0]?.length??0;if(!width||!height)return undefined;
 x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));
 const a=Math.floor(x),b=Math.min(width-1,a+1),c=Math.floor(y),d=Math.min(height-1,c+1),fx=x-a,fy=y-c;
 const v=[grid[a][c],grid[b][c],grid[a][d],grid[b][d]];
 if(v.some(n=>n===undefined))return grid[Math.round(x)][Math.round(y)];
 return (v[0]!*(1-fx)+v[1]!*fx)*(1-fy)+(v[2]!*(1-fx)+v[3]!*fx)*fy;
}
export function renderDayHeatmap(grid:(number|undefined)[][],layer:DayLayer,max:number){
 const canvas=document.createElement('canvas');canvas.width=840;canvas.height=440;
 const context=canvas.getContext('2d');if(!context)return '';
 const image=context.createImageData(canvas.width,canvas.height),spec=dayLayers[layer];
 const bounds=grid.map(column=>{const valid=column.flatMap((v,i)=>v===undefined?[]:[i]);return valid.length?{low:valid[0],high:valid.at(-1)!}:undefined;});
 const palette=Array.from({length:256},(_,i)=>{
  context.fillStyle=dayColor(spec.min+(max-spec.min)*i/255,layer,max);context.fillRect(0,0,1,1);
  return context.getImageData(0,0,1,1).data.slice(0,3);
 });
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
  const gx=Math.max(0,Math.min(grid.length-1,(x+.5)/canvas.width*(grid.length-1))),gy=(1-(y+.5)/canvas.height)*(grid[0]?.length??0)-.5;
  let value=smoothGrid(grid,gx,gy);
  if(layer==='thermal'){
   const a=Math.floor(gx),b=Math.min(grid.length-1,a+1),f=gx-a,lo=bounds[a],hi=bounds[b];
   if(lo&&hi){
    if(gy<lo.low*(1-f)+hi.low*f-.5||gy>lo.high*(1-f)+hi.high*f+.5)value=undefined;
    else{
     const va=smoothGrid(grid,a,Math.max(lo.low,Math.min(lo.high,gy))),vb=smoothGrid(grid,b,Math.max(hi.low,Math.min(hi.high,gy)));
     value=va===undefined||vb===undefined?undefined:va*(1-f)+vb*f;
    }
   }
  }
  if(value===undefined)continue;
  const color=palette[Math.round(Math.max(0,Math.min(1,(value-spec.min)/(max-spec.min)))*255)],offset=(y*canvas.width+x)*4;
  image.data.set(color,offset);image.data[offset+3]=255;
 }
 context.putImageData(image,0,0);return canvas.toDataURL('image/png');
}

export function dayReading(profiles:SoundingProfile[],timestamp:number,height:number,layer:DayLayer,unit:WindUnit){
 const a=profiles.find(p=>p.timestamp===Math.floor(timestamp/3600000)*3600000);
 const b=timestamp%3600000===0?a:profiles.find(p=>p.timestamp===Math.ceil(timestamp/3600000)*3600000);
 if(!a||!b)return {value:undefined,direction:undefined};
 const f=a===b?0:(timestamp-a.timestamp)/(b.timestamp-a.timestamp),va=dayValue(a,height,layer,unit),vb=dayValue(b,height,layer,unit);
 let value=va===undefined||vb===undefined?undefined:va+(vb-va)*f;
 const wa=soundingAtHeight(a,height),wb=soundingAtHeight(b,height);let direction:number|undefined;
 if(wa?.windMps!==undefined&&wb?.windMps!==undefined&&wa.windDirection!==undefined&&wb.windDirection!==undefined){
  const u=wa.windMps*Math.sin(wa.windDirection*Math.PI/180)*(1-f)+wb.windMps*Math.sin(wb.windDirection*Math.PI/180)*f;
  const v=wa.windMps*Math.cos(wa.windDirection*Math.PI/180)*(1-f)+wb.windMps*Math.cos(wb.windDirection*Math.PI/180)*f;
  const speed=Math.hypot(u,v);if(speed>1e-6)direction=(Math.atan2(u,v)*180/Math.PI+360)%360;
  if(layer==='wind')value=convertWindSpeed(speed*2.2369362921,unit);
 }
 return {value,direction};
}
