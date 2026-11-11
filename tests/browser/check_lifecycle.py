"""Requires Python Playwright + Chromium. Runs a real Svelte/Leaflet fixture."""
import functools,http.server,json,os,pathlib,threading
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[2]
handler=functools.partial(http.server.SimpleHTTPRequestHandler,directory=str(root/'.tmp/lifecycle'))
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),handler)
threading.Thread(target=server.serve_forever,daemon=True).start()
probe=r'''(() => {
 const objects=new Map(),listeners=new Map();let next=0;
 const ident=o=>{if(!objects.has(o))objects.set(o,++next);return objects.get(o);};
 const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
 const key=(target,event,fn,options)=>`${ident(target)}:${event}:${ident(fn)}:${typeof options==='boolean'?options:!!options?.capture}`;
 EventTarget.prototype.addEventListener=function(event,fn,options){if(fn&&(this===window||this===document))listeners.set(key(this,event,fn,options),event);return add.call(this,event,fn,options);};
 EventTarget.prototype.removeEventListener=function(event,fn,options){if(fn)listeners.delete(key(this,event,fn,options));return remove.call(this,event,fn,options);};
 const observers=new Map();
 for(const name of ['MutationObserver','ResizeObserver']){const Native=window[name];window[name]=class extends Native{constructor(cb){super(cb);observers.set(this,new Set());}observe(target,opts){observers.get(this).add(target);return super.observe(target,opts);}disconnect(){observers.get(this).clear();return super.disconnect();}unobserve(target){observers.get(this).delete(target);return super.unobserve(target);}};}
 window.lifecycleProbe=()=>({listeners:listeners.size,observed:[...observers.values()].reduce((n,s)=>n+s.size,0)});
})();'''
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/lib/chromium/chromium'),args=['--no-sandbox','--disable-dev-shm-usage'],env={**os.environ,'XDG_CACHE_HOME':'/tmp/fly-browser-cache'})
  page=browser.new_page(viewport={'width':1440,'height':1000});page.add_init_script(probe)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if r.request.url.startswith(f'http://127.0.0.1:{server.server_port}'):
    return r.continue_()
   if 'site_descriptions.json' in r.request.url:return r.fulfill(content_type='application/json',body=(root/'assets/assets/site_descriptions.json').read_text())
   r.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg"/>')
  page.route('**/*',route)
  page.goto(f'http://127.0.0.1:{server.server_port}/');page.wait_for_function('window.lifecycleReady')
  page.wait_for_timeout(150)
  baseline=page.evaluate('({boundary:lifecycleBoundary.metrics(),probe:lifecycleProbe(),color:getComputedStyle(document.querySelector("#native-menu a")).color})')
  assert baseline['color']=='rgb(129, 44, 157)',baseline
  def closed():
   page.wait_for_timeout(250)
   assert page.locator('.site-panel,.sounding-overlay,.site-guide-overlay,.wind-direction-editor,.fly-ireland-session').count()==0
   current=page.evaluate('({boundary:lifecycleBoundary.metrics(),probe:lifecycleProbe(),color:getComputedStyle(document.querySelector("#native-menu a")).color})')
   for field in ['store','broadcast','map','layers','panes']:assert current['boundary'][field]==baseline['boundary'][field],(field,current,baseline)
   assert current['probe']==baseline['probe'],(current,baseline)
   assert current['color']==baseline['color']
  for cycle in range(3):
   page.evaluate('lifecyclePlugin.onopen();lifecyclePlugin.onopen()')
   page.locator('.site-panel').wait_for();page.wait_for_timeout(300)
   assert page.locator('.site-panel').count()==1
   assert page.evaluate('getComputedStyle(document.querySelector("#native-menu a")).color')==baseline['color']
   assert page.locator('.fly-ireland-scope .mini-dial-icon,.fly-ireland-scope .dial-icon').count()>0
   if cycle==1:
    page.get_by_role('button',name='Show day overview for',exact=False).first.click()
    page.get_by_role('dialog').wait_for()
   page.evaluate('lifecyclePlugin.onclose();lifecyclePlugin.onclose()');closed()
  page.evaluate('lifecyclePlugin.onopen()');page.locator('.site-panel').wait_for();page.wait_for_timeout(250)
  page.screenshot(path=str(root/'.tmp/lifecycle/desktop-open.png'))
  page.locator('.site-panel button[aria-label="Close Fly Ireland"]').click();closed()
  page.set_viewport_size({'width':390,'height':900})
  page.evaluate('lifecyclePlugin.onopen()');page.locator('.site-panel').wait_for();page.wait_for_timeout(250)
  page.screenshot(path=str(root/'.tmp/lifecycle/mobile-open.png'))
  page.locator('.site-panel button[aria-label="Close Fly Ireland"]').click();closed()
  # Close while requests / animations may still be queued, then await late work.
  page.evaluate('lifecyclePlugin.onopen();lifecyclePlugin.onclose()');page.wait_for_timeout(1000);closed()
  page.evaluate('lifecyclePlugin.onopen();lifecyclePlugin.$destroy()');closed()
  page.screenshot(path=str(root/'.tmp/lifecycle/closed-native-menu.png'))
  assert not errors,errors
  print(json.dumps({'result':'passed','cycles':7,'checks':['native close','sidebar close','duplicate open/close','reopen','portal removal','Leaflet layers/panes','store/broadcast/map listeners','global DOM listeners','observers','late callbacks','native menu CSS','desktop/mobile'],'baseline':baseline},indent=2))
  browser.close()
finally:server.shutdown()
