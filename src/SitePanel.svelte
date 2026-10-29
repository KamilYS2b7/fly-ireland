<script lang="ts">
  import {tick,onDestroy} from 'svelte';
  import type { buildSitePanel, NamedSpot } from './sitePanel';
  import SiteRose from './SiteRose.svelte';
  import PanelSelect from './PanelSelect.svelte';
  import { watchPanelLayout } from './panelLayout';
  import {revealPanelCard} from './panelScroll';
  import SiteFilterControls from './SiteFilterControls.svelte';
  import {defaultSiteFilters,sitesForView} from './siteFilters';
  import type {SiteFilters} from './siteFilters';
  import {REGIONS} from './siteCatalog';
  import {RAIN_DROPS_SVG} from './rainForecast';
  import {GUST_WARNING_SVG} from './gustWarning';
  import {weatherIconUrl} from './weatherForecast';
  import {WIND_UNITS} from './windUnits';
  import type {WindUnit} from './windUnits';
  import type {ForecastModelOption} from './forecastModels';
  import type {SiteReviewDecision} from './siteReview';
  import type {VideoDecision} from './siteVideos';
  import {canonicalYouTubeUrl,videoPlaybackUrl} from './siteVideos';
  import {guideKeyForSite} from './siteGuides';
  export let snapshot: ReturnType<typeof buildSitePanel>;
  export let onSelect: (spot: NamedSpot) => void;
  export let directionReviewRemaining=0;
  export let directionReviewTotal=0;
  export let onDirectionEdit:(spot:NamedSpot)=>void=()=>{};
  export let onGuide: (spot: NamedSpot) => void = () => {};
  export let onHover: (id: string) => void = () => {};
  let hoveredId = '';
  export let selectedId = '';
  export let weatherIconsDir = '';
  export let modelOptions: ForecastModelOption[] = [];
  export let onModelChange: (model: string) => void = () => {};
  export let modelSyncNote = '';
  export let windUnit: WindUnit = 'mph';
  export let onWindUnitChange: (unit: WindUnit) => void = () => {};
  let siteList: HTMLElement;
  let stopReveal: (() => void) | undefined;
  let revealRequest = 0;
  onDestroy(() => { revealRequest++; stopReveal?.(); });
  let collapsed = false;
  export function collapsePanel() {collapsed=true;}
  export let filters: SiteFilters = defaultSiteFilters();
  export let onFiltersChange: (filters: SiteFilters) => void = () => {};
  export let altitudeEnabled = false;
  export let altitudeAvailable = false;
  export let onAltitudeChange: (enabled: boolean) => void = () => {};
  export let onRetry: () => void = () => {};
  export let reviewSummary = {pending:0,accepted:0,rejected:0,total:0};
  export let reviewMessage = '';
  export let reviewSaveError = false;
  export let canUndoReview = false;
  export let onReviewDecision: (id: string, decision?: SiteReviewDecision) => void = () => {};
  export let onUndoReview: () => void = () => {};
  export let onExportReview: () => void = () => {};
  export let videoSummary={pending:0,accepted:0,rejected:0,total:0};
  export let videoSaveError=false;
  export let onVideoDecision:(id:string,url:string,decision?:VideoDecision)=>void=()=>{};
  export let onExportVideos:()=>void=()=>{};
  $: reviewSites = snapshot.allSites.filter(spot=>spot.toVerify&&!spot.reviewFinalized);
  $: pendingReviewSites = reviewSites.filter(spot=>spot.reviewState!=='accepted');
  $: videoReviewSites = sitesForView(snapshot,'video-review');
  $: shownSites = sitesForView(snapshot,filters.wind);
  $: if (hoveredId && (collapsed || !shownSites.some(spot => spot.id === hoveredId))) hoverSite('');

  function hoverSite(id: string) {
    hoveredId = id;
    onHover(id);
  }

  function highlightCard(node: HTMLElement, id: string) {
    const enter = () => hoverSite(id);
    const leave = () => { if (hoveredId === id) hoverSite(''); };
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
    node.addEventListener('focusin', enter);
    node.addEventListener('focusout', leave);
    return { destroy() {
      leave();
      node.removeEventListener('mouseenter', enter);
      node.removeEventListener('mouseleave', leave);
      node.removeEventListener('focusin', enter);
      node.removeEventListener('focusout', leave);
    } };
  }

  function changeFilter(value: SiteFilters['wind']) {
    changeFilters({...filters,wind:value,...(value === 'review' || value === 'video-review' ? {siteType:'all' as const} : {}),...(value==='direction-review'?{siteType:'all' as const,withVideos:false,withGuide:false,regions:[]}: {})});
  }
  function changeFilters(value: SiteFilters) {
    filters = value;
    onFiltersChange(value);
  }

  function selectSite(spot: NamedSpot) {
    onSelect(spot);
    // On a phone the open panel covers the map centre.
    if (window.matchMedia('(max-width: 600px)').matches) collapsed = true;
  }

  function changeWindUnit(value: string) {
    onWindUnitChange(value as WindUnit);
  }

  export async function revealSite(id: string) {
    const request = ++revealRequest;
    stopReveal?.();
    collapsed = false;
    await tick();
    if (request !== revealRequest || !siteList?.isConnected) return;
    const card = [...siteList.querySelectorAll<HTMLButtonElement>('[data-site-id]')].find(node=>node.dataset.siteId === id);
    if (!card) return;
    stopReveal = revealPanelCard(siteList,card.closest<HTMLElement>('.site-entry') ?? card);
    card.focus({preventScroll:true});
  }

  // Embedded Windy plugins live in the bottom-right container. Mount this
  // navigation beside the map, outside its clipping and pointer handlers.
  function mountPanel(node: HTMLElement) {
    document.body.appendChild(node);
    const stopLayout = watchPanelLayout(node);
    const stop = (event: Event) => event.stopPropagation();
    const events = ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel', 'keydown'];
    events.forEach(name => node.addEventListener(name, stop));
    return { destroy() {
      stopLayout();
      events.forEach(name => node.removeEventListener(name, stop));
      node.remove();
    } };
  }
