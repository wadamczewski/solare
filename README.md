# solare°

A full-screen WebGL sandbox with mutually interacting N-body gravity. The logo, complete reset, and the bottom time / light-flight bar remain available at all times.

## Getting started

Node 20.17+; run `npm ci`, then `npm run dev`. `npm run build` creates `dist`, and `npm test` checks the integrator and system behaviour.

## Current capabilities

- **Central-star selection:** alongside the Sun, Sirius A, Vega, Betelgeuse, R136a1, and WOH G64 are available. Selecting one updates the mass used by gravity, radius, colour temperature, luminosity, and body temperature readings. Planet positions are preserved and heliocentric velocities are rescaled for the new stellar mass so the change does not artificially eject the system.
- **Collision scenarios:** the simulation panel offers ten staged courses, including 1P/Halley → Earth, Theia → Earth, and Shoemaker–Levy 9 → Jupiter, plus a custom course between any catalogue projectile and an existing body. The approach is staged over 32 simulated days, or roughly 16 seconds at 2 days/s.
- **Lighting and occultation:** the Sun is treated as an extended source. Shadows have a soft umbra and penumbra; the same model applies to the rings of Saturn and Uranus. This is a geometric shader approximation, not global ray tracing.
- **Scene performance:** ordinary bodies use three geometry-detail levels based on projected screen size. Detailed geometry remains in use for comets, irregular objects, and persistent collision damage. Osculating orbit paths are refreshed every frame at high simulation speeds.
- **Sky map:** search finds simulated bodies, constellations, and deep-sky objects. Choosing a result enables the appropriate sky layer and centres the camera on it. Sky overlays respond to pointer hover.

## Controls

- Left drag rotates; Shift + left drag pans; wheel / pinch zooms towards the pointer.
- Free flight: W/S move forward and backward, A/D strafe, Q/E move down and up, and Shift provides 4× speed. Right click or starting keyboard movement captures the pointer like a game; the mouse controls the view and Escape releases it.
- Click a body to open a WebGL preview next to its name and edit its mass, radius, velocity, position, rotation period, and axial tilt.
- Double-click a body to follow it. Bodies can also be selected from the panel below the logo.
- Click empty space to create a comet, black hole, or planet. The chosen point is on the ecliptic plane; its Y coordinate can then be changed in the form.
- The panel below the logo contains time and navigation tools, body search and selection (case- and Polish-diacritic-insensitive), the true-scale toggle, and central-star selection.
- The simulation date and time (UTC) appears above the bottom bar in `Date - Time` format. It begins when the page loads and advances with simulated time.
- Space pauses; N adds a body; T opens the simulation panel; R / Reset restores the initial system, settings, and camera; Escape closes a panel or releases the pointer.
- “Swap orbit” moves a planet’s moons with its position and velocity.

## Surface view

The button below the sky toggles places the camera on the surface of the selected body. The sky uses catalogue stars, ephemeris planets, the Moon’s dedicated theory, and a horizon derived from the body’s measured pole and prime meridian.

`src/surface-frame.js` uses rotational elements from the IAU WGCCRE report (Archinal et al., 2018), including lunar libration terms. Regression of the lunar node moves the pole around a 1.54° circle. Earth is exceptional: the tabulated prime-meridian constant differs from sidereal time by one fifth of a degree, or about fifty seconds of clock time, so the app uses GMST and precesses the horizon from the equator of date to J2000.

Validation against astronomy-engine, itself checked against JPL Horizons, gives agreement to 9 arcseconds across 150 fixed-star comparisons from five locations, five dates, and four decades; the zenith itself agrees with the observer vector to 0.1 arcminutes. Tabulated rotation rates reproduce sidereal days: 23h56m for Earth, 24h37m for Mars, 9h55m for Jupiter, and 243 retrograde days for Venus.

A synchronously rotating satellite has no independent rotation to tabulate: its pole is the orbital normal and its prime meridian faces its host. Jupiter therefore hangs at Europa’s zenith regardless of the orbital phase produced by the simulation. Measured angular sizes agree with real values: Jupiter from Europa is 12°, from Io 19.2°, Saturn from Titan 5.5°, Mars from Phobos 42.4°, Earth from the Moon 1.9°, and the Sun from Earth 32.1′.

