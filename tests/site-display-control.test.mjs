import test from 'node:test';
import assert from 'node:assert/strict';
import * as controls from '../src/roseControls.ts';

test('one accessible display button includes both modes and escapes the site name',()=>{
 const html=controls.siteDisplayControlHTML('Hill <A>',true);
 assert.equal((html.match(/<button\b/g)||[]).length,1);
 assert.match(html,/Show wind rose/);assert.doesNotMatch(html,/display-mode|Show site points/);
 assert.match(html,/Hill &lt;A&gt;/);assert.doesNotMatch(html,/<A>/);
 const attrs={},button={setAttribute:(key,value)=>attrs[key]=value};
 controls.updateSiteDisplayControl(button,'Hill A',false);
 assert.match(attrs['aria-label'],/Show site points/);
 assert.equal(attrs['aria-pressed'],'false');assert.match(button.innerHTML,/Show site points/);assert.doesNotMatch(button.innerHTML,/Show wind rose/);
 controls.updateSiteDisplayControl(button,'Hill A',true);
 assert.match(attrs['aria-label'],/Show wind rose/);
 assert.equal(attrs['aria-pressed'],'true');
});
const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const options={anchor:{x:240,y:240},size:{width:150,height:68},viewport:{width:500,height:500},diameter:250};
test('visible rose switch sits fully above the rose with a gap',()=>{
 const p=controls.placeSiteDisplayControl({...options,points:false,obstacles:[]});
 assert.ok(p.y+68<=240-125-10);assert.equal(p.x,165);
});
test('point-mode switch avoids point captions and stays inside the viewport',()=>{
 const obstacles=[{x:145,y:140,width:190,height:115}];
 const p=controls.placeSiteDisplayControl({...options,points:true,obstacles});
 assert.ok(!obstacles.some(o=>intersects({...p,...options.size},o)));
 assert.ok(p.x>=8&&p.y>=8&&p.x+150<=492&&p.y+68<=492);
 const edge=controls.placeSiteDisplayControl({...options,anchor:{x:490,y:10},points:true,obstacles:[]});
 assert.ok(edge.x+150<=492&&edge.y>=8);
});
test('crowded placement remains deterministic and returns finite coordinates',()=>{
 const args={...options,points:true,obstacles:[{x:0,y:0,width:500,height:500}]};
 const a=controls.placeSiteDisplayControl(args),b=controls.placeSiteDisplayControl(args);
 assert.deepEqual(a,b);assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));
});

test('padded offscreen sites cannot pull their desktop controls onto viewport edges',()=>{
 const viewport={width:500,height:400};
 for(const anchor of [{x:-1,y:200},{x:501,y:200},{x:250,y:-1},{x:250,y:401}])assert.equal(controls.controlAnchorInViewport(anchor,viewport),false);
 assert.equal(controls.controlAnchorInViewport({x:250,y:200},viewport),true);
});

test('a rose near the top edge places its switch outside the dial rather than clamping it over the graphic',()=>{
 const args={...options,anchor:{x:240,y:90},size:{width:150,height:44},points:false,obstacles:[]};
 const p=controls.placeSiteDisplayControl(args);
 const rose={x:115,y:-35,width:250,height:250};
 assert.ok(!intersects({...p,...args.size},rose));
});

test('changing display mode does not change the switch anchor or dimensions',()=>{
 const rose=controls.placeSiteDisplayControl({...options,points:false,obstacles:[]});
 const points=controls.placeSiteDisplayControl({...options,points:true,obstacles:[]});
 assert.deepEqual(points,rose);
 const a=controls.siteDisplayControlGroupHTML('Hill',false),b=controls.siteDisplayControlGroupHTML('Hill',true);
 assert.equal(a.includes('site-control-name'),false);assert.equal(b.includes('site-control-name'),false);
});
