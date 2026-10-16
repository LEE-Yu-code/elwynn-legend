'use strict';
(()=>{
const cv=document.getElementById('c'),cx=cv.getContext('2d');
const W=3200,H=2200;let DPR=1,VW=0,VH=0,SC=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;cv.width=VW*DPR;cv.height=VH*DPR;SC=Math.max(0.8,Math.min(1.6,VH/430));}
addEventListener('resize',resize);resize();
const $=id=>document.getElementById(id);
const R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>v<a?a:v>b?b:v;
// seeded rng for map
let seed=7;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
// ---------- AUDIO ----------
let AC=null,muted=false;
function unlock(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state!=='running')AC.resume();if(AC){const b=AC.createBuffer(1,1,22050),s=AC.createBufferSource();s.buffer=b;s.connect(AC.destination);s.start(0);}}
function tone(f,d,type='square',v=.08,slide=0,delay=0){if(!AC||muted)return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02);}
function noise(d,v=.15,fq=1200){if(!AC||muted)return;const t=AC.currentTime,n=AC.sampleRate*d,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=fq;g.gain.value=v;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t);}
const SFX={swing:()=>noise(.12,.12,2500),hit:()=>{noise(.1,.25,900);tone(140,.1,'square',.06,-60)},crit:()=>{noise(.2,.3,700);tone(90,.25,'sawtooth',.1,-40)},hurt:()=>tone(220,.15,'sawtooth',.07,-120),
 charge:()=>tone(200,.3,'sawtooth',.08,500),thunder:()=>{noise(.6,.4,300);tone(60,.5,'sine',.25,-20)},lvl:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.25,'triangle',.1,0,i*.1)),
 quest:()=>[392,523,659].forEach((f,i)=>tone(f,.3,'triangle',.1,0,i*.12)),loot:()=>tone(880,.12,'triangle',.08,400),pot:()=>tone(400,.3,'sine',.1,500),die:()=>tone(300,.8,'sawtooth',.1,-250),
 win:()=>[523,659,784,659,784,1047].forEach((f,i)=>tone(f,.35,'triangle',.12,0,i*.15)),click:()=>tone(660,.05,'square',.04)};
// ---------- MAP ----------
const ZONES=[
 {n:'北郡修道院',x:150,y:120,w:800,h:650,c:'#6f8a3e'},
 {n:'狗头人矿洞',x:1250,y:80,w:700,h:520,c:'#5a4a3a'},
 {n:'狼群林地',x:2250,y:200,w:850,h:900,c:'#4f6f2e'},
 {n:'金色小镇',x:1250,y:900,w:750,h:550,c:'#7f9a4a'},
 {n:'霍格营地',x:250,y:1450,w:900,h:650,c:'#6a6a30'},
 {n:'艾尔文森林',x:0,y:0,w:W,h:H,c:'#567a32'}];
const obs=[];// {t:'c',x,y,r} or {t:'r',x,y,w,h}
const trees=[],props=[];
const rects=[ // buildings
 {x:380,y:180,w:300,h:200,k:'abbey'},{x:1350,y:960,w:150,h:110,k:'house'},{x:1750,y:960,w:170,h:120,k:'inn'},{x:1350,y:1260,w:140,h:110,k:'house'},{x:1780,y:1270,w:140,h:100,k:'house'}];
rects.forEach(r=>obs.push({t:'r',...r}));
function inRect(x,y,r,m=0){return x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m}
const roads=[[550,420,550,800],[550,800,1600,1100],[1600,1100,1600,600],[1600,1100,2500,700],[1600,1100,700,1700],[1600,1100,2600,1700]];
function nearRoad(x,y){for(const r of roads){const[a,b,c,d]=r,dx=c-a,dy=d-b,t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(x-a-dx*t,y-b-dy*t)<60)return true}return false}
// mine walls: ring of rocks around mine rect except entrance at bottom center
const MINE={x:1300,y:120,w:600,h:420};
for(let a=0;a<1;a+=.012){let x,y;const p=a*4;if(p<1){x=MINE.x+MINE.w*p;y=MINE.y}else if(p<2){x=MINE.x+MINE.w;y=MINE.y+MINE.h*(p-1)}else if(p<3){x=MINE.x+MINE.w*(3-p);y=MINE.y+MINE.h}else{x=MINE.x;y=MINE.y+MINE.h*(4-p)}
 if(p>=2&&p<3&&Math.abs(x-(MINE.x+MINE.w/2))<70)continue;obs.push({t:'c',x,y,r:26,rock:1});props.push({k:'rock',x,y,r:26+sr()*8});}
seed=11;
for(let i=0;i<520;i++){const x=sr()*W,y=sr()*H;if(nearRoad(x,y))continue;if(rects.some(r=>inRect(x,y,r,60)))continue;if(inRect(x,y,MINE,60))continue;
 if(inRect(x,y,ZONES[3],-40)||inRect(x,y,{x:300,y:150,w:550,h:550}))continue;if(Math.hypot(x-700,y-1780)<220)continue;
 const r=18+sr()*14;trees.push({x,y,r,c:sr()});obs.push({t:'c',x,y,r:r*.55});}
for(let i=0;i<14;i++){props.push({k:'candle',x:MINE.x+60+sr()*(MINE.w-120),y:MINE.y+60+sr()*(MINE.h-120)})}
props.push({k:'cart',x:1500,y:250},{k:'cart',x:1750,y:420},{k:'fire',x:700,y:1780},{k:'tent',x:560,y:1680},{k:'tent',x:860,y:1690},{k:'well',x:1620,y:1180},{k:'board',x:1520,y:1150});
const ground=document.createElement('canvas');ground.width=W/2;ground.height=H/2;
(function paint(){const g=ground.getContext('2d');g.scale(.5,.5);seed=3;
 g.fillStyle='#4f7430';g.fillRect(0,0,W,H);
 for(let i=0;i<9000;i++){const x=sr()*W,y=sr()*H;g.fillStyle=['#5a8236','#46682a','#62893c','#4a6e2c'][i%4];g.fillRect(x,y,4+sr()*10,3+sr()*6)}
 const patch=(z,c1,c2)=>{g.fillStyle=c1;g.beginPath();g.roundRect(z.x,z.y,z.w,z.h,80);g.fill();for(let i=0;i<z.w*z.h/600;i++){g.fillStyle=c2;g.fillRect(z.x+20+sr()*(z.w-40),z.y+20+sr()*(z.h-40),3+sr()*7,3+sr()*5)}};
 patch(ZONES[4],'#7a7038','#6a6030');patch(MINE,'#3a3028','#2c241e');patch({x:300,y:140,w:520,h:580},'#8a8a7a','#77776a');
 g.strokeStyle='#9a7f52';g.lineCap='round';g.lineWidth=70;roads.forEach(r=>{g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(r[2],r[3]);g.stroke()});
 g.strokeStyle='#ab9064';g.lineWidth=46;roads.forEach(r=>{g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(r[2],r[3]);g.stroke()});
 g.fillStyle='#ab9064';g.beginPath();g.ellipse(1600,1110,230,170,0,0,7);g.fill();
 for(let i=0;i<600;i++){const x=sr()*W,y=sr()*H;if(nearRoad(x,y)){g.fillStyle='#8a7048';g.fillRect(x,y,4,3)}}
 // flowers
 for(let i=0;i<500;i++){g.fillStyle=['#e8d84a','#e86a8a','#fff'][i%3];g.fillRect(sr()*W,sr()*H,3,3)}
 // lake
 g.fillStyle='#2a5a8a';g.beginPath();g.ellipse(2700,1650,260,160,0.2,0,7);g.fill();g.fillStyle='#3a74a8';g.beginPath();g.ellipse(2690,1640,220,125,0.2,0,7);g.fill();
 // mine tracks
 g.strokeStyle='#6a5a48';g.lineWidth=4;g.beginPath();g.moveTo(1600,560);g.lineTo(1600,250);g.lineTo(1800,250);g.moveTo(1612,560);g.lineTo(1612,262);g.lineTo(1800,262);g.stroke();
})();
obs.push({t:'c',x:2700,y:1650,r:200});
// ---------- STATE ----------
const ITEMS={
 sword0:{n:'训练用剑',s:'weapon',atk:2,q:'',d:'新兵的木剑'},
 legs1:{n:'狼皮护腿',s:'legs',def:3,hp:10,q:'gr'},
 sword1:{n:'坚固的短剑',s:'weapon',atk:5,q:'gr'},
 helm1:{n:'工头的矿工帽',s:'head',def:4,hp:25,q:'gr'},
 chest1:{n:'卫兵锁甲',s:'chest',def:6,hp:30,q:'bl'},
 sword2:{n:'闪光长剑',s:'weapon',atk:10,q:'bl'},
 neck1:{n:'力量护符',s:'neck',atk:4,hp:15,q:'gr'},
 neck2:{n:'霍格的獠牙项链',s:'neck',atk:9,hp:50,q:'pu'},
 chest0:{n:'粗布上衣',s:'chest',def:1,q:''}};
