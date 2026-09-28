import test from 'node:test';
import assert from 'node:assert/strict';
import {SURFACE_MISSION_SITES} from '../src/surface-missions.js';

test('surface view includes the six Apollo landing sites and robotic Mars hardware',()=>{
 assert.equal(SURFACE_MISSION_SITES.moon.length,6);
 assert.ok(SURFACE_MISSION_SITES.moon.every(site=>site.model&&Number.isFinite(site.latitude)&&Number.isFinite(site.longitude)));
 assert.ok(SURFACE_MISSION_SITES.mars.some(site=>site.name==='Viking 1'));
 for(const rover of ['Sojourner','Spirit','Opportunity','Curiosity','Perseverance']){
  const site=SURFACE_MISSION_SITES.mars.find(candidate=>candidate.name===rover);
  assert.ok(site?.route?.length>=2,`${rover} needs a drawn traverse`);
 }
});
