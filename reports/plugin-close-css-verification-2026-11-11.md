# Windy review: complete close and CSS isolation

Root causes:
- The native plugin host was explicitly hidden, taking Windy's close control away.
- All teardown lived in Svelte onDestroy; the app did not implement native
  onclose, although Windy may keep the Svelte instance cached after closing.
- Global `.title` styling set black text and disabled pointer events outside
  the plugin. Other short class names also lacked an ownership boundary.

Changes:
- The SDK entry exports onopen/onclose. Each open creates one isolated child app;
  closing destroys it entirely. Repeated/reentrant close and reopen are covered.
- Native close is visible; the portal sidebar includes its own explicit close
  button, which also tells Windy to close the native plugin host.
- Child teardown clears markers, owned panes, portals, listeners, observers,
  animations, scheduled work and pending forecast requests. Callback guards keep
  late responses from reopening UI. The user's map layers/listeners are preserved.
- All map CSS is prefixed with `.fly-ireland-scope` on owned panes/portal roots.
  Generic styles cannot match Windy menu entries.

Verification:
- `npm test` exercises forecast/map regressions plus session, CSS and cancellation.
- `npm run build` compiles the actual production bundle.
- `npm run test:browser:lifecycle` builds real Svelte components and Leaflet with
  simulated Windy store, broadcast and forecast responses, then uses Chromium.
  Seven lifecycle cycles cover desktop/mobile, native/sidebar close, duplicate
  calls, reopening, open overview portal, pending responses and final destruction.
  DOM listener/observer and store/broadcast/map/layer/pane counts return to baseline.
  A native menu link keeps its original colour while the plugin is open/closed.

Browser prerequisites: Python Playwright and Chromium (default
`/usr/lib/chromium/chromium`; override CHROMIUM_PATH). Leaflet is a test-only
npm devDependency. Fixture screenshots/logs are local under `.tmp/lifecycle`.

Limit: this is not an authenticated live-Windy smoke test. After installing the
fixed release, fully refresh Windy so old globally injected styles are unloaded,
then repeat open/close/reopen on desktop and mobile before requesting re-review.
Release candidate: 1.1.81. User subsequently authorized publication.
