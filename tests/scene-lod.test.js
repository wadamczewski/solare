import test from 'node:test';
import assert from 'node:assert/strict';
import {keepsAuthoredGeometry,projectedDiameterPixels,shapeGeometry,shapeLodForDiameter} from '../src/scene-lod.js';

test('scene LOD uses fewer segments when a body is distant', () => {
 assert.equal(shapeLodForDiameter(10), 'low');
 assert.equal(shapeLodForDiameter(80), 'medium');
 assert.equal(shapeLodForDiameter(240), 'high');
 assert.ok(shapeGeometry('low').attributes.position.count < shapeGeometry('medium').attributes.position.count);
 assert.ok(shapeGeometry('medium').attributes.position.count < shapeGeometry('high').attributes.position.count);
});

test('projected diameter grows when the camera approaches a body', () => {
 assert.ok(projectedDiameterPixels(1, 10, 43, 900) > projectedDiameterPixels(1, 40, 43, 900));
});

test('a comet keeps its authored nucleus instead of being replaced by a LOD sphere', () => {
 assert.equal(keepsAuthoredGeometry({key:'comet'}), true);
 assert.equal(keepsAuthoredGeometry({key:'earth'}), false);
 assert.equal(keepsAuthoredGeometry({key:'fragment',irregular:true}), true);
});
