// ================= Co-op: playing together in one world =================
// The host's browser runs the world (monsters, loot, bosses). Guests run their own hero for instant response and send
// what it does; the host sends back what happens. Browsers talk directly (WebRTC data channel); Supabase Realtime only
// introduces them, and relays the game if a network blocks direct connections. Only accepted friends can join.
const NET_VER=1,MAX_PARTY=4,SNAP_DT=1/12,ST_DT=1/15,TP_CD=30;
const ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const Net={role:null,peers:new Map(),chan:null,out:new Map(),nid:0,ev:[],snapT:0,stT:0,heroT:0,heroSig:'',apT:0,corpVer:0,
  host:null,hostZone:'over',hostQ:0,own:null,avatars:new Map(),invited:new Set(),asking:null,pendingHero:null,tpCd:0,
  active(){return!!this.role},size(){return this.role==='host'?1+[...this.peers.values()].filter(p=>p.proxy&&!p.proxy.away).length:this.role==='guest'?1+this.avatars.size:1}};

// ---- Signalling through Supabase Realtime (each player listens on their own channel)
function rtSub(ch){return new Promise((ok,fail)=>{let done=false;ch.subscribe(s=>{if(done)return;if(s==='SUBSCRIBED'){done=true;ok()}else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){done=true;fail(new Error('Could not reach the co-op service.'))}})})}
async function netInit(){if(Account.mode!=='online'||Net.chan||!Account.user)return;const sb=await Account.client();
  Net.chan=sb.channel('ef-u-'+Account.user.id,{config:{broadcast:{self:false}}});Net.chan.on('broadcast',{event:'m'},({payload})=>netSignal(payload));await rtSub(Net.chan)}
async function sig(uid,msg){const sb=await Account.client();let ch=Net.out.get(uid);
  if(!ch){ch=sb.channel('ef-u-'+uid,{config:{broadcast:{self:false}}});Net.out.set(uid,ch);await rtSub(ch)}
  msg.from=Account.user.id;msg.fname=Friends.me?Friends.me.name:'?';msg.v=NET_VER;await ch.send({type:'broadcast',event:'m',payload:msg})}
// The saved record of a hero (online: the account cache; offline: this browser).
function heroRecord(id){return(Account.mode==='online'?Account.cache:allSaves().heroes).find(h=>h.id===id)}
function isFriend(uid){return Friends.list.some(f=>f.id===uid&&f.status==='accepted')}
function netSignal(m){if(!m||!isFriend(m.from))return;
  if(m.v!==NET_VER){if(m.t==='join'||m.t==='invite')toast(`${m.fname} has a different game version. Both of you: reload the page.`,'danger');return}
  switch(m.t){
    case'invite':if(Net.role==='guest'&&Net.host&&Net.host.uid===m.from)return;netAsk(`${m.fname} invites you to their world.`,[['Accept',()=>netJoin(m.from,m.fname,true)],['Decline',null]]);break;
    case'join':onJoinRequest(m);break;
    case'ok':if(Net.asking&&Net.asking.uid===m.from){Net.asking.ok=true;toast(`${m.fname} accepted. Connecting…`,'gold');netConnect(m.from,m.fname,m.seed)}break;
    case'no':if(Net.asking&&Net.asking.uid===m.from){Net.asking=null;toast(m.why||`${m.fname} could not take you in right now.`,'danger')}break;
    case'sdp':onSdp(m);break;
    case'ice':{const pe=Net.peers.get(m.from);if(!pe)return;if(pe.pc&&pe.pc.remoteDescription)pe.pc.addIceCandidate(m.c).catch(()=>{});else(pe.iceQ=pe.iceQ||[]).push(m.c);break}
    case'g':{let pe=Net.peers.get(m.from);if(!pe&&Net.role!=='guest'&&m.d&&m.d.t==='hello'){pe=newPeer(m.from,m.fname)}if(!pe)return;if(!pe.open){pe.relay=true;pe.open=true;clearTimeout(pe.fallT)}netData(pe,m.d);break}}}
// A small box at the top of the screen that waits for an answer.
function netAsk(text,btns,ms){const box=document.createElement('div');box.className='netask panel';box.innerHTML=`<div>${escapeHtml(text)}</div>`;const row=document.createElement('div');row.className='row';
  const close=()=>{box.remove()};for(const[l,fn]of btns){const b=document.createElement('button');b.className='btn'+(fn?' primary':'');b.textContent=l;b.onclick=()=>{close();if(fn)fn()};row.appendChild(b)}
  box.appendChild(row);$('netAsks').appendChild(box);sfx('quest');setTimeout(close,ms||20000)}

