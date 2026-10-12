// ================= Developer self-tests =================
// Open index.html?selftest and read the console: "SELFTEST PASS n" or one "SELFTEST FAIL" line per broken test.
const SELFTEST=/[?&]selftest\b/.test(location.search),TESTS=[];
function test(name,fn){if(SELFTEST)TESTS.push({name,fn})}
function eq(a,b,msg){const A=JSON.stringify(a),B=JSON.stringify(b);if(A!==B)throw new Error((msg||'')+' expected '+B+' got '+A)}
if(SELFTEST)setTimeout(()=>{let ok=0;for(const t of TESTS){try{t.fn();ok++}catch(e){console.error('SELFTEST FAIL '+t.name+': '+e.message)}}if(ok===TESTS.length)console.log('SELFTEST PASS '+ok);else console.log('SELFTEST '+ok+'/'+TESTS.length)},0);

// ---- Warning ! (awareness)
test('noticing shows !',()=>{const m=awarenessMark({side:'enemy',alert:.5},10);eq(m.ch,'!');eq(m.bar,.5)});
test('calm shows nothing',()=>eq(awarenessMark({side:'enemy',alert:0},10),null));
test('aggro pulse shrinks',()=>{eq(awarenessMark({side:'enemy',aggroFlash:10.7},10).size,28);eq(awarenessMark({side:'enemy',aggroFlash:10.7},10.5).size,20)});
test('players never marked',()=>eq(awarenessMark({side:'player',alert:1},10),null));

// ---- Auto loot
const TL=()=>[{id:1,kind:'gold',amount:5},{id:2,kind:'mat',mat:'hide',amount:1},{id:3,kind:'item',item:{rar:0}},{id:4,kind:'item',item:{rar:2}}];
test('auto loot takes coins, mats and good items',()=>{const r=autoLootPick(TL(),1,5,new Set());eq(r.take.map(d=>d.id),[1,2,4]);eq(r.blocked,false)});
test('auto loot with a full bag',()=>{const r=autoLootPick(TL(),1,0,new Set());eq(r.take.map(d=>d.id),[1,2]);eq(r.blocked,true)});
test('auto loot skips pending takes',()=>eq(autoLootPick(TL(),1,5,new Set([1])).take.map(d=>d.id),[2,4]));
test('settings default without storage',()=>{const f=fetchStore;fetchStore=()=>null;try{eq(loadSettings(),{autoLoot:false,lootMinRar:1,uiSize:null,gfx:'auto'})}finally{fetchStore=f}});

// ---- Area loot
test('corpses in reach, nearest first',()=>eq(corpsesInReach({x:0,y:0},[{x:100,y:0,loot:[1]},{x:300,y:0,loot:[1]},{x:50,y:0,loot:[1]},{x:20,y:0,loot:[]}]).map(c=>c.x),[50,100]));
test('loot groups drop empty and missing corpses',()=>eq(lootGroupsRefresh([1,2,3],[{id:1,x:0,y:0,loot:[1]},{id:3,x:0,y:0,loot:[]}],{x:0,y:0}),[1]));

// ---- Review fixes: guests reserve bag space for loot on its way; pending ids reset with a new game
test('auto loot shares one bag budget across corpses',()=>{const a={loot:[{id:1,kind:'item',item:{rar:2}}]},b={loot:[{id:2,kind:'item',item:{rar:2}}]};const r=autoLootPlan([a,b],1,1,new Map());eq(r.take.length,1);eq(r.blocked,true)});
test('guest bag space counts items on their way',()=>{const role=Net.role,pend=Loot.pending;Net.role='guest';Loot.pending=new Map([[7,true],[8,false],[9,true]]);try{eq(bagFree({bagSize:10,bag:[1,2]}),6)}finally{Net.role=role;Loot.pending=pend}});
test('pending loot clears on reset',()=>{const pend=Loot.pending;Loot.pending=new Map([[1,true]]);try{lootReset();eq(Loot.pending.size,0)}finally{Loot.pending=pend}});

// ---- Glass UI tokens and shared components
test('ui tokens read from :root',()=>{eq(uiToken('--hp'),'#e5484d');eq(uiToken('--mp'),'#4c8dff')});
test('uiSheet makes one row per item',()=>{const s=uiSheet('x',[{label:'a',onTap(){}}]);eq(s.el.querySelectorAll('.g-row').length,1);s.close()});

