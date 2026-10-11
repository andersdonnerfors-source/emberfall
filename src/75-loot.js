// ================= Corpses & looting =================
// Slain monsters leave a corpse for 2–3 minutes. Click it (or press E) within reach to open its loot.
const LOOT_REACH=170,CORPSE_TIME=[120,180];
function corpsesOf(z){return z.corpses||(z.corpses=[])}
function makeCorpse(t){const before=drops.length;enemyDrops(t);matDrop(t);if(t.boss&&zone.kind==='dungeon')dungeonLoot(t);
  const loot=drops.splice(before);for(const d of loot)d.id=++Net.nid;Net.corpVer++;corpsesOf(zone).push({id:++Net.nid,x:t.x,y:t.y,unit:Object.assign({},t,{hitFlash:0,stunUntil:0,cursedUntil:0,slowUntil:0,charge:null}),loot,until:time+rand(CORPSE_TIME[0],CORPSE_TIME[1]),boss:t.boss})}
function lootable(c){return c.loot.length>0}
function corpseUnderMouse(){const p=players[0];if(!p||!zone)return null;let best=null,bd=40;for(const c of corpsesOf(zone)){if(!lootable(c))continue;const[sx,sy]=S(c.x,c.y),d=Math.hypot(mouse.x-sx,mouse.y-(sy-8));if(d<bd){bd=d;best=c}}return best}
function inReach(p,c){return dist(p,c)<=LOOT_REACH}
// The loot window lists every corpse within reach (lootOpen = {ids}); corpses are looked up by id, so co-op syncs never leave stale ones.
let lootOpen=null;
function corpsesInReach(p,cs){return cs.filter(c=>lootable(c)&&dist(p,c)<=LOOT_REACH).sort((a,b)=>dist(p,a)-dist(p,b))}
function lootGroupsRefresh(ids,cs,p){return ids.filter(id=>{const c=cs.find(c=>c.id===id);return c&&lootable(c)&&dist(p,c)<=LOOT_REACH+60})}
function openCorpses(){return lootOpen&&zone?lootOpen.ids.map(id=>corpsesOf(zone).find(c=>c.id===id)).filter(Boolean):[]}
function openLoot(c){const p=players[0];if(!inReach(p,c)){floatText(p.x,p.y-40,'Too far away','#ffb08a',13);return}const near=corpsesInReach(p,corpsesOf(zone));if(!near.includes(c))near.unshift(c);lootOpen={ids:near.map(c=>c.id)};$('loot').classList.remove('hidden');renderLoot();sfx('click')}
function closeLoot(){lootOpen=null;$('loot').classList.add('hidden');hideTip()}
function lootLabel(d){return d.kind==='gold'?`${d.amount} gold`:d.kind==='sup'?supName(d.sup):d.kind==='mat'?`${d.amount} ${MATS[d.mat].n}`:d.item.name}
function lootIcon(d){return d.kind==='gold'?'🪙':d.kind==='sup'?supHtml(d.sup):d.kind==='mat'?MATS[d.mat].icon:itemIcon(d.item)}
function takeLoot(c,d,quiet){const p=players[0];if(!c)return false;
  if(Net.role==='guest'){if(d.item&&bagFree(p)<=0){if(!quiet)toast('Your bag is full');return false}Loot.pending.set(d.id,!!d.item);netSend([...Net.peers.values()][0],{t:'take',cid:c.id,did:d.id});c.loot.splice(c.loot.indexOf(d),1);return true}
  Net.corpVer++;
  if(d.kind==='gold'){p.gold+=d.amount;if(!quiet)sfx('gold')}else if(d.kind==='sup')addSup(p,d.sup,d.amount||1);else if(d.kind==='mat')p.mats[d.mat]=(p.mats[d.mat]||0)+d.amount;
  else{if(p.bag.length>=p.bagSize){toast('Your bag is full');return false}p.bag.push(d.item);if(!quiet)sfx('loot',{rar:d.item.rar})}
  c.loot.splice(c.loot.indexOf(d),1);return true}
