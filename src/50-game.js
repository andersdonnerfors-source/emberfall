// ================= Helpers =================
function friendlies(){const r=[];for(const p of players)if(!p.dead&&!p.away)r.push(p);for(const a of allies)if(!a.dead)r.push(a);return r}
function inRadius(list,x,y,r){return list.filter(e=>!e.dead&&Math.hypot(e.x-x,e.y-y)<=r+e.r)}
function wrapA(a){while(a>Math.PI)a-=TAU;while(a<-Math.PI)a+=TAU;return a}
function mkArea(o){return Object.assign({t:0,delay:0,dur:0,tick:0,nt:0,tickDmg:0},o,{delay0:o.delay||0})}
function fireProj(o){projs.push(Object.assign({life:1.5,r:6,hit:new Set(),pierce:0},o))}
function burst(x,y,col,n,spd){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.2,1)*spd;parts.push({x,y,z:rand(5,25),vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:rand(20,140),life:rand(.4,.9),max:.9,col,size:rand(1.5,3.5)})}}
function floatText(x,y,txt,col,size){texts.push({x:x+rand(-8,8),y,z:44,txt,col,size:size||15,life:1})}
function toast(msg,cls){const d=document.createElement('div');d.className='toast '+(cls||'');d.textContent=msg;const tc=$('toasts');tc.appendChild(d);while(tc.children.length>4)tc.firstChild.remove();setTimeout(()=>d.remove(),3500)}
function swing(u,a,col,r){fx.push({k:'swing',x:u.x,y:u.y,a,life:.18,max:.18,col,r:r||60})}
function heal(t,amt,silent){if(t.isRemote){if(!t.away&&!t.dead)netSend(Net.peers.get(t.uid),{t:'heal',a:Math.round(amt)});return}const b=t.hp;t.hp=Math.min(t.maxHp,t.hp+amt);const g=Math.round(t.hp-b);if(g>=1&&!silent)floatText(t.x,t.y,'+'+g,'#7dff7a',14)}
function melee(p,a,range,arc,dmg,o){for(const e of enemies){if(e.dead)continue;const d=dist(p,e);if(d>range+e.r)continue;if(Math.abs(wrapA(Math.atan2(e.y-p.y,e.x-p.x)-a))>arc/2&&d>e.r+p.r)continue;dealDamage(e,dmg,p,o);if(o.knock&&!e.boss)moveEnt(e,Math.cos(a)*o.knock,Math.sin(a)*o.knock)}}
function explosion(x,y,r,dmg,src,side){sfx('boom');const list=side==='player'?enemies:friendlies();for(const t of inRadius(list,x,y,r))dealDamage(t,dmg,src,{});burst(x,y,'#ffae4a',24,260);boomFx(x,y,r,'#ff9a3a');shake=Math.max(shake,7)}
function summon(p,kind,x,y,dur,temp){const w=kind==='wolf';sfx('summon');const a={side:'player',isAlly:true,kind,owner:p,temp:!!temp,x,y,r:w?14:13,maxHp:Math.round(p.maxHp*(w?.6:.4)*(p.petMult||1)),dmg:p.stats.dmg*(w?.75:.55)*(p.petMult||1),speed:w?205:150,range:26,atkCd:w?.8:1,cd:0,until:time+dur,walk:0,aim:0,h:w?30:48};a.hp=a.maxHp;a.nid=++Net.nid;allies.push(a);burst(x,y,w?'#cfd8e0':'#9fffaa',20,100);return a}
function xpNeed(l){return Math.round(70*Math.pow(l,1.7))}

// ================= Items =================
function starterWeapon(cls){return{id:'start',name:'Old '+WEAPONS[cls][0][1],slot:'weapon',rar:0,lvl:1,stats:{[MAIN_STAT[cls]]:3},wt:WEAPONS[cls][0][0]}}
function starterOffhand(cls){return cls==='paladin'?{id:'start2',name:'Old Heater Shield',slot:'offhand',rar:0,lvl:1,stats:{armor:4}}:null}

// ================= Player =================
// Order of power: level and talents first, then gear, then profession additions, then timed buffs.
// Main stat (+0.7% damage per point), Stamina (+3 health), Intellect (+2 mana, mana regen), Agility (faster basic attacks).
function calcStats(p){const c=CLASSES[p.cls],L=p.level-1,A=p.attr,ms=mainStat(p);
  const st={str:0,agi:0,int:0,sta:0,hit:0,crit:0,hp:0,mana:0,armor:0,dmgPct:0,cdr:0,speed:0,healPct:0,petPct:0,leech:0};
  const add=o=>{for(const k in o)st[k]=(st[k]||0)+o[k]};
  for(const k of['str','agi','int','sta'])st[k]+=(A[k]||0)*ATTR_PT;
  for(const sl of SLOTS){const it=p.gear[sl];if(it)add(itemStats(it))}
  for(const k in p.buffs||{})add(p.buffs[k].stats);
  const s={maxHp:c.hp*(1+L*.09)+st.sta*3+st.hp,maxMana:c.mana+L*5+st.int*2+st.mana,armor:c.armor+L*1.5+st.armor,
    dmg:c.dmg*(1+L*.05)*(1+st[ms]*.007)*(1+st.dmgPct/100),crit:.05+st.crit/100,hit:st.hit/100,haste:Math.min(.35,st.agi*.002),
    cdr:st.cdr/100,speed:c.speed*(1+st.speed/100),mregen:5+L*.4+st.int*.04,main:ms,attrs:st};
  const tm=p.tm=talentMods(p);s.dmg*=1+(tm.dmg||0);s.maxHp*=1+(tm.hpPct||0);s.armor*=1+(tm.armorPct||0);s.crit+=tm.crit||0;s.speed*=1+(tm.speed||0);s.mregen*=1+(tm.mregen||0);s.cdr+=tm.cdr||0;
  p.petMult=1+(tm.pet||0)+st.petPct/100;p.healMult=(1+(tm.heal||0)+st.healPct/100)*(1+skillOf(p,'spell')/300);tm.leech=(tm.leech||0)+st.leech/100;
  s.cdr=Math.min(.4,s.cdr);s.crit=Math.min(.6,s.crit);s.maxHp=Math.round(s.maxHp);s.maxMana=Math.round(s.maxMana);s.armor=Math.round(s.armor);
  p.stats=s;p.maxHp=s.maxHp;p.maxMana=s.maxMana;if(p.hp>p.maxHp)p.hp=p.maxHp;if(p.mana>p.maxMana)p.mana=p.maxMana}
function createPlayer(d){if((d.ws||200)!==OW){const f=OW/(d.ws||200);if(d.x)d.x*=f;if(d.y)d.y*=f;if(d.explored)delete d.explored.over;d.ws=OW}
  const p={isPlayer:true,side:'player',name:d.name,cls:d.cls,look:d.look,level:d.level||1,xp:d.xp||0,gold:d.gold||0,
  gear:Object.assign({weapon:starterWeapon(d.cls),offhand:starterOffhand(d.cls)},d.gear||{}),bag:d.bag||[],attr:d.attr||{},points:d.points||0,talents:d.talents||{},tpoints:d.tpoints||0,spec:d.spec||null,shop:d.shop||null,skills:d.skills||{},prof:d.prof||{},mats:Object.assign({hide:0,silk:0,ore:0,dust:0,essence:0},d.mats||{}),mounts:d.mounts||[],mount:d.mount||null,light:d.light||0,bagSize:d.bagSize||20,lootBonus:d.lootBonus||0,bagName:d.bagName||null,home:d.home||'emberfall',explored:d.explored||{},kills:d.kills||0,deaths:d.deaths||0,playT:d.playT||0,
  sup:d.sup||{hp1:3},buffs:d.buffs||{},seed:d.seed||0,
  x:d.x||(VC.x+.5)*TILE,y:d.y||(VC.y+2.5)*TILE,r:13,walk:0,aim:0,cds:[0,0,0,0,0,0],cdMax:[1,1,1,1,1,1],potCd:0,lastHurt:-99,h:52,
  input:{mx:0,my:0,ax:0,ay:0,fire:false,abil:[false,false,false,false,false,false]}};
  // Old saves: a single potion count becomes healing potions of your level's tier.
  if(!d.sup&&d.potions)p.sup={['hp'+potTier(p.level)]:d.potions};
  migrateAttr(p);p.abil=abilList(p);
  calcStats(p);p.hp=p.maxHp;p.mana=p.maxMana;if(!free(p.x,p.y,p.r)){p.x=(VC.x+.5)*TILE;p.y=(VC.y+2.5)*TILE}return p}
function gainXp(p,x){if(p.level>=20)return;p.xp+=x;while(p.level<20&&p.xp>=xpNeed(p.level)){p.xp-=xpNeed(p.level);p.level++;p.points+=2;p.tpoints++;calcStats(p);p.hp=p.maxHp;p.mana=p.maxMana;
  burst(p.x,p.y,'#ffd86a',40,220);sparks(p.x,p.y,20,'#ffd86a',40,200,1);fx.push({k:'pillar',x:p.x,y:p.y,life:1.4,max:1.4,col:'#ffd86a'});floatText(p.x,p.y-20,'LEVEL UP!','#ffd86a',24);
  sfx('level');const un=UNLOCK.indexOf(p.level);
  if(p.level===SPEC_LEVEL&&!p.spec){toast('Level 10! Choose your specialization (T)','gold');setTimeout(()=>{if(state==='play'&&!isPaused())toggleTal(true)},900)}
  else toast(`Level ${p.level}! +2 attribute points (I) · +1 talent point (T)`+(un>0&&un<5?` · New ability: ${p.abil[un].name}`:''),'gold');buildAbar(p);save()}}
function chooseSpec(p,key){p.spec=key;p.abil=abilList(p);calcStats(p);buildAbar(p);sfx('spec');burst(p.x,p.y,'#ffd86a',70,240);toast(`You are now ${TAL[p.cls].specs[key].name}! New ability: ${p.abil[5].name} (R)`,'gold');save()}
function useAbility(p,i){const ab=p.abil[i];if(p.level<UNLOCK[i])return;if(p.cds[i]>0||p.stunUntil>time)return;const cost=abilCost(p,i);
  if(p.mana<cost){if(i>0&&rt>noManaT){noManaT=rt+1;floatText(p.x,p.y-30,'Not enough mana','#8fb8ff',13)}return}
  if(p.mounted||p.mountCast>0)dismount(p,true);
  if(Net.role==='guest'){netSend([...Net.peers.values()][0],{t:'cast',i,ax:Math.round(p.input.ax),ay:Math.round(p.input.ay)});p.mana-=cost;p.cds[i]=p.cdMax[i]=abilCd(p,i);p.castAnim=.3;castFx(p,i);if(i===0)trainSkill(p,wtypeOf(p),.12);else trainSkill(p,'spell',.25);sfx(ab.sfx||CASTSFX[p.cls][i]);return}
  const base=p.stats.dmg;p.stats.dmg=base*(1+(p.tm['a'+i]||0))*skillMult(p,i);const r=ab.cast(p,p.input.ax,p.input.ay);p.stats.dmg=base;
  if(r===false)return;p.mana-=cost;p.cds[i]=p.cdMax[i]=abilCd(p,i);p.castAnim=.3;castFx(p,i);if(i===0)trainSkill(p,wtypeOf(p),.12);else trainSkill(p,'spell',.25);sfx(ab.sfx||CASTSFX[p.cls][i])}
const CASTSFX={paladin:['swing','bash','holy','holy','shieldup'],sorcerer:['fire','frost','blink','fire','meteor'],hunter:['arrow','arrow','trap','howl','arrow'],necromancer:['shadow','summon','drain','curse','bone']};
function updatePlayer(p,dt){p.playT=(p.playT||0)+dt;
  if(p.dead){p.deathT-=dt;if(p.deathT<=0)respawn(p);return}
  const i=p.input;let mx=i.mx,my=i.my;const l=Math.hypot(mx,my);if(l>0){mx/=l;my/=l}
  updateMount(p,dt,l>0);updateHearth(p,dt,l>0);const spd=p.stats.speed*(p.slowUntil>time?p.slowF:1)*(tileAt(p.x,p.y)===T.BOG&&!p.fly?.65:1)*(p.mounted?1+MOUNTS[p.mount].speed:1);
  if(!(p.stunUntil>time)&&l>0){moveEnt(p,mx*spd*dt,my*spd*dt);p.walk+=dt*12}
  const bNow=biomeAtW(p.x,p.y)+(isDeep(p.x/TILE,p.y/TILE,biomeAtW(p.x,p.y))?10:0);if(zone.kind==='over'&&p.id===0&&bNow!==p.biome&&rt>(p.bT||0)){if(p.biome!==undefined){const zr=zoneRange(p.x/TILE,p.y/TILE,bNow%10);toast((isDeep(p.x/TILE,p.y/TILE,bNow%10)?'The Deep Wilds of '+BIOME_NAME[bNow%10].replace(/^The /,''):BIOME_NAME[bNow%10])+' · Levels '+zr[0]+'–'+zr[1]+(zr[0]>p.level+2?' · Dangerous!':''),zr[0]>p.level+2?'danger':'')}p.biome=bNow;p.bT=rt+5}
  p.aim=Math.atan2(i.ay-p.y,i.ax-p.x);
  for(let k=0;k<6;k++)p.cds[k]=Math.max(0,p.cds[k]-dt);p.potCd=Math.max(0,p.potCd-dt);updateSupplies(p,dt);gearFx(p,dt);p.castAnim=Math.max(0,(p.castAnim||0)-dt);
  p.mana=Math.min(p.maxMana,p.mana+p.stats.mregen*dt);
  if(time-p.lastHurt>5&&p.hp<p.maxHp)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*.03*dt);
  if(i.fire)useAbility(p,0);for(let k=1;k<6;k++)if(i.abil[k])useAbility(p,k);i.abil.fill(false)}
function respawn(p){$('deathBtns').innerHTML='';p.dead=false;p.hp=p.maxHp;p.mana=p.maxMana;const hs=homeSpot(p);if(zone.id!=='over')enterZone('over',hs.x,hs.y);p.x=hs.x;p.y=hs.y;p.gold=Math.floor(p.gold*.9);p.invulnUntil=time+2;$('death').classList.add('hidden');for(const e of enemies)if(e.target===p){e.target=null;e.returning=true}}

// ================= Enemies =================
function spawnEnemy(type,x,y,lvl,extra){const b=ETYPES[type],m=1+.45*(lvl-1),dm=1+.3*(lvl-1);
  const e=Object.assign({side:'enemy',type,name:b.name,x,y,hx:x,hy:y,r:b.r,h:b.h,lvl,maxHp:Math.round(b.hp*m),dmg:b.dmg*dm,speed:b.speed,range:b.range,atkCd:b.atkCd,cd:rand(.3,1),
    xp:Math.round(b.xp*(1+.35*(lvl-1))),ranged:!!b.ranged,windupT:b.windup||0,boss:!!b.boss,hitFx:b.hitFx||{},aggroR:b.boss?440:320,walk:0,aim:0,wander:0,wdx:0,wdy:0,pat:2,lastSummon:-99},extra||{});
  e.nid=++Net.nid;e.pn=Net.size();if(e.pn>1){const m=partyMul(e.pn);e.maxHp=Math.round(e.maxHp*m.hp);e.dmg*=m.dmg}
  e.hp=e.maxHp;enemies.push(e);return e}
function updateEnemy(e,dt){
  e.cd-=dt;if(e.charge){doCharge(e,dt);return}
  if(e.stunUntil>time||e.busyUntil>time)return;
  let sp=e.speed*(e.slowUntil>time?e.slowF:1);if(e.enraged)sp*=1.35;
  if(e.target&&(e.target.dead||dist(e,e.target)>950||Math.hypot(e.x-e.hx,e.y-e.hy)>1300)){e.target=null;e.returning=true}
  if(!e.target&&!e.returning)senseTargets(e,dt);
  if(e.returning){const d=Math.hypot(e.x-e.hx,e.y-e.hy);if(d<30){e.returning=false;e.hp=e.boss?Math.min(e.maxHp,e.hp+(e.maxHp-e.hp)*.5):e.maxHp;e.enraged=false}else{navMove(e,e.hx,e.hy,sp*dt*1.3);e.walk+=dt*10;e.aim=Math.atan2(e.hy-e.y,e.hx-e.x)}return}
  const t=e.target;
  if(!t){e.wander-=dt;if(e.wander<=0){e.wander=rand(2,5);const a=rand(0,TAU),go=Math.random()<.6;e.wdx=go?Math.cos(a):0;e.wdy=go?Math.sin(a):0;if(Math.hypot(e.x-e.hx,e.y-e.hy)>250){const b=Math.atan2(e.hy-e.y,e.hx-e.x);e.wdx=Math.cos(b);e.wdy=Math.sin(b)}}
    if(e.wdx||e.wdy){moveEnt(e,e.wdx*sp*.35*dt,e.wdy*sp*.35*dt);e.walk+=dt*6;e.aim=Math.atan2(e.wdy,e.wdx)}return}
  const d=dist(e,t);e.aim=Math.atan2(t.y-e.y,t.x-e.x);
  if(e.boss&&bossAI(e,t,dt))return;
  if(e.ranged){const los=lineClear(e.x,e.y,t.x,t.y,PBLOCK);
    if(d<170&&los){moveToward(e,e.x-(t.x-e.x),e.y-(t.y-e.y),sp*dt);e.walk+=dt*10}else if(d>e.range*.85||!los){navMove(e,t.x,t.y,sp*dt);e.walk+=dt*10}
    if(d<=e.range&&e.cd<=0&&los){e.cd=e.atkCd;e.atkT=time;sfx('enemyshot');fireProj({side:'enemy',src:e,x:e.x,y:e.y,vx:Math.cos(e.aim)*340,vy:Math.sin(e.aim)*340,dmg:e.dmg,col:ETYPES[e.type].shot||'#c9b6ff',kind:ETYPES[e.type].shot?'orb':'arrow',life:1.6,r:5})}
  }else{
    if(d>e.r+t.r+e.range*.6){navMove(e,t.x,t.y,sp*dt);e.walk+=dt*(e.type==='wolf'||e.type==='greyfang'?14:10)}
    if(d<=e.r+t.r+e.range&&e.cd<=0){e.cd=e.atkCd/(e.enraged?1.3:1);e.atkT=time;
      if(e.windupT){e.busyUntil=time+e.windupT;areas.push(mkArea({x:t.x,y:t.y,r:e.boss?90:65,delay:e.windupT,side:'enemy',src:e,burst:{dmg:e.dmg},kind:'tele'}))}
      else{dealDamage(t,e.dmg,e,e.hitFx);swing(e,e.aim,'#fff',e.r+e.range)}}
  }}
