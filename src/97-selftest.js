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
test('settings default without storage',()=>{const f=fetchStore;fetchStore=()=>null;try{eq(loadSettings(),{autoLoot:false,lootMinRar:1})}finally{fetchStore=f}});

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
