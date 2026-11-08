<script lang="ts">
 import {cloudSymbols} from './cloudSymbols';
 import {cloudContours} from './cloudContours';
 import {heightLabel,heightFactor,altitudeTicks,smoothHeightPath,sampleSmoothHeight,pairedReadoutPositions} from './overviewAltitude';
 import type {HeightUnit} from './overviewAltitude';
 import type {SoundingProfile} from './sounding';
 import type {WindUnit} from './windUnits';
 import {dayValue,dayColor,dayLayers,renderDayHeatmap,dayReading,dayLayerBounds} from './dayOverview';
 import type {DayLayer} from './dayOverview';
 import {soundingWindAtHeight} from './soundingInsights';
 export let profiles:SoundingProfile[]=[];
 export let timestamp=0;
 export let depthM=3000;
 export let windUnit:WindUnit='mph';
 export let heightUnit:HeightUnit='m';
 export let onTime:(delta:number)=>void=()=>{};
 const setLayer=(key:string)=>layer=key as DayLayer;
 let cloudWind=false;
 let layer:DayLayer='wind',selectedHour=12,selectedHeight=1000,active=false,snapped=false;
 const left=60,right=900,top=28,bottom=468,firstHour=8,lastHour=21,hourCount=lastHour-firstHour+1;
 $: start=Math.floor(timestamp/86400000)*86400000;
 $: ground=profiles[0]?.terrainM??profiles[0]?.levels[0].heightM??0;
 $: coverage=profiles.flatMap(p=>{const bounds=dayLayerBounds(p,layer);return bounds?[bounds]:[];});
 $: base=coverage.length?Math.max(ground,...coverage.map(b=>b.bottom)):ground;
 $: dataTop=coverage.length?Math.min(...coverage.map(b=>b.top)):7000;
 $: ceiling=Math.max(base+1,Math.min(dataTop,7000,Math.max(base+100,ground+Number(depthM))));
 $: selectedHeight=Math.max(base,Math.min(ceiling,selectedHeight));
 $: rows=Array.from({length:40},(_,i)=>base+(ceiling-base)*(i+.5)/40);
 $: columns=Array.from({length:hourCount},(_,i)=>{const hour=firstHour+i;return{hour,profile:profiles.find(p=>p.timestamp===start+hour*3600000)};});
 $: cloudIcons=layer==='cloud'?cloudSymbols(columns.map(c=>rows.map(height=>c.profile?dayValue(c.profile,height,'cloud',windUnit):undefined))):[];
 $: cloudLines=layer==='cloud'?cloudContours(columns.map(c=>rows.map(height=>c.profile?dayValue(c.profile,height,'cloud',windUnit):undefined))):[];
 $: cloudLabels=cloudLines.filter(line=>line.points.length>35).reduce((labels,line)=>{
  const p=line.points[Math.floor(line.points.length/2)],px=left+p.x*(right-left),py=top+p.y*(bottom-top);
  if(px>left+24&&px<right-24&&py>top+14&&py<bottom-14&&!labels.some(l=>Math.abs(l.x-px)<95&&Math.abs(l.y-py)<30))labels.push({x:px,y:py,threshold:line.threshold});
  return labels;
 },[] as {x:number;y:number;threshold:number}[]);
 $: cells=columns.flatMap(c=>rows.map((height,row)=>({hour:c.hour,row,height,value:c.profile?dayValue(c.profile,height,layer,windUnit):undefined})));
 $: scaleMax=layer==='wind'?Math.max(10,Math.ceil(Math.max(0,...cells.map(c=>c.value??0))/10)*10):dayLayers[layer].max;
 $: heatmap=typeof document!=='undefined'?renderDayHeatmap(columns.map(c=>rows.map(height=>c.profile?dayValue(c.profile,height,layer,windUnit):undefined)),layer,scaleMax):'';
 $: reading=dayReading(profiles,start+selectedHour*3600000,selectedHeight,layer,windUnit);
 $: value=reading.value;
 $: selectedTime=new Date(start+Math.round(selectedHour*60)*60000).toISOString().slice(11,16);
 $: unit=layer==='wind'?windUnit:layer==='temperature'?'°C':layer==='lapse'?'°C/km':'%';
 $: ticks=altitudeTicks(base,ceiling,heightUnit);
 $: lclPath=smoothHeightPath(columns.map(c=>{
  const h=c.profile?.surfaceLclM;
  return h===undefined?undefined:{x:left+(c.hour-firstHour)*(right-left)/(lastHour-firstHour),y:bottom-(h-base)/(ceiling-base)*(bottom-top)};
 }));
 $: lclSamples=columns.map(c=>c.profile?.surfaceLclM===undefined?undefined:{x:c.hour,y:c.profile.surfaceLclM});
 $: cursorLcl=sampleSmoothHeight(lclSamples,selectedHour);
 $: lclVisible=cursorLcl!==undefined&&cursorLcl>=base&&cursorLcl<=ceiling;
 $: lclDelta=cursorLcl===undefined||profiles[0]?.takeoffM===undefined?undefined:cursorLcl-profiles[0].takeoffM;
 $: readoutSide=x(selectedHour)+265+13>right?'end':'start';
 $: lclBoxX=x(selectedHour)+(readoutSide==='end'?-13:13);
 $: readoutPositions=pairedReadoutPositions(y(selectedHeight),cursorLcl===undefined?y(selectedHeight):Math.max(top,Math.min(bottom,y(cursorLcl))),top,bottom);
 $: lclBoxY=readoutPositions.lcl;
 $: lclAnchor=columns.filter(c=>c.profile?.surfaceLclM!==undefined&&c.profile.surfaceLclM>=base&&c.profile.surfaceLclM<=ceiling).sort((a,b)=>Math.abs(a.hour-11)-Math.abs(b.hour-11))[0];
 $: y=(h:number)=>bottom-(h-base)/(ceiling-base)*(bottom-top);
 const x=(hour:number)=>left+(hour-firstHour)*(right-left)/(lastHour-firstHour);
 function pointer(event:PointerEvent){
  const box=(event.currentTarget as SVGSVGElement).getBoundingClientRect(),px=(event.clientX-box.left)*960/box.width,py=(event.clientY-box.top)*520/box.height;
  if(px<left||px>right||py<top||py>bottom)return;
  active=true;selectedHour=Math.max(firstHour,Math.min(lastHour,firstHour+(px-left)/(right-left)*(lastHour-firstHour)));const lcl=sampleSmoothHeight(lclSamples,selectedHour);
  snapped=lcl!==undefined&&lcl>=base&&lcl<=ceiling&&Math.abs(py-y(lcl))<=12;
  selectedHeight=snapped?lcl!:base+(bottom-py)/(bottom-top)*(ceiling-base);
 }
 function key(event:KeyboardEvent){
  if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(event.key))return;
  event.preventDefault();active=true;snapped=false;
  if(event.key==='ArrowLeft')selectedHour=Math.max(firstHour,selectedHour-1);
  if(event.key==='ArrowRight')selectedHour=Math.min(lastHour,selectedHour+1);
  if(event.key==='ArrowUp')selectedHeight=Math.min(ceiling,selectedHeight+100);
  if(event.key==='ArrowDown')selectedHeight=Math.max(base,selectedHeight-100);
  if(event.key==='Enter')onTime((start+selectedHour*3600000-timestamp)/3600000);
 }
