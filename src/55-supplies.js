// ================= Stats helpers =================
function mainStat(p){return p.spec==='holy'?'int':MAIN_STAT[p.cls]}
// Old heroes had Might/Vitality/Spirit points. Move them to the new attributes.
function migrateAttr(p){const a=p.attr||{};if(a.might==null&&a.vit==null&&a.spirit==null){p.attr=Object.assign({str:0,agi:0,int:0,sta:0},a);return}
  const n={str:0,agi:0,int:0,sta:0};n[mainStat(p)]+=a.might||0;n.sta+=a.vit||0;n.int+=a.spirit||0;p.attr=n}
// All attributes an item gives: natural ones, Blacksmith and Enchanter additions, and old-style enchantments.
function itemStats(it){const r=Object.assign({},it.stats);const add=(k,v)=>{r[k]=(r[k]||0)+v};
  if(it.ench)for(const k in it.ench.stats)add(k,it.ench.stats[k]);if(it.bs)add(it.bs.k,it.bs.v);if(it.en)add(it.en.k,it.en.v);return r}
// Hit chance: 95% against your own level, −5% per level the monster is above you, minus a little for low weapon/spell skill, plus Hit from gear.
function hitChance(p,e){const gap=Math.max(0,(e&&e.lvl||p.level)-p.level),cap=skillCap(p),sk=(skillOf(p,wtypeOf(p))+skillOf(p,'spell'))/2;
  return clamp(.95-.05*gap-Math.max(0,cap-sk)*.002+(p.stats.hit||0),.05,1)}
const CRIT_MIN_HIT=.75; // no critical hits unless your hit chance is at least this high

// ================= Item generation =================
function baseFor(cls,slot){const b=CBASES[cls]&&CBASES[cls][slot];return pick(b||BASES[slot])}
// Rolls 1–5 attributes (one per rarity step). `want` lists stats to favour, in order (used for spec loot).
function rollStats(slot,rar,lvl,cls,want,vr){const R=RAR[rar],main=MAIN_STAT[cls]||'str',stats={},n=rar+1;
  const add=(k,f)=>{stats[k]=(stats[k]||0)+Math.max(1,Math.round(STATGEN[k](lvl)*R.m*rand(vr[0],vr[1])*f))};
  const[pk,pf]=PRIMARY[slot];let first=pk==='main'?main:pk;if(slot==='offhand'&&cls==='paladin')first='armor';add(first,pf);
  const extra=SPEC_STATS[cls]?SPEC_STATS[cls][1]:'sta',pool=[main,main,'sta','sta',extra,...RANDSTATS];if(slot==='boots')pool.push('speed','speed');
  const order=(want||[]).filter(k=>k!==first);
  while(Object.keys(stats).length<n){const w=order.length>0,k=w?order.shift():pick(pool);if(stats[k])continue;add(k,w?.7:.6)}
  return stats}
// Chance per item, by rarity (common, magic, rare, epic, legendary). Each step up is several times rarer.
const RAR_W={mob:[62,28,8.5,1.4,.1],shop:[60,30,10,0,0],boss:[0,40,42,16,2],finalBoss:[0,0,50,40,10],bonus:[30,50,20,0,0]};
function rollRar(w,minRar){let tot=0;for(let i=minRar||0;i<5;i++)tot+=w[i];let r=Math.random()*tot;for(let i=minRar||0;i<5;i++){r-=w[i];if(r<=0&&w[i]>0)return i}return Math.max(minRar||0,w.findIndex(x=>x>0))}
function genItem(lvl,minRar,cls,fslot,w){cls=cls||'paladin';const rar=rollRar(w||RAR_W.mob,minRar);const slot=fslot||pick(SLOTS);
  const wo=slot==='weapon'?pick(WEAPONS[cls]):null,base=wo?wo[1]:baseFor(cls,slot);
  const name=(rar>0||Math.random()<.5?pick(PREF)+' ':'')+base+(rar>=2?' '+pick(SUFF):'');
  return{id:Math.random().toString(36).slice(2),name,slot,rar,lvl,stats:rollStats(slot,rar,lvl,cls,null,[.8,1.2]),wt:wo?wo[0]:undefined}}
function itemScore(it){if(!it)return 0;const w={str:1.2,agi:1.2,int:1.2,sta:1,hit:6,crit:5,hp:.25,mana:.3,armor:.8,dmgPct:3,cdr:3,speed:2,healPct:2,petPct:2,leech:4};
  let v=0;const s=itemStats(it);for(const k in s)v+=s[k]*(w[k]||1);return v+it.rar*2}
