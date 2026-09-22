import test from 'node:test';
import assert from 'node:assert/strict';
import {createShareState,decodeShareState,encodeShareState,shareTokenFromLocation,shareUrl} from '../src/share-state.js';

const bodies = [
 {id:1,name:'Sun',key:'sun',mass:1,radius:695700,spin:609,tilt:7,p:[0,0,0],v:[0,0,0]},
 {id:2,name:'Earth',key:'earth',parent:1,mass:3e-6,radius:6371,spin:24,tilt:23,p:[1,0,0],v:[0,.1,0]}
];

test('a share state round-trips bodies and parent names', () => {
 const state = createShareState({bodies,epoch:'2026-01-01T00:00:00.000Z',elapsed:2,speed:2,compressed:true,brightness:70,centralStar:'sun',showOrbits:false});
 const decoded = decodeShareState(encodeShareState(state));
 assert.equal(decoded.x[1].parentName, 'Sun');
 assert.deepEqual(decoded.x[1].p, [1,0,0]);
 assert.equal(decoded.b, 70);
 assert.equal(decoded.o, 0);
});

test('share URLs preserve a self-contained state token', () => {
 const state = createShareState({bodies,epoch:'2026-01-01T00:00:00.000Z',elapsed:0,speed:2,compressed:true,brightness:100,centralStar:'sun',showOrbits:true});
 const url = shareUrl(new URL('https://solare.test/'), state);
 assert.equal(shareTokenFromLocation(new URL(url)).x.length, 2);
});

test('invalid share tokens fail safely', () => {
 assert.equal(decodeShareState('not a token'), null);
});