const SLOTN={weapon:'武器',head:'头部',chest:'胸甲',legs:'腿部',neck:'项链'};
const XPN=[0,120,300,560,900,99999];
const QUESTS=[
 {id:'q1',n:'狼群威胁',d:'林地里的森林狼越来越凶，猎杀 8 只森林狼。',need:8,kind:'kill',tgt:'wolf',rew:'chest1',rxp:150,txt:'东边的狼群已经咬伤了好几个农夫。去狼群林地，消灭 8 只森林狼！'},
 {id:'q2',n:'你不能拿走蜡烛！',d:'从北边矿洞的狗头人身上收集 6 根蜡烛。',need:6,kind:'col',tgt:'kobold',rew:'sword2',rxp:180,txt:'北边的矿洞被狗头人占了。那些家伙头上顶着蜡烛到处乱跑……给我带 6 根蜡烛回来，证明你清理过那里。'},
 {id:'q3',n:'矿洞工头',d:'击败矿洞深处的狗头人工头。',need:1,kind:'kill',tgt:'foreman',rew:'neck1',rxp:220,pot:3,txt:'狗头人背后有个工头在指挥它们挖矿。去矿洞最深处干掉它！'},
 {id:'q4',n:'通缉：霍格',d:'击败西南营地的豺狼人首领霍格。',need:1,kind:'kill',tgt:'hogger',rew:null,rxp:500,txt:'你干得很漂亮，勇士。现在是最危险的任务了——豺狼人霍格在西南营地作恶多端，悬赏告示贴满了整个镇子。去把它干掉！'}];
let P,QS,enemies=[],fx=[],texts=[],npcs=[],won=false,target=null,t0=performance.now(),tm=0,dialog=false;
function newGame(){P={x:560,y:560,vx:0,vy:0,dir:1,face:0,hp:150,rage:0,lvl:1,xp:0,eq:{weapon:'sword0',chest:'chest0'},inv:[],pots:2,cds:{atk:0,s1:0,s2:0,s3:0,gcd:0},swing:0,dash:null,hurt:0,dead:0,anim:0};
 P.hp=stats().hp;QS={};QUESTS.forEach(q=>QS[q.id]={st:'none',c:0});won=false;}
function stats(){let atk=8+P.lvl*3,def=P.lvl,hp=100+P.lvl*30;for(const s in P.eq){const it=ITEMS[P.eq[s]];if(!it)continue;atk+=it.atk||0;def+=it.def||0;hp+=it.hp||0}return{atk,def,hp}}
function save(){try{localStorage.setItem('elwynn_save_v1',JSON.stringify({P:{...P,dash:null,dead:0},QS,won}))}catch(e){}}
function load(){try{const s=JSON.parse(localStorage.getItem('elwynn_save_v1'));if(s&&s.P){newGame();Object.assign(P,s.P);P.cds={atk:0,s1:0,s2:0,s3:0,gcd:0};QS=s.QS;won=s.won;return true}}catch(e){}return false}
// ---------- ENEMIES ----------
const ET={
 wolf:{n:'森林狼',hp:45,dmg:[4,7],sp:120,xp:28,lvl:[1,2],r:18,ag:170},
 kobold:{n:'狗头人矿工',hp:60,dmg:[5,8],sp:95,xp:38,lvl:[2,3],r:16,ag:150,say:['你不能拿走蜡烛！','不要蜡烛！','我的蜡烛！']},
 foreman:{n:'狗头人工头',hp:230,dmg:[9,13],sp:100,xp:140,lvl:[4,4],r:22,ag:180,say:['你不能拿走蜡烛！！'],elite:1},
 gnoll:{n:'河爪豺狼人',hp:110,dmg:[8,12],sp:105,xp:60,lvl:[4,5],r:19,ag:170},
 hogger:{n:'霍格',hp:1400,dmg:[14,20],sp:115,xp:600,lvl:[6,6],r:32,ag:220,say:['霍格要吃了你！','咕噜噜……'],boss:1}};
const SPAWNS=[];
for(let i=0;i<12;i++)SPAWNS.push(['wolf',2350+Math.random()*650,300+Math.random()*700]);
for(let i=0;i<9;i++)SPAWNS.push(['kobold',MINE.x+80+Math.random()*(MINE.w-160),MINE.y+160+Math.random()*(MINE.h-220)]);
SPAWNS.push(['foreman',MINE.x+MINE.w/2,MINE.y+90]);
for(let i=0;i<4;i++)SPAWNS.push(['gnoll',450+Math.random()*550,1550+Math.random()*450]);
for(let i=0;i<4;i++)SPAWNS.push(['wolf',1000+Math.random()*500,600+Math.random()*250]);
SPAWNS.push(['hogger',720,1880]);
function spawnAll(){enemies=SPAWNS.map((s,i)=>mkE(s[0],s[1],s[2],i))}
function mkE(t,x,y,i){const T=ET[t];return{t,T,x,y,hx:x,hy:y,hp:T.hp,mhp:T.hp,lvl:RI(T.lvl[0],T.lvl[1]),st:'idle',cd:0,wt:R(1,4),tx:x,ty:y,dead:0,resp:0,sp:i,anim:Math.random()*9,face:1,hurt:0,stun:0,slow:0,said:0,special:6,enr:0}}
npcs=[{n:'卫兵队长',x:1560,y:1060,k:'captain',ttl:'暴风城卫兵'},{n:'安妮修士',x:540,y:440,k:'priest',ttl:'北郡修道院'},{n:'旅店老板',x:1830,y:1110,k:'inn',ttl:'药水商人'}];
// ---------- INPUT ----------
const keys={};let joy=null,atkHeld=false;
addEventListener('keydown',e=>{keys[e.key.toLowerCase()]=1;if(e.key===' ')atkHeld=true;if(e.key==='1')skill('s1');if(e.key==='2')skill('s2');if(e.key==='3')skill('s3');if(e.key.toLowerCase()==='q')usePot();if(e.key.toLowerCase()==='e')interact();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0;if(e.key===' ')atkHeld=false});
['gesturestart','gesturechange','dblclick'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(!e.target.closest('.panel'))e.preventDefault()},{passive:false});
document.addEventListener('pointerdown',unlock,{capture:true});
cv.addEventListener('pointerdown',e=>{if(e.clientX<VW*.5&&!joy){joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:e.clientX,y:e.clientY}}else{ // tap enemy to target
 const wx=(e.clientX-VW/2)/SC+cam.x,wy=(e.clientY-VH/2)/SC+cam.y;let b=null,bd=50;enemies.forEach(en=>{if(!en.dead){const d=Math.hypot(en.x-wx,en.y-wy);if(d<bd){bd=d;b=en}}});if(b)target=b}});
addEventListener('pointermove',e=>{if(joy&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY}});
const endJ=e=>{if(joy&&e.pointerId===joy.id)joy=null};addEventListener('pointerup',endJ);addEventListener('pointercancel',endJ);
function bindBtn(id,down,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('pressed');down&&down()});const u=e=>{el.classList.remove('pressed');up&&up()};el.addEventListener('pointerup',u);el.addEventListener('pointerleave',u);el.addEventListener('pointercancel',u)}
bindBtn('atk',()=>atkHeld=true,()=>atkHeld=false);bindBtn('s1',()=>skill('s1'));bindBtn('s2',()=>skill('s2'));bindBtn('s3',()=>skill('s3'));bindBtn('pot',usePot);bindBtn('act',interact);
bindBtn('bq',()=>{SFX.click();openQ()});bindBtn('bb',()=>{SFX.click();openB()});bindBtn('bm',()=>{muted=!muted;$('bm').textContent=muted?'🔇':'🔊'});
document.querySelectorAll('.panel .x').forEach(x=>x.addEventListener('pointerdown',e=>{e.stopPropagation();x.parentElement.style.display='none'}));
// ---------- COMBAT ----------
function toast(t,ms=2200){const el=$('toast');el.innerHTML=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>el.style.opacity=0,ms)}
function ftxt(x,y,t,c,big){texts.push({x:x+R(-8,8),y,t,c,life:1.1,big})}
function nearest(range,min=0){let b=null,bd=range;enemies.forEach(e=>{if(e.dead)return;const d=D(P,e);if(d<bd&&d>=min){bd=d;b=e}});return b}
function pickT(range){if(target&&!target.dead&&D(P,target)<range)return target;const n=nearest(range);if(n)target=n;return n}
function dmgE(e,amt,crit){if(e.dead)return;amt=Math.round(amt*(crit?1.8:1));e.hp-=amt;e.hurt=.2;ftxt(e.x,e.y-40,(crit?'暴击 ':'')+amt,crit?'#ffd24a':'#fff',crit);crit?SFX.crit():SFX.hit();
 if(e.st!=='chase'){e.st='chase';if(e.T.say&&Math.random()<.8){e.bubble={t:e.T.say[RI(0,e.T.say.length-1)],life:2.5}}}
 P.rage=Math.min(100,P.rage+amt*.25);target=target&&!target.dead?target:e;
 if(e.T.boss&&!e.enr&&e.hp<e.mhp*.3){e.enr=1;e.bubble={t:'霍格 进入狂暴状态！',life:3};toast('霍格 进入了狂暴状态！')}
 if(e.hp<=0)killE(e)}
