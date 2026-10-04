# Warthog surface driving Easter egg

In surface view, enter **↑ ↑ ↓ ↓ ← → ← → B A** to load and drive [Warthog - Standard edition](https://sketchfab.com/3d-models/warthog-standard-edition-e2d23c845eb34df2a286915890bb621a), by [McCarthy3D](https://sketchfab.com/joshuawatt811), under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Enterprise remains the space free-flight Easter egg.

The source geometry, UVs and full texture resolution are retained. The source's presentation floor is hidden. The RGB tyre and interior materials use opaque depth writes instead of their erroneous exported BLEND flags; the windscreen retains its authored transparency and transmission. PNG images are repacked losslessly as WebP where smaller; decoded RGBA pixels are verified byte-for-byte. Textures remain separate local files, so no single Git blob exceeds the upload limit. The GLB loader, model and textures load only after the code. No Sketchfab account or third-party requests are required by visitors. The creator, model and license links appear in the driving legend. Rigging, animation and material corrections are modifications to the original asset.

- W/S: accelerate, brake, then reverse. A/D: steer, without strafing. Shift: boost. Space: handbrake, without changing simulation pause.
- Mouse: orbit a chase camera. Pinch/wheel: field of view. Escape: remove the vehicle and return to walking.
- Original tyre and hubcap subtrees rotate with travelled distance and measured tyre radius. Front wheels steer. Source suspension arms and springs articulate with independently sampled ground contacts; the chassis follows a damped terrain plane.
- Red rear braking glows and blue acceleration glows are located at measured source-model anchors.
- Vehicle and camera move in the body's rotating local frame. The camera fits the complete vehicle in landscape and portrait and maintains terrain clearance.
- Body changes, explicit coordinates, known-place jumps and leaving the surface remove the vehicle, abort unfinished downloads and release model/GPU resources. Each new session requires the code again.

## Ground contacts and performance

`surface-ground-sampler.js` queries the actual displayed vertices. Globe and DEM grids use the two triangles under the contact, rather than scanning millions of triangles per wheel per frame. Irregular authored bodies build a small angular spatial index when their geometry changes. Regional DEMs expose a grid query through `surface-topography.js`, including the rendered feathered borders. Wheel contacts and the camera thus use the same terrain as the rendered scene, instead of a separate analytic mountain profile.

`surface-vehicle-drive.js` integrates acceleration, braking and steering in small display-time substeps, transports the heading over the sphere and across poles, and fits independent wheel contacts to a terrain plane. Manual driving uses display time, just like walking, independently of simulation date and pause. `surface-vehicle-rig.js` animates existing model nodes, restores their original ownership on cleanup, and owns only its small procedural glow texture. `surface-vehicle-camera.js` follows and frames the vehicle. `surface-vehicle-easter-egg.js` scopes the Konami sequence, download and lifecycle to one surface session.

The displayed length is `clamp(radiusKm × 0.00001, 0.008, 0.12)` km: 63.71 m on Earth, 17.374 m on the Moon, and at least 8 m on small moons. Normal top speed is two displayed lengths per second, reverse is 40%, boost 2×. These are deliberately enlarged gameplay values, not scientific vehicle specifications.

Tests cover acceleration/braking/reverse, steering, wheel rotation, suspension, frame-rate independence, polar movement, exact mesh contacts on ellipsoidal and irregular bodies, chase-camera framing and clearance, lazy activation, stale-request cancellation, repeated unlocks, and resource disposal.

## Close-up rendering precision

`scene-depth.js` installs a shared logarithmic depth mapping before scene materials compile. One scene unit is 1/6 AU; the Earth vehicle is only about 2.56×10⁻⁹ units long. Three's original `log2(1+w)` rounds every close face to depth zero in GPU float arithmetic, so interior panels show through the hull and terrain flickers during movement. Scaling `w` by 10¹² before adding one, with the correspondingly scaled far-plane denominator, preserves depth ordering for both the vehicle and surrounding terrain. All materials using the logarithmic-depth chunks share this mapping; orthographic depth remains unchanged.

The windscreen's transmission shader also uses camera-relative view-space positions. Subtracting float world positions at planetary orbital coordinates otherwise rounds camera and glass to the same point, producing an undefined view direction and invalid colours that bloom can spread across the screen. View-space refraction preserves the original thin glass without this cancellation. Regression tests reproduce both float failures and check the real GLB material settings, small-body vehicle scales and far-plane depth ordering.