function doCharge(e,dt){const c=e.charge;if(c.wind>0){c.wind-=dt;return}c.t-=dt;const step=620*dt;moveEnt(e,Math.cos(c.a)*step,Math.sin(c.a)*step);e.walk+=dt*20;
  if(Math.random()<.6)parts.push({x:e.x,y:e.y,z:4,vx:rand(-30,30),vy:rand(-30,30),vz:rand(10,40),life:.4,max:.4,col:'#9a8a6a',size:3});
  for(const t of friendlies())if(!c.hit.has(t)&&dist(e,t)<e.r+t.r+6){c.hit.add(t);dealDamage(t,e.dmg*1.6,e,{knockFrom:e})}
  if(c.t<=0)e.charge=null}
function bossSummon(e,type,n,lvl){for(let i=0;i<n;i++){const a=rand(0,TAU),x=e.x+Math.cos(a)*90,y=e.y+Math.sin(a)*90;if(free(x,y,14)){const m=spawnEnemy(type,x,y,lvl,{persist:true});m.target=e.target;burst(x,y,'#9ab',14,80)}}}
function bossAI(e,t,dt){e.pat-=dt;const hpf=e.hp/e.maxHp;if(e.pat>0)return false;const r=Math.random();
  switch(e.type){
    case'greyfang':
      if(hpf<.5&&time-e.lastSummon>16){e.lastSummon=time;bossSummon(e,'wolf',3,Math.max(1,e.lvl-1));toast('Old Greyfang howls for his pack!');e.pat=2.5;return true}
      if(r<.6){const a=e.aim;e.charge={a,wind:.65,t:.5,hit:new Set()};areas.push(mkArea({x:e.x,y:e.y,r:0,delay:.65,kind:'line',a,len:330,side:'enemy',src:e}));e.pat=2.6;return true}
      e.pat=1.5;return false;
    case'skarg':
      if(hpf<.6&&time-e.lastSummon>15){e.lastSummon=time;bossSummon(e,'goblin',3,e.lvl-1);toast('Skarg bellows: "To me, maggots!"');e.pat=2;return true}
      if(r<.45){e.busyUntil=time+.8;areas.push(mkArea({x:e.x,y:e.y,r:110,delay:.8,follow:e,side:'enemy',src:e,burst:{dmg:e.dmg*1.4},kind:'tele',onBurst:a=>{fx.push({k:'ring',x:a.x,y:a.y,r:110,life:.3,max:.3,col:'#e0e0d0'});swing(e,0,'#fff',110)}}));e.pat=2.8;return true}
      if(r<.8){for(let i=-2;i<=2;i++){const b=e.aim+i*.22;fireProj({side:'enemy',src:e,x:e.x,y:e.y,vx:Math.cos(b)*300,vy:Math.sin(b)*300,dmg:e.dmg*.7,col:'#d8d0c0',kind:'axe',life:1.8,r:8})}e.pat=2.4;return true}
      e.pat=1.4;return false;
    case'mossback':
      if(hpf<.3&&!e.enraged){e.enraged=true;toast('Mossback roars in fury!');shake=10}
      if(r<.5){for(let k=0;k<(e.enraged?3:2);k++){const x=t.x+rand(-60,60)*k,y=t.y+rand(-60,60)*k;areas.push(mkArea({x,y,r:80,delay:1.1+k*.25,side:'enemy',src:e,burst:{dmg:e.dmg*1.1,stun:.6},kind:'boulder',onBurst:a=>{shake=8;sfx('slam');burst(a.x,a.y,'#8a7a5a',30,200)}}))}e.busyUntil=time+.5;e.pat=e.enraged?2:3;return true}
      e.pat=1.2;return false;
    case'barrowking':
      if(hpf<.6&&time-e.lastSummon>18){e.lastSummon=time;bossSummon(e,'wight',2,e.lvl-3);toast('The Barrow King calls the dead to rise!');e.pat=2.5;return true}
      if(r<.45){e.busyUntil=time+.9;areas.push(mkArea({x:t.x,y:t.y,r:115,delay:.9,side:'enemy',src:e,burst:{dmg:e.dmg*1.5},kind:'tele'}));e.pat=2.6;return true}
      if(r<.85){const n=hpf<.5?20:14;for(let k=0;k<n;k++){const b=k/n*TAU+rt;fireProj({side:'enemy',src:e,x:e.x,y:e.y,vx:Math.cos(b)*230,vy:Math.sin(b)*230,dmg:e.dmg*.6,col:'#9fe8ff',kind:'orb',life:2.6,r:7})}e.pat=2.4;return true}
      e.pat=1.4;return false;
    default:return genericBoss(e,t,hpf)}
  return false}
function updateAlly(a,dt){if(time>a.until||a.hp<=0||a.owner.dead){a.dead=true;burst(a.x,a.y,'#ccc',12,80);return}
  if(a.stunUntil>time)return;const o=a.owner;let tgt=null,bd=1e9;for(const e of enemies){if(e.dead)continue;const d=dist(e,a);if(d<bd&&dist(e,o)<440){bd=d;tgt=e}}a.cd-=dt;
  if(tgt){a.aim=Math.atan2(tgt.y-a.y,tgt.x-a.x);if(bd>a.r+tgt.r+a.range-6){navMove(a,tgt.x,tgt.y,a.speed*dt);a.walk+=dt*12}else if(a.cd<=0){a.cd=a.atkCd;a.atkT=time;dealDamage(tgt,a.dmg,a,{});swing(a,a.aim,'#ddd',40)}}
  else{const d=dist(a,o);if(d>80){navMove(a,o.x,o.y,a.speed*dt*(d>300?1.6:1));a.walk+=dt*12;a.aim=Math.atan2(o.y-a.y,o.x-a.x)}if(d>900){a.x=o.x+rand(-30,30);a.y=o.y+rand(-30,30)}}}

// ================= Combat =================
function dealDamage(t,amt,src,o){o=o||{};if(t.dead)return;if(t.invulnUntil>time){if(rt>(t.immT||0)){t.immT=rt+.4;floatText(t.x,t.y-20,'Immune','#ffe9a0',13)}return}
  if(Net.role==='guest'&&!o.raw)return;// guests only show spells; the host decides what hits
  if(t.isRemote){if(t.away)return;let d=amt*(t.cursedUntil>time?1.4:1)*100/(100+t.stats.armor);d=Math.max(1,Math.round(d));t.hp=Math.max(1,t.hp-d);t.hitFlash=.12;floatText(t.x,t.y-30,''+d,'#ff6a5a',15);
    netSend(Net.peers.get(t.uid),{t:'dmg',d,sl:o.slow,sf:o.slowF,st:o.stun,kx:o.knockFrom?o.knockFrom.x:null,ky:o.knockFrom?o.knockFrom.y:null});return}
  let d=amt,crit=false;if(t.cursedUntil>time)d*=1.4;
  // Your attacks (and your minions') can miss higher-level monsters. Crits only happen at 75%+ hit chance.
  const own=src&&(src.isPlayer?src:src.owner&&src.owner.isPlayer?src.owner:null);
  if(own&&t.side==='enemy'){const hc=hitChance(own,t);
    if(Math.random()>hc){if(!t.target&&!src.dead){t.target=own;t.returning=false}if(rt>(t.missT||0)){t.missT=rt+.25;floatText(t.x,t.y-(t.h||40)*.6,'Miss','#b8b8b8',13);if(Net.role)Net.ev.push({k:'m',n:t.nid})}return}
    if(hc>=CRIT_MIN_HIT&&Math.random()<own.stats.crit){d*=1.75;crit=true}}
  if(t.isPlayer&&t.eat){t.eat=null;floatText(t.x,t.y-50,'Meal interrupted','#ffb08a',12)}
  if(t.isPlayer&&!o.raw)d*=100/(100+t.stats.armor);d=Math.max(1,Math.round(d));if(Net.role==='host'&&t.side==='enemy')Net.ev.push({k:'h',n:t.nid,d,c:crit?1:0,col:o.hc});
  t.hp-=d;t.hitFlash=.12;t.lastHurt=time;if(t.isPlayer&&(t.mounted||t.mountCast>0)&&!(t.fly&&!free(t.x,t.y,t.r)))dismount(t,true);if(t.isPlayer&&t.hearthCast>0){t.hearthCast=0;toast('Teleport interrupted!')}
  floatText(t.x,t.y-(t.h||40)*.6,(crit?d+'!':''+d),t.side==='player'?'#ff6a5a':crit?'#ffd84a':'#fff',crit?20:15);
  if(t.side==='enemy'&&own)hitSpark(t,o.hc||weaponCol(own),crit);else if(t.isPlayer){sparks(t.x,t.y,26,'#ff5a4a',5,120,.25);if(t===players[0])hurtFlash=Math.min(1,hurtFlash+.6)}
  if(o.slow){t.slowUntil=time+o.slow;t.slowF=o.slowF||.5}
  if(o.stun&&!(t.boss&&o.stun>1)){t.stunUntil=time+o.stun}else if(o.stun&&t.boss)t.stunUntil=time+.5;
  if(o.knockFrom){const a=Math.atan2(t.y-o.knockFrom.y,t.x-o.knockFrom.x);moveEnt(t,Math.cos(a)*40,Math.sin(a)*40)}
  if(o.lifesteal&&src&&!src.dead)heal(src,d*o.lifesteal);
  if(src&&src.isPlayer&&!src.dead&&src.tm&&src.tm.leech&&t.side==='enemy')heal(src,d*src.tm.leech,true);
  if(t.side==='enemy')sfx('hit');else if(t.isPlayer)sfx('hurt');
  if(t.side==='enemy'&&!t.target&&src&&!src.dead&&src.side==='player'){t.target=src;t.returning=false}
  if(t.isPlayer)shake=Math.max(shake,3);
  if(t.hp<=0)kill(t,src)}
function kill(t){t.dead=true;
  if(t.side==='enemy'){bloodAt(t.x,t.y,true,t.type);sfx(t.boss?'bossdie':'die');burst(t.x,t.y,t.boss?'#cfe':'#a33',t.boss?70:16,t.boss?220:140);
    {let shown=0;for(const p of players)if(!p.dead){const xp=xpFor(p,t);if(p.isRemote){if(!p.away)netSend(Net.peers.get(p.uid),{t:'xp',a:xp})}else{gainXp(p,xp);p.kills=(p.kills||0)+1;shown=xp}}
      if(Net.role==='host'){netAll({t:'kill',k:t.type});Net.ev.push({k:'d',x:Math.round(t.x),y:Math.round(t.y),b:t.boss?1:0,n:t.name,ty:t.type})}floatText(t.x,t.y-(t.h||40),'+'+shown+' XP',shown<t.xp*.5?'#8a8a8a':'#c9a6ff',13)}makeCorpse(t);if(t.cellRef){t.cellRef.alive=null;t.cellRef.pending=time+rand(120,180)}
    if(quest.state==='active'){const q=QUESTS[quest.idx];if(q&&q.target.includes(t.type)){quest.prog++;if(quest.prog>=q.need){quest.state='ready';toast('Quest complete! Return to the Warden.','gold')}updateQuestUI()}}
    if(t.boss){toast(t.name+' has fallen!','gold');shake=14;for(const e of enemies)if(e.persist&&!e.boss&&dist(e,t)<700)e.target=e.target}
  }else if(t.isPlayer){sfx('death');t.dead=true;t.deathT=4;t.deaths=(t.deaths||0)+1;t.hearthCast=0;deathPenalty(t);burst(t.x,t.y,'#a22',30,120);$('death').classList.remove('hidden');showDeathChoices(t);for(const a of allies)if(a.owner===t)a.until=0}
  else burst(t.x,t.y,'#ccc',12,80)}
function enemyDrops(e){const b=e.boss;const drop=(kind,extra)=>drops.push(Object.assign({kind,x:e.x+rand(-26,26),y:e.y+rand(-18,18),t:rand(0,6)},extra));
  if(b||Math.random()<.5)drop('gold',{amount:Math.max(1,Math.round(rand(1.5,4)*e.lvl*(b?20:1)))});
  const pot=()=>drop('sup',{sup:(Math.random()<.65?'hp':'mp')+potTier(e.lvl),amount:1});if(Math.random()<(b?1:.05))pot();if(b)pot();
  const cls=players.length?pick(players).cls:'paladin';// shared loot: items fit a random hero in the party
  const lb=1+(players[0]?players[0].lootBonus||0:0);
  // Quest bosses: one boss roll (epic or better at most 18%, the Barrow King 50%) plus one bonus item that is never above rare.
  if(b&&zone.kind!=='dungeon'){drop('item',{item:genItem(e.lvl+1,0,cls,null,e.type==='barrowking'?RAR_W.finalBoss:RAR_W.boss)});drop('item',{item:genItem(e.lvl,0,cls,null,RAR_W.bonus)})}
  else if(!b&&Math.random()<.1*lb)drop('item',{item:genItem(e.lvl,0,cls)})}
function pickupDrops(){for(const d of drops){if(d.dead)continue;for(const p of players){if(p.dead||Math.hypot(p.x-d.x,p.y-d.y)>38)continue;
  if(d.kind==='gold'){sfx('gold');p.gold+=d.amount;floatText(d.x,d.y,'+'+d.amount+' gold','#ffd84a',13);d.dead=true}
  else if(d.kind==='mat'){p.mats[d.mat]=(p.mats[d.mat]||0)+d.amount;floatText(d.x,d.y,'+'+d.amount+' '+MATS[d.mat].n,'#cfe0a0',13);sfx('gold');d.dead=true}
  else if(d.kind==='sup'){sfx('potion');addSup(p,d.sup,d.amount||1);floatText(d.x,d.y,'+'+supName(d.sup),'#ff8a8a',13);d.dead=true}
  else if(d.kind==='item'){const it=d.item;sfx('loot',{rar:it.rar});if(!p.gear[it.slot]){p.gear[it.slot]=it;calcStats(p);floatText(d.x,d.y,'Equipped '+it.name,RAR[it.rar].c,13);d.dead=true}
    else if(p.bag.length<p.bagSize){p.bag.push(it);floatText(d.x,d.y,it.name,RAR[it.rar].c,13);d.dead=true}
    else if(rt>(d.fullT||0)){d.fullT=rt+2;floatText(d.x,d.y,'Bag full','#ff9a8a',13)}}
  if(d.dead){if(invOpen)renderInv();break}}}}

// ================= Update =================
function update(dt){time+=dt;
  const GU=Net.role==='guest';
  for(const p of players){if(p.isRemote){p.castAnim=Math.max(0,(p.castAnim||0)-dt);continue}if(p.id===0)readInput(p);updatePlayer(p,dt)}
  if(!GU){for(const a of allies)if(!a.dead)updateAlly(a,dt);
  for(const e of enemies)if(!e.dead)updateEnemy(e,dt);
  separate()}
  for(const pr of projs){if(pr.dead)continue;pr.life-=dt;pr.x+=pr.vx*dt;pr.y+=pr.vy*dt;
    if(PBLOCK.has(tileAt(pr.x,pr.y))){projEnd(pr);continue}
    if(GU){const hitList=pr.side==='player'?enemies:[players[0],...Net.avatars.values()];for(const t of hitList)if(t&&!t.dead&&Math.hypot(t.x-pr.x,t.y-pr.y)<(t.r||13)+pr.r&&!pr.hit.has(t)){pr.hit.add(t);if(pr.pierce>0)pr.pierce--;else{projEnd(pr);break}}}
    const list=GU?[]:pr.side==='player'?enemies:friendlies();
    for(const t of list){if(t.dead||pr.hit.has(t))continue;if(Math.hypot(t.x-pr.x,t.y-pr.y)<t.r+pr.r){pr.hit.add(t);dealDamage(t,pr.dmg,pr.src,Object.assign({hc:pr.col},pr.fx));if(pr.explode){projEnd(pr);break}if(pr.pierce>0)pr.pierce--;else{projEnd(pr);break}}}
    if(!pr.dead&&pr.life<=0)projEnd(pr);
    if(!pr.dead){(pr.tr||(pr.tr=[])).push(pr.x,pr.y);if(pr.tr.length>16)pr.tr.splice(0,2);
      if(pr.kind==='orb')for(let k=0;k<(pr.side==='player'?2:1);k++)parts.push({x:pr.x+rand(-3,3),y:pr.y+rand(-3,3),z:22+rand(-3,3),vx:rand(-25,25)-pr.vx*.08,vy:rand(-25,25)-pr.vy*.08,vz:rand(-10,25),life:.35,max:.35,col:pr.col,size:rand(1.6,3.2),gl:true})}}
  for(const a of areas){if(a.dead)continue;if(a.follow){a.x=a.follow.x;a.y=a.follow.y}
    if(GU){if(a.delay>0){a.delay-=dt;if(a.delay<=0){if(a.side==='enemy')sfx('slam');fx.push({k:'ring',x:a.x,y:a.y,r:a.r,life:.3,max:.3,col:a.side==='enemy'?'#ffb080':'#ffe0a0'});if(a.kind==='boulder'){shake=8;burst(a.x,a.y,'#8a7a5a',30,200)}}continue}}
    else if(a.delay>0){a.delay-=dt;if(a.delay<=0){if(a.side==='enemy'&&a.burst)sfx('slam');if(a.burst){const list=a.side==='player'?enemies:friendlies();for(const t of inRadius(list,a.x,a.y,a.r))dealDamage(t,a.burst.dmg,a.src,Object.assign({hc:AREA_COL[a.kind]},a.burst))}if(a.onBurst)a.onBurst(a)}continue}
    a.t+=dt;const list=a.side==='player'?enemies:friendlies();
    if(!GU&&a.kind==='trap'&&inRadius(enemies,a.x,a.y,a.r).length){for(const t of inRadius(enemies,a.x,a.y,85))dealDamage(t,a.trapDmg,a.src,{stun:2});burst(a.x,a.y,'#c8b890',26,180);fx.push({k:'ring',x:a.x,y:a.y,r:85,life:.3,max:.3,col:'#e8d8a0'});a.dead=true;continue}
    if(!GU&&a.tick&&a.tickDmg){a.nt-=dt;if(a.nt<=0){a.nt=a.tick;for(const t of inRadius(list,a.x,a.y,a.r))dealDamage(t,a.tickDmg,a.src,Object.assign({hc:AREA_COL[a.kind]},a.tickFx));if(a.healTick)for(const q of inRadius(friendlies(),a.x,a.y,a.r))heal(q,a.healTick)}}
    if(a.kind==='blizzard')for(let k=0;k<3;k++){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:120,vx:rand(-60,-20),vy:0,vz:-200,life:.6,max:.6,col:'#f0f8ff',size:2.5,ng:true})}
    if(a.kind==='plague'&&Math.random()<.7){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:4,vx:0,vy:0,vz:30,life:1,max:1,col:Math.random()<.5?'#8aff6a':'#b06aff',size:3,ng:true})}
    if(a.kind==='rain')for(let k=0;k<3;k++){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:160,vx:0,vy:0,vz:-700,life:.25,max:.25,col:'#e8dcc0',size:1.5,streak:true,ng:true})}
    if(a.kind==='holy'&&Math.random()<.5){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:2,vx:0,vy:0,vz:60,life:.8,max:.8,col:'#ffe08a',size:2,ng:true})}
    if(a.kind==='meteor'&&Math.random()<.6){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:2,vx:0,vy:0,vz:50,life:.6,max:.6,col:'#ff7a2a',size:3,ng:true})}
    if(a.t>=a.dur)a.dead=true}
  if(!GU)pickupDrops();updateCorpses();autoLootTick(dt);fogTick(dt);
  for(const q of parts){q.life-=dt;q.x+=q.vx*dt;q.y+=q.vy*dt;q.z+=q.vz*dt;if(!q.ng)q.vz-=320*dt;if(q.z<0){q.z=0;q.vz*=-.3;q.vx*=.6;q.vy*=.6}}
  for(const t of texts){t.life-=dt;t.z+=40*dt}
  for(const f of fx)f.life-=dt;
  for(const u of[...enemies,...allies,...players])if(u.hitFlash>0)u.hitFlash-=dt;
  enemies=enemies.filter(e=>!e.dead&&!e.remove);allies=allies.filter(a=>!a.dead);projs=projs.filter(p=>!p.dead);areas=areas.filter(a=>!a.dead);
  parts=parts.filter(q=>q.life>0);texts=texts.filter(t=>t.life>0);fx=fx.filter(f=>f.life>0);drops=drops.filter(d=>!d.dead);
  if(parts.length>1400)parts.splice(0,parts.length-1400);
  if(!GU){spawner(dt);questTick()}else updateBarrowGate();atmosTick(dt);netTick(dt);
  saveT+=dt;if(saveT>15){saveT=0;save()}}