// ---- Joining (guest side)
function netJoin(uid,name,invited){if(Account.mode!=='online'&&!NETTEST){toast('Sign in online to play with friends.','danger');return}
  if(Net.role){toast(Net.role==='guest'?'Leave your current party first (Esc menu).':'You are hosting friends right now.','danger');return}
  let hero=null;if(state==='play'&&players[0]){save();hero={id:heroId}}else{const h=SEL.heroes[SEL.idx];if(!h){toast('Create a hero first.','danger');return}hero={id:h.id,data:h.data}}
  Net.pendingHero=hero;Net.asking={uid,name,ok:false};sig(uid,{t:'join',invited:!!invited,hero:{name:(hero.data||{p:players[0]}).p.name,level:(hero.data||{p:players[0]}).p.level}}).catch(e=>toast(e.message,'danger'));
  toast(`Asking ${name} to join their world…`);setTimeout(()=>{if(Net.asking&&Net.asking.uid===uid&&!Net.asking.ok){Net.asking=null;toast(`${name} did not answer.`,'danger')}},35000)}
function newPeer(uid,name){const pe={uid,name,pc:null,dc:null,open:false,relay:false,proxy:null,iceQ:[]};Net.peers.set(uid,pe);return pe}
async function netConnect(uid,name,seed){const pe=newPeer(uid,name);pe.seed=seed;const pc=pe.pc=new RTCPeerConnection({iceServers:ICE});
  pc.onicecandidate=e=>{if(e.candidate)sig(uid,{t:'ice',c:e.candidate.toJSON()}).catch(()=>{})};
  pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'&&!pe.relay&&pe.open)peerLost(pe)};
  setupDC(pe,pc.createDataChannel('g',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());await sig(uid,{t:'sdp',d:pc.localDescription.toJSON()});
  // No direct connection within 9 s (strict network): play through the relay instead.
  pe.fallT=setTimeout(()=>{if(!pe.open){pe.relay=true;pe.open=true;netSend(pe,{t:'hello',hero:heroNetData()})}},9000)}
function setupDC(pe,dc){pe.dc=dc;dc.onopen=()=>{if(pe.relay)return;pe.open=true;clearTimeout(pe.fallT);if(Net.role!=='host'&&Net.asking)netSend(pe,{t:'hello',hero:heroNetData()})};
  dc.onmessage=e=>{try{netData(pe,JSON.parse(e.data))}catch(err){console.error(err)}};dc.onclose=()=>{if(!pe.relay)peerLost(pe)}}
function netSend(pe,m){if(!pe||!pe.open)return;if(pe.relay)sig(pe.uid,{t:'g',d:m}).catch(()=>{});else if(pe.dc&&pe.dc.readyState==='open')pe.dc.send(JSON.stringify(m))}
function netAll(m){for(const pe of Net.peers.values())netSend(pe,m)}
function heroNetData(){const p=players[0];if(state==='play'&&p)return{p:{name:p.name,cls:p.cls,look:p.look,level:p.level,gear:p.gear,attr:p.attr,talents:p.talents,spec:p.spec,skills:p.skills,bagSize:p.bagSize,home:p.home}};
  const d=Net.pendingHero&&Net.pendingHero.data;return d?{p:d.p}:null}

// ---- Hosting (host side)
function onJoinRequest(m){const no=why=>sig(m.from,{t:'no',why}).catch(()=>{});
  if(state!=='play'||!players[0])return no(`${Friends.me?Friends.me.name:'Your friend'} is not in a world right now.`);
  if(Net.role==='guest')return no('They are visiting someone else right now.');
  if(Net.size()>=MAX_PARTY)return no('Their world is full (4 players).');
  const accept=()=>{Net.invited.delete(m.from);sig(m.from,{t:'ok',seed:WSEED}).catch(()=>{})};
  if(m.invited&&Net.invited.has(m.from))accept();else netAsk(`${m.fname} (${escapeHtml(m.hero&&m.hero.name||'')}, level ${m.hero&&m.hero.level||'?'}) wants to join your world.`,[['Accept',accept],['Decline',()=>no(`${Friends.me?Friends.me.name:'Your friend'} declined.`)]])}
function netInvite(uid,name){if(state!=='play'){toast('Enter your world first, then invite.','danger');return}if(Net.role==='guest'){toast('You are visiting someone else right now.','danger');return}
  Net.invited.add(uid);sig(uid,{t:'invite'}).then(()=>toast(`Invitation sent to ${name}.`)).catch(e=>toast(e.message,'danger'))}
async function onSdp(m){if(m.d.type==='offer'){if(state!=='play')return;let pe=Net.peers.get(m.from);if(pe&&pe.pc)pe.pc.close();pe=newPeer(m.from,m.fname);
    const pc=pe.pc=new RTCPeerConnection({iceServers:ICE});pc.onicecandidate=e=>{if(e.candidate)sig(m.from,{t:'ice',c:e.candidate.toJSON()}).catch(()=>{})};pc.ondatachannel=e=>setupDC(pe,e.channel);
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='failed'&&!pe.relay)peerLost(pe)};
    await pc.setRemoteDescription(m.d);for(const c of pe.iceQ)pc.addIceCandidate(c).catch(()=>{});pe.iceQ=[];await pc.setLocalDescription(await pc.createAnswer());await sig(m.from,{t:'sdp',d:pc.localDescription.toJSON()})}
  else{const pe=Net.peers.get(m.from);if(!pe||!pe.pc)return;await pe.pc.setRemoteDescription(m.d);for(const c of pe.iceQ)pe.pc.addIceCandidate(c).catch(()=>{});pe.iceQ=[]}}
