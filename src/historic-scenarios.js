// Historic scenarios: each recorded spacecraft, comet and the interstellar
// object replayed over the time it was really observed, at a pace chosen so
// the whole thing plays in about a minute, slowing down for the moments that
// matter. Every milestone is a documented event with its UTC time; the
// playback stops exactly on it, holds for a moment, and the marker on screen
// names the object, the event, the date and time.
//
// `segments` set the playback rate (simulated days per real second) until a
// given instant, the scale and the camera's distance from the object: on the
// readable map (`map`, scene units) for cruise, where the planets and their
// orbits stay visible, and in true scale (`true`, AU) for a flyby, where the
// enlarged map planets would swallow a probe passing a few radii away.
// `precision` on a milestone says how exactly its date is known ('minute',
// 'day' or 'month'), which is how it is written on screen.

const at=value=>Date.parse(value);
const scenario=({id,object,title,start,end,segments,milestones,after=null,layers={}})=>Object.freeze({
 id,object,title,start:at(start),end:at(end),after,layers,
 segments:Object.freeze(segments.map(item=>Object.freeze({until:at(item.until),speed:item.speed,view:item.map??item.view,scale:item.map!=null?'map':'true'}))),
 milestones:Object.freeze(milestones.map(item=>Object.freeze({time:at(item.at),label:item.label,precision:item.precision||'minute'})))
});

export const HOLD_SECONDS=2.2;