function killE(e){e.dead=1;e.resp=e.T.boss?40:25;SFX.die();const st=stats();
 let xp=Math.round(e.T.xp*Math.max(.3,1-(P.lvl-e.lvl)*.15));gainXP(xp);
 for(const q of QUESTS){const s=QS[q.id];if(s.st!=='active')continue;if(q.tgt===e.t){if(q.kind==='kill'){s.c=Math.min(q.need,s.c+1);ftxt(P.x,P.y-70,`${q.n}: ${s.c}/${q.need}`,'#ffd24a')}else if(Math.random()<.65){s.c=Math.min(q.need,s.c+1);ftxt(P.x,P.y-70,`蜡烛: ${s.c}/${q.need}`,'#ffd24a');SFX.loot()}
  if(s.c>=q.need&&!s.notified){s.notified=1;toast(`任务完成：${q.n}<br><span style="font-size:14px">回去找卫兵队长</span>`);SFX.quest()}}}
 const drop=id=>{P.inv.push(id);const it=ITEMS[id];toast(`获得物品：<span class="${it.q}">[${it.n}]</span>`);SFX.loot()};
 if(e.t==='wolf'&&Math.random()<.12&&!has('legs1'))drop('legs1');
 if(e.t==='kobold'&&Math.random()<.12&&!has('sword1'))drop('sword1');
 if(e.t==='foreman'&&!has('helm1'))drop('helm1');
 if(e.t==='hogger'&&!has('neck2'))drop('neck2');
 if(Math.random()<.22){P.pots++;ftxt(e.x,e.y-20,'+治疗药水','#7fff7f')}
 if(target===e)target=null;save()}
function has(id){return P.inv.includes(id)||Object.values(P.eq).includes(id)}
function gainXP(x){if(P.lvl>=5){return}P.xp+=x;ftxt(P.x,P.y-55,'+'+x+' 经验','#c58aff');while(P.lvl<5&&P.xp>=XPN[P.lvl]){P.xp-=XPN[P.lvl];P.lvl++;P.hp=stats().hp;SFX.lvl();toast(`升级了！你达到了 ${P.lvl} 级`);fx.push({k:'lvl',x:P.x,y:P.y,life:1.5})}if(P.lvl>=5)P.xp=0}
function swingAt(e,mult,label){const st=stats();P.face=Math.atan2(e.y-P.y,e.x-P.x);P.swing=.25;SFX.swing();dmgE(e,st.atk*mult*R(.85,1.15),Math.random()<.12);if(label)ftxt(P.x,P.y-60,label,'#ffb04a')}
function skill(id){if(P.dead||won||dialog)return;const st=stats();if(P.cds[id]>0||P.cds.gcd>0)return;
 if(id==='s1'){if(P.rage<15){ftxt(P.x,P.y-60,'怒气不足','#f55');return}const e=pickT(75);if(!e){ftxt(P.x,P.y-60,'距离太远','#f55');return}P.rage-=15;swingAt(e,2.3,'英勇打击');P.cds.gcd=.8}
 if(id==='s2'){const e=(target&&!target.dead&&D(P,target)<360&&D(P,target)>60)?target:nearest(360,60);if(!e){ftxt(P.x,P.y-60,'没有冲锋目标','#f55');return}target=e;P.dash={e,t:.45};P.rage=Math.min(100,P.rage+20);P.cds.s2=8;SFX.charge();ftxt(P.x,P.y-60,'冲锋！','#ffb04a')}
 if(id==='s3'){if(P.rage<20){ftxt(P.x,P.y-60,'怒气不足','#f55');return}P.rage-=20;P.cds.s3=6;P.cds.gcd=.8;SFX.thunder();fx.push({k:'thunder',x:P.x,y:P.y,life:.5});let n=0;enemies.forEach(e=>{if(!e.dead&&D(P,e)<130){dmgE(e,st.atk*1.4*R(.9,1.1),false);e.slow=4;n++}});ftxt(P.x,P.y-60,'雷霆一击','#8ad0ff')}}
function usePot(){if(P.dead||P.pots<=0)return;const st=stats();if(P.hp>=st.hp){ftxt(P.x,P.y-60,'生命值已满','#aaa');return}P.pots--;P.hp=Math.min(st.hp,P.hp+Math.round(st.hp*.5));SFX.pot();ftxt(P.x,P.y-60,'+生命','#7fff7f');fx.push({k:'heal',x:P.x,y:P.y,life:.8});save()}
function hurtP(amt,src){if(P.dead||won)return;const st=stats();amt=Math.max(1,Math.round(amt-st.def*.5));if(window.__god)amt=0;P.hp-=amt;P.hurt=.2;P.rage=Math.min(100,P.rage+amt*.6);ftxt(P.x,P.y-50,'-'+amt,'#ff4a4a');SFX.hurt();
 if(P.hp<=0){P.hp=0;P.dead=3;SFX.die();toast('你死了……灵魂将在北郡修道院复活');target=null;enemies.forEach(e=>{if(e.st==='chase'){e.st='return'}})}}
// ---------- NPC / DIALOG ----------
function nearNpc(){return npcs.find(n=>D(P,n)<85)}
function interact(){const n=nearNpc();if(!n||dialog)return;SFX.click();
 if(n.k==='priest')return say(n,'愿圣光与你同在，年轻的战士。北郡外面并不太平——沿着大路往东南走，去金色小镇找<b>卫兵队长</b>，他需要人手。<br><br><small>提示：受伤时可以使用治疗药水。</small>',[['好的','close']]);
 if(n.k==='inn')return say(n,`欢迎光临！旅途劳顿吧？来，这瓶<b>治疗药水</b>送你，省着点用。`,[['谢谢','gift']]);
 // captain
 const qs=QUESTS;const ready=qs.find(q=>QS[q.id].st==='active'&&QS[q.id].c>=q.need);
 if(ready){const r=ready.rew?ITEMS[ready.rew]:null;return say(n,(ready.id==='q4'?'<b>霍格</b>终于倒下了！整个艾尔文森林都欠你一份人情，勇士！':'干得好！这是你应得的奖赏。')+`<br><br>奖励：${ready.rxp} 经验`+(r?`，<span class="${r.q}">[${r.n}]</span>`:'')+(ready.pot?`，治疗药水×${ready.pot}`:''),[['完成任务','turn:'+ready.id]])}
 const avail=qs.filter(q=>QS[q.id].st==='none'&&(q.id!=='q4'||['q1','q2','q3'].every(i=>QS[i].st==='done')));
 if(avail.length){const q=avail[0];return say(n,`<b>【${q.n}】</b><br>${q.txt}`,[['接受任务','acc:'+q.id],['稍后','close']])}
 const act=qs.filter(q=>QS[q.id].st==='active');
 if(act.length)return say(n,'任务进行得怎么样？<br>'+act.map(q=>`· ${q.n}：${QS[q.id].c}/${q.need}`).join('<br>'),[['我这就去','close']]);
 say(n,'艾尔文森林恢复了和平，这都多亏了你。',[['再见','close']])}