function peerLost(pe){if(!Net.peers.has(pe.uid))return;Net.peers.delete(pe.uid);try{pe.pc&&pe.pc.close()}catch(e){}
  if(Net.role==='host'){if(pe.proxy){players=players.filter(p=>p!==pe.proxy);for(const e of enemies)if(e.target===pe.proxy){e.target=null;e.returning=true}toast(`${pe.name} left your world.`)}
    rescaleEnemies();if(!Net.peers.size)Net.role=null;renderParty()}
  else if(Net.role==='guest')leaveParty(`The connection to ${pe.name}'s world was lost.`)}

// ---- Messages
function netData(pe,m){if(Net.role!=='guest'&&m.t==='hello')return hostHello(pe,m);
  if(Net.role==='host'){const pr=pe.proxy;if(!pr)return;switch(m.t){
    case'st':pr.x=m.x;pr.y=m.y;pr.aim=m.a;pr.walk=m.w;pr.hp=m.hp;pr.maxHp=m.mh;pr.dead=!!m.dd;pr.castAnim=m.ca||0;pr.mounted=!!m.mt;pr.mount=m.mt||pr.mount;pr.away=m.z!==zone.id;break;
    case'cast':castRemote(pr,m.i,m.ax,m.ay);break;
    case'hero':{const k={x:pr.x,y:pr.y,hp:pr.hp};Object.assign(pr,{level:m.p.level,gear:m.p.gear,attr:m.p.attr,talents:m.p.talents,spec:m.p.spec,skills:m.p.skills,bagSize:m.p.bagSize,look:m.p.look});pr.abil=abilList(pr);calcStats(pr);Object.assign(pr,k);break}
    case'take':hostGiveLoot(pe,m.cid,m.did);break;
    case'chat':hostChat(pe,m);break;
    case'bye':peerLost(pe);break}return}
  if(Net.role==='guest'||Net.asking){switch(m.t){
    case'welcome':enterGuestWorld(pe,m);break;
    case'snap':applySnap(m);break;
    case'dmg':{const p=players[0];if(p&&!p.dead)dealDamage(p,m.d,null,{raw:1,slow:m.sl,slowF:m.sf,stun:m.st,knockFrom:m.kx!=null?{x:m.kx,y:m.ky}:null});break}
    case'heal':{const p=players[0];if(p&&!p.dead)heal(p,m.a);break}
    case'xp':if(players[0])gainXp(players[0],m.a);break;
    case'kill':guestKillCredit(m.k);break;
    case'got':guestGot(m.d);break;
    case'setpos':{const p=players[0];if(p){p.x=m.x;p.y=m.y}break}
    case'zone':Net.hostZone=m.id;netFollowZone(m.id,m.x,m.y);break;
    case'chat':onChat(String(m.fn||'?').slice(0,16),chatClean(m.m),!!m.w,m.f);break;
    case'bye':leaveParty(`${pe.name} left, so their world closed.`);break}}}
function hostHello(pe,m){if(!m.hero||Net.size()>=MAX_PARTY){netSend(pe,{t:'bye'});return}Net.role='host';const h=players[0];
  const pr=createPlayer(Object.assign({},m.hero.p,{x:h.x+rand(-40,40),y:h.y+rand(20,50)}));pr.isRemote=true;pr.uid=pe.uid;pr.id=pe.uid;pr.netName=pe.name;pr.x=h.x+rand(-40,40);pr.y=h.y+rand(20,50);
  pe.proxy=pr;players.push(pr);rescaleEnemies();Net.corpVer++;Net.apT=0;
  netSend(pe,{t:'welcome',seed:WSEED,q:quest.idx,zone:zone.id,x:pr.x,y:pr.y,host:Friends.me?Friends.me.name:h.name});toast(`${pe.name} joined your world!`,'gold');sfx('level');renderParty()}
