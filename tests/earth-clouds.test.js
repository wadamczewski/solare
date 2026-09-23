import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudDrift, createProceduralCloudTexture} from '../src/earth-clouds.js';

test('procedural Earth clouds contain both clear sky and opaque cloud cells', () => {
 const texture = createProceduralCloudTexture(48, 24, 41);
 const alpha = texture.image.data.filter((_, index) => index % 4 === 3);
 assert.ok(Math.min(...alpha) < 8);
 assert.ok(Math.max(...alpha) > 180);
 texture.dispose();
});

test('cloud drift is deterministic and advances without wrapping out of bounds', () => {
 const first = cloudDrift({wallSeconds: 1, simulatedDays: 0, drift: 1});
 const later = cloudDrift({wallSeconds: 300, simulatedDays: 6, drift: 1});
 assert.notEqual(first.x, later.x);
 for (const value of Object.values(later)) assert.ok(value >= 0 && value < 1);
});

test('cloud shadows retain the cloud deck motion with a Sun-facing offset', () => {
 const cloud = cloudDrift({wallSeconds: 120, simulatedDays: 2, drift: 1});
 const shadow = cloudDrift({wallSeconds: 120, simulatedDays: 2, drift: 1, shadow: true});
 assert.notEqual(cloud.y, shadow.y);
});
