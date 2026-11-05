# Thermal updraft availability in the plugin interfaces

Reviewed the installed @windycom/plugin-devtools declarations and the more recent
Windy node-forecast-v3 declarations bundled in vicb/flyxc (7925ba9), including
DataHash2, MeteogramDataHash2, AirgramDataHash2, SoundingDataHash2 and the fetch
request used by flyXC Soundings. Sounding exposes temperature, dew point/RH,
geopotential height, horizontal wind speed/direction and cloud fields on pressure
levels. No documented thermal-updraft / w-star field in m/s was found in these
interfaces. Omega or grid-scale vertical velocity would not by itself establish
thermal-core ascent or a paraglider climb rate.

This is an interface audit, not a claim that ECMWF/GFS/ICON/UKV never produce any
vertical-motion diagnostics. No authenticated live Windy sounding payload was
available in this environment. In particular the existence of Windy's Thermals UI
is not evidence that its values are included in getPointForecastData(sounding:true).
We do not invent parameter names or scrape layer colours as quantitative updraft.

Fallback: an explicitly experimental entraining dry-parcel scenario model, using
available sounding temperature/dew point/pressure/heights. No extra network requests.
It must show its own source, assumptions, scenario envelope and condensation/data
limits, and must not replace any official model field or existing LCL/wind criteria.
