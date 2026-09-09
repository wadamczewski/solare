import test from 'node:test';import assert from 'node:assert/strict';
import {surfaceImpact,collisionBindingState,attachSurfaceImpact,updateSurfaceImpact} from '../src/surface-impact.js';
import {SOLAR_MASS,AU} from '../src/physics.js';
import {MeshStandardMaterial,Vector3,ShaderLib} from 'three';
test('8 km diameter comet at 0.1c has catastrophic surface energy without planetary unbinding',()=>{
 const earth={mass:5.972e24/SOLAR_MASS,radius:6371},comet={mass:(4/3*Math.PI*4000**3*500)/SOLAR_MASS,radius:4};
 const result=surfaceImpact(earth,comet,29979.2458*86400/AU);assert.ok(result.energyJ>6e28&&result.energyJ<6.2e28);assert.ok(result.energyJ<2.24e32*.001);assert.ok(result.globalHeat>.95);
 const slow=surfaceImpact(earth,comet,25*86400/AU);assert.ok(slow.energyJ<result.energyJ/1e6);
});
test('binding state evaluates both precursors before allowing complete disruption',()=>{
 const earth={id:'earth',mass:5.972e24/SOLAR_MASS,radius:6371};
 const halley={id:'halley',mass:2.2e14/SOLAR_MASS,radius:5.5};
 const state=collisionBindingState(earth,halley,51.3*86400/AU);
 assert.ok(state.energyJ>0&&state.pairBindingJ>0);
 assert.ok(state.b.disruptionRatio>1);
 assert.ok(state.a.disruptionRatio<.01);
 assert.ok(state.pairDisruptionRatio<.01);
});
test('surface effects use simulated time, terrain mask and material emission',()=>{
 const view={mesh:{material:new MeshStandardMaterial()}},b={key:'earth',damage:{surface:{globalHeat:1}}};attachSurfaceImpact(view,b,new Vector3(1,0,0));updateSurfaceImpact(view,1/86400);assert.equal(view.surfaceUniforms.impactAge.value,1);
 const shader={uniforms:{},vertexShader:ShaderLib.standard.vertexShader,fragmentShader:ShaderLib.standard.fragmentShader};view.mesh.material.onBeforeCompile(shader);assert.ok(shader.fragmentShader.includes('float land='));assert.ok(shader.fragmentShader.includes('totalEmissiveRadiance+='));assert.ok(shader.vertexShader.includes('impactLocal=normalize(position)'));
});