function projEnd(pr){if(pr.dead)return;pr.dead=true;if(pr.explode&&Net.role==='guest'){boomFx(pr.x,pr.y,pr.explode.r,'#ff9a3a');shake=Math.max(shake,5)}else if(pr.explode)explosion(pr.x,pr.y,pr.explode.r,pr.explode.dmg,pr.src,pr.side);else burst(pr.x,pr.y,pr.col,6,80)}
function separate(){const list=[...players.filter(p=>!p.dead),...allies,...enemies];for(let i=0;i<list.length;i++){const a=list[i];for(let j=i+1;j<list.length;j++){const b=list[j];const dx=b.x-a.x,dy=b.y-a.y,m=a.r+b.r;if(Math.abs(dx)>m||Math.abs(dy)>m)continue;const d=Math.hypot(dx,dy);if(d>0&&d<m){const p=(m-d)/2,nx=dx/d,ny=dy/d;const fa=a.isPlayer?.3:1,fb=b.isPlayer?.3:1;moveEnt(a,-nx*p*fa,-ny*p*fa);moveEnt(b,nx*p*fb,ny*p*fb)}}}}
// Each region follows the story: Meadows → Gloomwood → Frostfells → Sunscar → Mirefen → Barrow-downs.
// Monsters get stronger the deeper you go into a region.
const BIOME_LVL={0:[1,3],3:[3,6],1:[6,9],2:[9,12],4:[12,15]},BARROW_LVL=[14,16];
// The Deep Wilds: the far edges of every region (except the meadows) hold level 17–20 elites that drop grand materials.
const DEEP_D=86*WS,DEEP_LVL=[17,20],DEEP_POOLS={1:['direwolf','obsidiangolem','icetroll','frostwolf'],2:['obsidiangolem','ancientwraith','wurm','scorpion'],3:['giantspider','direwolf','giantspider','spider'],4:['giantspider','ancientwraith','lurker','webweaver']};
function isDeep(tx,ty,b){return b!==B.MEADOW&&b<5&&Math.hypot(tx-VC.x,ty-VC.y)>DEEP_D}
function zoneRange(tx,ty,b){if(zone&&zone.kind!=='over'&&zone.ent)return zone.ent.lvl;if(isDeep(tx,ty,b))return DEEP_LVL;return Math.hypot(tx-BARROW.x,ty-BARROW.y)<34*WS?BARROW_LVL:BIOME_LVL[b]||[1,3]}
function zoneLevel(tx,ty,b){const r=zoneRange(tx,ty,b),d=Math.hypot(tx-VC.x,ty-VC.y);if(r===DEEP_LVL)return Math.min(20,17+Math.floor((d-DEEP_D)/(5*WS)));if(r===BARROW_LVL)return r[0]+Math.floor(Math.random()*3);
  const f=b===B.MEADOW?clamp((d-18*WS)/(32*WS),0,.999):clamp((d-34*WS)/(62*WS),0,.999);return r[0]+Math.floor(f*(r[1]-r[0]+1))}
// XP rewards fight at your level: weak monsters give little, dangerous ones give a bonus.
function xpFor(p,e){const d=e.lvl-p.level,m=d>=0?Math.min(1.5,1+.1*d):Math.max(.1,1+.15*d);return Math.max(1,Math.round(e.xp*m))}
function lvlColor(p,l){const d=l-p.level;return d>=4?'#ff4a3a':d>=2?'#ffb03a':d<=-5?'#8a8a8a':'#efe6d2'}
const POOLS={0:['wolf','wolf','goblin','wolf'],1:['frostwolf','frostwolf','goblin','icetroll'],2:['scorpion','scorpion','raider','wurm'],3:['spider','spider','wolf','archer','troll'],4:['beetle','mosquito','webweaver','lurker','webweaver']};
const PACK={wolf:[2,3],frostwolf:[2,3],spider:[2,3],mosquito:[3,4]};
function spawnSite(boss){const ok=(x,y)=>free(x,y,16);const ring=(type,c,n,r,lvl)=>{for(let i=0;i<n;i++){const a=i/n*TAU+.3;let x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r*.8;if(ok(x,y))spawnEnemy(type,x,y,lvl,{persist:true})}};
  const S2={greyfang:()=>{const c=tw(DEN);spawnEnemy('greyfang',c.x,c.y,6,{persist:true});ring('wolf',c,3,130,5);sfx('roar');toast('A great howl shakes the Gloomwood…')},
    skarg:()=>{const c=tw(CAMP);spawnEnemy('skarg',c.x,c.y+40,9,{persist:true});ring('goblin',c,6,170,8);ring('frostwolf',c,2,230,8);sfx('roar');toast('War drums echo through the Frostfells…')},
    mossback:()=>{const c=tw(TROLL);spawnEnemy('mossback',c.x,c.y-40,12,{persist:true});ring('scorpion',c,3,180,11);sfx('roar');toast('The ground trembles. Something huge is waking…')},
    barrowking:()=>{const c=tw(BARROW);spawnEnemy('barrowking',c.x,c.y,15,{persist:true});ring('wight',c,4,150,13);sfx('roar');toast('A cold voice echoes from the barrow…')}};
  if(S2[boss])S2[boss]()}
// Once the Lamp burns again (the Barrow King quest is reached), the ward breaks and the barrow gate opens.
function updateBarrowGate(){const z=zones.over,qi=Net.role==='guest'?Net.hostQ:quest.idx;if(!z||z.gateOpen||qi<8||!z.barrowGate)return;z.gateOpen=true;for(const i of z.barrowGate)z.map[i]=T.PATH;
  if(z.terrain)for(const i of z.barrowGate)z.terrain.chunks.delete(Math.floor(i%z.MW/TCH)+','+Math.floor(i/z.MW/TCH));if(zone===z&&rt>5)toast('Far away, the ward on the barrow-downs shatters. The way to the Barrow King is open.','gold')}
function questTick(){updateBarrowGate();const p=players[0];if(!p||quest.state!=='active'||zone.id!=='over')return;const q=QUESTS[quest.idx];if(!q||!q.boss||flags['site'+quest.idx])return;
  if(Math.hypot(p.x/TILE-q.site.x,p.y/TILE-q.site.y)<22){flags['site'+quest.idx]=true;spawnSite(q.boss)}}

// ================= Input =================
function readInput(p){const i=p.input;if(isPaused()){i.mx=i.my=0;i.fire=false;return}i.mx=((keys.KeyD||keys.ArrowRight)?1:0)-((keys.KeyA||keys.ArrowLeft)?1:0);i.my=((keys.KeyS||keys.ArrowDown)?1:0)-((keys.KeyW||keys.ArrowUp)?1:0);i.ax=mouse.x+camX;i.ay=mouse.y/TILT+camY;i.fire=mouse.l}
addEventListener('keydown',e=>{if(storyOpen){if(e.code==='Enter'||e.code==='Escape'){if(!$('intro').classList.contains('hidden'))$('btnIntro').click();else $('btnVic').click()}return}if(e.target.tagName==='INPUT'){if(e.code==='Enter'&&state==='creator')beginGame();return}keys[e.code]=true;if(state!=='play')return;
  const p=players[0];if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'){if(Friends.open){toggleFriends(false);return}if(mapOpen)toggleMap(false);else if(lootOpen)closeLoot();else if(profOpen)toggleProf(false);else if(invOpen)toggleInv(false);else if(talOpen)toggleTal(false);else if(shopOpen)closeShop();else if(dialogOpen)closeDialog();else togglePause();return}
  if(e.code==='KeyI'||e.code==='KeyC'){if(!pauseOpen&&!dialogOpen)toggleInv();return}
  if(e.code==='KeyT'){if(!pauseOpen&&!dialogOpen)toggleTal();return}
  if(e.code==='KeyP'){if(!pauseOpen&&!dialogOpen)toggleProf();return}
  if(e.code==='KeyN'){if(!pauseOpen&&!dialogOpen)toggleMap();return}
  if(e.code==='KeyO'){if(!pauseOpen&&!dialogOpen)toggleFriends();return}
  if(e.code==='KeyE'&&shopOpen){closeShop();return}
  if(isPaused()||!p)return;
  const m=/^Digit([1-5])$/.exec(e.code);if(m)p.input.abil[+m[1]]=true;if(e.code==='KeyR')p.input.abil[5]=true;
  if(e.code==='KeyM'){Snd.vol.muted=!Snd.vol.muted;applyVol();saveAudio();toast(Snd.vol.muted?'Sound off (M)':'Sound on (M)')}
  if(e.code==='KeyQ')drinkPotion(p,'hp');if(e.code==='KeyZ')drinkPotion(p,'mp');if(e.code==='KeyX')eatFood(p);
  if(e.code==='KeyF'&&!p.dead)toggleMount(p);
  if(e.code==='KeyH')startHearth(p);
  if(e.code==='KeyE'&&!p.dead){const it=interactables(p)[0];if(it)it.act()}});
addEventListener('keyup',e=>{keys[e.code]=false});
addEventListener('blur',()=>{for(const k in keys)keys[k]=false;mouse.l=false});
addEventListener('mousemove',e=>{mouse.x=e.clientX;mouse.y=e.clientY;const t=$('tip');if(!t.classList.contains('hidden')){t.style.left=Math.min(e.clientX+16,innerWidth-300)+'px';t.style.top=Math.min(e.clientY+16,innerHeight-t.offsetHeight-8)+'px'}});
cvs.addEventListener('mousedown',e=>{if(state!=='play'||isPaused())return;if(e.button===0){const s=signUnderMouse();if(s){readSign(s);return}const cp=corpseUnderMouse();if(cp){openLoot(cp);return}mouse.l=true}if(e.button===2&&players[0])players[0].input.abil[1]=true});
addEventListener('mouseup',e=>{if(e.button===0)mouse.l=false});
cvs.addEventListener('contextmenu',e=>e.preventDefault());
let storyOpen=false;
function isPaused(){return Friends.open||invOpen||dialogOpen||pauseOpen||talOpen||shopOpen||storyOpen||profOpen||mapOpen}
function showStory(id,on){storyOpen=on;$(id).classList.toggle('hidden',!on);mouse.l=false}
function fmtTime(s){const m=Math.floor(s/60);return m>=60?Math.floor(m/60)+' h '+(m%60)+' min':m+' min'}
function showVictory(){const p=players[0];sfx('victory');$('vicText').innerHTML=`The Barrow King is no more, and the Lamp of Emberfall shines over the whole valley.<br><br>${p.name} the ${CLASSES[p.cls].name} · level ${p.level}<br>${p.kills||0} foes defeated · fallen ${p.deaths||0} times · ${fmtTime(p.playT||0)} played<br><br>The world stays open: keep hunting for epic gear and growing stronger.`;showStory('victory',true)}
$('btnIntro').onclick=()=>{showStory('intro',false);toast(`Speak with Old Warden Bram by the fire (E).`,'gold')};
$('btnVic').onclick=()=>showStory('victory',false);

// ================= Drawing: characters =================
function bugLegs(c,n,L,s,w,col,lw){c.strokeStyle=col;c.lineWidth=lw*s;for(let i=0;i<n;i++){const side=i%2?1:-1,k=Math.floor(i/2),cnt=n/2;const a=side*(Math.PI/2)+(k-(cnt-1)/2)*.55*side;const ph=Math.sin(w+i*1.7)*2*s;
  const fx2=Math.cos(a)*L*s,fy=Math.sin(a)*L*s*TILT;c.beginPath();c.moveTo(0,-8*s);c.lineTo(fx2*.55,fy*.55-14*s+ph);c.lineTo(fx2,fy+ph*.3);c.stroke()}}
function drawBug(c,x,y,o){const s=o.s||1,face=Math.cos(o.aim||0)<0?-1:1,w=o.walk||0;c.save();c.translate(x,y);c.scale(face,1);
  switch(o.kind){
    case'spider':bugLegs(c,8,20,s,w,'#1e1a22',2);c.fillStyle='#2a2430';circ(c,-6*s,-11*s,10*s);c.fill();c.fillStyle='#6a2a3a';c.fillRect(-9*s,-15*s,6*s,2*s);c.fillStyle='#2a2430';circ(c,6*s,-10*s,6*s);c.fill();c.fillStyle='#ff3a3a';c.shadowColor='#f33';c.shadowBlur=5;c.fillRect(8*s,-12*s,1.8*s,1.8*s);c.fillRect(10*s,-10*s,1.8*s,1.8*s);c.shadowBlur=0;break;
    case'beetle':bugLegs(c,6,16,s,w,'#1a2214',2.2);c.fillStyle='#2f4a3a';ell(c,0,-10*s,14*s,9*s);c.fill();c.fillStyle='rgba(150,220,180,.25)';ell(c,-3*s,-13*s,7*s,3*s);c.fill();c.strokeStyle='rgba(0,0,0,.4)';c.lineWidth=1.5;c.beginPath();c.moveTo(-12*s,-10*s);c.lineTo(10*s,-10*s);c.stroke();c.fillStyle='#1a2a20';circ(c,13*s,-10*s,5*s);c.fill();c.beginPath();c.moveTo(15*s,-12*s);c.lineTo(23*s,-19*s);c.lineTo(17*s,-9*s);c.fill();break;
    case'scorpion':{bugLegs(c,8,17,s,w,'#7a5428',2);c.fillStyle='#a8742e';ell(c,0,-10*s,12*s,7*s);c.fill();for(const sd of[-1,1]){c.strokeStyle='#a8742e';c.lineWidth=3*s;c.beginPath();c.moveTo(8*s,-10*s);c.lineTo(17*s,-10*s+sd*5*s);c.stroke();c.fillStyle='#8a5a22';ell(c,21*s,-10*s+sd*6*s,5*s,3*s);c.fill()}
      const tail=[[-10,-12],[-16,-18],[-18,-26],[-14,-33],[-7,-36]];c.fillStyle='#b07a32';tail.forEach(([tx,ty],i)=>{circ(c,tx*s,ty*s+Math.sin(w*.5)*1.5*s,(4.5-i*.5)*s);c.fill()});c.fillStyle='#3a2210';c.beginPath();c.moveTo(-7*s,-36*s);c.lineTo(-1*s,-33*s);c.lineTo(-5*s,-31*s);c.fill();break}
    case'mosquito':{const z=20*s+Math.sin(rt*8+x)*3*s;c.translate(0,-z);c.strokeStyle='#2a2a1a';c.lineWidth=1;for(let i=0;i<3;i++){c.beginPath();c.moveTo((i*3-3)*s,0);c.lineTo((i*4-5)*s,12*s);c.stroke()}
      c.fillStyle='#4a3a2a';ell(c,-6*s,-2*s,8*s,3.5*s);c.fill();c.fillStyle='#8a2a2a';ell(c,-7*s,-2*s,5*s,2*s);c.fill();c.fillStyle='#3a2a1a';circ(c,4*s,-3*s,3.5*s);c.fill();c.strokeStyle='#2a1a10';c.lineWidth=1.5;c.beginPath();c.moveTo(6*s,-3*s);c.lineTo(15*s,0);c.stroke();
      const f=Math.abs(Math.sin(rt*45))*.9+.1;c.fillStyle='rgba(220,230,240,.45)';c.save();c.scale(1,f);ell(c,-2*s,-8*s/f,7*s,4*s);c.fill();c.restore();break}
    case'wurm':{c.fillStyle='rgba(120,90,50,.5)';ell(c,0,0,20*s,7*s);c.fill();const seg=[[-12,-3,8],[-7,-14,9],[0,-25,9],[7,-34,8.5],[12,-40,8]];seg.forEach(([sx2,sy2,r],i)=>{c.fillStyle=i%2?'#9a7444':'#b08a52';circ(c,sx2*s,(sy2+Math.sin(w*.4+i)*2)*s,r*s);c.fill()});
      c.fillStyle='#3a1a10';ell(c,16*s,-41*s,4*s,6*s);c.fill();c.fillStyle='#f0e8d0';for(let i=0;i<4;i++)c.fillRect(14*s+i*1.2*s,-46*s+i*3*s,2*s,1.6*s);break}}
  c.restore()}
