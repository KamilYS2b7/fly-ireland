<script lang="ts">
 import {onDestroy} from 'svelte';
 import broadcast from '@windy/broadcast';
 import FlyIrelandApp from './FlyIrelandApp.svelte';
 import {createPluginSession} from './pluginSession';
 let active=false;
 const session=createPluginSession(()=>{
  const target=document.createElement('div');target.className='fly-ireland-scope fly-ireland-session';document.body.appendChild(target);
  let app:FlyIrelandApp;
  try{app=new FlyIrelandApp({target,props:{onClose:closeFromPanel}});}catch(error){target.remove();throw error;}
  active=true;
  return()=>{active=false;try{app.$destroy();}finally{target.remove();}};
 });
 export function onopen(){session.open();}
 export function onclose(){session.close();}
 function closeFromPanel(){onclose();broadcast.emit('rqstClose','windy-plugin-fly-ireland');}
 onDestroy(()=>session.destroy());
</script>
{#if active}<button class="close-plugin" type="button" on:click={closeFromPanel}>Close Fly Ireland</button>{/if}
<style>.close-plugin{font:600 12px system-ui;padding:8px 12px;border:1px solid #a7c8b8;border-radius:6px;background:#f4f9f6;color:#245c47;cursor:pointer;}</style>
