<script lang="ts">
  import {windRanges,formatWindRanges} from './windRanges';
  import type {WindRange} from './windRanges';
  export let start: number;
  export let end: number;
  export let direction: number | undefined = undefined;
  export let ranges: WindRange[] | undefined = undefined;
  const norm = (value: number) => ((value % 360) + 360) % 360;
  const point = (degrees: number) => `${40 + 26 * Math.sin(degrees * Math.PI / 180)} ${40 - 26 * Math.cos(degrees * Math.PI / 180)}`;
  $: allowed = windRanges({sectorStart:start,sectorEnd:end,windRanges:ranges}).map(range=>{
    const sweep=norm(range.end-range.start)||360;
    return {sweep,path:`M 40 40 L ${point(range.start)} A 26 26 0 ${sweep>180?1:0} 1 ${point(range.end)} Z`};
  });
  $: description = `Required direction: ${formatWindRanges({sectorStart:start,sectorEnd:end,windRanges:ranges})}. Forecast wind from: ${Number.isFinite(direction) ? `${Math.round(direction!)}°` : 'unavailable'}.`;
</script>

<svg class="site-rose" viewBox="0 0 80 80" role="img" aria-label={description}>
  <title>{description}</title>
  <circle cx="40" cy="40" r="28" fill="#f0f5f5" stroke="#cbd8d9"/>
  {#each allowed as sector}
  {#if sector.sweep === 360}
    <circle cx="40" cy="40" r="26" fill="#b9e6cb" stroke="#27885a"/>
  {:else}
    <path d={sector.path} fill="#b9e6cb" stroke="#27885a" stroke-linejoin="round"/>
  {/if}
  {/each}
  <path d="M40 12V16 M68 40H64 M40 68V64 M12 40H16" stroke="#829b9e"/>
  <g class="cardinals" text-anchor="middle">
    <text x="40" y="8">N</text><text x="75" y="43">E</text>
    <text x="40" y="79">S</text><text x="5" y="43">W</text>
  </g>
  {#if Number.isFinite(direction)}
    <g transform={`rotate(${direction} 40 40)`}>
      <path d="M40 40V21" stroke="#fff" stroke-width="5"/>
      <path d="M40 40V21" stroke="#1768c5" stroke-width="2.5"/>
      <path d="M40 14L35 24H45Z" fill="#1768c5" stroke="#fff" stroke-width="1"/>
    </g>
    <circle cx="40" cy="40" r="3" fill="#1768c5" stroke="#fff"/>
  {:else}
    <circle cx="40" cy="40" r="3" fill="#91a2a6"/>
  {/if}
</svg>

<style>
  .site-rose{display:block;width:86px;height:86px;flex-shrink:0;overflow:visible;}
  .cardinals{font:700 8px system-ui,sans-serif;fill:#526970;}
</style>