const S=(x,y)=>[x-camX,(y-camY)*TILT];
const aimScreen=a=>Math.atan2(Math.sin(a)*TILT,Math.cos(a));
function playerLook(p){const c=CLASSES[p.cls],L=p.look,hg=L.headgear!==false,gv=p.gear?gearLook(p):null;if(gv&&!hg)delete gv.helm;return{gv,wv:gv&&gv.weapon,darkHood:!!c.darkHood,s:1,skin:L.skin,hair:L.hair,eyes:L.eyes||'#1b140e',cloth:L.cloth,trim:L.trim,bw:{slim:.85,normal:1,broad:1.2}[L.body||'normal'],hairStyle:L.hairStyle||'short',beardStyle:L.beard||'none',hat:hg&&!gv?c.hat:null,hatColor:c.hat==='helm'?'#a7adb5':c.darkHood?'#1c1a22':shade(L.cloth,-28),weapon:weaponVisual(p),shield:!!c.shield,shieldColor:L.cloth,robe:!!c.robe,orb:c.orb,legs:'#33291f',shadowFace:!!c.darkHood&&hg&&!gv}}
function unitLook(u){const o={aim:u.aim,aimS:aimScreen(u.aim||0),walk:u.walk,moving:u.moving,atk:u.atkT?Math.max(0,1-(time-u.atkT)/.35):0,ph:u.x*.013};switch(u.type||u.kind){
  case'goblin':return Object.assign(o,{s:.82,skin:'#7fa548',cloth:'#5a4228',ears:true,weapon:'blade',eyes:'#ffde4a'});
  case'skarg':return Object.assign(o,{s:1.45,skin:'#6b9a3a',cloth:'#4a2a1a',ears:true,hat:'helm',hatColor:'#6d6a62',weapon:'axe',eyes:'#ff5a2a',glow:true});
  case'archer':return Object.assign(o,{s:1,skin:'#2e2e3c',cloth:'#3c3c55',hat:'hood',hatColor:'#24243a',weapon:'bow',eyes:'#c9b6ff',glow:true});
  case'troll':return Object.assign(o,{s:1.65,skin:'#7b8a66',cloth:'#4b3a26',weapon:'club',eyes:'#ffcf5a'});
  case'mossback':return Object.assign(o,{s:2.3,skin:'#6a7a52',cloth:'#3b5a2a',weapon:'club',eyes:'#ffb02a',glow:true,hair:'#3f6a2a'});
  case'wight':return Object.assign(o,{s:1,skin:'#aec4cf',cloth:'#36444e',weapon:'sword',eyes:'#8ff',glow:true,alpha:.85,hat:'hood',hatColor:'#2a353d'});
  case'barrowking':return Object.assign(o,{s:1.8,skin:'#c2d3dc',cloth:'#26313a',hat:'crown',weapon:'sword',eyes:'#8ff',glow:true,robe:true,alpha:.92});
  case'skeleton':return Object.assign(o,{s:.92,skin:'#e9e3d1',cloth:'#bdb59f',weapon:'blade',eyes:'#7dff9a',glow:true});
  case'icetroll':return Object.assign(o,{s:1.65,skin:'#9ab8c8',cloth:'#3a4a5a',weapon:'club',eyes:'#6fe0ff',glow:true,hair:'#e8f0f8'});
  case'lurker':return Object.assign(o,{s:1.6,skin:'#5a6a3a',cloth:'#3a3a22',weapon:'club',eyes:'#e8e04a',hair:'#3f5a2a'});
  case'obsidiangolem':return Object.assign(o,{s:2,skin:'#3a3448',cloth:'#241e30',eyes:'#c890ff',glow:true,hair:'#6a4a9a',hairStyle:'mohawk'});
  case'ancientwraith':return Object.assign(o,{s:1.5,skin:'#9fd8e8',cloth:'#1e2e3a',hat:'hood',hatColor:'#16222a',eyes:'#9fe8ff',glow:true,alpha:.8,robe:true,weapon:'staff',orb:'#9fe8ff'});
  case'raider':return Object.assign(o,{s:1,skin:'#b07a4a',cloth:'#c8a060',hat:'hood',hatColor:'#8a6a3a',weapon:'bow',eyes:'#1a1410'});
  case'golem':return Object.assign(o,{s:1.7,skin:'#8ad0f0',cloth:'#4a7aa0',eyes:'#e0faff',glow:true,hair:'#bfeaff',hairStyle:'mohawk'});
  case'mummy':return Object.assign(o,{s:1,skin:'#d8cfb0',cloth:'#cfc4a0',eyes:'#ffd86a',glow:true,bandage:true,weapon:'blade'});
  case'anubek':return Object.assign(o,{s:1.5,skin:'#d8cfb0',cloth:'#2a4a6a',trim:'#e8c24a',hat:'hood',hatColor:'#1a2a4a',eyes:'#ffd86a',glow:true,robe:true,weapon:'staff',orb:'#ffd86a',bandage:true});
  case'halvar':return Object.assign(o,{s:2.3,skin:'#9ab8c8',cloth:'#3a4a5a',hat:'crown',weapon:'club',eyes:'#6fe0ff',glow:true,hair:'#e8f0f8',beard:'#e8f0f8'});
  case'sunking':return Object.assign(o,{s:2.2,skin:'#e8c87a',cloth:'#c89a2a',trim:'#fff0a0',hat:'crown',weapon:'sword',eyes:'#fff6a0',glow:true,robe:true})}return o}
const BUGS=new Set(['spider','beetle','scorpion','mosquito','wurm']);
function drawUnit(u){let[sx,sy]=S(u.x,u.y);softShadow(ctx,sx,sy,u.r*1.5,u.r*.62);
  const moved=u.walk!==u._lw;u._lw=u.walk;u._mv=moved?.2:Math.max(0,(u._mv||0)-1/60);u.moving=u._mv>0;const wk=u.moving?u.walk:0,sz=u.boss?2:1;
  const atk=u.atkT?Math.max(0,1-(time-u.atkT)/.35):0,lunge=atk?Math.sin((1-atk)*Math.PI)*10*sz:0;
  sx+=Math.cos(u.aim||0)*lunge;sy+=Math.sin(u.aim||0)*lunge*TILT-(u.moving?Math.abs(Math.sin(u.walk))*2*sz:(Math.sin(rt*2+u.x*.013)*.5+.5)*.8*sz);
  if(u.slowUntil>time){ctx.fillStyle='rgba(140,200,255,.25)';ell(ctx,sx,sy,u.r*1.3,u.r*.55);ctx.fill()}
  if(u.charge&&u.charge.wind<=0){ctx.globalAlpha=.3;drawWolf(ctx,sx-Math.cos(u.charge.a)*20,sy-Math.sin(u.charge.a)*14,{s:1.8,aim:u.aim,walk:wk,col:'#6a6d74',eye:'#ff3a2a'});ctx.globalAlpha=1}
  const kind=u.type||u.kind;
  if(kind==='wolf')drawWolf(ctx,sx,sy,{s:1,aim:u.aim,walk:wk,col:u.side==='player'?'#d6dde3':'#7c7f86',eye:u.side==='player'?'#9fd8ff':'#ff5a3a'});
  else if(kind==='greyfang')drawWolf(ctx,sx,sy,{s:1.8,aim:u.aim,walk:wk,col:'#9a9da4',eye:'#ff3a2a'});
  else if(kind==='frostwolf')drawWolf(ctx,sx,sy,{s:1.05,aim:u.aim,walk:wk,col:'#dfe8f0',eye:'#6fd0ff'});
  else if(kind==='direwolf')drawWolf(ctx,sx,sy,{s:1.7,aim:u.aim,walk:wk,col:'#3e3e46',eye:'#ff3a2a'});
  else if(kind==='webweaver'||kind==='giantspider')drawCreature(ctx,sx,sy,{kind,s:kind==='giantspider'?2.1:1.3,aim:u.aim,walk:wk});
  else if(kind==='rimeclaw')drawWolf(ctx,sx,sy,{s:2,aim:u.aim,walk:wk,col:'#cfe6f5',eye:'#6fd0ff'});
  else if(kind==='spider'||kind==='cspider'||kind==='venomfang'||kind==='broodmother')drawCreature(ctx,sx,sy,{kind:kind==='cspider'?'cspider':'spider',s:kind==='venomfang'?1.8:kind==='broodmother'?2.4:1,aim:u.aim,walk:wk});
  else if(kind==='scarablord')drawCreature(ctx,sx,sy,{kind:'scarab',s:2.3,aim:u.aim,walk:wk});
  else if(kind==='bat'||kind==='myconid'||kind==='sporeling')drawCreature(ctx,sx,sy,{kind,s:1,aim:u.aim,walk:wk});
  else if(BUGS.has(kind))drawBug(ctx,sx,sy,{kind,s:kind==='wurm'?1.2:1,aim:u.aim,walk:wk});
  else drawHumanoid(ctx,sx,sy,unitLook(u));
  if(u.hitFlash>0){ctx.fillStyle='rgba(255,255,255,.45)';ell(ctx,sx,sy-u.h*.5,u.r*1.1,u.h*.5);ctx.fill()}
  if(u.cursedUntil>time){ctx.fillStyle='rgba(176,106,255,.8)';for(let k=0;k<3;k++){const a=rt*3+k*2.1;circ(ctx,sx+Math.cos(a)*10,sy-u.h-6+Math.sin(a)*3,2);ctx.fill()}}
  if(u.stunUntil>time){ctx.fillStyle='#ffe066';for(let k=0;k<3;k++){const a=rt*5+k*2.1;circ(ctx,sx+Math.cos(a)*11,sy-u.h-8+Math.sin(a)*3,2.2);ctx.fill()}}
  if(u.side==='enemy'&&!u.boss&&(u.hp<u.maxHp||u.target)){const w=Math.max(30,u.r*2.4),y0=sy-u.h-12;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(sx-w/2-1,y0-1,w+2,6);ctx.fillStyle='#c8382c';ctx.fillRect(sx-w/2,y0,w*Math.max(0,u.hp/u.maxHp),4);
    ctx.fillStyle=players[0]?lvlColor(players[0],u.lvl):'#eee';ctx.font='bold 10px system-ui';ctx.textAlign='center';ctx.fillText('Lv '+u.lvl,sx,y0-3)}
  drawAwareness(u,sx,sy);
  if(u.isAlly){const w=28,y0=sy-u.h-10;ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(sx-w/2-1,y0-1,w+2,5);ctx.fillStyle='#5ac85a';ctx.fillRect(sx-w/2,y0,w*Math.max(0,u.hp/u.maxHp),3)}}
function drawPlayer(p){if(p.dead||p.away||(p.isAvatar&&!(p.look&&p.look.skin)))return;const[sx,sy]=S(p.x,p.y);softShadow(ctx,sx,sy,20,8);
  const o=playerLook(p);o.aim=p.aim;o.aimS=aimScreen(p.aim);o.walk=p.walk;const moved=p.walk!==p._lw;p._lw=p.walk;p._mv=moved?.15:Math.max(0,(p._mv||0)-1/60);o.moving=p._mv>0&&!p.mounted;o.atk=(p.castAnim||0)/.3;let seat=0;
  if(p.mounted){drawMount(ctx,p.mount,sx,sy,p.aim,p.walk);seat=mountSeat(p.mount)+(p.mount==='dragon'?Math.sin(rt*3)*3:0);o.walk=0}
  if(p.mountCast>0){ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(sx-20,sy+10,40,5);ctx.fillStyle='#e8c26a';ctx.fillRect(sx-20,sy+10,40*(1-p.mountCast),5)}
  drawHumanoid(ctx,sx,sy-seat,o);
  if(p.hitFlash>0){ctx.fillStyle='rgba(255,80,60,.35)';ell(ctx,sx,sy-26,13,26);ctx.fill()}
  if(p.invulnUntil>time){ctx.strokeStyle=`rgba(255,230,140,${.5+.3*Math.sin(rt*10)})`;ctx.lineWidth=3;ell(ctx,sx,sy-26,26,34);ctx.stroke()}
  if(p.stunUntil>time){ctx.fillStyle='#ffe066';for(let k=0;k<3;k++){const a=rt*5+k*2.1;circ(ctx,sx+Math.cos(a)*11,sy-62+Math.sin(a)*3,2.2);ctx.fill()}}
  ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(p.name,sx+1,sy-68);ctx.fillStyle='#f3e6c0';ctx.fillText(p.name,sx,sy-69)}
function drawWarden(){const[sx,sy]=S(warden.x,warden.y);const p=players[0];if(p)warden.aim=Math.atan2(p.y-warden.y,p.x-warden.x);
  ctx.fillStyle='rgba(0,0,0,.3)';ell(ctx,sx,sy,15,6);ctx.fill();
  drawHumanoid(ctx,sx,sy,{s:1.05,skin:'#e3c3a0',hair:'#d8d8d0',beard:'#d8d8d0',cloth:'#4a5a6a',robe:true,weapon:'staff',orb:'#fff1b0',aim:-Math.PI/2+.25,aimS:-Math.PI/2+.25,walk:0,legs:'#2a2a2a'});
  let mark=null,col='#ffd84a';if(quest.state==='offer')mark='!';else if(quest.state==='ready')mark='?';else if(quest.state==='active'){mark='…';col='#aaa'}
  if(mark){const b=Math.sin(rt*3)*3;ctx.font='bold 28px Georgia';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(mark,sx+2,sy-74+b);ctx.fillStyle=col;ctx.fillText(mark,sx,sy-76+b)}
  ctx.font='12px Georgia';ctx.fillStyle='#e8dcb8';ctx.fillText('Old Warden Bram',sx,sy-60);
  if(p&&!p.dead&&dist(p,warden)<95&&!dialogOpen){ctx.font='bold 13px system-ui';ctx.fillStyle='#fff';ctx.fillText('[E] Talk',sx,sy+22)}}

// ================= Drawing: world =================
// ---- Smooth graphics: a pre-painted high-resolution terrain, shaded tree sprites and soft shadows.
const TS=10;// terrain pixels per tile; the image is drawn scaled and smoothed, so borders come out soft and organic
let terrain=null;
function hsl2rgb(h,s,l){h=((h%360)+360)%360/360;s/=100;l=clamp(l,0,100)/100;if(!s)return[l*255,l*255,l*255];const q=l<.5?l*(1+s):l+s-l*s,p=2*l-q;
  const f=t=>{t=(t+1)%1;return 255*(t<1/6?p+(q-p)*6*t:t<.5?q:t<2/3?p+(q-p)*(2/3-t)*6:p)};return[f(h+1/3),f(h),f(h-1/3)]}
function groundHSL(b,v){switch(b){case B.SNOW:return[205,14+v*8,80+v*10];case B.DESERT:return[36+v*8,42+v*10,56+v*12];case B.FOREST:return[106+v*14,26+v*8,15+v*7];case B.SWAMP:return[70+v*18,20+v*8,24+v*9];default:return[84+v*22,30+v*10,25+v*10]}}
function terrHSL(t,b,v){switch(t){
  case T.WATER:return b===B.SNOW?[196,36,58+v*10]:b===B.SWAMP?[95,22,19+v*5]:b===B.DESERT?[188,50,36+v*8]:[206,44,24+v*7];
  case T.PATH:case T.BRIDGE:return b===B.SNOW?[30,14,56+v*8]:b===B.DESERT?[32,34,46+v*8]:[33,28,34+v*8];
  case T.STONE:case T.WALL:if(b===B.DUNGEON)return t===T.WALL?[30,6,8+v*3]:[38,8,23+v*10];if(b===B.INDOOR)return[25,30,14+v*4];return[45,5,35+v*12];
  case T.PLANK:return[28,42,30+v*10];case T.CAVE:return[215,12,16+v*9];case T.ROCK:return[220,10,7+v*4];case T.DIRT:case T.HOUSE:return b===B.SNOW?[30,10,48+v*8]:[30,26,25+v*8];
  case T.BOG:return[78,24,20+v*7];case T.TREE:{const g=groundHSL(b,v);return[g[0],g[1],g[2]-(b===B.SNOW?6:5)]}default:return groundHSL(b,v)}}
function paintTerrain(px0,py0,TW,TH){const cv=document.createElement('canvas');cv.width=TW;cv.height=TH;const g=cv.getContext('2d'),img=g.createImageData(TW,TH),D=img.data;
  const tileOf=(wx,wy)=>clamp(Math.floor(wy),0,MH-1)*MW+clamp(Math.floor(wx),0,MW-1);
  for(let py=0;py<TH;py++)for(let px=0;px<TW;px++){const fx=(px0+px+.5)/TS,fy=(py0+py+.5)/TS;
    const wx=fx+(vnoise(fx*1.2+11,fy*1.2)-.5)*.75,wy=fy+(vnoise(fx*1.2,fy*1.2+37)-.5)*.75,i=tileOf(wx,wy),t=map[i],b=bio[i];
    const fine=vnoise(fx*2.7,fy*2.7)*.55+vnoise(fx*8.1+5,fy*8.1)*.3+Math.random()*.15;let c=terrHSL(t,b,fine);let l=c[2];
    if(t===T.WATER){let shore=0;for(const[ox,oy]of[[.35,0],[-.35,0],[0,.35],[0,-.35]]){const n=map[tileOf(wx+ox,wy+oy)];if(n!==T.WATER&&n!==T.BRIDGE)shore++}
      if(shore)l+=b===B.SWAMP?4:9;l+=Math.sin(fx*3+fy*5)*1.5}
    else if(t===T.BRIDGE){l+=(Math.floor(fx*4)%2?-6:3);if(map[tileOf(fx,fy)]===T.WATER||true)c=[28,40,30+fine*6];l=c[2]+(Math.floor(fx*5)%2?-4:3)}
    else if(t===T.BOG){if(vnoise(fx*1.7+3,fy*1.7)>.58)l-=6}
    else if(t===T.PLANK){l+=(Math.floor(fy*2.6)%2?-3:2);if((fy*2.6)%1<.08)l-=7}
    else if(t===T.CAVE||(t===T.STONE&&b===B.DUNGEON)){if(vnoise(fx*2+9,fy*2)>.62)l+=3;if(b===B.DUNGEON&&((fx*2)%1<.05||(fy*2)%1<.05))l-=5}
    else if(t===T.GRASS&&b!==B.DESERT&&b!==B.SNOW&&vnoise(fx*.6+70,fy*.6)>.62)l+=2.5;
    const rgb=hsl2rgb(c[0],c[1],l),k=(py*TW+px)*4;D[k]=rgb[0];D[k+1]=rgb[1];D[k+2]=rgb[2];D[k+3]=255}
  g.putImageData(img,0,0);
  // a light blur melts the pixel steps along borders into smooth, painted-looking edges
  const tmp=document.createElement('canvas');tmp.width=TW;tmp.height=TH;const tg=tmp.getContext('2d');tg.drawImage(cv,0,0);g.filter='blur(1.3px)';g.drawImage(tmp,0,0);g.filter='none';return cv}
