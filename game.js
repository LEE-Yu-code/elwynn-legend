'use strict';
(()=>{
const DEV=/[?&]dev\b/.test(location.search);
const cv=document.getElementById('c'),cx=cv.getContext('2d');
let W=3200,H=2200,DPR=1,VW=0,VH=0,SC=1;
function resize(){DPR=Math.min(2,window.devicePixelRatio||1);VW=innerWidth;VH=innerHeight;cv.width=VW*DPR;cv.height=VH*DPR;SC=Math.max(0.8,Math.min(1.6,VH/430));}
addEventListener('resize',resize);resize();
const $=id=>document.getElementById(id);
const R=(a,b)=>a+Math.random()*(b-a),RI=(a,b)=>Math.floor(R(a,b+1)),D=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>v<a?a:v>b?b:v;
let seed=7;const sr=()=>(seed=(seed*16807)%2147483647)/2147483647;
// ---------- AUDIO ----------
let AC=null,muted=false;
function unlock(){if(!AC){try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(AC&&AC.state!=='running')AC.resume();if(AC){const b=AC.createBuffer(1,1,22050),s=AC.createBufferSource();s.buffer=b;s.connect(AC.destination);s.start(0);}}
function tone(f,d,type='square',v=.08,slide=0,delay=0){if(!AC||muted)return;const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f+slide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(AC.destination);o.start(t);o.stop(t+d+.02);}
function noise(d,v=.15,fq=1200){if(!AC||muted)return;const t=AC.currentTime,n=AC.sampleRate*d,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*(1-i/n);const s=AC.createBufferSource(),f=AC.createBiquadFilter(),g=AC.createGain();s.buffer=b;f.type='lowpass';f.frequency.value=fq;g.gain.value=v;s.connect(f);f.connect(g);g.connect(AC.destination);s.start(t);}
const SFX={swing:()=>noise(.12,.12,2500),hit:()=>{noise(.1,.25,900);tone(140,.1,'square',.06,-60)},crit:()=>{noise(.2,.3,700);tone(90,.25,'sawtooth',.1,-40)},hurt:()=>tone(220,.15,'sawtooth',.07,-120),
 charge:()=>tone(200,.3,'sawtooth',.08,500),thunder:()=>{noise(.6,.4,300);tone(60,.5,'sine',.25,-20)},lvl:()=>[523,659,784,1047].forEach((f,i)=>tone(f,.25,'triangle',.1,0,i*.1)),
 quest:()=>[392,523,659].forEach((f,i)=>tone(f,.3,'triangle',.1,0,i*.12)),loot:()=>tone(880,.12,'triangle',.08,400),pot:()=>tone(400,.3,'sine',.1,500),die:()=>tone(300,.8,'sawtooth',.1,-250),
 win:()=>[523,659,784,659,784,1047].forEach((f,i)=>tone(f,.35,'triangle',.12,0,i*.15)),click:()=>tone(660,.05,'square',.04),
 cast:()=>tone(420,.35,'sine',.04,260),fire:()=>noise(.35,.25,700),frost:()=>{noise(.25,.15,3500);tone(1000,.25,'triangle',.05,-500)},holy:()=>[660,880].forEach((f,i)=>tone(f,.3,'sine',.07,0,i*.08)),
 shadow:()=>tone(130,.4,'sawtooth',.06,-50),arcane:()=>tone(700,.2,'sine',.05,600),learn:()=>[784,988,1175,1568].forEach((f,i)=>tone(f,.2,'triangle',.09,0,i*.09)),buff:()=>tone(520,.4,'triangle',.06,500)};
// ---------- MAPS ----------
function inRect(x,y,r,m=0){return x>r.x-m&&x<r.x+r.w+m&&y>r.y-m&&y<r.y+r.h+m}
function newMap(id,n,w,h){return{id,n,W:w,H:h,obs:[],trees:[],props:[],rects:[],roads:[],zones:[],portals:[],gates:[],spawns:[],npcs:[],dark:0}}
function nearRoad(m,x,y,wd=60){for(const r of m.roads){const[a,b,c,d]=r,dx=c-a,dy=d-b,t=clamp(((x-a)*dx+(y-b)*dy)/(dx*dx+dy*dy),0,1);if(Math.hypot(x-a-dx*t,y-b-dy*t)<wd)return true}return false}
function addRect(m,r){m.rects.push(r);m.obs.push({t:'r',...r})}
function addTree(m,x,y,r,kind){m.trees.push({x,y,r,c:sr(),kind});m.obs.push({t:'c',x,y,r:r*.55})}
function paintGround(m,fn){const c=document.createElement('canvas');c.width=m.W/2;c.height=m.H/2;const g=c.getContext('2d');g.scale(.5,.5);fn(g);m.ground=c}
function speck(g,m,cols,n){for(let i=0;i<n;i++){g.fillStyle=cols[i%cols.length];g.fillRect(sr()*m.W,sr()*m.H,4+sr()*10,3+sr()*6)}}
function paintRoads(g,m,c1,c2){g.lineCap='round';g.strokeStyle=c1;g.lineWidth=70;m.roads.forEach(r=>{g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(r[2],r[3]);g.stroke()});g.strokeStyle=c2;g.lineWidth=46;m.roads.forEach(r=>{g.beginPath();g.moveTo(r[0],r[1]);g.lineTo(r[2],r[3]);g.stroke()})}
function patch(g,z,c1,c2,rad=80){g.fillStyle=c1;g.beginPath();g.roundRect(z.x,z.y,z.w,z.h,rad);g.fill();for(let i=0;i<z.w*z.h/600;i++){g.fillStyle=c2;g.fillRect(z.x+20+sr()*(z.w-40),z.y+20+sr()*(z.h-40),3+sr()*7,3+sr()*5)}}
const MAPS={};
// ===== Elwynn =====
{const m=newMap('elwynn','艾尔文森林',3200,2200);MAPS.elwynn=m;
 m.zones=[{n:'北郡修道院',x:150,y:120,w:800,h:650},{n:'狗头人矿洞',x:1250,y:80,w:700,h:520},{n:'狼群林地',x:2250,y:200,w:850,h:900},{n:'金色小镇',x:1250,y:900,w:750,h:550},{n:'霍格营地',x:250,y:1450,w:900,h:650},{n:'艾尔文森林',x:0,y:0,w:3200,h:2200}];
 [{x:380,y:180,w:300,h:200,k:'abbey'},{x:1350,y:960,w:150,h:110,k:'house'},{x:1750,y:960,w:170,h:120,k:'inn'},{x:1350,y:1260,w:140,h:110,k:'house'},{x:1780,y:1270,w:140,h:100,k:'house'}].forEach(r=>addRect(m,r));
 m.roads=[[550,420,550,800],[550,800,1600,1100],[1600,1100,1600,600],[1600,1100,2500,700],[1600,1100,700,1700],[1600,1100,2600,1700],[1600,1100,20,1250]];
 const MINE={x:1300,y:120,w:600,h:420};m.mine=MINE;seed=7;
 for(let a=0;a<1;a+=.012){let x,y;const p=a*4;if(p<1){x=MINE.x+MINE.w*p;y=MINE.y}else if(p<2){x=MINE.x+MINE.w;y=MINE.y+MINE.h*(p-1)}else if(p<3){x=MINE.x+MINE.w*(3-p);y=MINE.y+MINE.h}else{x=MINE.x;y=MINE.y+MINE.h*(4-p)}
  if(p>=2&&p<3&&Math.abs(x-(MINE.x+MINE.w/2))<70)continue;m.obs.push({t:'c',x,y,r:26});m.props.push({k:'rock',x,y,r:26+sr()*8});}
 seed=11;const town=m.zones[3];
 for(let i=0;i<520;i++){const x=sr()*m.W,y=sr()*m.H;const r=18+sr()*14,c=sr();if(nearRoad(m,x,y))continue;if(m.rects.some(b=>inRect(x,y,b,60)))continue;if(inRect(x,y,MINE,60))continue;
  if(inRect(x,y,town,-40)||inRect(x,y,{x:300,y:150,w:550,h:550}))continue;if(Math.hypot(x-700,y-1780)<220)continue;m.trees.push({x,y,r,c});m.obs.push({t:'c',x,y,r:r*.55});}
 for(let i=0;i<14;i++)m.props.push({k:'candle',x:MINE.x+60+sr()*(MINE.w-120),y:MINE.y+60+sr()*(MINE.h-120)});
 m.props.push({k:'cart',x:1500,y:250},{k:'cart',x:1750,y:420},{k:'fire',x:700,y:1780},{k:'tent',x:560,y:1680},{k:'tent',x:860,y:1690},{k:'well',x:1620,y:1180},{k:'board',x:1520,y:1150},{k:'sign',x:120,y:1170,t:'← 西部荒野'});
 paintGround(m,g=>{seed=3;g.fillStyle='#4f7430';g.fillRect(0,0,m.W,m.H);speck(g,m,['#5a8236','#46682a','#62893c','#4a6e2c'],9000);
  patch(g,m.zones[4],'#7a7038','#6a6030');patch(g,MINE,'#3a3028','#2c241e');patch(g,{x:300,y:140,w:520,h:580},'#8a8a7a','#77776a');
  paintRoads(g,m,'#9a7f52','#ab9064');g.fillStyle='#ab9064';g.beginPath();g.ellipse(1600,1110,230,170,0,0,7);g.fill();
  for(let i=0;i<500;i++){g.fillStyle=['#e8d84a','#e86a8a','#fff'][i%3];g.fillRect(sr()*m.W,sr()*m.H,3,3)}
  g.fillStyle='#2a5a8a';g.beginPath();g.ellipse(2700,1650,260,160,0.2,0,7);g.fill();g.fillStyle='#3a74a8';g.beginPath();g.ellipse(2690,1640,220,125,0.2,0,7);g.fill();
  g.strokeStyle='#6a5a48';g.lineWidth=4;g.beginPath();g.moveTo(1600,560);g.lineTo(1600,250);g.lineTo(1800,250);g.moveTo(1612,560);g.lineTo(1612,262);g.lineTo(1800,262);g.stroke();});
 m.obs.push({t:'c',x:2700,y:1650,r:200});
 m.portals=[{x:0,y:1130,w:40,h:240,to:'westfall',tx:2860,ty:1150,n:'西部荒野',rec:10}];m.spawn=[560,560];
 const S=m.spawns;for(let i=0;i<12;i++)S.push(['wolf',2350+sr()*650,300+sr()*700]);for(let i=0;i<9;i++)S.push(['kobold',MINE.x+80+sr()*(MINE.w-160),MINE.y+160+sr()*(MINE.h-220)]);
 S.push(['foreman',MINE.x+MINE.w/2,MINE.y+90]);for(let i=0;i<4;i++)S.push(['gnoll',450+sr()*550,1550+sr()*450]);for(let i=0;i<4;i++)S.push(['wolf',1000+sr()*500,600+sr()*250]);S.push(['hogger',720,1880]);
 m.npcs=[{id:'captain',n:'卫兵队长',x:1560,y:1060,k:'captain',ttl:'暴风城卫兵'},{id:'annie',n:'安妮修士',x:540,y:440,k:'priest',ttl:'北郡修道院'},{id:'inn',n:'旅店老板',x:1830,y:1110,k:'inn',ttl:'药水商人',gift:1}];}
// ===== Westfall =====
{const m=newMap('westfall','西部荒野',3000,2400);MAPS.westfall=m;
 m.zones=[{n:'哨兵岭',x:1220,y:280,w:580,h:500},{n:'萨丁农场',x:1900,y:1300,w:720,h:620},{n:'弗隆农场',x:380,y:780,w:780,h:640},{n:'月溪镇',x:830,y:1700,w:850,h:700},{n:'豺狼人山丘',x:2200,y:220,w:780,h:760},{n:'西部海岸',x:0,y:0,w:340,h:2400},{n:'西部荒野',x:0,y:0,w:3000,h:2400}];
 [{x:1440,y:300,w:120,h:150,k:'tower'},{x:1290,y:540,w:130,h:100,k:'house'},{x:1610,y:540,w:150,h:110,k:'inn'},{x:620,y:880,w:150,h:110,k:'farm'},{x:2150,y:1330,w:150,h:110,k:'farm'},
  {x:930,y:1790,w:130,h:100,k:'ruin'},{x:1380,y:1770,w:140,h:100,k:'ruin'},{x:1400,y:2040,w:130,h:90,k:'ruin'},{x:860,y:2020,w:120,h:90,k:'ruin'},{x:1000,y:2100,w:160,h:120,k:'mine'}].forEach(r=>addRect(m,r));
 m.roads=[[2990,1150,2100,1150],[2100,1150,1500,720],[1500,720,1500,470],[2100,1150,1500,1500],[1500,1500,1200,1950],[1200,1950,1080,2240],[1500,1500,700,1050],[700,1050,250,1100]];
 m.obs.push({t:'r',x:0,y:0,w:120,h:2400});
 const fields=[{x:1950,y:1500,w:620,h:360},{x:420,y:1100,w:500,h:280},{x:1700,y:900,w:350,h:250},{x:2450,y:1950,w:450,h:300}];m.fields=fields;
 seed=21;for(let i=0;i<260;i++){const x=sr()*m.W,y=sr()*m.H,r=16+sr()*12;if(x<380||nearRoad(m,x,y,70)||m.rects.some(b=>inRect(x,y,b,70))||fields.some(f=>inRect(x,y,f,20))||inRect(x,y,m.zones[0],0)||inRect(x,y,m.zones[3],-60))continue;if(sr()<.55)continue;addTree(m,x,y,r,'dry')}
 fields.forEach(f=>{for(let i=0;i<2;i++)m.props.push({k:'scare',x:f.x+f.w*(.3+.4*i),y:f.y+f.h*.5});m.props.push({k:'hay',x:f.x+30,y:f.y+f.h+20})});
 m.props.push({k:'sign',x:2880,y:1060,t:'艾尔文森林 →'},{k:'sign',x:1580,y:760,t:'哨兵岭'},{k:'lamp',x:1440,y:700},{k:'lamp',x:1580,y:700},{k:'fire',x:1220,y:1900},{k:'sign',x:1180,y:2180,t:'死亡矿井'},{k:'mill',x:2400,y:1450},{k:'cart',x:1230,y:2120});
 paintGround(m,g=>{seed=5;g.fillStyle='#a49a4c';g.fillRect(0,0,m.W,m.H);speck(g,m,['#b4ac5a','#958d42','#bfb466','#8e8a40'],9000);
  g.fillStyle='#d8c890';g.fillRect(0,0,360,m.H);g.fillStyle='#2a5a8a';g.fillRect(0,0,130,m.H);g.fillStyle='#3a74a8';g.fillRect(0,0,110,m.H);g.strokeStyle='#cfe6ff';g.lineWidth=3;for(let y=20;y<m.H;y+=60){g.beginPath();g.moveTo(130,y);g.quadraticCurveTo(145,y+15,130,y+30);g.stroke()}
  fields.forEach((f,i)=>{g.fillStyle=i%2?'#7a5a32':'#c8a84a';g.fillRect(f.x,f.y,f.w,f.h);g.fillStyle=i%2?'#5f4528':'#e0c060';for(let y=f.y+6;y<f.y+f.h;y+=16)g.fillRect(f.x+4,y,f.w-8,5)});
  patch(g,m.zones[0],'#8a8a7a','#77776a');patch(g,m.zones[3],'#7a6a4a','#5a4a3a');patch(g,m.zones[4],'#8f8045','#7a6d3a');
  paintRoads(g,m,'#8a7048','#a8905e');g.fillStyle='#3a2a1a';g.beginPath();g.ellipse(1080,2230,60,26,0,0,7);g.fill();});
 m.portals=[{x:2960,y:1030,w:40,h:240,to:'elwynn',tx:110,ty:1250,n:'艾尔文森林'},{x:1035,y:2222,w:90,h:36,to:'deadmines',tx:140,ty:500,n:'死亡矿井',rec:15}];m.spawn=[1500,780];
 const S=m.spawns;seed=31;const P2=(t,n,x0,x1,y0,y1)=>{for(let i=0;i<n;i++){let x,y,k=0;do{x=x0+sr()*(x1-x0);y=y0+sr()*(y1-y0);k++}while(k<20&&m.obs.some(o=>o.t==='r'?inRect(x,y,o,20):Math.hypot(x-o.x,y-o.y)<o.r+20));S.push([t,x,y])}};
 P2('thug',11,420,1140,820,1400);P2('golem',9,1950,2560,1480,1880);P2('murloc',10,170,320,300,2200);P2('wgnoll',8,2260,2900,300,920);P2('raider',10,880,1640,1730,2080);P2('thug',3,1750,2050,850,1150);
 m.npcs=[{id:'gryan',n:'格里安·斯托曼',x:1500,y:520,k:'captain',ttl:'人民军首领'},{id:'quarter',n:'军需官勒维斯',x:1690,y:690,k:'inn',ttl:'药水商人',gift:1},{id:'saldean',n:'农夫萨丁',x:2240,y:1490,k:'farmer',ttl:'萨丁农场'}];}
// ===== Deadmines =====
{const m=newMap('deadmines','死亡矿井',4400,1000);MAPS.deadmines=m;m.dark=1;m.inst=1;
 m.zones=[{n:'矿道',x:0,y:0,w:900,h:1000},{n:'伐木场',x:900,y:0,w:880,h:1000},{n:'铸造厂',x:1780,y:0,w:880,h:1000},{n:'船坞',x:2660,y:0,w:880,h:1000},{n:'迪菲亚战舰',x:3540,y:0,w:860,h:1000}];
 addRect(m,{x:0,y:0,w:4400,h:160,k:'wall'});addRect(m,{x:0,y:840,w:4400,h:160,k:'wall'});
 const B=[['rhahkzor'],['sneed'],['gilnid'],['cookie']];
 [880,1760,2640,3520].forEach((x,i)=>{addRect(m,{x,y:160,w:40,h:260,k:'wall'});addRect(m,{x,y:580,w:40,h:260,k:'wall'});m.gates.push({x,y:420,w:40,h:160,boss:B[i]})});
 m.portals=[{x:0,y:420,w:36,h:160,to:'westfall',tx:1080,ty:2310,n:'西部荒野'}];m.spawn=[140,500];
 const S=m.spawns;seed=41;const P2=(t,n,x0,x1)=>{for(let i=0;i<n;i++)S.push([t,x0+sr()*(x1-x0),220+sr()*560])};
 P2('dminer',6,260,720);S.push(['rhahkzor',780,500]);P2('dgob',6,1060,1580);S.push(['shredder',1660,500]);P2('dthug',6,1940,2460);S.push(['gilnid',2550,500]);
 P2('dpirate',6,2800,3330);S.push(['cookie',3430,500]);P2('dpirate',2,3650,3950);P2('dblack',3,3700,4050);S.push(['vancleef',4250,500]);
 for(let i=0;i<10;i++)m.props.push({k:'lamp',x:200+i*440,y:190});for(let i=0;i<6;i++)m.props.push({k:'crate',x:300+sr()*3900,y:210+sr()*580});
 m.props.push({k:'cart',x:400,y:300},{k:'cart',x:600,y:720},{k:'saw',x:1200,y:260},{k:'saw',x:1450,y:740},{k:'anvil',x:2000,y:300},{k:'anvil',x:2300,y:720},{k:'mast',x:3900,y:500},{k:'mast',x:4150,y:380},{k:'cannon',x:3700,y:300},{k:'cannon',x:3700,y:700});
 paintGround(m,g=>{seed=9;g.fillStyle='#2e2620';g.fillRect(0,0,m.W,m.H);speck(g,m,['#3a3028','#26201a','#40362c'],6000);
  g.strokeStyle='#5a4a38';g.lineWidth=4;for(const dy of[0,12]){g.beginPath();g.moveTo(40,480+dy);g.lineTo(880,480+dy);g.stroke()}
  g.fillStyle='#4a3622';g.fillRect(920,160,840,680);g.strokeStyle='#3a2816';g.lineWidth=2;for(let y=170;y<840;y+=22){g.beginPath();g.moveTo(920,y);g.lineTo(1760,y);g.stroke()}
  g.fillStyle='#3a2a22';g.fillRect(1800,160,840,680);g.fillStyle='#d8501a';g.fillRect(1800,450,840,14);g.fillStyle='#ffb02a';g.fillRect(1800,454,840,5);
  g.fillStyle='#1a3a5a';g.fillRect(2680,160,840,140);g.fillRect(2680,700,840,140);g.fillStyle='#4a3a2a';g.fillRect(2680,300,840,400);
  g.fillStyle='#1a3a5a';g.fillRect(3560,160,840,680);g.fillStyle='#6a4a2a';g.beginPath();g.ellipse(3990,500,440,300,0,0,7);g.fill();g.strokeStyle='#4a321a';for(let y=220;y<800;y+=24){g.beginPath();g.moveTo(3560,y);g.lineTo(4400,y);g.stroke()}});}
// ---------- ITEMS ----------
const ITEMS={
 sword0:{n:'训练用剑',s:'weapon',atk:2,q:''},staff0:{n:'学徒法杖',s:'weapon',atk:2,q:''},mace0:{n:'新手木锤',s:'weapon',atk:2,q:''},
 chest0:{n:'粗布上衣',s:'chest',def:1,q:''},robe0:{n:'学徒长袍',s:'chest',def:1,q:''},robe1:{n:'见习牧师长袍',s:'chest',def:1,q:''},
 legs1:{n:'狼皮护腿',s:'legs',def:3,hp:10,q:'gr'},sword1:{n:'坚固的短剑',s:'weapon',atk:5,q:'gr'},helm1:{n:'工头的矿工帽',s:'head',def:4,hp:25,q:'gr'},
 chest1:{n:'卫兵锁甲',s:'chest',def:6,hp:30,q:'bl'},sword2:{n:'闪光长剑',s:'weapon',atk:10,q:'bl'},neck1:{n:'力量护符',s:'neck',atk:4,hp:15,q:'gr'},neck2:{n:'霍格的獠牙项链',s:'neck',atk:9,hp:50,q:'pu'}};
const SLOTN={weapon:'武器',head:'头部',chest:'胸甲',legs:'腿部',hands:'手部',feet:'脚部',neck:'项链'};
const QM={'':1,gr:1.4,bl:1.9,pu:2.6},QN={'':'普通',gr:'优秀',bl:'精良',pu:'史诗'};
const BASEN={warrior:{weapon:['长剑','战斧','巨锤','阔剑'],head:['头盔','链甲头盔'],chest:['锁甲','胸甲'],legs:['护腿','腿铠'],hands:['护手','铁手套'],feet:['战靴','铁靴'],neck:['项链','护符']},
 cloth:{weapon:['法杖','魔杖','长杖'],head:['兜帽','头巾'],chest:['长袍','法袍'],legs:['短裤','护腿'],hands:['手套','裹手'],feet:['便鞋','布靴'],neck:['项链','坠饰']}};
const ADJ=['坚固的','磨损的','精制的','闪光的','迪菲亚','西部荒野','月溪','哨兵岭','艾尔文','沉重的','锋利的','秘法'];
function genItem(lvl,q,slot,name){const sl=Object.keys(SLOTN);slot=slot||sl[RI(0,sl.length-1)];const m=QM[q],it={s:slot,q,lv:lvl};
 if(slot==='weapon')it.atk=Math.round((2+lvl*.9)*m);else if(slot==='neck'){it.atk=Math.round((1+lvl*.35)*m);it.hp=Math.round(lvl*2*m)}else{it.def=Math.round((1+lvl*.45)*m);it.hp=Math.round(lvl*1.6*m)}
 const bn=BASEN[P.cls==='warrior'?'warrior':'cloth'][slot];it.n=name||(ADJ[RI(0,ADJ.length-1)]+bn[RI(0,bn.length-1)]);
 const id='g'+Date.now().toString(36)+RI(0,9999);ITEMS[id]=it;P.gear[id]=it;return id}
const BOSSLOOT={hogger:['霍格的獠牙项链','neck','pu','霍格的獠牙项链','neck'],rhahkzor:['拉克佐之锤','weapon','bl','拉克佐的护符','neck'],sneed:['嗡嗡锯刃','weapon','bl','斯尼德的工程师长杖','weapon'],
 shredder:['镀金圆盾护手','hands','bl','伐木机零件手套','hands'],gilnid:['熔铸铁靴','feet','bl','吉尔尼斯的熔铸便鞋','feet'],cookie:['曲奇的嫩肉锤','weapon','bl','曲奇的大汤勺','weapon'],
 vancleef:['残忍倒钩','weapon','pu','迪菲亚首领法杖','weapon'],vancleef2:['黑色迪菲亚护甲','chest','bl','黑色迪菲亚长袍','chest']};
// ---------- CLASSES ----------
const CLS={warrior:{n:'战士',col:'#c79c6e',res:'怒气',w:'sword0',c:'chest0',d:'近战坦克，用怒气施放冲锋、英勇打击、雷霆一击。生命最高。'},
 mage:{n:'法师',col:'#69ccf0',res:'法力',w:'staff0',c:'robe0',d:'远程法术输出：火球术、寒冰箭、冰霜新星。生命较低，要学会风筝。'},
 priest:{n:'牧师',col:'#ffffff',res:'法力',w:'mace0',c:'robe1',d:'神圣与暗影：惩击、暗言术：痛、真言术：盾、治疗术。最能活。'}};
const MAXL=30,XPN=l=>Math.round(40*Math.pow(l,1.7)+80*l);
let P,QS,enemies=[],fx=[],texts=[],proj=[],won=false,target=null,tm=0,dialog=false,MAP=null,obs=[],killed=new Set();
function newGame(cls){P={cls,map:'elwynn',x:560,y:560,face:0,hp:150,mana:100,rage:0,lvl:1,xp:0,eq:{weapon:CLS[cls].w,chest:CLS[cls].c},inv:[],gear:{},pots:3,cds:{},gcd:0,swing:0,dash:null,hurt:0,dead:0,anim:0,known:{},bar:[null,null,null,null,null,null],bf:{},lastHit:-99,lastCast:-99,cast:null,chan:null};
 QS={};QUESTS.forEach(q=>QS[q.id]={st:'none',c:0});won=false;learn(true);const st=stats();P.hp=st.hp;P.mana=st.mp;}
function stats(){const L=P.lvl,c=P.cls;let atk,def,hp,mp=0;
 if(c==='warrior'){atk=8+L*3;def=L;hp=100+L*30}else if(c==='mage'){atk=10+L*3.4;def=L*.5;hp=70+L*18;mp=120+L*24}else{atk=9+L*3.2;def=L*.6;hp=80+L*21;mp=120+L*24}
 for(const s in P.eq){const it=ITEMS[P.eq[s]];if(!it)continue;atk+=it.atk||0;def+=it.def||0;hp+=it.hp||0}
 const b=P.bf;if(b.bshout)atk+=3+L*.6*b.bshout.k;if(b.farmor)def+=3+L*.4*b.farmor.k;if(b.iarmor)def+=8+L*.9;if(b.ifire){def+=L*.5*b.ifire.k;atk+=L*.3}if(b.sprot)def+=L*.7;
 if(b.pwf)hp*=1+.08*b.pwf.k;if(b.ai)mp*=1+.1*b.ai.k;return{atk:Math.round(atk),def:Math.round(def),hp:Math.round(hp),mp:Math.round(mp)}}
function save(){try{const p={...P,dash:null,dead:0,cast:null,chan:null};localStorage.setItem('elwynn_save_v2',JSON.stringify({P:p,QS,won}))}catch(e){}}
function load(){try{let s=JSON.parse(localStorage.getItem('elwynn_save_v2')),old=false;if(!s){s=JSON.parse(localStorage.getItem('elwynn_save_v1'));old=!!s}
 if(s&&s.P){newGame(s.P.cls||'warrior');const q=QS;Object.assign(P,s.P);if(old){P.cls='warrior';P.map='elwynn';P.gear={};P.known={};P.bar=[null,null,null,null,null,null];P.bf={}}
  P.cds={};P.cast=null;P.chan=null;P.gcd=0;Object.assign(ITEMS,P.gear||{});P.gear=P.gear||{};QS=Object.assign(q,s.QS);won=s.won;learn(true);return true}}catch(e){console.error(e)}return false}
// ---------- ENEMIES ----------
const ET={
 wolf:{n:'森林狼',hpm:.6,dm:1,sp:120,xpm:1,lvl:[1,3],r:18,ag:170,dr:'wolf'},
 kobold:{n:'狗头人矿工',hpm:.7,dm:1,sp:95,xpm:1,lvl:[2,4],r:16,ag:150,dr:'kobold',say:['你不能拿走蜡烛！','不要蜡烛！','我的蜡烛！']},
 foreman:{n:'狗头人工头',hpm:1.5,dm:1.3,sp:100,xpm:2.5,lvl:[5,5],r:22,ag:180,dr:'kobold',k:1.35,say:['你不能拿走蜡烛！！'],elite:1},
 gnoll:{n:'河爪豺狼人',hpm:.7,dm:1.1,sp:105,xpm:1.1,lvl:[5,6],r:19,ag:170,dr:'gnoll'},
 hogger:{n:'霍格',hpm:7,dm:1.5,sp:115,xpm:6,lvl:[7,7],r:32,ag:220,dr:'gnoll',k:1.9,say:['霍格要吃了你！','咕噜噜……'],boss:1,slam:'霍格 准备猛击地面！'},
 thug:{n:'迪菲亚暴徒',hpm:.75,dm:1,sp:105,xpm:1,lvl:[9,11],r:16,ag:160,dr:'human',look:'thug',say:['迪菲亚兄弟会万岁！','把钱交出来！','滚出西部荒野！']},
 golem:{n:'收割傀儡',hpm:.85,dm:1.05,sp:85,xpm:1,lvl:[10,12],r:20,ag:150,dr:'golem'},
 murloc:{n:'鱼人',hpm:.65,dm:1,sp:118,xpm:1,lvl:[9,12],r:15,ag:170,dr:'murloc',say:['啊嘞啊嘞嘞嘞！','咕噜噜噜！']},
 wgnoll:{n:'豺狼人斥候',hpm:.8,dm:1.1,sp:105,xpm:1.1,lvl:[11,13],r:19,ag:170,dr:'gnoll',col:1},
 raider:{n:'迪菲亚劫掠者',hpm:.85,dm:1.1,sp:108,xpm:1.15,lvl:[13,15],r:17,ag:170,dr:'human',look:'raider',say:['范克里夫老大不会放过你！','为了兄弟会！']},
 dminer:{n:'迪菲亚矿工',hpm:.9,dm:1,sp:100,xpm:1.2,lvl:[15,16],r:16,ag:160,dr:'human',look:'miner'},
 rhahkzor:{n:'拉克佐',hpm:6,dm:1.35,sp:100,xpm:6,lvl:[17,17],r:30,ag:200,dr:'ogre',k:1.8,boss:1,say:['范克里夫老大会为你们的脑袋付大价钱！'],slam:'拉克佐 高高举起巨锤！'},
 dgob:{n:'地精工匠',hpm:.8,dm:1,sp:110,xpm:1.2,lvl:[16,17],r:14,ag:160,dr:'goblin',say:['时间就是金钱，朋友！']},
 shredder:{n:'斯尼德的伐木机',hpm:4.5,dm:1.35,sp:95,xpm:4,lvl:[18,18],r:30,ag:200,dr:'golem',shred:1,k:1.7,boss:1,say:['嗡嗡嗡——！'],slam:'伐木机 锯片高速旋转！'},
 sneed:{n:'斯尼德',hpm:3,dm:1.3,sp:110,xpm:4,lvl:[18,18],r:18,ag:300,dr:'goblin',k:1.3,boss:1,say:['你弄坏了我的伐木机！你得赔！']},
 dthug:{n:'迪菲亚守卫',hpm:1,dm:1.1,sp:105,xpm:1.3,lvl:[17,18],r:17,ag:170,dr:'human',look:'raider'},
 gilnid:{n:'吉尔尼斯',hpm:6,dm:1.4,sp:100,xpm:6,lvl:[19,19],r:22,ag:200,dr:'goblin',k:1.6,boss:1,say:['这座铸造厂里的金属都归我！'],slam:'吉尔尼斯 倒出熔化的金属！'},
 dpirate:{n:'迪菲亚海盗',hpm:1,dm:1.1,sp:108,xpm:1.3,lvl:[18,19],r:17,ag:170,dr:'human',look:'pirate',say:['呦吼！抢光他们！']},
 cookie:{n:'曲奇',hpm:5.5,dm:1.4,sp:100,xpm:6,lvl:[19,19],r:24,ag:200,dr:'murloc',k:1.8,hat:1,boss:1,say:['嗷嗷嗷！开饭啦！'],slam:'曲奇 泼出一锅滚烫的鱼汤！'},
 dblack:{n:'迪菲亚黑衣卫兵',hpm:1.1,dm:1.15,sp:110,xpm:1.4,lvl:[19,20],r:17,ag:180,dr:'human',look:'black'},
 vancleef:{n:'艾德温·范克里夫',hpm:10,dm:1.5,sp:120,xpm:10,lvl:[21,21],r:24,ag:220,dr:'human',look:'vancleef',k:1.6,boss:1,say:['没有人能挑战迪菲亚兄弟会！'],slam:'范克里夫 挥出旋风斩！'}};
function mkE(t,x,y,i){const T=ET[t],L=RI(T.lvl[0],T.lvl[1]),mhp=Math.round((40+25*L)*T.hpm);return{t,T,x,y,hx:x,hy:y,hp:mhp,mhp,lvl:L,st:'idle',cd:0,wt:R(1,4),tx:x,ty:y,dead:0,resp:0,sp:i,anim:Math.random()*9,face:1,hurt:0,stun:0,slow:0,root:0,fear:0,poly:0,demo:0,disarm:0,sun:0,dots:[],special:6,enr:0}}
function spawnAll(){killed=new Set();enemies=MAP.spawns.map((s,i)=>mkE(s[0],s[1],s[2],i))}
// ---------- QUESTS ----------
const QUESTS=[
 {id:'q1',g:'captain',n:'狼群威胁',d:'猎杀 8 只森林狼（狼群林地，东边）。',need:8,kind:'kill',tgt:['wolf'],rew:['chest','gr',4],rxp:250,txt:'东边的狼群已经咬伤了好几个农夫。去狼群林地，消灭 8 只森林狼！'},
 {id:'q2',g:'captain',n:'你不能拿走蜡烛！',d:'从北边矿洞的狗头人身上收集 6 根蜡烛。',need:6,kind:'col',tgt:['kobold'],it:'蜡烛',rew:['weapon','bl',5],rxp:300,txt:'北边的矿洞被狗头人占了。那些家伙头上顶着蜡烛到处乱跑……给我带 6 根蜡烛回来。'},
 {id:'q3',g:'captain',n:'矿洞工头',d:'击败矿洞深处的狗头人工头。',need:1,kind:'kill',tgt:['foreman'],rew:['neck','gr',5],rxp:350,pot:3,txt:'狗头人背后有个工头在指挥它们挖矿。去矿洞最深处干掉它！'},
 {id:'q4',g:'captain',n:'通缉：霍格',d:'击败西南营地的豺狼人首领霍格。',need:1,kind:'kill',tgt:['hogger'],req:['q1','q2','q3'],rxp:900,txt:'你干得很漂亮，勇士。现在是最危险的任务了——豺狼人霍格在西南营地作恶多端。去把它干掉！',fin:'<b>霍格</b>终于倒下了！整个艾尔文森林都欠你一份人情！'},
 {id:'w0',g:'captain',t:'gryan',n:'西部荒野的求援',d:'沿西边大路前往西部荒野，在哨兵岭找到格里安·斯托曼。',need:1,kind:'talk',req:['q4'],rxp:400,txt:'西边的西部荒野出事了。迪菲亚兄弟会在那里烧杀抢掠，暴风城却不管不顾。人民军首领<b>格里安·斯托曼</b>正在哨兵岭召集勇士——去帮帮他。<br><small>（沿金色小镇往西的大路一直走。建议等级 9+）</small>',fin:'暴风城的卫兵队长派你来的？哼，暴风城终于想起西部荒野了。不过你看起来是条好汉——欢迎来到哨兵岭，朋友。'},
 {id:'w1',g:'gryan',n:'迪菲亚兄弟会',d:'在弗隆农场一带消灭 10 个迪菲亚暴徒。',need:10,kind:'kill',tgt:['thug'],req:['w0'],rew:['chest','gr',11],rxp:1100,txt:'迪菲亚兄弟会的暴徒占领了西边的弗隆农场。他们曾经是建造暴风城的石匠，现在却成了强盗。去消灭 10 个暴徒！'},
 {id:'w2',g:'gryan',n:'鱼人的威胁',d:'从西部海岸的鱼人身上收集 6 片鱼人鳍。',need:6,kind:'col',tgt:['murloc'],it:'鱼人鳍',req:['w0'],rew:['legs','gr',11],rxp:1100,txt:'海岸边的鱼人越来越多，渔民都不敢出海了。给我带 6 片鱼人鳍回来。'},
 {id:'w3',g:'saldean',n:'失控的收割傀儡',d:'摧毁萨丁农场里的 8 个收割傀儡。',need:8,kind:'kill',tgt:['golem'],req:['w0'],rew:['hands','gr',12],rxp:1200,txt:'迪菲亚的地精把我田里的收割傀儡改造成了杀人机器！求你帮我砸烂 8 个！'},
 {id:'w4',g:'saldean',n:'豺狼人的劫掠',d:'消灭东北山丘上的 8 个豺狼人斥候。',need:8,kind:'kill',tgt:['wgnoll'],req:['w0'],rew:['feet','gr',12],rxp:1200,txt:'东北山丘的豺狼人老来偷我的庄稼和鸡。消灭 8 个豺狼人斥候吧！'},
 {id:'w5',g:'gryan',n:'迪菲亚的密信',d:'从月溪镇的迪菲亚劫掠者身上找到一封密信。',need:1,kind:'col',tgt:['raider'],it:'迪菲亚密信',req:['w1'],rew:['weapon','bl',14],rxp:1600,txt:'南边的月溪镇是迪菲亚兄弟会的老巢。他们的劫掠者身上带着首领的命令。去夺一封密信回来！',fin:'这封信……落款是<b>艾德温·范克里夫</b>！他们的老巢就在月溪镇地下的<b>死亡矿井</b>里。'},
 {id:'w6',g:'gryan',n:'地下的威胁',d:'在死亡矿井中击败拉克佐、斯尼德和吉尔尼斯。',need:3,kind:'kill',tgt:['rhahkzor','sneed','gilnid'],req:['w5'],rew:['chest','bl',18],rxp:3000,txt:'死亡矿井里有范克里夫的三个得力干将：食人魔<b>拉克佐</b>、驾驶伐木机的地精<b>斯尼德</b>，还有铸造厂的<b>吉尔尼斯</b>。干掉他们！<br><small>（入口在月溪镇南边。建议等级 15+）</small>'},
 {id:'w7',g:'gryan',n:'迪菲亚兄弟会的首领',d:'在死亡矿井深处的战舰上击败艾德温·范克里夫。',need:1,kind:'kill',tgt:['vancleef'],req:['w5'],rew:['neck','pu',20],rxp:5000,txt:'是时候结束这一切了。<b>艾德温·范克里夫</b>就躲在死亡矿井最深处的战舰上。杀了他，把西部荒野还给人民！',fin:'范克里夫死了……西部荒野终于自由了！你就是我们的英雄！'}];
function qAvail(q){return QS[q.id].st==='none'&&(!q.req||q.req.every(i=>QS[i].st==='done'))}
function qReady(q){return QS[q.id].st==='active'&&QS[q.id].c>=q.need}
// ---------- SKILLS ----------
const msg=t=>{ftxt(P.x,P.y-62,t,'#ff6a5a');return false};
const PW=()=>stats().atk;
function buff(id,t,o={}){P.bf[id]={t,mt:t,...o};SFX.buff()}
function aoe(x,y,r,fn){let n=0;enemies.forEach(e=>{if(!e.dead&&Math.hypot(e.x-x,e.y-y)<r+e.T.r*.5){fn(e);n++}});return n}
function cone(r,ang,fn){const a=target&&!target.dead?Math.atan2(target.y-P.y,target.x-P.x):P.face;P.face=a;fx.push({k:'cone',x:P.x,y:P.y,a,life:.5});enemies.forEach(e=>{if(e.dead)return;const d=D(P,e);if(d>r+e.T.r)return;let da=Math.abs(((Math.atan2(e.y-P.y,e.x-P.x)-a)+9.42)%6.283-3.14);if(da<ang)fn(e)})}
function melee(e,mult,label,critb=0){const st=stats();P.face=Math.atan2(e.y-P.y,e.x-P.x);P.swing=.25;SFX.swing();dmgE(e,st.atk*mult*R(.88,1.12),Math.random()<.12+critb);if(label)ftxt(P.x,P.y-60,label,'#ffb04a')}
function bolt(e,mult,col,fast,cb){proj.push({x:P.x,y:P.y-18,e,sp:fast?900:560,col,cb:en=>{dmgE(en,PW()*mult*R(.9,1.1),Math.random()<.1,col);cb&&cb(en)}})}
function dot(e,id,total,dur,n,col){e.dots=e.dots.filter(d=>d.id!==id);e.dots.push({id,per:total/n,n,every:dur/n,t:dur/n,col})}
function healP(a){const st=stats();a=Math.round(a*R(.92,1.08));P.hp=Math.min(st.hp,P.hp+a);ftxt(P.x,P.y-56,'+'+a,'#7fff7f');fx.push({k:'heal',x:P.x,y:P.y,life:.8});SFX.holy()}
function blink(){const a=P.face;for(let i=0;i<20;i++){const ox=P.x,oy=P.y;P.x+=Math.cos(a)*10;P.y+=Math.sin(a)*10;collide(P,14);if(Math.hypot(P.x-ox,P.y-oy)<3)break}fx.push({k:'arc',x:P.x,y:P.y,life:.5});SFX.arcane();P.rootT=0}
const SK={
// ===== 战士 =====
hs:{c:'warrior',n:'英勇打击',L:[1,8,16,24],cost:15,t:1,rng:75,d:'猛力一击，造成 220% 攻击伤害。',f:(e,k)=>melee(e,2.2*k,'英勇打击')},
bshout:{c:'warrior',n:'战斗怒吼',L:[1,12,22],cost:10,d:'提高攻击强度，持续 2 分钟。',f:(e,k)=>{buff('bshout',120,{k});fx.push({k:'lvl',x:P.x,y:P.y,life:1});ftxt(P.x,P.y-60,'战斗怒吼！','#ffb04a')}},
charge:{c:'warrior',n:'冲锋',L:[4,26],cost:0,cd:12,t:1,rng:360,minr:60,offgcd:1,d:'冲向敌人，使其昏迷并产生怒气。',f:(e,k)=>{target=e;P.dash={e,t:.45,stun:1.2};P.rage=Math.min(100,P.rage+(k>1?20:15));SFX.charge();ftxt(P.x,P.y-60,'冲锋！','#ffb04a')}},
rend:{c:'warrior',n:'撕裂',L:[4,10,20,30],cost:10,t:1,rng:75,d:'使敌人流血，9 秒内造成持续伤害。',f:(e,k)=>{P.swing=.25;dot(e,'rend',PW()*1.6*k,9,3,'#ff4a4a');ftxt(e.x,e.y-55,'撕裂','#ff6a6a')}},
tclap:{c:'warrior',n:'雷霆一击',L:[6,18,28],cost:20,cd:6,d:'震击周围敌人，造成伤害并使其减速。',f:(e,k)=>{SFX.thunder();fx.push({k:'thunder',x:P.x,y:P.y,life:.5});aoe(P.x,P.y,130,en=>{dmgE(en,PW()*1.2*k*R(.9,1.1));en.slow=Math.max(en.slow,6)});ftxt(P.x,P.y-60,'雷霆一击','#8ad0ff')}},
ham:{c:'warrior',n:'断筋',L:[8,18,28],cost:10,t:1,rng:75,d:'造成少量伤害，使敌人移动速度降低 15 秒。',f:(e,k)=>{melee(e,.6*k,'断筋');e.slow=15}},
blood:{c:'warrior',n:'血性狂暴',L:[10],cost:0,cd:30,offgcd:1,d:'消耗少量生命，立刻获得 20 点怒气。',f:()=>{const st=stats();P.hp=Math.max(1,P.hp-st.hp*.05);P.rage=Math.min(100,P.rage+20);ftxt(P.x,P.y-60,'血性狂暴','#ff4a4a');SFX.charge()}},
sunder:{c:'warrior',n:'破甲攻击',L:[10,22],cost:15,t:1,rng:75,d:'削弱护甲，最多 5 层，每层使目标受到的伤害提高 6%。',f:(e,k)=>{melee(e,.5*k,null);e.sun=Math.min(5,e.sun+1);e.sunT=30;ftxt(e.x,e.y-55,'破甲 ×'+e.sun,'#ffd24a')}},
bash:{c:'warrior',n:'盾击',L:[12],cost:10,cd:12,t:1,rng:75,d:'用盾牌猛击，打断技能并使敌人昏迷 2 秒。',f:e=>{melee(e,.6,'盾击');e.stun=Math.max(e.stun,2);e.slam=null}},
over:{c:'warrior',n:'压制',L:[12,28],cost:5,cd:5,t:1,rng:75,d:'无法躲闪的一击，暴击几率提高 50%。',f:(e,k)=>melee(e,1.5*k,'压制',.5)},
demo:{c:'warrior',n:'挫志怒吼',L:[14,24],cost:10,d:'周围敌人的攻击力降低 20%，持续 30 秒。',f:()=>{fx.push({k:'ring',x:P.x,y:P.y,life:.6,c:'#ffb04a'});aoe(P.x,P.y,180,en=>{en.demo=30});ftxt(P.x,P.y-60,'挫志怒吼','#ffb04a')}},
rev:{c:'warrior',n:'复仇',L:[14,20,26],cost:5,cd:5,t:1,rng:75,cond:()=>tm-P.lastHit<5||msg('受到攻击后才能使用'),d:'受到攻击后 5 秒内可用，猛烈反击。',f:(e,k)=>melee(e,1.9*k,'复仇')},
mock:{c:'warrior',n:'惩戒痛击',L:[16],cost:10,cd:10,t:1,rng:75,d:'嘲讽目标并造成伤害。',f:e=>{melee(e,1.2,'惩戒痛击');e.st='chase'}},
sblock:{c:'warrior',n:'盾牌格挡',L:[16],cost:10,cd:8,offgcd:1,d:'举盾格挡，6 秒内受到的伤害降低 40%。',f:()=>{buff('sblock',6);ftxt(P.x,P.y-60,'盾牌格挡','#8ad0ff')}},
disarm:{c:'warrior',n:'缴械',L:[18],cost:20,cd:30,t:1,rng:75,d:'缴械敌人，10 秒内其伤害降低 50%。',f:e=>{e.disarm=10;ftxt(e.x,e.y-55,'缴械','#ffd24a')}},
cleave:{c:'warrior',n:'顺劈斩',L:[20,30],cost:20,t:1,rng:80,d:'横扫面前最多 3 个敌人。',f:(e,k)=>{enemies.filter(en=>!en.dead&&D(P,en)<100).sort((a,b)=>D(P,a)-D(P,b)).slice(0,3).forEach(en=>melee(en,1.4*k,null));ftxt(P.x,P.y-60,'顺劈斩','#ffb04a')}},
retal:{c:'warrior',n:'反击风暴',L:[20],cost:0,cd:90,offgcd:1,d:'15 秒内，每次受到近战攻击都会立刻反击。',f:()=>{buff('retal',15);ftxt(P.x,P.y-60,'反击风暴','#ffb04a')}},
intim:{c:'warrior',n:'破胆怒吼',L:[22],cost:25,cd:60,d:'使周围的非首领敌人恐惧逃跑 6 秒。',f:()=>{fx.push({k:'ring',x:P.x,y:P.y,life:.6,c:'#c050ff'});aoe(P.x,P.y,170,en=>{if(!en.T.boss)en.fear=6})}},
exec:{c:'warrior',n:'斩杀',L:[24],cost:15,t:1,rng:75,cond:e=>e.hp<e.mhp*.2||msg('目标生命值需低于 20%'),d:'对生命值低于 20% 的敌人致命一击，额外消耗全部怒气提高伤害。',f:e=>{const ex=Math.max(0,P.rage-15);P.rage=15;melee(e,3+ex*.06,'斩杀！',.2)}},
swall:{c:'warrior',n:'盾墙',L:[28],cost:0,cd:120,offgcd:1,d:'10 秒内受到的伤害降低 75%。',f:()=>{buff('swall',10);ftxt(P.x,P.y-60,'盾墙','#8ad0ff')}},
intercept:{c:'warrior',n:'拦截',L:[30],cost:10,cd:15,t:1,rng:320,minr:50,offgcd:1,d:'战斗中也能冲向敌人，使其昏迷 3 秒。',f:e=>{target=e;P.dash={e,t:.45,stun:3};SFX.charge();ftxt(P.x,P.y-60,'拦截！','#ffb04a')}},
// ===== 法师 =====
fb:{c:'mage',n:'火球术',L:[1,6,12,18,24,30],cost:.09,cast:2.2,t:1,rng:300,d:'投出火球造成大量火焰伤害，并附带灼烧。',f:(e,k)=>{SFX.fire();bolt(e,2.8*k,'#ff7a1a',0,en=>dot(en,'fbd',PW()*.3*k,6,3,'#ff8a2a'))}},
farmor:{c:'mage',n:'霜甲术',L:[1,10,20],cost:.1,d:'提高护甲，近战攻击你的敌人会被减速。持续 10 分钟。',f:(e,k)=>{delete P.bf.iarmor;buff('farmor',600,{k})}},
ai:{c:'mage',n:'奥术智慧',L:[1,14,28],cost:.12,d:'提高法力上限 10%~30%，持续 30 分钟。',f:(e,k)=>buff('ai',1800,{k})},
fbolt:{c:'mage',n:'寒冰箭',L:[4,8,14,20,26],cost:.08,cast:1.7,t:1,rng:300,d:'造成冰霜伤害并使目标减速 5 秒。',f:(e,k)=>{SFX.frost();bolt(e,2.2*k,'#8ad8ff',0,en=>en.slow=Math.max(en.slow,5))}},
fblast:{c:'mage',n:'火焰冲击',L:[6,14,22,30],cost:.1,cd:8,t:1,rng:220,d:'瞬发火焰伤害。',f:(e,k)=>{SFX.fire();bolt(e,1.9*k,'#ffb02a',1)}},
am:{c:'mage',n:'奥术飞弹',L:[8,16,24],cost:.12,chan:3,ticks:5,t:1,rng:300,d:'引导 3 秒，射出 5 枚奥术飞弹。',tick:(e,k)=>{if(!e.dead){SFX.arcane();bolt(e,.62*k,'#e07aff',1)}}},
poly:{c:'mage',n:'变形术',L:[8,20],cost:.1,cast:1.5,t:1,rng:260,cond:e=>!e.T.boss||msg('首领免疫变形'),d:'把敌人变成绵羊（最多 10/20 秒），受到伤害会解除。',f:(e,k)=>{e.poly=k>1?20:10;e.dots=[];if(target===e)target=null;ftxt(e.x,e.y-55,'变形！','#e07aff');SFX.arcane()}},
nova:{c:'mage',n:'冰霜新星',L:[10,26],cost:.08,cd:22,d:'冻结周围敌人 8 秒并造成冰霜伤害。',f:(e,k)=>{SFX.frost();fx.push({k:'nova',x:P.x,y:P.y,life:.6});aoe(P.x,P.y,140,en=>{dmgE(en,PW()*.5*k);en.root=8})}},
ae:{c:'mage',n:'魔爆术',L:[14,22,30],cost:.12,d:'对周围敌人造成奥术伤害。',f:(e,k)=>{SFX.arcane();fx.push({k:'ring',x:P.x,y:P.y,life:.5,c:'#e07aff'});aoe(P.x,P.y,130,en=>dmgE(en,PW()*1.1*k*R(.9,1.1)))}},
fs:{c:'mage',n:'烈焰风暴',L:[16,24],cost:.16,cast:2.5,t:1,rng:300,d:'召唤火焰柱，灼烧目标区域所有敌人。',f:(e,k)=>{SFX.fire();fx.push({k:'flame',x:e.x,y:e.y,life:.8});aoe(e.x,e.y,110,en=>{dmgE(en,PW()*1.6*k);dot(en,'fsd',PW()*.6*k,8,4,'#ff6a1a')})}},
blink:{c:'mage',n:'闪现术',L:[20],cost:.12,cd:15,offgcd:1,d:'向前方瞬移，并解除定身和昏迷。',f:blink},
bliz:{c:'mage',n:'暴风雪',L:[20,28],cost:.22,chan:4,ticks:4,t:1,rng:300,d:'引导 4 秒，在目标区域降下暴风雪，造成冰霜伤害并减速。',start:e=>({x:e.x,y:e.y}),tick:(e,k,c)=>{SFX.frost();fx.push({k:'bliz',x:c.x,y:c.y,life:1});aoe(c.x,c.y,130,en=>{dmgE(en,PW()*.75*k);en.slow=Math.max(en.slow,4)})}},
evo:{c:'mage',n:'唤醒',L:[20],cost:0,cd:120,chan:8,ticks:8,d:'引导 8 秒，迅速恢复大量法力。',tick:()=>{const st=stats();P.mana=Math.min(st.mp,P.mana+st.mp*.12);ftxt(P.x,P.y-56,'+法力','#6aa8ff')}},
mshield:{c:'mage',n:'法力护盾',L:[20,28],cost:.1,d:'用法力吸收伤害（每点伤害消耗 2 点法力）。',f:(e,k)=>buff('mshield',60,{amt:PW()*3*k})},
scorch:{c:'mage',n:'灼烧',L:[22,28],cost:.07,cast:1,t:1,rng:260,d:'快速施放的火焰法术。',f:(e,k)=>{SFX.fire();bolt(e,1.35*k,'#ff5a1a',1)}},
cs:{c:'mage',n:'法术反制',L:[24],cost:.07,cd:24,t:1,rng:300,offgcd:1,d:'打断敌人的技能并使其沉默 3 秒。',f:e=>{e.slam=null;e.stun=Math.max(e.stun,3);ftxt(e.x,e.y-55,'反制！','#e07aff');SFX.arcane()}},
coc:{c:'mage',n:'冰锥术',L:[26],cost:.14,cd:10,d:'对面前锥形区域的敌人造成冰霜伤害并减速。',f:(e,k)=>{SFX.frost();cone(150,1.05,en=>{dmgE(en,PW()*1.5*k);en.slow=Math.max(en.slow,8)})}},
iarmor:{c:'mage',n:'冰甲术',L:[30],cost:.15,d:'大幅提高护甲，攻击者会被减速。替代霜甲术。',f:()=>{delete P.bf.farmor;buff('iarmor',600)}},
// ===== 牧师 =====
smite:{c:'priest',n:'惩击',L:[1,6,14,22,30],cost:.07,cast:1.6,t:1,rng:280,d:'用圣光惩击敌人。',f:(e,k)=>{SFX.holy();bolt(e,2.0*k,'#ffe680',1)}},
lheal:{c:'priest',n:'次级治疗术',L:[1,4,10],cost:.12,cast:1.6,d:'恢复你的生命值。',f:(e,k)=>healP(PW()*2.6*k)},
pwf:{c:'priest',n:'真言术：韧',L:[1,12,24],cost:.14,d:'提高生命上限，持续 30 分钟。',f:(e,k)=>buff('pwf',1800,{k})},
swp:{c:'priest',n:'暗言术：痛',L:[4,10,18,26],cost:.08,t:1,rng:280,d:'暗影能量在 18 秒内持续侵蚀敌人。',f:(e,k)=>{SFX.shadow();dot(e,'swp',PW()*2.6*k,18,6,'#b070ff');ftxt(e.x,e.y-55,'暗言术：痛','#b070ff');if(e.st!=='chase')e.st='chase'}},
pws:{c:'priest',n:'真言术：盾',L:[6,12,18,24,30],cost:.12,cond:()=>!P.bf.weak||msg('虚弱灵魂：暂时无法使用'),d:'吸收伤害的护盾；之后 15 秒内无法再次施放。',f:(e,k)=>{buff('pws',30,{amt:PW()*2.8*k});P.bf.weak={t:15,mt:15}}},
renew:{c:'priest',n:'恢复',L:[8,14,20,26],cost:.1,d:'15 秒内持续恢复生命值。',f:(e,k)=>buff('renew',15,{hps:PW()*3.2*k/15})},
fade:{c:'priest',n:'渐隐术',L:[8],cost:.05,cd:30,offgcd:1,d:'使周围的非首领敌人暂时失去对你的仇恨。',f:()=>{enemies.forEach(en=>{if(en.st==='chase'&&!en.T.boss&&D(P,en)<400)en.st='return'});ftxt(P.x,P.y-60,'渐隐','#ccc')}},
mb:{c:'priest',n:'心灵震爆',L:[10,16,22,28],cost:.1,cast:1.5,cd:8,t:1,rng:280,d:'造成高额暗影伤害。',f:(e,k)=>{SFX.shadow();bolt(e,2.5*k,'#c080ff',1)}},
dprayer:{c:'priest',n:'绝望祷言',L:[10],cost:0,cd:120,offgcd:1,d:'人类种族技能：瞬间恢复大量生命。',f:()=>healP(PW()*4)},
ifire:{c:'priest',n:'心灵之火',L:[12,20,30],cost:.08,d:'提高护甲和攻击强度，持续 10 分钟。',f:(e,k)=>buff('ifire',600,{k})},
scream:{c:'priest',n:'心灵尖啸',L:[14,28],cost:.12,cd:30,d:'使周围的非首领敌人恐惧逃跑 8 秒。',f:()=>{SFX.shadow();fx.push({k:'ring',x:P.x,y:P.y,life:.6,c:'#b070ff'});aoe(P.x,P.y,160,en=>{if(!en.T.boss)en.fear=8})}},
heal:{c:'priest',n:'治疗术',L:[16,22,28],cost:.18,cast:2.5,d:'大量恢复生命值。',f:(e,k)=>healP(PW()*4.4*k)},
hfire:{c:'priest',n:'神圣之火',L:[20,24,30],cost:.13,cast:2.5,t:1,rng:280,d:'造成神圣伤害并灼烧目标。',f:(e,k)=>{SFX.holy();bolt(e,2.3*k,'#ffd040',0,en=>dot(en,'hfd',PW()*.8*k,8,4,'#ffd040'))}},
fheal:{c:'priest',n:'快速治疗',L:[20,26],cost:.16,cast:1,d:'快速恢复生命值。',f:(e,k)=>healP(PW()*2.8*k)},
mflay:{c:'priest',n:'精神鞭笞',L:[20],cost:.1,chan:3,ticks:3,t:1,rng:240,d:'引导 3 秒，持续造成暗影伤害并使目标减速。',tick:(e,k)=>{if(!e.dead){SFX.shadow();fx.push({k:'beam',x:P.x,y:P.y,e,life:1});dmgE(e,PW()*.9*k,false,'#b070ff');e.slow=Math.max(e.slow,3)}}},
hnova:{c:'priest',n:'神圣新星',L:[22],cost:.18,d:'伤害周围敌人，同时治疗你自己。',f:(e,k)=>{fx.push({k:'ring',x:P.x,y:P.y,life:.5,c:'#ffe680'});aoe(P.x,P.y,120,en=>dmgE(en,PW()*.8*k));healP(PW()*1.2*k)}},
sprot:{c:'priest',n:'暗影防护',L:[30],cost:.1,d:'提高护甲，持续 10 分钟。',f:()=>buff('sprot',600)}};
function costOf(s){return P.cls==='warrior'?s.cost:Math.round(s.cost*stats().mp)}
function resOK(c){return(P.cls==='warrior'?P.rage:P.mana)>=c}
function spend(c){if(P.cls==='warrior')P.rage=Math.max(0,P.rage-c);else{P.mana=Math.max(0,P.mana-c);if(c>0)P.lastCast=tm}}
function learn(silent){const nw=[];for(const id in SK){const s=SK[id];if(s.c!==P.cls)continue;const r=s.L.filter(l=>l<=P.lvl).length;const o=P.known[id]||0;
 if(r>o){P.known[id]=r;nw.push(s.n+(s.L.length>1?`（等级${r}）`:''));if(!o&&!P.bar.includes(id)){const i=P.bar.indexOf(null);if(i>=0)P.bar[i]=id}}}
 if(nw.length&&!silent){SFX.learn();showLearn(nw)}return nw}
function showLearn(list){const el=$('learn');el.innerHTML='<b>学会了新技能</b><br>'+list.join('、')+'<br><small>点「技能」可以把技能放到按钮上</small>';el.style.display='block';clearTimeout(showLearn.h);showLearn.h=setTimeout(()=>el.style.display='none',5000)}
function useSkill(id){if(!id||P.dead||dialog)return;const s=SK[id],r=P.known[id];if(!s||!r)return;if(P.cast||P.chan)return msg('正在施法');
 if((P.cds[id]||0)>0)return msg('技能还没有冷却');if(P.gcd>0&&!s.offgcd)return;const c=costOf(s);if(!resOK(c))return msg(P.cls==='warrior'?'怒气不足':'法力不足');
 let e=null;if(s.t){e=(target&&!target.dead&&D(P,target)<s.rng+30)?target:null;if(!e){const n=nearest(s.rng,s.minr||0);if(n){e=n;target=n}}if(!e)return msg(target&&!target.dead?'距离太远':'没有目标');if(s.minr&&D(P,e)<s.minr)return msg('距离太近')}
 if(s.cond&&s.cond(e)!==true)return;const k=1+.18*(r-1);if(e)P.face=Math.atan2(e.y-P.y,e.x-P.x);
 if(s.cast){P.cast={id,t:s.cast,tot:s.cast,e,k};SFX.cast();if(!s.offgcd)P.gcd=1;return}
 spend(c);P.cds[id]=s.cd||0;if(!s.offgcd)P.gcd=1;
 if(s.chan){P.chan={id,t:s.chan,tot:s.chan,e,k,n:0,ctx:s.start?s.start(e):null};return}
 s.f(e,k)}
// ---------- MAP SWITCH ----------
const cam={x:560,y:560};
function setMap(id,x,y,quiet){MAP=MAPS[id];W=MAP.W;H=MAP.H;obs=MAP.obs;P.map=id;P.x=x;P.y=y;cam.x=x;cam.y=y;target=null;proj=[];fx=[];P.dash=null;P.cast=null;P.chan=null;spawnAll();if(!quiet)toast(MAP.n,1800);save()}
// ---------- INPUT ----------
const keys={};let joy=null,atkHeld=false;
addEventListener('keydown',e=>{const k=e.key.toLowerCase();keys[k]=1;if(e.key===' ')atkHeld=true;if(k>='1'&&k<='6')useSkill(P.bar[+k-1]);if(k==='q')usePot();if(k==='e')interact();if(k==='k')openK();});
addEventListener('keyup',e=>{keys[e.key.toLowerCase()]=0;if(e.key===' ')atkHeld=false});
['gesturestart','gesturechange','dblclick'].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
document.addEventListener('touchmove',e=>{if(!e.target.closest('.panel'))e.preventDefault()},{passive:false});
document.addEventListener('pointerdown',unlock,{capture:true});
cv.addEventListener('pointerdown',e=>{if(e.clientX<VW*.5&&!joy){joy={id:e.pointerId,ox:e.clientX,oy:e.clientY,x:e.clientX,y:e.clientY}}else{
 const wx=(e.clientX-VW/2)/SC+cam.x,wy=(e.clientY-VH/2)/SC+cam.y;let b=null,bd=55;enemies.forEach(en=>{if(!en.dead){const d=Math.hypot(en.x-wx,en.y-wy+10);if(d<bd){bd=d;b=en}}});if(b)target=b}});
addEventListener('pointermove',e=>{if(joy&&e.pointerId===joy.id){joy.x=e.clientX;joy.y=e.clientY}});
const endJ=e=>{if(joy&&e.pointerId===joy.id)joy=null};addEventListener('pointerup',endJ);addEventListener('pointercancel',endJ);
function bindBtn(id,down,up){const el=$(id);el.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();el.classList.add('pressed');down&&down()});const u=e=>{el.classList.remove('pressed');up&&up()};el.addEventListener('pointerup',u);el.addEventListener('pointerleave',u);el.addEventListener('pointercancel',u)}
bindBtn('atk',()=>atkHeld=true,()=>atkHeld=false);for(let i=0;i<6;i++)bindBtn('s'+(i+1),()=>useSkill(P.bar[i]));bindBtn('pot',usePot);bindBtn('act',interact);
bindBtn('bq',()=>{SFX.click();openQ()});bindBtn('bb',()=>{SFX.click();openB()});bindBtn('bk',()=>{SFX.click();openK()});bindBtn('bm',()=>{muted=!muted;$('bm').textContent=muted?'🔇':'🔊'});
document.querySelectorAll('.panel .x').forEach(x=>x.addEventListener('pointerdown',e=>{e.stopPropagation();x.parentElement.style.display='none'}));
// ---------- COMBAT ----------
function toast(t,ms=2200){const el=$('toast');el.innerHTML=t;el.style.opacity=1;clearTimeout(toast.h);toast.h=setTimeout(()=>el.style.opacity=0,ms)}
function ftxt(x,y,t,c,big){texts.push({x:x+R(-8,8),y,t,c,life:1.1,big})}
function nearest(range,min=0){let b=null,bd=range;enemies.forEach(e=>{if(e.dead||e.poly>0)return;const d=D(P,e);if(d<bd&&d>=min){bd=d;b=e}});return b}
function pickT(range){if(target&&!target.dead&&D(P,target)<range)return target;const n=nearest(range);if(n)target=n;return n}
function dmgE(e,amt,crit,col){if(e.dead)return;if(e.poly>0){e.poly=0}amt=Math.round(amt*(crit?1.8:1)*(1+.06*e.sun));e.hp-=amt;e.hurt=.2;ftxt(e.x,e.y-40,(crit?'暴击 ':'')+amt,crit?'#ffd24a':(col||'#fff'),crit);crit?SFX.crit():SFX.hit();
 if(e.st!=='chase'){e.st='chase';if(e.T.say&&Math.random()<.8)e.bubble={t:e.T.say[RI(0,e.T.say.length-1)],life:2.5}}
 if(P.cls==='warrior')P.rage=Math.min(100,P.rage+amt*.12);if(!target||target.dead)target=e;
 if(e.T.boss&&!e.enr&&e.hp<e.mhp*.3){e.enr=1;e.bubble={t:e.T.n+' 进入狂暴状态！',life:3};toast(e.T.n+' 进入了狂暴状态！')}
 if(e.t==='vancleef'&&!e.adds&&e.hp<e.mhp*.5){e.adds=1;e.bubble={t:'兄弟们，给我上！',life:3};for(let i=0;i<2;i++){const a=mkE('dblack',e.x+R(-80,80),e.y+(i?90:-90),-1);a.st='chase';a.summ=1;enemies.push(a)}}
 if(e.hp<=0)killE(e)}
function killE(e){e.dead=1;e.resp=MAP.inst?1e9:e.T.boss?40:25;e.dots=[];SFX.die();killed.add(e.t);
 const df=e.lvl-P.lvl,xp=Math.round((e.lvl*10+60)*e.T.xpm*clamp(1+df*(df>0?.06:.15),.12,1.3));gainXP(xp);
 for(const q of QUESTS){const s=QS[q.id];if(s.st!=='active'||!q.tgt||!q.tgt.includes(e.t)||s.c>=q.need)continue;
  if(q.kind==='kill'){s.c++;ftxt(P.x,P.y-74,`${q.n}: ${s.c}/${q.need}`,'#ffd24a')}else if(Math.random()<(q.need===1?.35:.6)){s.c++;ftxt(P.x,P.y-74,`${q.it}: ${s.c}/${q.need}`,'#ffd24a');SFX.loot()}
  if(s.c>=q.need){const g=QUESTS.find(x=>x.id===q.id);toast(`任务完成：${q.n}<br><span style="font-size:14px">回去找${npcName(g.t||g.g)}</span>`);SFX.quest()}}
 const drop=id=>{P.inv.push(id);const it=ITEMS[id];toast(`获得物品：<span class="${it.q}">[${it.n}]</span>`,2600);SFX.loot()};
 if(P.inv.length<30){const bl=BOSSLOOT[e.t];const cl=P.cls==='warrior'?0:3;
  if(bl)drop(genItem(e.lvl+1,bl[2],bl[cl+1],bl[cl]));if(e.t==='vancleef'){const b2=BOSSLOOT.vancleef2;drop(genItem(e.lvl,b2[2],b2[cl+1],b2[cl]))}
  if(!bl){const ch=e.T.elite?.5:.09;if(Math.random()<ch){const r=Math.random();drop(genItem(e.lvl,r<.04?'pu':r<.28?'bl':'gr'))}}}
 if(Math.random()<(e.T.boss?1:.2)){P.pots+=e.T.boss?2:1;ftxt(e.x,e.y-20,'+治疗药水','#7fff7f')}
 if(e.t==='shredder'){const s=mkE('sneed',e.x,e.y,-1);s.st='chase';s.bubble={t:ET.sneed.say[0],life:3};enemies.push(s);target=s}
 if(e.t==='vancleef')setTimeout(()=>toast('艾德温·范克里夫 被击败了！<br><span style="font-size:14px">回哨兵岭向格里安·斯托曼复命</span>',4000),300);
 if(target===e)target=null;save()}
function npcName(id){for(const m in MAPS){const n=MAPS[m].npcs.find(n=>n.id===id);if(n)return n.n}return''}
function has(id){return P.inv.includes(id)||Object.values(P.eq).includes(id)}
function gainXP(x){if(P.lvl>=MAXL)return;P.xp+=x;ftxt(P.x,P.y-55,'+'+x+' 经验','#c58aff');let up=false;while(P.lvl<MAXL&&P.xp>=XPN(P.lvl)){P.xp-=XPN(P.lvl);P.lvl++;up=true}
 if(up){const st=stats();P.hp=st.hp;P.mana=st.mp;SFX.lvl();toast(`升级了！你达到了 ${P.lvl} 级`);fx.push({k:'lvl',x:P.x,y:P.y,life:1.5});setTimeout(()=>learn(),900)}if(P.lvl>=MAXL)P.xp=0}
function usePot(){if(P.dead||P.pots<=0)return;const st=stats();if(P.hp>=st.hp&&P.mana>=st.mp){ftxt(P.x,P.y-60,'状态已满','#aaa');return}P.pots--;P.hp=Math.min(st.hp,P.hp+Math.round(st.hp*.5));P.mana=Math.min(st.mp,P.mana+Math.round(st.mp*.4));SFX.pot();ftxt(P.x,P.y-60,'+生命','#7fff7f');fx.push({k:'heal',x:P.x,y:P.y,life:.8});save()}
function hurtP(amt,src){if(P.dead)return;const st=stats();amt=Math.max(1,Math.round(amt-st.def*.5));if(DEV&&window.__god)amt=0;const b=P.bf;
 if(b.swall)amt=Math.round(amt*.25);if(b.sblock)amt=Math.round(amt*.6);
 if(b.pws&&amt>0){const a=Math.min(b.pws.amt,amt);b.pws.amt-=a;amt-=a;if(b.pws.amt<=0)delete b.pws;if(a)ftxt(P.x,P.y-50,'吸收','#fff')}
 if(b.mshield&&amt>0){const a=Math.min(b.mshield.amt,amt,P.mana/2);b.mshield.amt-=a;P.mana-=a*2;amt-=Math.round(a);if(b.mshield.amt<=1)delete b.mshield;if(a)ftxt(P.x,P.y-50,'吸收','#8ad0ff')}
 if(src&&src.T){if(b.retal&&!src.dead)melee(src,.6,null);if(b.farmor||b.iarmor)src.slow=Math.max(src.slow,3)}
 P.hp-=amt;P.hurt=.2;P.lastHit=tm;if(P.cls==='warrior')P.rage=Math.min(100,P.rage+amt*.6);if(amt>0){ftxt(P.x,P.y-50,'-'+amt,'#ff4a4a');SFX.hurt()}
 if(P.hp<=0){P.hp=0;P.dead=3;P.cast=null;P.chan=null;SFX.die();toast('你死了……灵魂将在墓地复活');target=null;enemies.forEach(e=>{if(e.st==='chase')e.st='return'})}}
// ---------- NPC / DIALOG ----------
function nearNpc(){return MAP.npcs.find(n=>D(P,n)<85)}
function interact(){const n=nearNpc();if(!n||dialog)return;SFX.click();
 if(n.id==='annie')return say(n,`愿圣光与你同在，年轻的${CLS[P.cls].n}。沿着大路往东南走，去金色小镇找<b>卫兵队长</b>，他需要人手。<br><br><small>提示：升级时会自动学会新技能。点右上角「技能」把技能放到按钮上。</small>`,[['好的','close']]);
 if(n.gift)return say(n,`欢迎！旅途劳顿吧？来，这些<b>治疗药水</b>拿着，省着点用。`,[['谢谢','gift']]);
 const ready=QUESTS.find(q=>(q.t||q.g)===n.id&&qReady(q));
 if(ready){const r=ready.rew;return say(n,(ready.fin||'干得好！这是你应得的奖赏。')+`<br><br>奖励：${ready.rxp} 经验`+(r?`，一件<span class="${r[1]}">${QN[r[1]]}${SLOTN[r[0]]}</span>`:'')+(ready.pot?`，治疗药水×${ready.pot}`:''),[['完成任务','turn:'+ready.id]])}
 const avail=QUESTS.filter(q=>q.g===n.id&&qAvail(q));
 if(avail.length){const q=avail[0];return say(n,`<b>【${q.n}】</b><br>${q.txt}`,[['接受任务','acc:'+q.id],['稍后','close']])}
 const act=QUESTS.filter(q=>q.g===n.id&&QS[q.id].st==='active');
 if(act.length)return say(n,'任务进行得怎么样？<br>'+act.map(q=>`· ${q.n}：${QS[q.id].c}/${q.need}`).join('<br>'),[['我这就去','close']]);
 say(n,n.id==='gryan'?(QS.w7.st==='done'?'西部荒野的人民永远不会忘记你，英雄。':'为了西部荒野！'):n.id==='saldean'?'愿今年能有个好收成……':'这一带现在太平多了，都多亏了你。',[['再见','close']])}
function say(n,txt,btns){dialog=true;$('dname').textContent=n.n;$('dtext').innerHTML=txt;const b=$('dbtns');b.innerHTML='';btns.forEach(([l,a])=>{const d=document.createElement('div');d.className='pbtn';d.textContent=l;d.addEventListener('pointerdown',e=>{e.stopPropagation();doAct(a,n)});b.appendChild(d)});$('pd').style.display='block'}
function closeD(){dialog=false;$('pd').style.display='none'}
function doAct(a,n){SFX.click();closeD();
 if(a==='gift'){if(!P.giftT||tm-P.giftT>90||P.pots<1){P.pots+=2;P.giftT=tm;toast('获得 治疗药水 ×2')}else toast('别贪心哦，过一会儿再来！');}
 if(a.startsWith('acc:')){const id=a.slice(4),q=QUESTS.find(q=>q.id===id);QS[id].st='active';QS[id].c=q.kind==='talk'?1:0;SFX.quest();toast('接受任务：'+q.n);setTimeout(interact,350)}
 if(a.startsWith('turn:')){const id=a.slice(5),q=QUESTS.find(q=>q.id===id);QS[id].st='done';SFX.quest();gainXP(q.rxp);if(q.rew){const iid=genItem(q.rew[2],q.rew[1],q.rew[0]);P.inv.push(iid);toast(`任务完成：${q.n}<br><span style="font-size:14px">获得 <span class="${q.rew[1]}">[${ITEMS[iid].n}]</span></span>`,3000)}else toast('任务完成：'+q.n);if(q.pot)P.pots+=q.pot;
  if(id==='w7'){won=true;setTimeout(victory,700)}else setTimeout(interact,450)}
 save()}
function victory(){SFX.win();say({n:'胜利！'},`<div style="text-align:center;font-size:16px">🏆 <b>西部荒野的英雄</b> 🏆<br><br>你击败了艾德温·范克里夫，瓦解了迪菲亚兄弟会。<br>暴风城和西部荒野都会传颂你的名字，${CLS[P.cls].n}！<br><br><small>可以继续练到 30 级、刷死亡矿井的装备，或回到标题换个职业重新开始。</small></div>`,[['继续冒险','close']])}
function openQ(){let h='';QUESTS.forEach(q=>{const s=QS[q.id];if(s.st==='none')return;h+=`<p class="${s.st==='done'?'q-done':''}"><b>${q.n}</b> ${s.st==='done'?'（已完成）':s.c>=q.need?'（可交付：'+npcName(q.t||q.g)+'）':`${s.c}/${q.need}`}<br><small>${q.d}</small></p>`});
 const nx=QUESTS.find(q=>qAvail(q));$('qbody').innerHTML=(h||'<p>还没有任务。</p>')+(nx?`<p><small>新任务：去找<b>${npcName(nx.g)}</b></small></p>`:'');$('pq').style.display='block'}
function istat(it){return`${SLOTN[it.s]}${it.lv?' · '+it.lv+'级':''} ${it.atk?'强度+'+it.atk:''} ${it.def?'护甲+'+it.def:''} ${it.hp?'生命+'+it.hp:''}`}
function openB(){const st=stats();let h=`<p><b>${CLS[P.cls].n}</b> 等级 ${P.lvl}　生命 ${Math.ceil(P.hp)}/${st.hp}　${st.mp?`法力 ${Math.ceil(P.mana)}/${st.mp}　`:''}强度 ${st.atk}　护甲 ${st.def}　药水 ×${P.pots}</p><b>装备</b>（点击卸下）<br>`;
 for(const s in SLOTN){const it=ITEMS[P.eq[s]];h+=`<div class="item" data-un="${s}">${SLOTN[s]}：${it?`<span class="${it.q}">${it.n}</span>`:'—'}</div>`}
 h+=`<br><br><b>背包</b> ${P.inv.length}/30（点击装备，点 ✕ 丢弃）<br>`;if(!P.inv.length)h+='<small>空空如也</small>';
 P.inv.forEach((id,i)=>{const it=ITEMS[id];if(!it)return;const cur=ITEMS[P.eq[it.s]];const sc=x=>x?(x.atk||0)*2+(x.def||0)+(x.hp||0)*.3:0;const up=sc(it)>sc(cur)?' <b style="color:#1a8a1a">▲</b>':'';
  h+=`<div class="item" data-eq="${i}"><span class="${it.q}">${it.n}</span>${up} <span class="del" data-del="${i}">✕</span><br><small>${istat(it)}</small></div>`});
 $('bbody').innerHTML=h;$('pb').style.display='block';
 $('bbody').querySelectorAll('[data-del]').forEach(el=>el.addEventListener('pointerdown',e=>{e.stopPropagation();const i=+el.dataset.del;delete P.gear[P.inv[i]];P.inv.splice(i,1);save();openB()}));
 $('bbody').querySelectorAll('[data-eq]').forEach(el=>el.addEventListener('pointerdown',()=>{const i=+el.dataset.eq,id=P.inv[i],s=ITEMS[id].s;P.inv.splice(i,1);if(P.eq[s])P.inv.push(P.eq[s]);P.eq[s]=id;P.hp=Math.min(P.hp,stats().hp);SFX.loot();save();openB()}));
 $('bbody').querySelectorAll('[data-un]').forEach(el=>el.addEventListener('pointerdown',()=>{const s=el.dataset.un;if(P.eq[s]){P.inv.push(P.eq[s]);delete P.eq[s];P.hp=Math.min(P.hp,stats().hp);save();openB()}}))}
let pick=null;
function openK(){let h='<div class="bar">动作条：';for(let i=0;i<6;i++){const s=SK[P.bar[i]];h+=`<span class="slot${pick?' hl':''}" data-slot="${i}">${i+1}. ${s?s.n:'（空）'}</span>`}h+='</div>';
 h+=pick?`<p style="color:#7a1a0a"><b>把「${SK[pick].n}」放到哪个按钮？点上面的格子。</b> <span class="pbtn" data-cancel=1>取消</span></p>`:'<p><small>点已学会的技能，再点动作条格子来放置。点动作条上的技能可以清空该格。升级时自动学会新技能和新等级。</small></p>';
 for(const id in SK){const s=SK[id];if(s.c!==P.cls)continue;const r=P.known[id]||0;const nx=s.L.find(l=>l>P.lvl);
  h+=`<div class="sk${r?'':' locked'}" data-sk="${id}"><b>${s.n}</b> ${r?(s.L.length>1?`等级${r}/${s.L.length}`:'已学会'):`<span style="color:#8a2a1a">${s.L[0]} 级学会</span>`}${r&&nx?` <small>（${nx}级升级）</small>`:''}<br><small>${s.cost?(P.cls==='warrior'?s.cost+' 怒气':Math.round(s.cost*100)+'% 法力'):'无消耗'}${s.cast?' · 施法 '+s.cast+' 秒':s.chan?' · 引导 '+s.chan+' 秒':' · 瞬发'}${s.cd?' · 冷却 '+s.cd+' 秒':''}${s.rng?' · 射程 '+Math.round(s.rng/10)+' 码':''}<br>${s.d}</small></div>`}
 $('kbody').innerHTML=h;$('pk').style.display='block';
 $('kbody').querySelectorAll('[data-sk]').forEach(el=>el.addEventListener('pointerdown',()=>{if(!P.known[el.dataset.sk])return;pick=el.dataset.sk;SFX.click();openK();$('pk').scrollTop=0}));
 $('kbody').querySelectorAll('[data-slot]').forEach(el=>el.addEventListener('pointerdown',()=>{const i=+el.dataset.slot;if(pick){const j=P.bar.indexOf(pick);if(j>=0)P.bar[j]=P.bar[i];P.bar[i]=pick;pick=null}else P.bar[i]=null;SFX.click();save();openK()}));
 const c=$('kbody').querySelector('[data-cancel]');if(c)c.addEventListener('pointerdown',()=>{pick=null;openK()})}
// ---------- UPDATE ----------
function gateClosed(g){return!g.boss.every(t=>killed.has(t))}
function collide(o,r){o.x=clamp(o.x,20,W-20);o.y=clamp(o.y,20,H-20);const L=MAP.gates.length?obs.concat(MAP.gates.filter(gateClosed).map(g=>({t:'r',...g}))):obs;
 for(const b of L){if(b.t==='c'){const dx=o.x-b.x,dy=o.y-b.y,d=Math.hypot(dx,dy),m=b.r+r;if(d<m&&d>0){o.x=b.x+dx/d*m;o.y=b.y+dy/d*m}}else if(inRect(o.x,o.y,b,r)){const l=o.x-(b.x-r),rr=b.x+b.w+r-o.x,t=o.y-(b.y-r),bt=b.y+b.h+r-o.y,mn=Math.min(l,rr,t,bt);if(mn===l)o.x=b.x-r;else if(mn===rr)o.x=b.x+b.w+r;else if(mn===t)o.y=b.y-r;else o.y=b.y+b.h+r}}}
let saveT=0,inPortal=true;
function update(dt){tm+=dt;const st=stats();
 for(const k in P.cds)P.cds[k]=Math.max(0,P.cds[k]-dt);P.gcd=Math.max(0,P.gcd-dt);P.swing=Math.max(0,P.swing-dt);P.hurt=Math.max(0,P.hurt-dt);
 for(const k in P.bf){const b=P.bf[k];b.t-=dt;if(k==='renew'&&!P.dead){P.hp=Math.min(st.hp,P.hp+b.hps*dt)}if(b.t<=0)delete P.bf[k]}
 const inCombat=enemies.some(e=>e.st==='chase'&&!e.dead);
 if(P.dead){P.dead-=dt;if(P.dead<=0){P.dead=0;P.x=MAP.spawn[0];P.y=MAP.spawn[1];cam.x=P.x;cam.y=P.y;P.hp=st.hp*.6;P.mana=st.mp*.6;P.rage=0;save()}}
 else if(P.dash){const e=P.dash.e,a=Math.atan2(e.y-P.y,e.x-P.x);P.face=a;const d=D(P,e);const s=900*dt;if(d>e.T.r+20&&P.dash.t>0&&!e.dead){P.x+=Math.cos(a)*Math.min(s,d);P.y+=Math.sin(a)*Math.min(s,d);P.dash.t-=dt;if(Math.random()<.6)fx.push({k:'dust',x:P.x,y:P.y+10,life:.4})}else{if(!e.dead){e.stun=Math.max(e.stun,P.dash.stun);dmgE(e,st.atk*.6,false);ftxt(e.x,e.y-55,'昏迷','#ffd24a')}P.dash=null}collide(P,14)}
 else if(!dialog){let mx=0,my=0;if(keys.a||keys.arrowleft)mx--;if(keys.d||keys.arrowright)mx++;if(keys.w||keys.arrowup)my--;if(keys.s||keys.arrowdown)my++;
  if(joy){const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.hypot(dx,dy);if(d>8){const k=Math.min(1,d/55);mx=dx/d*k;my=dy/d*k}}
  const m=Math.hypot(mx,my);if(m>1){mx/=m;my/=m}
  if(m>.05&&(P.cast||P.chan)){P.cast=null;P.chan=null;ftxt(P.x,P.y-60,'施法被打断','#aaa')}
  const sp=175;P.x+=mx*sp*dt;P.y+=my*sp*dt;if(m>.05){P.face=Math.atan2(my,mx);P.anim+=dt*m*10}collide(P,14);
  // casting
  if(P.cast){const c=P.cast,s=SK[c.id];c.t-=dt;if(c.e&&!c.e.dead)P.face=Math.atan2(c.e.y-P.y,c.e.x-P.x);if(c.t<=0){P.cast=null;const cost=costOf(s);
   if(s.t&&(c.e.dead||D(P,c.e)>s.rng+60))msg('目标丢失');else if(!resOK(cost))msg('法力不足');else{spend(cost);P.cds[c.id]=s.cd||0;s.f(c.e,c.k)}}}
  else if(P.chan){const c=P.chan,s=SK[c.id];c.t-=dt;const every=c.tot/s.ticks;while(c.n<s.ticks&&c.tot-c.t>=every*(c.n+1)-.001){c.n++;s.tick(c.e,c.k,c.ctx)}if(c.t<=0||(s.t&&c.e.dead&&c.id!=='bliz'))P.chan=null}
  // auto attack
  else if(atkHeld&&(P.cds.atk||0)<=0){if(P.cls==='warrior'){const e=pickT(72);if(e){melee(e,1,null);P.cds.atk=.9}else{P.cds.atk=.3;if(!P.swing){P.swing=.2;SFX.swing()}}}
   else{const e=pickT(260);if(e){P.face=Math.atan2(e.y-P.y,e.x-P.x);bolt(e,.75,P.cls==='mage'?'#e07aff':'#fff6c0',1);SFX.arcane();P.cds.atk=1.4}else{P.cds.atk=.3;msg('没有目标')}}}}
 if(!inCombat)P.rage=Math.max(0,P.rage-dt*3);
 if(st.mp){const fsr=tm-P.lastCast>5;P.mana=Math.min(st.mp,P.mana+st.mp*(fsr?(inCombat?.025:.06):.006)*dt)}
 if(!P.dead&&!inCombat&&P.hp<st.hp)P.hp=Math.min(st.hp,P.hp+st.hp*.03*dt);
 // portals
 let ip=null;for(const p of MAP.portals)if(inRect(P.x,P.y,p))ip=p;if(ip&&!inPortal&&!P.dead){inPortal=true;if(ip.rec&&P.lvl<ip.rec)setTimeout(()=>toast(`${ip.n} 建议等级 ${ip.rec}+，小心！`,2500),1900);setMap(ip.to,ip.tx,ip.ty);return}if(!ip)inPortal=false;
 // projectiles
 proj=proj.filter(p=>{if(p.e.dead)return false;const tx=p.e.x,ty=p.e.y-15,d=Math.hypot(tx-p.x,ty-p.y),s=p.sp*dt;if(d<=s+6){p.cb(p.e);fx.push({k:'pop',x:tx,y:ty,c:p.col,life:.3});return false}p.x+=(tx-p.x)/d*s;p.y+=(ty-p.y)/d*s;return true});
 // enemies
 for(const e of enemies){e.anim+=dt;e.hurt=Math.max(0,e.hurt-dt);if(e.bubble){e.bubble.life-=dt;if(e.bubble.life<=0)e.bubble=null}
  if(e.dead){if(e.summ)continue;e.resp-=dt;if(e.resp<=0)Object.assign(e,mkE(e.t,e.hx,e.hy,e.sp));continue}
  for(const d of e.dots){d.t-=dt;if(d.t<=0&&d.n>0){d.t+=d.every;d.n--;dmgE(e,d.per,false,d.col);if(e.dead)break}}if(e.dead)continue;e.dots=e.dots.filter(d=>d.n>0);
  ['slow','root','fear','demo','disarm'].forEach(k=>{if(e[k]>0)e[k]=Math.max(0,e[k]-dt)});if(e.sunT>0){e.sunT-=dt;if(e.sunT<=0)e.sun=0}
  if(e.poly>0){e.poly-=dt;e.st='idle';e.slam=null;if(Math.random()<dt){e.tx=e.x+R(-20,20);e.ty=e.y+R(-20,20)}continue}
  if(e.stun>0){e.stun-=dt;continue}const sp=e.T.sp*(e.slow?.5:1)*(e.enr?1.25:1)*(e.root?0:1);
  const dp=D(e,P),dh=Math.hypot(e.x-e.hx,e.y-e.hy);
  if(e.fear>0){if(dp>0){e.x+=(e.x-P.x)/dp*e.T.sp*.7*dt;e.y+=(e.y-P.y)/dp*e.T.sp*.7*dt}e.face=Math.sign(e.x-P.x)||1;collide(e,e.T.r*.7);continue}
  if(e.st==='idle'){e.wt-=dt;if(e.wt<=0){e.wt=R(2,5);e.tx=e.hx+R(-80,80);e.ty=e.hy+R(-80,80)}const d=Math.hypot(e.tx-e.x,e.ty-e.y);if(d>5&&sp){e.x+=(e.tx-e.x)/d*sp*.35*dt;e.y+=(e.ty-e.y)/d*sp*.35*dt;e.face=Math.sign(e.tx-e.x)||e.face}
   if(!P.dead&&dp<e.T.ag*(e.lvl>P.lvl+1?1.2:.8)){e.st='chase';if(e.T.say)e.bubble={t:e.T.say[RI(0,e.T.say.length-1)],life:2.5}}}
  else if(e.st==='chase'){if(P.dead||dh>(MAP.inst?900:600)){e.st='return';continue}e.face=Math.sign(P.x-e.x)||e.face;const reach=e.T.r+22;
   if(dp>reach){e.x+=(P.x-e.x)/dp*sp*dt;e.y+=(P.y-e.y)/dp*sp*dt}else{e.cd-=dt;if(e.cd<=0){e.cd=e.T.boss?1.3:1.5;e.atk=.25;hurtP((3+1.6*e.lvl)*e.T.dm*R(.85,1.15)*(e.enr?1.3:1)*(e.demo?.8:1)*(e.disarm?.5:1),e)}}
   if(e.T.slam){e.special-=dt;if(e.special<=0&&!e.slam){e.slam={x:P.x,y:P.y,t:1.2};e.bubble={t:e.T.slam,life:1.5};e.special=e.enr?5:7}
    if(e.slam){e.slam.t-=dt;if(e.slam.t<=0){fx.push({k:'thunder',x:e.slam.x,y:e.slam.y,life:.5,c:'#c84a1a'});SFX.thunder();if(Math.hypot(P.x-e.slam.x,P.y-e.slam.y)<110)hurtP((3+1.6*e.lvl)*2.2,e);e.slam=null}}}}
  else if(e.st==='return'){const d=dh;if(d<10){e.st='idle';e.hp=e.mhp;e.enr=0}else{e.x+=(e.hx-e.x)/d*e.T.sp*1.5*dt;e.y+=(e.hy-e.y)/d*e.T.sp*1.5*dt;e.hp=Math.min(e.mhp,e.hp+e.mhp*dt)}}
  if(e.atk)e.atk=Math.max(0,e.atk-dt);collide(e,e.T.r*.7)}
 for(const e of enemies){if(e.dead)continue;const d=D(e,P);if(d<e.T.r+12&&d>0){e.x+=(e.x-P.x)/d*2;e.y+=(e.y-P.y)/d*2}}
 fx=fx.filter(f=>(f.life-=dt)>0);texts=texts.filter(t=>{t.life-=dt;t.y-=30*dt;return t.life>0});
 cam.x+=(P.x-cam.x)*Math.min(1,dt*8);cam.y+=(P.y-cam.y)*Math.min(1,dt*8);
 const nn=nearNpc();$('act').style.display=nn&&!dialog?'flex':'none';
 for(let i=0;i<6;i++){const id=P.bar[i],el=$('s'+(i+1)),s=SK[id];const lab=el.querySelector('span');const nm=s?s.n:'';if(lab.dataset.n!==nm){lab.dataset.n=nm;lab.textContent=nm;el.classList.toggle('empty',!s);lab.style.fontSize=nm.length>4?'10px':'12px'}
  const c=el.querySelector('.cd');if(!s){c.style.height='0';continue}const cd=P.cds[id]||0;const v=cd>0?cd/(s.cd||1):(P.gcd>0&&!s.offgcd?P.gcd:0);c.style.height=(clamp(v,0,1)*100)+'%';el.style.opacity=resOK(costOf(s))?1:.5}
 $('atk').querySelector('span').textContent=P.cls==='warrior'?'攻击':'射击';
 $('potn').textContent=P.pots;saveT+=dt;if(saveT>5){saveT=0;save()}}
// ---------- DRAW ----------
function shadow(x,y,r){cx.fillStyle='rgba(0,0,0,.3)';cx.beginPath();cx.ellipse(x,y,r,r*.45,0,0,7);cx.fill()}
const QC={'':'#8a6a3a',gr:'#6a8a4a',bl:'#4a6aa8',pu:'#7a4aa8'};
function drawHero(x,y,face,anim,swing,hurt){const step=Math.sin(anim)*4,fl=Math.cos(face)<0?-1:1,c=P.cls,eq=P.eq,ch=ITEMS[eq.chest];shadow(x,y+14,14);cx.save();cx.translate(x,y);cx.scale(fl,1);
 if(c==='warrior'){cx.fillStyle=eq.legs?'#6b4a2a':'#4a3a6a';cx.fillRect(-7,4+step*.3,5,12-step*.5);cx.fillRect(2,4-step*.3,5,12+step*.5);cx.fillStyle='#2a1a0a';cx.fillRect(-8,14+step*.3,7,4);cx.fillRect(2,14-step*.3,7,4);
  cx.fillStyle=ch&&ch.q?'#9aa4b0':'#8a6a3a';cx.beginPath();cx.roundRect(-10,-12,20,18,4);cx.fill();if(ch&&ch.q){cx.fillStyle=QC[ch.q];cx.fillRect(-4,-11,8,16);cx.fillStyle='#e8c14a';cx.fillRect(-2,-6,4,4)}
  cx.fillStyle='#5a3a1a';cx.fillRect(-10,2,20,3);cx.fillStyle='#2a4a9a';cx.beginPath();cx.moveTo(-15,-8);cx.lineTo(-7,-8);cx.lineTo(-7,4);cx.lineTo(-11,8);cx.lineTo(-15,4);cx.fill();cx.strokeStyle='#e8c14a';cx.lineWidth=1.5;cx.stroke();
  cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();if(eq.head){cx.fillStyle='#a8a8b0';cx.beginPath();cx.arc(0,-21,8.5,Math.PI,0);cx.fill();cx.fillRect(-1,-30,2,5)}else{cx.fillStyle='#6a4a2a';cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill()}
  cx.fillStyle='#222';cx.fillRect(3,-20,2,2);const w=ITEMS[eq.weapon],wq=w?w.q:'';
  const sa=swing>0?(-1.6+(1-swing/.25)*2.6):0.5;cx.save();cx.translate(9,-6);cx.rotate(sa);cx.fillStyle='#f0c8a0';cx.fillRect(-2,0,4,8);cx.fillStyle='#6b4a22';cx.fillRect(-1.5,7,3,5);cx.fillStyle='#e8c14a';cx.fillRect(-5,11,10,2.5);
  cx.fillStyle=wq==='pu'?'#d0a0ff':wq==='bl'?'#bfe8ff':wq?'#d0d0d8':'#a07a4a';cx.fillRect(-2,13,4,wq?22:18);if(wq==='bl'||wq==='pu'){cx.fillStyle=wq==='pu'?'rgba(200,120,255,.4)':'rgba(150,220,255,.4)';cx.fillRect(-4,13,8,22)}cx.restore()}
 else{const robe=c==='mage'?(ch&&ch.q?QC[ch.q]:'#5a3a9a'):'#ecebe4',trim=c==='mage'?'#e8c14a':'#d8b040';
  cx.fillStyle='#2a1a0a';cx.fillRect(-7,13+step*.3,6,4);cx.fillRect(2,13-step*.3,6,4);
  cx.fillStyle=robe;cx.beginPath();cx.moveTo(-12,16);cx.lineTo(-8,-12);cx.lineTo(8,-12);cx.lineTo(12,16);cx.fill();cx.fillStyle=trim;cx.fillRect(-1.5,-10,3,26);cx.fillRect(-12,14,24,2.5);
  if(c==='priest'&&ch&&ch.q){cx.fillStyle=QC[ch.q];cx.fillRect(-8,-12,16,4)}
  cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#222';cx.fillRect(3,-20,2,2);
  if(c==='mage'){cx.fillStyle=robe;cx.beginPath();cx.moveTo(-10,-17);cx.quadraticCurveTo(0,-36,10,-17);cx.lineTo(9,-22);cx.quadraticCurveTo(0,-30,-9,-22);cx.fill();cx.beginPath();cx.moveTo(-9,-20);cx.lineTo(-2,-34);cx.lineTo(8,-21);cx.fill();cx.fillStyle='#ddd';cx.fillRect(-3,-12,6,3)}
  else{cx.fillStyle='#e8d070';cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill();cx.fillStyle='#fff';cx.fillRect(-8,-23,16,2)}
  const glow=P.cast||P.chan,gc=glow?(SK[(P.cast||P.chan).id].c==='mage'?'#8ad8ff':'#ffe680'):null;cx.save();cx.translate(9,-6);cx.rotate(swing>0?-.6:.25);cx.fillStyle='#f0c8a0';cx.fillRect(-2,0,4,7);
  if(c==='mage'){cx.fillStyle='#6b4a22';cx.fillRect(-1.5,-22,3,40);cx.fillStyle=gc||'#8a5aff';cx.beginPath();cx.arc(0,-24,glow?6:4,0,7);cx.fill()}else{cx.fillStyle='#8a6a3a';cx.fillRect(-1.5,-6,3,24);cx.fillStyle='#e8c14a';cx.beginPath();cx.arc(0,-8,5,0,7);cx.fill()}
  if(glow){cx.fillStyle=gc;cx.globalAlpha=.35+.25*Math.sin(tm*20);cx.beginPath();cx.arc(0,c==='mage'?-24:-8,13,0,7);cx.fill();cx.globalAlpha=1}cx.restore()}
 if(hurt>0){cx.globalCompositeOperation='source-atop';cx.fillStyle='rgba(255,0,0,.4)';cx.fillRect(-20,-36,40,56);cx.globalCompositeOperation='source-over'}cx.restore();
 if(swing>0&&c==='warrior'){cx.strokeStyle=`rgba(255,255,255,${swing*3})`;cx.lineWidth=3;cx.beginPath();cx.arc(x,y-4,30,face-1,face+1);cx.stroke()}
 if(P.bf.pws||P.bf.mshield){cx.strokeStyle=P.bf.pws?'rgba(255,240,160,.7)':'rgba(140,200,255,.7)';cx.lineWidth=2;cx.beginPath();cx.arc(x,y-4,24,0,7);cx.stroke()}
 if(P.bf.swall||P.bf.sblock){cx.strokeStyle='rgba(180,200,255,.6)';cx.lineWidth=3;cx.beginPath();cx.arc(x,y-4,22,2,4.3);cx.stroke()}}
function drawHuman(e){const T=e.T,k=T.k||1,s=Math.sin(e.anim*(e.st==='chase'?12:5))*3,lk=T.look;shadow(e.x,e.y+14*k,13*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 const pal={thug:['#6a4a2a','#8a5a32','#b8281a'],raider:['#3a3030','#5a3a2a','#b8281a'],miner:['#5a4a3a','#7a6a52','#b8281a'],pirate:['#2a2a4a','#e8e0d0','#b8281a'],black:['#1a1a1a','#2a2a2a','#2a2a2a'],vancleef:['#1a1a1a','#2a2222','#a01a1a']}[lk];
 cx.fillStyle=pal[0];cx.fillRect(-7,4,5,12+s*.4);cx.fillRect(2,4,5,12-s*.4);cx.fillStyle='#1a1008';cx.fillRect(-8,14,7,3);cx.fillRect(2,14,7,3);
 cx.fillStyle=pal[1];cx.beginPath();cx.roundRect(-10,-12,20,18,4);cx.fill();if(lk==='pirate'){cx.fillStyle='#2a2a6a';for(let i=0;i<3;i++)cx.fillRect(-10,-9+i*6,20,2)}
 if(lk==='vancleef'){cx.fillStyle='#4a2a1a';cx.fillRect(-10,-12,20,4);cx.fillStyle='#600';cx.beginPath();cx.moveTo(-12,-10);cx.lineTo(-16,14);cx.lineTo(-6,6);cx.fill()}
 cx.fillStyle='#4a2a1a';cx.fillRect(-10,2,20,3);cx.fillStyle='#e0b890';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();
 cx.fillStyle=pal[2];cx.fillRect(-8,-18,16,6);cx.beginPath();cx.arc(0,-21,8.3,Math.PI,0);cx.fill();cx.fillRect(-11,-22,4,8);cx.fillStyle='#fff';cx.fillRect(3,-21,2,2);
 if(lk==='miner'){cx.fillStyle='#8a8a8a';cx.beginPath();cx.arc(0,-23,8.5,Math.PI,0);cx.fill();cx.fillStyle='#ffe08a';cx.fillRect(-2,-31,4,4)}
 const wt=lk==='miner'?'pick':'sword';cx.save();cx.translate(9,-5);cx.rotate(e.atk?-1.4:.4);cx.fillStyle='#e0b890';cx.fillRect(-2,0,4,7);
 if(wt==='pick'){cx.fillStyle='#6b4a22';cx.fillRect(-1,-2,3,22);cx.fillStyle='#aaa';cx.fillRect(-7,18,14,3)}else{cx.fillStyle='#5a3a1a';cx.fillRect(-1.5,6,3,4);cx.fillStyle=lk==='vancleef'?'#d0d8ff':'#c8c8d0';cx.fillRect(-1.5,10,3,lk==='vancleef'?24:18)}cx.restore();
 if(lk==='vancleef'){cx.save();cx.translate(-9,-5);cx.rotate(e.atk?1.2:-.4);cx.fillStyle='#d0d8ff';cx.fillRect(-1.5,8,3,22);cx.restore()}cx.restore()}
function drawGolem(e){const T=e.T,k=T.k||1.1,s=Math.sin(e.anim*(e.st==='chase'?9:4))*2;shadow(e.x,e.y+16*k,16*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle='#5a4a3a';cx.fillRect(-9,4,6,13+s);cx.fillRect(3,4,6,13-s);cx.fillStyle=T.shred?'#7a7a72':'#8a7a5a';cx.beginPath();cx.roundRect(-13,-16,26,22,5);cx.fill();cx.fillStyle='#4a4038';for(let i=0;i<3;i++)cx.fillRect(-11+i*8,-13,4,4);
 if(T.shred){cx.fillStyle='#3a5a2a';cx.beginPath();cx.arc(0,-22,7,0,7);cx.fill();cx.fillStyle='#8ad0ff';cx.globalAlpha=.4;cx.beginPath();cx.arc(0,-22,9,Math.PI,0);cx.fill();cx.globalAlpha=1;
  cx.save();cx.translate(15,-4);cx.rotate(tm*(e.st==='chase'?20:4));cx.fillStyle='#ccc';for(let i=0;i<8;i++){cx.rotate(.785);cx.fillRect(-1,-11,2,4)}cx.beginPath();cx.arc(0,0,8,0,7);cx.fill();cx.restore()}
 else{cx.fillStyle='#8a7a5a';cx.beginPath();cx.arc(2,-22,7,0,7);cx.fill();cx.fillStyle=e.st==='chase'?'#ff3a1a':'#ffd24a';cx.fillRect(4,-24,3,3);
  cx.save();cx.translate(12,-8);cx.rotate(e.atk?1:-.3);cx.fillStyle='#6b4a22';cx.fillRect(-1,-16,3,20);cx.fillStyle='#ccc';cx.beginPath();cx.moveTo(0,-16);cx.quadraticCurveTo(12,-18,14,-6);cx.lineTo(1,-12);cx.fill();cx.restore()}cx.restore()}
function drawMurloc(e){const T=e.T,k=T.k||1,s=Math.sin(e.anim*(e.st==='chase'?14:6))*3;shadow(e.x,e.y+11*k,12*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle='#3a7a5a';cx.fillRect(-6,4,4,9+s*.5);cx.fillRect(2,4,4,9-s*.5);cx.fillStyle='#4a9a6a';cx.beginPath();cx.ellipse(0,-4,11,12,0,0,7);cx.fill();cx.fillStyle='#8ad0a0';cx.beginPath();cx.ellipse(2,0,6,8,0,0,7);cx.fill();
 cx.fillStyle='#e05a5a';cx.beginPath();cx.moveTo(-4,-15);cx.lineTo(0,-24);cx.lineTo(4,-15);cx.fill();cx.fillStyle='#fff';cx.beginPath();cx.arc(5,-9,3,0,7);cx.fill();cx.fillStyle='#000';cx.fillRect(6,-10,2,2);
 cx.fillStyle='#2a1a1a';cx.fillRect(4,-4,8,e.atk?5:2);if(T.hat){cx.fillStyle='#fff';cx.fillRect(-6,-22,12,6);cx.beginPath();cx.arc(0,-25,7,0,7);cx.fill()}
 cx.save();cx.translate(10,-2);cx.rotate(e.atk?-1.2:.3);cx.fillStyle=T.hat?'#aaa':'#6b4a22';cx.fillRect(-1,-14,3,16);if(T.hat){cx.beginPath();cx.ellipse(0,-15,5,3,0,0,7);cx.fill()}cx.restore();cx.restore()}
function drawOgre(e){const k=e.T.k||1.6,s=Math.sin(e.anim*(e.st==='chase'?9:4))*2;shadow(e.x,e.y+16*k,15*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle='#6a4a2a';cx.fillRect(-9,4,7,12+s);cx.fillRect(2,4,7,12-s);cx.fillStyle='#b08a5a';cx.beginPath();cx.ellipse(0,-6,14,14,0,0,7);cx.fill();cx.fillStyle='#5a3a1a';cx.fillRect(-14,0,28,6);
 cx.fillStyle='#b08a5a';cx.beginPath();cx.arc(3,-22,8,0,7);cx.fill();cx.fillStyle='#fff';cx.fillRect(7,-18,2,4);cx.fillStyle=e.enr?'#f22':'#222';cx.fillRect(5,-24,3,2);
 cx.save();cx.translate(13,-8);cx.rotate(e.atk?1.3:-.5);cx.fillStyle='#5a3a1a';cx.fillRect(-2,-22,5,26);cx.fillStyle='#777';cx.fillRect(-7,-30,14,10);cx.restore();cx.restore()}
function drawGoblin(e){const k=e.T.k||1,s=Math.sin(e.anim*(e.st==='chase'?13:5))*3;shadow(e.x,e.y+11*k,11*k);cx.save();cx.translate(e.x,e.y);cx.scale(e.face*k,k);
 cx.fillStyle='#4a3a2a';cx.fillRect(-6,4,4,9+s*.4);cx.fillRect(2,4,4,9-s*.4);cx.fillStyle=e.t==='gilnid'?'#5a3a2a':'#7a5a3a';cx.beginPath();cx.roundRect(-8,-9,16,14,3);cx.fill();
 cx.fillStyle='#6ab04a';cx.beginPath();cx.arc(1,-15,7,0,7);cx.fill();cx.beginPath();cx.moveTo(-5,-17);cx.lineTo(-15,-21);cx.lineTo(-5,-13);cx.fill();cx.beginPath();cx.moveTo(6,-17);cx.lineTo(15,-21);cx.lineTo(6,-13);cx.fill();
 cx.fillStyle='#ffd24a';cx.fillRect(3,-17,2,2);if(e.t!=='dgob'){cx.fillStyle='#333';cx.fillRect(-6,-22,14,4);cx.fillStyle='#8ad0ff';cx.fillRect(1,-21,4,2)}
 cx.save();cx.translate(8,-4);cx.rotate(e.atk?-1.3:.4);cx.fillStyle='#6b4a22';cx.fillRect(-1,-12,3,14);cx.fillStyle='#bbb';cx.fillRect(-4,-14,9,4);cx.restore();cx.restore()}
function drawSheep(e){shadow(e.x,e.y+10,14);cx.save();cx.translate(e.x,e.y);cx.scale(e.face,1);cx.fillStyle='#333';cx.fillRect(-8,4,3,8);cx.fillRect(5,4,3,8);cx.fillStyle='#f4f4f0';cx.beginPath();cx.ellipse(0,0,14,10,0,0,7);cx.fill();cx.fillStyle='#333';cx.beginPath();cx.ellipse(13,-5,5,4,0,0,7);cx.fill();cx.restore()}
function drawEnemy(e){if(e.poly>0)return drawSheep(e);const dr=e.T.dr;if(dr==='wolf')drawWolf(e);else if(dr==='kobold')drawKobold(e,e.T.k>1);else if(dr==='gnoll')drawGnoll(e,e.t==='hogger');else if(dr==='human')drawHuman(e);else if(dr==='golem')drawGolem(e);else if(dr==='murloc')drawMurloc(e);else if(dr==='ogre')drawOgre(e);else drawGoblin(e)}
function drawNpc(n){shadow(n.x,n.y+14,13);cx.save();cx.translate(n.x,n.y);
 if(n.k==='priest'){cx.fillStyle='#e8e0d0';cx.beginPath();cx.moveTo(-11,16);cx.lineTo(-8,-12);cx.lineTo(8,-12);cx.lineTo(11,16);cx.fill();cx.fillStyle='#e8c14a';cx.fillRect(-1,-10,2,22);cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#d8c070';cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill()}
 else if(n.k==='inn'){cx.fillStyle='#7a4a2a';cx.fillRect(-7,4,5,12);cx.fillRect(2,4,5,12);cx.fillStyle='#a05a2a';cx.beginPath();cx.ellipse(0,-2,12,12,0,0,7);cx.fill();cx.fillStyle='#fff';cx.fillRect(-8,-4,16,12);cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#4a2a1a';cx.fillRect(-6,-15,12,3)}
 else if(n.k==='farmer'){cx.fillStyle='#3a4a7a';cx.fillRect(-7,4,5,12);cx.fillRect(2,4,5,12);cx.fillStyle='#3a4a7a';cx.beginPath();cx.roundRect(-10,-12,20,18,4);cx.fill();cx.fillStyle='#c8a46a';cx.fillRect(-8,-12,16,6);cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();cx.fillStyle='#d8b050';cx.beginPath();cx.ellipse(0,-24,14,4,0,0,7);cx.fill();cx.fillRect(-6,-30,12,6);cx.fillStyle='#6b4a22';cx.fillRect(12,-28,2,44);cx.fillStyle='#aaa';cx.fillRect(10,-30,10,3)}
 else{const g=n.id==='gryan';cx.fillStyle='#3a3a4a';cx.fillRect(-7,4,5,12);cx.fillRect(2,4,5,12);cx.fillStyle=g?'#8a6a3a':'#aab0bc';cx.beginPath();cx.roundRect(-11,-12,22,18,4);cx.fill();cx.fillStyle=g?'#a01a0a':'#2a4a9a';cx.fillRect(-5,-11,10,17);cx.fillStyle='#e8c14a';cx.beginPath();cx.moveTo(0,-8);cx.lineTo(3,-3);cx.lineTo(0,2);cx.lineTo(-3,-3);cx.fill();
  cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(0,-19,8,0,7);cx.fill();if(g){cx.fillStyle='#ddd';cx.fillRect(-6,-16,12,6);cx.beginPath();cx.arc(0,-22,8,Math.PI,0);cx.fill()}else{cx.fillStyle='#aab0bc';cx.beginPath();cx.arc(0,-21,9,Math.PI,0);cx.fill();cx.fillStyle='#8a2a1a';cx.fillRect(-1,-34,2,6);cx.fillStyle='#6a5a4a';cx.fillRect(-5,-15,10,3)}
  cx.fillStyle='#6b4a22';cx.fillRect(13,-30,2,46);cx.fillStyle='#ccc';cx.beginPath();cx.moveTo(14,-40);cx.lineTo(17,-30);cx.lineTo(11,-30);cx.fill()}
 cx.restore();const ready=QUESTS.some(q=>(q.t||q.g)===n.id&&qReady(q)),av=QUESTS.some(q=>q.g===n.id&&qAvail(q));
 if(ready||av){const by=n.y-52+Math.sin(tm*4)*3;cx.font='bold 26px sans-serif';cx.textAlign='center';cx.lineWidth=4;cx.strokeStyle='#000';cx.strokeText(ready?'?':'!',n.x,by);cx.fillStyle='#ffd200';cx.fillText(ready?'?':'!',n.x,by)}
 nameTag(n.n,n.x,n.y-36,'#7fff7f',n.ttl)}
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
function nameTag(t,x,y,c,sub){cx.font='bold 11px sans-serif';cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(t,x,y);cx.fillStyle=c;cx.fillText(t,x,y);if(sub){cx.font='9px sans-serif';cx.strokeText('<'+sub+'>',x,y+11);cx.fillStyle='#ddd';cx.fillText('<'+sub+'>',x,y+11)}}
function drawTree(t){shadow(t.x+4,t.y+t.r*.5,t.r*.9);cx.fillStyle='#4a2e14';cx.fillRect(t.x-4,t.y-4,8,t.r*.6);const g=(t.kind==='dry'?['#7a7a2a','#8a6a2a','#6a7a2a']:['#2e5a1e','#3a6a24','#2a4e1a'])[Math.floor(t.c*3)];
 cx.fillStyle=g;cx.beginPath();cx.arc(t.x,t.y-t.r*.6,t.r,0,7);cx.fill();cx.fillStyle='rgba(255,255,200,.12)';cx.beginPath();cx.arc(t.x-t.r*.3,t.y-t.r*.9,t.r*.55,0,7);cx.fill();cx.fillStyle='rgba(0,0,0,.15)';cx.beginPath();cx.arc(t.x+t.r*.35,t.y-t.r*.3,t.r*.5,0,7);cx.fill()}
function bar(x,y,w,h,v,c,bg='#200'){cx.fillStyle='#000';cx.fillRect(x-1,y-1,w+2,h+2);cx.fillStyle=bg;cx.fillRect(x,y,w,h);cx.fillStyle=c;cx.fillRect(x,y,w*clamp(v,0,1),h)}
function frame(x,y,name,lvl,hp,mhp,c2,v2,txt2,face){cx.fillStyle='rgba(20,12,4,.8)';cx.beginPath();cx.roundRect(x,y,200,52,8);cx.fill();cx.strokeStyle='#c9a24a';cx.lineWidth=2;cx.stroke();
 cx.fillStyle='#2a1a08';cx.beginPath();cx.arc(x+26,y+26,21,0,7);cx.fill();cx.stroke();face&&face(x+26,y+26);
 cx.font='bold 12px sans-serif';cx.textAlign='left';cx.fillStyle='#ffd24a';cx.fillText(name,x+52,y+14);cx.textAlign='right';cx.fillStyle='#fff';cx.fillText(lvl,x+192,y+14);
 bar(x+52,y+19,140,12,hp/mhp,'#2ac83a');cx.font='bold 9px sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText(Math.ceil(hp)+' / '+mhp,x+122,y+29);
 if(c2){bar(x+52,y+34,140,9,v2,c2);cx.fillText(txt2,x+122,y+42)}}
function drawBuilding(b){if(b.k==='wall'){cx.fillStyle='#14100c';cx.fillRect(b.x,b.y,b.w,b.h);cx.fillStyle='#2a221a';for(let x=b.x;x<b.x+b.w;x+=36){const top=b.y<5;cx.beginPath();cx.ellipse(x+18,top?b.y+b.h:b.y,20,12,0,0,7);cx.fill()}return}
 cx.fillStyle='rgba(0,0,0,.3)';cx.fillRect(b.x+8,b.y+12,b.w,b.h);
 if(b.k==='abbey'){cx.fillStyle='#b8b0a0';cx.fillRect(b.x,b.y+40,b.w,b.h-40);for(let i=0;i<6;i++)for(let j=0;j<4;j++){cx.strokeStyle='#9a9282';cx.strokeRect(b.x+i*50,b.y+40+j*40,50,40)}
  cx.fillStyle='#5a6a8a';cx.beginPath();cx.moveTo(b.x-10,b.y+50);cx.lineTo(b.x+b.w/2,b.y-20);cx.lineTo(b.x+b.w+10,b.y+50);cx.fill();
  cx.fillStyle='#b8b0a0';cx.fillRect(b.x+b.w/2-30,b.y-70,60,120);cx.fillStyle='#5a6a8a';cx.beginPath();cx.moveTo(b.x+b.w/2-38,b.y-60);cx.lineTo(b.x+b.w/2,b.y-120);cx.lineTo(b.x+b.w/2+38,b.y-60);cx.fill();
  cx.fillStyle='#e8c14a';cx.fillRect(b.x+b.w/2-3,b.y-150,6,32);cx.fillRect(b.x+b.w/2-12,b.y-142,24,6);
  cx.fillStyle='#4a3a6a';cx.beginPath();cx.arc(b.x+b.w/2,b.y-20,14,0,7);cx.fill();cx.fillStyle='#4a2e14';cx.beginPath();cx.roundRect(b.x+b.w/2-22,b.y+b.h-60,44,60,[22,22,0,0]);cx.fill();
  for(const wx of[50,90,210,250]){cx.fillStyle='#3a5a9a';cx.beginPath();cx.roundRect(b.x+wx-8,b.y+80,16,34,[8,8,0,0]);cx.fill()}return}
 if(b.k==='tower'){cx.fillStyle='#9a9282';cx.fillRect(b.x,b.y-60,b.w,b.h+60);cx.strokeStyle='#7a7262';for(let j=0;j<6;j++)cx.strokeRect(b.x,b.y-60+j*35,b.w,35);cx.fillStyle='#7a7262';for(let i=0;i<5;i++)cx.fillRect(b.x-6+i*28,b.y-80,18,22);
  cx.fillStyle='#4a2e14';cx.beginPath();cx.roundRect(b.x+b.w/2-16,b.y+b.h-46,32,46,[16,16,0,0]);cx.fill();cx.fillStyle='#6b4a22';cx.fillRect(b.x+b.w/2-2,b.y-140,4,62);cx.fillStyle='#a01a0a';cx.fillRect(b.x+b.w/2+2,b.y-140,34,22);return}
 if(b.k==='mine'){cx.fillStyle='#5a5048';cx.beginPath();cx.ellipse(b.x+b.w/2,b.y+b.h/2,b.w/2+30,b.h/2+20,0,0,7);cx.fill();cx.fillStyle='#0a0806';cx.beginPath();cx.roundRect(b.x+40,b.y+30,b.w-80,b.h-30,[40,40,0,0]);cx.fill();cx.fillStyle='#6b4a22';cx.fillRect(b.x+34,b.y+24,8,b.h-24);cx.fillRect(b.x+b.w-42,b.y+24,8,b.h-24);cx.fillRect(b.x+30,b.y+20,b.w-60,10);return}
 if(b.k==='ruin'){cx.fillStyle='#8a7a6a';cx.fillRect(b.x,b.y+30,b.w,b.h-30);cx.fillStyle='#3a2a1a';cx.fillRect(b.x+10,b.y+40,b.w-20,b.h-50);cx.fillStyle='#6a5a4a';cx.beginPath();cx.moveTo(b.x,b.y+30);cx.lineTo(b.x+30,b.y);cx.lineTo(b.x+50,b.y+30);cx.fill();cx.fillStyle='#2a1a10';cx.fillRect(b.x+b.w-40,b.y+20,8,30);return}
 cx.fillStyle='#e8dcc0';cx.fillRect(b.x,b.y+30,b.w,b.h-30);cx.strokeStyle='#5a3a1a';cx.lineWidth=5;cx.strokeRect(b.x,b.y+30,b.w,b.h-30);cx.beginPath();cx.moveTo(b.x,b.y+30);cx.lineTo(b.x+b.w,b.y+b.h);cx.moveTo(b.x+b.w/2,b.y+30);cx.lineTo(b.x+b.w/2,b.y+b.h);cx.stroke();
 cx.fillStyle=b.k==='inn'?'#8a3a2a':b.k==='farm'?'#9a6a2a':'#6a4a6a';cx.beginPath();cx.moveTo(b.x-12,b.y+40);cx.lineTo(b.x+b.w/2,b.y-30);cx.lineTo(b.x+b.w+12,b.y+40);cx.fill();cx.strokeStyle='rgba(0,0,0,.25)';cx.lineWidth=2;for(let i=0;i<5;i++){cx.beginPath();cx.moveTo(b.x-12+i*8,b.y+40-i*14);cx.lineTo(b.x+b.w+12-i*8,b.y+40-i*14);cx.stroke()}
 cx.fillStyle='#4a2e14';cx.fillRect(b.x+b.w/2-12,b.y+b.h-36,24,36);cx.fillStyle='#ffe08a';cx.fillRect(b.x+16,b.y+50,20,18);cx.fillRect(b.x+b.w-36,b.y+50,20,18);
 if(b.k==='inn'){cx.fillStyle='#6b4a22';cx.fillRect(b.x+b.w+4,b.y+60,4,40);cx.fillStyle='#e8c14a';cx.fillRect(b.x+b.w-10,b.y+64,32,18);cx.fillStyle='#5a1a00';cx.font='bold 11px sans-serif';cx.textAlign='center';cx.fillText('旅店',b.x+b.w+6,b.y+77)}}
function drawGate(g){if(!gateClosed(g))return;cx.fillStyle='#3a3a40';for(let y=g.y;y<g.y+g.h;y+=12)cx.fillRect(g.x,y,g.w,4);cx.fillStyle='#55555c';for(let x=g.x+4;x<g.x+g.w;x+=12)cx.fillRect(x,g.y,4,g.h)}
function drawProp(p){const k=p.k;
 if(k==='rock'){cx.fillStyle='#5a5048';cx.beginPath();cx.ellipse(p.x,p.y,p.r,p.r*.8,0,0,7);cx.fill();cx.fillStyle='#7a7068';cx.beginPath();cx.ellipse(p.x-5,p.y-6,p.r*.6,p.r*.4,0,0,7);cx.fill()}
 else if(k==='candle'){cx.fillStyle='#fff8e0';cx.fillRect(p.x-2,p.y-8,4,8);cx.fillStyle='#ffb02a';cx.fillRect(p.x-1.5,p.y-12+Math.sin(tm*15+p.x)*1,3,4);cx.fillStyle='rgba(255,200,80,.15)';cx.beginPath();cx.arc(p.x,p.y-8,20,0,7);cx.fill()}
 else if(k==='cart'){cx.fillStyle='#5a3a1a';cx.fillRect(p.x-20,p.y-12,40,22);cx.fillStyle='#333';cx.fillRect(p.x-16,p.y-16,32,8);cx.fillStyle='#222';cx.beginPath();cx.arc(p.x-12,p.y+12,6,0,7);cx.arc(p.x+12,p.y+12,6,0,7);cx.fill()}
 else if(k==='fire'){cx.fillStyle='#4a3a2a';cx.beginPath();cx.arc(p.x,p.y,18,0,7);cx.fill();for(let i=0;i<3;i++){cx.fillStyle=['#ff6a1a','#ffb02a','#fff06a'][i];cx.beginPath();cx.ellipse(p.x,p.y-6-i*3,12-i*3.5,(16-i*4)*(1+Math.sin(tm*12+i)*.12),0,0,7);cx.fill()}cx.fillStyle='rgba(255,140,40,.12)';cx.beginPath();cx.arc(p.x,p.y,70,0,7);cx.fill()}
 else if(k==='tent'){cx.fillStyle='#8a6a3a';cx.beginPath();cx.moveTo(p.x-40,p.y+20);cx.lineTo(p.x,p.y-40);cx.lineTo(p.x+40,p.y+20);cx.fill();cx.fillStyle='#3a2a1a';cx.beginPath();cx.moveTo(p.x-10,p.y+20);cx.lineTo(p.x,p.y-10);cx.lineTo(p.x+10,p.y+20);cx.fill()}
 else if(k==='well'){cx.fillStyle='#8a8478';cx.beginPath();cx.arc(p.x,p.y,18,0,7);cx.fill();cx.fillStyle='#2a4a6a';cx.beginPath();cx.arc(p.x,p.y,11,0,7);cx.fill();cx.fillStyle='#6b4a22';cx.fillRect(p.x-20,p.y-30,4,30);cx.fillRect(p.x+16,p.y-30,4,30);cx.fillStyle='#8a3a2a';cx.fillRect(p.x-24,p.y-36,48,8)}
 else if(k==='board'){cx.fillStyle='#6b4a22';cx.fillRect(p.x-2,p.y-10,4,20);cx.fillStyle='#c8a46a';cx.fillRect(p.x-18,p.y-32,36,24);cx.fillStyle='#f6e7bf';cx.fillRect(p.x-14,p.y-29,13,17);cx.fillRect(p.x+2,p.y-29,12,17);cx.fillStyle='#a01a0a';cx.font='bold 7px sans-serif';cx.textAlign='center';cx.fillText('通缉',p.x-7,p.y-20)}
 else if(k==='sign'){cx.fillStyle='#6b4a22';cx.fillRect(p.x-2,p.y-6,4,22);cx.font='bold 11px sans-serif';const w=cx.measureText(p.t).width+12;cx.fillStyle='#c8a46a';cx.fillRect(p.x-w/2,p.y-24,w,18);cx.fillStyle='#3a1a00';cx.textAlign='center';cx.fillText(p.t,p.x,p.y-11)}
 else if(k==='scare'){cx.fillStyle='#6b4a22';cx.fillRect(p.x-1,p.y-30,3,34);cx.fillRect(p.x-14,p.y-22,28,3);cx.fillStyle='#8a5a8a';cx.fillRect(p.x-8,p.y-24,16,14);cx.fillStyle='#d8b050';cx.beginPath();cx.arc(p.x,p.y-32,6,0,7);cx.fill();cx.beginPath();cx.ellipse(p.x,p.y-37,10,3,0,0,7);cx.fill()}
 else if(k==='hay'){cx.fillStyle='#d8b050';cx.beginPath();cx.ellipse(p.x,p.y,18,12,0,0,7);cx.fill();cx.fillStyle='#b8902a';cx.fillRect(p.x-16,p.y-2,32,3)}
 else if(k==='mill'){cx.fillStyle='#8a6a4a';cx.fillRect(p.x-18,p.y-60,36,70);cx.save();cx.translate(p.x,p.y-60);cx.rotate(tm*.8);cx.fillStyle='#e8dcc0';for(let i=0;i<4;i++){cx.rotate(1.571);cx.fillRect(-4,0,8,48)}cx.restore()}
 else if(k==='lamp'){cx.fillStyle='#3a3a3a';cx.fillRect(p.x-2,p.y-34,4,38);cx.fillStyle='#ffe08a';cx.fillRect(p.x-5,p.y-42,10,10);cx.fillStyle='rgba(255,220,120,.14)';cx.beginPath();cx.arc(p.x,p.y-36,60,0,7);cx.fill()}
 else if(k==='crate'){cx.fillStyle='#7a5a32';cx.fillRect(p.x-14,p.y-14,28,24);cx.strokeStyle='#4a321a';cx.lineWidth=2;cx.strokeRect(p.x-14,p.y-14,28,24);cx.beginPath();cx.moveTo(p.x-14,p.y-14);cx.lineTo(p.x+14,p.y+10);cx.stroke()}
 else if(k==='saw'){cx.save();cx.translate(p.x,p.y);cx.rotate(tm*3);cx.fillStyle='#bbb';cx.beginPath();cx.arc(0,0,22,0,7);cx.fill();cx.fillStyle='#666';cx.beginPath();cx.arc(0,0,6,0,7);cx.fill();cx.restore()}
 else if(k==='anvil'){cx.fillStyle='#3a3a40';cx.fillRect(p.x-18,p.y-10,36,10);cx.fillRect(p.x-8,p.y,16,10);cx.fillStyle='rgba(255,120,40,.2)';cx.beginPath();cx.arc(p.x,p.y,40,0,7);cx.fill()}
 else if(k==='mast'){cx.fillStyle='#4a321a';cx.fillRect(p.x-5,p.y-160,10,170);cx.fillStyle='#2a2a2a';cx.fillRect(p.x-50,p.y-150,100,70);cx.fillStyle='#a01a0a';cx.beginPath();cx.arc(p.x,p.y-115,16,0,7);cx.fill()}
 else if(k==='cannon'){cx.fillStyle='#2a2a2a';cx.fillRect(p.x-20,p.y-8,40,14);cx.fillStyle='#4a321a';cx.beginPath();cx.arc(p.x-6,p.y+8,7,0,7);cx.arc(p.x+10,p.y+8,7,0,7);cx.fill()}}
function bubble(t,x,y){cx.font='bold 12px sans-serif';const w=cx.measureText(t).width+14;cx.fillStyle='rgba(255,255,240,.95)';cx.beginPath();cx.roundRect(x-w/2,y-14,w,20,6);cx.fill();cx.fillStyle='#2a1a08';cx.textAlign='center';cx.fillText(t,x,y)}
function draw(){cx.setTransform(DPR,0,0,DPR,0,0);cx.fillStyle='#000';cx.fillRect(0,0,VW,VH);
 cx.save();cx.translate(VW/2,VH/2);cx.scale(SC,SC);cx.translate(-Math.round(cam.x),-Math.round(cam.y));
 cx.imageSmoothingEnabled=true;cx.drawImage(MAP.ground,0,0,W,H);
 const vx0=cam.x-VW/2/SC-100,vx1=cam.x+VW/2/SC+100,vy0=cam.y-VH/2/SC-100,vy1=cam.y+VH/2/SC+200,vis=o=>o.x>vx0&&o.x<vx1&&o.y>vy0&&o.y<vy1;
 const flat=['rock','candle','hay','crate','cannon','saw','anvil','cart'];MAP.props.forEach(p=>{if(flat.includes(p.k)&&vis(p))drawProp(p)});
 MAP.portals.forEach(p=>{cx.fillStyle=`rgba(140,200,255,${.12+.08*Math.sin(tm*3)})`;cx.fillRect(p.x,p.y,p.w,p.h)});
 enemies.forEach(e=>{if(e.slam){cx.fillStyle=`rgba(255,60,20,${.15+.25*(1-e.slam.t/1.2)})`;cx.beginPath();cx.ellipse(e.slam.x,e.slam.y,110,70,0,0,7);cx.fill();cx.strokeStyle='#ff4a1a';cx.lineWidth=2;cx.stroke()}});
 fx.forEach(f=>{if(f.k==='bliz'){cx.fillStyle='rgba(160,220,255,.18)';cx.beginPath();cx.ellipse(f.x,f.y,130,80,0,0,7);cx.fill()}if(f.k==='flame'){cx.fillStyle=`rgba(255,120,30,${f.life*.4})`;cx.beginPath();cx.ellipse(f.x,f.y,110,70,0,0,7);cx.fill()}});
 if(target&&!target.dead){cx.strokeStyle='#ff3a2a';cx.lineWidth=2;cx.beginPath();cx.ellipse(target.x,target.y+target.T.r*.6,target.T.r+6,(target.T.r+6)*.45,0,0,7);cx.stroke()}
 const L=[];MAP.trees.forEach(t=>vis(t)&&L.push({y:t.y,f:()=>drawTree(t)}));MAP.rects.forEach(b=>L.push({y:b.k==='wall'&&b.y<5?-1:b.y+b.h,f:()=>drawBuilding(b)}));MAP.gates.forEach(g=>L.push({y:g.y+g.h,f:()=>drawGate(g)}));
 MAP.props.forEach(p=>{if(!flat.includes(p.k)&&vis(p))L.push({y:p.y,f:()=>drawProp(p)})});MAP.npcs.forEach(n=>vis(n)&&L.push({y:n.y,f:()=>drawNpc(n)}));
 enemies.forEach(e=>{if(e.dead||!vis(e))return;L.push({y:e.y,f:()=>{if(e.hurt>0)cx.globalAlpha=.6;drawEnemy(e);cx.globalAlpha=1;
  const hy=e.y-18-(e.T.r+12)*(e.T.k||1.1);nameTag(e.T.n+(e.T.elite?' (精英)':'')+(e.T.boss?' (首领)':''),e.x,hy-6,e.st==='chase'?'#ff5a4a':e.lvl>P.lvl+3?'#ff8a3a':'#ffd24a');if(e.hp<e.mhp)bar(e.x-20,hy,40,4,e.hp/e.mhp,'#e83a2a');
  if(e.stun>0||e.root>0||e.fear>0){cx.fillStyle=e.root>0?'#8ad8ff':e.fear>0?'#c070ff':'#ffd24a';for(let i=0;i<3;i++){const a=tm*6+i*2.1;cx.fillRect(e.x+Math.cos(a)*12-2,hy-14+Math.sin(a)*4,4,4)}}
  if(e.root>0){cx.strokeStyle='rgba(160,220,255,.8)';cx.lineWidth=3;cx.beginPath();cx.ellipse(e.x,e.y+10,e.T.r,e.T.r*.4,0,0,7);cx.stroke()}
  if(e.bubble)bubble(e.bubble.t,e.x,hy-24)}})});
 if(!P.dead)L.push({y:P.y,f:()=>{drawHero(P.x,P.y,P.face,P.anim,P.swing,P.hurt);nameTag('勇士',P.x,P.y-40,'#8ab4ff')}});
 else L.push({y:P.y,f:()=>{cx.globalAlpha=.5;cx.fillStyle='#ccd';cx.beginPath();cx.arc(P.x,P.y-10-((3-P.dead)*20),12,0,7);cx.fill();cx.globalAlpha=1}});
 L.sort((a,b)=>a.y-b.y).forEach(o=>o.f());
 proj.forEach(p=>{cx.fillStyle=p.col;cx.globalAlpha=.35;cx.beginPath();cx.arc(p.x,p.y,10,0,7);cx.fill();cx.globalAlpha=1;cx.beginPath();cx.arc(p.x,p.y,5,0,7);cx.fill()});
 fx.forEach(f=>{const t=1-f.life/({thunder:.5,lvl:1.5,nova:.6,ring:.6,pop:.3,arc:.5,cone:.5,bliz:1,flame:.8,beam:1}[f.k]||.8);
  if(f.k==='thunder'){cx.strokeStyle=f.c||'#8ad0ff';cx.lineWidth=6*(1-t);cx.beginPath();cx.ellipse(f.x,f.y+5,130*t,80*t,0,0,7);cx.stroke()}
  if(f.k==='nova'||f.k==='ring'){cx.strokeStyle=f.k==='nova'?'#bfeaff':f.c;cx.lineWidth=8*(1-t);cx.beginPath();cx.ellipse(f.x,f.y+5,145*t,90*t,0,0,7);cx.stroke()}
  if(f.k==='pop'){cx.fillStyle=f.c;cx.globalAlpha=1-t;cx.beginPath();cx.arc(f.x,f.y,6+18*t,0,7);cx.fill();cx.globalAlpha=1}
  if(f.k==='arc'){cx.fillStyle=`rgba(220,140,255,${1-t})`;cx.beginPath();cx.arc(f.x,f.y-10,25*(1-t)+5,0,7);cx.fill()}
  if(f.k==='cone'){cx.fillStyle=`rgba(180,230,255,${.4*(1-t)})`;cx.beginPath();cx.moveTo(f.x,f.y);cx.arc(f.x,f.y,150,f.a-1,f.a+1);cx.fill()}
  if(f.k==='bliz'){cx.fillStyle='#fff';for(let i=0;i<12;i++){cx.fillRect(f.x+Math.sin(i*7.3+tm)*110,f.y-40+((tm*120+i*37)%110)-30,3,3)}}
  if(f.k==='beam'&&!f.e.dead){cx.strokeStyle=`rgba(170,100,255,${1-t})`;cx.lineWidth=4;cx.beginPath();cx.moveTo(f.x,f.y-18);cx.lineTo(f.e.x,f.e.y-15);cx.stroke()}
  if(f.k==='dust'){cx.fillStyle=`rgba(200,180,140,${f.life})`;cx.beginPath();cx.arc(f.x,f.y,8*(1.5-f.life),0,7);cx.fill()}
  if(f.k==='heal'||f.k==='lvl'){cx.strokeStyle=f.k==='lvl'?`rgba(255,220,80,${1-t})`:`rgba(100,255,120,${1-t})`;cx.lineWidth=3;for(let i=0;i<8;i++){const a=i/8*6.28+t*3;cx.beginPath();cx.moveTo(f.x+Math.cos(a)*20,f.y-t*60+Math.sin(a)*8);cx.lineTo(f.x+Math.cos(a)*20,f.y-t*60+Math.sin(a)*8-10);cx.stroke()}}});
 texts.forEach(t=>{cx.globalAlpha=Math.min(1,t.life*2);cx.font=`bold ${t.big?20:14}px sans-serif`;cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(t.t,t.x,t.y);cx.fillStyle=t.c;cx.fillText(t.t,t.x,t.y);cx.globalAlpha=1});
 if(MAP.mine&&inRect(P.x,P.y,MAP.mine)){const m=MAP.mine;cx.fillStyle='rgba(0,0,10,.35)';cx.fillRect(m.x-40,m.y-40,m.w+80,m.h+80)}
 cx.restore();
 if(MAP.dark){const px=(P.x-cam.x)*SC+VW/2,py=(P.y-cam.y)*SC+VH/2,g=cx.createRadialGradient(px,py,120*SC,px,py,460*SC);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.75)');cx.fillStyle=g;cx.fillRect(0,0,VW,VH)}
 // HUD
 const sl=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--sl'))||0,st=stats(),hx=8+sl,hy=8,war=P.cls==='warrior';
 frame(hx,hy,'人类'+CLS[P.cls].n,P.lvl+'级',P.hp,st.hp,war?'#c8201a':'#2a6ad8',war?P.rage/100:P.mana/st.mp,war?'怒气 '+Math.floor(P.rage):'法力 '+Math.floor(P.mana)+'/'+st.mp,(x,y)=>{cx.save();cx.beginPath();cx.arc(x,y,20,0,7);cx.clip();cx.fillStyle='#f0c8a0';cx.beginPath();cx.arc(x,y+4,12,0,7);cx.fill();cx.fillStyle=war?'#6a4a2a':P.cls==='mage'?'#5a3a9a':'#e8d070';cx.beginPath();cx.arc(x,y,12,Math.PI,0);cx.fill();cx.fillStyle=CLS[P.cls].col;cx.fillRect(x-14,y+14,28,8);cx.restore()});
 let bx=hx;cx.font='bold 9px sans-serif';cx.textAlign='left';for(const k in P.bf){if(k==='weak')continue;const nm={bshout:'怒吼',farmor:'霜甲',iarmor:'冰甲',ai:'智慧',mshield:'法盾',pwf:'韧',pws:'盾',renew:'恢复',ifire:'心火',sprot:'暗抗',sblock:'格挡',swall:'盾墙',retal:'反击'}[k]||k;const b=P.bf[k],tt=b.t>90?Math.round(b.t/60)+'分':Math.ceil(b.t)+'';
  cx.fillStyle='rgba(20,12,4,.8)';cx.fillRect(bx,hy+56,34,16);cx.fillStyle='#ffd24a';cx.fillText(nm,bx+2,hy+66);cx.fillStyle='#fff';cx.fillText(tt,bx+2,hy+75);bx+=37}
 if(target&&!target.dead)frame(hx+210,hy,target.T.n,target.lvl+'级',target.hp,target.mhp,null,0,'',(x,y)=>{cx.fillStyle='#a06a42';cx.beginPath();cx.arc(x,y,14,0,7);cx.fill();cx.fillStyle='#ff3a2a';cx.fillRect(x+3,y-4,4,3)});
 const c=P.cast||P.chan;if(c){const s=SK[c.id],v=P.cast?1-c.t/c.tot:c.t/c.tot,w=200;bar(VW/2-w/2,VH-46,w,12,v,P.cast?'#e8c14a':'#7aa8ff','#2a1a08');cx.font='bold 10px sans-serif';cx.textAlign='center';cx.fillStyle='#fff';cx.fillText(s.n,VW/2,VH-36)}
 const xw=Math.min(500,VW*.45);bar(VW/2-xw/2,VH-10-(sl?4:0),xw,6,P.lvl>=MAXL?1:P.xp/XPN(P.lvl),'#9a3ad8','#1a0a2a');cx.font='9px sans-serif';cx.fillStyle='#fff';cx.textAlign='center';cx.fillText(P.lvl>=MAXL?'已达最高等级 30':`经验 ${P.xp}/${XPN(P.lvl)}`,VW/2,VH-13);
 const mw=120,mh=Math.max(30,mw*H/W),mx=VW-mw-10-sl,my=46,msx=mw/W,msy=mh/H;
 const z=MAP.zones.find(z=>inRect(P.x,P.y,z))||{n:MAP.n};cx.font='bold 13px sans-serif';cx.textAlign='center';cx.lineWidth=3;cx.strokeStyle='#000';cx.strokeText(z.n,mx+mw/2,my+mh+16);cx.fillStyle='#ffd24a';cx.fillText(z.n,mx+mw/2,my+mh+16);
 cx.globalAlpha=.85;cx.drawImage(MAP.ground,mx,my,mw,mh);cx.globalAlpha=1;cx.strokeStyle='#c9a24a';cx.lineWidth=2;cx.strokeRect(mx,my,mw,mh);
 MAP.rects.forEach(b=>{if(b.k==='wall')return;cx.fillStyle='#ddd';cx.fillRect(mx+b.x*msx,my+b.y*msy,b.w*msx,b.h*msy)});MAP.portals.forEach(p=>{cx.fillStyle='#8ad0ff';cx.fillRect(mx+p.x*msx-1,my+p.y*msy,4,Math.max(4,p.h*msy))});
 MAP.npcs.forEach(n=>{if(QUESTS.some(q=>((q.t||q.g)===n.id&&qReady(q))||(q.g===n.id&&qAvail(q)))){cx.fillStyle='#ffd200';cx.fillRect(mx+n.x*msx-2,my+n.y*msy-2,5,5)}});
 enemies.forEach(e=>{if(!e.dead&&e.T.boss&&QUESTS.some(q=>QS[q.id].st==='active'&&q.tgt&&q.tgt.includes(e.t))){cx.fillStyle='#ff2a2a';cx.fillRect(mx+e.x*msx-2,my+e.y*msy-2,5,5)}});
 cx.fillStyle='#fff';cx.beginPath();cx.arc(mx+P.x*msx,my+P.y*msy,2.5,0,7);cx.fill();
 if(joy){cx.globalAlpha=.5;cx.fillStyle='#000';cx.beginPath();cx.arc(joy.ox,joy.oy,55,0,7);cx.fill();cx.strokeStyle='#c9a24a';cx.lineWidth=3;cx.stroke();const dx=joy.x-joy.ox,dy=joy.y-joy.oy,d=Math.min(55,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);cx.fillStyle='#c9a24a';cx.beginPath();cx.arc(joy.ox+Math.cos(a)*d,joy.oy+Math.sin(a)*d,24,0,7);cx.fill();cx.globalAlpha=1}
 else if(tm<20&&'ontouchstart' in window){cx.globalAlpha=.25+.1*Math.sin(tm*3);cx.strokeStyle='#ffe9a8';cx.lineWidth=3;cx.beginPath();cx.arc(90+sl,VH-90,50,0,7);cx.stroke();cx.font='12px sans-serif';cx.fillStyle='#ffe9a8';cx.textAlign='center';cx.fillText('按住拖动移动',90+sl,VH-86);cx.globalAlpha=1}
 if(P.dead){cx.fillStyle='rgba(60,60,80,.4)';cx.fillRect(0,0,VW,VH)}}
document.documentElement.style.setProperty('--sl','0px');
(function(){const d=document.createElement('div');d.style.cssText='position:fixed;left:env(safe-area-inset-left);top:0;width:0;height:0';document.body.appendChild(d);setInterval(()=>{document.documentElement.style.setProperty('--sl',d.getBoundingClientRect().left+'px')},1000)})();
let last=performance.now(),running=false;
function loop(t){const dt=Math.min(.05,(t-last)/1000);last=t;if(running){update(dt);draw()}requestAnimationFrame(loop)}
function begin(){$('title').style.display='none';$('pc').style.display='none';running=true;const sp=P.map==='deadmines'?[MAPS.westfall.portals[1].tx,MAPS.westfall.portals[1].ty]:null;
 if(sp)setMap('westfall',1080,2310,true);else setMap(P.map||'elwynn',P.x,P.y,true);inPortal=true;
 if(QS.q1.st==='none')setTimeout(()=>toast(`欢迎，${CLS[P.cls].n}！去金色小镇找<b>卫兵队长</b>吧！<br><span style="font-size:13px">沿大路往东南走 · 右上角「技能」管理技能栏</span>`,4500),500)}
$('start').addEventListener('pointerdown',()=>{unlock();if(P&&hasSave)return begin();$('pc').style.display='block'});
document.querySelectorAll('.clsc').forEach(el=>el.addEventListener('pointerdown',()=>{unlock();newGame(el.dataset.c);hasSave=true;save();begin()}));
$('reset').addEventListener('pointerdown',()=>{if(confirm('确定要删除存档重新开始吗？')){localStorage.removeItem('elwynn_save_v2');localStorage.removeItem('elwynn_save_v1');hasSave=false;P=null;$('start').textContent='开始冒险'}});
let hasSave=load();if(hasSave)$('start').textContent=`继续冒险（${CLS[P.cls].n} ${P.lvl}级）`;
MAP=MAPS.elwynn;requestAnimationFrame(loop);
if(DEV)window.G={get P(){return P},get QS(){return QS},get enemies(){return enemies},get map(){return MAP.id},get proj(){return proj},get tm(){return tm},set target(e){target=e},interact,useSkill,stats,save,setMap,gainXP,learn,
 tp:(x,y)=>{P.x=x;P.y=y;cam.x=x;cam.y=y},god:()=>window.__god=1};
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
