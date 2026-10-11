// ================= Developer test mode for co-op =================
// Open the game twice on this computer as index.html?nettest=a and index.html?nettest=b: the two tabs act as two
// friends and introduce each other through the browser (no accounts needed). Ignored without the parameter.
const NETTEST=(/[?&]nettest=(a|b)\b/.exec(location.search)||[])[1]||null;
if(NETTEST){const me='test-'+NETTEST,other='test-'+(NETTEST==='a'?'b':'a'),bc=new BroadcastChannel('ef-nettest');
  Account.user={id:me,email:'tester-'+NETTEST};Friends.me={id:me,name:'Tester'+NETTEST.toUpperCase()};
  Friends.list=[{fid:1,id:other,name:'Tester'+(NETTEST==='a'?'B':'A'),status:'accepted',online:true,play:{hero:'?',party:1}}];
  bc.onmessage=e=>{if(e.data.to===me)netSignal(e.data.m)};
  sig=async(uid,msg)=>{msg.from=me;msg.fname=Friends.me.name;msg.v=NET_VER;bc.postMessage({to:uid,m:msg})};
  netInit=async()=>{};document.title='Emberfall test '+NETTEST.toUpperCase()}