// The big world is painted lazily in chunks as you explore (with a margin so the blur leaves no seams).
// A cheap overview (2 px per tile) feeds the minimap and the world map.
const TCH=32,TMARGIN=3;
function genTerrain(){const t={MW,MH,chunks:new Map(),queue:[],ov:null};t.ov=paintOverview();return t}
function terrainChunk(t,cx,cy){const key=cx+','+cy;let c=t.chunks.get(key);if(c)return c;
  const m=TMARGIN*TS,x0=cx*TCH*TS,y0=cy*TCH*TS,w=Math.min(TCH,t.MW-cx*TCH)*TS,h=Math.min(TCH,t.MH-cy*TCH)*TS,big=paintTerrain(x0-m,y0-m,w+2*m,h+2*m);
  c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(big,m,m,w,h,0,0,w,h);t.chunks.set(key,c);return c}
function paintOverview(){const k=2,cv=document.createElement('canvas');cv.width=MW*k;cv.height=MH*k;const g=cv.getContext('2d'),img=g.createImageData(MW,MH),D=img.data;
  for(let i=0;i<MW*MH;i++){const c=terrHSL(map[i],bio[i],.45+tvar[i]*.2),rgb=hsl2rgb(c[0],c[1],map[i]===T.TREE?c[2]-6:c[2]);D[i*4]=rgb[0];D[i*4+1]=rgb[1];D[i*4+2]=rgb[2];D[i*4+3]=255}
  const tmp=document.createElement('canvas');tmp.width=MW;tmp.height=MH;tmp.getContext('2d').putImageData(img,0,0);g.imageSmoothingEnabled=true;g.filter='blur(1px)';g.drawImage(tmp,0,0,MW*k,MH*k);g.filter='none';return cv}
// Draw the visible chunks; paint at most one missing chunk per frame just outside the view, so walking stays smooth.
function drawTerrainChunks(){const t=terrain,k=TS/TILE,cs=TCH*TILE;const x0=Math.max(0,Math.floor(camX/cs)),x1=Math.min(Math.ceil(t.MW/TCH)-1,Math.floor((camX+W)/cs)),y0=Math.max(0,Math.floor(camY/cs)),y1=Math.min(Math.ceil(t.MH/TCH)-1,Math.floor((camY+H/TILT)/cs));
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){const c=terrainChunk(t,cx,cy),dx=cx*cs-camX,dy=(cy*cs-camY)*TILT;ctx.drawImage(c,0,0,c.width,c.height,dx-.5,dy-.5,c.width/k+1,c.height/k*TILT+1)}
  for(let cy=y0-1;cy<=y1+1;cy++)for(let cx=x0-1;cx<=x1+1;cx++){if(cx<0||cy<0||cx*TCH>=t.MW||cy*TCH>=t.MH||t.chunks.has(cx+','+cy))continue;terrainChunk(t,cx,cy);return}
  if(t.chunks.size>140){for(const key of t.chunks.keys()){const[cx,cy]=key.split(',').map(Number);if(cx<x0-3||cx>x1+3||cy<y0-3||cy>y1+3)t.chunks.delete(key);if(t.chunks.size<=100)break}}}
// Soft round shadow, drawn from one blurred sprite.
const blob=document.createElement('canvas');blob.width=blob.height=64;{const g=blob.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.55)');gr.addColorStop(.6,'rgba(0,0,0,.28)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)}
function softShadow(c,x,y,rx,ry,a){c.globalAlpha=a==null?1:a;c.drawImage(blob,x-rx,y-ry,rx*2,ry*2);c.globalAlpha=1}
// Tree sprites: drawn once at double resolution with gradients, then stamped every frame.
const SPR={},SS=2,SPW=76,SPH=96,SAX=38,SAY=88;
function radialBall(g,x,y,r,col,light){const gr=g.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);gr.addColorStop(0,light);gr.addColorStop(.55,col);gr.addColorStop(1,shade(col,-35));g.fillStyle=gr;circ(g,x,y,r);g.fill()}
function makeSprite(fn){const c=document.createElement('canvas');c.width=SPW*SS;c.height=SPH*SS;const g=c.getContext('2d');g.scale(SS,SS);g.translate(SAX,SAY);g.lineJoin=g.lineCap='round';fn(g);return c}
function trunk(g,h){const gr=g.createLinearGradient(-4,0,4,0);gr.addColorStop(0,'#6a4a2e');gr.addColorStop(1,'#3a2616');g.fillStyle=gr;rr(g,-4,-h,8,h+2,3);g.fill()}
function buildSprites(){
  const R=(k,i)=>hash(i*7+k.length,k.length*13+i);
  const round=(i,base,light)=>makeSprite(g=>{trunk(g,22);const v=R('r',i);const col=shade(base,(v-.5)*18),lt=shade(light,(v-.5)*12);
    [[-12,-34,15],[12,-36,15],[0,-50,18],[-4,-42,14]].forEach(([x,y,r])=>radialBall(g,x+(R('x',i+x)-.5)*4,y,r*(.9+v*.2),col,lt));
    g.fillStyle='rgba(255,255,230,.12)';circ(g,-6,-56,6);g.fill()});
  const pine=(i,cols,snow)=>makeSprite(g=>{trunk(g,16);const v=R('p',i);for(let k=0;k<3;k++){const w=(27-k*6)*(.92+v*.16),yb=-10-k*16,gr=g.createLinearGradient(-w,0,w,0);
      gr.addColorStop(0,shade(cols[k],18));gr.addColorStop(.5,cols[k]);gr.addColorStop(1,shade(cols[k],-30));g.fillStyle=gr;g.beginPath();g.moveTo(-w,yb);g.quadraticCurveTo(0,yb+5,w,yb);g.lineTo(0,yb-31);g.closePath();g.fill();
      if(snow){const sg=g.createLinearGradient(0,yb-31,0,yb-12);sg.addColorStop(0,'#ffffff');sg.addColorStop(1,'#d8e6f0');g.fillStyle=sg;g.beginPath();g.moveTo(-w*.5,yb-14);g.quadraticCurveTo(0,yb-10,w*.5,yb-14);g.lineTo(0,yb-31);g.closePath();g.fill()}}});
  const cactus=i=>makeSprite(g=>{const v=R('c',i),col=v>.5?'#4f7a3a':'#5c8c44';const part=(x,y,w,h)=>{const gr=g.createLinearGradient(x,0,x+w,0);gr.addColorStop(0,shade(col,22));gr.addColorStop(.6,col);gr.addColorStop(1,shade(col,-30));g.fillStyle=gr;rr(g,x,y,w,h,w/2);g.fill()};
    part(-6,-48-v*6,12,48+v*6);part(-19,-34,8,18);part(-15,-21,10,6);part(11,-40,8,16);part(5,-27,10,6);g.fillStyle='rgba(255,255,220,.5)';for(let k=0;k<8;k++)circ(g,-3+(k%2)*6,-42+k*5,.7),g.fill();
    if(v>.6){g.fillStyle='#e85a8a';circ(g,0,-50-v*6,3);g.fill()}});
  const dead=i=>makeSprite(g=>{const v=R('d',i);g.strokeStyle='#4a4232';g.lineWidth=7;g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(3,-20,1+v*4,-42);g.stroke();g.lineWidth=3;
    for(const[a,l]of[[-2.3,22],[-.8,20],[-1.6,16],[-2.8,14],[-.4,12]]){g.beginPath();g.moveTo(1,-24-l*.3);g.quadraticCurveTo(1+Math.cos(a)*l*.5,-24-l*.3+Math.sin(a)*l*.5-4,1+Math.cos(a)*l,-24-l*.3+Math.sin(a)*l);g.stroke()}
    g.fillStyle='rgba(120,140,90,.6)';for(let k=0;k<5;k++){circ(g,-14+k*7,-30+((k*37)%11),2.5);g.fill()}});
  SPR.meadowRound=[0,1,2,3].map(i=>round(i,'#365a2e','#64884e'));SPR.meadowPine=[0,1,2,3].map(i=>pine(i,['#183020','#1e3c26','#24462c']));
  SPR.snow=[0,1,2,3].map(i=>pine(i,['#25412e','#2b4a34','#33553c'],true));SPR.desert=[0,1,2,3].map(cactus);
  SPR.forest=[0,1,2,3].map(i=>round(i,'#162818','#2e4a2a'));SPR.swampDead=[0,1,2,3].map(dead);SPR.swamp=[0,1,2,3].map(i=>round(i,'#3a4a28','#6a7a48'));
  // Ruin wall block
  SPR.wall=(()=>{const c=document.createElement('canvas');c.width=TILE*SS;c.height=(TILE*TILT+28)*SS;const g=c.getContext('2d');g.scale(SS,SS);const th=TILE*TILT,h=26;
    const fg=g.createLinearGradient(0,th,0,th+h);fg.addColorStop(0,'#77746b');fg.addColorStop(1,'#55524a');g.fillStyle=fg;rr(g,0,th-2,TILE,h+2,3);g.fill();
    const tg=g.createLinearGradient(0,0,0,th);tg.addColorStop(0,'#b2aea2');tg.addColorStop(1,'#928e83');g.fillStyle=tg;rr(g,0,0,TILE,th,4);g.fill();
    g.strokeStyle='rgba(0,0,0,.22)';g.lineWidth=1;for(const y of[th+8,th+17]){g.beginPath();g.moveTo(2,y);g.lineTo(TILE-2,y);g.stroke()}
    for(const[x,y0,y1]of[[16,th,th+8],[34,th,th+8],[8,th+8,th+17],[26,th+8,th+17],[42,th+8,th+17],[18,th+17,th+26],[36,th+17,th+26]]){g.beginPath();g.moveTo(x,y0);g.lineTo(x,y1);g.stroke()}
    g.fillStyle='rgba(90,120,60,.35)';circ(g,10,6,4);g.fill();circ(g,38,th-6,3);g.fill();return c})()}
function treeSprite(b,v){const i=Math.floor(v*3.999);if(b===B.DESERT)return SPR.desert[i];if(b===B.SNOW)return SPR.snow[i];if(b===B.FOREST)return SPR.forest[i];if(b===B.SWAMP)return v<.6?SPR.swampDead[i]:SPR.swamp[i];return v<.45?SPR.meadowPine[i]:SPR.meadowRound[i]}
function drawTree(tx,ty,v){const sx=tx*TILE+TILE/2-camX,sy=((ty+1)*TILE-10-camY)*TILT,b=bio[ty*MW+tx];softShadow(ctx,sx+4,sy,26,9,.85);
  const s=.94+v*.14;ctx.drawImage(treeSprite(b,v),sx-SAX*s,sy-SAY*s,SPW*s,SPH*s)}
function drawGround(){const k=TS/TILE;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  drawTerrainChunks();
  const x0=Math.max(0,Math.floor(camX/TILE)),x1=Math.min(MW-1,Math.floor((camX+W)/TILE)+1),y0=Math.max(0,Math.floor(camY/TILE)),y1=Math.min(MH-1,Math.floor((camY+H/TILT)/TILE)+1),th=TILE*TILT;
  ctx.lineCap='round';
  for(let y=y0;y<=y1;y++){const sy=(y*TILE-camY)*TILT;for(let x=x0;x<=x1;x++){const i=y*MW+x,t=map[i],v=tvar[i],sx=x*TILE-camX;
    if(t===T.WATER){const ph=rt*1.2+v*6;const a=.1+.08*Math.sin(ph);if(v>.35){ctx.strokeStyle=`rgba(255,255,255,${a})`;ctx.lineWidth=1.6;ctx.beginPath();const cx=sx+10+v*24,cy=sy+th*.5+Math.sin(ph)*3;ctx.moveTo(cx-8,cy);ctx.quadraticCurveTo(cx,cy-3,cx+8,cy);ctx.stroke()}}
    else if(t===T.GRASS&&v>.8){const b=bio[i];if(b===B.DESERT||b===B.SNOW)continue;ctx.strokeStyle=b===B.FOREST?'rgba(20,45,20,.55)':'rgba(40,80,30,.5)';ctx.lineWidth=1.4;const gx=sx+v*30,gy=sy+th*.7,sway=Math.sin(rt*2+v*9)*1.5;
      for(let n=0;n<4;n++){ctx.beginPath();ctx.moveTo(gx+n*3,gy);ctx.quadraticCurveTo(gx+n*3-1,gy-4,gx+n*3+sway+(n-1.5),gy-8-(n%2)*2);ctx.stroke()}
      if(v>.95){ctx.fillStyle=b===B.SWAMP?'#c8d86a':'#f0dc6a';circ(ctx,sx+18,sy+th*.45,2.2);ctx.fill();ctx.fillStyle='#fff6d0';circ(ctx,sx+18,sy+th*.45,.9);ctx.fill()}}}}
  ctx.lineCap='butt'}
function drawDecor(d){const[sx,sy]=S(d.x,d.y);switch(d.k){
  case'rock':ctx.fillStyle='rgba(0,0,0,.25)';ell(ctx,sx,sy,14,5);ctx.fill();ctx.fillStyle='#8a877e';ctx.beginPath();ctx.moveTo(sx-13,sy);ctx.lineTo(sx-9,sy-12);ctx.lineTo(sx+4,sy-15);ctx.lineTo(sx+13,sy-4);ctx.lineTo(sx+12,sy);ctx.fill();ctx.fillStyle='#a5a297';ctx.beginPath();ctx.moveTo(sx-9,sy-12);ctx.lineTo(sx+4,sy-15);ctx.lineTo(sx+2,sy-8);ctx.fill();break;
  case'bush':ctx.fillStyle=`hsl(${100+d.v*20},32%,22%)`;circ(ctx,sx-6,sy-6,8);ctx.fill();circ(ctx,sx+6,sy-7,8);ctx.fill();circ(ctx,sx,sy-12,8);ctx.fill();if(d.v>.6&&!((d.next||0)>time)){ctx.fillStyle='#c84a5a';ctx.shadowColor='#ff6a8a';ctx.shadowBlur=4;circ(ctx,sx+7,sy-5,1.8);ctx.fill();ctx.shadowBlur=0;circ(ctx,sx+3,sy-12,1.8);ctx.fill();circ(ctx,sx-5,sy-8,1.8);ctx.fill()}break;
  case'tent':ctx.fillStyle='rgba(0,0,0,.25)';ell(ctx,sx,sy,30,8);ctx.fill();ctx.fillStyle=d.c;ctx.beginPath();ctx.moveTo(sx-28,sy);ctx.lineTo(sx+28,sy);ctx.lineTo(sx,sy-44);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.moveTo(sx-7,sy);ctx.lineTo(sx+7,sy);ctx.lineTo(sx,sy-24);ctx.fill();ctx.strokeStyle='#3a2616';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,sy-44);ctx.lineTo(sx,sy-52);ctx.stroke();break;
  case'grave':ctx.fillStyle='rgba(0,0,0,.25)';ell(ctx,sx,sy,10,4);ctx.fill();ctx.fillStyle=d.v>.5?'#7d7a72':'#8e8b82';rr(ctx,sx-7,sy-22,14,22,6);ctx.fill();ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(sx-1,sy-17,2,9);ctx.fillRect(sx-4,sy-14,8,2);break;
  case'mound':ctx.fillStyle='#4f5a44';ell(ctx,sx,sy,95,40);ctx.fill();ctx.fillStyle='#5f6b52';ell(ctx,sx,sy-12,80,30);ctx.fill();ctx.fillStyle='#1a1c1e';rr(ctx,sx-16,sy-6,32,30,14);ctx.fill();ctx.fillStyle='#8a877e';ctx.fillRect(sx-20,sy-8,40,5);break;
  case'cave':ctx.fillStyle='#55524a';ell(ctx,sx,sy,110,46);ctx.fill();ctx.fillStyle='#6a665c';ell(ctx,sx,sy-16,90,36);ctx.fill();ctx.fillStyle='#121110';ctx.beginPath();ctx.ellipse(sx,sy+12,34,28,0,Math.PI,TAU);ctx.fill();break;
  case'bones':ctx.strokeStyle='#e0d8c4';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(sx-8,sy-2);ctx.lineTo(sx+8,sy-5);ctx.stroke();circ(ctx,sx-9,sy-2,2);ctx.fillStyle='#e0d8c4';ctx.fill();circ(ctx,sx+9,sy-5,2);ctx.fill();break;
  case'snowrock':ctx.fillStyle='rgba(0,0,0,.18)';ell(ctx,sx,sy,14,5);ctx.fill();ctx.fillStyle='#7a7f86';ctx.beginPath();ctx.moveTo(sx-13,sy);ctx.lineTo(sx-9,sy-12);ctx.lineTo(sx+4,sy-15);ctx.lineTo(sx+13,sy-4);ctx.lineTo(sx+12,sy);ctx.fill();ctx.fillStyle='#f2f6fa';ctx.beginPath();ctx.moveTo(sx-10,sy-10);ctx.lineTo(sx-9,sy-12);ctx.lineTo(sx+4,sy-15);ctx.lineTo(sx+11,sy-7);ctx.quadraticCurveTo(sx,sy-9,sx-10,sy-10);ctx.fill();break;
  case'skull':ctx.fillStyle='#ece4cc';circ(ctx,sx,sy-5,5);ctx.fill();ctx.fillRect(sx-3,sy-2,6,3);ctx.fillStyle='#2a2018';ctx.fillRect(sx-3,sy-6,2,2);ctx.fillRect(sx+1,sy-6,2,2);ctx.strokeStyle='#ece4cc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx+7,sy);ctx.lineTo(sx+18,sy-3);ctx.stroke();break;
  case'shroom':for(const[ox,oy,r]of[[0,0,6],[8,3,4],[-7,4,3.5]]){ctx.fillStyle='#e8dcc8';ctx.fillRect(sx+ox-1.5,sy+oy-r*1.2,3,r*1.2);ctx.fillStyle=d.v>.5?'#b8402a':'#8a5ab8';ctx.beginPath();ctx.ellipse(sx+ox,sy+oy-r*1.2,r,r*.7,0,Math.PI,TAU);ctx.fill()}break;
  case'web':ctx.strokeStyle='rgba(230,230,240,.35)';ctx.lineWidth=1;for(let k=0;k<6;k++){const a=k/6*TAU;ctx.beginPath();ctx.moveTo(sx,sy-8);ctx.lineTo(sx+Math.cos(a)*16,sy-8+Math.sin(a)*10);ctx.stroke()}for(const r of[6,11]){ctx.beginPath();ctx.ellipse(sx,sy-8,r,r*.62,0,0,TAU);ctx.stroke()}break;
  case'reeds':ctx.strokeStyle='#6a7a3a';ctx.lineWidth=2;for(let k=-3;k<=3;k++){ctx.beginPath();ctx.moveTo(sx+k*3,sy);ctx.quadraticCurveTo(sx+k*4,sy-12,sx+k*5+Math.sin(rt*2+k)*2,sy-22-Math.abs(k));ctx.stroke()}ctx.fillStyle='#5a3a1a';ctx.fillRect(sx-1,sy-26,3,8);break;
  case'stall':ctx.fillStyle='rgba(0,0,0,.25)';ctx.fillRect(sx-30,sy-2,60,8);ctx.fillStyle='#6a4a2a';ctx.fillRect(sx-28,sy-24,56,24);ctx.fillStyle='#8a6a3a';ctx.fillRect(sx-30,sy-26,60,5);ctx.fillStyle='#e8c24a';circ(ctx,sx-14,sy-29,4);ctx.fill();ctx.fillStyle='#c84a3a';circ(ctx,sx,sy-30,4);ctx.fill();ctx.fillStyle='#4a8ac8';circ(ctx,sx+12,sy-29,4);ctx.fill();
    ctx.fillStyle='#4a3020';ctx.fillRect(sx-28,sy-62,3,38);ctx.fillRect(sx+25,sy-62,3,38);for(let k=0;k<6;k++){ctx.fillStyle=k%2?'#e8dcc0':'#b8402a';ctx.fillRect(sx-32+k*11,sy-66,11,10)}break;
  case'fire':{ctx.fillStyle='#5a5650';for(let k=0;k<7;k++){const a=k/7*TAU;circ(ctx,sx+Math.cos(a)*14,sy+Math.sin(a)*6,3.5);ctx.fill()}
    for(let k=0;k<3;k++){const f=Math.sin(rt*12+k*2)*3;ctx.fillStyle=['#ff5a1a','#ff9a2a','#ffe08a'][k];ctx.beginPath();ctx.moveTo(sx-10+k*3,sy);ctx.lineTo(sx+10-k*3,sy);ctx.lineTo(sx+f,sy-28+k*7);ctx.closePath();ctx.fill()}
    if(Math.random()<.15)parts.push({x:d.x+rand(-5,5),y:d.y,z:20,vx:rand(-8,8),vy:0,vz:rand(40,80),life:1,max:1,col:'#ffb04a',size:1.6,ng:true});break}
  default:drawDecor2(d,sx,sy)}}
