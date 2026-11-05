<script lang="ts">
  import type {SoundingState} from './sounding';
  import type {WindUnit} from './windUnits';
  import {buildSoundingChart} from './soundingChart';
  import {formatWindSpeed} from './windUnits';
  import {forecastModelLabel} from './forecastModels';
  export let state:SoundingState={open:false,model:'',timestamp:0,status:'loading'};
  export let windUnit:WindUnit='mph';
  export let onClose:()=>void=()=>{};
  export let onRetry:()=>void=()=>{};
  export let onTime:(delta:number)=>void=()=>{};
  let width=600;
  $: chart=state.profile?buildSoundingChart(state.profile,windUnit,width):undefined;
  $: timeText=new Date(state.timestamp||0).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC';
  function dialog(node:HTMLElement){
    const previous=document.activeElement as HTMLElement|null;
    document.body.appendChild(node);
    const box=node.querySelector<HTMLElement>('[role="dialog"]')!;
    const controls=()=>[...box.querySelectorAll<HTMLElement>('button,a[href]')].filter(el=>!el.hasAttribute('disabled'));
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
  <nav aria-label="Sounding forecast time"><button type="button" on:click={()=>onTime(-1)} aria-label="Previous forecast hour">← 1h</button><span>Synced with Windy timeline</span><button type="button" on:click={()=>onTime(1)} aria-label="Next forecast hour">1h →</button></nav>
  <div class="content">
   {#if state.status==='loading'}<p class="message" role="status">Loading atmospheric profile…</p>
   {:else if state.status==='error'}<div class="message" role="alert"><p>{state.error??'Could not load the sounding.'}</p><button type="button" on:click={onRetry}>Try again</button></div>
   {:else if chart&&state.profile}
    <div class="legend"><span class="temperature">● Temperature</span><span class="dewpoint">● Dew point</span><span class="parcel">● Parcel (+3°C)</span><span class="wind">● Wind</span></div>
    <svg class="sounding-chart" viewBox={`0 0 ${chart.width} ${chart.height}`} role="img" aria-labelledby="fly-sounding-desc">
     <title id="fly-sounding-desc">Temperature, dew point, wind and estimated parcel trajectory by height above sea level at {state.site?.name}. Wind in {windUnit}.</title>
     <defs><clipPath id="fly-sounding-temperature-clip"><rect x={chart.left} y={chart.top} width={chart.tempRight-chart.left} height={chart.bottom-chart.top}/></clipPath></defs>
     <rect x={chart.left} y={chart.top} width={chart.tempRight-chart.left} height={chart.bottom-chart.top} fill="#f8fafb"/>
     <rect x={chart.windLeft} y={chart.top} width={chart.windRight-chart.windLeft} height={chart.bottom-chart.top} fill="#eef6f1"/>
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
     <path d={chart.wind} class="profile wind"/>
     {#each chart.arrows as level}
      <g transform={`translate(${chart.width-14},${chart.y(level.heightM)}) rotate(${level.windDirection})`}><title>Wind from {Math.round(level.windDirection??0)}° · {formatWindSpeed((level.windMps??0)*2.2369362921,windUnit)}</title><path d="M0 -8V8M-3 3 0 8 3 3" fill="none" stroke="#4c6573" stroke-width="1.5"/></g>
     {/each}
     {#if chart.ground>=chart.minHeight&&chart.ground<=chart.maxHeight}<line x1={chart.left} x2={chart.windRight} y1={chart.y(chart.ground)} y2={chart.y(chart.ground)} stroke="#8b765b" stroke-dasharray="4 3"/>{/if}
    </svg>
    <div class="summary"><span>Model ground: {state.profile.terrainM===undefined?'No data':`${Math.round(state.profile.terrainM)} m ASL`}</span>{#if state.profile.parcel}<span>Parcel dry top / condensation level: ~{Math.round(state.profile.parcel.thermalTopElev).toLocaleString('en-GB')} m ASL</span>{/if}</div>
    <p class="note">The green curve assumes air starts 3°C warmer than the model at the lowest available level. This is an estimate, not a measured thermal or climb rate. Missing profile values are left blank.</p>
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
</style>