function enterGuestWorld(pe,m){Net.role='guest';Net.asking=null;Net.host={uid:pe.uid,name:pe.name,seed:m.seed};Net.hostQ=m.q;Net.hostZone=m.zone;
  let data;if(Net.pendingHero.data)data=Net.pendingHero.data;else{const c=heroRecord(Net.pendingHero.id);data=c?c.data:{p:heroNetData().p}}
  const id=Net.pendingHero.id;Net.own={x:data.p.x,y:data.p.y,loc:data.p.loc,explored:data.p.explored};
  startGame(data,false,id);const p=players[0];if(m.zone!=='over')enterZone(m.zone,m.x,m.y);p.x=m.x;p.y=m.y;enemies=[];allies=[];
  toast(`You entered ${pe.name}'s world. Press Esc to leave the party.`,'gold');sfx('level');renderParty()}
function leaveParty(msg){const wasGuest=Net.role==='guest';netAll({t:'bye'});for(const pe of Net.peers.values()){try{pe.pc&&pe.pc.close()}catch(e){}}Net.peers.clear();
  Net.avatars.clear();if(msg)toast(msg,'danger');
  if(wasGuest&&state==='play'){save();const id=heroId,c=heroRecord(id);Net.role=null;Net.host=null;if(c)startGame(c.data,false,id);else openSelect()}
  else{players=players.filter(p=>!p.isRemote);Net.role=null}renderParty()}
addEventListener('beforeunload',()=>{if(Net.role)netAll({t:'bye'})});

// ---- Host: remote heroes cast on the host so the hits are real
function castRemote(p,i,ax,ay){const ab=p.abil[i];if(!ab||p.dead||p.away||p.level<UNLOCK[i])return;p.input.ax=ax;p.input.ay=ay;p.aim=Math.atan2(ay-p.y,ax-p.x);const x0=p.x,y0=p.y,base=p.stats.dmg;
  p.stats.dmg=base*(1+(p.tm['a'+i]||0))*skillMult(p,i);try{ab.cast(p,ax,ay)}finally{p.stats.dmg=base}p.castAnim=.3;castFx(p,i);sfx(ab.sfx||CASTSFX[p.cls][i]);
  if(Math.hypot(p.x-x0,p.y-y0)>4)netSend(Net.peers.get(p.uid),{t:'setpos',x:p.x,y:p.y})}
// More players, tougher monsters: +60% health and +12% damage per extra hero.
function partyMul(n){return{hp:1+.6*(n-1),dmg:1+.12*(n-1)}}
function rescaleEnemies(){const n=Net.size();for(const e of enemies){const o=partyMul(e.pn||1),m=partyMul(n);e.maxHp=Math.round(e.maxHp*m.hp/o.hp);e.hp=Math.min(e.maxHp,e.hp*m.hp/o.hp);e.dmg*=m.dmg/o.dmg;e.pn=n}}
function hostGiveLoot(pe,cid,did){const c=corpsesOf(zone).find(c=>c.id===cid);if(!c)return;const d=c.loot.find(d=>d.id===did);if(!d)return;
  c.loot.splice(c.loot.indexOf(d),1);Net.corpVer++;netSend(pe,{t:'got',d});if(lootOpen&&lootOpen.ids.includes(c.id))lootChanged()}
function hostZoneChanged(id,x,y){if(Net.role==='host')netAll({t:'zone',id,x,y})}

// ---- Guest: follow the host, take loot, get quest credit
function netFollowZone(id,x,y){if(zone.id!==id)enterZone(id,x,y);const p=players[0];if(p){p.x=x+rand(-30,30);p.y=y+rand(10,40)}enemies=[];allies=[];projs=[];areas=[]}
function guestKillCredit(type){if(quest.state!=='active')return;const q=QUESTS[quest.idx];if(q&&q.target.includes(type)){quest.prog++;if(quest.prog>=q.need){quest.state='ready';toast('Quest complete! Return to the Warden.','gold')}updateQuestUI()}}
function guestGot(d){Loot.pending.delete(d.id);const p=players[0];if(!p)return;if(d.kind==='gold'){p.gold+=d.amount;sfx('gold')}else if(d.kind==='sup')addSup(p,d.sup,d.amount||1);else if(d.kind==='mat')p.mats[d.mat]=(p.mats[d.mat]||0)+d.amount;
  else if(d.item){if(p.bag.length<p.bagSize){p.bag.push(d.item);sfx('loot',{rar:d.item.rar})}else toast(`Your bag is full: ${d.item.name} was lost`,'danger')}if(invOpen)renderInv()}
// Guests save their own world position, not where they stand in a friend's world.
function netSaveFix(d){if(Net.role==='guest'&&Net.own){d.p.x=Net.own.x;d.p.y=Net.own.y;d.p.loc=Net.own.loc;d.p.explored=Net.own.explored}return d}