// ---- Portraits
test('portraitKey stable, changes with hair and helm',()=>{const L={skin:'#e3c3a0',hair:'#552',hairStyle:'short',cloth:'#456'},k=portraitKey(L,{},'paladin');eq(portraitKey(Object.assign({},L),{},'paladin'),k);eq(portraitKey(Object.assign({},L,{hairStyle:'long'}),{},'paladin')===k,false);eq(portraitKey(L,{helm:{name:'Iron Helm',rar:1,ilvl:3}},'paladin')===k,false);eq(portraitKey(L,{weapon:{name:'Sword',rar:2}},'paladin'),k)});
test('portraitFor caches per hero',()=>{const p={cls:'paladin',look:{skin:'#e3c3a0',hair:'#552',cloth:'#456'},gear:{}};const a=portraitFor(p);eq(portraitFor(p)===a,true);eq(a.width,112)});

// ---- Target frame and action bar (B4-B5)
const AP=(o)=>Object.assign({cds:[0,2,0],cdMax:[1,4,1],mana:50,tm:{},abil:[{mana:0},{mana:20},{mana:80}],cdEnd:[]},o);
test('abarState halfway through cooldown',()=>eq(abarState(AP(),1,10).cdFrac,.5));
test('abarState poor when mana is below the cost',()=>{const p=AP();eq(abarState(p,2,10).poor,true);eq(abarState(p,1,10).poor,false)});
test('abarState ready glows 0.6 s after the cooldown ends',()=>{const p=AP({cds:[0,0,0],cdEnd:[0,10]});eq(abarState(p,1,10.3).ready,true);eq(abarState(p,1,10.7).ready,false);eq(abarState({...p,cds:[0,1,0]},1,10.3).ready,false)});
test('monster portrait is cached per type',()=>{const u={type:'wolf',h:30,r:12,x:0,y:0};eq(monsterPortrait(u)===monsterPortrait({...u}),true);eq(monsterPortrait({...u,boss:true})===monsterPortrait(u),false)});

// ---- UI size (B6)
test('uiScale defaults: 100 desktop, 85 phone',()=>{eq(uiScale({uiSize:null},false),1);eq(uiScale({uiSize:null},true),.85)});
test('uiScale clamps to 0.8-1.3',()=>{eq(uiScale({uiSize:200},false),1.3);eq(uiScale({uiSize:10},false),.8);eq(uiScale({uiSize:110},true),1.1)});

// ---- Auto-aim (B7)
const AU=(x,y,o)=>Object.assign({x,y,hp:10,maxHp:10,r:10},o),AF={x:1,y:0},AP0=AU(0,0,{aim:0,input:{mx:0,my:0}}),ALOS=()=>true;
test('aimScore: ahead is d, behind is 2.2d',()=>{eq(Math.round(aimScore(AP0,AU(100,0),AF)),100);eq(Math.round(aimScore(AP0,AU(-100,0),AF)),220)});
test('aim prefers ahead',()=>eq(aimPick(AP0,[AU(-150,0),AU(200,0)],AF,null).x,200));
test('aim is sticky',()=>{const cur=AU(100,0),near=AU(75,0),far=AU(65,0);eq(aimPick(AP0,[cur,near],AF,cur),cur);eq(aimPick(AP0,[cur,far],AF,cur),far)});
test('aim drops a current target that is no longer a candidate',()=>{const cur=AU(100,0),b=AU(300,0);eq(aimPick(AP0,[b],AF,cur),b);eq(aimPick(AP0,[],AF,cur),null)});
test('aim ignores blocked, dead and out of range',()=>{const ok=AU(100,0),dead=AU(50,0,{dead:true}),wall=AU(0,100),far=AU(900,0);eq(aimCands(AP0,460,[ok,dead,wall,far],(a,b)=>b!==wall),[ok])});
test('aim with no candidates faces forward',()=>{const t=Aim.target,h=hudTarget,e=enemies.slice();Aim.target=null;enemies.length=0;try{const q=aimPoint(Object.assign({abil:[{name:'t',cast:()=>0}]},AP0),0);eq([Math.round(q.x),Math.round(q.y)],[200,0])}finally{Aim.target=t;hudTarget=h;enemies.push(...e)}});
test('aimRange: melee 120, ranged and spells 460',()=>{const pa={abil:ABIL.paladin},so={abil:ABIL.sorcerer};eq(aimRange(pa,0),120);eq(aimRange(pa,1),120);eq(aimRange(so,0),460);eq(aimRange(so,3),460)});
test('friendly aim picks most hurt',()=>{const pl=players.slice(),a=AU(0,0,{hp:9,maxHp:10}),b=AU(100,0,{hp:3,maxHp:10}),c=AU(900,0,{hp:1,maxHp:10});players.length=0;players.push(a,b,c);try{eq(aimFriendly(a,460),b)}finally{players.length=0;players.push(...pl)}});
test('friendly aim falls back to self',()=>{const pl=players.slice(),a=AU(0,0);players.length=0;players.push(a);try{eq(aimFriendly(a,460),a)}finally{players.length=0;players.push(...pl)}});

