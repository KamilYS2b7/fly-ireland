# Cloud base and parcel LCL

These are separate diagnostics, both in metres. Neither changes wind matching.

* **Cloud base** reads Windy's documented `data.cbase` time series (or legacy `meteogram.cloudBase`) using the
  existing AGL convention (above model ground), with time interpolation.
  Missing values remain missing. ASL conversion is shown only when the response
  explicitly supplies `header.modelElevation`; actual site elevation is never
  substituted for model terrain. Field interpretation still needs checking
  against live provider metadata for each supported model.
* **Estimated cumulus base (LCL)** uses near-surface `data.temperature` (legacy `data.temp`) and
  `meteogram.dewPoint` (or `data.dewPoint`) in kelvin and `data.pressure` as surface pressure in pascals.
  Each input is interpolated on its own timestamp grid without extrapolation, then LCL temperature
  is calculated using Bolton (1980), *The Computation of Equivalent Potential
  Temperature*, equation 22. Dry Poisson ascent gives LCL pressure; a dry
  adiabatic temperature lapse gives the approximate height above model ground.
  This is not a parcel launched from the actual hillside or a mixed-layer CCL.

The calculation uses `cp = 1004 J/(kg K)`, `Rd = 287.05 J/(kg K)` and
`g = 9.80665 m/s²`. It neglects virtual-temperature and moist heat-capacity
corrections. LCL height is an approximation, not an exact observed cloud base.
Saturated near-surface air gives a zero-height parcel LCL. Supersaturated,
missing, out-of-range or unsupported-unit inputs produce **No data**; the
plugin does not invent pressure or infer a dew point from missing fields.

Both forecast endpoints must be valid. No interpolation across missing data or
extrapolation beyond forecast times is allowed. Kelvin/Celsius or Pa/hPa units
are not guessed from ambiguous data. ASL is absent when model terrain is unknown.

The previous 50% cloud-cover profile crossing has been removed. Layer cloud
fraction is no longer presented as a calculated cloud base. LCL does not predict
whether a parcel will reach saturation, whether cumulus will form, or the base
of advected/stratiform clouds. CB and LCL may legitimately differ.

Mini rose labels use **CB** for the model parameter and **LCL** (with `~`) for
the parcel estimate. The side panel shows them separately with AGL/ASL labels.
