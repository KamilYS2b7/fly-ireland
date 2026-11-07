<script lang="ts">
 import type {SoundingProfile} from './sounding';
 import type {WindUnit} from './windUnits';
 import {dayValue,dayColor,dayLayers,renderDayHeatmap,dayReading} from './dayOverview';
 import type {DayLayer} from './dayOverview';
 import {soundingWindAtHeight} from './soundingInsights';
 export let profiles:SoundingProfile[]=[];
 export let timestamp=0;
 export let depthM=3000;
 export let windUnit:WindUnit='mph';
 export let onTime:(delta:number)=>void=()=>{};
 const setLayer=(key:string)=>layer=key as DayLayer;
 let layer:DayLayer='wind',selectedHour=12,selectedHeight=1000,active=false;
 const left=60,right=900,top=28,bottom=468,firstHour=8,lastHour=21,hourCount=lastHour-firstHour+1;
 $: start=Math.floor(timestamp/86400000)*86400000;
 $: ground=profiles[0]?.terrainM??profiles[0]?.levels[0].heightM??0;
 $: base=ground;
 $: ceiling=Math.max(base+500,Math.min(7000,ground+Number(depthM)));
 $: selectedHeight=Math.max(base,Math.min(ceiling,selectedHeight));
 $: rows=Array.from({length:40},(_,i)=>base+(ceiling-base)*(i+.5)/40);
 $: columns=Array.from({length:hourCount},(_,i)=>{const hour=firstHour+i;return{hour,profile:profiles.find(p=>p.timestamp===start+hour*3600000)};});
 $: cells=columns.flatMap(c=>rows.map((height,row)=>({hour:c.hour,row,height,value:c.profile?dayValue(c.profile,height,layer,windUnit):undefined})));
 $: scaleMax=layer==='wind'?Math.max(10,Math.ceil(Math.max(0,...cells.map(c=>c.value??0))/10)*10):dayLayers[layer].max;
 $: heatmap=typeof document!=='undefined'?renderDayHeatmap(columns.map(c=>rows.map(height=>c.profile?dayValue(c.profile,height,layer,windUnit):undefined)),layer,scaleMax):'';
 $: reading=dayReading(profiles,start+selectedHour*3600000,selectedHeight,layer,windUnit);
 $: value=reading.value;
 $: selectedTime=new Date(start+Math.round(selectedHour*60)*60000).toISOString().slice(11,16);
 $: unit=layer==='wind'?windUnit:layer==='thermal'?'m/s':layer==='temperature'?'°C':layer==='lapse'?'°C/km':'%';
 $: tickStep=ceiling-base<=1500?250:ceiling-base<=3500?500:1000;
 $: ticks=Array.from({length:Math.floor(ceiling/tickStep)-Math.ceil(base/tickStep)+1},(_,i)=>(Math.ceil(base/tickStep)+i)*tickStep);
 $: lclPath=columns.map((c,i)=>{
  const h=c.profile?.surfaceLclM;if(h===undefined)return '';
  const previous=columns[i-1]?.profile?.surfaceLclM;
  return `${previous===undefined?'M':'L'}${left+(c.hour-firstHour)*(right-left)/(lastHour-firstHour)},${bottom-(h-base)/(ceiling-base)*(bottom-top)}`;
 }).join(' ');
 const y=(h:number)=>bottom-(h-base)/(ceiling-base)*(bottom-top);
 const x=(hour:number)=>left+(hour-firstHour)*(right-left)/(lastHour-firstHour);
 function pointer(event:PointerEvent){
  const box=(event.currentTarget as SVGSVGElement).getBoundingClientRect(),px=(event.clientX-box.left)*960/box.width,py=(event.clientY-box.top)*520/box.height;
  if(px<left||px>right||py<top||py>bottom)return;
  active=true;selectedHour=Math.max(firstHour,Math.min(lastHour,firstHour+(px-left)/(right-left)*(lastHour-firstHour)));selectedHeight=base+(bottom-py)/(bottom-top)*(ceiling-base);
 }
 function key(event:KeyboardEvent){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(event.key))return;
  event.preventDefault();active=true;
  if(event.key==='ArrowLeft')selectedHour=Math.max(firstHour,selectedHour-1);
  if(event.key==='ArrowRight')selectedHour=Math.min(lastHour,selectedHour+1);
  if(event.key==='ArrowUp')selectedHeight=Math.min(ceiling,selectedHeight+100);
  if(event.key==='ArrowDown')selectedHeight=Math.max(base,selectedHeight-100);
  if(event.key==='Enter')onTime((start+selectedHour*3600000-timestamp)/3600000);
 }