// ---- Avatars before their look arrives
test('playerLook tolerates empty look',()=>{const o=playerLook({cls:'paladin',look:{},gear:{},bagSize:20});eq(typeof o.hatColor,'string');eq(typeof o.cloth,'string')});

// ---- Touch controls (B7)
const inPlay=fn=>{const s=state;state='play';try{fn()}finally{state=s}},TP=cls=>({x:0,y:0,aim:0,hp:10,maxHp:10,level:20,abil:ABIL[cls],input:{mx:0,my:0,ax:0,ay:0,fire:false,abil:[false,false,false,false,false,false]}});
test('stickVec dead zone',()=>eq(stickVec(5,0),{x:0,y:0}));
test('stickVec clamps',()=>eq(stickVec(120,0),{x:1,y:0}));
test('drag threshold',()=>{eq(touchIsDrag(17,0),false);eq(touchIsDrag(19,0),true)});
test('second pointer ignored by stick',()=>{touchReset();try{eq(stickDown({pointerId:1,clientX:40,clientY:300}),true);eq(stickDown({pointerId:2,clientX:60,clientY:320}),false);eq(Touch.ptr.stick,1);eq([Touch.sx,Touch.sy],[40,300])}finally{touchReset()}});
test('touchReset clears inputs',()=>{Touch.ptr={stick:1,atk:2};Touch.mx=.5;Touch.my=-.3;Touch.fire=true;Touch.aimOverride={x:1,y:2};touchReset();eq([Touch.ptr,Touch.mx,Touch.my,Touch.fire,Touch.aimOverride],[{},0,0,false,null])});
test('stick walks under 0.5 and runs past it',()=>{const p=TP('paladin'),on=Touch.on;Touch.on=true;try{Touch.mx=.25;Touch.my=0;readInput(p);eq(p.input.mx,.5);Touch.mx=.8;readInput(p);eq(p.input.mx,1)}finally{Touch.on=on;touchReset()}});
test('tap casts, drag aims, back onto the slot cancels',()=>{const pl=players.slice(),p=TP('sorcerer'),on=Touch.on,e=enemies.slice();players.length=0;players.push(p);enemies.length=0;Touch.on=true;touchReset();const ev=(x,y)=>({pointerId:3,clientX:x,clientY:y});
  try{inPlay(()=>{slotDown(2,ev(500,300));slotUp(ev(505,300));eq(p.input.abil[2],true);eq(Touch.aimOverride,null);p.input.abil.fill(false);
    slotDown(2,ev(500,300));slotMove(ev(400,300));eq(Touch.aimOverride.x<0,true);slotUp(ev(400,300));eq(p.input.abil[2],true);const q=Touch.aimOverride;readInput(p);eq([p.input.ax,p.input.ay],[q.x,q.y]);eq(Touch.aimOverride,null);p.input.abil.fill(false);
    slotDown(2,ev(500,300));slotMove(ev(400,300));slotMove(ev(502,300));slotUp(ev(502,300));eq(p.input.abil[2],false);eq(Touch.aimOverride,null)})}
  finally{players.length=0;players.push(...pl);enemies.push(...e);Touch.on=on;touchReset()}});
test('taps ignored while paused',()=>{const pl=players.slice(),p=TP('sorcerer'),io=invOpen;players.length=0;players.push(p);touchReset();invOpen=true;const ev={pointerId:4,clientX:500,clientY:300};
  try{inPlay(()=>{eq(slotDown(2,ev),false);eq(atkDown(ev),false);slotUp(ev);eq(p.input.abil[2],false);eq(Touch.fire,false);eq(Touch.ptr,{})})}finally{invOpen=io;players.length=0;players.push(...pl);touchReset()}});
