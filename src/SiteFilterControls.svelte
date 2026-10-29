<script lang="ts">
  import {REGIONS} from './siteCatalog';
  import type {RegionId} from './siteCatalog';
  import {defaultSiteFilters, normalizeSiteFilters, POLAND_ENABLED} from './siteFilters';
  import type {SiteFilters} from './siteFilters';
  export let filters: SiteFilters = defaultSiteFilters();
  export let onChange: (value: SiteFilters) => void;
  const regionOrder: RegionId[] = ['north-west','north-east','west','east','south-west','south-east'];
  const regionOptions = regionOrder.map(id=>REGIONS.find(region=>region.id===id)!);
  $: northSelected = filters.regions.length === 2 && filters.regions.includes('north-east') && filters.regions.includes('north-west');
  $: southSelected = filters.regions.length === 2 && filters.regions.includes('south-east') && filters.regions.includes('south-west');
  $: regionSummary = filters.country === 'poland' ? 'Poland' : !filters.regions.length ? 'All Ireland' : northSelected ? 'North' : southSelected ? 'South' : filters.regions.length === 1
    ? REGIONS.find(region=>region.id === filters.regions[0])?.label : `${filters.regions.length} regions`;
  $: typeSummary = filters.siteType === 'all' ? 'All types' : filters.siteType === 'coastal' ? 'Coastal' : 'Inland';
  $: activeCount = Number(filters.country === 'poland') + Number(filters.regions.length > 0) + Number(filters.siteType !== 'all') + Number(!!filters.withVideos) + Number(!!filters.withGuide);
  function change(patch: Partial<SiteFilters>) {
    filters = normalizeSiteFilters({...filters,...patch});
    onChange(filters);
  }
  function toggleRegion(id: RegionId) {
    change({regions:filters.regions.includes(id) ? filters.regions.filter(region=>region !== id) : [...filters.regions,id]});
  }
</script>

