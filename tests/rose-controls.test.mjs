import assert from 'node:assert/strict';
import test from 'node:test';
import {roseControlHTML,updateRoseControl} from '../src/roseControls.ts';

test('each hide/restore control identifies its own site and escapes names in both HTML and accessible attributes',()=>{
 const name='Hill <A> "North" & South';
 const visible=roseControlHTML(name,true),hidden=roseControlHTML(name,false);
 assert.ok(visible.includes('Hide large wind rose: Hill &lt;A&gt; &quot;North&quot; &amp; South'));
 assert.ok(visible.includes('aria-pressed="true"'));
 assert.ok(hidden.includes('Show Hill &lt;A&gt; &quot;North&quot; &amp; South'));
 assert.ok(hidden.includes('aria-pressed="false"'));assert.ok(!hidden.includes('<A>'));
 const attrs={},button={setAttribute:(key,value)=>attrs[key]=value};
 updateRoseControl(button,name,false);assert.equal(button.title,`Show large wind rose: ${name}`);
 assert.equal(attrs['aria-pressed'],'false');assert.equal(attrs['aria-label'],button.title);
 assert.ok(button.innerHTML.includes('Show Hill &lt;A&gt;'));
 updateRoseControl(button,name,true);assert.equal(attrs['aria-pressed'],'true');assert.ok(!button.innerHTML.includes('Show Hill'));
});
