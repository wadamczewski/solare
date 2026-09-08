import test from 'node:test';
import assert from 'node:assert/strict';
import {solarInteriorState,createSolarInterior} from '../src/solar-interior.js';
import {LightFlight,lightTravelSeconds} from '../src/light-flight.js';
const r=695700/149597870.7;
test('solar layers follow physical radius and exit exactly at the photosphere',()=>{
 assert.equal(solarInteriorState(0).zone,'Jądro');
 assert.equal(solarInteriorState(r*.3).zone,'Strefa promienista');
 assert.equal(solarInteriorState(r*.8).zone,'Strefa konwekcyjna');
 assert.equal(solarInteriorState(r*.9995).zone,'Fotosfera');
 assert.ok(solarInteriorState(r*.9999).inside);assert.equal(solarInteriorState(r).inside,false);
 assert.equal(solarInteriorState(r,695700*2).inside,true);
 assert.equal(solarInteriorState(Infinity).inside,false);
 let previous=Infinity;for(let i=0;i<=100;i++){const t=solarInteriorState(r*i/100).temperature;assert.ok(t<=previous);previous=t;}
 assert.ok(Math.abs(previous-5772)<1e-6);
});
test('pause, rate and seeking preserve interior membership and the vacuum flight clock',()=>{
 const f=new LightFlight([0,0,0],[1,0,0],0);
 assert.ok(solarInteriorState(f.distance(1000)).inside);
 f.pause(1000);assert.ok(solarInteriorState(f.distance(99999)).inside);
 f.resume(99999);f.setRate(1000,99999);assert.equal(solarInteriorState(f.distance(100009)).inside,false);
 f.seekDistance(0,101000);assert.ok(solarInteriorState(f.distance(101000)).inside);
 f.seekDistance(1,102000);assert.equal(f.seconds(102000),lightTravelSeconds(1));assert.equal(solarInteriorState(f.distance(102000)).inside,false);
});
test('interior renders an opaque independent scene directly to the screen',()=>{
 const interior=createSolarInterior(),calls=[];
 const renderer={setRenderTarget:x=>calls.push(x),render:(scene,camera)=>calls.push([scene,camera])};
 interior.render(renderer,solarInteriorState(0),.4,1.8);
 assert.equal(calls[0],null);assert.equal(calls[1][0],interior.scene);assert.equal(interior.scene.children.length,1);
 assert.equal(interior.material.transparent,false);assert.equal(interior.material.depthTest,false);
 assert.match(interior.material.fragmentShader,/vec4\(vec3\(light\),1\.0\)/);
 interior.dispose();
});
