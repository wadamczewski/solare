import test from 'node:test';
import assert from 'node:assert/strict';
import {participatesInSolarShadow} from '../src/solar-shadows.js';

test('solid bodies cast and receive solar shadows while the luminous Sun does not',()=>{
 assert.equal(participatesInSolarShadow({key:'earth'}),true);
 assert.equal(participatesInSolarShadow({key:'saturn'}),true);
 assert.equal(participatesInSolarShadow({key:'moon'}),true);
 assert.equal(participatesInSolarShadow({key:'sun'}),false);
});