test('hold then drag still aims and casts',()=>{const pl=players.slice(),p=TP('sorcerer'),e=enemies.slice();players.length=0;players.push(p);enemies.length=0;touchReset();const ev=(x,y)=>({pointerId:3,clientX:x,clientY:y});
  try{inPlay(()=>{slotDown(2,ev(500,300));Touch.hold={id:3,x:500,y:300,fired:true,t:0};slotUp(ev(502,300));eq(p.input.abil[2],false);
    slotDown(2,ev(500,300));Touch.hold={id:3,x:500,y:300,fired:true,t:0};const m=ev(400,300);slotMove(m);holdMove(m);eq(Touch.hold,null);slotUp(m);eq(p.input.abil[2],true);eq(Touch.aimOverride.x<0,true)})}
  finally{players.length=0;players.push(...pl);enemies.push(...e);touchReset()}});

// ---- Phone layout, graphics (Task 7)
const FENV=(w,h,coarse,touched)=>({innerWidth:w,innerHeight:h,matchMedia:()=>({matches:coarse}),touchSeen:touched});
test('renderScale by graphics setting',()=>{eq(renderScale('auto',true,3),1);eq(renderScale('auto',false,3),2);eq(renderScale('low',false,2),1);eq(renderScale('high',true,3),2)});
test('isPhone: 844x390 coarse yes, 1280x800 no',()=>{eq(isPhone(FENV(844,390,true)),true);eq(isPhone(FENV(1280,800,true)),false)});
test('isPhone needs touch: a seen touch counts, a mouse alone does not',()=>{eq(isPhone(FENV(844,390,false,true)),true);eq(isPhone(FENV(844,390,false,false)),false)});
test('touch laptop stays desktop layout',()=>{const e=FENV(1280,800,true);eq(isPhone(e),false);eq(uiScale({uiSize:null},isPhone(e)),1)});
test('buff stats text tolerates a buff without stats',()=>{eq(statsText(undefined),'');eq(statsText({str:3}),'+3 '+STATLBL.str)});
test('uiSheet closes on Escape and on a backdrop tap',()=>{const a=uiSheet('x',[]);eq(a.closed,false);dispatchEvent(new KeyboardEvent('keydown',{code:'Escape'}));eq(a.closed,true);
  const b=uiSheet('y',[]);b.bg.click();eq(b.closed,true)});

// ---- Quick chat (Task 8)
test('chatClean trims, collapses, strips <> and caps at 120',()=>{eq(chatClean('  hi   there '),'hi there');eq(chatClean('<b>x'),'bx');eq(chatClean('a'.repeat(300)).length,120);eq(chatClean(null),'')});
test('CHAT_LINES are the 8 preset lines',()=>{eq(CHAT_LINES.length,8);eq(CHAT_LINES[0],'Help!');eq(CHAT_LINES[7],'Heading back to town')});
test('onChat keeps 50, shows 3 newest, and renders text not HTML',()=>{const old=Chat.log.slice(),bub=new Map(Chat.bub);Chat.log.length=0;
  try{for(let i=0;i<60;i++)onChat('N'+i,'m'+i,false);eq(Chat.log.length,50);eq($('chatLog').children.length,3);eq($('chatLog').lastChild.textContent.includes('m59'),true);
    onChat('<img src=x onerror=1>','<b>hi</b>',true);eq($('chatLog').querySelector('img'),null);eq($('chatLog').lastChild.querySelectorAll('b').length,1);eq($('chatLog').lastChild.textContent.includes('bhi/b'),true)}
  finally{Chat.log.length=0;Chat.log.push(...old);Chat.bub=bub;renderChatLog()}});

// ---- Co-op in the background: away guests, waiting for a hidden host, relay timing, phone snapshot rate
test('awayExpired is true after 60 s',()=>{eq(awayExpired(0,59),false);eq(awayExpired(0,61),true)});
test('hostWaitExpired is true after 180 s',()=>{eq(hostWaitExpired(0,179),false);eq(hostWaitExpired(0,181),true)});
test('relayDelay is 4 s with a phone, else 9 s',()=>{eq(relayDelay(true,false),4000);eq(relayDelay(false,true),4000);eq(relayDelay(false,false),9000)});
test('snapDt is 0.1 for a phone host',()=>{eq(snapDt(true),.1);eq(snapDt(false),SNAP_DT)});
test('away guest past 60s is dropped',()=>{const role=Net.role,pl=players,t0=time,np=Net.peers;
  try{Net.role='host';time=61;const pr={isRemote:true,uid:'ghost',awayBg:0,hp:1,maxHp:1,x:0,y:0},pe={uid:'ghost',name:'Ghost',proxy:pr,open:false};players=[pr];Net.peers=new Map([['ghost',pe]]);
    netTick(.01);eq(Net.peers.has('ghost'),false);eq(players.includes(pr),false)}
  finally{time=t0;players=pl;Net.peers=np;Net.role=role;}});
