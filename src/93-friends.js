// ================= Friends =================
// Online players have an account name (never their email). Add friends by name, accept requests, and see who is
// online and what they are playing. Database rules (supabase-friends.sql) show you only yourself and your friends.
const Friends={me:null,list:[],seen:new Set(),open:false,lastPoll:0,
  async sb(){return Account.client()},
  async loadMe(){if(Account.mode!=='online')return null;const sb=await this.sb(),{data,error}=await sb.from('profiles').select('id,name').eq('id',Account.user.id).maybeSingle();if(error)throw error;this.me=data;return data},
  async claimName(name){const sb=await this.sb(),{data,error}=await sb.from('profiles').insert({name}).select('id,name').single();
    if(error)throw new Error(error.code==='23505'?'That name is taken. Try another.':error.message.includes('check')?'Use 3–16 letters, numbers or _.':error.message);this.me=data;return data},
  async refresh(){if(Account.mode!=='online'||!this.me)return[];const sb=await this.sb(),uid=Account.user.id;
    const{data:fs,error}=await sb.from('friendships').select('id,requester,addressee,status,created_at');if(error)throw error;
    const ids=[...new Set(fs.map(f=>f.requester===uid?f.addressee:f.requester))];let profs=[];
    if(ids.length){const r=await sb.from('profiles').select('id,name,last_seen,status').in('id',ids);if(r.error)throw r.error;profs=r.data}
    const pm=Object.fromEntries(profs.map(p=>[p.id,p]));
    this.list=fs.map(f=>{const other=f.requester===uid?f.addressee:f.requester,p=pm[other]||{name:'(unknown)',status:{}};
      return{fid:f.id,id:other,name:p.name,status:f.status,incoming:f.status==='pending'&&f.addressee===uid,outgoing:f.status==='pending'&&f.requester===uid,
        online:p.last_seen&&Date.now()-Date.parse(p.last_seen)<150000,lastSeen:p.last_seen,play:p.status||{}}});
    for(const f of this.list)if(f.incoming&&!this.seen.has(f.fid)){this.seen.add(f.fid);toast(`${f.name} wants to be your friend. Press O to answer.`,'gold');sfx('quest')}
    updateFriendBadge();return this.list},
  async add(name){const sb=await this.sb(),{data,error}=await sb.rpc('find_player',{p_name:name});if(error)throw error;const p=data&&data[0];
    if(!p)throw new Error('No player with that name.');if(p.id===Account.user.id)throw new Error('That is you!');
    if(this.list.some(f=>f.id===p.id))throw new Error(`${p.name} is already on your list.`);
    const r=await sb.from('friendships').insert({addressee:p.id});if(r.error)throw new Error(r.error.code==='23505'?`You and ${p.name} already have a request.`:r.error.message);return p.name},
  async accept(fid){const sb=await this.sb(),{error}=await sb.from('friendships').update({status:'accepted'}).eq('id',fid);if(error)throw error},
  async remove(fid){const sb=await this.sb(),{error}=await sb.from('friendships').delete().eq('id',fid);if(error)throw error},
  // Tells friends you are online and what you are doing (every minute while signed in).
  async heartbeat(){if(Account.mode!=='online'||!this.me)return;const p=players[0];
    const status=state==='play'&&p?{hero:p.name,level:p.level,cls:p.cls,where:Net.role==='guest'?`in ${Net.host.name}'s world`:zone.id==='over'?locName(p.x/TILE,p.y/TILE):zone.name,guest:Net.role==='guest',party:Net.size()}:{menu:true};
    try{const sb=await this.sb();await sb.from('profiles').update({last_seen:new Date().toISOString(),status}).eq('id',Account.user.id)}catch(e){}}};
setInterval(()=>{if(Account.mode==='online'&&Friends.me){Friends.heartbeat();Friends.refresh().then(()=>{if(Friends.open)renderFriends()}).catch(()=>{})}},45000);

// ---- Choosing an account name (once, after the first sign-in)
async function ensureProfile(){if(Account.mode!=='online')return true;try{if(await Friends.loadMe()){Friends.heartbeat();Friends.refresh().catch(()=>{});return true}}catch(e){toast('Could not load your profile: '+e.message,'danger');return true}
  return new Promise(done=>{const box=$('namePick');box.classList.remove('hidden');const inp=$('npName'),msg=$('npMsg');inp.value='';msg.textContent='';inp.focus();
    const go=async()=>{const n=inp.value.trim();if(!/^[A-Za-z0-9_]{3,16}$/.test(n)){msg.textContent='Use 3–16 letters, numbers or _ (no spaces).';return}
      $('npOk').disabled=true;try{await Friends.claimName(n);box.classList.add('hidden');toast(`Welcome, ${n}! Friends can now find you by that name.`,'gold');Friends.heartbeat();done(true)}catch(e){msg.textContent=e.message}$('npOk').disabled=false};
    $('npOk').onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()}})}

