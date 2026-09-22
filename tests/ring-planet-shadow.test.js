import test from 'node:test';
import assert from 'node:assert/strict';
import {ringTransmission} from '../src/ring-planet-shadow.js';

test('dense rings reduce direct light and grazing sunlight deepens the band',()=>{
 assert.ok(ringTransmission(.9,1)<.11);
 assert.ok(ringTransmission(.5,.2)<ringTransmission(.5,1));
 assert.equal(ringTransmission(0,1),1);
});