// ---- The steady stream: host sends snapshots (12/s), guests send their hero (15/s)
function netTick(dt){if(!Net.role)return;const p=players[0];
  if(Net.role==='guest'){Net.stT-=dt;const pe=[...Net.peers.values()][0];
    if(pe&&Net.stT<=0&&p){Net.stT=ST_DT;netSend(pe,{t:'st',x:Math.round(p.x),y:Math.round(p.y),a:+p.aim.toFixed(2),w:+p.walk.toFixed(1),hp:Math.ceil(p.hp),mh:p.maxHp,dd:p.dead?1:0,ca:+(p.castAnim||0).toFixed(2),mt:p.mounted?p.mount:0,z:zone.id})}
    Net.heroT-=dt;if(pe&&Net.heroT<=0&&p){Net.heroT=2;const h=heroNetData(),s=JSON.stringify([h.p.level,h.p.gear,h.p.attr,h.p.talents,h.p.spec]);if(s!==Net.heroSig){Net.heroSig=s;netSend(pe,{t:'hero',p:h.p})}}
    guestLerp(dt);return}
  Net.snapT-=dt;if(Net.snapT>0)return;Net.snapT=SNAP_DT;Net.apT-=SNAP_DT;
  for(const pr of projs)if(!pr.sent){pr.sent=1;Net.ev.push({k:'p',x:Math.round(pr.x),y:Math.round(pr.y),vx:Math.round(pr.vx),vy:Math.round(pr.vy),c:pr.col,kd:pr.kind,r:pr.r,l:+pr.life.toFixed(2),s:pr.side,pi:pr.pierce||0,ex:pr.explode?pr.explode.r:0})}
  for(const a of areas)if(!a.sent){a.sent=1;Net.ev.push({k:'a',x:Math.round(a.x),y:Math.round(a.y),r:a.r,dl:+a.delay.toFixed(2),du:a.dur,kd:a.kind,s:a.side,an:a.a,ln:a.len,f:a.follow&&a.follow.nid})}
  const near=e=>{for(const q of players)if(!q.away&&Math.hypot(q.x-e.x,q.y-e.y)<1700)return true;return false};
  const en=enemies.filter(e=>!e.dead&&near(e)).map(e=>[e.nid,e.type,Math.round(e.x),Math.round(e.y),+(e.aim||0).toFixed(2),+(e.walk||0).toFixed(1),Math.ceil(e.hp),e.maxHp,e.lvl,(e.boss?1:0)|(e.target?2:0)|(e.enraged?4:0)|(e.stunUntil>time?8:0)|(e.slowUntil>time?16:0)|(e.cursedUntil>time?32:0),e.atkT?Math.min(9,+(time-e.atkT).toFixed(2)):9]);
  const al=allies.filter(a=>!a.dead).map(a=>[a.nid,a.kind,Math.round(a.x),Math.round(a.y),+(a.aim||0).toFixed(2),+(a.walk||0).toFixed(1),Math.ceil(a.hp),a.maxHp]);
  const ap=Net.apT<=0;if(ap)Net.apT=2;
  const pl=players.map(q=>({u:q.isRemote?q.uid:Account.user.id,n:q.isRemote?q.netName:(Friends.me?Friends.me.name:q.name),hn:q.name,x:Math.round(q.x),y:Math.round(q.y),a:+(q.aim||0).toFixed(2),w:+(q.walk||0).toFixed(1),hp:Math.ceil(q.hp),mh:q.maxHp,dd:q.dead?1:0,ca:+(q.castAnim||0).toFixed(2),mt:q.mounted?q.mount:0,z:q.away?'-':zone.id,lv:q.level,
    ap:ap?{cls:q.cls,look:q.look,gear:q.gear,bagSize:q.bagSize,spec:q.spec}:undefined}));
  const cv=Net.corpVer!==Net.sentCorp,cs=cv?corpsesOf(zone).map(c=>({id:c.id,x:Math.round(c.x),y:Math.round(c.y),u:{type:c.unit.type,name:c.unit.name,r:c.unit.r,h:c.unit.h,aim:c.unit.aim,boss:c.unit.boss},l:+(c.until-time).toFixed(1),lo:c.loot.map(d=>({id:d.id,kind:d.kind,amount:d.amount,mat:d.mat,sup:d.sup,item:d.item}))})):undefined;Net.sentCorp=Net.corpVer;
  const ev=Net.ev;Net.ev=[];
  for(const pe of Net.peers.values())if(pe.proxy)netSend(pe,{t:'snap',wc:+worldClock.toFixed(1),en,al,pl:pl.filter(x=>x.u!==pe.uid),ev,cs,q:quest.idx})}
