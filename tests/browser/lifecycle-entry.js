import Plugin from '../../src/plugin.svelte';
import './windy-lifecycle-stub.js';
window.lifecyclePlugin=new Plugin({target:document.getElementById('plugin-windy-plugin-fly-ireland')});
window.lifecycleReady=true;