function drawDrop(d){const[sx,sy]=S(d.x,d.y);const b=Math.sin(rt*3+d.t)*3;ctx.fillStyle='rgba(0,0,0,.25)';ell(ctx,sx,sy,8,3);ctx.fill();
  if(d.kind==='gold'){ctx.fillStyle='#e8c24a';circ(ctx,sx,sy-6+b,5);ctx.fill();ctx.fillStyle='#fff3b0';circ(ctx,sx-1.5,sy-7.5+b,1.6);ctx.fill()}
  else if(d.kind==='sup'){ctx.fillStyle=SUP[d.sup].kind==='mp'?'#3a6ad8':'#d8343a';circ(ctx,sx,sy-8+b,6);ctx.fill();ctx.fillStyle='#ccc';ctx.fillRect(sx-2,sy-18+b,4,5);ctx.fillStyle='rgba(255,255,255,.5)';circ(ctx,sx-2,sy-10+b,1.6);ctx.fill()}
  else{const c=RAR[d.item.rar].c;if(d.item.rar>=2){const g=ctx.createLinearGradient(0,sy-90,0,sy);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,c+'88');ctx.fillStyle=g;ctx.fillRect(sx-5,sy-90,10,90)}
    ctx.shadowColor=c;ctx.shadowBlur=12;ctx.font='18px system-ui';ctx.textAlign='center';ctx.fillText(itemIcon(d.item),sx,sy-6+b);ctx.shadowBlur=0;
    const p=players[0];if(p&&Math.hypot(p.x-d.x,p.y-d.y)<170){ctx.font='12px Georgia';ctx.fillStyle='rgba(0,0,0,.7)';const w=ctx.measureText(d.item.name).width+10;ctx.fillRect(sx-w/2,sy-42+b,w,16);ctx.fillStyle=c;ctx.fillText(d.item.name,sx,sy-30+b)}}}
function drawProj(pr){const[sx,sy]=S(pr.x,pr.y);const h=22;ctx.fillStyle='rgba(0,0,0,.2)';ell(ctx,sx,sy,pr.r*.8,pr.r*.35);ctx.fill();
  if(pr.tr&&pr.tr.length>3&&pr.kind!=='axe'){ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';const n=pr.tr.length/2;for(let i=1;i<n;i++){const[a1,b1]=S(pr.tr[i*2-2],pr.tr[i*2-1]),[a2,b2]=S(pr.tr[i*2],pr.tr[i*2+1]);ctx.globalAlpha=i/n*(pr.kind==='arrow'?.5:.6);ctx.strokeStyle=pr.col;ctx.lineWidth=(pr.kind==='arrow'?2:pr.r*1.3)*i/n;ctx.beginPath();ctx.moveTo(a1,b1-h);ctx.lineTo(a2,b2-h);ctx.stroke()}ctx.restore()}
  if(pr.kind==='arrow'){const a=Math.atan2(pr.vy*TILT,pr.vx);ctx.save();ctx.translate(sx,sy-h);ctx.rotate(a);ctx.strokeStyle=pr.col;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-12,0);ctx.lineTo(8,0);ctx.stroke();ctx.fillStyle=pr.col;ctx.beginPath();ctx.moveTo(10,0);ctx.lineTo(5,-3);ctx.lineTo(5,3);ctx.fill();ctx.restore()}
  else if(pr.kind==='shield'){ctx.save();ctx.translate(sx,sy-h);ctx.rotate(rt*16);ctx.fillStyle='#a9b0b8';circ(ctx,0,0,10);ctx.fill();ctx.fillStyle='#2c4a8a';circ(ctx,0,0,7.5);ctx.fill();ctx.fillStyle='#e8c26a';ctx.fillRect(-1.5,-6,3,12);ctx.fillRect(-5,-1.5,10,3);ctx.restore()}
  else if(pr.kind==='axe'){ctx.save();ctx.translate(sx,sy-h);ctx.rotate(rt*14);drawWeapon(ctx,'axe',.6,{});ctx.restore()}
  else{ctx.save();ctx.globalCompositeOperation='lighter';const fl=1+.15*Math.sin(rt*30+pr.x),R=pr.r*4.2*fl;ctx.globalAlpha=.55;ctx.drawImage(glowSprite(pr.col),sx-R,sy-h-R,R*2,R*2);ctx.globalAlpha=1;
    const g=ctx.createRadialGradient(sx,sy-h,0,sx,sy-h,pr.r*2.2);g.addColorStop(0,'#fff');g.addColorStop(.4,pr.col);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;circ(ctx,sx,sy-h,pr.r*2.2);ctx.fill();
    if(pr.side==='player'){ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=1.2;const a=rt*8;for(let k=0;k<2;k++){const b=a+k*Math.PI/2;ctx.beginPath();ctx.moveTo(sx-Math.cos(b)*pr.r*1.8,sy-h-Math.sin(b)*pr.r*1.8);ctx.lineTo(sx+Math.cos(b)*pr.r*1.8,sy-h+Math.sin(b)*pr.r*1.8);ctx.stroke()}}ctx.restore()}}
function drawAreasGround(){for(const a of areas){const[sx,sy]=S(a.x,a.y);
  if(a.delay>0){const f=1-a.delay/a.delay0;
    if(a.kind==='line'){ctx.save();ctx.translate(sx,sy);ctx.scale(1,TILT);ctx.rotate(a.a);ctx.fillStyle=`rgba(220,50,40,${.15+.25*f})`;ctx.fillRect(0,-22,a.len,44);ctx.fillStyle=`rgba(255,80,60,${.35*f})`;ctx.fillRect(0,-22,a.len*f,44);ctx.restore();continue}
    const col=a.side==='player'?'255,140,40':'220,50,40';ctx.fillStyle=`rgba(${col},${.12+.18*f})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();ctx.fillStyle=`rgba(${col},${.3*f})`;ell(ctx,sx,sy,a.r*f,a.r*f*TILT);ctx.fill();ctx.strokeStyle=`rgba(${col},.8)`;ctx.lineWidth=2;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();continue}
  const fade=a.dur?Math.min(1,(a.dur-a.t)*3):1;
  switch(a.kind){
    case'holy':ctx.fillStyle=`rgba(255,215,110,${.16*fade})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();ctx.save();ctx.setLineDash([10,8]);ctx.lineDashOffset=-rt*30;ctx.strokeStyle=`rgba(255,225,140,${.7*fade})`;ctx.lineWidth=2;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();ctx.restore();break;
    case'meteor':ctx.fillStyle=`rgba(255,110,30,${(.18+.06*Math.sin(rt*20))*fade})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();break;
    case'rain':ctx.fillStyle=`rgba(220,210,180,${.1*fade})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();ctx.strokeStyle=`rgba(220,210,180,${.5*fade})`;ctx.lineWidth=1.5;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();break;
    case'bones':ctx.strokeStyle=`rgba(230,225,210,${.35*fade})`;ctx.lineWidth=2;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();break;
    case'curse':ctx.fillStyle=`rgba(150,60,200,${.3*(1-a.t/a.dur)})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();break;
    case'blizzard':ctx.fillStyle=`rgba(190,225,255,${.2*fade})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();ctx.strokeStyle=`rgba(230,245,255,${.6*fade})`;ctx.lineWidth=2;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();break;
    case'plague':ctx.fillStyle=`rgba(100,180,60,${(.16+.05*Math.sin(rt*4))*fade})`;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.fill();ctx.strokeStyle=`rgba(150,90,220,${.5*fade})`;ctx.lineWidth=2;ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();break;
    case'trap':ctx.fillStyle='#5a5246';ell(ctx,sx,sy,14,6);ctx.fill();ctx.strokeStyle='#bdb5a0';ctx.lineWidth=2;for(let k=0;k<8;k++){const an=k/8*TAU;ctx.beginPath();ctx.moveTo(sx+Math.cos(an)*9,sy+Math.sin(an)*4);ctx.lineTo(sx+Math.cos(an)*14,sy+Math.sin(an)*6-3);ctx.stroke()}break}}
  for(const f of fx)if(f.k==='ring'){const[sx,sy]=S(f.x,f.y);const k=1-f.life/f.max;ctx.strokeStyle=f.col;ctx.globalAlpha=1-k;ctx.lineWidth=4;ell(ctx,sx,sy,f.r*(.3+.7*k),f.r*(.3+.7*k)*TILT);ctx.stroke();ctx.globalAlpha=1}}
function drawAir(){for(const a of areas){const[sx,sy]=S(a.x,a.y);
  if((a.kind==='meteor'||a.kind==='boulder')&&a.delay>0){const f=a.delay/a.delay0;const mx=sx+180*f,my=sy-520*f;
    if(a.kind==='meteor'){ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(mx,my,0,mx,my,34);g.addColorStop(0,'#fff');g.addColorStop(.4,'#ff8a2a');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;circ(ctx,mx,my,34);ctx.fill();ctx.restore()}
    else{ctx.fillStyle='#7a7060';circ(ctx,mx,my,20);ctx.fill();ctx.fillStyle='#958a76';circ(ctx,mx-5,my-6,8);ctx.fill()}}
  if(a.kind==='bones'&&a.delay<=0){ctx.strokeStyle='#ece6d4';ctx.lineWidth=3;for(let k=0;k<12;k++){const an=rt*5+k/12*TAU,rr2=a.r*(.45+.45*((k%3)/2));const bx=sx+Math.cos(an)*rr2,by=sy+Math.sin(an)*rr2*TILT-18;ctx.beginPath();ctx.moveTo(bx-5*Math.cos(an+1),by-5*Math.sin(an+1));ctx.lineTo(bx+5*Math.cos(an+1),by+5*Math.sin(an+1));ctx.stroke()}}}
}
function render(){
  ctx.fillStyle=zone&&zone.kind!=='over'?'#050508':'#0d0b09';ctx.fillRect(0,0,W,H);
  drawGround();drawDecals();drawAreasGround();drawGroundFx();
  const x0=Math.max(0,Math.floor(camX/TILE)-1),x1=Math.min(MW-1,Math.floor((camX+W)/TILE)+1),y0=Math.max(0,Math.floor(camY/TILE)-1),y1=Math.min(MH-1,Math.floor((camY+H/TILT)/TILE)+3);
  const dl=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=map[y*MW+x];if(t===T.TREE){const v=tvar[y*MW+x];dl.push([(y+1)*TILE-10,()=>drawTree(x,y,v)])}else if(t===T.WALL){if(zone.kind==='over'||edgeTile(x,y))dl.push([(y+1)*TILE,()=>drawZoneWall(x,y)])}else if(t===T.ROCK&&edgeTile(x,y))dl.push([(y+1)*TILE,()=>drawRock(x,y)])}
  const inView=(o,m)=>o.x>camX-m&&o.x<camX+W+m&&o.y>camY-m&&o.y<camY+H/TILT+m;
  for(const b of buildings)if(inView({x:(b.x+b.w/2)*TILE,y:(b.y+b.d/2)*TILE},320))dl.push([(b.y+b.d)*TILE,()=>drawBuilding(b)]);
  for(const n of zone.npcs||[])if(inView(n,150))dl.push([n.y,()=>drawNPC(n)]);
  for(const d of decor)if(inView(d,150))dl.push([d.k==='mound'||d.k==='cave'||d.k==='crypt'||d.k==='cavemouth'?d.y-60:d.k==='bones'||d.k==='rug'?d.y-60:d.k==='counter'?d.y-10:d.k==='walltorch'?d.y-40:d.y,()=>drawDecor(d)]);
  for(const c of corpsesOf(zone))if(inView(c,100))dl.push([c.y-20,()=>drawCorpse(c)]);
  for(const d of drops)if(inView(d,80))dl.push([d.y,()=>drawDrop(d)]);
  {const pv=players[0];for(const e of enemies)if(inView(e,150)){const a=pv&&!pv.dead&&state==='play'?visAlpha(pv,e):1;if(a>0)dl.push([e.y,()=>{ctx.globalAlpha=a;drawUnit(e);ctx.globalAlpha=1}])}}
  for(const a of allies)if(inView(a,100))dl.push([a.y,()=>drawUnit(a)]);
  for(const p of players)dl.push([p.y,()=>drawPlayer(p)]);for(const a of Net.avatars.values())dl.push([a.y,()=>drawPlayer(a)]);
  if(zone.id==='over'&&inView(warden,150))dl.push([warden.y,drawWarden]);
  if(zone.id==='over'&&inView(merchant,150))dl.push([merchant.y,drawMerchant]);
  for(const pr of projs)if(inView(pr,60))dl.push([pr.y+2,()=>drawProj(pr)]);
  dl.sort((a,b)=>a[0]-b[0]);for(const d of dl)d[1]();
  drawAir();drawAirFx();
  drawParticles();
  drawFogBanks();drawMood();drawNight();if(state==='play')drawVisionHaze();drawDarkness();if(zone.warm){ctx.fillStyle='rgba(255,170,90,.06)';ctx.fillRect(0,0,W,H)}
  ctx.textAlign='center';for(const t of texts){const[sx,sy]=S(t.x,t.y);ctx.globalAlpha=Math.min(1,t.life*2);ctx.font=`bold ${t.size}px Georgia`;ctx.fillStyle='rgba(0,0,0,.7)';ctx.fillText(t.txt,sx+1,sy-t.z+1);ctx.fillStyle=t.col;ctx.fillText(t.txt,sx,sy-t.z)}ctx.globalAlpha=1;
  for(const d of decor)if(d.k==='fire'&&inView(d,300)){const[sx,sy]=S(d.x,d.y);ctx.save();ctx.globalCompositeOperation='lighter';const r=130+Math.sin(rt*9)*6;const g=ctx.createRadialGradient(sx,sy-10,0,sx,sy-10,r);g.addColorStop(0,'rgba(255,150,60,.28)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(sx-r,sy-10-r,r*2,r*2);ctx.restore()}
  if(state==='play'){drawQuestArrow();drawPrompt()}
  const vg=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.3,W/2,H/2,Math.max(W,H)*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.7)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);drawDread()}
function questTarget(){if(!zone||zone.id!=='over')return null;if(quest.state==='offer'||quest.state==='ready')return warden;if(quest.state==='active'){const q=QUESTS[quest.idx];if(q&&q.site)return tw(q.site)}return null}
// The quest marker guides you to the right area, melts away once you are there, and comes back if you wander off.
let questArrowA=1;const QUEST_AREA=18*TILE;
function drawQuestArrow(){const tg=questTarget(),p=players[0];if(!tg||!p||p.dead)return;const[sx,sy]=S(tg.x,tg.y),m=46,dd=Math.hypot(tg.x-p.x,tg.y-p.y);
  const inside=tg!==warden&&dd<QUEST_AREA;questArrowA+=((inside?0:1)-questArrowA)*Math.min(1,(inside?1.2:3)*(1/60));if(questArrowA<.02)return;
  ctx.save();ctx.globalAlpha=questArrowA;
  if(sx>m&&sx<W-m&&sy>m&&sy<H-m){if(tg!==warden){const b=Math.sin(rt*4)*5;ctx.fillStyle='#ffd84a';ctx.beginPath();ctx.moveTo(sx,sy-90+b);ctx.lineTo(sx+9,sy-104+b);ctx.lineTo(sx,sy-118+b);ctx.lineTo(sx-9,sy-104+b);ctx.fill()}ctx.restore();return}
  const cx=W/2,cy=H/2,a=Math.atan2(sy-cy,sx-cx),c=Math.cos(a),s=Math.sin(a),t=Math.min((W/2-m)/Math.abs(c||1e-6),(H/2-m)/Math.abs(s||1e-6));const px=cx+c*t,py=cy+s*t;
  ctx.translate(px,py);ctx.rotate(a);ctx.fillStyle='rgba(255,216,74,.9)';ctx.beginPath();ctx.moveTo(18,0);ctx.lineTo(-8,-11);ctx.lineTo(-3,0);ctx.lineTo(-8,11);ctx.closePath();ctx.fill();ctx.restore();
  ctx.save();ctx.globalAlpha=questArrowA;ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillStyle='#ffd84a';ctx.fillText(Math.round(dd/TILE)+' m',px-c*26,py-s*26+4);ctx.restore()}
