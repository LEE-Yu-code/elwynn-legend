const {chromium,devices}=require('playwright');
(async()=>{const b=await chromium.launch();const c=await b.newContext({...devices['iPhone 13 landscape']});const p=await c.newPage();const errs=[];
p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});p.on('pageerror',e=>errs.push(e.message));
await p.goto('http://localhost:8765/index.html');await p.waitForTimeout(500);
await p.screenshot({path:'screenshots/0-title.png'});
await p.tap('#start');await p.waitForTimeout(500);
const cdp=await c.newCDPSession(p);const s0=await p.evaluate(()=>[G.P.x,G.P.y]);
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:120,y:250}]});
for(let i=0;i<20;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:120+i*3,y:250+i*2}]});await p.waitForTimeout(50)}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
console.log('joystick',s0,await p.evaluate(()=>[G.P.x|0,G.P.y|0]));
const btn=async t=>{const l=p.locator('#dbtns .pbtn',{hasText:t});if(await l.count()){await l.first().tap();await p.waitForTimeout(500);return true}return false};
await p.evaluate(()=>G.tp(1560,1110));await p.waitForTimeout(300);await p.tap('#act');await p.waitForTimeout(300);
await p.screenshot({path:'screenshots/1-quest-dialog.png'});
for(let i=0;i<3;i++)await btn('接受任务');await btn('我这就去');
console.log('quests',JSON.stringify(await p.evaluate(()=>G.QS)));
// real fight test: wolves
await p.evaluate(()=>{const w=G.enemies.find(e=>e.t==='wolf'&&e.hx>2000);G.tp(w.x-40,w.y)});
await p.locator('#atk').dispatchEvent('pointerdown');await p.waitForTimeout(3000);await p.screenshot({path:'screenshots/2-wolf-fight.png'});await p.locator('#atk').dispatchEvent('pointerup');
console.log('after fight',await p.evaluate(()=>({hp:G.P.hp|0,rage:G.P.rage|0,xp:G.P.xp,q1:G.QS.q1.c})));
await p.evaluate(()=>{for(const id of['q1','q2','q3'])G.QS[id].c=99;G.P.lvl=5});
await p.evaluate(()=>G.tp(1560,1110));await p.waitForTimeout(300);await p.tap('#act');await p.waitForTimeout(300);
for(let i=0;i<4;i++){await btn('完成任务')}await btn('接受任务');await btn('我这就去');
console.log('quests',JSON.stringify(await p.evaluate(()=>G.QS)),'inv',await p.evaluate(()=>G.P.inv));
// equip all from bag
await p.tap('#bb');for(let i=0;i<4;i++){const l=p.locator('[data-eq]');if(await l.count())await l.first().dispatchEvent('pointerdown');await p.waitForTimeout(100)}
await p.screenshot({path:'screenshots/3-bag.png'});await p.locator('#pb .x').dispatchEvent('pointerdown');
console.log('stats',await p.evaluate(()=>G.stats()));
// hogger
await p.evaluate(()=>{window.__god=1;const h=G.enemies.find(e=>e.t==='hogger');G.tp(h.x-200,h.y)});await p.waitForTimeout(300);
await p.tap('#s2');await p.waitForTimeout(800);await p.locator('#atk').dispatchEvent('pointerdown');
let shot=false;for(let i=0;i<120;i++){await p.waitForTimeout(500);await p.tap('#s1').catch(()=>{});if(i%6==0)await p.tap('#s3');
 const h=await p.evaluate(()=>{const h=G.enemies.find(e=>e.t==='hogger');return{hp:h.hp,dead:h.dead}});if(!shot&&h.hp<1100){await p.screenshot({path:'screenshots/4-hogger.png'});shot=true}if(h.dead){console.log('hogger dead at',i);break}}
await p.locator('#atk').dispatchEvent('pointerup');
await p.evaluate(()=>G.tp(1560,1110));await p.waitForTimeout(400);await p.tap('#act');await p.waitForTimeout(300);await btn('完成任务');await p.waitForTimeout(800);
await p.screenshot({path:'screenshots/5-victory.png'});console.log('won',await p.evaluate(()=>G.won),'save',await p.evaluate(()=>!!localStorage.getItem('elwynn_save_v1')));
const p2=await (await b.newContext({...devices['iPhone 13']})).newPage();await p2.goto('http://localhost:8765/');await p2.waitForTimeout(300);await p2.screenshot({path:'screenshots/6-portrait.png'});
console.log('errors',errs);await b.close()})();