function lootChanged(){if(!lootOpen)return;const p=players[0];lootOpen.ids=p?lootGroupsRefresh(lootOpen.ids,corpsesOf(zone),p):[];if(!lootOpen.ids.length)closeLoot();else renderLoot();if(invOpen)renderInv()}
function takeAll(){const cs=openCorpses();if(!cs.length)return;let any=false,rar=1;for(const c of cs)for(const d of[...c.loot]){if(d.item)rar=Math.max(rar,d.item.rar);if(takeLoot(c,d,true))any=true}if(any)sfx('loot',{rar});lootChanged();save()}
function renderLoot(){const cs=openCorpses(),el=$('lootList');if(!lootOpen)return;$('lootTitle').textContent=cs.length===1?(cs[0].unit.name||'Corpse'):'Loot';el.innerHTML='';
  if(!cs.some(lootable)){el.innerHTML='<div class="muted">Nothing left.</div>';return}
  for(const c of cs){if(!lootable(c))continue;if(cs.length>1){const h=document.createElement('div');h.className='lgroup';h.textContent=c.unit.name||'Corpse';el.appendChild(h)}
  for(const d of c.loot){const row=document.createElement('div');row.className='lrow2';const col=d.item?RAR[d.item.rar].c:d.kind==='gold'?'#ffd84a':'#efe6d2';
    row.innerHTML=`<span class="li">${lootIcon(d)}</span><span style="color:${col};flex:1">${lootLabel(d)}</span>`;
    if(d.item){row.onmouseenter=()=>showTip(itemTip(d.item,players[0].gear[d.item.slot]||null));row.onmouseleave=hideTip}
    row.onclick=()=>{if(takeLoot(c,d)){hideTip();lootChanged();save()}};el.appendChild(row)}}}
function updateCorpses(){const z=zone;if(!z||!z.corpses)return;const n0=z.corpses.length;z.corpses=z.corpses.filter(c=>c.until>time);if(z.corpses.length!==n0)Net.corpVer++;if(lootOpen){const p=players[0];if(!p||p.dead)closeLoot();else{const ids=lootGroupsRefresh(lootOpen.ids,z.corpses,p);if(ids.length!==lootOpen.ids.length)lootChanged()}}}
function drawCorpse(c){const u=c.unit,[sx,sy]=S(c.x,c.y),fade=Math.min(1,(c.until-time)/8);ctx.save();ctx.globalAlpha=.85*fade;softShadow(ctx,sx,sy,u.r*1.6,u.r*.6,.6);
  ctx.translate(sx,sy);ctx.rotate(Math.cos(u.aim||0)<0?-1.35:1.35);ctx.filter='grayscale(.45) brightness(.75)';
  const kind=u.type;try{if(kind==='wolf'||kind==='frostwolf'||kind==='greyfang'||kind==='rimeclaw'||kind==='direwolf')drawWolf(ctx,0,0,{s:kind==='greyfang'||kind==='rimeclaw'?1.8:1,aim:0,walk:0,col:kind==='frostwolf'||kind==='rimeclaw'?'#dfe8f0':'#7c7f86',eye:'#333'});
    else if(['spider','cspider','webweaver','giantspider','venomfang','broodmother','scarablord','bat','myconid','sporeling'].includes(kind))drawCreature(ctx,0,0,{kind:kind==='scarablord'?'scarab':kind==='venomfang'||kind==='broodmother'?'spider':kind,s:kind==='broodmother'?2.4:kind==='venomfang'?1.8:kind==='scarablord'?2.3:1,aim:0,walk:0});
    else if(BUGS.has(kind))drawBug(ctx,0,0,{kind,s:1,aim:0,walk:0});else{const o=unitLook(u);o.walk=0;o.glow=false;drawHumanoid(ctx,0,0,o)}}catch(e){}
  ctx.filter='none';ctx.restore();
  if(lootable(c)){const b=Math.sin(rt*4+c.x)*.5+.5;ctx.save();ctx.globalCompositeOperation='lighter';const best=Math.max(-1,...c.loot.filter(d=>d.item).map(d=>d.item.rar));const col=best>=0?RAR[best].c:'#ffe08a';
    const g=ctx.createRadialGradient(sx,sy-6,0,sx,sy-6,26);g.addColorStop(0,col+'aa');g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=.35+.35*b;ctx.fillStyle=g;ctx.fillRect(sx-26,sy-32,52,52);ctx.restore();
    if(Math.random()<.06)parts.push({x:c.x+rand(-14,14),y:c.y,z:6,vx:0,vy:0,vz:30,life:.8,max:.8,col,size:2,ng:true})}}

