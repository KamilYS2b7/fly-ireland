<script lang="ts">
  import {tick} from 'svelte';

  export let id: string;
  export let label: string;
  export let value: string;
  export let options: {id: string; label: string}[];
  export let onChange: (value: string) => void;
  export let placeholder = 'Choose model';

  let trigger: HTMLButtonElement;
  let menu: HTMLDivElement;
  let open = false;
  let active = 0;
  let search = '';
  let lastTyped = 0;
  $: selected = options.find(option => option.id === value);

  async function show() {
    active = Math.max(0, options.findIndex(option => option.id === value));
    open = true;
    await revealActive();
  }

  async function revealActive() {
    await tick();
    menu?.querySelector<HTMLElement>(`[data-option-index="${active}"]`)?.scrollIntoView({block:'nearest'});
  }

  function choose(index: number) {
    const option = options[index];
    if (!option) return;
    open = false;
    trigger.focus({preventScroll:true});
    if (option.id !== value) onChange(option.id);
  }

  function keydown(event: KeyboardEvent) {
    if (event.key === 'Tab') { open = false; return; }
    if (event.key === 'Escape') { event.preventDefault(); open = false; return; }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open) choose(active); else void show();
      return;
    }
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      event.preventDefault();
      if (!open) { void show(); return; }
      active = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      void revealActive();
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      search = Date.now() - lastTyped < 700 ? search + event.key.toLowerCase() : event.key.toLowerCase();
      lastTyped = Date.now();
      if (!open) void show();
      const index = options.findIndex(option => option.label.toLowerCase().startsWith(search));
      if (index !== -1) { active = index; void revealActive(); }
    }
  }

  // Keep the menu outside the panel's scrolling/clipping containers. Listeners
  // exist only while it is open, so timeline updates have no extra work.
  function mountMenu(node: HTMLDivElement) {
    document.body.appendChild(node);
    function place() {
      const rect = trigger.getBoundingClientRect();
      if (!rect.width || !rect.height) { open = false; return; }
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop ?? 0;
      const bottom = top + (viewport?.height ?? window.innerHeight);
      const below = bottom - rect.bottom - 12, above = rect.top - top - 12;
      const upwards = below < Math.min(220, node.scrollHeight) && above > below;
      const height = Math.max(0, Math.min(300, upwards ? above : below));
      node.style.width = `${rect.width}px`;
      node.style.maxHeight = `${height}px`;
      node.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8))}px`;
      node.style.top = `${upwards ? rect.top - Math.min(node.scrollHeight, height) - 5 : rect.bottom + 5}px`;
    }
    function outside(event: Event) {
      if (!node.contains(event.target as Node) && !trigger.contains(event.target as Node)) open = false;
    }
    const stop = (event: Event) => event.stopPropagation();
    const events = ['pointerdown','mousedown','touchstart','click','dblclick','wheel','keydown'];
    events.forEach(name => node.addEventListener(name, stop));
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('click', outside, true);
    document.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    viewportListen(true);
    function viewportListen(add: boolean) {
      if (add) { window.visualViewport?.addEventListener('resize', place); window.visualViewport?.addEventListener('scroll', place); }
      else { window.visualViewport?.removeEventListener('resize', place); window.visualViewport?.removeEventListener('scroll', place); }
    }
    place();
    return {destroy() {
      events.forEach(name => node.removeEventListener(name, stop));
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('click', outside, true);
      document.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      viewportListen(false);
      node.remove();
    }};
  }

  function blur(event: FocusEvent) {
    if (!menu?.contains(event.relatedTarget as Node)) open = false;
  }
</script>

<div class="panel-select">
  <span class="select-label" id={`${id}-label`}>{label}</span>
  <button bind:this={trigger} type="button" class="select-trigger" class:open
    data-value={value}
    role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open}
    aria-controls={`${id}-options`} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
    disabled={!options.length} on:click={() => open ? open = false : show()} on:keydown={keydown} on:blur={blur}>
    <span class="selected-value">{selected?.label ?? placeholder}</span>
    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
  </button>
</div>
{#if open}
  <div bind:this={menu} use:mountMenu class="select-menu" id={`${id}-options`} role="listbox" tabindex="-1" aria-label={label} on:keydown={keydown}>
    {#each options as option, index (option.id)}
      <button type="button" role="option" tabindex="-1" id={`${id}-option-${index}`}
        data-option-index={index} data-value={option.id} aria-selected={option.id === value} class:highlighted={active === index}
        on:mousedown|preventDefault on:click={() => choose(index)} on:pointermove={() => active = index}>
        <span>{option.label}</span>
        {#if option.id === value}<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8 3 3 7-7" /></svg>{/if}
      </button>
    {/each}
  </div>
{/if}

<style>
  .panel-select{min-width:0;}
  .select-label{display:block;margin:0 0 5px 2px;color:#526e68;font:500 10px/1.4 system-ui,sans-serif;}
  .select-trigger{display:flex;align-items:center;justify-content:space-between;gap:8px;box-sizing:border-box;width:100%;min-width:0;min-height:38px;padding:8px 11px;border:1px solid #cadbd3;border-radius:8px;background:#fff;color:#234438;font:600 12px/1.4 system-ui,sans-serif;text-align:left;letter-spacing:normal;text-transform:none;cursor:pointer;}
  .selected-value{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .select-trigger:hover{border-color:#6a9d87;background:#fafdfb;}
  .select-trigger.open{border-color:#27885a;box-shadow:0 0 0 2px #27885a18;}
  .select-trigger:focus-visible{outline:2px solid #1768c5;outline-offset:2px;}
  .select-trigger:disabled{opacity:.6;cursor:default;}
  svg{width:14px;height:14px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round;}
  .select-trigger svg{color:#648675;}
  .select-trigger.open svg{transform:rotate(180deg);}
  .select-menu{position:fixed;z-index:1600;box-sizing:border-box;overflow-y:auto;overscroll-behavior:contain;padding:5px;border:1px solid #c9dcd2;border-radius:10px;background:#fff;color:#234438;box-shadow:0 8px 24px #173e282e;scrollbar-width:thin;}
  .select-menu button{display:flex;align-items:center;justify-content:space-between;gap:6px;box-sizing:border-box;width:100%;min-height:35px;margin:0;padding:8px 10px;border:0;border-radius:6px;background:transparent;color:#29483c;font:400 12px/1.4 system-ui,sans-serif;text-align:left;letter-spacing:normal;text-transform:none;cursor:pointer;}
  .select-menu button span{min-width:0;overflow-wrap:anywhere;}
  .select-menu button[aria-selected="true"]{color:#126b45;background:#e8f5ed;font-weight:600;}
  .select-menu button.highlighted{background:#eff5f2;}
  .select-menu button[aria-selected="true"].highlighted{background:#dbefe2;}
  .select-menu button:focus-visible{outline:2px solid #1768c5;outline-offset:-2px;}
</style>