</script>
<div class="layers" aria-label="Overview weather layer">
 {#each Object.entries(dayLayers) as [key,item]}<button type="button" aria-pressed={layer===key} on:click={()=>setLayer(key)}>{item.label}</button>{/each}
 {#if layer==='cloud'}<button class="wind-toggle" type="button" aria-pressed={cloudWind} on:click={()=>cloudWind=!cloudWind}>Wind arrows: {cloudWind?'on':'off'}</button>{/if}
</div>
<div class="scroll">
 <svg viewBox="0 0 960 520" role="application" tabindex="0" aria-label="Atmospheric day overview. Arrow keys choose hour and height; Enter selects forecast hour." on:pointermove={pointer} on:pointerdown={pointer} on:keydown={key} on:dblclick={()=>active&&onTime((start+selectedHour*3600000-timestamp)/3600000)}>
  <defs><path id="overview-cloud-symbol" d="M-9 5C-15 5-15-3-9-3C-10-12 4-14 7-5C15-7 20 5 11 5Z"/><clipPath id="overview-plot-clip"><rect x={left} y={top} width={right-left} height={bottom-top}/></clipPath><pattern id="overview-missing" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 8 8 0" stroke="#d6dfe3"/></pattern><linearGradient id="overview-scale" x1="0" y1="1" x2="0" y2="0">{#each (layer==='cloud'?[0,.249,.25,.5,.75,1]:[0,.2,.4,.6,.8,1]) as f}<stop offset={f} stop-color={dayColor(dayLayers[layer].min+(scaleMax-dayLayers[layer].min)*f,layer,scaleMax)}/>{/each}</linearGradient></defs>
  <rect x={left} y={top} width={right-left} height={bottom-top} fill="#f4f7f8"/>
  <rect x={left} y={top} width={right-left} height={bottom-top} fill="url(#overview-missing)"/>
  <image class="smooth-heatmap" href={heatmap} x={left} y={top} width={right-left} height={bottom-top} preserveAspectRatio="none"/>
  {#if layer==='cloud'}
   <g class="cloud-contours" clip-path="url(#overview-plot-clip)">
    {#each cloudIcons as cloud}<use href="#overview-cloud-symbol" class="cloud-symbol" transform={`translate(${left+cloud.x*(right-left)},${top+cloud.y*(bottom-top)}) scale(${cloud.scale})`}/>{/each}
    {#each cloudLines as line}<path d={line.points.map((p,i)=>`${i?'L':'M'}${left+p.x*(right-left)},${top+p.y*(bottom-top)}`).join(' ')} class="cloud-contour" class:cloud-edge={line.threshold===25}/>{/each}
    {#each cloudLabels as label}<text x={label.x} y={label.y} text-anchor="middle" class="cloud-percentage">{label.threshold}%</text>{/each}
   </g>
  {/if}
  {#each ticks as h}<line x1={left} x2={right} y1={y(h)} y2={y(h)} class="grid"/><text x={left-8} y={y(h)+4} text-anchor="end">{Math.round(h*heightFactor(heightUnit)).toLocaleString('en-GB')}</text>{/each}
  {#each columns as c}
   {#if true}<text x={x(c.hour)} y={bottom+22} text-anchor="middle">{String(c.hour).padStart(2,'0')}:00</text>{/if}
   {#if c.profile&&(layer!=='cloud'||cloudWind)&& (layer!=='cloud'||c.hour%2===0)}
    {#each rows.filter((_,i)=>layer==='cloud'?i%8===4:i%4===2) as h}
     {@const point=soundingWindAtHeight(c.profile,h)}
     {#if point?.windDirection!==undefined&&point.windMps!==undefined&&point.windMps>.1}<g transform={`translate(${x(c.hour)},${y(h)}) rotate(${point.windDirection})`} class="wind-arrow"><path d="M0 -7V7M-3 3 0 7 3 3"/></g>{/if}
    {/each}

   {/if}
  {/each}
  <path d={lclPath} class="lcl" fill="none" clip-path="url(#overview-plot-clip)"/>
  {#if profiles[0]?.takeoffM!==undefined&&profiles[0].takeoffM>=base&&profiles[0].takeoffM<=ceiling}<line x1={left} x2={right} y1={y(profiles[0].takeoffM)} y2={y(profiles[0].takeoffM)} class="takeoff"/>{/if}
  {#if !active&&lclAnchor?.profile?.surfaceLclM!==undefined}
   <g class="line-tag" transform={`translate(${Math.min(right-176,Math.max(left+8,x(lclAnchor.hour)))},${Math.max(top+2,y(lclAnchor.profile.surfaceLclM)-29)})`}><rect width="172" height="20" rx="4"/><text x="7" y="14">LCL · condensation level</text></g>
  {/if}
  {#if profiles[0]?.takeoffM!==undefined&&profiles[0].takeoffM>=base&&profiles[0].takeoffM<=ceiling}
   <g class="line-tag takeoff-tag" transform={`translate(${left+8},${Math.max(top+2,y(profiles[0].takeoffM)-28)})`}><rect width="170" height="20" rx="4"/><path d="M7 10h15"/><text x="28" y="14">Takeoff · {heightLabel(profiles[0].takeoffM,heightUnit)} ASL</text></g>
  {/if}
  <text x={left} y="16">{heightUnit} ASL</text><text x={(left+right)/2} y="510" text-anchor="middle">Forecast hour (UTC)</text>
  <rect x="918" y={top} width="12" height={bottom-top} fill="url(#overview-scale)"/>
  {#each [0,.25,.5,.75,1] as f}<text x="934" y={bottom-f*(bottom-top)+4}>{Number((dayLayers[layer].min+(scaleMax-dayLayers[layer].min)*f).toFixed(1))}</text>{/each}
  {#if (timestamp-start)/3600000>=firstHour&&(timestamp-start)/3600000<=lastHour}<line x1={x((timestamp-start)/3600000)} x2={x((timestamp-start)/3600000)} y1={top} y2={bottom} class="current"/>{/if}
  {#if active}
   <line x1={left} x2={right} y1={y(selectedHeight)} y2={y(selectedHeight)} class="cursor"/>
   <line x1={x(selectedHour)} x2={x(selectedHour)} y1={top} y2={bottom} class="cursor"/>
   <circle cx={x(selectedHour)} cy={y(selectedHeight)} r="4" fill="white" stroke="#133449"/>
   <g class="weather-readout inline-readout" text-anchor={readoutSide} transform={`translate(${lclBoxX},${readoutPositions.weather})`}>
    <path class="readout-leader" d={`M${x(selectedHour)-lclBoxX},${y(selectedHeight)-readoutPositions.weather} L0,19`}/>
    <text x="0" y="11" class="readout-context">{selectedTime} UTC · {heightLabel(selectedHeight,heightUnit)} ASL</text>
    <text x="0" y="27" class="weather-value">{dayLayers[layer].label}: {value===undefined?'No data':value.toFixed(1)+' '+unit}</text>
   </g>
   <g class="lcl-tracker" aria-label="Condensation level relative to takeoff">
    {#if lclVisible&&cursorLcl!==undefined}
     <circle class="lcl-halo" cx={x(selectedHour)} cy={y(cursorLcl)} r={snapped?10:8}/>
     <circle class="lcl-dot" cx={x(selectedHour)} cy={y(cursorLcl)} r={snapped?5:4}/>
     <path class="lcl-leader" d={`M${x(selectedHour)},${y(cursorLcl)} L${lclBoxX},${lclBoxY+25}`}/>
    {/if}
    <g transform={`translate(${lclBoxX},${lclBoxY})`} class="lcl-readout inline-readout" text-anchor={readoutSide}>
     <text x="0" y="11" class="lcl-title">Estimated condensation level · LCL{cursorLcl!==undefined&&!lclVisible?' (outside view)':''}</text>
     <text x="0" y="27" class="lcl-height">{cursorLcl===undefined?'No data':heightLabel(cursorLcl,heightUnit)+' ASL'}</text>
     <text x="0" y="43" class:above={lclDelta!==undefined&&lclDelta>0} class:below={lclDelta!==undefined&&lclDelta<0} class="takeoff-clearance">{lclDelta===undefined?'Takeoff clearance unavailable':Math.abs(lclDelta)<.5?'At takeoff height':`${heightLabel(Math.abs(lclDelta),heightUnit)} ${lclDelta>0?'above':'below'} takeoff`}</text>
    </g>
   </g>
  {/if}
 </svg>
</div>
<div class="reading" aria-live="polite">{#if active}<strong>{selectedTime} UTC · {heightLabel(selectedHeight,heightUnit)} ASL · {value===undefined?'No data':(layer==='cloud'?'Cloud cover: ':'')+value.toFixed(1)+' '+unit}</strong><span>{reading.direction===undefined?'Wind direction unavailable':`Wind from ${Math.round(reading.direction)}°`}</span><button type="button" disabled={value===undefined} on:click={()=>onTime((start+selectedHour*3600000-timestamp)/3600000)}>Use {selectedTime} UTC</button>{:else}<span>Select a time and height on the chart.</span>{/if}</div>

{#if layer==='cloud'}<p class="cloud-explanation">Blue: under 25% cloud cover · Grey: 25–100% · Cloud symbols illustrate coverage, not exact cloud shape or type. Boundaries are interpolated.</p>{/if}
<p class="key">{dayLayers[layer].label} ({unit}) · White line: estimated LCL · Dashed line: takeoff{profiles[0]?.takeoffM===undefined?'':' ('+heightLabel(profiles[0].takeoffM,heightUnit)+' ASL)'} · Hatched areas: no data</p>
<details class="chart-info"><summary>Chart details · UTC · Altitudes {heightUnit} ASL</summary><p class="help">Time × altitude · 08:00–21:00 UTC · Tap or hover for values. Double-click a column to select its forecast hour. On mobile, scroll sideways for the whole day.</p>
<p class="coverage">Shared data range starts at {heightLabel(base,heightUnit)} ASL for {dayLayers[layer].label.toLowerCase()}. Surface temperature / dew point: {heightLabel(2,heightUnit)} above model ground; wind: {heightLabel(10,heightUnit)}. Values between those heights and the pressure profile are interpolated. Missing hours or internal gaps remain hatched.</p>
<p class="help">Near-surface wind is at {heightLabel(10,heightUnit)} above model ground, with interpolation to the lowest pressure level. No data is extended below that height. Hourly forecast profiles, interpolated vertically between model levels. Colours are smoothly interpolated between valid hours and heights; missing cells remain blank. Cloud cover is interpolated between native cloud levels; LCL does not guarantee clouds. Humidity is derived from temperature and dew point. Lapse rate is the temperature decrease per km between model levels. Wind arrows show horizontal direction, not rising or sinking air.</p><p class="help">Mouse wheel: change forecast hour. Shift + wheel: change day.</p></details>
<style>

 .cloud-explanation{font:10px/1.5 system-ui;color:#607984;margin:4px 0;}
 .cloud-symbol{fill:#f4f4f3;stroke:#454e54;stroke-width:.8;stroke-linejoin:round;}.cloud-edge{stroke:#283840!important;stroke-width:1.5!important;stroke-opacity:.9!important;}
 .cloud-contours{pointer-events:none;}.cloud-contour{fill:none;stroke:#244b66;stroke-width:.9;stroke-opacity:.65;stroke-linejoin:round;}.cloud-percentage{font-size:10px;font-weight:650;fill:#173a51;paint-order:stroke;stroke:#ffffffed;stroke-width:3.5px;stroke-linejoin:round;}.layers .wind-toggle{margin-left:auto;background:#edf4f7;color:#365f72;border-color:#c3d6df;}
 .chart-info{font:10px/1.5 system-ui;color:#647d87;}.chart-info summary{cursor:pointer;padding:3px 0;}.scroll svg{max-height:calc(100dvh - 205px);}@media(max-width:600px){.layers button{min-height:34px;font-size:10px;padding:4px 6px;}.scroll svg{max-height:none;}}
 .line-tag{pointer-events:none;}.line-tag rect{fill:#fffffff2;stroke:#cad8de;stroke-width:.6;}.line-tag text{font-size:10px;font-weight:550;fill:#34545f;}.takeoff-tag path{stroke:#34545f;stroke-dasharray:3 2;}.lcl-tracker{pointer-events:none;}.lcl-halo{fill:#ffffff38;stroke:#ffffffaa;stroke-width:1;}.lcl-dot{fill:white;stroke:#315f70;stroke-width:2;}.lcl-leader{fill:none;stroke:#fff;stroke-width:1.1;}.lcl-readout rect{fill:white;stroke:#c2d5dd;stroke-width:.8;}.lcl-readout .lcl-title{font-size:9px;fill:#647d88;}.lcl-readout .lcl-height{font-size:12px;font-weight:650;fill:#284958;}.lcl-readout .takeoff-clearance{font-size:10px;font-weight:650;fill:#647d88;}.lcl-readout .above{fill:#15803d;}.lcl-readout .below{fill:#b91c1c;}
 .inline-readout{pointer-events:none;}.inline-readout text{stroke:none;font-weight:600;}.inline-readout .readout-context,.lcl-readout .lcl-title{font-size:10px;fill:#385865;}.inline-readout .weather-value{font-size:12px;font-weight:650;fill:#193f53;}.readout-leader{fill:none;stroke:#e8f4f9;stroke-width:1;}
 .line-caption{font-size:10px;font-weight:650;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round;pointer-events:none;}.lcl{stroke-linejoin:round;stroke-linecap:round;}
 .coverage{font:10px/1.5 system-ui;color:#647d87;margin:6px 0 10px;}
 .tooltip{pointer-events:none;}.tooltip rect{fill:white;fill-opacity:.95;stroke:#90aab6;}.tooltip text{font-weight:600;}
 .layers{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:2px;}button{font:600 11px system-ui;min-height:30px;padding:4px 8px;border:1px solid #cbdadf;border-radius:5px;background:white;color:#46616d;cursor:pointer;}button[aria-pressed="true"]{background:#276e85;color:white;border-color:#276e85;}.help,.key{font:11px/1.5 system-ui;color:#607984;margin:8px 0;}.scroll{overflow-x:auto;overscroll-behavior:contain;}svg{display:block;width:100%;min-width:760px;font:11px system-ui;}svg text{fill:#45616c;}.grid{stroke:#fff;stroke-opacity:.2;}.wind-arrow path{fill:none;stroke:#152e3c;stroke-width:1.2;}.lcl{stroke:white;stroke-width:2.5;}.takeoff{stroke:#262b30;stroke-dasharray:5 4;stroke-width:2;}.current{stroke:#fff;stroke-width:1;stroke-dasharray:2 6;}.cursor{stroke:#fff;stroke-width:1;stroke-dasharray:4 3;}.reading{display:flex;flex-wrap:wrap;gap:8px 20px;align-items:center;min-height:32px;font:11px system-ui;color:#315c6e;margin:4px 0;}button:focus-visible,svg:focus-visible{outline:2px solid #299ad0;outline-offset:2px;}
</style>
