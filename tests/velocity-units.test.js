import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSystem,relativeVelocity,velocityKmPerSecond} from '../src/physics.js';
import {formatNumber,setLanguage} from '../src/i18n.js';

test('moon speed is measured against its primary and converted from AU per day',()=>{
 const bodies=initialSystem(new Date('2026-09-08T00:00:00Z'));
 const io=bodies.find(body=>body.name==='Io'),jupiter=bodies.find(body=>body.name==='Jowisz');
 const speed=velocityKmPerSecond(relativeVelocity(io,jupiter));
 assert.ok(Math.abs(speed-17.334)<.02,`Io orbital speed ${speed}`);
});

test('speed readouts use the selected language numeric convention',()=>{
 setLanguage('en');assert.equal(formatNumber(17334.365,3),'17,334.365');
 setLanguage('de');assert.equal(formatNumber(17334.365,3),'17.334,365');
 setLanguage('es');assert.equal(formatNumber(17334.365,3),'17.334,365');
 setLanguage('pl');assert.match(formatNumber(17334.365,3),/^17[\s\u00a0]334,365$/u);
});
