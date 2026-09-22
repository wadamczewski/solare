import test from 'node:test';
import assert from 'node:assert/strict';
import {predictCloseApproaches,scheduledEclipses,timelineEvents} from '../src/event-timeline.js';

const a={name:'A',radius:1000,p:[0,0,0],v:[0,0,0]};
const b={name:'B',radius:1000,p:[.00001,0,0],v:[-.00001,0,0]};

test('timeline predicts an approaching physical collision', () => {
 const [event] = predictCloseApproaches([a,b], 2);
 assert.equal(event.kind, 'collision');
 assert.equal(event.bodies.join(' → '), 'A → B');
});

test('timeline lists scheduled eclipses after the current date', () => {
 const events = scheduledEclipses([{name:'Test',kind:'total',greatest:'2030-01-02T00:00:00Z'}], '2030-01-01T00:00:00Z');
 assert.equal(events[0].kind, 'eclipse');
 assert.equal(events[0].days, 1);
 assert.equal(timelineEvents({bodies:[a,b],now:'2030-01-01T00:00:00Z'}).length, 1);
});

