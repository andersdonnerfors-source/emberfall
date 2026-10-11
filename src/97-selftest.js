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
