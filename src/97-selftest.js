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
