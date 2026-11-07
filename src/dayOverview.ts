import type {SoundingProfile} from './sounding';
import {soundingAtHeight} from './soundingInsights.ts';
import {soundingCloudBands} from './soundingClouds.ts';
import {saturationVaporPressure} from './vendor/flyxc/atmosphere.ts';
import {convertWindSpeed} from './windUnits.ts';
import type {WindUnit} from './windUnits';
export type DayLayer='wind'|'temperature'|'humidity'|'cloud'|'lapse';
export const dayLayers={wind:{label:'Wind speed',min:0,max:40},temperature:{label:'Temperature',min:-20,max:30},humidity:{label:'Relative humidity',min:0,max:100},cloud:{label:'Cloud cover',min:0,max:100},lapse:{label:'Lapse rate',min:-3,max:12}};
export function dayValue(profile:SoundingProfile,height:number,layer:DayLayer,unit:WindUnit){
 const point=soundingAtHeight(profile,height);if(!point)return undefined;
 if(layer==='wind')return point.windMps===undefined?undefined:convertWindSpeed(point.windMps*2.2369362921,unit);
 if(layer==='temperature')return point.temperatureC;
 if(layer==='humidity')return point.dewPointC===undefined?undefined:Math.max(0,Math.min(100,100*saturationVaporPressure(point.dewPointC+273.15)/saturationVaporPressure(point.temperatureC+273.15)));
 if(layer==='lapse'){
  const levels=profile.levels,index=levels.findIndex(l=>l.heightM>height),b=levels[index],a=levels[index-1];
  return a&&b&&!b.gapBefore?(a.temperatureC-b.temperatureC)*1000/(b.heightM-a.heightM):undefined;
 }
 const clouds=profile.clouds??[];
 const band=soundingCloudBands(profile).find(b=>!b.pointOnly&&height>=b.bottomM&&height<b.topM);
 if(band)return band.coverPct;
 // Clear samples also own cells; unknown coverage stays unknown.
 const index=clouds.findIndex((l,i)=>height>=(i?(clouds[i-1].heightM+l.heightM)/2:l.heightM)&&height<(clouds[i+1]?(clouds[i+1].heightM+l.heightM)/2:l.heightM));
 return index<0?undefined:clouds[index].coverPct;
}
export function dayColor(value:number,layer:DayLayer,max?:number){
 const spec=dayLayers[layer],f=Math.max(0,Math.min(1,(value-spec.min)/((max??spec.max)-spec.min)));
 if(layer==='cloud')return `hsl(210 16% ${97-f*65}%)`;
 return `hsl(${240-f*240} 72% ${52+Math.sin(f*Math.PI)*8}%)`;
}