export const HISTORIC_SCENARIOS=Object.freeze([
 scenario({id:'voyager-1',object:'voyager-1',title:'Voyager 1',start:'1977-09-06T00:00:00Z',end:'2012-08-25T12:00:00Z',
  segments:[
   {until:'1979-02-25T00:00:00Z',speed:60,map:16},
   {until:'1979-03-15T00:00:00Z',speed:2,view:.03},
   {until:'1980-11-02T00:00:00Z',speed:60,map:18},
   {until:'1980-11-22T00:00:00Z',speed:2,view:.03},
   {until:'2012-08-25T12:00:00Z',speed:700,map:70}
  ],
  milestones:[
   {at:'1977-09-06T00:00:00Z',label:'Start z przylądka Canaveral 5 września 1977 (Titan IIIE-Centaur)',precision:'day'},
   {at:'1979-03-05T12:05:00Z',label:'Najbliżej Jowisza · 349 000 km od środka planety'},
   {at:'1980-11-12T23:46:00Z',label:'Najbliżej Saturna · 124 000 km nad chmurami'},
   {at:'1990-02-14T04:48:00Z',label:'Zdjęcie „Bladej niebieskiej kropki” z 40 AU'},
   {at:'1998-02-17T00:00:00Z',label:'Najdalszy obiekt zbudowany przez ludzi (wyprzedza Pioneera 10)',precision:'day'},
   {at:'2004-12-16T00:00:00Z',label:'Szok końcowy wiatru słonecznego · 94 AU',precision:'day'},
   {at:'2012-08-25T00:00:00Z',label:'Heliopauza – wejście w przestrzeń międzygwiezdną · 121 AU',precision:'day'}
  ]}),
 scenario({id:'new-horizons',object:'new-horizons',title:'New Horizons',start:'2006-01-20T00:00:00Z',end:'2019-01-01T12:00:00Z',layers:{dwarfPlanets:true},
  segments:[
   {until:'2007-02-20T00:00:00Z',speed:40,map:14},
   {until:'2007-03-08T00:00:00Z',speed:2,view:.08},
   {until:'2015-07-10T00:00:00Z',speed:300,map:34},
   {until:'2015-07-18T00:00:00Z',speed:1,view:.0004},
   {until:'2018-12-28T00:00:00Z',speed:150,map:34},
   {until:'2019-01-01T12:00:00Z',speed:.5,map:34}
  ],
  milestones:[
   {at:'2006-01-20T00:00:00Z',label:'Start z przylądka Canaveral 19 stycznia 2006 (Atlas V)',precision:'day'},
   {at:'2007-02-28T05:43:00Z',label:'Najbliżej Jowisza · 2,3 mln km – asysta grawitacyjna'},
   {at:'2015-07-14T11:49:00Z',label:'Najbliżej Plutona · 12 500 km nad powierzchnią'},
   {at:'2019-01-01T05:33:00Z',label:'Przelot obok Arrokotha (2014 MU69) · 3 500 km'}
  ]}),
 scenario({id:'viking-1',object:'viking-1',title:'Viking 1',start:'1975-08-20T21:22:00Z',end:'1976-07-20T11:53:00Z',after:'viking-landing',
  segments:[
   {until:'1976-06-15T00:00:00Z',speed:30,map:8},
   {until:'1976-07-20T08:51:00Z',speed:2.5,view:.0006},
   {until:'1976-07-20T11:53:00Z',speed:.02,view:.0006}
  ],
  milestones:[
   {at:'1975-08-20T21:22:00Z',label:'Start z przylądka Canaveral (Titan IIIE-Centaur)'},
   {at:'1976-06-19T23:40:00Z',label:'Wejście na orbitę Marsa',precision:'day'},
   {at:'1976-07-20T08:51:00Z',label:'Oddzielenie lądownika od orbitera'},
   {at:'1976-07-20T11:53:00Z',label:'Lądowanie w Chryse Planitia · 22,3° N 48,0° W'}
  ]}),
 scenario({id:'tesla-roadster',object:'tesla-roadster',title:'Tesla Roadster / Starman',start:'2018-02-07T04:00:00Z',end:'2018-03-19T04:00:00Z',
  segments:[{until:'2018-03-19T04:00:00Z',speed:1,map:6}],
  milestones:[
   {at:'2018-02-07T04:00:00Z',label:'Start rakiety Falcon Heavy 6 lutego 2018, 20:45 UTC; od 7 lutego na orbicie wokół Słońca',precision:'day'},
   {at:'2018-02-08T00:00:00Z',label:'Pierwsze zdjęcie teleskopowe (Virtual Telescope Project)',precision:'day'},
   {at:'2018-03-19T04:00:00Z',label:'Ostatni pomiar astrometryczny – dalej tylko obliczana orbita',precision:'day'}
  ]}),
 scenario({id:'oumuamua',object:'oumuamua',title:'ʻOumuamua',start:'2017-10-14T00:00:00Z',end:'2018-01-02T23:00:00Z',
  segments:[
   {until:'2017-10-26T00:00:00Z',speed:1,map:5},
   {until:'2018-01-02T23:00:00Z',speed:2.5,map:8}
  ],
  milestones:[
   {at:'2017-10-14T00:00:00Z',label:'Najbliżej Ziemi · 0,162 AU; pierwsze (odnalezione później) zdjęcia Pan-STARRS',precision:'day'},
   {at:'2017-10-19T00:00:00Z',label:'Odkrycie: Robert Weryk, teleskop Pan-STARRS1 (Hawaje)',precision:'day'},
   {at:'2017-11-06T00:00:00Z',label:'Oznaczenie 1I – pierwszy znany obiekt międzygwiezdny',precision:'day'},
   {at:'2018-01-02T00:00:00Z',label:'Ostatnia obserwacja (Kosmiczny Teleskop Hubble’a)',precision:'day'}
  ]}),
 scenario({id:'67p',object:'67p',title:'67P/Czuriumow-Gierasimienko',start:'2014-08-06T00:00:00Z',end:'2016-09-30T12:00:00Z',
  segments:[{until:'2016-09-30T12:00:00Z',speed:20,map:8}],
  milestones:[
   {at:'2014-08-06T00:00:00Z',label:'Sonda Rosetta dociera do komety',precision:'day'},
   {at:'2014-11-12T15:34:00Z',label:'Lądownik Philae osiada na jądrze'},
   {at:'2015-08-13T02:03:00Z',label:'Peryhelium · 1,24 AU od Słońca'},
   {at:'2016-09-30T10:39:00Z',label:'Rosetta kończy misję, lądując na komecie'}
  ]}),
 scenario({id:'hale-bopp',object:'hale-bopp',title:'Hale-Bopp',start:'1995-07-23T00:00:00Z',end:'1997-12-31T00:00:00Z',
  segments:[{until:'1997-12-31T00:00:00Z',speed:25,map:10}],
  milestones:[
   {at:'1995-07-23T00:00:00Z',label:'Odkrycie: Alan Hale i Thomas Bopp · 7,2 AU od Słońca',precision:'day'},
   {at:'1996-05-15T00:00:00Z',label:'Widoczna gołym okiem',precision:'month'},
   {at:'1997-03-22T00:00:00Z',label:'Najbliżej Ziemi · 1,315 AU',precision:'day'},
   {at:'1997-04-01T00:00:00Z',label:'Peryhelium · 0,914 AU od Słońca',precision:'day'},
   {at:'1997-12-15T00:00:00Z',label:'Przestaje być widoczna gołym okiem',precision:'month'}
  ]})
]);

export const historicScenario=id=>HISTORIC_SCENARIOS.find(item=>item.id===id)||null;

// The playback segment for an instant (the last one past the end).
export function scenarioSegment(item,time){
 return item.segments.find(segment=>time<segment.until)||item.segments.at(-1);
}
// The next instant the playback must stop on exactly: a milestone, a change
// of segment, or the end.
export function nextStop(item,time){
 const stops=[...item.milestones.map(entry=>entry.time),...item.segments.map(entry=>entry.until),item.end].filter(value=>value>time+1);
 return stops.length?Math.min(...stops):item.end;
}
export function milestonesReached(item,from,to){
 return item.milestones.filter(entry=>entry.time>from&&entry.time<=to);
}
// Real seconds the whole scenario takes: each segment's span at its rate,
// plus the pause on every milestone.
export function scenarioDurationSeconds(item){
 let previous=item.start,seconds=0;
 for(const segment of item.segments){const until=Math.min(segment.until,item.end);if(until>previous){seconds+=(until-previous)/86400000/segment.speed;previous=until}}
 return seconds+item.milestones.length*HOLD_SECONDS;
}
