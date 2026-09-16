// Real total, annular and hybrid solar eclipses, so the "Zaćmienia" scenario
// opens on an actual date rather than a staged one - and can be checked
// against the record. The kind, the instant of greatest eclipse, the
// duration of totality/annularity there and the geographic point of
// greatest eclipse are as tabulated in NASA's Eclipse Website (F. Espenak's
// catalogue), mirrored with the same figures on each event's Wikipedia page.
// They are supplied for comparison and for choosing where to stand; the
// shadow the viewer actually sees comes independently from this project's
// own planetary ephemeris (ephemeris.js), lunar theory (lunar-theory.js) and
// the per-fragment eclipse shader (extended-solar-shadow.js), evaluated at
// whatever date the scenario lands on.
const eclipse=(id,name,kind,greatest,durationSeconds,location)=>({id,name,kind,greatest,durationSeconds,location});

export const SOLAR_ECLIPSES=[
 eclipse('solar-2017-08-21','Wielkie Amerykańskie Zaćmienie','total','2017-08-21T18:26:40Z',160,
  {latitude:37.0,longitude:-87.7,name:'Hrabstwo Hopkins, Kentucky, USA'}),
 eclipse('solar-2023-04-20','Zaćmienie hybrydowe nad Morzem Timorskim','hybrid','2023-04-20T04:17:56Z',76,
  {latitude:-9.6,longitude:125.8,name:'Morze Timorskie, koło Timoru Wschodniego'}),
 eclipse('solar-2023-10-14','Zaćmienie obrączkowe nad Ameryką','annular','2023-10-14T18:00:41Z',317,
  {latitude:11.4,longitude:-83.1,name:'Wybrzeże Nikaragui'}),
 eclipse('solar-2024-04-08','Wielkie Amerykańskie Zaćmienie II','total','2024-04-08T18:18:29Z',268,
  {latitude:25.3,longitude:-104.1,name:'Nazas, Durango, Meksyk'}),
 eclipse('solar-2026-08-12','Zaćmienie nad Islandią i Hiszpanią','total','2026-08-12T17:47:06Z',138,
  {latitude:65.2,longitude:-25.2,name:'Ocean Atlantycki przy Islandii'}),
 eclipse('solar-2027-08-02','Zaćmienie stulecia nad Luksorem','total','2027-08-02T10:07:50Z',383,
  {latitude:25.5,longitude:33.2,name:'Luksor, Egipt'})
];

// A practical head start before greatest eclipse - not itself a sourced
// contact time - long enough that the partial phase is already well under
// way when the scenario opens, so the whole progression into (and, for an
// annular event, back out of) the deepest phase plays out without the
// viewer having to wait for first contact.
export const SOLAR_LEAD_MINUTES=55;

// "4 min 28 s" / "38 s", matching the phrasing every source above already
// uses for the same figures.
export function formatEclipseDuration(seconds){
 if(!(seconds>0))return null;
 const minutes=Math.floor(seconds/60),secs=Math.round(seconds-minutes*60);
 return minutes>0?`${minutes} min ${secs} s`:`${secs} s`;
}