// Icons and looks follow the item's type.
function itemIcon(it){if(it.slot==='weapon')return{sword:'⚔️',axe:'🪓',mace:'🔨',staff:'🦯',wand:'🪄',bow:'🏹'}[it.wt]||'⚔️';
  if(it.slot==='offhand')return{shield:'🛡️',quiver:'🎯',tome:'📖',orb:'🔮',skull:'💀'}[visKind(it)];
  if(it.slot==='helm')return{helm:'⛑️',hood:'🧕',cap:'🧢',wizard:'🎩',circlet:'👑'}[visKind(it)]||'⛑️';return SLOTICON[it.slot]}
function visKind(it){const n=it.name;switch(it.slot){
  case'armor':return/Robe|Vestment|Shroud/.test(n)?'robe':/Leather|Scale|Tunic|Cloak|Jerkin/.test(n)?'leather':'plate';
  case'helm':return/Wizard/.test(n)?'wizard':/Circlet/.test(n)?'circlet':/Hood|Cowl/.test(n)?'hood':/Cap|Hat/.test(n)?'cap':'helm';
  case'offhand':return/Quiver/.test(n)?'quiver':/Tome|Grimoire/.test(n)?'tome':/Orb/.test(n)?'orb':/Skull/.test(n)?'skull':'shield';
  case'legs':return/Mail|Plate|Greaves/.test(n)?'plate':'cloth';
  case'boots':return/Sabaton|Iron/.test(n)?'plate':/Slipper|Silk|Shoe/.test(n)?'cloth':'leather'}return''}
// Names carry an element that shows on the item: an Ember sword burns, a Rimebound helm glitters with frost.
const ELEM_COL={fire:'#ff7a2a',frost:'#7ad8ff',shadow:'#b06aff',venom:'#7aff6a',moon:'#e8f0ff',gold:'#ffd84a'};
function elemOf(it){const n=it.name;return/Ember|Sunforged|Pharaoh|Sun /.test(n)?'fire':/Frost|Rime|Glacial|North/.test(n)?'frost':/Shadow|Grim|Fallen|Dusk|Whisper|Ashen/.test(n)?'shadow':
  /Venom|Silkweav|Webbed|Brood|Scarab/.test(n)?'venom':/Moonlit|Silver|Elven/.test(n)?'moon':/Gilded|Kingsguard|Valor|Embalmed/.test(n)?'gold':null}

// ================= Supplies: potions, food, everyday crafts =================
// Potions act at once; food and drink restore over 15 s while you eat (taking damage interrupts it).
const SUP={
  hp1:{n:'Minor Healing Potion',icon:'🧪',kind:'hp',amt:50,price:8},hp2:{n:'Healing Potion',icon:'🧪',kind:'hp',amt:100,price:22},
  hp3:{n:'Greater Healing Potion',icon:'🧪',kind:'hp',amt:250,price:50},hp4:{n:'Superior Healing Potion',icon:'🧪',kind:'hp',amt:500,price:95},
  mp1:{n:'Minor Mana Potion',icon:'🧪',kind:'mp',amt:50,price:8,hue:200},mp2:{n:'Mana Potion',icon:'🧪',kind:'mp',amt:100,price:22,hue:200},
  mp3:{n:'Greater Mana Potion',icon:'🧪',kind:'mp',amt:250,price:50,hue:200},mp4:{n:'Superior Mana Potion',icon:'🧪',kind:'mp',amt:500,price:95,hue:200},
  pow1:{n:'Power Potion',icon:'⚗️',kind:'buff',buff:'pow',lv:1},pow2:{n:'Greater Power Potion',icon:'⚗️',kind:'buff',buff:'pow',lv:2},
  roast:{n:'Roasted Meat',icon:'🍖',kind:'food',hp:25},juice:{n:'Berry Juice',icon:'🧃',kind:'food',mp:18},
  stew:{n:"Hunter's Stew",icon:'🍲',kind:'food',hp:30,mp:20},feast:{n:'Westmark Feast',icon:'🍗',kind:'food',hp:50,mp:35,fed:true},
  berries:{raw:1,kind:'food',hp:[2,5]},water:{raw:1,kind:'food',mp:[3,5]},meat:{raw:1,kind:'food',hp:[5,7]},meat2:{raw:1,kind:'food',hp:[6,9]},meat3:{raw:1,kind:'food',hp:[8,10]},
  stone:{n:'Sharpening Stone',icon:'🪨',kind:'buff',buff:'stone'},oil:{n:'Wizard Oil',icon:'🫙',kind:'buff',buff:'oil'},kit:{n:'Armor Kit',icon:'🧰',kind:'buff',buff:'kit'}};