function applySnap(m){Net.hostQ=m.q;if(m.wc!=null)worldClock=m.wc;const same=zone.id===Net.hostZone;
  // other heroes
  const seen=new Set();for(const s of m.pl){seen.add(s.u);let a=Net.avatars.get(s.u);if(!a){a={uid:s.u,isAvatar:true,x:s.x,y:s.y,walk:0,aim:0,look:{},gear:{},cls:'paladin',bagSize:20,r:13,h:52};Net.avatars.set(s.u,a)}
    Object.assign(a,{name:s.hn,netName:s.n,tx:s.x,ty:s.y,aim:s.a,walk:s.w,hp:s.hp,maxHp:s.mh,dead:!!s.dd,castAnim:s.ca,mounted:!!s.mt,mount:s.mt||a.mount,level:s.lv,away:s.z!==zone.id});if(s.ap)Object.assign(a,s.ap)}
  for(const k of[...Net.avatars.keys()])if(!seen.has(k))Net.avatars.delete(k);
  if(!same){enemies=[];allies=[];return}
  // monsters and minions
  const em=new Map(enemies.map(e=>[e.nid,e])),ne=[];
  for(const s of m.en){let e=em.get(s[0]);const b=ETYPES[s[1]];if(!e){e={side:'enemy',nid:s[0],type:s[1],name:b.name,r:b.r,h:b.h,x:s[2],y:s[3],walk:0,aim:0,hitFx:{}}}
    Object.assign(e,{tx:s[2],ty:s[3],aim:s[4],walk:s[5],hp:s[6],maxHp:s[7],lvl:s[8],boss:!!(s[9]&1),target:s[9]&2?true:null,enraged:!!(s[9]&4),stunUntil:s[9]&8?time+.2:0,slowUntil:s[9]&16?time+.2:0,cursedUntil:s[9]&32?time+.2:0,atkT:s[10]<9?time-s[10]:0});ne.push(e)}
  enemies=ne;const am=new Map(allies.map(a=>[a.nid,a])),na=[];
  for(const s of m.al){let a=am.get(s[0]);if(!a)a={side:'player',isAlly:true,nid:s[0],kind:s[1],x:s[2],y:s[3],r:s[1]==='wolf'?14:13,h:s[1]==='wolf'?30:48,walk:0,aim:0};Object.assign(a,{tx:s[2],ty:s[3],aim:s[4],walk:s[5],hp:s[6],maxHp:s[7]});na.push(a)}
  allies=na;
  // events: new spells, hits, deaths
  for(const v of m.ev){if(v.k==='p')projs.push({x:v.x,y:v.y,vx:v.vx,vy:v.vy,col:v.c,kind:v.kd,r:v.r,life:v.l,side:v.s,pierce:v.pi,explode:v.ex?{r:v.ex,dmg:0}:null,hit:new Set(),net:1});
    else if(v.k==='a'){const f=v.f!=null?enemies.find(e=>e.nid===v.f):null;areas.push(mkArea({x:v.x,y:v.y,r:v.r,delay:v.dl,dur:v.du,kind:v.kd,side:v.s,a:v.an,len:v.ln,follow:f}))}
    else if(v.k==='h'){const e=enemies.find(e=>e.nid===v.n);if(e){e.hitFlash=.12;floatText(e.x,e.y-(e.h||40)*.6,v.c?v.d+'!':''+v.d,v.c?'#ffd84a':'#fff',v.c?21:15);hitSpark(e,v.col||'#fff3d0',v.c);sfx('hit')}}
    else if(v.k==='m'){const e=enemies.find(e=>e.nid===v.n);if(e)floatText(e.x,e.y-(e.h||40)*.6,'Miss','#b8b8b8',13)}
    else if(v.k==='d'){bloodAt(v.x,v.y,true,v.ty);burst(v.x,v.y,v.b?'#cfe':'#a33',v.b?70:16,v.b?220:140);sfx(v.b?'bossdie':'die');if(v.b){shake=14;toast(v.n+' has fallen!','gold')}}
    else if(v.k==='t')toast(v.s,v.c||'')}
  // corpses (loot is taken through the host so nobody gets the same item twice)
  if(m.cs){const z=zone;z.corpses=m.cs.map(c=>({id:c.id,x:c.x,y:c.y,unit:c.u,until:time+c.l,boss:c.u.boss,loot:c.lo}));{const live=new Set();for(const c of z.corpses)for(const d of c.loot)live.add(d.id);for(const id of[...Loot.pending.keys()])if(!live.has(id))Loot.pending.delete(id)}if(lootOpen)lootChanged()}}
function guestLerp(dt){const k=Math.min(1,dt*12);for(const list of[enemies,allies,Net.avatars.values()])for(const u of list){if(u.tx==null)continue;if(Math.hypot(u.tx-u.x,u.ty-u.y)>300){u.x=u.tx;u.y=u.ty}else{u.x+=(u.tx-u.x)*k;u.y+=(u.ty-u.y)*k}}}