function say(n,txt,btns){dialog=true;$('dname').textContent=n.n;$('dtext').innerHTML=txt;const b=$('dbtns');b.innerHTML='';btns.forEach(([l,a])=>{const d=document.createElement('div');d.className='pbtn';d.textContent=l;d.addEventListener('pointerdown',e=>{e.stopPropagation();doAct(a,n)});b.appendChild(d)});$('pd').style.display='block'}
function closeD(){dialog=false;$('pd').style.display='none'}
function doAct(a,n){SFX.click();closeD();
 if(a==='gift'){if(!P.gotGift||P.pots<1){P.pots+=1;P.gotGift=1;toast('获得 治疗药水')}else toast('老板：别贪心哦！');}
 if(a.startsWith('acc:')){const id=a.slice(4);QS[id].st='active';QS[id].c=0;SFX.quest();toast('接受任务：'+QUESTS.find(q=>q.id===id).n);setTimeout(interact,350)}
 if(a.startsWith('turn:')){const id=a.slice(5),q=QUESTS.find(q=>q.id===id);QS[id].st='done';SFX.quest();gainXP(q.rxp);if(q.rew)P.inv.push(q.rew);if(q.pot)P.pots+=q.pot;toast('任务完成：'+q.n);
  if(id==='q4'){won=true;setTimeout(victory,600)}else setTimeout(interact,400)}
 save()}
function victory(){SFX.win();say({n:'胜利！'},'<div style="text-align:center;font-size:16px">🏆 <b>艾尔文森林的英雄</b> 🏆<br><br>你击败了霍格，保卫了金色小镇。<br>暴风城会记住你的名字，人类战士！<br><br><small>可以继续在森林里自由探索，或回到标题重新开始。</small></div>',[['继续探索','close']])}
function openQ(){let h='';QUESTS.forEach(q=>{const s=QS[q.id];if(s.st==='none')return;h+=`<p class="${s.st==='done'?'q-done':''}"><b>${q.n}</b> ${s.st==='done'?'（已完成）':s.c>=q.need?'（可交付）':`${s.c}/${q.need}`}<br><small>${q.d}</small></p>`});$('qbody').innerHTML=h||'<p>还没有任务。去金色小镇找<b>卫兵队长</b>吧。</p><p><small>（从北郡修道院沿大路往东南走）</small></p>';$('pq').style.display='block'}
function openB(){const st=stats();let h=`<p><b>人类战士</b> 等级 ${P.lvl}　生命 ${Math.ceil(P.hp)}/${st.hp}　攻击 ${st.atk}　护甲 ${st.def}　治疗药水 ×${P.pots}</p><b>装备</b>（点击卸下）<br>`;
 for(const s in SLOTN){const it=ITEMS[P.eq[s]];h+=`<div class="item" data-un="${s}">${SLOTN[s]}：${it?`<span class="${it.q}">${it.n}</span>`:'—'}</div>`}
 h+='<br><br><b>背包</b>（点击装备）<br>';if(!P.inv.length)h+='<small>空空如也</small>';P.inv.forEach((id,i)=>{const it=ITEMS[id];h+=`<div class="item" data-eq="${i}"><span class="${it.q}">${it.n}</span><br><small>${SLOTN[it.s]} ${it.atk?'攻击+'+it.atk:''} ${it.def?'护甲+'+it.def:''} ${it.hp?'生命+'+it.hp:''}</small></div>`});
 $('bbody').innerHTML=h;$('pb').style.display='block';
 $('bbody').querySelectorAll('[data-eq]').forEach(el=>el.addEventListener('pointerdown',()=>{const i=+el.dataset.eq,id=P.inv[i],s=ITEMS[id].s;P.inv.splice(i,1);if(P.eq[s])P.inv.push(P.eq[s]);P.eq[s]=id;P.hp=Math.min(P.hp,stats().hp);SFX.loot();save();openB()}));
 $('bbody').querySelectorAll('[data-un]').forEach(el=>el.addEventListener('pointerdown',()=>{const s=el.dataset.un;if(P.eq[s]){P.inv.push(P.eq[s]);delete P.eq[s];P.hp=Math.min(P.hp,stats().hp);save();openB()}}))}
// ---------- UPDATE ----------
function collide(o,r){o.x=clamp(o.x,20,W-20);o.y=clamp(o.y,20,H-20);for(const b of obs){if(b.t==='c'){const dx=o.x-b.x,dy=o.y-b.y,d=Math.hypot(dx,dy),m=b.r+r;if(d<m&&d>0){o.x=b.x+dx/d*m;o.y=b.y+dy/d*m}}else if(inRect(o.x,o.y,b,r)){const l=o.x-(b.x-r),rr=b.x+b.w+r-o.x,t=o.y-(b.y-r),bt=b.y+b.h+r-o.y,mn=Math.min(l,rr,t,bt);if(mn===l)o.x=b.x-r;else if(mn===rr)o.x=b.x+b.w+r;else if(mn===t)o.y=b.y-r;else o.y=b.y+b.h+r}}}
const cam={x:560,y:560};let saveT=0;
function update(dt){tm+=dt;const st=stats();
 for(const k in P.cds)P.cds[k]=Math.max(0,P.cds[k]-dt);P.swing=Math.max(0,P.swing-dt);P.hurt=Math.max(0,P.hurt-dt);
 if(P.dead){P.dead-=dt;if(P.dead<=0){P.dead=0;P.x=560;P.y=560;P.hp=st.hp*.6;P.rage=0;save()}}
 else if(P.dash){const e=P.dash.e,a=Math.atan2(e.y-P.y,e.x-P.x);P.face=a;const d=D(P,e);const s=900*dt;if(d>e.T.r+20&&P.dash.t>0){P.x+=Math.cos(a)*Math.min(s,d);P.y+=Math.sin(a)*Math.min(s,d);P.dash.t-=dt;if(Math.random()<.6)fx.push({k:'dust',x:P.x,y:P.y+10,life:.4})}else{P.dash=null;e.stun=1.2;dmgE(e,st.atk*.6,false);ftxt(e.x,e.y-55,'昏迷','#ffd24a')}collide(P,14)}
 else if(!dialog){let mx=0,my=0;if(keys.a||keys.arrowleft)mx--;if(keys.d||keys.arrowright)mx++;if(keys.w||keys.arrowup)my--;if(keys.s||keys.arrowdown)my++;
  if(joy){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy);if(d>8){const k=Math.min(1,d/55);mx=dx/d*k;my=dy/d*k}}
  const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}const sp=175;P.x+=mx*sp*dt;P.y+=my*sp*dt;if(m>.05){P.face=Math.atan2(my,mx);P.anim+=dt*m*10}collide(P,14);
  if(atkHeld&&P.cds.atk<=0){const e=pickT(72);if(e){swingAt(e,1);P.cds.atk=.9}else{P.cds.atk=.3;if(!P.swing){P.swing=.2;SFX.swing()}}}}
 if(!enemies.some(e=>e.st==='chase'&&!e.dead))P.rage=Math.max(0,P.rage-dt*3);
 if(!P.dead&&!enemies.some(e=>e.st==='chase'&&!e.dead)&&P.hp<st.hp)P.hp=Math.min(st.hp,P.hp+st.hp*.02*dt);
 // enemies
 for(const e of enemies){e.anim+=dt;e.hurt=Math.max(0,e.hurt-dt);if(e.bubble){e.bubble.life-=dt;if(e.bubble.life<=0)e.bubble=null}
  if(e.dead){e.resp-=dt;if(e.resp<=0){Object.assign(e,mkE(e.t,e.hx,e.hy,e.sp))}continue}
  if(e.stun>0){e.stun-=dt;continue}e.slow=Math.max(0,e.slow-dt);const sp=e.T.sp*(e.slow?.5:1)*(e.enr?1.3:1);
  const dp=D(e,P),dh=Math.hypot(e.x-e.hx,e.y-e.hy);
  if(e.st==='idle'){e.wt-=dt;if(e.wt<=0){e.wt=R(2,5);e.tx=e.hx+R(-80,80);e.ty=e.hy+R(-80,80)}const d=Math.hypot(e.tx-e.x,e.ty-e.y);if(d>5){e.x+=(e.tx-e.x)/d*sp*.35*dt;e.y+=(e.ty-e.y)/d*sp*.35*dt;e.face=Math.sign(e.tx-e.x)||e.face}
   if(!P.dead&&dp<e.T.ag*(e.lvl>P.lvl+1?1.2:.8)){e.st='chase';if(e.T.say)e.bubble={t:e.T.say[RI(0,e.T.say.length-1)],life:2.5}}}
  else if(e.st==='chase'){if(P.dead||dh>600){e.st='return';continue}e.face=Math.sign(P.x-e.x)||e.face;const reach=e.T.r+22;
   if(dp>reach){e.x+=(P.x-e.x)/dp*sp*dt;e.y+=(P.y-e.y)/dp*sp*dt}else{e.cd-=dt;if(e.cd<=0){e.cd=e.T.boss?1.3:1.5;e.atk=.25;hurtP(R(e.T.dmg[0],e.T.dmg[1])*(e.enr?1.3:1),e)}}
   if(e.T.boss){e.special-=dt;if(e.special<=0&&!e.slam){e.slam={x:P.x,y:P.y,t:1.2};e.bubble={t:'霍格 准备猛击地面！',life:1.5};e.special=e.enr?5:7}
    if(e.slam){e.slam.t-=dt;if(e.slam.t<=0){fx.push({k:'thunder',x:e.slam.x,y:e.slam.y,life:.5,c:'#c84a1a'});SFX.thunder();if(Math.hypot(P.x-e.slam.x,P.y-e.slam.y)<110)hurtP(35,e);e.slam=null}}}}
  else if(e.st==='return'){const d=dh;if(d<10){e.st='idle';e.hp=e.mhp;e.enr=0}else{e.x+=(e.hx-e.x)/d*sp*1.5*dt;e.y+=(e.hy-e.y)/d*sp*1.5*dt;e.hp=Math.min(e.mhp,e.hp+e.mhp*dt)}}
  if(e.atk)e.atk=Math.max(0,e.atk-dt);collide(e,e.T.r*.7)}
 // separation
 for(const e of enemies){if(e.dead)continue;const d=D(e,P);if(d<e.T.r+12&&d>0){e.x+=(e.x-P.x)/d*2;e.y+=(e.y-P.y)/d*2}}
 fx=fx.filter(f=>(f.life-=dt)>0);texts=texts.filter(t=>{t.life-=dt;t.y-=30*dt;return t.life>0});
 cam.x+=(P.x-cam.x)*Math.min(1,dt*8);cam.y+=(P.y-cam.y)*Math.min(1,dt*8);
 const nn=nearNpc();$('act').style.display=nn&&!dialog?'flex':'none';
 [['s1',0],['s2',8],['s3',6]].forEach(([id,m])=>{const c=$(id).querySelector('.cd');const v=m?P.cds[id]/m:P.cds.gcd/.8;c.style.height=(v*100)+'%';$(id).style.opacity=(id==='s1'&&P.rage<15)||(id==='s3'&&P.rage<20)?.55:1});
 $('potn').textContent=P.pots;saveT+=dt;if(saveT>5){saveT=0;save()}}