const EAT_TIME=15,POT_CD=2;
function supName(k){return SUP[k].raw?MATS[k].n:SUP[k].n}
function supIcon(k){const s=SUP[k];return s.raw?MATS[k].icon:s.icon}
function supHtml(k){const s=SUP[k];return s.hue?`<span style="filter:hue-rotate(${s.hue}deg)">${supIcon(k)}</span>`:supIcon(k)}
function supCount(p,k){return SUP[k].raw?(p.mats[k]||0):(p.sup[k]||0)}
function addSup(p,k,n){if(SUP[k].raw)p.mats[k]=(p.mats[k]||0)+n;else p.sup[k]=(p.sup[k]||0)+n}
function supDesc(k,p){const s=SUP[k],r=v=>Array.isArray(v)?v[0]+'–'+v[1]:v;
  if(s.kind==='hp')return`Restores ${s.amt} health instantly.`;if(s.kind==='mp')return`Restores ${s.amt} mana instantly.`;
  if(s.kind==='food')return`Restores ${s.hp?r(s.hp)+' health':''}${s.hp&&s.mp?' and ':''}${s.mp?r(s.mp)+' mana':''} per second for ${EAT_TIME} s. Taking damage stops your meal.`+(s.fed?' Then Well Fed for 10 minutes.':'');
  const b=makeBuff(p,s.buff,s.lv);return`${Object.entries(b.stats).map(([k2,v])=>'+'+v+' '+STATLBL[k2]).join(', ')} for ${b.dur/60} minutes.`}
// Potion tiers follow your level: Minor 1–4, normal 5–9, Greater 10–14, Superior 15+.
function potTier(l){return l<5?1:l<10?2:l<15?3:4}
// Timed buffs. Power potions boost what YOUR class and specialization want.
function makeBuff(p,key,lv){const ms=mainStat(p),L=p.level;
  switch(key){
    case'pow':{const want=SPEC_STATS[p.spec||p.cls],sec=want[1]===ms?'sta':want[1],f=lv>1?1.2:.7;
      return{n:lv>1?'Greater Power':'Power',icon:'⚗️',dur:180,stats:{[ms]:Math.round(STATGEN[ms](L)*f),[sec]:Math.max(1,Math.round(STATGEN[sec](L)*f*.6))}}}
    case'stone':return{n:'Sharpened',icon:'🪨',dur:600,stats:{dmgPct:3}};
    case'oil':return{n:'Wizard Oil',icon:'🫙',dur:600,stats:{dmgPct:3,healPct:3}};
    case'kit':return{n:'Armor Kit',icon:'🧰',dur:600,stats:{armor:Math.round(STATGEN.armor(L)*.8)}};
    case'fed':return{n:'Well Fed',icon:'🍗',dur:600,stats:{sta:Math.round(4+L*.6),[ms]:Math.round(4+L*.6)}}}}
function addBuff(p,key,lv){const b=makeBuff(p,key,lv);b.left=b.dur;p.buffs[key]=b;calcStats(p);floatText(p.x,p.y-40,b.n,'#ffe08a',14)}
function useSup(p,k){if(p.dead||supCount(p,k)<=0)return false;const s=SUP[k];
  if(s.kind==='hp'||s.kind==='mp'){if(p.potCd>0)return false;if(s.kind==='hp'?p.hp>=p.maxHp:p.mana>=p.maxMana)return false;p.potCd=POT_CD;sfx('potion');
    if(s.kind==='hp'){heal(p,s.amt);burst(p.x,p.y,'#ff6a6a',18,100)}else{p.mana=Math.min(p.maxMana,p.mana+s.amt);floatText(p.x,p.y-30,'+'+s.amt+' mana','#8fb8ff',14);burst(p.x,p.y,'#6a9aff',18,100)}}
  else if(s.kind==='food'){if(time-p.lastHurt<2){floatText(p.x,p.y-30,'Not while fighting','#ffb08a',13);return false}
    const v=x=>x?Array.isArray(x)?rand(x[0],x[1]):x:0;p.eat={hp:v(s.hp),mp:v(s.mp),left:EAT_TIME,fed:s.fed,icon:supIcon(k),n:supName(k)};sfx('loot',{rar:0})}
  else{addBuff(p,s.buff,s.lv);sfx('spec')}
  if(s.raw)p.mats[k]--;else p.sup[k]--;if(invOpen)renderInv();return true}
// Q: healing potion, Z: mana potion. Picks the smallest potion that covers what you are missing (or your biggest).
function drinkPotion(p,kind){kind=kind||'hp';if(p.dead||p.potCd>0)return;const miss=kind==='hp'?p.maxHp-p.hp:p.maxMana-p.mana;
  const own=Object.keys(SUP).filter(k=>SUP[k].kind===kind&&supCount(p,k)>0).sort((a,b)=>SUP[a].amt-SUP[b].amt);
  if(!own.length){floatText(p.x,p.y-30,kind==='hp'?'No healing potions':'No mana potions','#ff9a8a',13);return}if(miss<=0)return;
  useSup(p,own.find(k=>SUP[k].amt>=miss)||own[own.length-1])}