test('monsters skip an away-in-background proxy',()=>{const pl=players,a={isRemote:true,x:0,y:0,hp:5,away:false,awayBg:3},b={x:0,y:0,hp:5};players=[a,b];try{eq(friendlies().includes(a),false);eq(friendlies().includes(b),true)}finally{players=pl}});
test('closeDeathSheet closes the Rise beside sheet',()=>{let n=0;deathSheet={close:()=>n++};closeDeathSheet();closeDeathSheet();eq(n,1);eq(deathSheet,null)});
test('hpause ignored while only asking',()=>{const r=Net.role,a=Net.asking,hw=Net.hw;try{Net.role=null;Net.asking={uid:'x',ok:true};Net.hw=false;netData({uid:'x',name:'X'},{t:'hpause',v:1});eq(Net.hw,false)}finally{Net.role=r;Net.asking=a;Net.hw=hw}});
test('host hello while hidden sends hpause',()=>{const sent=[],o={role:Net.role,hid:Net.hid,hh:hostHidden,ns:netSend,peers:Net.peers,pl:players,cp:createPlayer,rs:rescaleEnemies,rp:renderParty,tt:toast,sf:sfx};
  try{Net.role='host';Net.hid=false;Net.peers=new Map();players=[{x:0,y:0,name:'H'}];hostHidden=()=>true;netSend=(p,m)=>{sent.push([p,m])};createPlayer=d=>({...d});rescaleEnemies=()=>{};renderParty=()=>{};toast=()=>{};sfx=()=>{};
    const pe={uid:'g1',name:'G'};hostHello(pe,{hero:{p:{}},ph:0});eq(sent.some(([p,m])=>p===pe&&m.t==='hpause'&&m.v===1),true);eq(Net.hid,true)}
  finally{Net.role=o.role;Net.hid=o.hid;hostHidden=o.hh;netSend=o.ns;Net.peers=o.peers;players=o.pl;createPlayer=o.cp;rescaleEnemies=o.rs;renderParty=o.rp;toast=o.tt;sfx=o.sf}});

// ---- Final fix wave
const PMEM=o=>Object.assign({isRemote:true,uid:'u1',netName:'Ann',name:'ann',level:3,cls:'paladin',look:{},gear:{},hp:5,maxHp:10,dead:false,away:false,x:0,y:0},o);
test('party not rebuilt when unchanged',()=>{const o={role:Net.role,pl:players};try{Net.role='host';players=[{x:0,y:0},PMEM()];renderParty();const a=$('party').querySelector('.pm');renderParty();eq($('party').querySelector('.pm')===a,true);
    players[1].hp=2;renderParty();eq($('party').querySelector('.pm')===a,true,'hp changes update in place');eq($('party').querySelector('.pm .bar i').style.width,'20%');players[1].level=4;renderParty();eq($('party').querySelector('.pm')===a,false,'level change rebuilds')}
  finally{Net.role=o.role;players=o.pl;renderParty()}});
test('party level is numeric',()=>{const o={role:Net.role,pl:players};try{Net.role='host';players=[{x:0,y:0},PMEM({level:'<img src=x>',netName:'<b>x</b>'})];renderParty();const el=$('party');eq(el.querySelector('img'),null);eq(el.querySelector('b'),null);eq(/Lv \?/.test(el.querySelector('small').textContent),true)}
  finally{Net.role=o.role;players=o.pl;renderParty()}});
