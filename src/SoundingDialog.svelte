<script lang="ts">
  import type {SoundingState} from './sounding';
  import type {WindUnit} from './windUnits';
  import {soundingInsights,soundingAtHeight,WIND_CHANGE_THRESHOLD} from './soundingInsights';
  import {buildSoundingChart,placeSoundingLabels} from './soundingChart';
  import {formatWindSpeed} from './windUnits';
  import {forecastModelLabel} from './forecastModels';
  export let state:SoundingState={open:false,model:'',timestamp:0,status:'loading'};
  export let windUnit:WindUnit='mph';
  export let onClose:()=>void=()=>{};
  export let onRetry:()=>void=()=>{};
  export let onTime:(delta:number)=>void=()=>{};
  let width=600,chartHeight=440,zoom=false,cursorHeight:number|undefined,viewSite='';
  let pointerType='mouse',touchStart:{x:number;y:number}|undefined,wheelTotal=0,lastWheel=0;
  let resizeStart:{y:number;height:number}|undefined;
  $: if(state.site?.id!==viewSite){viewSite=state.site?.id??'';cursorHeight=undefined;zoom=false;}
  $: chart=state.profile?buildSoundingChart(state.profile,windUnit,width,{zoom,height:chartHeight}):undefined;
  $: insights=state.profile?soundingInsights(state.profile):undefined;
  $: minCursor=state.profile&&chart?Math.max(chart.minHeight,state.profile.levels[0].heightM):0;
  $: maxCursor=state.profile&&chart?Math.min(chart.maxHeight,state.profile.levels.at(-1)!.heightM):0;
  $: if(cursorHeight!==undefined&&chart)cursorHeight=Math.max(minCursor,Math.min(maxCursor,cursorHeight));
  $: cursor=state.profile&&cursorHeight!==undefined?soundingAtHeight(state.profile,cursorHeight):undefined;
  $: cursorWindChange=insights?.windChanges.find(b=>cursorHeight!==undefined&&cursorHeight>=b.bottomM&&cursorHeight<=b.topM);
  $: markers=insights?[...(insights.lcl?[{kind:'lcl',label:'LCL',heightM:insights.lcl.heightM}]:[]),...(insights.dryTopM===undefined?[]:[{kind:'drytop',label:'Dry top +3°C',heightM:insights.dryTopM}]),...insights.freezingLevels.map(heightM=>({kind:'freezing',label:'0°C',heightM}))]:[];
  $: plotLabels=chart&&insights?placeSoundingLabels([...markers,...insights.inversions.filter(b=>b.bottomM<chart.maxHeight&&b.topM>chart.minHeight).map(b=>({...b,kind:'inversion',label:'Inversion',heightM:(Math.max(b.bottomM,chart.minHeight)+Math.min(b.topM,chart.maxHeight))/2}))],chart):[];
  $: windLabels=chart&&insights?placeSoundingLabels(insights.windChanges.filter(b=>b.bottomM<chart.maxHeight&&b.topM>chart.minHeight).map(b=>({...b,heightM:(Math.max(b.bottomM,chart.minHeight)+Math.min(b.topM,chart.maxHeight))/2})),chart):[];
  $: timeText=new Date(state.timestamp||0).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC';
  const heightText=(value:number)=>Math.round(value).toLocaleString('en-GB')+' m';
  const clearance=(height:number,takeoff:number|undefined)=>{
    if(takeoff===undefined)return 'Takeoff elevation unavailable';
    const delta=Math.round(height-takeoff);return delta===0?'At takeoff':`${heightText(Math.abs(delta))} ${delta<0?'below':'above'} takeoff`;
  };
  const speed=(value:number|undefined,unit:WindUnit)=>value===undefined?'—':formatWindSpeed(value/0.44704,unit);
  function setCursor(height:number){cursorHeight=Math.max(minCursor,Math.min(maxCursor,height));}
  function moveCursor(event:PointerEvent){
    if(!chart)return;pointerType=event.pointerType||'mouse';
    const rect=(event.currentTarget as SVGSVGElement).getBoundingClientRect();
    const x=(event.clientX-rect.left)*chart.width/rect.width,y=(event.clientY-rect.top)*chart.height/rect.height;
    if(x<chart.left||x>chart.windRight||y<chart.top||y>chart.bottom)return;
    setCursor(chart.heightAtY(y));
  }
  function pointerDown(event:PointerEvent){
    if(event.pointerType==='touch'&&!event.isPrimary)return;
    moveCursor(event);touchStart=event.pointerType!=='mouse'?{x:event.clientX,y:event.clientY}:undefined;
  }
  function pointerUp(event:PointerEvent){
    if(!touchStart)return;const dx=event.clientX-touchStart.x,dy=event.clientY-touchStart.y;touchStart=undefined;
    if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy)*1.5)onTime(dx<0?1:-1);
  }
  function cursorKey(event:KeyboardEvent){
    const step=event.shiftKey?500:100,current=cursorHeight??minCursor;
    const next=event.key==='ArrowUp'?current+step:event.key==='ArrowDown'?current-step:event.key==='PageUp'?current+500:event.key==='PageDown'?current-500:event.key==='Home'?minCursor:event.key==='End'?maxCursor:undefined;
    if(next!==undefined){event.preventDefault();event.stopPropagation();setCursor(next);}
  }
  function wheel(event:WheelEvent){
    if(event.ctrlKey||Math.abs(event.deltaY)<1)return;event.preventDefault();
    const now=Date.now();if(now-lastWheel<300)return;
    if(Math.sign(wheelTotal)!==Math.sign(event.deltaY))wheelTotal=0;
    wheelTotal+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?400:1);
    if(Math.abs(wheelTotal)>=60){onTime((wheelTotal>0?1:-1)*(event.shiftKey?24:1));lastWheel=now;wheelTotal=0;}
  }
  function startResize(event:PointerEvent){
    if(event.button!==0)return;event.preventDefault();
    resizeStart={y:event.clientY,height:chartHeight};(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }
  function resize(event:PointerEvent){if(resizeStart)chartHeight=Math.max(320,Math.min(720,resizeStart.height+event.clientY-resizeStart.y));}
  function endResize(){resizeStart=undefined;}
  function dialog(node:HTMLElement){
    const previous=document.activeElement as HTMLElement|null;
    document.body.appendChild(node);
    const box=node.querySelector<HTMLElement>('[role="dialog"]')!;
    const controls=()=>[...box.querySelectorAll<HTMLElement>('button,a[href],[tabindex="0"]')].filter(el=>!el.hasAttribute('disabled'));
    const key=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onClose();}
      else if(event.key==='Tab'){
        event.stopImmediatePropagation();const list=controls(),first=list[0],last=list.at(-1);
        if(!first){event.preventDefault();box.focus();}
        else if(event.shiftKey&&(document.activeElement===first||!box.contains(document.activeElement))){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!box.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    const stop=(event:Event)=>event.stopPropagation();
    const events=['pointerdown','mousedown','touchstart','click','dblclick','wheel'];events.forEach(name=>node.addEventListener(name,stop));
    const keepFocus=(event:FocusEvent)=>{if(event.target instanceof Node&&!box.contains(event.target))controls()[0]?.focus();};
    document.addEventListener('focusin',keepFocus);window.addEventListener('keydown',key,true);
    const size=()=>width=Math.max(340,Math.min(660,box.clientWidth-32));size();
    const observer=new ResizeObserver(size);observer.observe(box);
    const frame=requestAnimationFrame(()=>controls()[0]?.focus());
    return{destroy(){cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('focusin',keepFocus);window.removeEventListener('keydown',key,true);events.forEach(name=>node.removeEventListener(name,stop));node.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}};
  }
</script>

{#if state.open}
<div class="sounding-overlay" use:dialog on:click={event=>{if(event.target===event.currentTarget)onClose();}}>
 <section class="sounding-dialog" role="dialog" aria-modal="true" aria-labelledby="fly-sounding-title" tabindex="-1" aria-busy={state.status==='loading'}>
  <header><div><span class="eyebrow">FLY IRELAND · SOUNDING</span><h2 id="fly-sounding-title">{state.site?.name??'Atmospheric profile'}</h2><p>{forecastModelLabel(state.model)} · {timeText}</p></div><button class="close" type="button" on:click={onClose} aria-label="Close sounding">×</button></header>
  <nav aria-label="Sounding forecast time"><button type="button" on:click={()=>onTime(-1)} aria-label="Previous forecast hour">← 1h</button><span>Wheel / swipe to change time</span><button type="button" on:click={()=>onTime(1)} aria-label="Next forecast hour">1h →</button></nav>
  <div class="content">
   {#if state.status==='loading'}<p class="message" role="status">Loading atmospheric profile…</p>
   {:else if state.status==='error'}<div class="message" role="alert"><p>{state.error??'Could not load the sounding.'}</p><button type="button" on:click={onRetry}>Try again</button></div>
   {:else if chart&&state.profile}
    <div class="chart-tools"><button type="button" class="zoom-button" aria-pressed={zoom} on:click={()=>zoom=!zoom}>{zoom?'Show full profile':'Zoom: lower 3 km'}</button><span>Tap or hover for readings</span></div>
    <div class="cursor-readout" aria-live="off">
      {#if cursorHeight!==undefined}
       <span>Height<strong>{heightText(cursorHeight)} ASL</strong><small class:below={cursor?.aboveTakeoffM!==undefined&&cursor.aboveTakeoffM<0} class:above={cursor?.aboveTakeoffM!==undefined&&cursor.aboveTakeoffM>0}>{clearance(cursorHeight,state.profile?.takeoffM)}</small></span>
       <span>Temperature<strong class="temperature">{cursor?cursor.temperatureC.toFixed(1)+'°C':'—'}</strong><small class="dewpoint">Dew point: {cursor?.dewPointC===undefined?'—':cursor.dewPointC.toFixed(1)+'°C'}</small></span>
       <span>Wind<strong>{speed(cursor?.windMps,windUnit)}</strong><small>{cursor?.windDirection===undefined?'Direction: —':'From '+Math.round(cursor.windDirection)+'°'}</small></span>
       <span class="wind-change">Vector wind change<strong>{cursorWindChange?speed(cursorWindChange.vectorMpsPer100m,windUnit)+' / 100 m':'—'}</strong><small>Between model levels</small></span>
      {:else}<span class="cursor-hint">Move the pointer or tap the chart to read a height. Arrow keys also move the cursor.</span>{/if}
    </div>
    <div class="legend"><span class="temperature">● Temperature</span><span class="dewpoint">● Dew point</span><span class="parcel">● Parcel (+3°C)</span><span class="wind">● Wind</span></div>
    <svg class="sounding-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="slider" tabindex="0" aria-label="Sounding height cursor" aria-orientation="vertical" aria-valuemin={Math.round(minCursor)} aria-valuemax={Math.round(maxCursor)} aria-valuenow={Math.round(cursorHeight??minCursor)} aria-valuetext={cursorHeight===undefined?'Select a height':`${heightText(cursorHeight)} ASL. ${clearance(cursorHeight,state.profile?.takeoffM)}. Temperature ${cursor?.temperatureC.toFixed(1)??'unavailable'} degrees Celsius. Wind ${speed(cursor?.windMps,windUnit)}.`}
      on:pointermove={moveCursor} on:pointerdown={pointerDown} on:pointerup={pointerUp} on:pointercancel={()=>touchStart=undefined}
      on:pointerleave={()=>{if(pointerType==='mouse'&&document.activeElement?.classList?.contains('sounding-chart')!==true)cursorHeight=undefined;}}
      on:keydown={cursorKey} on:focus={()=>{if(cursorHeight===undefined)setCursor(minCursor);}} on:wheel|nonpassive={wheel}>
     <title id="fly-sounding-desc">Temperature, dew point, wind and estimated parcel trajectory by height above sea level at {state.site?.name}. Wind in {windUnit}.</title>
     <defs><clipPath id="fly-sounding-wind-clip"><rect x={chart.windLeft} y={chart.top} width={chart.windRight-chart.windLeft} height={chart.bottom-chart.top}/></clipPath><clipPath id="fly-sounding-temperature-clip"><rect x={chart.left} y={chart.top} width={chart.tempRight-chart.left} height={chart.bottom-chart.top}/></clipPath></defs>
     <rect x={chart.left} y={chart.top} width={chart.tempRight-chart.left} height={chart.bottom-chart.top} fill="#f8fafb"/>
     <rect x={chart.windLeft} y={chart.top} width={chart.windRight-chart.windLeft} height={chart.bottom-chart.top} fill="#eef6f1"/>
     {#each insights?.inversions??[] as band}
      {#if band.topM>chart.minHeight&&band.bottomM<chart.maxHeight}<rect class="inversion-band" x={chart.left} y={chart.y(Math.min(band.topM,chart.maxHeight))} width={chart.tempRight-chart.left} height={chart.y(Math.max(band.bottomM,chart.minHeight))-chart.y(Math.min(band.topM,chart.maxHeight))}><title>Inversion: {heightText(band.bottomM)}–{heightText(band.topM)} ASL; temperature rises {band.temperatureRiseC.toFixed(1)}°C</title></rect>{/if}
     {/each}
     {#each insights?.windChanges??[] as band}
      {#if band.topM>chart.minHeight&&band.bottomM<chart.maxHeight}<rect class="shear-band" x={chart.windLeft} y={chart.y(Math.min(band.topM,chart.maxHeight))} width={chart.windRight-chart.windLeft} height={chart.y(Math.max(band.bottomM,chart.minHeight))-chart.y(Math.min(band.topM,chart.maxHeight))}><title>Vector wind change: {speed(band.vectorMpsPer100m,windUnit)} per 100 m, between model levels</title></rect>{/if}
     {/each}
     {#each chart.ticks as height}
      <line x1={chart.left} x2={chart.windRight} y1={chart.y(height)} y2={chart.y(height)} class="grid"/>
      <text x={chart.left-7} y={chart.y(height)+4} text-anchor="end">{height.toLocaleString('en-GB')}</text>
     {/each}
     {#each chart.tempTicks as temp}
      <line x1={chart.xTemp(temp)} x2={chart.xTemp(temp)} y1={chart.top} y2={chart.bottom} class="grid"/>
      <text x={chart.xTemp(temp)} y={chart.bottom+19} text-anchor="middle">{Math.round(temp)}</text>
     {/each}
     <text x={chart.left} y="16">m ASL</text><text x={(chart.left+chart.tempRight)/2} y={chart.height-6} text-anchor="middle">Temperature (°C)</text>
     <text x={(chart.windLeft+chart.windRight)/2} y="16" text-anchor="middle">Wind ({windUnit})</text>
     <text x={chart.windLeft} y={chart.bottom+19} text-anchor="middle">0</text><text x={chart.windRight} y={chart.bottom+19} text-anchor="middle">{chart.windMax}</text>
     <g clip-path="url(#fly-sounding-temperature-clip)"><path d={chart.temperature} class="profile temperature"/><path d={chart.dewPoint} class="profile dewpoint"/><path d={chart.parcel} class="profile parcel"/></g>
     <path d={chart.wind} class="profile wind" clip-path="url(#fly-sounding-wind-clip)"/>
     {#each markers as marker}
      {#if marker.heightM>=chart.minHeight&&marker.heightM<=chart.maxHeight}<line class={`height-marker ${marker.kind}`} x1={chart.left} x2={chart.windRight} y1={chart.y(marker.heightM)} y2={chart.y(marker.heightM)}><title>{marker.label}: ~{heightText(marker.heightM)} ASL · {clearance(marker.heightM,state.profile?.takeoffM)}</title></line>{/if}
     {/each}
     {#each chart.arrows as level}
      <g transform={`translate(${chart.width-14},${chart.y(level.heightM)}) rotate(${level.windDirection})`}><title>Wind from {Math.round(level.windDirection??0)}° · {formatWindSpeed((level.windMps??0)*2.2369362921,windUnit)}</title><path d="M0 -8V8M-3 3 0 8 3 3" fill="none" stroke="#4c6573" stroke-width="1.5"/></g>
     {/each}
     {#if chart.ground>=chart.minHeight&&chart.ground<=chart.maxHeight}<line x1={chart.left} x2={chart.windRight} y1={chart.y(chart.ground)} y2={chart.y(chart.ground)} stroke="#8b765b" stroke-dasharray="4 3"/>{/if}
     {#each plotLabels as annotation}
      {#if Math.abs(annotation.labelY-annotation.sourceY)>10}<line class="label-leader" x1={chart.left+3} x2={chart.left+3} y1={annotation.sourceY} y2={annotation.labelY-3}/>{/if}
      <text class={`plot-label ${annotation.kind}`} x={chart.left+7} y={annotation.labelY}>
       {#if annotation.kind==='inversion'}<tspan>Inversion · +{annotation.temperatureRiseC?.toFixed(1)}°C</tspan><tspan class="secondary" x={chart.left+7} dy="12">{heightText(annotation.bottomM??0)}–{heightText(annotation.topM??0)} ASL</tspan>
       {:else}<tspan>{annotation.label} · </tspan><tspan class="asl-value">~{heightText(annotation.heightM)} ASL</tspan><tspan class="secondary" class:below={state.profile.takeoffM!==undefined&&annotation.heightM<state.profile.takeoffM} class:above={state.profile.takeoffM!==undefined&&annotation.heightM>state.profile.takeoffM} x={chart.left+7} dy="12">{clearance(annotation.heightM,state.profile?.takeoffM)}</tspan>{/if}
      </text>
     {/each}
     {#each windLabels as annotation}
      <text class="plot-label wind-change" x={chart.windLeft+4} y={annotation.labelY}><title>Wind change between {heightText(annotation.bottomM)} and {heightText(annotation.topM)} ASL</title><tspan>Wind change</tspan><tspan x={chart.windLeft+4} dy="12">{speed(annotation.vectorMpsPer100m,windUnit).replace(' ','')}/100m</tspan></text>
     {/each}
     {#if cursorHeight!==undefined}
      <line class="cursor-line" x1={chart.left} x2={chart.windRight} y1={chart.y(cursorHeight)} y2={chart.y(cursorHeight)}/>
      {#if cursor}<circle class="cursor-dot temperature" cx={chart.xTemp(cursor.temperatureC)} cy={chart.y(cursorHeight)} r="4"/>{#if cursor.dewPointC!==undefined}<circle class="cursor-dot dewpoint" cx={chart.xTemp(cursor.dewPointC)} cy={chart.y(cursorHeight)} r="4"/>{/if}{#if cursor.windMps!==undefined}<circle class="cursor-dot wind" cx={chart.xWind(cursor.windMps)} cy={chart.y(cursorHeight)} r="4"/>{/if}{/if}
     {/if}
    </svg>
    <div class="resize-handle" role="slider" tabindex="0" aria-label="Chart height" aria-valuemin="320" aria-valuemax="720" aria-valuenow={Math.round(chartHeight)} aria-valuetext={`${Math.round(chartHeight)} pixels`} on:pointerdown={startResize} on:pointermove={resize} on:pointerup={endResize} on:pointercancel={endResize} on:lostpointercapture={endResize} on:keydown={event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();chartHeight=Math.max(320,Math.min(720,chartHeight+(event.key==='ArrowUp'?-20:20)));}}}><span></span>Drag to resize chart</div>
    <div class="summary"><span class="inversion-key">Amber: inversion</span><span class="shear-key">Orange: wind change ≥{speed(WIND_CHANGE_THRESHOLD,windUnit)}/100 m</span><span>Model ground: {state.profile.terrainM===undefined?'No data':`${Math.round(state.profile.terrainM)} m ASL`}</span>{#if insights?.lcl}<span>LCL source: {insights.lcl.source}</span>{/if}</div>
    <p class="note">Green curve and dry top assume +3°C. LCL uses unheated surface or lowest-level air. Dry top assumes no condensation; clouds may form earlier at LCL. LCL is estimated condensation, not a guarantee of clouds. Wind-change bands show model-level gradients, not confirmed turbulence. Takeoff clearance uses Windy’s site elevation, not a surveyed launch. Missing values stay blank.</p>
   {/if}
   <footer>Atmospheric calculations adapted from <a href="https://github.com/vicb/flyxc" target="_blank" rel="noopener noreferrer">flyXC · Victor Berchet</a> (MIT).</footer>
  </div>
 </section>
</div>
{/if}
<style>
 .sounding-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:16px;background:#102c3d77;font:13px/1.45 system-ui,sans-serif;color:#203b44;}
 .sounding-dialog{width:700px;max-width:100%;max-height:calc(100dvh - 32px);display:flex;flex-direction:column;border-radius:16px;background:white;box-shadow:0 14px 60px #0004;overflow:hidden;}
 header{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;padding:16px 18px 12px;border-bottom:1px solid #e2e9ea;}h2{font-size:21px;line-height:1.25;margin:4px 0;}header p{margin:3px 0;color:#60767d;font-size:12px;}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.5px;color:#48816f;}
 button{font:600 12px system-ui;text-transform:none;letter-spacing:normal;min-height:40px;border:1px solid #cbded5;border-radius:8px;background:#f4f9f6;color:#245c47;padding:8px 12px;cursor:pointer;}.close{font-size:25px;line-height:1;width:40px;height:40px;padding:0;flex-shrink:0;}button:focus-visible,a:focus-visible{outline:3px solid #319dcc;outline-offset:2px;}
 nav{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 16px;background:#f6f9f9;}nav span{font-size:11px;color:#60767d;}.content{padding:12px 16px;overflow-y:auto;overscroll-behavior:contain;}.legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:11px;font-weight:650;margin-bottom:6px;}.temperature{color:#d5533e;stroke:#d5533e;}.dewpoint{color:#2885ba;stroke:#2885ba;}.parcel{color:#27925b;stroke:#27925b;}.wind{color:#7656a8;stroke:#7656a8;}.sounding-chart{display:block;width:100%;height:auto;overflow:visible;}.sounding-chart text{font:11px system-ui;fill:#526b74;}.grid{stroke:#dce5e8;stroke-width:1;}.profile{fill:none;stroke-width:2.2;stroke-linejoin:round;stroke-linecap:round;}.profile.parcel{stroke-dasharray:5 3;}.summary{display:flex;flex-wrap:wrap;gap:4px 18px;font-size:11px;color:#3d6860;}.note{font-size:11px;line-height:1.55;color:#677d84;margin:9px 0;}footer{font-size:10px;color:#71858d;border-top:1px solid #e5ecee;padding-top:9px;}footer a{color:#347b65;}.message{padding:35px 8px;text-align:center;color:#60767d;}
 @media(max-width:600px){.sounding-overlay{padding:8px;}.sounding-dialog{max-height:calc(100dvh - 16px);border-radius:12px;}header{padding:12px;}header h2{font-size:18px;}.content{padding:10px 12px;}nav{padding:6px 12px;}nav span{font-size:10px;}button{min-height:44px;}.legend{gap:5px 10px;font-size:10px;}}
 .chart-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px;}.chart-tools span{font-size:10px;color:#667d83;}.zoom-button{min-height:34px;font-size:11px;}.zoom-button[aria-pressed="true"]{background:#dceee5;border-color:#4b9976;}.cursor-readout{height:76px;min-height:76px;box-sizing:border-box;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));align-items:center;gap:6px 14px;border:0;border-bottom:1px solid #dce6e9;background:transparent;border-radius:0;padding:8px 0;margin-bottom:10px;font-size:10px;color:#687f87;}.cursor-readout>span{display:flex;flex-direction:column;gap:2px;}.cursor-readout strong{font-size:12px;color:#2b4b54;}.cursor-readout small{font-size:10px;}.cursor-readout .cursor-hint{max-width:360px;grid-column:1/-1;}.above{color:#15803d!important;}.below{color:#b91c1c!important;}.sounding-chart{touch-action:pan-y;cursor:crosshair;}.sounding-chart:focus-visible,.resize-handle:focus-visible{outline:2px solid #319dcc;outline-offset:2px;}.inversion-band{fill:#e4bb4c;opacity:.20;}.shear-band{fill:#dc8137;opacity:.25;}.height-marker{stroke-width:1.3;stroke-dasharray:5 4;pointer-events:stroke;}.height-marker.lcl{stroke:#437bd6;}.height-marker.drytop{stroke:#32955e;}.height-marker.freezing{stroke:#42a5ba;stroke-dasharray:2 4;}.cursor-line{stroke:#476c7a;stroke-width:1;stroke-dasharray:3 3;pointer-events:none;}.cursor-dot{fill:white;stroke-width:2;pointer-events:none;}.resize-handle{display:none;}
 @media(max-width:600px){.cursor-readout{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;height:128px;min-height:128px;}.cursor-readout strong{font-size:11px;}.chart-tools span{max-width:100px;text-align:right;}.resize-handle{display:flex;align-items:center;justify-content:center;gap:6px;font-size:10px;color:#6d858a;min-height:32px;cursor:ns-resize;touch-action:none;background:#f6f9f9;border-radius:6px;margin-top:4px;}.resize-handle span{width:32px;height:4px;border-radius:4px;background:#aabfc4;}}

 .sounding-chart .plot-label{font:600 10px/1.2 system-ui;paint-order:stroke;stroke:#fffffff2;stroke-width:3.5px;stroke-linejoin:round;pointer-events:none;}.sounding-chart .plot-label .secondary{font-size:9px;font-weight:500;fill:#536e76;}.sounding-chart .plot-label.lcl{fill:#376fbe;}.sounding-chart .plot-label.drytop{fill:#267d4a;}.sounding-chart .plot-label.freezing{fill:#247e91;}.sounding-chart .plot-label.inversion{fill:#876220;}.sounding-chart .plot-label.wind-change{font-size:9px;fill:#95581f;}.sounding-chart .plot-label .asl-value,.sounding-chart .plot-label .above{fill:#15803d;}.sounding-chart .plot-label .below{fill:#b91c1c;}.label-leader{stroke:#849aa1;stroke-width:1;opacity:.7;pointer-events:none;}.inversion-key{color:#8c6a22;}.shear-key{color:#a3622a;}
 @media(max-width:600px){.sounding-chart .plot-label{font-size:9px;}.sounding-chart .plot-label .secondary{font-size:8.5px;}.sounding-chart .plot-label.wind-change{font-size:8px;}}
</style>
