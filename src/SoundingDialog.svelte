<script lang="ts">
 import DayOverview from './DayOverview.svelte';
 import type {SoundingState} from './sounding';
 import type {WindUnit} from './windUnits';
 import {forecastModelLabel} from './forecastModels';
 export let state:SoundingState={open:false,model:'',timestamp:0,status:'loading'};
 export let windUnit:WindUnit='mph';
 export let onClose:()=>void=()=>{};
 export let onRetry:()=>void=()=>{};
 export let onTime:(delta:number)=>void=()=>{};
 let depthM=3000,wheelTotal=0,lastWheel=0;
 $: timeText=new Date(state.timestamp||0).toLocaleString('en-GB',{timeZone:'UTC',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+' UTC';
 function wheel(event:WheelEvent){
  if(event.ctrlKey||Math.abs(event.deltaY)<1||(event.target as HTMLElement).tagName==='INPUT')return;event.preventDefault();
  const now=Date.now();if(now-lastWheel<300)return;
  if(Math.sign(wheelTotal)!==Math.sign(event.deltaY))wheelTotal=0;
  wheelTotal+=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?400:1);
  if(Math.abs(wheelTotal)>=60){onTime((wheelTotal>0?1:-1)*(event.shiftKey?24:1));lastWheel=now;wheelTotal=0;}
 }
  function dialog(node:HTMLElement){
    const previous=document.activeElement as HTMLElement|null;
    document.body.appendChild(node);
    const box=node.querySelector<HTMLElement>('[role="dialog"]')!;
    const controls=()=>[...box.querySelectorAll<HTMLElement>('button,input,a[href],[tabindex="0"]')].filter(el=>!el.hasAttribute('disabled'));
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
    const frame=requestAnimationFrame(()=>controls()[0]?.focus());
    return{destroy(){cancelAnimationFrame(frame);document.removeEventListener('focusin',keepFocus);window.removeEventListener('keydown',key,true);events.forEach(name=>node.removeEventListener(name,stop));node.remove();if(previous?.isConnected)previous.focus({preventScroll:true});}};
  }
</script>
{#if state.open}
<div class="sounding-overlay" use:dialog on:click={event=>{if(event.target===event.currentTarget)onClose();}}>
 <section class="sounding-dialog" role="dialog" aria-modal="true" aria-labelledby="fly-sounding-title" tabindex="-1" aria-busy={state.status==='loading'}>
  <header><div><span class="eyebrow">Day overview</span><h2 id="fly-sounding-title">{state.site?.name??'Atmospheric overview'}</h2><p>{forecastModelLabel(state.model)} · {timeText}</p></div><button class="close" type="button" on:click={onClose} aria-label="Close day overview">×</button></header>

  <div class="content">
   {#if state.status==='loading'}<p class="message" role="status">Loading atmospheric overview…</p>
   {:else if state.status==='error'}<div class="message" role="alert"><p>{state.error??'Could not load the forecast.'}</p><button type="button" on:click={onRetry}>Try again</button></div>
   {:else if state.profile}
    <div class="toolbar">
     <nav aria-label="Forecast time"><button type="button" on:click={()=>onTime(-1)} aria-label="Previous forecast hour" title="Previous hour">← 1h</button><button type="button" on:click={()=>onTime(1)} aria-label="Next forecast hour" title="Next hour">1h →</button></nav>
     <label class="height-range">Height<input aria-label="Height range above model ground" type="range" min="500" max="7000" step="250" bind:value={depthM}/><span>+{Number(depthM).toLocaleString('en-GB')} m above ground</span></label>
    </div>
    <div on:wheel|nonpassive={wheel}><DayOverview profiles={state.day??[]} timestamp={state.timestamp} depthM={Number(depthM)} {windUnit} {onTime}/></div>
   {/if}
   <footer>Atmospheric calculations adapted from <a href="https://github.com/vicb/flyxc" target="_blank" rel="noopener noreferrer">flyXC · Victor Berchet</a> (MIT).</footer>
  </div>
 </section>
</div>
{/if}
<style>
 .sounding-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:10px;background:#102c3d77;font:13px/1.4 system-ui,sans-serif;color:#203b44;}
 .sounding-dialog{width:1240px;max-width:100%;max-height:calc(100dvh - 20px);display:flex;flex-direction:column;border-radius:12px;background:white;box-shadow:0 14px 60px #0004;overflow:hidden;}
 header{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:8px 14px;border-bottom:1px solid #e2e9ea;}
 header>div{display:flex;align-items:baseline;flex-wrap:wrap;gap:3px 14px;}h2{font-size:19px;line-height:1.2;margin:0;}header p{margin:0;color:#60767d;font-size:11px;}.eyebrow{font-size:10px;font-weight:650;color:#48816f;order:3;}
 button{font:600 11px system-ui;min-height:32px;border:1px solid #cbded5;border-radius:6px;background:#f4f9f6;color:#245c47;padding:5px 9px;cursor:pointer;}.close{font-size:23px;line-height:1;width:32px;height:32px;padding:0;flex-shrink:0;}button:focus-visible,a:focus-visible,input:focus-visible{outline:2px solid #319dcc;outline-offset:2px;}
 .content{padding:6px 12px;overflow-y:auto;overscroll-behavior:contain;}.toolbar{display:flex;align-items:center;flex-wrap:wrap;gap:5px 20px;margin-bottom:6px;}nav{display:flex;gap:5px;}.height-range{display:flex;align-items:center;gap:6px;font-size:11px;color:#42616b;}.height-range input{width:155px;min-height:28px;accent-color:#347f69;}.height-range span{font-size:10px;white-space:nowrap;}
 footer{font-size:9px;color:#71858d;border-top:1px solid #e5ecee;padding-top:5px;margin-top:5px;}footer a{color:#347b65;}.message{padding:30px 8px;text-align:center;color:#60767d;}
 @media(max-width:600px){.sounding-overlay{padding:4px;}.sounding-dialog{max-height:calc(100dvh - 8px);border-radius:8px;}header{padding:6px 9px;}header>div{gap:2px 10px;}header h2{font-size:17px;}.eyebrow{display:none;}header p{font-size:10px;}.content{padding:5px 7px;}.toolbar{gap:4px 10px;}.height-range{gap:4px;font-size:10px;}.height-range input{width:90px;}.height-range span{font-size:9px;}button{min-height:36px;}.close{width:36px;height:36px;}}
</style>
