# Thermal forecast input audit

The selected model's existing point request includes header, celestial,
meteogram and sounding. Temperature, dew point, horizontal wind and cloud profiles
are documented. Installed Windy SDK declarations and flyXC node-forecast-v3
DataHash2/MeteogramDataHash2/SoundingDataHash2 do not define a surface sensible
heat-flux or mixing-layer-depth series usable by this plugin. The solarpower map
layer exists but is not a documented heat-flux series in the point response.

This is not proof that models or private Windy services lack those fields.
No authenticated live Windy session is available in this workspace. No guessed
field names, substituted models, external forecasts, or cloud/solar heuristics
are used as quantitative thermal forecasts.

A temporary diagnostic prototype inventoried bounded candidate field names,
without credentials or full payloads. It was removed before publication when the
user requested removal of all lift information. No live model response was verified.
Any future adapter must establish units, sign, instantaneous versus accumulated
values, time grid, model/run identity and height reference before use.

Final implementation: daily thermal output, sounding UI, parcel +3 K controls,
curves and parcel calculation in the forecast parser were removed at the user's
request. A single atmospheric day overview remains. No thermal-strength forecast
or conditional lift scenario is exposed in the published UI.