Surface view forces true scale. An enlarged radius would put the observer tens of thousands of kilometres above the surface and make nearby parallax false. Hyperion is excluded because its chaotic tumble has no stable side on which to stand.

Ground shading is driven by real slope rather than Three.js’s screen-space approximation. The latter compares heights between adjacent screen pixels and becomes flat when one height-map texel, measured over thousands of kilometres, spans less than one pixel—the normal situation when standing on a surface. Mars and the Moon use normal maps generated offline from MOLA and LOLA elevation data (`tools/build-surface-normals.mjs`). Other bodies, including Earth where no dedicated height map is available, use the same method on procedural relief. A second, finer rock-and-sand grain layer is tiled hundreds of times and blended from three projections to avoid polar seams, so the nearby ground does not look like a blurred enlargement of the global texture.

Surface view has a **Known places** section (`src/surface-places.js`) containing real named locations—Olympus Mons, Tycho crater, Kraken Mare, and others—from official IAU nomenclature. Selecting one teleports the observer to that point on the same body instead of latitude/longitude zero. The section belongs to the surface-view panel, rather than the general body-details panel, because it applies to the body currently being stood on. From the surface, Solar System bodies already followed by the radar, and deep-sky objects when their existing toggle is enabled, receive a named outline at their actual rendered sky position (`src/sky-labels.js`), not merely a radar or list entry.

Selecting a known place also looks down toward the terrain rather than searching the sky. The camera pitches 18° below the horizon, leaving a strip of open sky above it. On Earth, this manual choice overrides device location: browser geolocation (`navigator.geolocation.watchPosition`) keeps running, but a clicked known place or latitude/longitude slider will not be overwritten by the next device reading. The panel distinguishes **Selected location** for manual coordinates from **Device location** only when the position comes from a current GPS/network reading. Changing the body restarts this decision and trusts the device again.

Any body-details panel that has known places also has a **Landmarks** toggle, off by default. When enabled it marks those places in the rotating body preview at their actual positions, so the user can see where notable terrain lies without entering surface view. The marker uses the same equirectangular calibration as surface orientation (`src/surface-texture-frame.js`, `localSurfacePoint`), so it rotates with the body as a child of the same mesh. The same marker set is rendered on the real body in the main scene. Hovering shows a location label; clicking enters surface view at that place while looking toward the ground, just as if the entry had been clicked in the Known places list.

The screen-corner radar (`src/surface-radar.js`) is a separate small Three.js scene: a sphere rather than a flat ring, so it shows the complete 3D direction of every tracked object—both azimuth and altitude above the horizon. The dome itself does not rotate because it is axis-symmetric; only its markers rotate, recomputed each update from the current viewing direction by the pure functions in `src/surface-compass.js` (`relativeBearing`, `sphericalToRadar`). Bodies below the horizon remain visible, dimmed through the translucent dome, so it is immediately clear whether turning around is worthwhile.

Named outline labels for deep-sky objects accompany the points on the sky dome (`src/sky.js`) everywhere they are drawn, not only in surface view: free orbital view, star-system presets, light flight, and black-hole infall. They are present whenever the **Deep-sky objects** toggle is enabled. Only surface view limits labels to objects above the horizon, because there the ground really does hide the rest of the sky; elsewhere only the current camera view matters.

These labels are DOM overlays rather than WebGL geometry. Unlike the scene, which renders every frame, they are normally redrawn only every sixth frame while the camera is stationary. Camera orientation is now checked for a meaningful change using the quaternion dot product (`quaternionChanged` in `src/sky-labels.js`), and a changed orientation updates labels immediately. The six-frame cadence is retained only as a fallback while the camera is still, for example when the surface-view horizon moves with simulated time.

## Model and limits of accuracy

Physics uses AU, solar masses, and days, independently of visual planet enlargement. All 32 default bodies (the Sun, eight planets, and 23 selected moons) and added objects mutually interact through Newtonian gravity. The integrator is velocity Verlet, with a step limited by dynamical time and close approaches. At physical radii, collisions distinguish merging, fragment ejection, disruptive impact, grazing collision, and absorption. Mass and linear momentum are conserved. The initial system is barycentric, and planet parameters use JPL tables.

Changing the central star does not recreate that star’s actual independent planetary system. It retains current planet positions and adjusts only their velocities to the selected mass, so it is an N-body dynamics experiment rather than an exoplanet catalogue.

