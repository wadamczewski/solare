// Real total, partial and penumbral lunar eclipses, exactly as
// solar-eclipses.js does for the Sun. The kind, the instant of greatest
// eclipse and the umbral/partial/penumbral durations are as tabulated in
// NASA's Eclipse Website (F. Espenak's catalogue), mirrored with the same
// figures on each event's Wikipedia page. As with the solar scenario, they
// are supplied for comparison; the shadow the viewer actually sees comes
// independently from the real planetary ephemeris and lunar theory this
// project already carries, evaluated at whatever date the scenario lands
// on - here Earth is simply another occluder candidate for the Moon's own
// eclipseShadow (extended-solar-shadow.js), exactly as it already is for a
// planet's own ring shadow.
const eclipse=(id,name,kind,greatest,durations)=>({id,name,kind,greatest,...durations});

export const LUNAR_ECLIPSES=[
 eclipse('lunar-2022-11-08','Całkowite zaćmienie Księżyca','total','2022-11-08T10:59:08Z',
  {totalitySeconds:5098,partialSeconds:10850,penumbralSeconds:21231}),
 eclipse('lunar-2025-03-14','Całkowite zaćmienie Księżyca','total','2025-03-14T06:58:47Z',
  {totalitySeconds:3964,partialSeconds:13136,penumbralSeconds:21802}),
 eclipse('lunar-2025-09-07','Całkowite zaćmienie Księżyca','total','2025-09-07T18:11:43Z',
  {totalitySeconds:4926,partialSeconds:12564,penumbralSeconds:19600}),
 eclipse('lunar-2026-03-03','Całkowite zaćmienie Księżyca','total','2026-03-03T11:33:37Z',
  {totalitySeconds:3499,partialSeconds:12430,penumbralSeconds:20317}),
 eclipse('lunar-2026-08-28','Częściowe zaćmienie Księżyca','partial','2026-08-28T04:12:55Z',
  {partialSeconds:11928,penumbralSeconds:20311}),
 eclipse('lunar-2027-02-20','Półcieniowe zaćmienie Księżyca','penumbral','2027-02-20T23:12:51Z',
  {penumbralSeconds:14459}),
 eclipse('lunar-2028-12-31','Całkowite zaćmienie Księżyca','total','2028-12-31T16:51:58Z',
  {totalitySeconds:4280,partialSeconds:12529,penumbralSeconds:20173})
];

// A practical head start before greatest eclipse - half the (sourced)
// penumbral duration, since the Moon crosses the shadow at close to
// constant speed near mid-eclipse, so this approximates true first contact
// well enough to open the scenario already inside the penumbra, before
// anything is yet visible.
export function lunarEclipseLeadMinutes(item){return item.penumbralSeconds/2/60;}
