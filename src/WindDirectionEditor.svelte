<script lang="ts">
 import {onDestroy,tick} from 'svelte';
 import {parseDirectionRanges,createDirectionReviewFile} from './windDirectionReview';
 import type {DirectionEntry} from './windDirectionReview';
 export let map:any;
 export let site:{id:string;name:string;lat:number;lon:number}|undefined;
 export let entry:DirectionEntry|undefined;
 export let report:()=>unknown;
 export let onImport:(text:string)=>void;
 export let onDraft:(text:string)=>void;
 export let onConfirm:()=>void;
 export let onClose:()=>void;
 export let onNext:()=>void;
 export let storageError='';
 let node:HTMLElement,input:HTMLInputElement;
 let busy=false,status='',error='',fileName='';
 let left=12,top=90,alive=true;
 const session=createDirectionReviewFile({getReport:()=>report(),onImport:text=>onImport(text)});
 const filename='fly-ireland-poland-wind-review.json';
 $: text=entry?.draft??'';
 $: validation=validate(text);
 function validate(value:string){try{parseDirectionRanges(value);return '';}catch(e){return e.message;}}
 function position(){
  if(!site||!node)return;
  const viewport=window.visualViewport;
  const width=viewport?.width??window.innerWidth,height=viewport?.height??window.innerHeight;
  const rect=map.getContainer?.()?.getBoundingClientRect?.()??{left:0,top:0};
  const point=map.latLngToContainerPoint?.([site.lat,site.lon])??{x:width/2,y:height/2};
  if(width<=600){
   node.style.maxHeight=`${Math.max(150,Math.min(height*.46,height-(rect.top+point.y+137)-12))}px`;
  }else node.style.maxHeight=`${Math.max(150,height-24)}px`;
  const bounds=node.getBoundingClientRect(),w=bounds.width,h=bounds.height;
  let x=rect.left+point.x+150;
  if(x+w>width-12)x=rect.left+point.x-150-w;
  left=Math.max(12,Math.min(width-w-12,x));
  top=Math.max(12,Math.min(height-h-12,rect.top+point.y-h/2));
  if(width<=600){left=12;top=Math.max(12,height-h-12);}
 }
 function mount(element:HTMLElement){
  node=element;document.body.appendChild(node);
  const stop=(event:Event)=>event.stopPropagation();
  const events=['pointerdown','mousedown','touchstart','click','dblclick','wheel','keydown'];events.forEach(name=>node.addEventListener(name,stop));
  map.on('move',position);map.on('zoom',position);map.on('resize',position);window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
  const observer=new ResizeObserver(position);observer.observe(node);position();
  return {destroy(){events.forEach(name=>node.removeEventListener(name,stop));map.off('move',position);map.off('zoom',position);map.off('resize',position);window.removeEventListener('resize',position);window.visualViewport?.removeEventListener('resize',position);observer.disconnect();node.remove();}};
 }
 let previousId='';
 $: if(site?.id!==previousId){previousId=site?.id??'';error='';status='';if(site)void tick().then(()=>{position();input?.focus({preventScroll:true});});}
 async function chooseFile(){
  if(busy)return;error='';busy=true;
  try{
   const picker=(window as any).showSaveFilePicker;
   if(!picker)throw Error('Direct file saving is unavailable here. Use Download JSON after each confirmation, and Load JSON to resume.');
   const handle=await picker.call(window,{suggestedName:filename,types:[{description:'Fly Ireland wind review',accept:{'application/json':['.json']}}]});
   await session.connect(handle);if(alive){fileName=session.name;status=`Saved to ${fileName}`;}
  }catch(e){if(alive&&e.name!=='AbortError')error=`File not saved: ${e.message}`;}
  finally{if(alive)busy=false;}
 }
 async function confirm(){
  if(busy||validation)return;error='';busy=true;
  try{
   onConfirm();
   if(session.name){await session.save();if(alive)status=`Saved to ${session.name}`;}
   else status='Range confirmed. Choose a file or Download JSON to save on disk.';
  }catch(e){if(alive)error=`File not saved. Keep this window open and retry or Download JSON. ${e.message}`;}
  finally{if(alive)busy=false;}
 }
 function download(){
  const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status='JSON download requested. Check your downloads.';
 }
 async function load(event:Event){
  const control=event.currentTarget as HTMLInputElement,file=control.files?.[0];if(!file)return;
  busy=true;error='';try{if(file.size>2_000_000)throw Error('Review file is too large.');onImport(await file.text());if(session.name)await session.save();status='Review file loaded. Existing progress retained.';}catch(e){error=e.message;}finally{busy=false;control.value='';}
 }
 function edit(value:string){onDraft(value);status='Preview updated. Confirm to add this range to the file.';error='';}
 onDestroy(()=>{alive=false;});
</script>

