import assert from 'node:assert/strict';
import test from 'node:test';
import {createSiteGuideMap} from '../src/siteGuideMap.ts';

function boundary(){
 const layers=new Set(['existing rose']),moves=[],panes=new Map([['windRosePane',{style:{zIndex:'900'}}],['windRoseUiPane',{style:{zIndex:'901'}}],['windRoseLabelsPane',{style:{zIndex:'902'}}]]),clicks=[];
 const map={getPane:name=>panes.get(name),createPane:name=>{const pane={style:{}};panes.set(name,pane);return pane;},
  getZoom:()=>10,fitBounds:(bounds,options)=>moves.push({bounds,options}),setView:(coords,zoom,options)=>moves.push({coords,zoom,options})};
 const L={divIcon:options=>options,marker:(coords,options)=>{
  const handlers=new Map();const marker={coords,options,addTo(){layers.add(marker);return marker;},remove(){layers.delete(marker);},
   getElement(){return {addEventListener:(name,callback)=>handlers.set(name,callback)};},click(){handlers.get('click')?.({stopPropagation:()=>clicks.push('stopped')});}};return marker;
 }};
 return {map,L,layers,moves,clicks,panes};
}
const first={key:'One',title:'First site',points:[{id:'a',kind:'launch',label:'Launch <A>',code:'A',lat:54,lon:-7,needsVerification:false},{id:'b',kind:'parking',label:'Parking B',code:'B',lat:54.01,lon:-7.01,needsVerification:true}]};
const second={key:'Two',title:'Second site',points:[{id:'c',kind:'landing',label:'Landing C',code:'C',lat:53,lon:-8,needsVerification:false}]};

test('site points switch atomically, keep unrelated layers, and clean up on plugin destruction',()=>{
 const b=boundary(),controller=createSiteGuideMap(b);
 controller.show(first);assert.equal(b.layers.size,3);assert.deepEqual(b.moves[0].bounds,[[54,-7],[54.01,-7.01]]);
 assert.ok(Number(b.panes.get('flyIrelandGuidePoints').style.zIndex)>Number(b.panes.get('windRoseLabelsPane').style.zIndex),'Precise launch pins must remain visible over a nearby large rose');
 controller.show(second);assert.equal(b.layers.size,2);assert.ok(b.layers.has('existing rose'));
 assert.deepEqual([...b.layers].find(x=>x!=='existing rose').coords,[53,-8]);
 controller.clear();assert.deepEqual([...b.layers],['existing rose']);
 controller.show(first);controller.destroy();assert.deepEqual([...b.layers],['existing rose']);
 controller.show(second);assert.deepEqual([...b.layers],['existing rose'],'Late operations cannot restore destroyed points');
});

test('point focus targets its real location, blocks map clicks and exposes uncertain labels without HTML injection',()=>{
 const b=boundary(),selected=[],controller=createSiteGuideMap({...b,onSelect:point=>selected.push(point.id)});
 controller.show(first,first.points[1]);assert.deepEqual(b.moves.at(-1).coords,[54.01,-7.01]);assert.equal(b.moves.at(-1).zoom,15);
 const markers=[...b.layers].filter(x=>x!=='existing rose');
 assert.ok(markers[0].options.icon.html.includes('Launch &lt;A&gt;'));assert.ok(markers[1].options.title.includes('Needs verification'));
 markers[0].click();assert.deepEqual(selected,['b','a']);assert.equal(b.clicks.length,1);assert.deepEqual(b.moves.at(-1).coords,[54,-7]);
 const before=b.moves.length;controller.focus(second.points[0]);assert.equal(b.moves.length,before,'Another guide cannot focus stale points');
});

test('automatic guides reconcile without navigation or marker churn and deduplicate explicit selections',()=>{
 const b=boundary(),selected=[],controller=createSiteGuideMap({...b,onSelect:(point,guide)=>selected.push([point.id,guide.key])});
 controller.setAutomatic([first,first,second]);
 assert.equal(b.layers.size,4);assert.equal(b.moves.length,0,'Automatic points must not move the map');
 const original=new Set(b.layers);
 controller.setAutomatic([second,first]);assert.deepEqual(b.layers,original,'Unchanged markers must stay attached');
 controller.show(first,first.points[0]);assert.equal(b.layers.size,4,'Show on map must not duplicate automatic points');
 assert.deepEqual(selected,[['a','One']]);
 controller.setAutomatic([second]);assert.equal(b.layers.size,4,'Explicitly selected guide remains pinned');
 controller.clear();assert.equal(b.layers.size,2,'Closing details leaves the other automatic guide visible');
 controller.setAutomatic([]);assert.deepEqual([...b.layers],['existing rose']);
 controller.destroy();controller.setAutomatic([first]);assert.deepEqual([...b.layers],['existing rose']);
});

test('clicking an automatic point selects its owning guide and pins only that guide',()=>{
 const b=boundary(),selected=[],controller=createSiteGuideMap({...b,onSelect:(point,guide)=>selected.push([point.id,guide.key])});
 controller.setAutomatic([first,second]);
 const marker=[...b.layers].find(layer=>layer.coords?.[0]===53);marker.click();
 assert.deepEqual(selected,[['c','Two']]);assert.deepEqual(b.moves.at(-1).coords,[53,-8]);
 controller.setAutomatic([]);assert.equal(b.layers.size,2);assert.ok(b.layers.has(marker));
 controller.clear();assert.deepEqual([...b.layers],['existing rose']);
});