// ================= Living world: monster camps that respawn =================
// The map is split into cells. A cell gets its monster camps the first time you come near; a monster you kill
// comes back to the same spot 2–3 minutes later. Cells far away are put to sleep and wake up when you return.
const CELL=10;
function cellsOf(z){return z.cells||(z.cells={})}
function genCell(cx,cy){const c={slots:[],cx,cy,active:false},p=players[0];
  if(Math.random()>(zone.kind==='cave'?.7:.55))return c;
  for(let tries=0;tries<6;tries++){const tx=cx*CELL+1+Math.random()*(CELL-2),ty=cy*CELL+1+Math.random()*(CELL-2),x=tx*TILE,y=ty*TILE;if(!free(x,y,16))continue;
    let type,lvl,n;
    if(zone.kind==='cave'){const sp=zone.spawn;type=pick(sp.pool);lvl=sp.lvl[0]+Math.floor(Math.random()*(sp.lvl[1]-sp.lvl[0]+1))}
    else{if(tx<4||ty<4||tx>MW-4||ty>MH-4)continue;if(CITIES.some(c=>Math.hypot(tx-c.x,ty-c.y)<c.r+6))continue;if(ENTRANCES.some(c=>Math.hypot(tx-c.x,ty-c.y)<6))continue;if([BARROW,CAMP,DEN,TROLL].some(s=>Math.hypot(tx-s.x,ty-s.y)<8))continue;
      const b=biomeAtW(x,y),dT=Math.hypot(tx-VC.x,ty-VC.y);lvl=zoneLevel(tx,ty,b);let pool=isDeep(tx,ty,b)?DEEP_POOLS[b]:POOLS[b];if(Math.hypot(tx-BARROW.x,ty-BARROW.y)<34*WS)pool=['wight','wight','beetle'];
      const q=QUESTS[quest.idx];if(quest.state==='active'&&q&&!q.boss&&Math.random()<.5){const near=q.site?Math.hypot(tx-q.site.x,ty-q.site.y)<40*WS:dT<44*WS;if(near)pool=q.target.filter(k=>!ETYPES[k].big||lvl>=3)}
      type=pick(pool);if(ETYPES[type].big&&lvl<3)type=pool[0]}
    n=PACK[type]?Math.floor(rand(PACK[type][0],PACK[type][1]+1)):type==='bat'||type==='sporeling'?3:ETYPES[type].big?1:(Math.random()<.4?2:1);
    for(let k=0;k<n;k++){const ex=x+rand(-44,44),ey=y+rand(-44,44);if(free(ex,ey,ETYPES[type].r))c.slots.push({type,lvl,x:ex,y:ey,pending:0,alive:null})}break}
  return c}
function slotAlive(s){return s.alive&&!s.alive.dead&&!s.alive.remove}
function spawnSlot(s){s.alive=spawnEnemy(s.type,s.x,s.y,s.lvl,{cellRef:s})}
function spawner(dt){spawnT-=dt;if(spawnT>0)return;spawnT=.5;if(!zone.spawn)return;const p=players[0];if(!p||p.dead)return;const cells=cellsOf(zone),pcx=Math.floor(p.x/TILE/CELL),pcy=Math.floor(p.y/TILE/CELL);
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){const cx=pcx+dx,cy=pcy+dy;if(cx<0||cy<0||cx*CELL>=MW||cy*CELL>=MH)continue;const key=cx+','+cy;
    const c=cells[key]||(cells[key]=genCell(cx,cy)),d=Math.hypot(p.x-(cx+.5)*CELL*TILE,p.y-(cy+.5)*CELL*TILE);
    if(d<1250&&!c.active){c.active=true;for(const s of c.slots)if(!slotAlive(s)&&s.pending<=time)spawnSlot(s)}}
  for(const key in cells){const c=cells[key];if(!c.active)continue;const d=Math.hypot(p.x-(c.cx+.5)*CELL*TILE,p.y-(c.cy+.5)*CELL*TILE);
    if(d>2100){c.active=false;for(const s of c.slots)if(slotAlive(s)&&!s.alive.target){s.alive.remove=true;s.alive=null}continue}
    for(const s of c.slots)if(!slotAlive(s)&&s.pending&&s.pending<=time&&Math.hypot(p.x-s.x,p.y-s.y)>320){s.pending=0;spawnSlot(s)}}}