// ================= HUD & UI =================
function buildAbar(p){const el=$('abar');el.innerHTML='';const lab=['LMB','RMB/1','2','3','4','R'];
  p.abil.forEach((a,i)=>{const d=document.createElement('div');d.className='slot';d.innerHTML=`<div class="ic">${a.icon}</div><div class="key">${lab[i]}</div><div class="cd"></div><div class="cdt"></div>`;
    d.onmouseenter=()=>showTip(`<div class="tn">${a.name}</div><div class="ts">${a.mana?a.mana+' mana · ':''}${a.cd}s cooldown${p.level<UNLOCK[i]?' · <span class="down">Unlocks at level '+UNLOCK[i]+'</span>':''}</div>${a.desc}`);d.onmouseleave=hideTip;el.appendChild(d)});
  const sup=(id,icon,key,tip,fn)=>{const d=document.createElement('div');d.className='slot';d.id=id;d.innerHTML=`<div class="ic">${icon}</div><div class="key">${key}</div><div class="cnt"></div><div class="cd"></div>`;d.onclick=fn;d.onmouseenter=()=>showTip(tip);d.onmouseleave=hideTip;el.appendChild(d)};
  sup('potSlot','🧪','Q','<div class="tn">Healing potion</div>Drinks the smallest healing potion that covers what you are missing. Potions share a short cooldown.',()=>drinkPotion(p,'hp'));
  sup('manaSlot','<span style="filter:hue-rotate(200deg)">🧪</span>','Z','<div class="tn">Mana potion</div>Drinks a mana potion.',()=>drinkPotion(p,'mp'));
  sup('foodSlot','🍖','X','<div class="tn">Eat or drink</div>Eats your best food for what you are missing. Restores over 15 seconds, but taking damage stops the meal. Not usable in combat.',()=>eatFood(p));
  {const h=document.createElement('div');h.className='slot';h.id='hearthSlot';h.innerHTML='<div class="ic">🏠</div><div class="key">H</div><div class="cd"></div><div class="cdt"></div>';h.onclick=()=>startHearth(p);h.onmouseenter=()=>showTip(`<div class="tn">Hearthstone</div>Teleport home to ${homeCity(p).name}. Stand still for ${HEARTH_CAST} s. Recharges in ${HEARTH_CD/60} minutes.<br><span class="muted">Talk to an innkeeper to change your home city.</span>`);h.onmouseleave=hideTip;el.appendChild(h)}
  if(p.mount){const m=document.createElement('div');m.className='slot';m.innerHTML=`<div class="ic">${MOUNTS[p.mount].icon}</div><div class="key">F</div>`;m.onclick=()=>toggleMount(p);m.onmouseenter=()=>showTip(`<div class="tn">${MOUNTS[p.mount].name}</div>${MOUNTS[p.mount].desc}<br>Press F to mount or dismount. Stand still to mount.`);m.onmouseleave=hideTip;el.appendChild(m)}}
function updateHud(){const p=players[0];if(!p)return;
  $('hName').textContent=p.name+' · '+CLASSES[p.cls].name;$('hLvl').textContent='Level '+p.level;
  $('hpF').style.width=(Math.max(0,p.hp)/p.maxHp*100)+'%';$('hpT').textContent=Math.max(0,Math.ceil(p.hp))+' / '+p.maxHp;
  $('mpF').style.width=(p.mana/p.maxMana*100)+'%';$('mpT').textContent=Math.floor(p.mana)+' / '+p.maxMana;
  $('hint').style.opacity=time<90||keys.F1?1:0;// the key help fades after a minute and a half (hold F1 to see it again)
  {const hf=Math.max(0,p.hp)/p.maxHp,o=$('orbHp'),m=$('orbMp');o.children[0].style.height=hf*100+'%';o.children[2].textContent=Math.max(0,Math.ceil(p.hp));o.classList.toggle('low',hf<.3&&!p.dead);m.children[0].style.height=p.mana/p.maxMana*100+'%';m.children[2].textContent=Math.floor(p.mana)}
  $('xpF').style.width=(p.level>=20?100:p.xp/xpNeed(p.level)*100)+'%';$('hGold').textContent=p.gold;
  const pts=$('pts'),pp=[];if(p.points>0)pp.push(p.points+' attribute (I)');if(p.tpoints>0)pp.push(p.tpoints+' talent (T)');
  if(pp.length){pts.classList.remove('hidden');pts.textContent='+ '+pp.join(' · ')}else pts.classList.add('hidden');
  const slots=$('abar').children;for(let i=0;i<6;i++){const s=slots[i];if(!s)continue;const locked=p.level<UNLOCK[i];s.classList.toggle('locked',locked);s.classList.toggle('nomana',!locked&&p.mana<p.abil[i].mana);
    const cd=p.cds[i];s.children[2].style.height=(locked?100:cd>0?cd/p.cdMax[i]*100:0)+'%';s.children[3].textContent=locked?'Lv '+UNLOCK[i]:cd>0&&i>0?(cd>=1?Math.ceil(cd):cd.toFixed(1)):''}
  {const cnt=kind=>Object.keys(SUP).filter(k=>SUP[k].kind===kind).reduce((t,k)=>t+supCount(p,k),0);
    for(const[id,kind]of[['potSlot','hp'],['manaSlot','mp'],['foodSlot','food']]){const e=$(id);if(!e)continue;const n=cnt(kind);e.children[2].textContent=n||'';e.classList.toggle('nomana',!n);
      e.children[3].style.height=(kind==='food'?(p.eat?p.eat.left/EAT_TIME*100:0):p.potCd/POT_CD*100)+'%'}}
  renderBuffs(p);
  {const h=$('hearthSlot');if(h){const cd=Math.max(0,(p.hearthCd||0)-time);h.children[2].style.height=(p.hearthCast>0?(1-p.hearthCast/HEARTH_CAST)*100:cd/HEARTH_CD*100)+'%';h.children[2].style.background=p.hearthCast>0?'rgba(120,200,255,.5)':'rgba(0,0,0,.68)';h.children[3].textContent=cd>0?Math.ceil(cd)+'':''}}
  let boss=null,bd=900;for(const e of enemies)if(e.boss&&e.target&&dist(e,p)<bd){bd=dist(e,p);boss=e}
  const bb=$('bossbar');if(boss){bb.classList.remove('hidden');$('bossName').textContent=boss.name+' · Level '+boss.lvl+(boss.enraged?' · ENRAGED':'');$('bossF').style.width=(boss.hp/boss.maxHp*100)+'%'}else bb.classList.add('hidden');
  partyT-=1/60;if(partyT<=0){partyT=.25;renderParty()}
  drawMini()}
function updateQuestUI(){const q=QUESTS[quest.idx],el=$('quest');
  if(!q||quest.state==='done'){el.innerHTML='<b>The road goes on</b><br>All quests complete. Roam the wilds, grow stronger and hunt for gear. More adventures are coming.';return}
  if(quest.state==='offer'){el.innerHTML=`<b>New quest</b><br>Speak with Old Warden Bram in Emberfall (E).`;return}
  if(quest.state==='ready'){el.innerHTML=`<b>${q.title}</b><br><span style="color:#9fe07a">Complete!</span> Return to the Warden.`;return}
  el.innerHTML=`<b>${q.title}</b> <span class="muted">(level ${q.rec}+)</span><br>${q.goal}${q.need>1?`<br>Progress: ${quest.prog} / ${q.need}`:''}`}
function showTip(h){const t=$('tip');t.innerHTML=h;t.classList.remove('hidden');t.style.left=Math.min(mouse.x+16,innerWidth-300)+'px';t.style.top=Math.min(mouse.y+16,innerHeight-t.offsetHeight-8)+'px'}
function hideTip(){$('tip').classList.add('hidden')}
function itemTip(it,cmp){let h=`<div class="tn" style="color:${RAR[it.rar].c}">${itemIcon(it)} ${it.name}</div><div class="ts">${RAR[it.rar].n} ${SLOTNAME[it.slot]} · item level ${it.lvl}</div>`;
  if(it.wt)h+=`<div class="ts">${WTYPE_NAME[it.wt]} · trains your ${SKILL_NAME[it.wt]} skill</div>`;for(const k in it.stats)h+=`<div>+${it.stats[k]} ${STATLBL[k]}</div>`;
  if(it.ench){h+=`<div style="color:#7aff9a">Enchanted: ${it.ench.n}</div>`;for(const k in it.ench.stats)h+=`<div style="color:#7aff9a">+${it.ench.stats[k]} ${STATLBL[k]}</div>`}
  if(it.bs)h+=`<div style="color:#ffb060">⚒️ +${it.bs.v} ${STATLBL[it.bs.k]} <span class="muted">(tempered)</span></div>`;if(it.en)h+=`<div style="color:#c890ff">✨ +${it.en.v} ${STATLBL[it.en.k]} <span class="muted">(enchanted)</span></div>`;
  if(cmp===undefined)return h;
  if(!cmp)return h+'<div class="ts" style="margin-top:6px">Slot is empty</div>';
  h+='<div class="ts" style="margin-top:6px">Compared with equipped:</div>';const A=itemStats(it),B=itemStats(cmp),ks=new Set([...Object.keys(A),...Object.keys(B)]);let any=false;
  for(const k of ks){const d=(A[k]||0)-(B[k]||0);if(!d)continue;any=true;h+=`<div class="${d>0?'up':'down'}">${d>0?'+':''}${d} ${STATLBL[k]}</div>`}return h+(any?'':'<div class="ts">Same stats</div>')}
function cellHtml(it,label){return it?`<span style="filter:drop-shadow(0 0 5px ${RAR[it.rar].c})">${itemIcon(it)}</span>`:`<small>${label||''}</small>`}
function fmtLeft(t){return t>=60?Math.ceil(t/60)+'m':Math.ceil(t)+'s'}
function renderBuffs(p){const el=$('buffs');if(!el||rt<(el.t||0))return;el.t=rt+.5;const list=[];if(p.eat)list.push({icon:p.eat.icon,n:'Eating '+p.eat.n,left:p.eat.left});for(const k in p.buffs)list.push(p.buffs[k]);
  el.innerHTML=list.map(b=>`<span class="buff" title="${b.n}">${b.icon}<small>${fmtLeft(b.left)}</small></span>`).join('')}
// The hero preview in the character panel shows your equipped gear.
function drawInvPreview(){const cv=$('invPrev');if(!cv||!invOpen)return;const p=players[0];if(!p)return;const c=cv.getContext('2d');c.clearRect(0,0,cv.width,cv.height);
  c.fillStyle='rgba(0,0,0,.35)';ell(c,cv.width/2,cv.height-18,40,11);c.fill();const o=playerLook(p);o.s=2.2;o.aim=Math.sin(rt*.7)*.5;o.aimS=o.aim;o.walk=0;o.moving=false;drawHumanoid(c,cv.width/2,cv.height-18,o)}
function renderInv(){const p=players[0];if(!p)return;const eq=$('equip');eq.innerHTML='';
  for(const sl of SLOTS){const it=p.gear[sl];const d=document.createElement('div');d.className='cell';d.style.borderColor=it?RAR[it.rar].c:'';d.innerHTML=cellHtml(it,SLOTNAME[sl]);
    d.onmouseenter=()=>{if(it)showTip(itemTip(it)+'<div class="ts" style="margin-top:6px">Click to unequip</div>')};d.onmouseleave=hideTip;
    d.onclick=()=>{if(!it)return;if(p.bag.length>=p.bagSize){toast('Bag is full');return}p.bag.push(it);p.gear[sl]=null;calcStats(p);hideTip();renderInv()};eq.appendChild(d)}
  const s=p.stats,pt=p.points>0,st=s.attrs,ms=s.main,hc=hitChance(p,{lvl:p.level});
  const attr=(k,n,what)=>`<div class="st"><span>${n}${k===ms?' <span style="color:var(--gold)">★</span>':''} <span class="muted">(${what})</span></span><span>${st[k]}${pt?`<button data-a="${k}">+${ATTR_PT}</button>`:''}</span></div>`;
  $('stats').innerHTML=`<div class="st"><span>Level ${p.level} ${CLASSES[p.cls].name}</span><span class="muted">${p.level>=20?'Max level':p.xp+' / '+xpNeed(p.level)+' XP'}</span></div>
   <div class="st"><span>Attribute points <span class="muted">(each gives +${ATTR_PT})</span></span><span style="color:${pt?'#9fe07a':'inherit'}">${p.points}</span></div>
   ${attr('str','Strength',ms==='str'?'+0.7% damage each':'main stat of Paladins')}${attr('agi','Agility',(ms==='agi'?'+0.7% damage, ':'')+'faster basic attacks')}
   ${attr('int','Intellect',(ms==='int'?'+0.7% damage, ':'')+'+2 mana, mana regen')}${attr('sta','Stamina','+3 health each')}
   <div class="st"><span>Health</span><span>${p.maxHp}</span></div><div class="st"><span>Mana</span><span>${p.maxMana}</span></div>
   <div class="st"><span>Damage</span><span>${s.dmg.toFixed(1)}</span></div><div class="st"><span>Armor</span><span>${s.armor} <span class="muted">(−${Math.round(100-10000/(100+s.armor))}%)</span></span></div>
   <div class="st"><span>Hit chance <span class="muted">(same-level foe, −5% per level above you)</span></span><span>${Math.round(hc*100)}%</span></div>
   <div class="st"><span>Critical chance <span class="muted">(needs ${CRIT_MIN_HIT*100}%+ hit)</span></span><span>${Math.round(s.crit*100)}%</span></div>
   <div class="st"><span>Attack speed</span><span>+${Math.round(s.haste*100)}%</span></div><div class="st"><span>Cooldown reduction</span><span>${Math.round(s.cdr*100)}%</span></div>
   <div class="st"><span>Move speed</span><span>${Math.round(s.speed)}</span></div><div class="st"><span>Gold</span><span>🪙 ${p.gold}</span></div>
   ${Object.keys(p.buffs).length?`<div class="st" style="margin-top:8px"><b style="font-weight:normal;color:var(--gold)">Active effects</b><span></span></div>`+Object.values(p.buffs).map(b=>`<div class="st"><span>${b.icon} ${b.n} <span class="muted">${Object.entries(b.stats).map(([k,v])=>'+'+v+' '+STATLBL[k]).join(', ')}</span></span><span>${fmtLeft(b.left)}</span></div>`).join(''):''}
   <div class="st" style="margin-top:8px"><b style="font-weight:normal;color:var(--gold)">Skills</b><span class="muted">max ${skillCap(p)} at your level</span></div>
   ${[...new Set([wtypeOf(p),...Object.keys(p.skills).filter(k=>k!=='spell')])].map(k=>`<div class="st"><span>${SKILL_NAME[k]}${k===wtypeOf(p)?' <span class="muted">(equipped)</span>':''}</span><span>${skillOf(p,k)} <span class="muted">(+${Math.round(skillOf(p,k)/2.5)}% weapon hits)</span></span></div>`).join('')}
   <div class="st"><span>Spellcraft</span><span>${skillOf(p,'spell')} <span class="muted">(+${Math.round(skillOf(p,'spell')/3)}% spells & heals)</span></span></div>
   <div class="st" style="margin-top:8px"><b style="font-weight:normal;color:var(--gold)">Mounts</b><span class="muted">F to ride</span></div>${p.mounts.length?p.mounts.map(k=>`<div class="st"><span>${MOUNTS[k].icon} ${MOUNTS[k].name}</span><span>${p.mount===k?'Active':`<button data-m="${k}">Use</button>`}</span></div>`).join(''):'<div class="st"><span class="muted">None yet. Visit a stable.</span></div>'}
   <div class="st"><span>${p.bagName||'Starter Pouch'}</span><span>${p.bagSize} slots</span></div>`;
  for(const b of $('stats').querySelectorAll('button[data-m]'))b.onclick=()=>{p.mount=b.dataset.m;if(p.mounted)dismount(p,true);renderInv();save()};
  for(const b of $('stats').querySelectorAll('button[data-a]'))b.onclick=()=>{if(p.points<=0)return;p.points--;p.attr[b.dataset.a]=(p.attr[b.dataset.a]||0)+1;const hpf=p.hp/p.maxHp;calcStats(p);p.hp=Math.round(p.maxHp*hpf);renderInv();save()};
  const bag=$('bag');bag.innerHTML='';for(let i=0;i<p.bagSize;i++){const it=p.bag[i];const d=document.createElement('div');d.className='cell';if(it)d.style.borderColor=RAR[it.rar].c;d.innerHTML=cellHtml(it);
    if(it){d.onmouseenter=()=>showTip(itemTip(it,p.gear[it.slot]||null)+`<div class="ts" style="margin-top:6px">Click: equip · Sells for ${sellPrice(it)} gold at any shop</div>`);d.onmouseleave=hideTip;
      d.onclick=()=>{const old=p.gear[it.slot];p.gear[it.slot]=it;p.bag.splice(i,1);if(old)p.bag.push(old);calcStats(p);hideTip();renderInv();save()};
      d.oncontextmenu=e=>{e.preventDefault();toast('Sell loot at any shop')}}
    bag.appendChild(d)}
  // Supplies: potions, food, drink and everyday crafts. Click to use.
  const su=$('supplies');su.innerHTML='';const ks=Object.keys(SUP).filter(k=>supCount(p,k)>0);
  if(!ks.length)su.innerHTML='<div class="muted" style="grid-column:1/-1">No supplies. Buy potions at a General Store, gather berries and water, or craft with Alchemy and Cooking.</div>';
  for(const k of ks){const d=document.createElement('div');d.className='cell';d.innerHTML=`${supHtml(k)}<span class="qty">${supCount(p,k)}</span>`;
    d.onmouseenter=()=>showTip(`<div class="tn">${supName(k)}</div>${supDesc(k,p)}<div class="ts" style="margin-top:6px">Click to use</div>`);d.onmouseleave=hideTip;
    d.onclick=()=>{hideTip();useSup(p,k);renderInv()};su.appendChild(d)}}
function sellPrice(it){return Math.round((3+it.lvl*2)*(1+it.rar*1.5))}
// ---- Talents panel
function treeEl(p,tr,title){const d=document.createElement('div');d.className='branch';const bp=treePts(p,tr);d.innerHTML=`<h3>${title} <span class="muted">(${bp} points)</span></h3>`;
  tr.t.forEach(t=>{const r=p.talents[t.id]||0,req=t.req||0,locked=bp<req&&r===0,can=!locked&&p.tpoints>0&&r<t.max;const b=document.createElement('button');
    b.className='tnode'+(r>=t.max?' max':can?' can':locked?' lock':'');b.innerHTML=`<b>${t.n}</b><span>${r}/${t.max}</span><small>${t.d}${locked?`<br>Needs ${req} points in this tree`:''}</small>`;
    b.onclick=()=>{if(!can)return;p.talents[t.id]=r+1;p.tpoints--;sfx('click');const hpf=p.hp/p.maxHp;calcStats(p);p.hp=p.maxHp*hpf;renderTal();save()};d.appendChild(b)});return d}
