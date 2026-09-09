import {chromium} from 'playwright';

const url=process.env.URL||'http://127.0.0.1:5173/';
const executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const started=performance.now();
await page.goto(url,{waitUntil:'domcontentloaded'});
await page.waitForFunction(()=>window.solare&&document.querySelector('canvas'),null,{timeout:15000});
const usable=Math.round(performance.now()-started);
await page.waitForTimeout(5500);
const result=await page.evaluate(({usable,url})=>{
 const navigation=performance.getEntriesByType('navigation')[0];
 const resources=performance.getEntriesByType('resource').map(entry=>({
  name:new URL(entry.name).pathname,
  duration:Math.round(entry.duration),
  transferSize:entry.transferSize||0,
  decodedBodySize:entry.decodedBodySize||0
 })).sort((a,b)=>b.transferSize-a.transferSize);
 const total=resources.reduce((sum,entry)=>sum+entry.transferSize,0);
 return {url,usable,domContentLoaded:Math.round(navigation.domContentLoadedEventEnd),load:Math.round(navigation.loadEventEnd),total,resources};
 },{usable,url});
console.log(JSON.stringify(result,null,2));
await browser.close();