{#if site}
<section class="wind-direction-editor" use:mount style={`left:${left}px;top:${top}px`} aria-label={`Wind direction review for ${site.name}`}>
 <header><div><span class="eyebrow">WIND DIRECTION REVIEW</span><h3>{site.name}</h3></div><button class="close" type="button" aria-label="Close wind direction editor" on:click={onClose}>×</button></header>
 <p class="coordinates">{site.lat.toFixed(6)}, {site.lon.toFixed(6)}</p>
 <label for="wind-review-ranges">Allowed wind from (degrees)</label>
 <input id="wind-review-ranges" bind:this={input} value={text} maxlength="200" placeholder="80-130 / 280-360" aria-invalid={!!text&&!!validation} aria-describedby="wind-review-hint" on:input={event=>edit(event.currentTarget.value)} on:keydown={event=>{if(event.key==='Enter')void confirm();if(event.key==='Escape')onClose();}} />
 <p id="wind-review-hint">North: 0° · East: 90° · South: 180° · West: 270°. Use / for separate ranges; 285-15 crosses north.</p>
 <p class="preview-note">Live preview on the large rose. Forecast matching stays unchanged until catalogue import.</p>
 {#if text&&validation}<p class="error" role="alert">{validation}</p>{/if}
 {#if entry?.confirmedAt}<p class="confirmed">✓ Confirmed: {entry.windRanges.map(r=>`${r.start}°–${r.end}°`).join(' / ')}</p>{/if}
 <div class="primary-actions"><button type="button" class="confirm" disabled={busy||!!validation} on:click={confirm}>{busy?'Saving…':'Confirm & save'}</button><button type="button" disabled={busy} on:click={onNext}>Next site →</button></div>
 <div class="file-section"><button type="button" disabled={busy} on:click={chooseFile}>{fileName?'Reconnect / change file':'Choose review file'}</button><span>{fileName||'Choose the same JSON after reloading to reconnect disk saves.'}</span></div>
 <div class="backup-actions"><button type="button" disabled={busy} on:click={download}>Download JSON</button><label class="load">Load JSON<input type="file" accept=".json,application/json" disabled={busy} on:change={load}/></label></div>
 {#if status}<p class="save-status" role="status">{status}</p>{/if}
 {#if error||storageError}<p class="error" role="alert">{error||storageError}</p>{/if}
</section>
{/if}

<style>
 .wind-direction-editor{position:fixed;z-index:1300;width:290px;max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);box-sizing:border-box;overflow:auto;padding:14px;border:2px solid #a78bfa;border-radius:14px;background:#fffffff8;box-shadow:0 5px 24px #172b3d33;color:#203b42;font:12px/1.4 system-ui,sans-serif;}
 header{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;}h3{font-size:15px;line-height:1.3;margin:4px 0;}.eyebrow{font-size:9px;font-weight:600;letter-spacing:1px;color:#6d28d9;}.close{font-size:22px;min-width:32px;min-height:32px;line-height:1;}
 p{margin:7px 0;font-size:11px;}.coordinates{color:#61777d;margin:2px 0 12px;}label{display:block;font-weight:600;}input:not([type=file]){box-sizing:border-box;width:100%;min-height:42px;margin-top:5px;padding:9px;border:1px solid #a4bfbc;border-radius:8px;font:15px system-ui;color:#203b42;background:white;}input:focus-visible{outline:2px solid #8b5cf6;outline-offset:2px;}
 #wind-review-hint{color:#526e74;}.preview-note{color:#6d28d9;background:#f5f3ff;border-radius:7px;padding:7px;}.confirmed{color:#166c48;}.error{color:#a23520;}.save-status{color:#315f55;overflow-wrap:anywhere;}
 button,.load{box-sizing:border-box;cursor:pointer;border:1px solid #c6d5d2;border-radius:7px;background:#fff;color:#245347;padding:8px 9px;font:600 11px/1.3 system-ui;min-height:36px;text-transform:none;letter-spacing:normal;}button:disabled{opacity:.55;cursor:default;}button:focus-visible,.load:focus-within{outline:2px solid #8b5cf6;outline-offset:2px;}
 .primary-actions{display:flex;gap:7px;margin:12px 0;}.primary-actions .confirm{background:#6d28d9;border-color:#6d28d9;color:white;flex:1;}.file-section{border-top:1px solid #dce5e2;padding-top:10px;}.file-section button{width:100%;}.file-section span{display:block;color:#61777d;font-size:10px;overflow-wrap:anywhere;margin-top:5px;}.backup-actions{display:flex;gap:7px;margin-top:8px;}.load{display:inline-flex;align-items:center;justify-content:center;position:relative;overflow:hidden;}.load input{position:absolute;inset:0;opacity:0;width:100%;cursor:pointer;}
 @media(max-width:600px){.wind-direction-editor{width:calc(100vw - 24px);}}
</style>
