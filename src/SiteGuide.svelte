<script lang="ts">
  import {tick} from 'svelte';
  import {guideAssetUrl} from './siteGuideAssets';
  import {pointCoordinates,pointDirectionsUrl,pointKindLabel} from './siteGuides';
  import type {SiteGuideData,GuidePoint} from './siteGuides';

  export let open = false;
  export let siteName = '';
  export let guide: SiteGuideData | undefined;
  export let loading = false;
  export let error = '';
  export let onClose: () => void = () => {};
  export let onRetry: () => void = () => {};
  export let onShowMap: (point?: GuidePoint) => void = () => {};
  let copyMessage = '';
  let copyGuide = '';
  let photoFailed = false;
  $: if (guide?.key !== copyGuide) {copyGuide=guide?.key??'';copyMessage='';photoFailed=false;}

  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    const stop = (event: Event) => event.stopPropagation();
    const events = ['pointerdown','mousedown','touchstart','touchmove','dblclick','wheel','click','keydown'];
    events.forEach(name=>node.addEventListener(name,stop));
    return {destroy(){events.forEach(name=>node.removeEventListener(name,stop));node.remove();}};
  }
  function dialog(node: HTMLElement) {
    const mounted=portal(node);
    const previous=document.activeElement as HTMLElement | null;
    const box=node.querySelector<HTMLElement>('.guide-dialog')!;
    const controls=()=>[...box.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),[tabindex="0"]')].filter(value=>value.getClientRects().length);
    const focus=()=>{(controls()[0]??box).focus({preventScroll:true});};
    const key=(event: KeyboardEvent)=>{
      if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();onClose();}
      else if(event.key==='Tab'){
        const all=controls(),first=all[0],last=all.at(-1);
        event.stopImmediatePropagation();
        if(!all.length){event.preventDefault();box.focus();}
        else if(event.shiftKey&&(document.activeElement===first||!box.contains(document.activeElement))){event.preventDefault();last!.focus();}
        else if(!event.shiftKey&&(document.activeElement===last||!box.contains(document.activeElement))){event.preventDefault();first.focus();}
      }
    };
    const keepFocus=(event: FocusEvent)=>{if(event.target instanceof Node&&!box.contains(event.target))focus();};
    window.addEventListener('keydown',key,true);
    document.addEventListener('focusin',keepFocus);
    const frame=requestAnimationFrame(focus);
    return {destroy(){
      cancelAnimationFrame(frame);window.removeEventListener('keydown',key,true);document.removeEventListener('focusin',keepFocus);
      mounted.destroy();
      if(previous?.isConnected&&previous.getClientRects().length)previous.focus({preventScroll:true});
    }};
  }
  async function copyPoint(point: GuidePoint) {
    const key=guide?.key;
    try{await navigator.clipboard.writeText(pointCoordinates(point));if(guide?.key===key)copyMessage=`Copied ${pointKindLabel(point.kind).toLowerCase()} ${point.code} coordinates.`;}
    catch{if(guide?.key===key)copyMessage='Copy unavailable. Select and copy the coordinates below.';}
  }
  async function jumpTo(id: string) {
    await tick();document.getElementById(`fly-guide-section-${id}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  }
</script>

{#if open}
<div class="guide-overlay" use:dialog on:click={event=>{if(event.target===event.currentTarget)onClose();}}>
  <section class="guide-dialog" role="dialog" aria-modal="true" aria-labelledby="fly-guide-title" tabindex="-1" aria-busy={loading}>
    <header class="guide-header">
      <div><span class="eyebrow">FLY IRELAND · SITE GUIDE</span><h2 id="fly-guide-title">{siteName || guide?.title || 'Site guide'}</h2>{#if guide&&guide.title!==siteName}<span class="area-name">{guide.title}</span>{/if}</div>
      <button class="close" type="button" aria-label="Close site guide" on:click={onClose}>×</button>
    </header>
    <div class="guide-content">
      {#if loading}<div class="message" role="status">Loading site guide…</div>
      {:else if error}<div class="message error" role="alert"><p>{error}</p><button type="button" on:click={onRetry}>Try again</button></div>
      {:else if guide}
        {#if guide.images.length&&!photoFailed}
          <figure><img src={guideAssetUrl(guide.images[0])} alt={`Flying at ${guide.title}`} loading="lazy" on:error={()=>photoFailed=true}/></figure>
        {/if}
        <nav class="guide-jumps" aria-label="Guide sections">
          {#each guide.sections as section}<button type="button" on:click={()=>jumpTo(section.id)}>{section.title}</button>{/each}
          {#if guide.points.length}<button type="button" on:click={()=>jumpTo('points')}>Map points</button>{/if}
        </nav>
        <div class="guide-sections">
          {#each guide.sections as section}
            <section id={`fly-guide-section-${section.id}`} class:hazards={section.id==='hazards'}>
              <h3>{section.title}</h3><p>{section.text}</p>
            </section>
          {/each}
          {#if guide.points.length}
          <section id="fly-guide-section-points">
            <div class="points-heading"><h3>Site map points</h3><button class="primary" type="button" on:click={()=>onShowMap()}>Show all on map</button></div>
            <p class="source-note">Point locations come from the imported site guide. Reference points have no confirmed take-off or landing role.</p>
            <div class="point-list">
            {#each guide.points as point (point.id)}
              <article class="guide-point" class:unverified={point.needsVerification}>
                <div class="point-title"><span class={`point-code ${point.kind}`}>{point.code}</span><div><span class="point-type">{pointKindLabel(point.kind)}</span><strong>{point.label}</strong></div></div>
                {#if point.needsVerification}<span class="verification">Needs verification</span>{/if}
                <span class="coordinates">{pointCoordinates(point)}</span>
                <div class="point-actions">
                  <button type="button" on:click={()=>onShowMap(point)}>Show on map</button>
                  <a href={pointDirectionsUrl(point)} target="_blank" rel="noopener noreferrer" aria-label={`Navigate to ${point.label}`}>Navigate ↗</a>
                  <button type="button" on:click={()=>copyPoint(point)} aria-label={`Copy coordinates for ${point.label}`}>Copy GPS</button>
                </div>
              </article>
            {/each}
            </div>
            <p class="copy-message" role="status" aria-live="polite">{copyMessage}</p>
          </section>
          {/if}
          <p class="source-note">Imported site guide · Last verified date not provided. Access, permissions and airspace details are source notes, not a live status.</p>
          {#if guide.source?.url}<p class="source-note"><a href={guide.source.url} target="_blank" rel="noopener noreferrer">Club site information ↗</a></p>{/if}
        </div>
      {:else}<p class="message">No site guide is available for this location yet.</p>{/if}
    </div>
    {#if guide&&!loading&&!error}<footer><span>{guide.points.length} map points</span><button class="primary" type="button" on:click={()=>onShowMap()}>Show on map</button></footer>{/if}
  </section>
</div>
{/if}

<style>
  .guide-overlay{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:24px;box-sizing:border-box;background:#102b39a6;backdrop-filter:blur(3px);font:14px/1.6 system-ui,sans-serif;color:#19333b;overscroll-behavior:contain;}
  .guide-dialog{width:min(820px,100%);max-height:calc(100dvh - 48px);display:flex;flex-direction:column;min-height:0;overflow:hidden;border:1px solid #c9dad4;border-radius:18px;background:#fff;box-shadow:0 20px 80px #061e3866;text-align:left;}
  button,a{font:inherit;box-sizing:border-box;text-transform:none;letter-spacing:normal;}
  button{cursor:pointer;}
  button:focus-visible,a:focus-visible{outline:3px solid #2394cf;outline-offset:2px;}
  .guide-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;flex-shrink:0;padding:18px 22px;border-bottom:1px solid #e2ebe7;background:#f5f9f7;}
  .eyebrow{display:block;color:#567771;font-size:10px;font-weight:750;letter-spacing:1.3px;line-height:1.5;}
  h2{margin:3px 0 0;color:#163731;font-size:24px;font-weight:700;line-height:1.25;overflow-wrap:anywhere;}
  .area-name{display:block;color:#627972;font-size:12px;margin-top:3px;}
  .close{display:grid;place-items:center;flex:0 0 44px;width:44px;height:44px;padding:0;border:1px solid #ccdcd5;border-radius:10px;background:#fff;color:#284d44;font:400 30px/1 system-ui;}
  .guide-content{overflow-y:auto;overscroll-behavior:contain;min-height:0;scroll-behavior:smooth;}
  figure{margin:0;background:#edf3f0;}
  figure img{display:block;width:100%;max-height:310px;object-fit:cover;}
  .guide-jumps{display:flex;flex-wrap:wrap;gap:6px;padding:15px 22px;border-bottom:1px solid #e7eeea;}
  .guide-jumps button{padding:6px 11px;min-height:36px;border:1px solid #d6e3dc;border-radius:20px;background:#f7faf8;color:#365e50;font-size:12px;}
  .guide-sections{padding:4px 22px 18px;}
  .guide-sections>section{padding:16px 0;border-bottom:1px solid #e6eeea;scroll-margin-top:10px;}
  h3{margin:0 0 6px;font-size:17px;font-weight:700;color:#214e3d;line-height:1.4;}
  p{margin:0;white-space:pre-line;}
  .hazards{border-left:3px solid #dba342;padding-left:12px!important;}
  .hazards h3{color:#8c5e0c;}
  .source-note{margin:10px 0;color:#6b7974;font-size:11px;line-height:1.6;}
  .points-heading{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:7px;}
  .points-heading h3{margin:0;}
  .point-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;}
  .guide-point{border:1px solid #d8e4de;border-radius:11px;padding:12px;background:#fbfdfb;}
  .guide-point.unverified{border:1px dashed #a886d7;}
  .point-title{display:flex;align-items:flex-start;gap:9px;}
  .point-title strong{display:block;font-size:13px;line-height:1.5;color:#263b35;}
  .point-code{flex:0 0 30px;display:grid;place-items:center;width:30px;height:30px;border:1px solid currentColor;border-radius:8px;background:#fff;font-size:14px;font-weight:700;}
  .launch{color:#15803d;}.landing{color:#1768c5;}.parking{color:#996000;}.access{color:#0f766e;}.reference{color:#596675;}
  .point-type{display:block;font-size:10px;color:#6b7f75;line-height:1.4;}
  .coordinates{display:block;margin:9px 0;font:12px/1.5 ui-monospace,monospace;user-select:text;color:#53685c;}
  .point-actions{display:flex;flex-wrap:wrap;gap:6px;}
  .point-actions button,.point-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:36px;border:1px solid #cddfd3;border-radius:7px;padding:6px 8px;background:#fff;text-decoration:none;color:#1c6343;font-size:11px;}
  .verification{display:block;margin-top:5px;color:#7952a7;font-size:11px;font-weight:600;}
  .copy-message{min-height:18px;margin-top:10px;color:#176842;font-size:12px;}
  footer{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 22px;border-top:1px solid #dde9e1;background:#f6faf7;flex-shrink:0;}
  footer>span{font-size:12px;color:#61796b;}
  .primary{border:1px solid #116947;border-radius:8px;padding:9px 14px;min-height:40px;background:#166b4c;color:white;font-size:12px;font-weight:600;}
  .message{padding:30px 22px;color:#597568;}
  .message.error{color:#9d451d;}.message.error button{margin-top:12px;}
  @media(max-width:600px){
    .guide-overlay{padding:8px;padding-top:max(8px,env(safe-area-inset-top));padding-bottom:max(8px,env(safe-area-inset-bottom));}
    .guide-dialog{width:100%;height:100%;max-height:100%;border-radius:13px;}
    .guide-header{padding:13px 14px;}h2{font-size:21px;}
    .guide-jumps{padding:12px 14px;}.guide-jumps button{min-height:40px;}
    .guide-sections{padding:2px 14px 15px;}.point-list{grid-template-columns:1fr;}
    .point-actions button,.point-actions a{min-height:44px;padding:8px 10px;}
    figure img{max-height:230px;}footer{padding:10px 14px;}
  }
</style>
