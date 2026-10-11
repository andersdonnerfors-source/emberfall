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