// X: eat or drink the best food for what you are missing.
function eatFood(p){if(p.dead)return;const own=Object.keys(SUP).filter(k=>SUP[k].kind==='food'&&supCount(p,k)>0);
  if(!own.length){floatText(p.x,p.y-30,'No food or drink','#ff9a8a',13);return}
  const needMp=p.maxMana-p.mana>p.maxHp-p.hp,val=k=>{const s=SUP[k],a=x=>x?Array.isArray(x)?(x[0]+x[1])/2:x:0;return needMp?a(s.mp)*1.2+a(s.hp):a(s.hp)*1.2+a(s.mp)};
  useSup(p,own.sort((a,b)=>val(b)-val(a))[0])}
function updateSupplies(p,dt){if(p.eat){const e=p.eat;e.left-=dt;if(e.hp)p.hp=Math.min(p.maxHp,p.hp+e.hp*dt);if(e.mp)p.mana=Math.min(p.maxMana,p.mana+e.mp*dt);
    if(Math.random()<dt*3)parts.push({x:p.x+rand(-6,6),y:p.y,z:30,vx:0,vy:0,vz:30,life:.6,max:.6,col:e.mp&&!e.hp?'#8fb8ff':'#9fe07a',size:2.5,ng:true});
    if(e.left<=0){p.eat=null;if(e.fed)addBuff(p,'fed')}}
  let ch=false;for(const k in p.buffs){const b=p.buffs[k];b.left-=dt;if(b.left<=0){delete p.buffs[k];ch=true;toast(b.n+' has worn off')}}if(ch)calcStats(p)}

// ================= Gathering =================
function gatherOf(d){return d.g||(d.k==='bush'&&d.v>.6?'berries':d.k==='well'?'water':null)}
function gather(p,d){const g=gatherOf(d);if(!g||(d.next||0)>time)return;const n=g==='water'?2:g==='berries'?2+Math.floor(Math.random()*2):1+(Math.random()<.35?1:0);
  p.mats[g]=(p.mats[g]||0)+n;d.next=time+(g==='water'?8:rand(120,180));floatText(d.x,d.y-20,'+'+n+' '+MATS[g].n,'#cfe0a0',13);sfx('loot',{rar:0});
  burst(d.x,d.y,g==='water'?'#7ac8ff':g==='berries'?'#c84a8a':'#9fe07a',10,60);save()}
function nearGatherable(p){let best=null,bd=70;for(const d of decor){const g=gatherOf(d);if(!g||(d.next||0)>time)continue;const dd=Math.hypot(p.x-d.x,p.y-d.y);if(dd<bd){bd=dd;best=d}}return best?{d:best,dist:bd}:null}

// ================= Blacksmithing & Enchanting: one extra attribute each =================
const IMPROVE={bs:{prof:'blacksmithing',stats:['str','sta','armor','hit'],mat:'ore',verb:'Tempered'},en:{prof:'enchanting',stats:['int','agi','crit','hit','sta'],mat:'dust',verb:'Enchanted'}};
function improveCost(it,kind){const g=it.lvl<8?1:it.lvl<15?2:3,m=IMPROVE[kind].mat,c={[g===1?m:m+g]:2+Math.floor(it.rar/2)};if(it.rar>=3)c.essence=1;return c}
// The value depends on the item's level and your skill: a master crafter adds close to a full-strength attribute.
function improveRange(p,it,kind,k){const s=p.prof[IMPROVE[kind].prof]||0,f=(.35+.65*s/100)*(k==='hit'||k==='crit'?.8:.6),b=STATGEN[k](it.lvl)*f;return[Math.max(1,Math.round(b*.9)),Math.max(1,Math.round(b*1.1))]}
function improveItem(p,slot,kind,k){const it=p.gear[slot],D=IMPROVE[kind];if(!it){toast('Equip something in that slot first');return false}
  const other=it[kind==='bs'?'en':'bs'];if(other&&other.k===k){toast(`${STATLBL[k]} is already on this item from ${kind==='bs'?'Enchanting':'Blacksmithing'}. Pick another attribute.`);return false}
  const[a,b]=improveRange(p,it,kind,k);it[kind]={k,v:Math.round(rand(a,b))};calcStats(p);toast(`${D.verb} ${it.name}: +${it[kind].v} ${STATLBL[k]}`,'gold');burst(p.x,p.y,kind==='bs'?'#ffb060':'#c890ff',30,140)}