// ---- Party frames: everyone in the world, their health, and teleport (also used when you die)
function partyMembers(){if(Net.role==='host')return players.filter(p=>p.isRemote).map(p=>({uid:p.uid,name:p.netName,hero:p.name,level:p.level,cls:p.cls,look:p.look,gear:p.gear,hp:p.hp,maxHp:p.maxHp,dead:p.dead,away:p.away,x:p.x,y:p.y}));
  if(Net.role==='guest')return[...Net.avatars.values()].map(a=>({uid:a.uid,name:a.netName,hero:a.name,level:a.level,cls:a.cls,look:a.look,gear:a.gear,hp:a.hp,maxHp:a.maxHp,dead:a.dead,away:a.away,x:a.tx,y:a.ty}));return[]}
function teleportTo(uid,free){const m=partyMembers().find(q=>q.uid===uid),p=players[0];if(!m||!p)return;if(m.away||m.dead){toast(`You cannot reach ${m.name} right now.`,'danger');return}
  if(!free){if(Net.tpCd>time){toast(`Teleport is ready in ${Math.ceil(Net.tpCd-time)} s.`);return}if(time-p.lastHurt<4){toast('You cannot teleport while fighting.','danger');return}Net.tpCd=time+TP_CD}
  if(p.mounted)dismount(p,true);burst(p.x,p.y,'#9fd8ff',24,160);p.x=m.x+rand(-40,40);p.y=m.y+rand(20,50);sfx('blink');burst(p.x,p.y,'#9fd8ff',30,180);fx.push({k:'pillar',x:p.x,y:p.y,life:.8,max:.8,col:'#9fd8ff'})}
let partyT=0;
function renderParty(){const el=$('party');if(!el)return;const ms=partyMembers();$('chatBtn').classList.toggle('hidden',!Net.role);el.classList.toggle('hidden',!ms.length);el.innerHTML=ms.map(m=>`<div class="pm${m.dead?' dead':''}" style="--f:${Math.max(0,Math.min(100,m.hp/(m.maxHp||1)*100))}"><span class="pmp"></span><div class="pmb"><div class="pmn"><span>${CLASSES[m.cls]?CLASSES[m.cls].icon:''} ${escapeHtml(m.name||m.hero||'')}</span><small>Lv ${m.level||'?'}${m.away?' · inside':''}</small>`+
  `<button title="Teleport to ${escapeHtml(m.name||'')} (every ${TP_CD} s, not in combat)" data-tp="${m.uid}">⇢</button></div><div class="bar hp"><i style="width:${Math.max(0,m.hp/(m.maxHp||1)*100)}%"></i></div></div></div>`).join('');
  el.querySelectorAll('.pmp').forEach((e,i)=>e.replaceWith(portraitEl(ms[i],isPhone()?32:40)));
  for(const b of el.querySelectorAll('[data-tp]'))b.onclick=()=>teleportTo(b.dataset.tp);
  if(Layout.phone)el.querySelectorAll('.pm').forEach((e,i)=>e.onclick=()=>{const m=ms[i];uiSheet(m.name||m.hero||'',[{icon:'⇢',label:'Teleport to '+(m.name||m.hero||''),onTap:()=>teleportTo(m.uid)},{icon:'💬',label:'Whisper',onTap:()=>openChat(m.uid,m.name||m.hero)},{icon:'🚪',label:'Leave party',onTap:()=>leaveParty()}])})}// phone: the portrait stack has no buttons, so a tap opens them

// ---- Dying with friends around: return to town, or rise beside a living friend.
function showDeathChoices(p){const el=$('deathBtns'),sub=$('death').querySelector('.sub');el.innerHTML='';const alive=partyMembers().filter(m=>!m.dead&&!m.away);
  if(!alive.length){sub.textContent='Returning to '+homeCity(p).name+'…';return}p.deathT=25;sub.textContent='Choose where to rise.';
  const b=(t,fn)=>{const x=document.createElement('button');x.className='btn';x.textContent=t;x.onclick=fn;el.appendChild(x)},home=()=>{if(p.dead)respawn(p)};
  if(Layout.phone){const pick=()=>uiSheet('Choose where to rise',[{icon:'🏠',label:'Return to '+homeCity(p).name,onTap:home},...alive.map(m=>({icon:'⇢',label:'Rise beside '+(m.name||m.hero),onTap:()=>riseBeside(p,m.uid)}))]);b('Choose where to rise…',pick);pick();return}
  b('Return to '+homeCity(p).name,home);for(const m of alive)b('Rise beside '+(m.name||m.hero),()=>riseBeside(p,m.uid))}
function riseBeside(p,uid){if(!p.dead)return;const m=partyMembers().find(q=>q.uid===uid);respawn(p);if(!m)return;if(Net.role==='guest'&&zone.id!==Net.hostZone)enterZone(Net.hostZone,m.x,m.y);teleportTo(uid,true)}