</script>

<aside class="site-panel" class:collapsed use:mountPanel aria-label="Flying sites">
  <header>
    <div>
      <span class="eyebrow">FLY IRELAND</span>
      <h2>Flying sites <span class="count">{shownSites.length}</span></h2>
    </div>
    <button class="toggle" type="button" on:click={() => collapsed = !collapsed}
      aria-expanded={!collapsed} aria-controls="fly-ireland-site-list"
      aria-label={collapsed ? 'Expand site panel' : 'Collapse site panel'}>{collapsed ? '+' : '−'}</button>
  </header>
  <div id="fly-ireland-site-list" hidden={collapsed}>
    <div class="forecast-meta">
      {#if filters.wind === 'review'}<span>Location review</span><strong>{pendingReviewSites.length} pending · {reviewSites.filter(site=>site.reviewState==='accepted').length} accepted</strong>
      {:else}
        <time>{snapshot.time}</time>
        <div class="forecast-details"><span>{snapshot.modelLabel} · {altitudeEnabled ? 'Launch-height estimate' : snapshot.levelLabel ?? 'Surface wind'}</span>{#if snapshot.weatherResolution}<span class="weather-resolution">{snapshot.weatherResolution}</span>{/if}</div>
        {#if snapshot.estimatedLayers}<span class="layer-status">Estimated winds use interpolation between profile levels.</span>{/if}
      {/if}
    </div>
    <section class="site-filter-section" aria-label="Site filters">
    <div class="filters" role="group" aria-label="Show sites on map and in list">
      <button type="button" class:active={filters.wind === 'matched'} aria-pressed={filters.wind === 'matched'} title="Matching wind direction, including light wind. Strong wind is excluded." on:click={() => changeFilter('matched')}><span class="filter-label">Wind-matched</span><span class="filter-count">{snapshot.sites.length} {snapshot.sites.length === 1 ? 'site' : 'sites'}</span></button>
      <button type="button" class:active={filters.wind === 'all'} aria-pressed={filters.wind === 'all'} on:click={() => changeFilter('all')}><span class="filter-label">All sites</span><span class="filter-count">{snapshot.allSites.length} {snapshot.allSites.length === 1 ? 'site' : 'sites'}</span></button>
      {#if filters.country==='poland'&&directionReviewTotal}
      <button type="button" class="direction-review-filter" class:active={filters.wind==='direction-review'} aria-pressed={filters.wind==='direction-review'} on:click={()=>changeFilter(filters.wind==='direction-review'?'all':'direction-review')}><span class="filter-label">Wind ranges to review</span><span class="filter-count">{directionReviewRemaining} remaining · {directionReviewTotal-directionReviewRemaining} saved</span></button>
      {/if}
      {#if videoSummary.total || filters.wind === 'video-review'}
      <button type="button" class="video-review-filter" class:active={filters.wind === 'video-review'} aria-pressed={filters.wind === 'video-review'}
        title="Show sites with undecided videos across all site types in the selected regions"
        on:click={() => changeFilter('video-review')}><span class="filter-label">Videos to review</span><span class="filter-count">{videoReviewSites.length} {videoReviewSites.length === 1 ? 'site' : 'sites'}</span></button>
      {/if}
    </div>
    <SiteFilterControls {filters} onChange={changeFilters}/>
    </section>
    <div class="forecast-controls" role="group" aria-label="Forecast settings">
      <PanelSelect id="fly-ireland-model" label="Forecast model" value={snapshot.model ?? ''} options={modelOptions} onChange={onModelChange}/>
      <PanelSelect id="fly-ireland-wind-unit" label="Wind units" value={windUnit} options={WIND_UNITS.map(unit => ({id:unit,label:unit}))} onChange={changeWindUnit}/>
    </div>
    {#if modelSyncNote}<p class="model-sync-note" role="status">{modelSyncNote}</p>{/if}
    {#if altitudeAvailable}<div class="altitude-control">
      <label><input type="checkbox" checked={altitudeEnabled} on:change={event => onAltitudeChange(event.currentTarget.checked)} />Use launch altitude <span>Experimental</span></label>
      {#if altitudeEnabled}<small>Estimated at terrain + 10 m. Applies to markers and filters; Windy map remains Surface.</small>{/if}
    </div>{/if}
    {#if reviewSummary.total || reviewSites.length || filters.wind === 'review'}
    <button type="button" class="review-filter" class:active={filters.wind === 'review'} aria-pressed={filters.wind === 'review'}
      title="Show candidate and accepted preview locations across all site types in the selected regions"
      on:click={()=>changeFilter(filters.wind === 'review' ? 'all' : 'review')}>Review sites · {pendingReviewSites.length} pending in view</button>
    {#if reviewSummary.total}<div class="review-tools">
      <span>{reviewSummary.accepted} accepted · {reviewSummary.rejected} rejected</span>
      <button type="button" on:click={onExportReview}>Export decisions</button>
    </div>{/if}
    {/if}
    {#if reviewMessage}<div class="review-message" role="status"><span>{reviewMessage}</span>{#if canUndoReview}<button type="button" on:click={onUndoReview}>Undo</button>{/if}</div>{/if}
    {#if reviewSaveError}<p class="review-save-error" role="alert">Your browser could not save these choices. Export decisions before closing this page.</p>{/if}
    {#if videoSummary.total}
      <div class="video-review-summary"><span>Videos · <b>{videoSummary.pending} to review</b></span><button type="button" on:click={onExportVideos} title="Download your video choices. Decisions are saved in this browser.">Export decisions</button></div>
      {#if videoSaveError}<p class="review-save-error" role="alert">Video choices could not be saved. Export decisions before closing this page.</p>{/if}
    {/if}
    <div class="rose-legend">{#if filters.wind === 'review'}<span><i class="review-key"></i>Pending</span><span><i class="accepted-key"></i>Accepted location</span>{:else}<span><i class="sector-key"></i>Required range</span><span><i class="wind-key"></i>Forecast wind from</span>{/if}</div>
    <div class="site-list" bind:this={siteList}>
      {#if snapshot.requestStatus !== undefined}
        <div class="forecast-error" role="status">
          <span>{snapshot.requestStatus === 429 ? 'Forecast requests are temporarily limited.'
            : snapshot.requestStatus === 401 || snapshot.requestStatus === 403 ? 'Windy denied access to the forecast. Check your Windy session.'
            : snapshot.requestStatus === 0 ? 'Could not connect to the forecast service.'
            : `Forecast service temporarily unavailable (HTTP ${snapshot.requestStatus}).`}</span>
          {#if snapshot.retrying}<small>Retrying shortly…</small>{:else}<button type="button" on:click={onRetry}>Retry forecasts</button>{/if}
        </div>
      {/if}
      {#if snapshot.settings && filters.wind === 'matched'}
        <p class="empty">Select a weather forecast model and Wind to see matching sites.</p>
      {:else}
        {#if snapshot.loading && filters.wind !== 'video-review'}
          <p class="status" role="status">Updating forecast · {snapshot.loading} sites remaining</p>
        {/if}
        {#each shownSites as spot (spot.id)}
          <div class="site-entry" class:review-entry={spot.toVerify&&!spot.reviewFinalized} class:accepted-entry={spot.reviewState==='accepted'} class:selected={selectedId === spot.id} use:highlightCard={spot.id}>
          <button type="button" class="site-card" class:review-card={spot.toVerify} class:accepted-card={spot.reviewState==='accepted'} class:selected={selectedId === spot.id}
            data-site-id={spot.id}
            aria-label={`Show ${spot.name} on map`} aria-pressed={selectedId === spot.id}
            on:click={() => selectSite(spot)}>
            <span class="card-top"><strong>{spot.name}</strong><span class="card-icons"><span class="weather-icon-slot">{#if weatherIconUrl(spot.weather,weatherIconsDir)}<img class="weather-icon" src={weatherIconUrl(spot.weather,weatherIconsDir)} alt="Forecast weather" title={spot.weather.description} />{/if}</span><span class="map-arrow" aria-hidden="true">↗</span></span></span>
            {#if spot.toVerify}
              <span class="review-badge">{spot.reviewState==='accepted'?'✓ Location accepted':'? Location to review'} · {spot.sourceName??(spot.sourceUrl?.includes('paraglidingmap.com')?'Paragliding Map':'Flybubble')}</span>
              <span class="review-detail">{spot.lat.toFixed(5)}, {spot.lon.toFixed(5)}</span>
              <span class="review-detail">{spot.region?`${REGIONS.find(region=>region.id === spot.region)?.label} · `:''}{spot.reviewGroup??'Location preview'}</span>
              {#if spot.sourceDirections}<span class="review-detail">Source directions: {spot.sourceDirections} · unverified</span>{/if}
              {#if !spot.sourceDirections && spot.sourceUrl?.includes('paraglidingmap.com')}<span class="review-detail">Wind directions not provided by Paragliding Map.</span>{/if}
              {#if spot.reviewNote}<span class="review-note">{spot.reviewNote}</span>{/if}
              <span class="review-detail">Wind criteria not assessed</span>
            {:else}
            {#if spot.country === 'poland'}
              <span class="site-area">Poland · {spot.siteType==='coastal'?'Coastal':'Inland'}{spot.locationNeedsVerification ? ' · Map position to verify' : ''}</span>
            {:else if spot.region && spot.siteType}
              <span class="site-area">{REGIONS.find(region=>region.id === spot.region)?.label} · {spot.siteType === 'coastal' ? 'Coastal' : 'Inland'}</span>
            {/if}
            <span class="match-row">
              <span class="match" class:unmatched={spot.status !== 'pass'}><span class="dot"></span>{spot.label}</span>
              <span class="card-gust-warning" class:active={spot.gustWarning?.active} class:strong={spot.gustWarning?.severity === 'strong'} role="img" aria-label={spot.gustWarning?.description || 'Gusts'} aria-hidden={!spot.gustWarning?.active} title={spot.gustWarning?.description}>
                {@html GUST_WARNING_SVG}
              </span>
            </span>
            <span class="card-weather">
              <SiteRose start={spot.sectorStart} end={spot.sectorEnd} ranges={spot.windRanges} direction={spot.direction}/>
              <span class="weather-values">
                <span class="reading-row"><span>{altitudeEnabled ? 'Estimated wind' : spot.levelEstimated ? 'Est. wind' : 'Wind'}</span><b>{spot.speed}</b></span>
                <span class="reading-row gust" title={spot.gustWarning?.description}>
                  <span>{altitudeEnabled || (snapshot.level ?? 'surface') !== 'surface' ? 'Surface gusts' : 'Gusts'}</span>
                  <span class="gust-values"><b>{spot.gust}</b><small class="gust-difference" class:no-difference={!spot.gustWarning?.differenceValue} aria-hidden={!spot.gustWarning?.differenceValue} title={`Difference from mean wind: ${spot.gustWarning?.difference ?? 'No data'}`}>({spot.gustWarning?.differenceValue || '+0.0'})</small></span>
                </span>
                <span class="reading-row rain" title={spot.rain?.description}>
                  <span class="rain-label">Rain<span class="rain-icon">{#if spot.rain?.wet}{@html RAIN_DROPS_SVG}{/if}</span></span>
                  <b>{spot.rain?.value ?? 'No data'}</b>
                </span>
              </span>
            </span>
            {#if spot.layerHeight}<span class="height-detail">Layer height: {spot.layerHeight}{snapshot.level === '100m' ? ' · 100 m above model ground' : ''}</span>{/if}
            <span class="cloud-base" title={spot.cloudBase?.description}>
              <span class="reading-row"><span>{spot.cloudBase?.label ?? 'Cloud base'}</span><b>{spot.cloudBase?.value ?? 'No data'}</b></span>
              <span class="cloud-reference">{spot.cloudBase?.reference ?? ''}</span>
            </span>
            {#if altitudeEnabled}
              <span class="height-comparison">Surface: {spot.surfaceForecast ?? 'No data'}</span>
              {#if spot.heightInfo}<span class="height-detail">{spot.heightInfo}</span>{/if}
              <span class="height-detail">{Number.isFinite(spot.targetHeightM) ? `Estimate at ${Math.round(spot.targetHeightM)} m ASL · ` : ''}{spot.altitudeNote ?? 'Loading height data'}</span>
            {/if}
            {/if}
          </button>
          {#if spot.youtube?.length || guideKeyForSite(spot) || (spot.country==='poland'&&spot.directionUnverified)}
          <div class="card-videos" role="group" aria-label={`Actions for ${spot.name}`}>
            {#if spot.country==='poland'&&spot.directionUnverified}<button class="card-guide direction-edit" type="button" on:click|stopPropagation={()=>onDirectionEdit(spot)}>{spot.windReviewConfirmed?'Edit saved wind range':'Set wind range'}</button>{/if}
            {#if guideKeyForSite(spot)}<button class="card-guide" type="button" aria-label={`Open site guide for ${spot.name}`} on:click|stopPropagation={()=>onGuide(spot)}><span aria-hidden="true">ⓘ</span> Site guide</button>{/if}
            {#each spot.youtube ?? [] as url, index (url)}
              <a class="card-video-link" href={url} target="_blank" rel="noopener noreferrer"
                title={spot.videoCandidates?.find(video=>canonicalYouTubeUrl(video.url)===canonicalYouTubeUrl(url))?.title ?? `YouTube ${index + 1}: ${spot.name}`}
                aria-label={`Open video ${index + 1} for ${spot.name}`} on:click|stopPropagation>
                <svg viewBox="0 0 24 18" width="20" height="15" aria-hidden="true"><rect width="24" height="18" rx="4" fill="#e62117"/><path d="M9 4.5 17 9 9 13.5Z" fill="#fff"/></svg>
                {#if spot.youtube.length > 1}<span class="video-number" aria-hidden="true">{index + 1}</span>{/if}
              </a>
            {/each}
          </div>
          {/if}
          {#if spot.videoCandidates?.some(video=>!video.reviewFinalized)}
          <section class="video-review" aria-label={`Review videos for ${spot.name}`}>
            <span class="video-heading">Review videos</span>
            {#each spot.videoCandidates.filter(video=>!video.reviewFinalized) as video (video.url)}
              <div class="video-candidate" class:video-rejected={video.reviewStatus==='rejected'}>
                <a class="video-link" href={videoPlaybackUrl(video)} target="_blank" rel="noopener noreferrer" title={video.title}><span aria-hidden="true">▶</span> {video.title}</a>
                <small class="video-state" class:video-approved={video.reviewStatus==='accepted'}>{video.reviewStatus==='accepted'?'Accepted':video.reviewStatus==='rejected'?'Rejected':'To review'}{video.channel?` · ${video.channel}`:''}</small>
                {#if !video.reviewFinalized && video.confidence==='area'}<small class="video-state">Area match · exact launch unconfirmed</small>{/if}
                {#if !video.reviewFinalized && video.matchNote}<small class="video-note" title={video.matchNote}>{video.matchNote}</small>{/if}
                {#if !video.reviewFinalized}
                <div class="video-actions" role="group" aria-label={`Review video: ${video.title}`}>
                  <button type="button" class:chosen={video.reviewStatus==='accepted'} disabled={video.reviewStatus==='accepted'} aria-label={`Accept video for ${spot.name}: ${video.title}`} on:click={()=>onVideoDecision(spot.id,video.url,'accepted')}>Accept</button>
                  <button type="button" class="video-reject" class:chosen={video.reviewStatus==='rejected'} disabled={video.reviewStatus==='rejected'} aria-label={`Reject video for ${spot.name}: ${video.title}`} on:click={()=>onVideoDecision(spot.id,video.url,'rejected')}>Reject</button>
                  {#if video.reviewStatus==='accepted'||video.reviewStatus==='rejected'}<button type="button" class="video-undo" aria-label={`Undo video decision for ${spot.name}: ${video.title}`} on:click={()=>onVideoDecision(spot.id,video.url,undefined)}>Undo</button>{/if}
                </div>
                {/if}
              </div>
            {/each}
            <small class="video-disclaimer">Video approval does not verify wind directions. Choices are saved in this browser.</small>
          </section>
          {/if}
          {#if spot.toVerify && !spot.reviewFinalized && spot.id.startsWith('pgmap-')}
          <div class="review-actions" role="group" aria-label={`Review ${spot.name}`}>
            <label><input type="checkbox" aria-label={`Accept ${spot.name}`} checked={spot.reviewState==='accepted'}
              on:change={event=>onReviewDecision(spot.id,event.currentTarget.checked?'accepted':undefined)} />{spot.reviewState==='accepted'?'Accepted':'Accept'}</label>
            <button type="button" class="reject-site" aria-label={`Reject ${spot.name}`} on:click={()=>onReviewDecision(spot.id,'rejected')}>Reject</button>
          </div>
          {/if}
          </div>
        {/each}
        {#if !shownSites.length && (!snapshot.loading || filters.wind === 'video-review')}
          <p class="empty">{filters.wind==='direction-review'?'All wind ranges in this view have been recorded. Use All sites to edit saved entries.':filters.wind === 'video-review' ? 'No sites with videos awaiting review in these regions. Choose All sites to see completed reviews.' : filters.wind === 'review' ? 'No review locations match these filters. Rejected locations are hidden.' : !snapshot.allSites.length ? 'No sites match the selected filters.' : snapshot.unavailable ? 'No matching sites in the available forecast data.' : 'No sites match the wind direction and speed limit at this time.'}</p>
          <button class="empty-reset" type="button" on:click={()=>changeFilters(defaultSiteFilters())}>Reset filters</button>
        {/if}
        {#if snapshot.unavailable}
          <p class="status">{snapshot.modelLabel} data unavailable for {snapshot.unavailable} sites.</p>
        {/if}
      {/if}
    </div>
  </div>
</aside>

<style>
  .filters .video-review-filter{grid-column:1/-1;display:flex;flex-direction:row;align-items:center;justify-content:space-between;gap:8px;min-height:40px;padding:10px 13px;}
  .filters .direction-review-filter{grid-column:1/-1;border:1px solid #bfa7ef;background:#f5f3ff;color:#6d28d9;min-height:44px;}.filters .direction-review-filter.active{background:#6d28d9;border-color:#6d28d9;color:white;}
  .video-review-summary{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 14px 6px;font-size:10px;color:#526c75;flex-shrink:0;}
  .video-review-summary button{border:0;background:transparent;color:#1768a0;font:inherit;text-decoration:underline;padding:4px;}
  .card-videos{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding:0 10px 10px;}
  .card-guide{display:inline-flex;align-items:center;justify-content:center;gap:5px;min-height:30px;padding:4px 9px;border:1px solid #c5dcd0;border-radius:7px;background:#f6fbf8;color:#1c6a48;font-size:11px;}
  .card-guide:hover{background:#e8f5ed;}.card-guide:focus-visible{outline:2px solid #1768c5;outline-offset:2px;}
  .card-video-link{position:relative;display:grid;place-items:center;flex:0 0 30px;width:30px;height:30px;box-sizing:border-box;border:1px solid #d5e1de;border-radius:7px;background:#fff;text-decoration:none;}
  .card-video-link:hover{border-color:#23855b;background:#edf8f1;}
  .card-video-link:focus-visible{outline:2px solid #1768c5;outline-offset:2px;}
  .card-video-link svg{display:block;width:20px;height:15px;}
  .card-video-link .video-number{position:absolute;right:-2px;bottom:-2px;display:grid;place-items:center;min-width:11px;height:11px;padding:0 2px;box-sizing:border-box;border:1px solid #fff;border-radius:4px;background:#e2e8f0;color:#334155;font:500 8px/1 system-ui;pointer-events:none;}
  .video-review{margin:0 12px 12px;padding-top:8px;border-top:1px solid #dbe6e6;}
  .video-heading{display:block;font-size:11px;font-weight:650;color:#274b59;}
  .video-heading small{font-weight:400;color:#6b7e83;}
  .video-candidate{padding:9px 0;border-bottom:1px solid #edf1f1;}
  .video-link{display:block;color:#156497;font-size:11px;line-height:1.4;text-decoration:underline;overflow-wrap:anywhere;}
  .video-link>span{color:#df291c;font-size:12px;}
  .video-state,.video-note,.video-disclaimer{display:block;font-size:9px;line-height:1.45;color:#718188;margin-top:4px;}
  .video-state{color:#996313;}.video-state.video-approved{color:#067747;}
  .video-note{display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;}
  .video-rejected .video-link{color:#7a858a;text-decoration:line-through;}
  .video-actions{display:flex;gap:6px;margin-top:7px;}
  .video-actions button{padding:5px 10px;border:1px solid #bbd6cc;border-radius:6px;background:#f3faf6;color:#126346;font-size:10px;cursor:pointer;}
  .video-actions button.chosen{background:#166b4f;color:#fff;opacity:1;}
  .video-actions .video-reject{border-color:#e5cbc7;background:#fff7f6;color:#93483c;}
  .video-actions .video-reject.chosen{background:#93483c;color:#fff;}
  .video-actions .video-undo{margin-left:auto;border:0;background:transparent;text-decoration:underline;color:#657b84;}
  .forecast-controls{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(86px,1fr);gap:9px;margin:2px 12px 10px;flex-shrink:0;}
  .model-sync-note{margin:6px 12px 0;color:#875a21;font-size:10px;line-height:1.4;flex-shrink:0;}
  .forecast-error{display:flex;flex-direction:column;gap:6px;margin:0 0 10px;padding:10px;border:1px solid #e2bc72;border-radius:9px;background:#fff7e7;color:#725019;font-size:11px;}
  .forecast-error button{align-self:flex-start;padding:5px 9px;border:1px solid #c9a25d;border-radius:6px;background:#fff;color:#725019;}
  .altitude-control{padding:9px 14px 4px;flex-shrink:0;}
  .altitude-control label{display:flex;align-items:center;gap:6px;font-size:11px;font-weight:650;cursor:pointer;}
  .altitude-control input{accent-color:#177b59;margin:0;width:15px;height:15px;}
  .altitude-control label span{margin-left:auto;font-size:9px;font-weight:400;color:#61777d;}
  .altitude-control small{display:block;font-size:10px;color:#61777d;margin-top:5px;line-height:1.4;}
  .height-comparison{display:block;font-size:11px;color:#24596b;border-top:1px solid #e5ecec;margin-top:9px;padding-top:7px;}
  .height-detail{display:block;font-size:10px;color:#61777d;margin-top:3px;}
  .review-filter{margin:4px 10px;padding:7px;border:1px dashed #a78bfa;border-radius:8px;background:#f5f3ff;color:#6d28d9;font-size:11px;font-weight:600;flex-shrink:0;}
  .review-filter.active{background:#7c3aed;color:#fff;border-style:solid;}
  .review-tools{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:1px 12px 5px;font-size:10px;color:#655179;flex-shrink:0;}
  .review-tools button,.review-message button{border:0;background:transparent;color:#6d28d9;text-decoration:underline;font-size:10px;padding:4px;flex-shrink:0;}
  .review-message{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:3px 10px;padding:7px 9px;border:1px solid #c9dcd5;border-radius:7px;background:#fff;font-size:11px;flex-shrink:0;}
  .review-save-error{margin:4px 12px;padding:7px;border-radius:7px;background:#fff1d6;color:#82540c;font-size:11px;flex-shrink:0;}
  .site-entry{margin:0 0 7px;border:1px solid #dce7e3;border-radius:12px;background:#fff;box-shadow:0 2px 3px #12372b08;overflow:hidden;}
  .site-entry:hover,.site-entry.selected{border-color:#23855b;background:#f5fcf8;}
  .site-entry:last-child{margin-bottom:0;}
  .site-entry .site-card{margin-bottom:0;}
  .site-entry.review-entry{border:2px dashed #a78bfa;}
  .site-entry.review-entry:hover,.site-entry.review-entry.selected{border-color:#7c3aed;}
  .review-actions{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 11px;border-top:1px solid #dce7e3;background:#f7faf9;}
  .review-actions label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:650;color:#6d28d9;cursor:pointer;}
  .review-actions input{width:17px;height:17px;margin:0;accent-color:#7c3aed;cursor:pointer;}
  .review-actions button{padding:5px 10px;border:1px solid #d8a9ae;border-radius:6px;background:#fff;color:#9a3042;font-size:11px;}
  .accepted-entry .review-actions label{color:#1d4ed8;}
  .accepted-entry .review-actions input{accent-color:#2563eb;}
  .accepted-entry .review-badge{color:#1d4ed8;background:#dbeafe;}
  .review-actions input:focus-visible,.review-actions button:focus-visible{outline:2px solid #2563eb;outline-offset:2px;}
  .review-key{background:#7c3aed;}.accepted-key{background:#2563eb;}
  .review-badge{display:inline-block;margin:7px 0 4px;border-radius:5px;padding:2px 6px;background:#ede9fe;color:#6d28d9;font-size:11px;font-weight:700;}
  .review-detail{display:block;color:#655179;font-size:10px;margin-top:4px;}
  .review-note{display:block;font-size:11px;line-height:1.45;margin-top:7px;color:#5a4670;}
  .site-panel{position:fixed;left:14px;top:84px;z-index:1100;width:310px;max-width:calc(100vw - 28px);max-height:var(--panel-available-height,calc(100dvh - 180px));display:flex;flex-direction:column;box-sizing:border-box;border:1px solid #dce5e5;border-radius:17px;background:#f3f7f7;color:#172c35;box-shadow:0 8px 30px #10272d33;font:13px/1.45 system-ui,sans-serif;overflow:hidden;pointer-events:auto;text-align:left;}
  header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 15px 12px;background:#fff;flex-shrink:0;}
  .eyebrow{display:block;color:#52716e;font-size:10px;font-weight:800;letter-spacing:1.7px;margin-bottom:4px;}
  h2{margin:0;font-size:17px;line-height:1.3;font-weight:750;color:#172c35;}
  .count{display:inline-block;margin-left:4px;padding:1px 7px;border-radius:20px;background:#e1f3e8;color:#146c43;font-size:13px;vertical-align:middle;}
  button{font:inherit;text-transform:none;letter-spacing:normal;cursor:pointer;box-sizing:border-box;}
  .toggle{display:grid;place-items:center;flex-shrink:0;width:30px;height:30px;padding:0;background:#edf3f3;border:1px solid #dce5e5;border-radius:9px;color:#294850;font-size:21px;}
  .toggle:hover{background:#deebea;}
  #fly-ireland-site-list:not([hidden]){display:flex;flex-direction:column;min-height:0;overflow-y:auto;}
  .site-filter-section{margin:10px 10px 9px;border:1px solid #d5e2de;border-radius:12px;background:#fff;flex-shrink:0;}
  .filters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin:8px;}
  .filters button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;min-width:0;min-height:48px;border:1px solid #c9dbd2;border-radius:8px;background:#fff;color:#435e56;padding:6px 5px;}
  .filter-label{font-size:12px;font-weight:700;white-space:nowrap;}
  .filter-count{font-size:11px;font-weight:400;opacity:.85;}
  .filters button:hover{border-color:#358362;background:#edf7f1;}
  .filters button.active{background:#146c4c;border-color:#146c4c;color:#fff;box-shadow:0 2px 5px #146c4c22;}
  .filters button:focus-visible{outline:2px solid #1768c5;outline-offset:2px;}
  .rose-legend{display:flex;flex-wrap:wrap;gap:5px 12px;padding:5px 14px;font-size:9px;color:#547079;flex-shrink:0;}
  .rose-legend span{display:flex;align-items:center;gap:4px;}
  .rose-legend i{width:7px;height:7px;display:inline-block;border-radius:2px;}
  .sector-key{background:#b9e6cb;border:1px solid #27885a;}.wind-key{background:#1768c5;}
  .forecast-meta{display:flex;flex-direction:column;gap:4px;padding:10px 15px;border-top:1px solid #e5ecec;border-bottom:1px solid #e5ecec;background:#edf4f1;color:#557079;font-size:10px;flex-shrink:0;}
  .forecast-details{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:3px 8px;}
  .weather-resolution{color:#6a8178;font-size:9px;}
  time{font-size:14px;font-weight:700;color:#233f48;}
  .site-list{overflow-y:auto;overscroll-behavior:contain;min-height:100px;padding:10px;scrollbar-width:thin;}
  .site-card{display:block;width:100%;margin:0;padding:10px;border:0;border-radius:11px;background:transparent;color:#172c35;text-align:left;}
  .site-card:last-child{margin-bottom:0;}
  .site-card:focus-visible,.toggle:focus-visible{outline:3px solid #1b8d69;outline-offset:-3px;}
  .card-top{display:flex;justify-content:space-between;align-items:start;gap:10px;}
  .card-top strong{font-size:15px;line-height:1.35;font-weight:750;}
  .card-icons{display:flex;align-items:center;gap:6px;flex-shrink:0;}
  .weather-icon-slot{display:grid;place-items:center;flex:0 0 24px;width:24px;height:24px;}
  .weather-icon{display:block;width:24px;height:24px;object-fit:contain;}
  .cloud-base{display:block;margin-top:5px;padding-top:3px;border-top:1px solid #edf2ef;}
  .cloud-base .reading-row{min-height:19px;margin-top:0;align-items:center;flex-wrap:nowrap;}
  .cloud-base .reading-row > span{white-space:nowrap;}
  .cloud-base b{color:#465e78;font-size:12px;font-weight:600;white-space:nowrap;}
  .cloud-reference{display:block;min-height:15px;line-height:15px;text-align:right;font-size:10px;color:#607487;margin-top:2px;}
  .site-area{display:block;font-size:10px;color:#60787b;margin-top:2px;}
  .empty-reset{border:1px solid #c4d8cf;border-radius:6px;background:#fff;color:#126b45;padding:7px 10px;margin:0 7px 12px;font-size:11px;}
  .map-arrow{color:#46766a;font-size:18px;line-height:1;}
  .match-row{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:16px;margin:4px 0 6px;}
  .match{display:flex;align-items:center;gap:5px;color:#18754d;font-size:10px;font-weight:700;}
  .card-gust-warning{display:inline-flex;align-items:center;justify-content:center;flex:0 0 20px;height:16px;visibility:hidden;}
  .card-gust-warning.active{visibility:visible;}
  .card-gust-warning.strong{--gust-warning-color:#dc2626;}
  .card-gust-warning :global(svg){display:block;width:20px;height:20px;flex-shrink:0;}
  .dot{width:6px;height:6px;border-radius:50%;background:#219763;}
  .unmatched{color:#92601a;}.unmatched .dot{background:#b78639;}
  .card-weather{display:flex;align-items:center;gap:10px;}
  .weather-values{flex:1;min-width:0;}
  .reading-row{display:flex;justify-content:space-between;align-items:baseline;gap:8px;font-size:11px;color:#667b82;margin-top:4px;}
  .reading-row b{color:#126b45;font-size:13px;font-weight:700;}
  .reading-row.gust{padding-top:7px;margin-top:7px;border-top:1px solid #edf2ef;flex-wrap:nowrap;gap:4px;}
  .gust b{color:#875a21;font-size:12px;white-space:nowrap;}
  .gust-values{display:inline-flex;align-items:baseline;justify-content:flex-end;gap:3px;flex-shrink:0;}
  .gust-difference{min-width:35px;font:400 9px/16px system-ui,sans-serif;color:#6b7280;text-align:right;white-space:nowrap;}
  .gust-difference.no-difference{visibility:hidden;}
  .rain b{color:#0369a1;font-size:11px;font-weight:600;}
  .reading-row.rain{align-items:center;min-height:16px;}
  .rain-label{display:inline-flex;align-items:center;gap:3px;line-height:16px;}
  .rain-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 18px;width:18px;height:12px;line-height:0;}
  .rain-icon :global(svg){width:18px;height:12px;fill:#0284c7;}
  .empty{padding:17px 7px;color:#526b73;line-height:1.6;margin:0;}
  .status{margin:3px 2px 10px;font-size:11px;color:#526b73;}
  .collapsed{width:285px;}
  @media(max-width:600px){.site-panel{left:8px;top:72px;width:280px;max-width:calc(100vw - 16px);}header{padding:11px 12px;}.reading-row{flex-wrap:wrap;gap:2px 8px;}}
  @media(max-height:500px){.site-panel{top:55px;}}
</style>