</script>
<div class="layers" aria-label="Overview weather layer">
 {#each Object.entries(dayLayers) as [key,item]}<button type="button" aria-pressed={layer===key} on:click={()=>setLayer(key)}>{item.label}</button>{/each}
</div>
<p class="help">Time × altitude · 08:00–21:00 UTC · Tap or hover for values. Double-click a column to select its forecast hour. On mobile, scroll sideways for the whole day.</p>
<div class="scroll">
 <svg viewBox="0 0 960 520" role="application" tabindex="0" aria-label="Atmospheric day overview. Arrow keys choose hour and height; Enter selects forecast hour." on:pointermove={pointer} on:pointerdown={pointer} on:keydown={key} on:dblclick={()=>active&&onTime((start+selectedHour*3600000-timestamp)/3600000)}>
  <defs><clipPath id="overview-plot-clip"><rect x={left} y={top} width={right-left} height={bottom-top}/></clipPath><pattern id="overview-missing" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 8 0" stroke="#d6dfe3"/></pattern><linearGradient id="overview-scale" x1="0" y1="1" x2="0" y2="0">{#each [0,.2,.4,.6,.8,1] as f}<stop offset={f} stop-color={dayColor(dayLayers[layer].min+(scaleMax-dayLayers[layer].min)*f,layer,scaleMax)}/>{/each}</linearGradient></defs>
  <rect x={left} y={top} width={right-left} height={bottom-top} fill="#f4f7f8"/>
  <rect x={left} y={top} width={right-left} height={bottom-top} fill="url(#overview-missing)"/>
  <image class="smooth-heatmap" href={heatmap} x={left} y={top} width={right-left} height={bottom-top} preserveAspectRatio="none"/>
  {#each ticks as h}<line x1={left} x2={right} y1={y(h)} y2={y(h)} class="grid"/><text x={left-8} y={y(h)+4} text-anchor="end">{Math.round(h).toLocaleString('en-GB')}</text>{/each}
  {#each columns as c}
   {#if true}<text x={x(c.hour)} y={bottom+22} text-anchor="middle">{String(c.hour).padStart(2,'0')}:00</text>{/if}
   {#if c.profile}
    {#each rows.filter((_,i)=>i%4===2) as h}
     {@const point=soundingWindAtHeight(c.profile,h)}
     {#if point?.windDirection!==undefined&&point.windMps!==undefined&&point.windMps>.1}<g transform={`translate(${x(c.hour)},${y(h)}) rotate(${point.windDirection})`} class="wind-arrow"><path d="M0 -7V7M-3 3 0 7 3 3"/></g>{/if}
    {/each}

   {/if}
  {/each}
  <path d={lclPath} class="lcl" fill="none" clip-path="url(#overview-plot-clip)"/>
  {#if profiles[0]?.takeoffM!==undefined&&profiles[0].takeoffM>=base&&profiles[0].takeoffM<=ceiling}<line x1={left} x2={right} y1={y(profiles[0].takeoffM)} y2={y(profiles[0].takeoffM)} class="takeoff"/>{/if}
  <text x={left} y="16">m ASL</text><text x={(left+right)/2} y="510" text-anchor="middle">Forecast hour (UTC)</text>
  <rect x="918" y={top} width="12" height={bottom-top} fill="url(#overview-scale)"/>
  {#each [0,.25,.5,.75,1] as f}<text x="934" y={bottom-f*(bottom-top)+4}>{Number((dayLayers[layer].min+(scaleMax-dayLayers[layer].min)*f).toFixed(1))}</text>{/each}
  {#if (timestamp-start)/3600000>=firstHour&&(timestamp-start)/3600000<=lastHour}<line x1={x((timestamp-start)/3600000)} x2={x((timestamp-start)/3600000)} y1={top} y2={bottom} class="current"/>{/if}
  {#if active}<line x1={left} x2={right} y1={y(selectedHeight)} y2={y(selectedHeight)} class="cursor"/><line x1={x(selectedHour)} x2={x(selectedHour)} y1={top} y2={bottom} class="cursor"/><circle cx={x(selectedHour)} cy={y(selectedHeight)} r="4" fill="white" stroke="#133449"/><g transform={`translate(${Math.min(right-190,Math.max(left,x(selectedHour)+10))},${Math.max(top+5,Math.min(bottom-45,y(selectedHeight)-46))})`} class="tooltip"><rect width="188" height="40" rx="4"/><text x="8" y="15">{selectedTime} UTC · {Math.round(selectedHeight)} m ASL</text><text x="8" y="31">{value===undefined?'No data':value.toFixed(1)+' '+unit}</text></g>{/if}
 </svg>
</div>
<div class="reading" aria-live="polite">{#if active}<strong>{selectedTime} UTC · {Math.round(selectedHeight).toLocaleString('en-GB')} m ASL · {value===undefined?'No data':value.toFixed(1)+' '+unit}</strong><span>{reading.direction===undefined?'Wind direction unavailable':`Wind from ${Math.round(reading.direction)}°`}</span><button type="button" disabled={value===undefined} on:click={()=>onTime((start+selectedHour*3600000-timestamp)/3600000)}>Use {selectedTime} UTC</button>{:else}<span>Select a time and height on the chart.</span>{/if}</div>
{#if layer==='thermal'}<p class="thermal-note">Experimental dry air updraft, not a SkySight or Windy thermal forecast. Assumes a +3°C parcel and 100 m radius; stops at condensation, stalled ascent or missing data. No terrain lift, cloud updraft or wing sink. Hatched areas mean no estimate, not zero lift.</p>{/if}
<p class="key">{dayLayers[layer].label} ({unit}) · White line: estimated LCL · Dashed line: takeoff · Hatched areas: no data</p>
<p class="help">Near-surface wind is at 10 m above model ground, with interpolation to the lowest pressure level. No data is extended below that height. Hourly forecast profiles, interpolated vertically between model levels. Colours are smoothly interpolated between valid hours and heights; missing cells remain blank. Cloud cover is interpolated between native cloud levels; LCL does not guarantee clouds. Humidity is derived from temperature and dew point. Lapse rate is the temperature decrease per km between model levels. Wind arrows show horizontal direction, not rising or sinking air.</p>
<style>
 .thermal-note{font:11px/1.5 system-ui;color:#825c2d;}
 .tooltip{pointer-events:none;}.tooltip rect{fill:white;fill-opacity:.95;stroke:#90aab6;}.tooltip text{font-weight:600;}
 .layers{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px;}button{font:600 11px system-ui;min-height:34px;padding:6px 10px;border:1px solid #cbdadf;border-radius:5px;background:white;color:#46616d;cursor:pointer;}button[aria-pressed="true"]{background:#276e85;color:white;border-color:#276e85;}.help,.key{font:11px/1.5 system-ui;color:#607984;margin:8px 0;}.scroll{overflow-x:auto;overscroll-behavior:contain;}svg{display:block;width:100%;min-width:760px;font:11px system-ui;}svg text{fill:#45616c;}.grid{stroke:#fff;stroke-opacity:.2;}.wind-arrow path{fill:none;stroke:#152e3c;stroke-width:1.2;}.lcl{stroke:white;stroke-width:2.5;}.takeoff{stroke:#262b30;stroke-dasharray:5 4;stroke-width:2;}.current{stroke:#fff;stroke-width:1;stroke-dasharray:2 6;}.cursor{stroke:#fff;stroke-width:1;stroke-dasharray:4 3;}.reading{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;min-height:40px;font:12px system-ui;color:#315c6e;margin:8px 0;}button:focus-visible,svg:focus-visible{outline:2px solid #299ad0;outline-offset:2px;}
</style>