function renderTal(){const p=players[0];if(!p)return;$('talPts').textContent=`${p.tpoints} talent point${p.tpoints===1?'':'s'} to spend`;const el=$('talTree');el.innerHTML='';
  const T2=TAL[p.cls];el.appendChild(treeEl(p,T2.core,CLASSES[p.cls].name+' (class)'));
  const s=specOf(p);
  if(s){const tr=treeEl(p,{b:s.name,t:s.tree},s.icon+' '+s.name);tr.querySelector('h3').insertAdjacentHTML('afterend',`<div class="specinfo">Passive: ${s.passiveText}<br>Signature: ${s.ability.icon} ${s.ability.name} (R)</div>`);tr.classList.add('wide');el.appendChild(tr)}
  else{const box=document.createElement('div');box.className='branch wide';
    if(p.level<SPEC_LEVEL){box.innerHTML=`<h3>Specialization</h3><p class="muted" style="text-align:center">At level ${SPEC_LEVEL} you choose one of three specializations. Each gives a passive bonus, a signature ability and its own talent tree.</p>`+Object.values(T2.specs).map(x=>`<div class="speccard dim"><b>${x.icon} ${x.name}</b><small>${x.desc}</small></div>`).join('')}
    else{box.innerHTML=`<h3>Choose your specialization</h3><p class="muted" style="text-align:center">This shapes how your ${CLASSES[p.cls].name} plays from now on. You can change it later at any General Store.</p>`;
      for(const[k,x]of Object.entries(T2.specs)){const c=document.createElement('div');c.className='speccard';c.innerHTML=`<b>${x.icon} ${x.name}</b><small>${x.desc}</small><small>Passive: ${x.passiveText}</small><small>Signature: ${x.ability.icon} <b>${x.ability.name}</b>: ${x.ability.desc}</small>`;
        const btn=document.createElement('button');btn.className='btn primary';btn.textContent='Choose '+x.name;btn.onclick=()=>{chooseSpec(p,k);renderTal()};c.appendChild(btn);box.appendChild(c)}}
    el.appendChild(box)}}
function toggleTal(v){talOpen=v===undefined?!talOpen:v;if(talOpen){toggleInv(false);closeShop()}$('tal').classList.toggle('hidden',!talOpen);hideTip();if(talOpen){mouse.l=false;renderTal()}}
// ---- Merchant
const merchant={x:(VC.x-1.5)*TILE,y:(VC.y-.5)*TILE,r:14,aim:0};
const buyPrice=it=>sellPrice(it)*5,potionPrice=p=>10+p.level*4,respecPrice=p=>15*p.level;
function closeShop(){shopOpen=false;$('shop').classList.add('hidden');hideTip()}
function drawMerchant(){const[sx,sy]=S(merchant.x,merchant.y);const p=players[0];if(p)merchant.aim=Math.atan2(p.y-merchant.y,p.x-merchant.x);
  ctx.fillStyle='rgba(0,0,0,.3)';ell(ctx,sx,sy,14,6);ctx.fill();
  drawHumanoid(ctx,sx,sy,{s:1,skin:'#d9a47a',hair:'#8a2d1c',cloth:'#8a5a2a',hat:'hood',hatColor:'#b8402a',aim:merchant.aim,walk:0,legs:'#3a2a1a'});
  const b=Math.sin(rt*3)*3;ctx.font='20px system-ui';ctx.textAlign='center';ctx.fillText('🪙',sx,sy-70+b);ctx.font='12px Georgia';ctx.fillStyle='#e8dcb8';ctx.fillText('Tilda the Trader',sx,sy-56);
  if(p&&!p.dead&&dist(p,merchant)<95&&!shopOpen&&!(dist(p,warden)<95)){ctx.font='bold 13px system-ui';ctx.fillStyle='#fff';ctx.fillText('[E] Trade',sx,sy+22)}}
function toggleInv(v){invOpen=v===undefined?!invOpen:v;if(invOpen){talOpen=false;$('tal').classList.add('hidden');closeShop()}$('inv').classList.toggle('hidden',!invOpen);hideTip();if(invOpen){mouse.l=false;renderInv()}}
function togglePause(){$('btnQuit').textContent=Net.role==='guest'?'Leave party':Net.role==='host'?'Save & quit (ends the party)':'Save & quit to menu';pauseOpen=!pauseOpen;$('pause').classList.toggle('hidden',!pauseOpen);mouse.l=false;if(pauseOpen)save()}
function openDialog(){const q=QUESTS[quest.idx];dialogOpen=true;$('dWho').textContent='Old Warden Bram';mouse.l=false;$('dialog').classList.remove('hidden');const btns=$('dBtns');btns.innerHTML='';
  const btn=(txt,fn,pri)=>{const b=document.createElement('button');b.className='btn'+(pri?' primary':'');b.textContent=txt;b.onclick=fn;btns.appendChild(b)};$('dGoal').textContent='';
  if(!q||quest.state==='done'){$('dTitle').textContent='Peace, for now';$('dText').textContent='The lamps burn again, thanks to you. But the world is wide, and darker things stir beyond the hills. Rest, grow stronger, and be ready. More adventures are coming.';btn('Farewell',closeDialog,true);return}
  $('dTitle').textContent=q.title;
  if(quest.state==='offer'){$('dText').textContent=q.text;$('dGoal').textContent='Goal: '+q.goal+' · Recommended level '+q.rec+(players[0].level<q.rec-1?' (you may want to grow stronger first)':'');btn('Not yet',closeDialog);btn('Accept quest',()=>{quest.state='active';quest.prog=0;sfx('accept');updateQuestUI();closeDialog();toast('Quest accepted: '+q.title,'gold');save()},true)}
  else if(quest.state==='active'){$('dText').textContent=q.wait;$('dGoal').textContent='Goal: '+q.goal+(q.need>1?` (${quest.prog}/${q.need})`:'');btn('Farewell',closeDialog,true)}
  else{$('dText').textContent=q.done;const R=q.reward;$('dGoal').textContent=`Reward: ${R.xp} XP · ${R.potions} potions · a ${RAR[R.rar].n.toLowerCase()} item`;
    btn('Claim reward',()=>{const p=players[0];sfx('quest');gainXp(p,R.xp);addSup(p,'hp'+potTier(p.level),R.potions);const it=genItem(p.level+1,R.rar,p.cls);if(p.bag.length<p.bagSize)p.bag.push(it);else drops.push({kind:'item',item:it,x:p.x+20,y:p.y,t:0});
      toast('Received '+it.name,'gold');quest.idx++;quest.prog=0;quest.state=quest.idx<QUESTS.length?'offer':'done';updateQuestUI();closeDialog();save();if(quest.state==='done')setTimeout(showVictory,600);if(quest.state==='offer')setTimeout(()=>{if(!dialogOpen&&state==='play')openDialog()},400)},true)}}
function closeDialog(){dialogOpen=false;$('dialog').classList.add('hidden')}

// ================= Save =================
const SAVE_KEY='emberfall-save-v1';
function save(){const p=players[0];if(!p||state!=='play')return;storeExplored(p);Account.write(heroId,netSaveFix({p:{name:p.name,loc:zone.id==='over'?locName(p.x/TILE,p.y/TILE):zone.name,cls:p.cls,look:p.look,level:p.level,xp:p.xp,gold:p.gold,sup:p.sup,buffs:p.buffs,gear:p.gear,bag:p.bag,attr:p.attr,points:p.points,talents:p.talents,tpoints:p.tpoints,spec:p.spec,shop:p.shop,skills:p.skills,prof:p.prof,mats:p.mats,mounts:p.mounts,mount:p.mount,light:p.light,bagSize:p.bagSize,lootBonus:p.lootBonus,bagName:p.bagName,home:p.home,explored:p.explored,ws:OW,seed:p.seed,kills:p.kills,deaths:p.deaths,playT:p.playT,x:p.dead||zone.id!=='over'?0:p.x,y:p.dead||zone.id!=='over'?0:p.y},quest}))}

// ================= Screens =================
const LOOKS={skin:['#f6d5b8','#f1c9a5','#d9a47a','#b47a52','#8a5a3a','#5e3d26'],hair:['#1e1510','#4a2e1a','#6b4423','#c9a25a','#e8d8b0','#d8d4cc','#8a2d1c','#3a4a6a'],
  eyes:['#1b140e','#3a6ab8','#3a8a4a','#7a5a2a','#8a8a98'],cloth:['#7a1f1f','#1f3f7a','#2f5a2a','#4a2f6a','#7a6a4a','#2a2a2a','#a85a1a','#2a6a6a'],trim:['#e8c26a','#c0c4c8','#8a2d1c','#1a1a1a','#e8e0d0','#4a8ac8']};
const CYCLE={body:[['slim','Slim'],['normal','Normal'],['broad','Broad']],hairStyle:[['short','Short'],['long','Long'],['ponytail','Ponytail'],['braids','Braids'],['mohawk','Mohawk'],['bald','Bald']],
  beard:[['none','None'],['stubble','Stubble'],['full','Full'],['long','Long']],headgear:[[true,'Shown'],[false,'Hidden']]};
const LOOK_ROWS=[['body','Body'],['hairStyle','Hair'],['beard','Beard'],['headgear','Headgear'],['skin','Skin'],['hair','Hair color'],['eyes','Eyes'],['cloth','Garb'],['trim','Trim']];
const NAMES=['Elric','Maren','Thoren','Ilsa','Corwin','Aeryn','Halden','Brisa','Eowan','Tamsin','Rurik','Liora'];
let cr={cls:'sorcerer',look:{body:'normal',hairStyle:'short',beard:'none',headgear:true,skin:LOOKS.skin[1],hair:LOOKS.hair[2],eyes:LOOKS.eyes[0],cloth:LOOKS.cloth[1],trim:LOOKS.trim[0]}};
function renderLooks(){const el=$('looks');el.innerHTML='';
  for(const[k,label]of LOOK_ROWS){const row=document.createElement('div');row.className='lrow';row.innerHTML=`<span class="ll">${label}</span>`;
    if(CYCLE[k]){const opts=CYCLE[k],i=Math.max(0,opts.findIndex(o=>o[0]===cr.look[k]));const mk=(t,d)=>{const b=document.createElement('button');b.className='cyb';b.textContent=t;b.onclick=()=>{cr.look[k]=opts[(i+d+opts.length)%opts.length][0];renderLooks()};return b};
      row.appendChild(mk('◀',-1));const v=document.createElement('span');v.className='cyv';v.textContent=opts[i][1];row.appendChild(v);row.appendChild(mk('▶',1))}
    else{const sw=document.createElement('div');sw.className='sw';for(const c of LOOKS[k]){const b=document.createElement('b');b.style.background=c;if(cr.look[k]===c)b.className='on';b.onclick=()=>{cr.look[k]=c;renderLooks()};sw.appendChild(b)}row.appendChild(sw)}
    el.appendChild(row)}}
function randomLook(){for(const k in CYCLE)cr.look[k]=pick(CYCLE[k])[0];for(const k in LOOKS)cr.look[k]=pick(LOOKS[k]);cr.look.headgear=Math.random()<.7;renderLooks()}
function buildCreator(){$('nameIn').value=pick(NAMES);renderLooks();
  const cl=$('classes');cl.innerHTML='';for(const k in CLASSES){const c=CLASSES[k],d=document.createElement('div');d.className='card'+(cr.cls===k?' on':'');
    d.innerHTML=`<h3>${c.icon} ${c.name}</h3><p>${c.desc}</p><ul>${ABIL[k].map((a,i)=>`<li>${a.icon} ${a.name}${UNLOCK[i]>1?` <span class="muted">(level ${UNLOCK[i]})</span>`:''}</li>`).join('')}</ul><p class="muted" style="margin:8px 0 0">Level 10 specializations: ${Object.values(TAL[k].specs).map(s=>s.icon+' '+s.name).join(' · ')}</p>`;
    d.onclick=()=>{cr.cls=k;for(const x of cl.children)x.classList.remove('on');d.classList.add('on')};cl.appendChild(d)}}
function drawPreview(){const c=$('prev').getContext('2d');c.clearRect(0,0,260,280);c.fillStyle='rgba(0,0,0,.35)';ell(c,130,236,44,13);c.fill();
  const o=playerLook({cls:cr.cls,look:cr.look});o.s=2.6;o.aim=Math.sin(rt*.8)*.6;o.aimS=o.aim;o.walk=rt*4;drawHumanoid(c,130,236,o)}
function show(id){for(const s of['login','title','creator','death','pause'])$(s).classList.toggle('hidden',s!==id)}
function resetWorld(){if(zones.over&&zones.over.gateOpen){for(const i of zones.over.barrowGate)zones.over.map[i]=T.WALL;zones.over.gateOpen=false;zones.over.terrain.chunks.clear()}for(const d of zones.over.decor)delete d.next;for(const k in zones)if(k!=='over')delete zones[k];zones.over.fog=null;zones.over.cells=null;zones.over.corpses=[];for(const b of zones.over.buildings)b.stock=null;zones.over.enemies=[];zones.over.drops=[];useZone(zones.over);enemies=[];allies=[];projs=[];areas=[];parts=[];texts=[];drops=[];fx=[];players=[];flags={};time=0}
function startGame(data,isNew,id){heroId=id||Account.newId();ensureWorld(Net.role==='guest'?Net.host.seed:data.p.seed||0);resetWorld();closeLoot();lootReset();quest=data.quest||{idx:0,state:'offer',prog:0};const p=createPlayer(data.p);p.id=0;players=[p];
  state='play';show(null);$('hud').classList.remove('hidden');buildAbar(p);updateQuestUI();invOpen=dialogOpen=pauseOpen=talOpen=shopOpen=storyOpen=false;for(const id of['inv','tal','shop','dialog','intro','victory'])$(id).classList.add('hidden');
  if(isNew)showStory('intro',true);save()}
function beginGame(){const name=($('nameIn').value||'').trim().slice(0,16)||pick(NAMES);startGame({p:{name,cls:cr.cls,look:Object.assign({},cr.look),seed:newWorldSeed()}},true)}
function newHero(){if(state!=='play'&&SEL.heroes.length>=MAX_HEROES){toast(`You can have ${MAX_HEROES} heroes. Delete one to make room.`,'danger');return}if(state==='play')save();
  pauseOpen=false;invOpen=talOpen=shopOpen=dialogOpen=storyOpen=false;for(const id of['inv','tal','shop','dialog','intro','victory'])$(id).classList.add('hidden');$('hud').classList.add('hidden');state='creator';players=[];show('creator');buildCreator()}
$('btnNew').onclick=newHero;$('btnNew2').onclick=newHero;
$('btnSaveG').onclick=()=>{save();toast('Game saved','gold')};$('btnQuit').onclick=saveAndQuit;
$('btnBack').onclick=()=>openSelect();
$('btnBegin').onclick=beginGame;$('btnResume').onclick=togglePause;$('invClose').onclick=()=>toggleInv(false);
$('pts').onclick=()=>{const p=players[0];if(p&&p.points<=0&&p.tpoints>0)toggleTal(true);else toggleInv(true)};
$('talClose').onclick=()=>toggleTal(false);$('shopClose').onclick=closeShop;
$('sellJunk').onclick=()=>{const p=players[0];let g=0;p.bag=p.bag.filter(it=>{if(it.rar===0){g+=sellPrice(it);return false}return true});p.gold+=g;if(g)toast('Sold common items for '+g+' gold');renderShop();save()};
let setFrom=null;
function openOverlay(id,from){setFrom=from;if(from)$(from).classList.add('hidden');$(id).classList.remove('hidden');
  if(id==='settings'){$('volSfx').value=Snd.vol.sfx;$('volMus').value=Snd.vol.music;$('volMute').checked=Snd.vol.muted;$('setAutoLoot').checked=Settings.autoLoot;$('setLootRar').innerHTML=RAR.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('setLootRar').value=Settings.lootMinRar}}
function closeOverlay(id){$(id).classList.add('hidden');if(setFrom)$(setFrom).classList.remove('hidden');setFrom=null}
$('btnSet').onclick=()=>openOverlay('settings','title');$('btnSet2').onclick=()=>openOverlay('settings','pause');$('btnHow').onclick=()=>openOverlay('howto','title');
$('btnSetClose').onclick=()=>{saveAudio();closeOverlay('settings')};$('btnHowClose').onclick=()=>closeOverlay('howto');
$('volSfx').oninput=e=>{Snd.vol.sfx=+e.target.value;applyVol();sfx('hit')};$('volMus').oninput=e=>{Snd.vol.music=+e.target.value;applyVol()};$('volMute').onchange=e=>{Snd.vol.muted=e.target.checked;applyVol()};
$('setAutoLoot').onchange=e=>{Settings.autoLoot=e.target.checked;saveSettings()};$('setLootRar').onchange=e=>{Settings.lootMinRar=+e.target.value;saveSettings()};
$('btnRand').onclick=randomLook;
// Some previews (like a file opened inside another app) block browser storage, so nothing can be saved there.
function storageOK(){try{localStorage.setItem('emberfall-test','1');localStorage.removeItem('emberfall-test');return true}catch(e){return false}}

// ================= Loop =================
let last=performance.now();
// One frame. If anything throws, keep the loop alive and show the error instead of freezing the game.
let errT=0;function frame(now){try{frameStep(now)}catch(e){console.error(e);if(rt>errT){errT=rt+5;toast('Something went wrong: '+e.message,'danger')}}requestAnimationFrame(frame)}
function frameStep(now){const dt=Math.min(.05,(now-last)/1000);last=now;rt+=dt;
  if(state==='play'&&(!isPaused()||Net.role))update(dt);
  const p=players[0];let tx,ty;
  if(state==='play'&&p){tx=p.x-W/2;ty=p.y-H/2/TILT}else{tx=(VC.x+.5)*TILE+Math.cos(rt*.06)*380-W/2;ty=(VC.y+.5)*TILE+Math.sin(rt*.06)*300-H/2/TILT}
  const zw=MW*TILE,zh=MH*TILE;camX=zw<W?(zw-W)/2:clamp(tx,0,zw-W);camY=zh<H/TILT?(zh-H/TILT)/2:clamp(ty,0,zh-H/TILT);
  if(shake>0){camX+=rand(-shake,shake);camY+=rand(-shake,shake);shake=Math.max(0,shake-dt*30)}
  if(state==='play')cvs.style.cursor=signUnderMouse()||corpseUnderMouse()?'pointer':'crosshair';musicTick(dt);if(state==='title'||state==='login')drawSelectScene(dt);else render();if(state==='play'){updateHud();drawInvPreview()}if(state==='creator')drawPreview();
}