## Current planetary positions

At load time and after Reset, planets are placed where they are at that moment. `src/ephemeris.js` evaluates the JPL approximate-position table of Keplerian elements and their secular rates for 1800–2050 from [JPL Solar System Dynamics](https://ssd.jpl.nasa.gov/planets/approx_pos.html). Kepler’s equation is solved with Newton iteration, and velocity comes from the mean motion implied by the tabulated mean-longitude rate, so position and velocity are mutually consistent.

Comparison with an independent VSOP87-based library at the same instant gives differences from a few to a few dozen arcseconds for the inner planets and up to about 9 arcminutes for Saturn, matching JPL’s stated accuracy for this approximation. This is not a full DE440-class ephemeris. Elements lose validity outside 1800–2050. The clock is treated as UTC.

## The Moon

The Moon is the only satellite with a real theory of motion. `src/lunar-theory.js` calculates its position from a shortened ELP-2000/82 series in Meeus’s *Astronomical Algorithms* (chapter 47, tables 47.A and 47.B): 60 periodic terms for longitude and distance and 60 for latitude. Meeus gives approximately 10″ longitude and 4″ latitude accuracy, or 20 and 8 km.

Two corrections, unnecessary for the rest of the application, are required here because at half a degree of angular speed per hour they exceed the error of the series itself: reduction from the mean equator of date to J2000 (chapter 21; 0.36° or 1,400 km by 2026), and the difference between dynamical time and UTC (about 69 s today, or 38″).

Check: Meeus example 47.a is reproduced to the last published digit (λ = 133.162655°, β = −3.229126°, Δ = 368409.7 km). Against an independent implementation validated against JPL ephemerides, the largest discrepancy across 120 samples from 1900–2050 is 16″, or 31 km. The synodic month emerges from the series itself as 29.5306 days even though that value is never entered explicitly.

This places Earth where it is rather than at the Earth–Moon barycentre: JPL’s tables are fitted to the barycentre, and knowledge of the Moon’s position lets the pair be separated and Earth shifted by the appropriate 4,671 km. This removes about 19% of Earth’s average positional error; the remainder is the error of the JPL approximation itself.

Other moons still have no theory of motion. Their initial phases are composed, and they accompany planets at their real positions. The clock above the bottom bar shows the simulation instant; it is hidden during light flight because gravitational integration is paused then.

This is not a complete simulation of every real physical condition. It has no general relativity, tides, thermal evolution, deformation, torques, full axial dynamics, or relativistic perturbations. A black hole is a point mass with its Schwarzschild radius as the absorption boundary; its ring is illustrative, not an accretion or lensing model. Rotation orientations have fixed periods and tilts and do not evolve from torques. Accuracy is limited for extremely large masses.

The simulation does not include every known moon. Planet maps and Earth’s Moon map are astronomical surface/atmosphere maps; fourteen other moons have their own USGS mission mosaics and approximate colour profiles, while irregular satellites use approximate geometry. Titan has an opaque-atmosphere model. Unimplemented maps for other satellites are explicitly marked. The asteroid belt and comet tails are decorative particles without mutual gravity. A comet tail points away from the Sun but does not simulate gas physics.

The scene keeps the ecliptic in the XZ plane and the ecliptic pole on +Y. The conversion is a rotation rather than a reflection: the third coordinate changes sign. Merely swapping two axes would be an odd permutation and therefore a mirror—planets would orbit clockwise when viewed from the ecliptic north pole and every constellation would be mirrored. A cross-product preservation test protects this sign.

**Readable** view enlarges radii and nonlinearly shortens distances. **True scale** restores spatial and radial proportions. Thin orbits are instantaneous two-body osculating solutions updated from current states; trails show the actual simulation path. The **Orbits** switch in the Simulation panel can hide them entirely when they obstruct the bodies and trails; they are visible by default. During very close encounters and high time rates, the frame budget slows simulation progress rather than increasing the step and destabilising the system.

WebGL uses the high-performance preference, dynamic buffers for positions, sizes, colours, brightnesses, and point parameters, a device-pixel-ratio cap of 2, and local textures. The limit is 100 bodies. There is no Canvas 2D, runtime remote request, or data server.

## Validation

Tests cover conservation of momentum and energy, orbital stability over a year, moon binding, response to motion of the Sun, Galilean invariance, collisions, and step adaptation. Ephemerides have their own suite: orbital periods reproduced from tabulated rates, reversibility of Kepler’s equation, velocity agreement with finite differences of positions, orbital direction and speed against the vis-viva formula, and the Sun’s ecliptic longitude on a known date. The sky map is checked at the data level: equinox point and poles, unit direction vectors, catalogue brightness range from Sirius to magnitude 14, Milky Way concentration around the Galactic centre, and presence and position of key deep-sky objects. Comet tests check nucleus mesh density, bilobed shape, repeatability for a seed, and activity monotonicity with solar distance. Scenario tests use a fixed epoch so actual planet positions cannot make the outcome depend on launch day. The production build is checked. The `npm test` suite does not run automated browser tests. Optional WebMCP (read and pause) detects browser support; no available context exists for WebMCP validation.

## Sources

Parameters: https://ssd.jpl.nasa.gov/planets/phys_par.html and https://ssd.jpl.nasa.gov/astro_par.html.
Textures: Solar System Scope / INOVE, CC BY 4.0. Details and links are in `public/credits.txt`, also available at `/credits.txt`.

## Extended collision model

`src/collisions.js` compares relative kinetic energy with approximate gravitational binding energy and includes impact angle and escape velocity. It is an original heuristic inspired by the regime distinctions described by Leinhardt and Stewart, not an implementation of their calibrated laws: https://arxiv.org/abs/1106.6084.

Slow collisions merge bodies. Energetic rocky impacts create up to six massive fragments in symmetric pairs. Grazing impacts can separate the bodies while dissipating part of normal relative motion. Gas bodies use a simplified accretion model; a black hole always remains the absorbing object and its horizon grows with mass. The 100-body limit constrains fragment count while retaining unresolved mass in the remnant.

Fragments take part in full N-body gravity and can collide again with other bodies. Flash and dust are short-lived WebGL visuals, not added mass. Collision checks run before integration and after every substep; their tempo stops with pause. The model conserves mass and linear momentum, but does not reproduce hydrodynamics, craters, phase changes, chemistry, or a complete angular-momentum and internal-energy budget. The preview rotates a body at a slow presentation rate independent of time acceleration and shows its shape, texture, rings, and axial tilt.

## Reset and speed of light

Reset / R restores the complete initial system and settings. The crosshair below the logo resets the view only.

The fixed bottom bar provides pause, speed, and light flight. During the flight, speed can change between 1×, 10×, 60×, 300×, and 1000× without jumps in covered distance. The multiplier accelerates the demonstration clock; light still travels 1 AU in 499.004783836 s. The clock includes time between frames and hidden-tab time but excludes pauses.

For the demonstration, visible planets are lined up at nominal distances from the Sun. Their sizes are enlarged and the camera travels on a parallel line slightly above them, looking back at the Sun. The counter’s distance is distance along the flight axis from solar level. This is not a physical realignment of planets: actual positions, velocities, and N-body state remain untouched, and gravity integration pauses during the demonstration. Moons are shown with their planets; orbits and trails are hidden. Rotation is presented using flight time.

The panel gives travelled distance in AU and millions of kilometres, travel time, the next body, remaining distance, flight time, and viewing time at the current acceleration. The stage bar highlights passed planets and the next one. Labels beside the nearest visible planets help orient the scene.

Ending the flight, Escape, starting an edit, or adding a body restores the preceding view and system. Reset also restores the whole initial state. This is a propagation-in-vacuum demonstration and does not model the relativistic image seen by an observer. Constants: https://ssd.jpl.nasa.gov/astro_par.html.

## Flight framing and scale

The default flight uses a smooth camera approach for every planet. Near a flyby, the camera is about three rendered-body radii away at a 75° field of view, producing a disc about 45–50% of frame height on the left side. The look direction smoothly includes the Sun and planet to expose its lit portion. This is demonstrative camera motion; the counter still describes light propagation along the route rather than the length of the deflected camera path.

The **True sizes and distances** switch disables approach and body enlargement: radii are converted from kilometres to the same AU scale as positions, including the Sun and moons. Planet distances in both modes use nominal orbital semimajor axes. Planet alignment remains demonstrative; leaving flight restores the correct system. At true scale, planets are not forced to occupy one fifth of the screen.

The right vertical axis shows stages. Every span between neighbouring planets fills linearly by travelled distance. Label spacing is even for readability, so the full axis is a stage scale rather than a uniform AU scale. The bright solar corona is an additive WebGL effect using a logarithmic depth buffer, and its glow size depends on the selected scale.

Bottom panels have 26% opacity without blurring the scene. The flight camera is shifted sideways in the XZ plane so a planet enters from the left edge at mid-height instead of from beneath the bottom panel.

Clicking a planet name on the right axis, or pressing Enter / Space while it has focus, jumps flight to that planet’s demonstration distance. Time is recomputed as distance / c; readings, camera, and progress update together. Speed, pause, and scale mode are retained. Jumps can go in either direction.

Flight uses real radii and distances by default. Close framing works in both scale modes. Base camera distance is calibrated for Earth, at about 30% of image height. For large planets, the minimum safe distance grows with radius while preserving a larger disc in frame. Camera position changes, not object sizes, so the shots are not comparisons of all planets from an identical observer distance.

Destruction effects use 1,024 soft WebGL particles and 32 instanced glowing fragments per event, with a limit of eight simultaneous events. A black hole absorbs an object touching its physical horizon and retains its mass in the remnant; the visual vortex follows the black hole’s position. Other collisions create flash, cloud, and cooling fragments according to the selected physical outcome. The luminous shell illustrates ejecta, not a sound wave in vacuum. Geometry and light effects are removed after 3.5–7 seconds, pause with the simulation, and are cleared by Reset. Collisions are detected using physical radii regardless of view enlargement.

## Correct real-time rate

The previous truncation of the backlog to 0.5 day and the fixed 180-microstep-per-frame limit were removed. The clock adds the full `frame_time × days_per_second`; unfinished work stays in the queue instead of disappearing. `window.solare.getState().pendingDays` exposes any backlog. Pause stops work without clearing the queue, hidden tabs add no new days, and restart clears the queue.

The fast integrator separates dominant bound-moon motion—an analytical Kepler step—from remaining N-body accelerations, which use numerical velocity steps. Every body contributes to force calculation, while tidal acceleration differences limit the step. The maximum is 0.25 day. Close contacts, paths crossing a collision region, and unbound or strongly eccentric moons use the direct integrator with a smaller step. This is an approximate hierarchical integrator, not a full ephemeris model. Conservation of mass and momentum in collision resolution remains unchanged.

A test of 60 successive 1/60-s time chunks at 365 days/s reproduces 365 days, about 0.998 of Earth’s orbit, and preserves binding of all included moons. A separate test compares Earth’s position with the direct integrator. On an overloaded device or during extreme collisions, rendering may temporarily lag behind requested time; the delay is preserved and caught up rather than silently discarded.

## Body catalogue and creation

The **Add body** form fills mass in kg and radius in km from the selected template. Both enter physics: mass controls attraction, while radius controls contact and true-scale size. Diameter and mass relative to the Sun update live. Readable view still deliberately rescales sizes. Weight depends on local gravity, so mass is the body parameter.

The catalogue includes Solar System planets, an example comet, the default supermassive black hole (one million solar masses), Sagittarius A*, M87*, Cygnus X-1, Proxima Centauri b, TRAPPIST-1 e, 51 Pegasi b, and 55 Cancri e. These are copies inserted into the local simulation; their host stars and real positions in the Galaxy are not imported.

A black hole’s radius is derived from mass as the Schwarzschild radius, including during editing and absorption. It is not an independent field. This is a non-rotating-black-hole model; the engine remains Newtonian and does not simulate full general relativity. Cygnus X-1 is a stellar-mass black hole, not a supermassive one.

Catalogue values were checked on 7 September 2026. Sources and notes are also available directly in the form and in `src/catalog.js`:

- [Sagittarius A*, NASA](https://science.nasa.gov/universe/black-holes/): about 4 million solar masses.
- [M87*, NASA/JPL](https://www.jpl.nasa.gov/edu/resources/teachable-moment/how-scientists-captured-the-first-image-of-a-black-hole/): about 6.5 billion solar masses.
- [Cygnus X-1, NASA](https://www.nasa.gov/universe/nasas-ixpe-reveals-shape-orientation-of-hot-matter-around-black-hole/): about 21 solar masses.
- [Proxima Centauri b](https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/): 1.055 Earth masses; estimated radius 1.02 Earth radii.
- [TRAPPIST-1 e](https://science.nasa.gov/exoplanet-catalog/trappist-1-e/): 0.692 Earth masses and 0.92 Earth radii.
- [51 Pegasi b](https://science.nasa.gov/exoplanet-catalog/51-pegasi-b/): 0.61 Jupiter masses; estimated radius 1.26 Jupiter radii.
- [55 Cancri e](https://science.nasa.gov/exoplanet-catalog/55-cancri-e/): 7.99 Earth masses and 1.875 Earth radii.

Values are approximate and omit uncertainty ranges; the app uses NASA parameter tables. Conversions use the mean Earth/Jupiter radii used by the application. Exoplanet textures are illustrative tinted textures of analogous bodies, not maps of their surfaces. Unknown rotation periods and axes receive explicit assumptions of 24 h / 0°. Settings can then be edited.

Collisions depend on view scale: true scale uses physical surfaces, while readable view uses visible spheres, including separate moon mapping. A segment test between consecutive steps reduces tunnelling of fast objects. Camera and zoom do not change the collision boundary; glows and rings are not collision surfaces. Readable view omits a grazing-contact model, because physical separation would not separate visually enlarged bodies. Mass, momentum, and gravity remain in physical units; collisions in this mode are a deliberate visual simplification.

Navigation uses W/S forward/back, A/D sideways, and Q/E down/up relative to the camera. Right mouse or starting key movement activates Pointer Lock: the mouse rotates the camera without stopping at the edge of the screen, and Escape releases the pointer. Shift provides 4× speed. Left drag keeps orbiting, Shift + left drag pans, and the wheel zooms. Movement slows near surfaces and adapts to scale. It detaches body following; editing forms and automatic flight block navigation. Losing focus, releasing a key, and Reset stop motion. Tool shortcuts were moved to N (new body) and T (simulation) so A/S remain available for navigation.

Reset fix: the initial system has 32 bodies. Readable moon orbits have larger radial spacing, and the segment-intersection test is not used for moons with the same host—the chord of a step does not describe their curved orbit. Their contacts are still checked at end positions. Fragment collisions conserve mass and momentum by merging rather than recursively creating more generations. A regression test covers the first 10 days after reset. In long simulations, enlarged bodies can still genuinely touch in readable view.

Collision outcomes: after a merger, remnant velocity comes from both bodies’ total momentum and mass. Grazing rocky bodies change the normal velocity component of both participants even in readable view; a separating pair receives no repeated impulse. Fragment ejection is oriented along the impact axis while preserving total mass and momentum. A rocky remnant has persistent deformation and a darkened, heated impact area; grazing leaves a smaller mark, disruption a deeper deformation, and gas accretion changes colour without a rocky crater. The altered mesh is shared with the editor preview. This is an approximate event model, not hydrodynamics, crust-material modelling, or a full thermal simulation.

The Simulation panel has a direct **Custom black hole** button. It opens a form with a default mass of 10 M☉, editable in kg or solar masses (the fields stay synchronised), plus XYZ position and speed, direction, and elevation. Horizon radius is recalculated live. The custom variant is also available in the body-type list beside ready catalogue objects. The model remains non-rotating and does not offer fake charge or relativistic-spin controls.

Comet-impact readability: the rocky impact mark now has a crater bowl, raised rim, and ejecta band rather than only a blurred darkening. Size and depth have visual minimums so the mark remains recognisable on a planetary mesh; they are not predictions of real crater dimensions. Further impacts retain earlier deformation. The editor’s **Show impact site** button positions the camera above the latest mark using the body’s rotation.

Colour audit and sources for all eight planets and the Sun: [COLOR-AUDIT.md](COLOR-AUDIT.md). Warm light, blue fill, and an orange Sun illustration were removed; the scene and previews use neutral exposure. Natural tints for Venus, Uranus, and Neptune are approximate rather than scientifically calibrated. The document explicitly records limitations of textures, exposure, and individual corrections.

Extreme Earth impacts have a separate surface-effects model. Reduced-mass energy with a relativistic kinetic-energy correction drives approximate effect intensity: a heated impact area, fires emitted over an approximate land mask inferred from the texture, and charring and dust that alter surface appearance. Animation uses simulated time, so pause stops it and high time rates evolve it quickly. Charring and dust remain after emissions fade. This is a visual heuristic without hydrodynamics, combustion chemistry, atmospheric dust transport, or a prediction of fire regions. The RGB land mask is approximate, and timings and ranges are not climate-model outputs. Dynamics remain Newtonian; the energy correction does not make them relativistic.

Example: a sphere 8 km in diameter, assumed density 500 kg/m³, and relative speed 0.1c has mass 1.34e14 kg and energy around 6.07e28 J. This is about 0.027% of Earth’s approximate gravitational binding energy, so a global surface catastrophe does not mean the globe is broken apart. At an 8 km radius, mass and energy are eight times greater. The form uses radius and independent mass: for this example set radius to 4 km and mass to 1.34e14 kg. Context sources: https://nas.nasa.gov/areas/atap.html and https://ntrs.nasa.gov/citations/19900035038. A 0.1c regime is beyond the calibration of typical asteroid-impact models.

Solar brightness: the scene renders to an HDR buffer, then bloom spreads light only from visible bright pixels. The photosphere has rendering luminance far above lit planets; final tone mapping produces a white saturated disc and glow. The flat billboard with an apparent corona was removed because it was not an exposure model. Depth-buffer occultation of the disc limits the glow source. HDR/bloom settings approximate exposure and optical scattering, not luminance in cd/m² or a model of the solar atmosphere. A monitor cannot reproduce the Sun’s real brightness. Source: https://science.nasa.gov/sun/facts/ — the corona is too faint relative to the photosphere to be normally visible without hiding the disc.

## Sky map

The background is no longer a random scatter of points. `src/sky.js` renders a celestial sphere from real catalogues prepared offline by `tools/build-sky.mjs`:

- 118,216 stars down to magnitude 14, with right ascension, declination, brightness, and B−V colour index. Star colour comes from B−V via Ballesteros’s 2012 temperature relation and a blackbody approximation. Size increases slowly with brightness; HDR luminance carries the rest, so the brightest stars bloom. The catalogue intentionally reaches far beyond the naked-eye limit of magnitude 6 in Earth’s atmosphere: air extinction and city light are absent in the space setting of this simulation, so an actual observer resolves progressively fainter stars rather than meeting a hard threshold.
- The Milky Way has two layers: a smooth luminance map rasterised from five survey isophote levels at the native working grid of 2880×1440, rather than the earlier decimation to 2048×1024, and a dense 500,000-point cloud on top, rather than the previous 110,000. The band is physically unresolved starlight, so the map carries its glow while points restore the grain of stars that can be resolved—many more of them in space without atmosphere between observer and band.
- 59 bright deep-sky objects: Andromeda, Triangulum, both Magellanic Clouds, Orion Nebula, Pleiades, Omega Centauri, 47 Tucanae, Whirlpool Galaxy, Ring Nebula, Crab Nebula, Sombrero Galaxy, and others. Their scale follows real angular extent and their surface brightness falls with size. The core is d3-celestial’s hand-curated “bright” list; 28 additional objects are the rest of the Messier catalogue selected for actual fame and widely known names, not brightness alone.
- Lines for 89 constellations, off by default through the **Constellations** switch in the Simulation panel. They are a human-made orientation overlay rather than physical objects, so they are not enabled automatically.

Coordinates are equatorial J2000 and are rotated to the scene’s ecliptic frame by 23.4392911°. The sphere is anchored to the camera, so the sky has no parallax during flight—correctly, because even the nearest star is about 268,000 AU away.

Limits: the catalogue ends at magnitude 14, so it contains about 118,000 stars rather than billions. Positions are quantised to about 20 arcseconds. Proper motion, parallax, and variable stars are not modelled, so the map is static at epoch J2000. Deep-sky objects are drawn as soft patches at their appropriate sizes, not as images. Star colours do not include interstellar reddening, surface gravity, or metallicity. Data comes from d3-celestial (BSD-3-Clause, Olaf Frohn), which packages Hipparcos/Tycho astrometry and Mellinger sky-survey isophotes; full attribution is in `public/credits.txt`.

## Background colour

The scene background is black. The earlier dark-navy tint resembled scattering in Earth’s atmosphere rather than the view from a spacecraft: vacuum does not glow, and sky-background glow is orders of magnitude below a display’s threshold. The change covers WebGL clear colour, the CSS background, and `theme-color`.

## Light-flight route scale

Markers on the right axis now sit at their real heliocentric distances rather than equal intervals: Uranus is at 63.8% of the axis (19.19 / 30.07 AU), Neptune at 100%. Fill and the progress head follow the same fraction of travelled distance, so progress reflects distance between bodies rather than the number of passed planets.

The four inner planets occupy the first 5% of the axis, so their markers remain at true positions; only labels are spread for readability and connected to their marker by a thin line. The bar is vertically constrained with `clamp()` and recomputed on resize, so it fits low and narrow windows.

## Comets

A nucleus is built from two merged lobes using multi-octave noise and several impact bowls, with 3,380 faces instead of the former 180 so facets are no longer visible. The shape follows what close spacecraft saw: 67P/Churyumov–Gerasimenko and 19P/Borrelly are bilobed, while 1P/Halley is an elongated body about 15 × 8 km.

A tail is no longer a single dust stream. The comet has two tails in different directions, as it does in reality:

- The **ion tail** is gas ionised by UV radiation and carried by the solar wind. It runs almost exactly away from the Sun, is narrow and filamentary with moving kinks, and its blue comes from CO+ emission near 420 nm.
- The **dust tail** consists of grains pushed by radiation pressure that retain orbital momentum from the moment of release. It therefore bends away from the antisolar line and opens into a fan; its warm white is reflected sunlight.

Grain trajectories use the classical syndyne construction: a grain released at time `tau` begins where the nucleus was at that time and is pushed away from the Sun by `1/2 · beta · g_Sun · tau²`. Because age and beta vary independently, grains fill a fan rather than a line. A coma glows around the nucleus. Activity depends on solar distance: water ice sublimes effectively inside about 3 AU, so farther out the comet is practically inactive and has no tail.

Limits: directions are physical, but tail lengths are stylised to remain readable in **Readable** view, which already compresses distances nonlinearly. The app does not model gas-production rate, grain-size distribution, photodissociation, solar-wind magnetic structure, or recoil that changes the comet orbit. Tail grains have no mass and do not take part in gravity.

## Languages and appearance — 8 September 2026

The flag switch next to Reset supports Polish, English, German, and Spanish. The first supported language in `navigator.languages` is selected automatically; no match means English. A manual choice is saved locally as `solare-language` and takes priority. Reset does not change the language. Translation covers controls, body labels, search, errors, catalogue descriptions, date, and flight data. Changing language does not recreate forms or physics state.

The [23-moon audit](MOON-APPEARANCE.md) contains references and limits for every object. The [planet audit](COLOR-AUDIT.md) distinguishes visible-light appearance from enhanced / false-colour maps. The project does not claim radiometric calibration or exact imagery for unknown surfaces. Exoplanets and unimplemented satellite maps do not inherit another body’s craters.

### Starting light flight inside the Sun

Below the Sun’s physical radius, the space scene is not rendered. A separate opaque shader depicts a bright local radiation field. Subtle brightness variation is an educational schematic, not a plasma photograph or hydrodynamic simulation. Its label identifies the core (0–0.25 R), radiative zone (0.25–0.7 R), convective zone (0.7–1 R), and thin photosphere. Temperature is an explicitly approximate interpolation from 15 million K through 7 million and 2 million to 5,772 K; stellar structure is not solved. Changing the Sun’s radius changes the interior boundary; the temperature profile remains the reference solar model.

A straight flight from centre to surface takes about 2.32 s at 1× in the demonstration. **It is not the time taken for energy to escape the Sun.** In reality, radiation scatters and diffuses through opaque plasma, while convection carries energy in outer layers. The explanation is visible during interior flight. After exiting, the existing vacuum clock continues: 1 AU / c = 499.0048 s from the centre; close planet framing remains demonstrative camera motion.

Sources: [NASA/Marshall, Solar Interior](https://solarscience.msfc.nasa.gov/interior.shtml), [ESA, Anatomy of the Sun](https://www.esa.int/ESA_Multimedia/Images/2020/01/Anatomy_of_the_Sun). The project does not assign a single exact energy-propagation time: sources give different approximations depending on transport model.

Node tests cover completeness of all four dictionaries, language changes and dynamic messages in an isolated DOM, preservation of form values and handlers, localised search, interior boundaries and pause/scrubbing, individual moon maps, and material ordering relative to collision marks. They are not GPU visual tests or monitor colourimetry validation.
