const {chromium,devices}=require('playwright');
const U='http://localhost:8765/index.html?dev=1';
(async()=>{const b=await chromium.launch();const errs=[];const S=n=>'screenshots/v3-'+n+'.png';
async function ctx(){const c=await b.newContext({...devices['iPhone 13 landscape']});const p=await c.newPage();p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});await p.goto(U);await p.waitForTimeout(400);return p}
const W=(p,ms)=>p.waitForTimeout(ms);
const btn=async(p,t)=>{const l=p.locator('#dbtns .pbtn',{hasText:t});if(await l.count()){await l.first().dispatchEvent('pointerdown');await W(p,550);return true}return false};
const talk=async(p,x,y)=>{await p.evaluate(([x,y])=>G.tp(x,y),[x,y]);await W(p,300);await p.locator('#act').dispatchEvent('pointerdown');await W(p,350)};
// ---- MAGE main run ----
let p=await ctx();await p.screenshot({path:S('0-title')});
await p.locator('#start').dispatchEvent('pointerdown');await W(p,300);await p.screenshot({path:S('1-class-select')});
await p.locator('.clsc[data-c=mage]').dispatchEvent('pointerdown');await W(p,800);
console.log('mage bar',await p.evaluate(()=>G.P.bar));
await p.evaluate(()=>{const w=G.enemies.find(e=>e.t==='wolf'&&e.hx>2000);G.tp(w.x-200,w.y)});await W(p,300);
for(let i=0;i<4;i++){await p.locator('#s1').dispatchEvent('pointerdown');await W(p,2500)}
await p.screenshot({path:S('2-mage-fireball')});
console.log('mage after',await p.evaluate(()=>({hp:G.P.hp|0,mana:G.P.mana|0,xp:G.P.xp,lvl:G.P.lvl})));
await p.evaluate(()=>{G.gainXP(300000)});await W(p,1300);await p.screenshot({path:S('3-learn-popup')});
console.log('mage lvl',await p.evaluate(()=>[G.P.lvl,Object.keys(G.P.known).length]));
await p.locator('#bk').dispatchEvent('pointerdown');await W(p,300);await p.locator('[data-sk=nova]').dispatchEvent('pointerdown');await W(p,200);await p.locator('[data-slot="5"]').dispatchEvent('pointerdown');await W(p,200);
await p.locator('[data-sk=bliz]').dispatchEvent('pointerdown');await W(p,200);await p.screenshot({path:S('4-spellbook')});await p.locator('[data-slot="4"]').dispatchEvent('pointerdown');await p.locator('#pk .x').dispatchEvent('pointerdown');
console.log('bar now',await p.evaluate(()=>G.P.bar));
// quests elwynn done -> westfall
await p.evaluate(()=>{for(const id of['q1','q2','q3','q4'])G.QS[id].st='done'});
await talk(p,1560,1110);await btn(p,'接受任务');await btn(p,'我这就去');await btn(p,'再见');
await p.evaluate(()=>G.tp(20,1250));await W(p,900);console.log('map',await p.evaluate(()=>G.map));
await talk(p,1500,580);await p.screenshot({path:S('5-westfall-gryan')});await btn(p,'完成任务');for(let i=0;i<3;i++)await btn(p,'接受任务');await btn(p,'我这就去');
console.log('QS',JSON.stringify(await p.evaluate(()=>Object.fromEntries(Object.entries(G.QS).map(([k,v])=>[k,v.st])))));
// real fight thug with skills
await p.evaluate(()=>{const t=G.enemies.find(e=>e.t==='thug');G.tp(t.x-220,t.y)});await W(p,200);
for(const s of ['#s1','#s2']){await p.locator(s).dispatchEvent('pointerdown');await W(p,1900)}await p.locator('#s6').dispatchEvent('pointerdown');await W(p,600);await p.locator('#s5').dispatchEvent('pointerdown');await W(p,1500);
await p.screenshot({path:S('6-westfall-fight')});
console.log('thug fight',await p.evaluate(()=>({hp:G.P.hp|0,w1:G.QS.w1.c})));
await p.evaluate(()=>{G.QS.w1.c=10});await talk(p,1500,580);await btn(p,'完成任务');await btn(p,'接受任务');await btn(p,'接受任务');await btn(p,'我这就去');
await p.evaluate(()=>{G.QS.w5.c=1});await talk(p,1500,580);await btn(p,'完成任务');await btn(p,'接受任务');await btn(p,'接受任务');await btn(p,'我这就去');
console.log('QS2',JSON.stringify(await p.evaluate(()=>Object.fromEntries(Object.entries(G.QS).map(([k,v])=>[k,v.st+v.c])))));
await p.evaluate(()=>G.tp(1080,2300));await W(p,300);await p.screenshot({path:S('7-moonbrook')});
await p.evaluate(()=>G.tp(1080,2240));await W(p,900);console.log('map',await p.evaluate(()=>G.map));
await p.evaluate(()=>{G.god()});
for(const boss of ['rhahkzor','shredder','sneed','gilnid','cookie','vancleef']){let last;
 for(let i=0;i<300;i++){const st=await p.evaluate(b=>{const e=G.enemies.find(e=>e.t===b&&!e.dead);if(!e)return'dead';if(e.mhp>600&&!e._c){e._c=1;e.hp=Math.round(e.mhp*.3)}G.tp(e.hx-170,e.hy);G.target=e;return [G.map,e.hp|0,G.P.x|0]},boss);last=st;
  if(st==='dead')break;
  await p.evaluate(()=>{for(const id of['fblast','fbolt','fb'])G.useSkill(id)});await W(p,500);
  if(i===3&&(boss==='shredder'||boss==='vancleef'||boss==='rhahkzor'))await p.screenshot({path:S('8-'+boss)});}
 console.log(boss,last,await p.evaluate(()=>[G.QS.w6.c,G.QS.w7.c,G.enemies.filter(e=>e.summ).length]));}