// ---------- DRAW ----------
function shadow(x,y,r){cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(x,y,r,r*.45,0,0,7);cx.fill()}
function drawWarrior(x,y,face,anim,swing,hurt){const step=Math.sin(anim)*4,fl=Math.cos(face)<0?-1:1;shadow(x,y+14,14);cx.save();cx.translate(x,y);cx.scale(fl,1);
 const eq=P.eq;// legs
 cx.fillStyle=eq.legs?'#6b4a2a':'#4a3a6a';cx.fillRect(-7,4+step*.3,5,12-step*.5);cx.fillRect(2,4-step*.3,5,12+step*.5);cx.fillStyle='#2a1a0a';cx.fillRect(-8,14+step*.3,7,4);cx.fillRect(2,14-step*.3,7,4);
 // body
 cx.fillStyle=eq.chest==='chest1'?'#9aa4b0':'#8a6a3a';cx.beginPath();cx.roundRect(-10,-12,20,18,4);cx.fill();
 if(eq.chest==='chest1'){cx.fillStyle='#2a4a9a';cx.fillRect(-4,-11,8,16);cx.fillStyle='#e8c14a';cx.fillRect(-2,-6,4,4)}
 cx.fillStyle='#5a3a1a';cx.fillRect(-10,2,20,3);// belt
 // shield (back arm)
 cx.fillStyle='#2a4a9a';cx.beginPath();cx.moveTo(-15,-8);cx.lineTo(-7,-8);cx.lineTo(-7,4);cx.lineTo(-11,8);cx.lineTo(-15,4);cx.fill();cx.strokeStyle='#e8c14a';cx.lineWidth=1.5;cx.stroke();
 // head
 cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();
 if(eq.head){cx.fillStyle='#c8a050';cx.beginPath();cx.arc(0,-21,8.5,Math.PI,0);cx.fill();cx.fillStyle='#fff6a0';cx.beginPath();cx.arc(0,-28,3,0,7);cx.fill()}
 else{cx.fillStyle='#6a4a2a';cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill()}
 cx.fillStyle='#222';cx.fillRect(3,-20,2,2);
 // sword arm
 const sa=swing>0?(-1.6+(1-swing/.25)*2.6):0.5;cx.save();cx.translate(9,-6);cx.rotate(sa);cx.fillStyle='#f0c8a0';cx.fillRect(-2,0,4,8);
 const sw=eq.weapon==='sword2'?'#bfe8ff':eq.weapon==='sword1'?'#d0d0d8':'#a07a4a';cx.fillStyle='#6b4a22';cx.fillRect(-1.5,7,3,5);cx.fillStyle='#e8c14a';cx.fillRect(-5,11,10,2.5);cx.fillStyle=sw;cx.fillRect(-2,13,4,eq.weapon==='sword2'?24:18);
 if(eq.weapon==='sword2'){cx.fillStyle='rgba(150,220,255,.4)';cx.fillRect(-4,13,8,24)}cx.restore();
 if(hurt>0){cx.globalCompositeOperation='source-atop';cx.fillStyle='rgba(255,0,0,.4)';cx.fillRect(-20,-32,40,52);cx.globalCompositeOperation='source-over'}
 cx.restore();
 if(swing>0){cx.strokeStyle=`rgba(255,255,255,${swing*3})`;cx.lineWidth=3;cx.beginPath();cx.arc(x,y-4,30,face-1,face+1);cx.stroke()}}
function drawWolf(e){const s=Math.sin(e.anim*(e.st==='chase'?14:6))*3,fl=e.face;shadow(e.x,e.y+10,18);cx.save();cx.translate(e.x,e.y);cx.scale(fl,1);
 cx.fillStyle='#5a5560';[[-12,s],[-6,-s],[8,s],[13,-s]].forEach(([lx,o])=>cx.fillRect(lx,4,4,10+o*.5));
 cx.fillStyle='#6e6a76';cx.beginPath();cx.ellipse(0,0,19,9,0,0,7);cx.fill();cx.fillStyle='#8a8692';cx.beginPath();cx.ellipse(0,-3,15,5,0,0,7);cx.fill();
 cx.save();cx.translate(-18,-4);cx.rotate(-.5+Math.sin(e.anim*5)*.3);cx.fillStyle='#6e6a76';cx.fillRect(-12,-2,13,5);cx.restore();
 cx.fillStyle='#6e6a76';cx.beginPath();cx.moveTo(14,-10);cx.lineTo(30,-4);cx.lineTo(28,2);cx.lineTo(14,3);cx.fill();
 cx.beginPath();cx.moveTo(15,-10);cx.lineTo(18,-18);cx.lineTo(21,-9);cx.fill();cx.fillStyle=e.st==='chase'?'#ff3a2a':'#ffd24a';cx.fillRect(22,-6,3,2);
 if(e.atk){cx.fillStyle='#fff';cx.fillRect(26,0,4,2)}cx.restore()}