test('lvClamp coerces to 1..99',()=>{eq(lvClamp('<img>'),1);eq(lvClamp(500),99);eq(lvClamp(-4),1);eq(lvClamp('12'),12)});
test('preview target picked when idle on touch',()=>{const pl=players.slice(),p=TP('sorcerer'),on=Touch.on,e=enemies.slice(),t0=Aim.target,pt0=Aim.pt,ip=isPaused,en=AU(60,0,{dead:false}),lc=lineClear;isPaused=()=>false;players.length=0;players.push(p);enemies.length=0;enemies.push(en);Touch.on=true;touchReset();Aim.target=null;Aim.pt=0;lineClear=()=>true;
  try{inPlay(()=>{aimPreview(p);eq(Aim.target===en,true);Aim.pt=0;Touch.fire=true;enemies.length=0;aimPreview(p);eq(Aim.target===en,true,'no re-pick while firing');Touch.fire=false;Aim.pt=0;aimPreview(p);eq(Aim.target,null)})}
  finally{isPaused=ip;lineClear=lc;players.length=0;players.push(...pl);enemies.length=0;enemies.push(...e);Touch.on=on;Aim.target=t0;Aim.pt=pt0;touchReset()}});
test('guest waits after 5s without snapshots',()=>{const o={role:Net.role,hw:Net.hw,hwT:Net.hwT,host:Net.host,ls:Net.lastSnap};try{Net.role='guest';Net.host={name:'H'};Net.hw=false;Net.hwT=0;Net.lastSnap=rt-4;hostWaitTick();eq(Net.hw,false);Net.lastSnap=rt-6;hostWaitTick();eq(Net.hw,true);eq(Net.hwT,rt);
    netData({uid:'x',name:'X'},{t:'snap',q:0,pl:[],en:[],al:[],ev:[],cs:[]});eq(Net.hw,false)}
  finally{Net.role=o.role;Net.hw=o.hw;Net.hwT=o.hwT;Net.host=o.host;Net.lastSnap=o.ls;hostWaitShow()}});
test('desktop key hints hidden on touch',()=>{const on=Touch.on;try{Touch.on=true;eq(keyHint('Loot'),'Loot');Touch.on=false;eq(keyHint('Loot'),'[E] Loot')}finally{Touch.on=on}});
test('drawBubble works without roundRect',()=>{const old=CanvasRenderingContext2D.prototype.roundRect;try{CanvasRenderingContext2D.prototype.roundRect=undefined;const k=myUid();Chat.bub.set(k,{m:'hi',until:rt+3});drawBubble({x:0,y:0},50,50);eq(true,true)}finally{CanvasRenderingContext2D.prototype.roundRect=old;Chat.bub.delete(myUid())}});

// ---- Phone HUD declutter: sizes from the screen height, locked abilities hidden, no overlaps in the arc
test('touch sizes scale with height',()=>{const a=touchSizes(220),b=touchSizes(300),c=touchSizes(400),d=touchSizes(390);
  eq([a.atk,a.ab,a.q],[64,44,36]);eq([c.atk,c.ab,c.q],[84,56,40]);eq([d.atk,d.ab,d.q],[84,56,40]);eq([b.atk,b.ab,b.q],[70,48,37]);
  eq([a.mini,c.mini],[96,120]);eq(touchSizes(100).atk,64);eq(touchSizes(900).atk,84)});
test('touchPlace keeps abilities apart and below the minimap',()=>{for(const[W,H,lim]of[[667,220,110],[667,375,140],[844,390,140],[915,412,140]]){const z=touchSizes(H);
    for(let n=0;n<=5;n++){const r=touchPlace({W,H,atk:z.atk,ab:z.ab,q:z.q,limit:lim,n}),cs=[{x:r.atk.x,y:r.atk.y,r:z.atk/2},...r.abil.map(a=>({x:a.x,y:a.y,r:z.ab/2}))],tag=W+'x'+H+' n'+n;
      eq(r.abil.length,n,tag);
      for(let i=0;i<cs.length;i++){eq(cs[i].y-cs[i].r>=lim,true,tag+' below limit '+i);eq(cs[i].x-cs[i].r>=0&&cs[i].x+cs[i].r<=W&&cs[i].y+cs[i].r<=H,true,tag+' on screen '+i);
        for(let j=i+1;j<cs.length;j++)eq(Math.max(Math.abs(cs[i].x-cs[j].x),Math.abs(cs[i].y-cs[j].y))>=cs[i].r+cs[j].r,true,tag+' boxes overlap '+i+','+j);
        const k=r.quick;eq(cs[i].x+cs[i].r<=k.x||cs[i].x-cs[i].r>=k.x+k.w||cs[i].y+cs[i].r<=k.y||cs[i].y-cs[i].r>=k.y+k.h,true,tag+' quick overlap '+i)}
      eq(r.quick.y>=lim,true,tag+' quick below limit')}}});
