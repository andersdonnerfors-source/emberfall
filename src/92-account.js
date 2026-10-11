// ================= Accounts and hero storage =================
// Online: heroes are stored in Supabase, and database rules (supabase-setup.sql) make sure each player can only
// read, change and delete their own heroes. Offline: heroes stay in this browser, as before.
// To switch online, fill in the two values from Supabase → Project Settings → API. The anon key is meant to be public.
const SUPA_URL='';
const SUPA_ANON_KEY='';
const ONLINE_READY=!!(SUPA_URL&&SUPA_ANON_KEY);
const SUPA_LIB='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js';
const MODE_KEY='emberfall-mode';
const Account={mode:null,user:null,sb:null,cache:[],dirty:null,lastPush:0,
  async client(){if(this.sb)return this.sb;if(!window.supabase)await new Promise((ok,fail)=>{const s=document.createElement('script');s.src=SUPA_LIB;s.onload=ok;s.onerror=()=>fail(new Error('Could not reach the login service. Check your internet connection.'));document.head.appendChild(s)});
    this.sb=window.supabase.createClient(SUPA_URL,SUPA_ANON_KEY);return this.sb},
  // Resume a remembered login (online) or offline choice. Returns true if we can go straight to the heroes.
  async resume(){const m=fetchStore(MODE_KEY);if(m==='offline'){this.mode='offline';return true}
    if(m==='online'&&ONLINE_READY){try{const sb=await this.client(),{data}=await sb.auth.getSession();if(data.session){this.mode='online';this.user=data.session.user;return true}}catch(e){}}return false},
  playOffline(){this.mode='offline';this.user=null;store(MODE_KEY,'offline')},
  async signIn(email,pw){const sb=await this.client(),{data,error}=await sb.auth.signInWithPassword({email,password:pw});if(error)throw error;this.mode='online';this.user=data.user;store(MODE_KEY,'online')},
  async signUp(email,pw){const sb=await this.client(),{data,error}=await sb.auth.signUp({email,password:pw});if(error)throw error;
    if(data.session){this.mode='online';this.user=data.user;store(MODE_KEY,'online');return'in'}return'confirm'},
  async resetPassword(email){const sb=await this.client(),{error}=await sb.auth.resetPasswordForEmail(email);if(error)throw error},
  async signOut(){if(this.mode==='online'){await this.flush();try{await (await this.client()).auth.signOut()}catch(e){}}this.mode=null;this.user=null;this.cache=[];store(MODE_KEY,null)},
  label(){return this.mode==='online'?(this.user&&this.user.email||'Signed in'):'Offline · heroes are saved on this computer'},
  // ---- heroes: list, save, delete (same shape both ways: {id,t,data})
  async list(){if(this.mode!=='online'){this.cache=allSaves().heroes.sort((a,b)=>b.t-a.t);return this.cache}
    const sb=await this.client(),{data,error}=await sb.from('heroes').select('id,data,updated_at').order('updated_at',{ascending:false});if(error)throw error;
    this.cache=data.map(r=>({id:r.id,t:Date.parse(r.updated_at),data:r.data}));return this.cache},
  newId(){return this.mode==='online'&&crypto.randomUUID?crypto.randomUUID():'h'+Date.now()},
  // Called by save(): offline writes at once; online keeps a local copy and sends to the server at most every 20 s.
  write(id,data){if(this.mode!=='online'){writeHero(data);return}const e=this.cache.find(h=>h.id===id);if(e){e.data=data;e.t=Date.now()}else this.cache.unshift({id,t:Date.now(),data});
    this.dirty={id,data};if(Date.now()-this.lastPush>20000)this.flush()},
  async flush(){if(this.mode!=='online'||!this.dirty)return;const{id,data}=this.dirty;this.dirty=null;this.lastPush=Date.now();
    try{const sb=await this.client(),{error}=await sb.from('heroes').upsert({id,name:data.p.name,data,updated_at:new Date().toISOString()});if(error)throw error}
    catch(e){this.dirty=this.dirty||{id,data};toast('Could not save online: '+e.message,'danger')}},
  async remove(id){if(this.mode!=='online'){deleteHero(id);return}const sb=await this.client(),{error}=await sb.from('heroes').delete().eq('id',id);if(error)throw error;this.cache=this.cache.filter(h=>h.id!==id)},
  // Heroes made offline on this computer can be moved into the account once.
  async importOffline(){const local=allSaves().heroes;let n=0;for(const h of local){if(this.cache.length>=MAX_HEROES)break;const id=this.newId();
    const sb=await this.client(),{error}=await sb.from('heroes').insert({id,name:h.data.p.name,data:h.data});if(error){toast(error.message,'danger');break}n++}return n}};
addEventListener('beforeunload',()=>{if(Account.dirty)Account.flush()});
setInterval(()=>{if(Account.dirty&&Date.now()-Account.lastPush>20000)Account.flush()},5000);

// ================= Login window =================
function showLogin(){state='login';show('login');const on=ONLINE_READY;$('loginForm').classList.toggle('off',!on);
  $('loginNote').innerHTML=on?'':'Online accounts open soon. Until then you can play offline: your heroes are saved in this browser on this computer.';$('loginMsg').textContent='';}
function loginBusy(b,msg){for(const id of['btnSignIn','btnSignUp'])$(id).disabled=b;$('loginMsg').className=msg&&msg.err?'err':'';$('loginMsg').textContent=msg?msg.t:''}
async function doLogin(kind){const email=$('loginEmail').value.trim(),pw=$('loginPw').value;
  if(!email||!pw){loginBusy(false,{t:'Enter your email and password.',err:1});return}if(kind==='up'&&pw.length<8){loginBusy(false,{t:'Use at least 8 characters for the password.',err:1});return}
  loginBusy(true,{t:kind==='up'?'Creating your account…':'Signing in…'});
  try{if(kind==='up'){const r=await Account.signUp(email,pw);if(r==='confirm'){loginBusy(false,{t:'Almost there: check your email and click the confirmation link, then sign in here.'});return}}else await Account.signIn(email,pw);
    $('loginPw').value='';loginBusy(false);openSelect()}
  catch(e){loginBusy(false,{t:e.message||'Something went wrong.',err:1})}}
$('btnSignIn').onclick=()=>doLogin('in');$('btnSignUp').onclick=()=>doLogin('up');
$('loginPw').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin('in')});
$('btnOffline').onclick=()=>{Account.playOffline();openSelect()};
$('btnForgot').onclick=async()=>{const email=$('loginEmail').value.trim();if(!email){loginBusy(false,{t:'Type your email first.',err:1});return}
  try{await Account.resetPassword(email);loginBusy(false,{t:'If that account exists, a reset link is on its way to your email.'})}catch(e){loginBusy(false,{t:e.message,err:1})}};
async function startScreens(){if(await Account.resume())openSelect();else showLogin()}
