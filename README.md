# Fly Ireland

A Windy.com plugin for exploring paragliding sites across the island of Ireland. It brings site wind roses, location cards and forecast filters onto the map.

## Features

- 207 catalogue locations across the island of Ireland, including Northern Ireland.
- Forecasts cover every Irish site independently of the viewport. When the selected regional model is unavailable, the plugin selects an available model, preferring ECMWF.
- Small and large wind roses with forecast speed, incoming wind direction and weather symbols.
- A sidebar with wind, surface gusts, rain and cloud-base readings. Cloud-base heights identify ASL or AGL.
- Forecasts follow Windy's timeline, selected model and supported wind layer. Panning does not reload the catalogue forecasts.
- Irish region, site type, YouTube and **With site guide** filters, applied to both the map and sidebar, with preferences saved in the browser.
- **Wind-matched** includes matching directions with mean wind up to and including 15 mph. Winds below 5 mph stay visible with a blue centre and **Too light** label.
- Gold gust icons when gusts are at least 10 mph and at least 5 mph above the mean; red icons when gusts reach 20 mph. Hover for values and the difference.
- mph, km/h, m/s and knots; site videos; map/card highlighting and smooth navigation.
- Site guides for 36 Irish areas, available from 43 catalogue sites. The 30 original Irish guides include photos; six added IHPA regional guides cover another 13 source entries. Open **Site guide** on a card or the information button on a large rose.
- Take-off, landing, parking, access-gate and reference pictograms appear automatically beside visible large roses, following the map's filters and collision handling. They disappear when the associated roses become miniatures, including manually selected points, and return automatically when large roses reappear. Shared guides reuse their markers. **Show on map** focuses the guide's points; clicking a point centres it on the map. Open the description with the information button under its large rose or **Site guide** on its card. No additional Site points window covers the map.
- Each large rose has its own eye button beside its upper-right rim. It hides only that rose and its menu, keeping site-guide icons visible. The eye stays in the same position and size while hidden, so another click restores the rose without moving the pointer. Its tooltip identifies the site and current action. Individual choices are remembered across pan/zoom and reopening; miniature roses and forecast readings are unchanged. The former fixed global eye button is removed.

Guide descriptions load once when guide-enabled large roses are displayed or a guide is opened; photos load only inside an opened guide. Automatic guide layers do not pan the map or request forecasts, and cached guide markers remain attached during time updates and unchanged viewport membership. Grouped descriptions are shared by related slopes without replacing their forecast locations or wind limits. Lough Navar's five imported points are marked **Needs verification**; additional Great Sugar Loaf C/D markers are reference points. The imported descriptions do not provide last-verified dates for access or airspace notes.

The IHPA additions cover Mount Leinster, Croagh Patrick, Sky Road, Maumturks, Achill Island and Rossbeigh. Provenance is retained in the guide data without a source/date badge in the interface. Approximate launch areas and the Atlantic Drive reference point retain verification labels. Knockmore's duplicated source coordinates are not plotted. Keel Bay remains unassociated pending confirmation; Lower Cliffs, Keel West and Knockmore can be read within the Achill guide. No forecast sites or wind limits are added or changed by the guide import.

Wind matching and gust icons are application criteria, not a flight-safety assessment. Forecasts do not establish site access, local restrictions or actual conditions at launch.

## Catalogue availability

This release displays Ireland only. The Polish country option, map sites and cards are temporarily disabled. The underlying Polish data and review workflow remain in the source for later restoration; see [the preserved catalogue notes](docs/POLAND_CATALOGUE.md). Saved Polish filter settings fall back to Ireland without changing site-review files.

## Run locally

Install **Node.js 24 or newer**, then open a terminal in the **Fly Ireland** folder:

```sh
npm ci
npm start
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

1. Keep the development server running.
2. Open [https://localhost:9999/plugin.js](https://localhost:9999/plugin.js) and accept the local development certificate.
3. Open [Windy Developer Mode](https://www.windy.com/developer-mode).
4. Enter `https://localhost:9999/plugin.js` and click **Install & open plugin**.

When replacing the former template plugin, install the developer URL again so Windy registers the new identity `windy-plugin-fly-ireland`. Existing Fly Ireland filter and unit preferences keep their browser-storage keys.

The plugin route is `/plugin/fly-ireland`. A locally installed developer plugin still requires the local server to run.

Keep `desktopUI: 'embedded'` and `mobileUI: 'small'` in `src/pluginConfig.ts`. The sidebar mounts beside the map and its empty native Windy container is hidden. Mobile `fullscreen` opens an unnecessary full-screen sheet; `embedded` is not a supported mobile layout in Windy's client. The sidebar's minus button collapses the list while keeping the map overlay active.

## Test and build

```sh
npm test
npm run build
```

The same build command works on Windows, macOS and Linux. It produces `dist/plugin.js`, `dist/plugin.min.js`, `dist/plugin.json`, the gallery preview `dist/screenshot.png` and package metadata. `npm run build:win` remains an alias.

GitHub Actions runs tests and builds on Windows and Ubuntu using Node 24. Browser appearance checks are performed locally during development; the automated suite uses controlled Windy boundaries and does not require an account or live forecast calls.

## Project layout

| Path | Contents |
| --- | --- |
| `src/` | Plugin, Svelte interface, catalogue and forecast helpers |
| `assets/assets/site_descriptions.json` | Imported English site guides and auxiliary coordinates |
| `assets/assets/sites/` | Guide photos, copied to `dist/assets/sites/` during build |
| `src/pluginConfig.ts` | Windy identity, version and route |
| `src/screenshot.png` | Fly Ireland gallery preview, copied automatically into the build |
| `tests/` | Forecast, filtering, catalogue and runtime tests |
| `reports/` | Source and review records used by catalogue tests |
| `scripts/` | Cross-platform build and clean source export |
| `docs/` | Publication instructions |
| `.github/workflows/` | Test/build checks and optional manual Windy publication |

## Prepare a GitHub source copy

```sh
npm run package:github
```

This creates `release/Fly Ireland` with the source, tests, lockfile, documentation and GitHub workflows. Local dependencies, browser profiles, temporary files, local workspace audit reports, old template examples and the original repository's `.git` history are excluded.

The export includes the guide JSON and its referenced photos. Keep the `assets` folder when uploading sources: both production builds and the local developer server copy these files into `dist/assets/`. Published guide URLs resolve beside the installed plugin version.

Use **fly-ireland** as the GitHub repository name and **Fly Ireland** as the project/folder display name. Repository links currently target `KamilYS2b7/fly-ireland`; update `package.json` and `src/pluginConfig.ts` if using a different owner.

See [publishing instructions in Polish](docs/PUBLISHING.pl.md) for creating a new GitHub repository from the source folder.

## Optional Windy publication

Publishing this source on GitHub does not publish it to Windy's gallery. The Windy configuration remains `private: true`. The **Publish Fly Ireland to Windy** workflow runs only when manually triggered and requires the repository secret `WINDY_API_KEY`.

See the [Windy Plugins Guide](https://docs.windy-plugins.com/) for the separate Windy publication process. Never put a Windy account token or API key in source files or issue screenshots.

## License and credits

The code uses the [ISC license](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for the original Windy template, forecast providers, site data and video attribution.
