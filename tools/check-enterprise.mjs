import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';

const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1}),errors=[],requests=[];
page.setDefaultTimeout(30000);
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(request.url().includes('enterprise-model'))requests.push(request.url())});
const code=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
const typeCode=async()=>{for(const key of code)await page.keyboard.press(key)};
const state=()=>page.evaluate(()=>window.solare.getView().freeFlight);
const enter=async()=>{
 await page.locator('#universe canvas').click({button:'right',position:{x:1000,y:330}});
 await page.waitForFunction(()=>document.pointerLockElement&&window.solare.getView().freeFlight.active);
};
const leave=async()=>{
 await page.keyboard.press('Escape');
 await page.waitForFunction(()=>!window.solare.getView().freeFlight.active&&!window.solare.getView().freeFlight.enterprise);
};
try{
 await page.addInitScript(()=>localStorage.setItem('solare-ux:welcomed','1'));
 await page.goto(process.env.URL||'http://127.0.0.1:5173/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.solare);
 await page.evaluate(()=>window.solare.pause());
 assert.equal((await state()).enterprise,null);assert.equal(requests.length,0);
 // The code in ordinary orbit mode cannot load a model. Its A may itself start
 // free flight, but the code must be typed again after that mode is entered.
 await typeCode();assert.equal((await state()).enterprise,null);assert.equal(requests.length,0);await leave();
 await enter();
 for(const key of ['ArrowUp','ArrowDown','ArrowLeft','b','a'])await page.keyboard.press(key);
 assert.equal((await state()).enterprise,null);
 await typeCode();await page.waitForFunction(()=>window.solare.getView().freeFlight.enterprise);
 const spawned=await state();assert.equal(requests.length,1);
 await mkdir('outputs',{recursive:true});
 await page.screenshot({path:'outputs/enterprise-free-flight.png'});
 assert.equal(spawned.enterprise.flight.piloting,true);
 await page.keyboard.down('w');await page.waitForFunction(()=>window.solare.getView().freeFlight.enterprise.flight.speed>.01);await page.keyboard.up('w');
 assert.notDeepEqual((await state()).enterprise.position,spawned.enterprise.position,'W flies the ship');
 await page.keyboard.press('v');await page.waitForFunction(()=>!window.solare.getView().freeFlight.enterprise.flight.piloting);
 const inspecting=(await state()).enterprise;
 await page.keyboard.down('w');await page.waitForFunction(distance=>window.solare.getView().freeFlight.enterprise.distance<distance*.97,inspecting.distance);await page.keyboard.up('w');
 assert.deepEqual((await state()).enterprise.position,inspecting.position,'inspection moves only the camera');
 await page.screenshot({path:'outputs/enterprise-approach.png'});
 await typeCode();assert.deepEqual((await state()).enterprise.position,inspecting.position,'no duplicate or reposition on a second code');
 await leave();await enter();assert.equal((await state()).enterprise,null);
 await typeCode();await page.waitForFunction(()=>window.solare.getView().freeFlight.enterprise);
 await page.evaluate(()=>window.solare.startLightFlight());
 await page.waitForFunction(()=>!window.solare.getView().freeFlight.enterprise);
 await page.evaluate(()=>window.solare.stopLightFlight());
 await leave();await enter();assert.equal((await state()).enterprise,null);
 await typeCode();await page.waitForFunction(()=>window.solare.getView().freeFlight.enterprise);
 await page.evaluate(()=>window.solare.reset());
 await page.waitForFunction(()=>!window.solare.getView().freeFlight.enterprise&&!window.solare.getView().freeFlight.active);
 // Text input must not accumulate the unlock sequence.
 await page.locator('#body-search').focus();await typeCode();assert.equal((await state()).enterprise,null);
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({ok:true,checks:['hidden by default','lazy model loading','wrong sequence','Konami activation','W flies the ship','V switches to stationary inspection','no duplicates','Escape cleanup','re-entry requires code','scenario cleanup','reset cleanup','input isolation'],screenshots:['outputs/enterprise-free-flight.png','outputs/enterprise-approach.png']},null,2));
}catch(error){await mkdir('outputs',{recursive:true});await page.screenshot({path:'outputs/enterprise-test-failure.png'}).catch(()=>{});throw error}finally{await browser.close()}
