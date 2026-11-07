# Windy Thermals layer: verified interface findings

The installed SDK maps the English label “Thermals” to `CCL` in
`types/lang-files.d.ts` (lines 1134–1136). `client/overlays.d.ts` declares the
numeric overlay `ccl`; `client/layers.d.ts` declares the corresponding layer.
`client/Color.d.ts` includes `cclAltitude`. These establish a CCL/altitude-oriented
map product, not a documented thermal-core speed series in m/s. They do not by
themselves establish its algorithm, AGL/ASL reference, component channel mapping,
or exact model coverage.

`client/interpolator.d.ts` exposes `getLatLonInterpolator()` for the current map
view. It may return null when no suitable renderer exists. The returned function
accepts coordinates and yields weather channel values, no-data/unsupported
sentinels or null; the channel semantics must be validated against the layer's
metric and picker before using a result. It does not accept an arbitrary model,
hour or layer, and does not return a daily time series. Switching global map state
to scrape hours would disturb the user's map and is not implemented.

The point sounding declarations contain no verified `ccl` or thermal-speed time
series. Consequently the existence of this map layer does not yet give the plugin
a quantitative daily thermal-speed forecast or the heat-budget inputs it needs.

Live documentation lookup at community.windy.com was blocked by the environment
HTTP proxy (CONNECT 403). No authenticated live renderer was available. Exact
units/reference, channel meaning, model coverage and the numerical readout remain
unverified. This report does not claim the map layer cannot be sampled; it records
the supported map-interpolator route and the remaining checks.