// ================= Hero save slots =================
const SAVES_KEY='emberfall-saves-v2',MAX_HEROES=6;let heroId=null;
function allSaves(){const s=fetchStore(SAVES_KEY)||{heroes:[]};if(!s.migrated){const old=fetchStore(SAVE_KEY);if(old&&old.p)s.heroes.push({id:'h'+Date.now(),t:Date.now(),data:old});s.migrated=true;store(SAVES_KEY,s)}return s}
function writeHero(data){const s=allSaves();if(!heroId)heroId='h'+Date.now();if(!storageOK())return;const i=s.heroes.findIndex(h=>h.id===heroId),e={id:heroId,t:Date.now(),data};if(i>=0)s.heroes[i]=e;else s.heroes.push(e);store(SAVES_KEY,s)}
function deleteHero(id){const s=allSaves();s.heroes=s.heroes.filter(h=>h.id!==id);store(SAVES_KEY,s)}
function saveAndQuit(){if(Net.role==='guest'){pauseOpen=false;$('pause').classList.add('hidden');leaveParty();return}if(Net.role==='host')leaveParty();save();toast('Game saved');pauseOpen=false;closeLoot();state='title';players=[];$('hud').classList.add('hidden');for(const id of['inv','tal','shop','dialog','prof','pause'])$(id).classList.add('hidden');invOpen=talOpen=shopOpen=dialogOpen=profOpen=false;useZone(zones.over);enemies=[];Account.flush();openSelect()}
$('lootClose').onclick=closeLoot;$('lootAll').onclick=takeAll;
// ---- Auto loot (personal setting, also in co-op): walk near corpses to pick up coins, potions, materials and items of a chosen rarity
// Loot.pending: drop id → is it an item; a guest's takes the host hasn't answered yet (their items already reserve bag space).
const Settings=loadSettings(),Loot={pending:new Map(),t:0,fullAt:-99};
function lootReset(){Loot.pending.clear();Loot.t=0}
function bagFree(p){let n=0;if(Net.role==='guest')for(const it of Loot.pending.values())if(it)n++;return p.bagSize-p.bag.length-n}
function loadSettings(){return Object.assign({autoLoot:false,lootMinRar:1},fetchStore('emberfall-settings')||{})}
function saveSettings(){store('emberfall-settings',Settings)}
function autoLootPick(loot,minRar,bagFree,pending){const take=[];let blocked=false;
  for(const d of loot){if(pending.has(d.id))continue;if(!d.item){take.push(d);continue}if(d.item.rar<minRar)continue;if(bagFree>0){take.push(d);bagFree--}else blocked=true}return{take,blocked}}
function autoLootPlan(cs,minRar,free,pending){const take=[];let blocked=false;for(const c of cs){const r=autoLootPick(c.loot,minRar,free,pending);if(r.blocked)blocked=true;for(const d of r.take){take.push([c,d]);if(d.item)free--}}return{take,blocked}}
function autoLootTick(dt){const p=players[0];if(!Settings.autoLoot||!p||p.dead||p.fly||!zone||zone.kind==='interior'||isPaused())return;if((Loot.t-=dt)>0)return;Loot.t=.25;
  const got=[];let blocked=false;
  const plan=autoLootPlan(corpsesOf(zone).filter(c=>lootable(c)&&inReach(p,c)),Settings.lootMinRar,bagFree(p),Loot.pending);blocked=plan.blocked;
  for(const[c,d]of plan.take){const label=lootLabel(d);if(takeLoot(c,d,true))got.push(label)}
  if(got.length){sfx('gold');toast("+"+got.slice(0,4).join(", ")+(got.length>4?` +${got.length-4} more`:""));lootChanged();if(invOpen)renderInv();save()}
  if(blocked&&time-Loot.fullAt>10){Loot.fullAt=time;toast('Your bag is full')}}