test('locked abilities hidden on phone',()=>{const lp=Layout.phone,pl=players.slice(),p=TP('sorcerer');p.level=1;p.abil=ABIL.sorcerer.concat([SPEC_LOCKED]);players.length=0;players.push(p);
  const ds=()=>[...document.querySelectorAll('#arc .tslot')].map(s=>s.style.display!=='none');
  try{Layout.phone=true;touchBuild(p);touchLayout(p);eq(ds(),[true,true,false,false,false,false]);
    p.level=5;touchLayout(p);eq(ds(),[true,true,true,true,false,false],'level 5');
    p.level=10;p.abil=ABIL.sorcerer.concat([{name:'Sig',icon:'x',cd:1,mana:0,cast(){}}]);touchLayout(p);eq(ds(),[true,true,true,true,true,true],'spec slot with a spec');
    p.abil=ABIL.sorcerer.concat([SPEC_LOCKED]);touchLayout(p);eq(ds()[5],false,'spec slot without a spec');
    Layout.phone=false;touchLayout(p);eq(ds().every(Boolean),true,'desktop touch keeps all slots')}
  finally{Layout.phone=lp;players.length=0;players.push(...pl);Touch.built=null;touchLayout.key=null}});

// ---- Fullscreen button and in-app browser notice
const UA_MSG='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/430.0;FBBV/1;FBDV/iPhone15,2]',
  UA_SAF='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  UA_AND='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
  UA_IG='Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 Instagram 300.0.0';
test('Messenger iOS is an in-app browser, Safari and Chrome are not',()=>{eq(isInAppBrowser(UA_MSG),true);eq(isInAppBrowser(UA_IG),true);eq(isInAppBrowser(UA_SAF),false);eq(isInAppBrowser(UA_AND),false);eq(isInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'),true,'WKWebView without Safari')});
test('fsMode picks inapp, ios-a2hs, api or none',()=>{eq(fsMode({ua:UA_MSG,hasFsApi:false,standalone:false}),'inapp');eq(fsMode({ua:UA_SAF,hasFsApi:false,standalone:false}),'ios-a2hs');
  eq(fsMode({ua:UA_AND,hasFsApi:true,standalone:false}),'api');eq(fsMode({ua:UA_SAF,hasFsApi:false,standalone:true}),'none');eq(fsMode({ua:UA_AND,hasFsApi:true,standalone:true}),'none');eq(fsMode({ua:UA_AND,hasFsApi:false,standalone:false}),'none')});

// ---- Delete confirm: phone keyboards change case and add spaces
test('delete name match ignores case and spaces',()=>{eq(nameMatches(' corwin ','Corwin'),true);eq(nameMatches('CORWIN','Corwin'),true);eq(nameMatches('Corwi','Corwin'),false);eq(nameMatches('','Corwin'),false)});

// ---- Fix round 1: safe-area insets, fullscreen state
test('touchPlace keeps every box inside the safe-area insets',()=>{for(const[W,H]of[[667,220],[844,390]]){const z=touchSizes(H),ir=47,ib=21,il=47,r=touchPlace({W,H,atk:z.atk,ab:z.ab,q:z.q,limit:110,n:5,ir,ib,il}),k=r.quick,bs=[{x:r.atk.x,y:r.atk.y,r:z.atk/2},...r.abil.map(a=>({x:a.x,y:a.y,r:z.ab/2}))],tag=W+'x'+H;
    for(const b of bs){eq(b.x+b.r<=W-ir&&b.y+b.r<=H-ib&&b.x-b.r>=il,true,tag+' circle inside')}eq(k.x+k.w<=W-ir||k.x+k.w<=r.atk.x,true,tag+' quick right');eq(k.y+k.h<=H-ib,true,tag+' quick bottom');eq(r.mb>=ib,true,tag+' ctx bottom margin')}});
test('fullscreenchange sync clears and sets Settings.fullscreen',()=>{const o=Settings.fullscreen,fe=fsEl;try{fsEl=()=>null;Settings.fullscreen=true;fsSync();eq(Settings.fullscreen,false,'left fullscreen');fsEl=()=>document.body;fsSync();eq(Settings.fullscreen,true,'entered')}finally{fsEl=fe;if(o===undefined)delete Settings.fullscreen;else Settings.fullscreen=o;saveSettings()}});