// ---- Quick chat. Free text from other players is untrusted: it is cleaned on send AND on receive, and only ever
// shown with textContent (log) or fillText (bubbles), never innerHTML. The host relays; guests talk only to the host.
const CHAT_LINES=['Help!','Follow me','Wait','Loot here','Ready','Thanks','On my way','Heading back to town'];
const Chat={log:[],bub:new Map(),sheet:null};// log: {f,m,w,t}; bub: sender uid -> {m,until}
function chatClean(s){return String(s==null?'':s).replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,120).trim()}
function myUid(){return Account.user?Account.user.id:'me'}
function myName(){return Friends.me?Friends.me.name:players[0]?players[0].name:'Me'}
function renderChatLog(){const el=$('chatLog');if(!el)return;el.textContent='';const now=Date.now();
  for(const l of Chat.log.slice(-3)){if(now-l.t>14000)continue;const d=document.createElement('div'),b=document.createElement('b');if(l.w)d.className='w';b.textContent=(l.w?'['+l.w+'] ':'')+l.f+': ';d.append(b,document.createTextNode(l.m));el.appendChild(d)}}
// whisper: false, or true ('whisper' you received), or the label for one you sent ('to Name')
function onChat(from,m,whisper,uid){m=chatClean(m);if(!m)return;from=chatClean(from).slice(0,16)||'?';
  Chat.log.push({f:from,m,w:whisper?(typeof whisper==='string'?whisper:'whisper'):'',t:Date.now()});if(Chat.log.length>50)Chat.log.shift();renderChatLog();setTimeout(renderChatLog,14100);
  if(uid!=null)Chat.bub.set(uid,{m,until:rt+4})}
// Sends a line to everyone, or only to one player (to = their uid). Returns false if there is nobody to hear it.
function sendChat(text,to){const m=chatClean(text);if(!m||!Net.role)return false;
  if(Net.role==='host'){const out={t:'chat',m,f:myUid(),fn:myName()};if(to){const pe=Net.peers.get(to);if(!pe)return false;out.w=1;netSend(pe,out)}else netAll(out)}
  else{const pe=[...Net.peers.values()][0];if(!pe)return false;netSend(pe,{t:'chat',m,w:to||undefined})}
  const tn=to&&(partyMembers().find(q=>q.uid===to)||{}).name;onChat(myName(),m,to?'to '+(tn||'?'):false,myUid());return true}
// Host: a guest spoke. Say it here, and pass it on (a whisper only to the named uid; never back to the sender).
function hostChat(pe,m){const now=Date.now();if(now-(pe.chatT||0)<350)return;pe.chatT=now;const t=chatClean(m.m);if(!t)return;
  const out={t:'chat',m:t,f:pe.uid,fn:pe.name};
  if(typeof m.w==='string'&&m.w){if(m.w===myUid())onChat(pe.name,t,true,pe.uid);else{const to=Net.peers.get(m.w);if(to&&to!==pe){out.w=1;netSend(to,out)}}return}
  onChat(pe.name,t,false,pe.uid);for(const q of Net.peers.values())if(q!==pe)netSend(q,out)}
// The chat UI: a bottom sheet (preset lines + text box) from the chat button or a party portrait; on desktop Enter opens a small bar.
function openChat(to,toName){if(!Net.role){toast('Chat works when you are playing with friends.');return}if(Chat.sheet&&!Chat.sheet.closed)Chat.sheet.close();
  const go=t=>{if(!sendChat(t,to))toast('Nobody to hear that right now.','danger')},
    s=uiSheet(to?'Whisper to '+(toName||'?'):'Chat',CHAT_LINES.map(l=>({label:l,onTap:()=>go(l)}))),row=uiEl('div','chatin'),inp=document.createElement('input'),b=uiEl('button','g-btn','Send');
  inp.maxLength=120;inp.autocomplete='off';inp.spellcheck=false;inp.placeholder=to?'Whisper…':'Say something…';
  const send=()=>{const t=chatClean(inp.value);if(t){s.close();go(t)}};b.onclick=send;inp.onkeydown=e=>{e.stopPropagation();if(e.code==='Enter')send()};
  row.append(inp,b);s.el.classList.add('chatsheet');s.el.insertBefore(row,s.el.children[1]);Chat.sheet=s;if(!Layout.phone)setTimeout(()=>inp.focus(),30)}
function openChatBar(){if(!Net.role)return;const bar=$('chatBar'),inp=$('chatIn');for(const k in keys)keys[k]=false;bar.classList.remove('hidden');inp.value='';inp.focus()}
function closeChatBar(){$('chatBar').classList.add('hidden');$('chatIn').blur()}
$('chatIn').onkeydown=e=>{e.stopPropagation();if(e.code==='Enter'){const t=chatClean($('chatIn').value);closeChatBar();if(t)sendChat(t)}else if(e.code==='Escape')closeChatBar()};
$('chatIn').onblur=()=>$('chatBar').classList.add('hidden');
$('chatBtn').onclick=()=>openChat();