{#if POLAND_ENABLED}
<fieldset class="country-filter">
  <legend>Country</legend>
  <div class="country-options" role="group" aria-label="Country">
    <button type="button" class:active={filters.country !== 'poland'} aria-pressed={filters.country !== 'poland'}
      on:click={()=>change({country:'ireland',regions:[],wind:filters.wind==='review'?'all':filters.wind})}>Ireland</button>
    <button type="button" class:active={filters.country === 'poland'} aria-pressed={filters.country === 'poland'}
      on:click={()=>change({country:'poland',regions:[],wind:filters.wind==='review'?'all':filters.wind})}>Poland</button>
  </div>
</fieldset>
{/if}
<details class="advanced-filters">
  <summary>
    <svg class="filter-icon" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M3 4h14l-5.5 6v5l-3 1v-6Z"/></svg>
    <span class="summary-copy"><strong>More filters</strong><span>{regionSummary} · {typeSummary}{filters.withVideos ? ' · With videos' : ''}{filters.withGuide ? ' · With site guide' : ''}</span></span>
    {#if activeCount}<span class="active-count">{activeCount} active</span>{/if}
    <svg class="chevron" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
  </summary>
  <div class="filter-content">
    {#if filters.country !== 'poland'}
    <fieldset>
      <legend>Region <span>Select one or more</span></legend>
      <div class="shortcuts">
        <button type="button" class:active={!filters.regions.length} aria-pressed={!filters.regions.length}
          on:click={()=>change({regions:[]})}>All Ireland</button>
        <button type="button" class:active={northSelected} aria-pressed={northSelected}
          title="Select North East and North West" on:click={()=>change({regions:['north-east','north-west']})}>North</button>
        <button type="button" class:active={southSelected} aria-pressed={southSelected}
          title="Select South East and South West" on:click={()=>change({regions:['south-east','south-west']})}>South</button>
      </div>
      <div class="region-options" role="group" aria-label="Regions">
        {#each regionOptions as region}
          <button type="button" class:active={filters.regions.includes(region.id)} aria-pressed={filters.regions.includes(region.id)}
            on:click={()=>toggleRegion(region.id)}><span class="region-check" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="m2 6 2.5 2.5L10 3"/></svg></span>{region.label}</button>
        {/each}
      </div>
    </fieldset>
    {/if}
    <fieldset>
      <legend>Site type</legend>
      <div class="type-options" role="group" aria-label="Site type">
        <button type="button" class:active={filters.siteType === 'all'} aria-pressed={filters.siteType === 'all'} on:click={()=>change({siteType:'all'})}>All types</button>
        <button type="button" class:active={filters.siteType === 'coastal'} aria-pressed={filters.siteType === 'coastal'} on:click={()=>change({siteType:'coastal'})}>Coastal</button>
        <button type="button" class:active={filters.siteType === 'inland'} aria-pressed={filters.siteType === 'inland'} on:click={()=>change({siteType:'inland'})}>Inland</button>
      </div>
    </fieldset>
    <label class="filter-option video-filter" class:enabled={filters.withVideos}>
      <input type="checkbox" checked={filters.withVideos} on:change={event=>change({withVideos:event.currentTarget.checked})}/>
      <svg viewBox="0 0 24 18" width="20" height="15" aria-hidden="true"><rect width="24" height="18" rx="4" fill="#e62117"/><path d="M9 4.5 17 9 9 13.5Z" fill="#fff"/></svg>
      <span>With YouTube videos</span>
    </label>
    <label class="filter-option guide-filter" class:enabled={filters.withGuide}>
      <input type="checkbox" checked={filters.withGuide} on:change={event=>change({withGuide:event.currentTarget.checked})}/>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-2-1-6-1-9 1Zm0 0v15"/></svg>
      <span>With site guide</span>
    </label>
    <div class="filter-footer"><button class="reset" type="button" disabled={!activeCount && filters.wind === 'all'} on:click={()=>change(defaultSiteFilters())}><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path d="M4 7a6 6 0 1 1 0 6M4 3v4h4"/></svg>Reset filters</button></div>
  </div>
</details>

<style>
  .country-filter{margin:0;padding:10px;background:#fff;border-top:1px solid #e3ebe7;}
  .country-filter legend{float:left;margin-bottom:6px;}
  .country-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;clear:both;}
  .country-options button{min-height:34px;}
  .advanced-filters{border-top:1px solid #e3ebe7;background:#fff;border-radius:0 0 11px 11px;color:#294850;}
  summary{display:flex;align-items:center;gap:8px;min-height:47px;box-sizing:border-box;padding:8px 10px;cursor:pointer;list-style:none;}
  summary::-webkit-details-marker{display:none;}
  .filter-icon{flex-shrink:0;fill:none;stroke:#568171;stroke-width:1.4;stroke-linejoin:round;}
  .summary-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:2px;}
  .summary-copy strong{font-size:11px;font-weight:650;}
  .summary-copy > span{font-size:10px;color:#637b72;}
  .active-count{padding:3px 6px;border-radius:10px;background:#e1f3e8;color:#146c4c;font:600 9px/1.3 system-ui;white-space:nowrap;}
  .chevron{flex-shrink:0;fill:none;stroke:#688479;stroke-width:1.6;transition:transform .15s ease;}
  details[open] .chevron{transform:rotate(180deg);}
  summary:focus-visible{outline:2px solid #1768c5;outline-offset:-3px;border-radius:8px;}
  .filter-content{padding:2px 10px 8px;}
  fieldset{border:0;padding:0;margin:4px 0 12px;min-width:0;}
  legend{display:flex;align-items:baseline;justify-content:space-between;width:100%;padding:0;margin-bottom:7px;font-size:11px;font-weight:650;}
  legend span{font-size:9px;font-weight:400;color:#70847b;}
  .shortcuts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-bottom:7px;}
  .region-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;}
  .type-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;}
  button{box-sizing:border-box;min-width:0;min-height:32px;font:500 11px/1.3 system-ui,sans-serif;letter-spacing:normal;text-transform:none;cursor:pointer;border:1px solid #d7e2dc;background:#fff;color:#4c665b;padding:6px;border-radius:7px;}
  button:hover{background:#f0f7f2;border-color:#77a28b;}
  button.active{background:#146c4c;border-color:#146c4c;color:#fff;font-weight:600;}
  button:focus-visible{outline:2px solid #1768c5;outline-offset:1px;}
  .region-options button{display:flex;align-items:center;gap:7px;min-height:34px;text-align:left;padding:7px;}
  .region-options button.active{background:#edf7f1;border-color:#599b73;color:#146c4c;}
  .region-check{display:grid;place-items:center;flex:0 0 13px;width:13px;height:13px;border:1px solid #c1d3c8;border-radius:3px;background:#fff;}
  .region-check svg{width:11px;height:11px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;visibility:hidden;}
  .active .region-check{background:#16704c;border-color:#16704c;}
  .active .region-check svg{visibility:visible;}
  .filter-option{display:flex;align-items:center;gap:8px;box-sizing:border-box;min-height:36px;margin:0 0 10px;padding:8px;border:1px solid #d7e2dc;border-radius:7px;cursor:pointer;font-size:11px;}
  .filter-option:hover{background:#f0f7f2;border-color:#77a28b;}
  .filter-option.enabled{background:#edf7f1;border-color:#599b73;color:#146c4c;}
  .filter-option input{flex-shrink:0;width:15px;height:15px;margin:0;accent-color:#146c4c;cursor:pointer;}
  .filter-option input:focus-visible{outline:2px solid #1768c5;outline-offset:2px;}
  .filter-option svg{flex-shrink:0;}
  .filter-footer{border-top:1px solid #edf2ef;padding-top:8px;}
  .reset{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;min-height:36px;padding:8px 10px;border:1px solid #cf9a66;background:#fff4e8;color:#884a20;font-size:12px;font-weight:650;}
  .reset svg{flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;}
  .reset:hover:not(:disabled){border-color:#ad753f;background:#ffebd5;}
  .reset:disabled{border-color:#d7e0da;background:#f5f7f5;color:#849189;cursor:default;}
</style>