function drawKobold(e,big){const s=Math.sin(e.anim*(e.st==='chase'?12:5))*3,k=big?1.35:1;shadow(e.x,e.y+12*k,13*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle='#8a5a3a';cx.fillRect(-6,4,4,10+s*.4);cx.fillRect(2,4,4,10-s*.4);
 cx.fillStyle='#a06a42';cx.beginPath();cx.ellipse(0,-2,10,11,0,0,7);cx.fill();cx.fillStyle='#6a4a2a';cx.fillRect(-9,0,18,6);
 cx.fillStyle='#a06a42';cx.beginPath();cx.ellipse(3,-15,9,7,0,0,7);cx.fill();cx.beginPath();cx.moveTo(8,-17);cx.lineTo(18,-13);cx.lineTo(8,-10);cx.fill();
 cx.fillStyle='#ffe';cx.fillRect(9,-16,2,2);cx.fillStyle='#000';cx.fillRect(9,-16,1,1);
 // helmet+candle
 cx.fillStyle=big?'#c8a050':'#8a8a8a';cx.beginPath();cx.arc(2,-18,8,Math.PI,0);cx.fill();cx.fillStyle='#fff8e0';cx.fillRect(0,-30,4,9);
 const fl=Math.sin(tm*20)*1.5;cx.fillStyle='#ffb02a';cx.beginPath();cx.ellipse(2,-33,2.5,4+fl*.3,0,0,7);cx.fill();cx.fillStyle='rgba(255,220,100,.18)';cx.beginPath();cx.arc(2,-32,14,0,7);cx.fill();
 // pick
 cx.save();cx.translate(-8,-2);cx.rotate(e.atk?-1.5:.3);cx.fillStyle='#6b4a22';cx.fillRect(-1,-14,3,18);cx.fillStyle='#aaa';cx.fillRect(-7,-16,14,3);cx.restore();cx.restore()}
function drawGnoll(e,boss){const k=boss?1.9*(e.enr?1.08:1):1.15,s=Math.sin(e.anim*(e.st==='chase'?11:5))*3;shadow(e.x,e.y+14*k,13*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle=boss?'#7a5a2a':'#9a7a3a';cx.fillRect(-7,4,5,12+s*.4);cx.fillRect(2,4,5,12-s*.4);
 cx.fillStyle=boss?'#8a6a32':'#b08a4a';cx.beginPath();cx.ellipse(0,-4,11,13,0,0,7);cx.fill();
 cx.fillStyle='#5a2a1a';for(let i=0;i<4;i++)cx.fillRect(-8+i*5,-12+i%2*3,3,3);// spots
 if(boss){cx.fillStyle='#4a2a1a';cx.fillRect(-11,-6,22,8);}
 cx.fillStyle=boss?'#8a6a32':'#b08a4a';cx.beginPath();cx.ellipse(4,-19,9,7,0,0,7);cx.fill();cx.beginPath();cx.moveTo(9,-22);cx.lineTo(19,-17);cx.lineTo(9,-13);cx.fill();
 cx.fillStyle='#3a2a1a';cx.beginPath();cx.moveTo(-1,-24);cx.lineTo(-3,-32);cx.lineTo(3,-25);cx.fill();cx.fillStyle=e.enr?'#ff2a2a':'#ffd24a';cx.fillRect(9,-21,2,2);
 cx.fillStyle='#4a2a10';for(let i=0;i<5;i++)cx.fillRect(-6+i*2,-27+Math.abs(i-2),2,6);// mane
 cx.save();cx.translate(10,-6);cx.rotate(e.atk?1.2:-.4);cx.fillStyle='#5a3a1a';cx.fillRect(-2,-16,4,20);cx.fillStyle=boss?'#666':'#7a5a3a';cx.beginPath();cx.arc(0,-18,boss?7:5,0,7);cx.fill();if(boss){cx.fillStyle='#ccc';[0,1.6,3.2,4.8].forEach(a=>cx.fillRect(Math.cos(a)*7-1,-18+Math.sin(a)*7-1,3,3))}cx.restore();
 cx.restore()}
function drawNpc(n){shadow(n.x,n.y+14,13);cx.save();cx.translate(n.x,n.y);
 if(n.k==='priest'){cx.fillStyle='#e8e0d0';cx.beginPath();cx.moveTo(-11,16);cx.lineTo(-8,-12);cx.lineTo(8,-12);cx.lineTo(11,16);cx.fill();cx.fillStyle='#e8c14a';cx.fillRect(-1,-10,2,22);cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#d8c070';cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill()}
 else if(n.k==='inn'){cx.fillStyle='#7a4a2a';cx.fillRect(-7,4,5,12);cx.fillRect(2,4,5,12);cx.fillStyle='#a05a2a';cx.beginPath();cx.ellipse(0,-2,12,12,0,0,7);cx.fill();cx.fillStyle='#fff';cx.fillRect(-8,-4,16,12);cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#4a2a1a';cx.fillRect(-6,-15,12,3)}
 else{cx.fillStyle='#3a3a4a';cx.fillRect(-7,4,5,12);cx.fillRect(2,4,5,12);cx.fillStyle='#aab0bc';cx.beginPath();cx.roundRect(-11,-12,22,18,4);cx.fill();cx.fillStyle='#2a4a9a';cx.fillRect(-5,-11,10,17);cx.fillStyle='#e8c14a';cx.beginPath();cx.moveTo(0,-8);cx.lineTo(3,-3);cx.lineTo(0,2);cx.lineTo(-3,-3);cx.fill();
  cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#aab0bc';cx.beginPath();cx.arc(0,-21,9,Math.PI,0);cx.fill();cx.fillStyle='#8a2a1a';cx.fillRect(-1,-34,2,6);cx.fillStyle='#6a5a4a';cx.fillRect(-5,-15,10,3);
  cx.fillStyle='#6b4a22';cx.fillRect(13,-30,2,46);cx.fillStyle='#ccc';cx.beginPath();cx.moveTo(14,-40);cx.lineTo(17,-30);cx.lineTo(11,-30);cx.fill()}
 cx.restore();
 // quest marker
 if(n.k==='captain'){const ready=QUESTS.some(q=>QS[q.id].st==='active'&&QS[q.id].c>=q.need),av=QUESTS.some(q=>QS[q.id].st==='none'&&(q.id!=='q4'||['q1','q2','q3'].every(i=>QS[i].st==='done')));
  if(ready||av){const by=n.y-52+Math.sin(tm*4)*3;cx.font='bold 26px sans-serif';cx.textAlign='center';cx.lineWidth=4;cx.strokeStyle='#000';cx.strokeText(ready?'?':'!',n.x,by);cx.fillStyle='#ffd200';cx.fillText(ready?'?':'!',n.x,by)}}
 nameTag(n.n,n.x,n.y-36,'#7fff7f',n.ttl)}
function nameTag(t,x,y,c,sub){cx.font='bold 11px sans-serif';cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(t,x,y);cx.fillStyle=c;cx.fillText(t,x,y);if(sub){cx.font='9px sans-serif';cx.strokeText('<'+sub+'>',x,y+11);cx.fillStyle='#ddd';cx.fillText('<'+sub+'>',x,y+11)}}
function drawTree(t){shadow(t.x+4,t.y+t.r*.5,t.r*.9);cx.fillStyle='#4a2e14';cx.fillRect(t.x-4,t.y-4,8,t.r*.6);const g=['#2e5a1e','#3a6a24','#2a4e1a'][Math.floor(t.c*3)];
 cx.fillStyle=g;cx.beginPath();cx.arc(t.x,t.y-t.r*.6,t.r,0,7);cx.fill();cx.fillStyle='rgba(255,255,200,.12)';cx.beginPath();cx.arc(t.x-t.r*.3,t.y-t.r*.9,t.r*.55,0,7);cx.fill();cx.fillStyle='rgba(0,0,0,.15)';cx.beginPath();cx.arc(t.x+t.r*.35,t.y-t.r*.3,t.r*.5,0,7);cx.fill()}
function drawBuilding(b){cx.fillStyle='rgba(0,0,0,.3)';cx.fillRect(b.x+8,b.y+12,b.w,b.h);
 if(b.k==='abbey'){cx.fillStyle='#b8b0a0';cx.fillRect(b.x,b.y+40,b.w,b.h-40);for(let i=0;i<6;i++)for(let j=0;j<4;j++){cx.strokeStyle='#9a9282';cx.strokeRect(b.x+i*50,b.y+40+j*40,50,40)}
  cx.fillStyle='#5a6a8a';cx.beginPath();cx.moveTo(b.x-10,b.y+50);cx.lineTo(b.x+b.w/2,b.y-20);cx.lineTo(b.x+b.w+10,b.y+50);cx.fill();
  cx.fillStyle='#b8b0a0';cx.fillRect(b.x+b.w/2-30,b.y-70,60,120);cx.fillStyle='#5a6a8a';cx.beginPath();cx.moveTo(b.x+b.w/2-38,b.y-60);cx.lineTo(b.x+b.w/2,b.y-120);cx.lineTo(b.x+b.w/2+38,b.y-60);cx.fill();
  cx.fillStyle='#e8c14a';cx.fillRect(b.x+b.w/2-3,b.y-150,6,32);cx.fillRect(b.x+b.w/2-12,b.y-142,24,6);
  cx.fillStyle='#4a3a6a';cx.beginPath();cx.arc(b.x+b.w/2,b.y-20,14,0,7);cx.fill();cx.fillStyle='#4a2e14';cx.beginPath();cx.roundRect(b.x+b.w/2-22,b.y+b.h-60,44,60,[22,22,0,0]);cx.fill();
  for(const wx of[50,90,210,250]){cx.fillStyle='#3a5a9a';cx.beginPath();cx.roundRect(b.x+wx-8,b.y+80,16,34,[8,8,0,0]);cx.fill()}return}
 cx.fillStyle='#e8dcc0';cx.fillRect(b.x,b.y+30,b.w,b.h-30);cx.strokeStyle='#5a3a1a';cx.lineWidth=5;cx.strokeRect(b.x,b.y+30,b.w,b.h-30);cx.beginPath();cx.moveTo(b.x,b.y+30);cx.lineTo(b.x+b.w,b.y+b.h);cx.moveTo(b.x+b.w/2,b.y+30);cx.lineTo(b.x+b.w/2,b.y+b.h);cx.stroke();
 cx.fillStyle=b.k==='inn'?'#8a3a2a':'#6a4a6a';cx.beginPath();cx.moveTo(b.x-12,b.y+40);cx.lineTo(b.x+b.w/2,b.y-30);cx.lineTo(b.x+b.w+12,b.y+40);cx.fill();cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=2;for(let i=0;i<5;i++){cx.beginPath();cx.moveTo(b.x-12+i*8,b.y+40-i*14);cx.lineTo(b.x+b.w+12-i*8,b.y+40-i*14);cx.stroke()}
 cx.fillStyle='#4a2e14';cx.fillRect(b.x+b.w/2-12,b.y+b.h-36,24,36);cx.fillStyle='#ffe08a';cx.fillRect(b.x+16,b.y+50,20,18);cx.fillRect(b.x+b.w-36,b.y+50,20,18);
 if(b.k==='inn'){cx.fillStyle='#6b4a22';cx.fillRect(b.x+b.w+4,b.y+60,4,40);cx.fillStyle='#e8c14a';cx.fillRect(b.x+b.w-10,b.y+64,32,18);cx.fillStyle='#5a1a00';cx.font='bold 11px sans-serif';cx.textAlign='center';cx.fillText('旅店',b.x+b.w+6,b.y+77)}}
function drawProp(p){if(p.k==='rock'){cx.fillStyle='#5a5048';cx.beginPath();cx.ellipse(p.x,p.y,p.r,p.r*.8,0,0,7);cx.fill();cx.fillStyle='#7a7068';cx.beginPath();cx.ellipse(p.x-5,p.y-6,p.r*.6,p.r*.4,0,0,7);cx.fill()}
 else if(p.k==='candle'){cx.fillStyle='#fff8e0';cx.fillRect(p.x-2,p.y-8,4,8);cx.fillStyle='#ffb02a';cx.fillRect(p.x-1.5,p.y-12+Math.sin(tm*15+p.x)*1,3,4);cx.fillStyle='rgba(255,200,80,.15)';cx.beginPath();cx.arc(p.x,p.y-8,20,0,7);cx.fill()}
 else if(p.k==='cart'){cx.fillStyle='#5a3a1a';cx.fillRect(p.x-20,p.y-12,40,22);cx.fillStyle='#333';cx.fillRect(p.x-16,p.y-16,32,8);cx.fillStyle='#222';cx.beginPath();cx.arc(p.x-12,p.y+12,6,0,7);cx.arc(p.x+12,p.y+12,6,0,7);cx.fill()}
 else if(p.k==='fire'){cx.fillStyle='#4a3a2a';cx.beginPath();cx.arc(p.x,p.y,18,0,7);cx.fill();for(let i=0;i<3;i++){cx.fillStyle=['#ff6a1a','#ffb02a','#fff06a'][i];cx.beginPath();cx.ellipse(p.x,p.y-6-i*3,12-i*3.5,(16-i*4)*(1+Math.sin(tm*12+i)*.12),0,0,7);cx.fill()}cx.fillStyle='rgba(255,140,40,.12)';cx.beginPath();cx.arc(p.x,p.y,70,0,7);cx.fill()}
 else if(p.k==='tent'){cx.fillStyle='#8a6a3a';cx.beginPath();cx.moveTo(p.x-40,p.y+20);cx.lineTo(p.x,p.y-40);cx.lineTo(p.x+40,p.y+20);cx.fill();cx.fillStyle='#3a2a1a';cx.beginPath();cx.moveTo(p.x-10,p.y+20);cx.lineTo(p.x,p.y-10);cx.lineTo(p.x+10,p.y+20);cx.fill()}
 else if(p.k==='well'){cx.fillStyle='#8a8478';cx.beginPath();cx.arc(p.x,p.y,18,0,7);cx.fill();cx.fillStyle='#2a4a6a';cx.beginPath();cx.arc(p.x,p.y,11,0,7);cx.fill();cx.fillStyle='#6b4a22';cx.fillRect(p.x-20,p.y-30,4,30);cx.fillRect(p.x+16,p.y-30,4,30);cx.fillStyle='#8a3a2a';cx.fillRect(p.x-24,p.y-36,48,8)}
 else if(p.k==='board'){cx.fillStyle='#6b4a22';cx.fillRect(p.x-2,p.y-10,4,20);cx.fillStyle='#c8a46a';cx.fillRect(p.x-18,p.y-32,36,24);cx.fillStyle='#f6e7bf';cx.fillRect(p.x-14,p.y-29,13,17);cx.fillRect(p.x+2,p.y-29,12,17);cx.fillStyle='#a01a0a';cx.font='bold 7px sans-serif';cx.textAlign='center';cx.fillText('通缉',p.x-7,p.y-20)}}
function bar(x,y,w,h,v,c,bg='#200'){cx.fillStyle='#000';cx.fillRect(x-1,y-1,w+2,h+2);cx.fillStyle=bg;cx.fillRect(x,y,w,h);cx.fillStyle=c;cx.fillRect(x,y,w*clamp(v,0,1),h)}
function frame(x,y,name,lvl,hp,mhp,c2,v2,txt2,face){cx.fillStyle='rgba(20,12,4,.8)';cx.beginPath();cx.roundRect(x,y,200,52,8);cx.fill();cx.strokeStyle='#c9a24a';cx.lineWidth=2;cx.stroke();
 cx.fillStyle='#2a1a08';cx.beginPath();cx.arc(x+26,y+26,21,0,7);cx.fill();cx.stroke();face&&face(x+26,y+26);
 cx.font='bold 12px sans-serif';cx.textAlign='left';cx.fillStyle='#ffd24a';cx.fillText(name,x+52,y+14);cx.textAlign='right';cx.fillStyle='#fff';cx.fillText(lvl,x+192,y+14);
 bar(x+52,y+19,140,12,hp/mhp,'#2ac83a');cx.font='bold 9px sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText(Math.ceil(hp)+' / '+mhp,x+122,y+29);
 if(c2){bar(x+52,y+34,140,9,v2,c2);cx.fillText(txt2,x+122,y+42)}}
function draw(){cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#000';cx.fillRect(0,0,VW,VH);
 cx.save();cx.translate(VW/2,VH/2);cx.scale(SC,SC);cx.translate(-Math.round(cam.x),-Math.round(cam.y));
 cx.imageSmoothingEnabled=true;cx.drawImage(ground,0,0,W,H);
 const vx0=cam.x-VW/2/SC-100,vx1=cam.x+VW/2/SC+100,vy0=cam.y-VH/2/SC-100,vy1=cam.y+VH/2/SC+150,vis=o=>o.x>vx0&&o.x<vx1&&o.y>vy0&&o.y<vy1;
 props.filter(p=>p.k!=='fire'&&p.k!=='candle'&&vis(p)).forEach(drawProp);props.filter(p=>p.k==='candle'&&vis(p)).forEach(drawProp);
 // telegraphs
 enemies.forEach(e=>{if(e.slam){cx.fillStyle=`rgba(255,60,20,${.15+.25*(1-e.slam.t/1.2)})`;cx.beginPath();cx.ellipse(e.slam.x,e.slam.y,110,70,0,0,7);cx.fill();cx.strokeStyle='#ff4a1a';cx.lineWidth=2;cx.stroke()}});
 if(target&&!target.dead){cx.strokeStyle='#ff3a2a';cx.lineWidth=2;cx.beginPath();cx.ellipse(target.x,target.y+target.T.r*.6,target.T.r+6,(target.T.r+6)*.45,0,0,7);cx.stroke()}
 // y-sorted entities
 const L=[];trees.forEach(t=>vis(t)&&L.push({y:t.y,f:()=>drawTree(t)}));rects.forEach(b=>L.push({y:b.y+b.h,f:()=>drawBuilding(b)}));props.filter(p=>p.k==='fire').forEach(p=>L.push({y:p.y,f:()=>drawProp(p)}));
 npcs.forEach(n=>vis(n)&&L.push({y:n.y,f:()=>drawNpc(n)}));
 enemies.forEach(e=>{if(e.dead||!vis(e))return;L.push({y:e.y,f:()=>{if(e.hurt>0)cx.globalAlpha=.6;if(e.t==='wolf')drawWolf(e);else if(e.t==='kobold')drawKobold(e);else if(e.t==='foreman')drawKobold(e,1);else drawGnoll(e,e.t==='hogger');cx.globalAlpha=1;
  const hy=e.y-(e.t==='hogger'?78:e.t==='foreman'?58:42);nameTag(e.T.n+(e.T.elite?' (精英)':'')+(e.T.boss?' (首领)':''),e.x,hy-6,e.st==='chase'?'#ff5a4a':'#ffd24a');if(e.hp<e.mhp)bar(e.x-20,hy,40,4,e.hp/e.mhp,'#e83a2a');
  if(e.stun>0){cx.fillStyle='#ffd24a';for(let i=0;i<3;i++){const a=tm*6+i*2.1;cx.fillRect(e.x+Math.cos(a)*12-2,hy-14+Math.sin(a)*4,4,4)}}
  if(e.bubble){cx.font='bold 12px sans-serif';const w=cx.measureText(e.bubble.t).width+14;cx.fillStyle='rgba(255,255,240,.95)';cx.beginPath();cx.roundRect(e.x-w/2,hy-38,w,20,6);cx.fill();cx.fillStyle='#2a1a08';cx.textAlign='center';cx.fillText(e.bubble.t,e.x,hy-24)}}})});
 if(!P.dead)L.push({y:P.y,f:()=>{drawWarrior(P.x,P.y,P.face,P.anim,P.swing,P.hurt);nameTag('勇士',P.x,P.y-38,'#8ab4ff')}});
 else L.push({y:P.y,f:()=>{cx.globalAlpha=.5;cx.fillStyle='#ccd';cx.beginPath();cx.arc(P.x,P.y-10-((3-P.dead)*20),12,0,7);cx.fill();cx.globalAlpha=1}});
 L.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
 fx.forEach(f=>{const t=1-f.life/(f.k==='thunder'?.5:f.k==='lvl'?1.5:.8);if(f.k==='thunder'){cx.strokeStyle=f.c||'#8ad0ff';cx.lineWidth=6*(1-t);cx.beginPath();cx.ellipse(f.x,f.y+5,130*t,80*t,0,0,7);cx.stroke();cx.fillStyle=`rgba(140,200,255,${.25*(1-t)})`;cx.fill()}
  if(f.k==='dust'){cx.fillStyle=`rgba(200,180,140,${f.life})`;cx.beginPath();cx.arc(f.x,f.y,8*(1.5-f.life),0,7);cx.fill()}
  if(f.k==='heal'||f.k==='lvl'){cx.strokeStyle=f.k==='lvl'?`rgba(255,220,80,${1-t})`:`rgba(100,255,120,${1-t})`;cx.lineWidth=3;for(let i=0;i<8;i++){const a=i/8*6.28+t*3;cx.beginPath();cx.moveTo(f.x+Math.cos(a)*20,f.y-t*60+Math.sin(a)*8);cx.lineTo(f.x+Math.cos(a)*20,f.y-t*60+Math.sin(a)*8-10);cx.stroke()}}});
 texts.forEach(t=>{cx.globalAlpha=Math.min(1,t.life*2);cx.font=`bold ${t.big?20:14}px sans-serif`;cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(t.t,t.x,t.y);cx.fillStyle=t.c;cx.fillText(t.t,t.x,t.y);cx.globalAlpha=1});
 // mine darkness
 if(inRect(P.x,P.y,MINE)){cx.fillStyle='rgba(0,0,10,.35)';cx.fillRect(MINE.x-40,MINE.y-40,MINE.w+80,MINE.h+80)}
 cx.restore();
 // HUD
 const sl=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sl'))||0,st=stats(),hx=8+sl,hy=8;
 frame(hx,hy,'人类战士',P.lvl+'级',P.hp,st.hp,'#c8201a',P.rage/100,'怒气 '+Math.floor(P.rage),(x,y)=>{cx.save();cx.beginPath();cx.arc(x,y,20,0,7);cx.clip();cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(x,y+4,12,0,7);cx.fill();cx.fillStyle='#6a4a2a';cx.beginPath();cx.arc(x,y,12,Math.PI,0);cx.fill();cx.fillStyle='#9aa4b0';cx.fillRect(x-14,y+14,28,8);cx.restore()});
 if(target&&!target.dead)frame(hx+210,hy,target.T.n,target.lvl+'级',target.hp,target.mhp,null,0,'',(x,y)=>{cx.fillStyle=target.t==='wolf'?'#6e6a76':target.t==='hogger'?'#8a6a32':'#a06a42';cx.beginPath();cx.arc(x,y,14,0,7);cx.fill();cx.fillStyle='#ff3a2a';cx.fillRect(x+3,y-4,4,3)});
 // xp bar
 const xw=Math.min(500,VW*.45);bar(VW/2-xw/2,VH-10-(sl?4:0),xw,6,P.lvl>=5?1:P.xp/XPN[P.lvl],'#9a3ad8','#1a0a2a');cx.font='9px sans-serif';cx.fillStyle='#fff';cx.textAlign='center';cx.fillText(P.lvl>=5?'已达最高等级':`经验 ${P.xp}/${XPN[P.lvl]}`,VW/2,VH-13);
 // zone + minimap
 const z=ZONES.find(z=>inRect(P.x,P.y,z));cx.font='bold 13px sans-serif';cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(z.n,VW-70-sl,46+120*H/W+16);cx.fillStyle='#ffd24a';cx.fillText(z.n,VW-70-sl,46+120*H/W+16);
 const mw=120,mh=mw*H/W,mx=VW-mw-10-sl,my=46;cx.globalAlpha=.85;cx.drawImage(ground,mx,my,mw,mh);cx.globalAlpha=1;cx.strokeStyle='#c9a24a';cx.lineWidth=2;cx.strokeRect(mx,my,mw,mh);
 const ms=mw/W;rects.forEach(b=>{cx.fillStyle='#ddd';cx.fillRect(mx+b.x*ms,my+b.y*ms,b.w*ms,b.h*ms)});npcs.forEach(n=>{if(n.k==='captain'){cx.fillStyle='#ffd200';cx.fillRect(mx+n.x*ms-2,my+n.y*ms-2,4,4)}});
 if(QS.q4&&QS.q4.st==='active'){const hg=enemies.find(e=>e.t==='hogger');cx.fillStyle='#ff2a2a';cx.fillRect(mx+hg.hx*ms-2,my+hg.hy*ms-2,5,5)}
 cx.fillStyle='#fff';cx.beginPath();cx.arc(mx+P.x*ms,my+P.y*ms,2.5,0,7);cx.fill();
 // joystick
 if(joy){cx.globalAlpha=.5;cx.fillStyle='#000';cx.beginPath();cx.arc(joy.ox,joy.oy,55,0,7);cx.fill();cx.strokeStyle='#c9a24a';cx.lineWidth=3;cx.stroke();const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.min(55,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);cx.fillStyle='#c9a24a';cx.beginPath();cx.arc(joy.ox+Math.cos(a)*d,joy.oy+Math.sin(a)*d,24,0,7);cx.fill();cx.globalAlpha=1}
 else if(tm<20&&'ontouchstart' in window){cx.globalAlpha=.25+.1*Math.sin(tm*3);cx.strokeStyle='#ffe9a8';cx.lineWidth=3;cx.beginPath();cx.arc(90+sl,VH-90,50,0,7);cx.stroke();cx.font='12px sans-serif';cx.fillStyle='#ffe9a8';cx.textAlign='center';cx.fillText('按住拖动移动',90+sl,VH-86);cx.globalAlpha=1}
 if(P.dead){cx.fillStyle='rgba(60,60,80,.4)';cx.fillRect(0,0,VW,VH)}}
document.documentElement.style.setProperty('--sl','env(safe-area-inset-left)');
(function(){const d=document.createElement('div');d.style.cssText='position:fixed;left:env(safe-area-inset-left);top:0;width:0;height:0';document.body.appendChild(d);setInterval(()=>{document.documentElement.style.setProperty('--sl',d.getBoundingClientRect().left+'px')},1000)})();
let last=performance.now(),running=false;
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(running){update(dt);draw()}requestAnimationFrame(loop)}
$('start').addEventListener('pointerdown',()=>{unlock();if(!P)newGame();$('title').style.display='none';running=true;spawnAll();if(!QS.q1||QS.q1.st==='none')setTimeout(()=>toast('去金色小镇找<b>卫兵队长</b>吧！<br><span style="font-size:13px">沿大路往东南走</span>',3500),500)});
$('reset').addEventListener('pointerdown',()=>{if(confirm('确定要删除存档重新开始吗？')){localStorage.removeItem('elwynn_save_v1');newGame();$('start').textContent='开始冒险'}});
if(load())$('start').textContent='继续冒险 (等级 '+P.lvl+')';else newGame();
requestAnimationFrame(loop);
window.G={get P(){return P},get QS(){return QS},get enemies(){return enemies},get won(){return won},interact,skill,stats,save,tp:(x,y)=>{P.x=x;P.y=y;cam.x=x;cam.y=y},npcs};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