// ---- The friends panel (O, or the Friends button on the hero screen)
function toggleFriends(v){Friends.open=v===undefined?!Friends.open:v;$('friends').classList.toggle('hidden',!Friends.open);mouse.l=false;hideTip();
  if(Friends.open){renderFriends();Friends.refresh().then(renderFriends).catch(e=>{$('frMsg').textContent=e.message})}}
function updateFriendBadge(){const n=Friends.list.filter(f=>f.incoming).length;for(const id of['frBadge','frBadge2']){const b=$(id);if(b){b.textContent=n;b.classList.toggle('hidden',!n)}}}
function friendLine(f){if(f.status!=='accepted')return f.incoming?'Wants to be your friend':'Request sent';if(!f.online)return'Offline'+(f.lastSeen?' · seen '+agoText(f.lastSeen):'');
  const s=f.play;return s.hero?`Playing ${escapeHtml(s.hero)} · level ${s.level} ${CLASSES[s.cls]?CLASSES[s.cls].name:''}${s.where?' · '+escapeHtml(s.where):''}`:'Online · choosing a hero'}
function agoText(t){const m=Math.round((Date.now()-Date.parse(t))/60000);return m<60?m+' min ago':m<1440?Math.round(m/60)+' h ago':Math.round(m/1440)+' days ago'}
function renderFriends(){const el=$('frList');if(!el)return;
  if(Account.mode!=='online'){$('frMe').textContent='';$('frAdd').classList.add('hidden');el.innerHTML='<div class="muted" style="padding:14px;text-align:center">Sign in with an online account to add friends and play together.</div>';return}
  $('frAdd').classList.remove('hidden');$('frMe').innerHTML=Friends.me?`Your name: <b>${escapeHtml(Friends.me.name)}</b> · friends add you by this name`:'';el.innerHTML='';
  const L=Friends.list,groups=[['Requests for you',L.filter(f=>f.incoming)],['Friends',L.filter(f=>f.status==='accepted').sort((a,b)=>(b.online-a.online)||a.name.localeCompare(b.name))],['Waiting for answer',L.filter(f=>f.outgoing)]];
  if(!L.length)el.innerHTML='<div class="muted" style="padding:14px;text-align:center">No friends yet. Add someone by their account name above.</div>';
  for(const[title,arr]of groups){if(!arr.length)continue;el.insertAdjacentHTML('beforeend',`<div class="frgroup">${title}</div>`);
    for(const f of arr){const row=document.createElement('div');row.className='frrow';
      row.innerHTML=`<span class="dot ${f.online&&f.status==='accepted'?'on':''}"></span><div class="frtx"><b>${escapeHtml(f.name)}</b><small>${friendLine(f)}</small></div>`;
      const btn=(t,fn,cls)=>{const b=document.createElement('button');b.textContent=t;if(cls)b.className=cls;b.onclick=async()=>{b.disabled=true;try{await fn()}catch(e){$('frMsg').textContent=e.message}await Friends.refresh().catch(()=>{});renderFriends()};row.appendChild(b)};
      if(f.incoming){btn('Accept',()=>Friends.accept(f.fid).then(()=>toast(`You and ${f.name} are now friends.`,'gold')));btn('Decline',()=>Friends.remove(f.fid),'ghost')}
      else if(f.outgoing)btn('Cancel',()=>Friends.remove(f.fid),'ghost');
      else{const canJoin=f.online&&f.play.hero&&!f.play.guest&&(f.play.party||1)<MAX_PARTY,canInv=f.online&&state==='play'&&Net.role!=='guest';
        if(canInv){const iv=document.createElement('button');iv.textContent='Invite';iv.onclick=()=>netInvite(f.id,f.name);row.appendChild(iv)}
        const j=document.createElement('button');j.textContent='Join';j.disabled=!canJoin||(Net.role==='guest'&&Net.host&&Net.host.uid===f.id);j.title=canJoin?`Play in ${f.name}'s world`:f.play.guest?`${f.name} is visiting someone else`:`${f.name} is not in a world right now`;j.onclick=()=>{toggleFriends(false);netJoin(f.id,f.name,false)};row.appendChild(j);
        btn('✕',async()=>{if(confirm(`Remove ${f.name} from your friends?`))await Friends.remove(f.fid)},'ghost')}
      el.appendChild(row)}}}
$('frAddBtn').onclick=async()=>{const n=$('frName').value.trim();$('frMsg').textContent='';if(!n)return;$('frAddBtn').disabled=true;
  try{const name=await Friends.add(n);$('frName').value='';$('frMsg').textContent=`Request sent to ${name}.`;await Friends.refresh();renderFriends()}catch(e){$('frMsg').textContent=e.message}$('frAddBtn').disabled=false};
$('frName').addEventListener('keydown',e=>{if(e.key==='Enter')$('frAddBtn').click();e.stopPropagation()});
addEventListener('keydown',e=>{if(state!=='title'||e.target.tagName==='INPUT')return;if(e.code==='KeyO')toggleFriends();if(e.code==='Escape'&&Friends.open)toggleFriends(false)});
$('frClose').onclick=()=>toggleFriends(false);$('btnFriends').onclick=()=>toggleFriends(true);