await p.screenshot({path:S('9-vancleef-dead')});
console.log('inv',await p.evaluate(()=>G.P.inv.length));
await p.evaluate(()=>G.tp(15,500));await W(p,900);await talk(p,1500,580);await btn(p,'完成任务');await W(p,300);await btn(p,'完成任务');await W(p,1200);
await p.screenshot({path:S('10-victory')});
await p.evaluate(()=>{document.querySelectorAll('.panel').forEach(x=>x.style.display='none')});
await p.locator('#bb').dispatchEvent('pointerdown');await W(p,300);await p.screenshot({path:S('11-bag')});
console.log('save',await p.evaluate(()=>JSON.parse(localStorage.getItem('elwynn_save_v2')).P.lvl));
// ---- warrior & priest: all skills smoke ----
for(const cls of['warrior','priest']){const q=await ctx();await q.locator('#start').dispatchEvent('pointerdown');await W(q,200);await q.locator(`.clsc[data-c=${cls}]`).dispatchEvent('pointerdown');await W(q,500);
 await q.evaluate(()=>{const w=G.enemies.find(e=>e.t==='wolf'&&e.hx>2000);G.tp(w.x-50,w.y)});await q.locator('#atk').dispatchEvent('pointerdown');await W(q,2500);await q.locator('#s1').dispatchEvent('pointerdown');await W(q,1800);await q.locator('#atk').dispatchEvent('pointerup');
 await q.screenshot({path:S('12-'+cls+'-fight')});console.log(cls,'fight',await q.evaluate(()=>({hp:G.P.hp|0,xp:G.P.xp,rage:G.P.rage|0})));
 await q.evaluate(()=>{G.gainXP(400000);G.god()});await W(q,1200);
 const ids=await q.evaluate(()=>Object.keys(G.P.known));const used=[];
 for(const id of ids){await q.evaluate(()=>{const e=G.enemies.find(e=>!e.dead&&e.t==='gnoll')||G.enemies.find(e=>!e.dead);G.tp(e.x-60,e.y);G.P.rage=100;G.P.mana=G.stats().mp;G.P.cds={};G.P.gcd=0;G.P.bf.weak&&delete G.P.bf.weak});
  await q.evaluate(id=>{const e=G.enemies.find(e=>!e.dead&&Math.hypot(e.x-G.P.x,e.y-G.P.y)<200);if(e&&id==='exec')e.hp=e.mhp*.1;G.useSkill(id)},id);await W(q,3200);used.push(id)}
 await q.screenshot({path:S('13-'+cls+'-lv30')});console.log(cls,'skills',ids.length,ids.join(','));}
console.log('errors',errs);await b.close()})();
