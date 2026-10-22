# Fly Ireland

A Windy.com plugin for exploring paragliding sites across the island of Ireland. It brings site wind roses, location cards and forecast filters onto the map.

## Features

- 207 catalogue locations with site-specific direction ranges and Coastal / Inland classification.
- Small and large wind roses with forecast speed, incoming wind direction and weather symbols.
- A sidebar with wind, surface gusts, rain and cloud-base readings. Cloud-base heights identify ASL or AGL.
- Forecasts follow Windy's timeline, selected model and supported wind layer. Panning does not reload the catalogue forecasts.
- Region, site type and YouTube filters, with preferences saved in the browser.
- **Wind-matched** includes matching directions with mean wind up to 13 mph. Winds below 5 mph stay visible with a blue centre and **Too light** label.
- Gold gust icons when gusts are at least 10 mph and at least 5 mph above the mean; red icons when gusts reach 20 mph. Hover for values and the difference.
- mph, km/h, m/s and knots; site videos; map/card highlighting and smooth navigation.

Wind matching and gust icons are application criteria, not a flight-safety assessment. Forecasts do not establish site access, local restrictions or actual conditions at launch.

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

## Test and build

```sh
npm test
npm run build
```

The same build command works on Windows, macOS and Linux. It produces `dist/plugin.js`, `dist/plugin.min.js`, `dist/plugin.json` and package metadata. `npm run build:win` remains an alias.

GitHub Actions runs tests and builds on Windows and Ubuntu using Node 24. Browser appearance checks are performed locally during development; the automated suite uses controlled Windy boundaries and does not require an account or live forecast calls.

## Project layout

| Path | Contents |
| --- | --- |
| `src/` | Plugin, Svelte interface, catalogue and forecast helpers |
| `src/pluginConfig.ts` | Windy identity, version and route |
| `tests/` | Forecast, filtering, catalogue and runtime tests |
| `reports/` | Source and review records used by catalogue tests |
| `scripts/` | Cross-platform build and clean source export |
| `docs/` | Publication instructions |
| `.github/workflows/` | Test/build checks and optional manual Windy publication |

## Prepare a GitHub source copy

```sh
npm run package:github
```

This creates `release/Fly Ireland` with the source, tests, lockfile, documentation and GitHub workflows. Local dependencies, browser profiles, temporary files, old template examples and the original repository's `.git` history are excluded.

Use **fly-ireland** as the GitHub repository name and **Fly Ireland** as the project/folder display name. Repository links currently target `KamilYS2b7/fly-ireland`; update `package.json` and `src/pluginConfig.ts` if using a different owner.

See [publishing instructions in Polish](docs/PUBLISHING.pl.md) for creating a new GitHub repository from the source folder.

## Optional Windy publication

Publishing this source on GitHub does not publish it to Windy's gallery. The Windy configuration remains `private: true`. The **Publish Fly Ireland to Windy** workflow runs only when manually triggered and requires the repository secret `WINDY_API_KEY`.

See the [Windy Plugins Guide](https://docs.windy-plugins.com/) for the separate Windy publication process. Never put a Windy account token or API key in source files or issue screenshots.

## License and credits

The code uses the [ISC license](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md) for the original Windy template, forecast providers, site data and video attribution.
