// ================= Zones =================
function useZone(z){zone=z;MW=z.MW;MH=z.MH;map=z.map;tvar=z.tvar;bio=z.bio;decor=z.decor;buildings=z.buildings;terrain=z.terrain}
function buildZone(id){let z;if(id.startsWith('int_')){const b=zones.over.buildings.find(b=>'int_'+b.id===id);z=genInterior(b)}
  else{const e=ENTRANCES.find(e=>e.id===id);z=e.kind==='dungeon'?genDungeon(e):genCave(e)}
  z.terrain=genTerrain();return z}
function enterZone(id,x,y){const prev=zone;if(prev){prev.enemies=enemies;prev.drops=drops}
  let z=zones[id];if(!z){z=zones[id]=buildZone(id)}useZone(z);
  closeLoot();if(z.kind==='dungeon'&&(!z.enemies||z.needReset)){z.corpses=[];enemies=[];for(const s of z.spawns)spawnEnemy(s.type,s.x,s.y,s.lvl,{persist:true,dungeonBoss:s.boss});z.enemies=enemies;z.drops=[];z.needReset=false}
  enemies=z.enemies||[];drops=z.drops||[];projs=[];areas=[];fx=[];parts=[];texts=[];
  const sp=x!=null?{x,y}:z.start;for(const q of players){q.x=sp.x;q.y=sp.y;q.biome=undefined;if(q.mounted&&(z.kind==='interior'||z.kind==='dungeon'))dismount(q,true)}
  for(const a of allies){a.x=sp.x+rand(-30,30);a.y=sp.y+rand(-20,20);a.path=null}
  if(prev&&prev.kind==='dungeon'&&z.kind==='over')prev.needReset=true;
  sfx('door');if(z.kind!=='over')toast(z.name+(z.ent?` · level ${z.ent.lvl[0]}–${z.ent.lvl[1]}`:''),'gold');
  if(z.kind==='dungeon')toast('The bosses here drop gear made for your class and specialization.');
  if(z.dark&&players[0]&&!players[0].light)toast('It is dark down here. A torch from a General Store would help.','danger')}
function interactables(p){const r=[];if(zone.id==='over'){r.push({o:warden,d:dist(p,warden),r:95,act:openDialog,own:true});r.push({o:merchant,d:dist(p,merchant),r:95,act:()=>openShop('tilda',null),own:true})}
  for(const n of zone.npcs||[])r.push(n.kind==='innkeeper'?{o:n,d:dist(p,n),r:100,label:'Talk to '+n.name,act:()=>innTalk(n)}:n.kind==='bard'?{o:n,d:dist(p,n),r:100,label:'Listen to '+n.name,act:()=>bardTalk(n)}:{o:n,d:dist(p,n),r:150,label:'Trade with '+n.name,act:()=>openShop(n.shop,n.building)});
  {let best=null,bd=LOOT_REACH;for(const c of corpsesOf(zone))if(lootable(c)){const d=dist(p,c);if(d<bd){bd=d;best=c}}if(best)r.push({o:best,d:bd*.5,r:LOOT_REACH,label:'Loot '+(best.unit.name||''),act:()=>openLoot(best)})}
  {const g=nearGatherable(p);if(g){const k=gatherOf(g.d);r.push({o:g.d,d:g.dist,r:70,label:k==='water'?'Draw water':'Gather '+MATS[k].n,act:()=>gather(p,g.d)})}}
  for(const s of zone.signs||[])r.push({o:s,d:dist(p,s),r:80,label:'Read the waymark',act:()=>readSign(s)});
  for(const d of zone.doors||[])r.push({o:d,d:dist(p,d),r:75,label:d.label,act:()=>useDoor(d)});
  return r.filter(i=>i.d<i.r).sort((a,b)=>a.d-b.d)}
function useDoor(d){if(d.to==='over')enterZone('over',d.tx,d.ty);else enterZone(d.to)}
function drawPrompt(){const p=players[0];if(!p||p.dead||isPaused())return;const it=interactables(p)[0];if(!it||it.own)return;const[sx,sy]=S(it.o.x,it.o.y);
  const txt='[E] '+it.label;ctx.font='bold 13px system-ui';const w=ctx.measureText(txt).width+16;ctx.fillStyle='rgba(15,12,9,.85)';rr(ctx,sx-w/2,sy-70,w,22,6);ctx.fill();ctx.strokeStyle='#6b5532';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#fff3d0';ctx.textAlign='center';ctx.fillText(txt,sx,sy-54)}
function edgeTile(x,y){for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,1]])if(!BLOCK.has(getT(x+dx,y+dy)))return true;return false}

// ================= Lighting (caves and dungeons) =================
const lightCv=document.createElement('canvas'),lctx=lightCv.getContext('2d');
function lightRadius(p){return p.light?LIGHTS[p.light-1].r:120}
function drawDarkness(){if(!zone.dark)return;if(lightCv.width!==Math.ceil(W)||lightCv.height!==Math.ceil(H)){lightCv.width=Math.ceil(W);lightCv.height=Math.ceil(H)}
  lctx.globalCompositeOperation='source-over';lctx.clearRect(0,0,W,H);lctx.fillStyle=`rgba(3,4,10,${zone.darkA||.9})`;lctx.fillRect(0,0,W,H);lctx.globalCompositeOperation='destination-out';
  const hole=(x,y,r,a)=>{const[sx,sy0]=S(x,y),sy=sy0-12;if(sx<-r||sy<-r||sx>W+r||sy>H+r)return;const g=lctx.createRadialGradient(sx,sy,0,sx,sy,r);g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.55,`rgba(0,0,0,${a*.7})`);g.addColorStop(1,'rgba(0,0,0,0)');lctx.fillStyle=g;lctx.fillRect(sx-r,sy-r,r*2,r*2)};
  for(const p of players)if(!p.dead)hole(p.x,p.y,lightRadius(p)*(.97+.03*Math.sin(rt*7)),1);
  for(const l of zone.lights)hole(l.x,l.y,l.r*(.93+.07*Math.sin(rt*2.3+l.x*.01)),.92);
  for(const pr of projs)if(pr.kind==='orb')hole(pr.x,pr.y,80,.75);
  for(const a of areas)if(a.kind==='holy'||a.kind==='meteor'||a.kind==='plague'||a.kind==='blizzard')hole(a.x,a.y,a.r*1.25,.6);
  for(const e of enemies)if(e.boss)hole(e.x,e.y,90,.5);
  lctx.globalCompositeOperation='source-over';ctx.drawImage(lightCv,0,0,W,H);
  ctx.save();ctx.globalCompositeOperation='lighter';for(const l of zone.lights){const[sx,sy]=S(l.x,l.y);if(sx<-l.r||sy<-l.r||sx>W+l.r||sy>H+l.r)continue;const g=ctx.createRadialGradient(sx,sy-12,0,sx,sy-12,l.r*.75);g.addColorStop(0,l.glow);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(sx-l.r,sy-12-l.r,l.r*2,l.r*2)}
  const p=players[0];if(p&&p.light&&!p.dead){const[sx,sy]=S(p.x,p.y);const g=ctx.createRadialGradient(sx,sy-20,0,sx,sy-20,lightRadius(p)*.6);g.addColorStop(0,'rgba(255,170,80,.16)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.fillRect(sx-300,sy-320,600,600)}ctx.restore()}

// ================= Mounts =================
function toggleMount(p){if(p.mounted||p.mountCast>0){dismount(p);return}
  if(!p.mount){toast('You have no mount yet. Stables in Emberfall and Sunreach sell them.');return}
  if(zone.kind==='interior'||zone.kind==='dungeon'){toast('You cannot ride here.');return}
  if(time-p.lastHurt<3){toast('You cannot mount while in combat.');return}p.mountCast=1}
function dismount(p,silent){if(p.mounted&&p.fly&&!free(p.x,p.y,p.r)){if(!silent)toast('Land on solid ground first.');return}p.mounted=false;p.mountCast=0;p.fly=false;if(!silent)sfx('click')}
function updateMount(p,dt,moving){if(p.mountCast>0){if(moving){p.mountCast=0;toast('Mounting cancelled. Stand still to mount.');return}p.mountCast-=dt;if(p.mountCast<=0){p.mounted=true;p.fly=!!MOUNTS[p.mount].fly;sfx(p.mount==='dragon'?'roar':'howl')}}}
function mountSeat(k){return({cow:20,horse:26,ostrich:30,dragon:34}[k]||0)*1.35}
function drawMount(c,k,x,y,aim,walk){const face=Math.cos(aim||0)<0?-1:1,sw=Math.sin(walk||0);c.save();c.translate(x,y);c.scale(face*1.35,1.35);c.lineJoin=c.lineCap='round';const ol='rgba(0,0,0,.4)';
  const body=(cx,cy,rx,ry,col)=>{const g=c.createLinearGradient(0,cy-ry,0,cy+ry);g.addColorStop(0,shade(col,20));g.addColorStop(1,shade(col,-30));c.fillStyle=g;ell(c,cx,cy,rx,ry);c.fill();c.strokeStyle=ol;c.lineWidth=1.2;c.stroke()};
  const legs=(xs,top,len,col)=>{xs.forEach((lx,i)=>{c.strokeStyle=i%2?shade(col,-35):col;c.lineWidth=4;c.beginPath();c.moveTo(lx,top);c.lineTo(lx+sw*(i%2?3:-3),top+len);c.stroke()})};
  if(k==='cow'){legs([-13,-7,8,14],-10,10,'#e8e2d6');body(0,-16,19,10,'#f0ece2');c.fillStyle='#2a2420';ell(c,-6,-18,5,4);c.fill();ell(c,7,-13,4,3);c.fill();c.fillStyle='#f0b0b8';ell(c,2,-7,4,2.5);c.fill();
    body(20,-22,7,6,'#f0ece2');c.fillStyle='#e8b8a8';ell(c,26,-20,3.5,3);c.fill();c.strokeStyle='#d8d0b8';c.lineWidth=2;c.beginPath();c.moveTo(18,-27);c.lineTo(15,-32);c.moveTo(22,-27);c.lineTo(24,-32);c.stroke();c.fillStyle='#111';circ(c,22,-23,1);c.fill()}
  else if(k==='horse'){legs([-14,-8,9,15],-12,13,'#6a4228');body(0,-19,19,9,'#8a5a32');c.fillStyle='#8a5a32';c.beginPath();c.moveTo(12,-24);c.lineTo(22,-38);c.lineTo(28,-36);c.lineTo(18,-20);c.fill();body(28,-37,8,4.5,'#8a5a32');
    c.fillStyle='#2a1a10';c.beginPath();c.moveTo(13,-26);c.quadraticCurveTo(17,-40,23,-41);c.lineTo(21,-36);c.closePath();c.fill();c.strokeStyle='#2a1a10';c.lineWidth=4;c.beginPath();c.moveTo(-18,-20);c.quadraticCurveTo(-26,-14,-24,-4);c.stroke();c.fillStyle='#111';circ(c,29,-38,1);c.fill();
    c.fillStyle='#6a2a1a';rr(c,-6,-28,12,6,2);c.fill()}
  else if(k==='ostrich'){c.strokeStyle='#d8a888';c.lineWidth=3;for(const[i,lx]of[[0,-4],[1,4]].entries()){c.beginPath();c.moveTo(lx[1],-16);c.lineTo(lx[1]+(i?3:-3)*sw,-6);c.lineTo(lx[1]+(i?6:-6)*sw,0);c.stroke()}
    body(0,-22,14,10,'#2a2a2e');c.fillStyle='#f0f0e8';ell(c,-10,-24,6,5);c.fill();c.strokeStyle='#d8a888';c.lineWidth=3.5;c.beginPath();c.moveTo(10,-26);c.quadraticCurveTo(16,-40,14,-50);c.stroke();body(16,-52,4.5,3.5,'#d8a888');c.fillStyle='#e8a83a';c.beginPath();c.moveTo(20,-52);c.lineTo(26,-51);c.lineTo(20,-50);c.fill();c.fillStyle='#111';circ(c,17,-53,1);c.fill()}
  else if(k==='dragon'){const hov=Math.sin(rt*3)*3;c.translate(0,-8+hov);const fl=Math.sin(rt*9);
    c.fillStyle='rgba(200,60,40,.55)';for(const sd of[-1,1]){c.beginPath();c.moveTo(-4,-24);c.quadraticCurveTo(-14,-52-fl*10*sd,-30,-46-fl*12);c.lineTo(-20,-30);c.lineTo(-10,-34-fl*4);c.closePath();c.fill()}
    c.strokeStyle='#a83a24';c.lineWidth=5;c.beginPath();c.moveTo(-16,-18);c.quadraticCurveTo(-32,-10,-38,-22);c.stroke();legs([-10,8],-12,8,'#a83a24');body(0,-20,18,9,'#c8462c');c.fillStyle='#e8b060';ell(c,0,-14,12,3.5);c.fill();
    c.fillStyle='#c8462c';c.beginPath();c.moveTo(12,-24);c.lineTo(22,-40);c.lineTo(28,-37);c.lineTo(18,-20);c.fill();body(28,-40,8,5,'#c8462c');c.fillStyle='#e8d8b0';c.beginPath();c.moveTo(25,-45);c.lineTo(22,-52);c.lineTo(28,-46);c.fill();
    c.fillStyle='#ffd84a';c.shadowColor='#ff8a2a';c.shadowBlur=6;circ(c,30,-41,1.4);c.fill();c.shadowBlur=0}
  c.restore()}

// ================= Weapon & spell skills =================
const DEFAULT_WT={paladin:'sword',sorcerer:'staff',hunter:'bow',necromancer:'staff'};
const SKILL_NAME={sword:'Sword',axe:'Axe',mace:'Mace',staff:'Staff',wand:'Wand',bow:'Bow',spell:'Spellcraft'};
function wtypeOf(p){const w=p.gear&&p.gear.weapon;return w&&w.wt?w.wt:DEFAULT_WT[p.cls]}
function skillOf(p,k){return(p.skills&&p.skills[k])||1}
function skillCap(p){return p.level*5}
function trainSkill(p,k,chance){const s=skillOf(p,k),cap=skillCap(p);if(s>=cap)return;if(Math.random()<chance*(1-s/(cap+12))){p.skills[k]=s+1;if((s+1)%5===0)toast(`${SKILL_NAME[k]} skill increased to ${s+1}`);if(k==='spell')calcStats(p)}}
function skillMult(p,i){return i===0?1+skillOf(p,wtypeOf(p))/250:1+skillOf(p,'spell')/300}
function weaponVisual(p){const wt=p.gear?wtypeOf(p):DEFAULT_WT[p.cls];if(wt==='mace')return'mace';if(wt==='staff')return p.cls==='necromancer'?'skullstaff':'staff';return wt}

// ================= Gear: spec loot, crafting, enchanting =================
function genSpecItem(p,slot,rar,ilvl,prefix){const want=SPEC_STATS[p.spec||p.cls],stats=rollStats(slot,rar,ilvl,p.cls,rar>=2?want:[want[0]],[.9,1.15]);
  let wt,base;if(slot==='weapon'){const opts=WEAPONS[p.cls],pref=SPEC_WEAPON[p.spec],o=(pref&&opts.find(w=>w[0]===pref))||pick(opts);wt=o[0];base=o[1]}else base=baseFor(p.cls,slot);
  const specName=p.spec?TAL[p.cls].specs[p.spec].name:CLASSES[p.cls].name;
  const name=prefix?`${prefix} ${base}${rar===4?' of the '+specName:''}`:(rar>0?pick(PREF)+' ':'')+base+(rar>=2?' '+pick(SUFF):'');
  return{id:Math.random().toString(36).slice(2),name,slot,rar,lvl:ilvl,stats,wt}}
// Each dungeon boss rolls on a table built for YOUR class and specialization. The legendary piece is the rare prize.
function bossLootTable(p,def,bi){const last=bi===def.bosses.length-1,ilvl=def.lvl[1]+2+bi,tg=def.tag;
  return[{w:10,rar:4,make:()=>genSpecItem(p,last?'weapon':pick(['weapon','armor']),4,ilvl+1,tg[2])},
    {w:15,rar:3,make:()=>genSpecItem(p,'weapon',3,ilvl,tg[0])},{w:15,rar:3,make:()=>genSpecItem(p,pick(['armor','helm','offhand','legs']),3,ilvl,tg[1])},
    {w:20,rar:2,make:()=>genSpecItem(p,pick(['ring','cape']),2,ilvl,tg[3])},{w:20,rar:2,make:()=>genSpecItem(p,pick(['helm','boots']),2,ilvl)},{w:20,rar:2,make:()=>genSpecItem(p,pick(['armor','legs']),2,ilvl)}]}
function rollTable(tb){const tot=tb.reduce((s,e)=>s+e.w,0);let r=Math.random()*tot;for(const e of tb){r-=e.w;if(r<=0)return e}return tb[tb.length-1]}
function dungeonLoot(t){const p=players[0];if(!p||!zone.def)return;const def=zone.def,bi=t.dungeonBoss||0,tb=bossLootTable(p,def,bi),n=bi===def.bosses.length-1?2:1;
  for(let i=0;i<n;i++){const it=rollTable(i?tb.filter(e=>e.rar<=2):tb).make();drops.push({kind:'item',item:it,x:t.x+rand(-30,30),y:t.y+rand(-20,20),t:rand(0,6)});if(it.rar===4){toast('LEGENDARY: '+it.name+'!','gold');sfx('spec')}}
  drops.push({kind:'mat',mat:'essence',amount:1+bi,x:t.x,y:t.y+20,t:0})}
function matDrop(t){const p=players[0];if(!p)return;const m=MOB_MAT[t.type];const lb=1+(p.lootBonus||0);
  if(m&&(t.boss||Math.random()<.35*lb))drops.push({kind:'mat',mat:m,amount:t.boss?2+Math.floor(Math.random()*3):1,x:t.x+rand(-20,20),y:t.y+rand(-14,14),t:rand(0,6)});
  const mt=MOB_MEAT[t.type];if(mt&&Math.random()<(t.boss?1:.45)*lb)drops.push({kind:'mat',mat:mt,amount:1,x:t.x+rand(-20,20),y:t.y+rand(-14,14),t:rand(0,6)});
  if(t.boss&&!t.dungeonBoss&&t.dungeonBoss!==0)drops.push({kind:'mat',mat:'essence',amount:1,x:t.x,y:t.y+14,t:0});
  else if(t.lvl>=10&&Math.random()<.025*lb)drops.push({kind:'mat',mat:'essence',amount:1,x:t.x,y:t.y,t:0})}
function craftGear(p,slot,rar,ilvl){if(p.bag.length>=p.bagSize){toast('Bag is full');return false}const it=genSpecItem(p,slot,rar,ilvl);it.crafted=true;p.bag.push(it);toast('Crafted '+it.name,'gold')}
function enchant(p,slot,n,stats){const it=p.gear[slot];if(!it){toast('Equip a '+SLOTNAME[slot].toLowerCase()+' first');return false}it.ench={n,stats};calcStats(p);toast(`${it.name} enchanted: ${n}`,'gold')}
function bagUp(p,size,loot,n){if(p.bagSize>=size){toast('You already carry a bag this big');return false}p.bagSize=size;p.lootBonus=loot;p.bagName=n;toast(`New bag: ${n} (${size} slots)`,'gold')}
function hasMats(p,cost){for(const k in cost)if((p.mats[k]||0)<cost[k])return false;return true}
function costText(cost,p){return Object.entries(cost).map(([k,v])=>{const have=p?(p.mats[k]||0):v;return`<span style="color:${have>=v?GRADE_COL[(MATS[k].t||1)-1]:'#e86a5a'}">${MATS[k].icon} ${v}× ${MATS[k].n}${p?` (${have})`:''}</span>`}).join(' · ')}
function craft(p,pk,r){const s=p.prof[pk];if(s==null||s<r.req||!hasMats(p,r.cost))return;if(r.make(p)===false)return;for(const k in r.cost)p.mats[k]-=r.cost[k];
  skillUp(p,pk,s,s<r.req+30,s<r.req+15);sfx('quest');renderProf();save()}
function skillUp(p,pk,s,can,fast){if(s<100&&can){p.prof[pk]=Math.min(100,s+(fast?2:1));if(Math.floor(p.prof[pk]/5)>Math.floor(s/5))toast(`${PROF[pk].name} increased to ${p.prof[pk]}`)}}
// Temper / Enchant: pick an equipped item and the attribute to add. Better items need better materials and teach you more.
const improveSel={};
function craftTarget(p,pk,r){const kind=r.cost==='temper'?'bs':'en',sel=improveSel[r.id]||{},it=p.gear[sel.slot];if(!it||!sel.k)return;const cost=improveCost(it,kind);if(!hasMats(p,cost))return;
  if(improveItem(p,sel.slot,kind,sel.k)===false)return;for(const k in cost)p.mats[k]-=cost[k];const s=p.prof[pk];skillUp(p,pk,s,s<it.lvl*5+15,s<it.lvl*5);sfx('quest');renderProf();save()}
function targetRow(p,pk,r,box){const kind=r.cost==='temper'?'bs':'en',D=IMPROVE[kind],s=p.prof[pk],ok=s!=null&&s>=r.req;const sel=improveSel[r.id]=improveSel[r.id]||{};
  const slots=r.target.filter(sl=>p.gear[sl]);if(!slots.includes(sel.slot))sel.slot=slots[0];const it=p.gear[sel.slot];
  const otherK=it&&it[kind==='bs'?'en':'bs']&&it[kind==='bs'?'en':'bs'].k,opts=D.stats.filter(k=>k!==otherK);if(!opts.includes(sel.k))sel.k=opts[0];
  const row=document.createElement('div');row.className='srow';const cost=it?improveCost(it,kind):null,rng=it?improveRange(p,it,kind,sel.k):null;
  row.innerHTML=`<div class="nm"><b style="font-weight:normal">${r.n}</b><br><span class="muted">${r.desc}</span>`+(it?`<div class="tsel">Item: <select data-s>${slots.map(sl=>`<option value="${sl}"${sl===sel.slot?' selected':''}>${p.gear[sl].name}</option>`).join('')}</select>
    Add: <select data-k>${opts.map(k=>`<option value="${k}"${k===sel.k?' selected':''}>${STATLBL[k]}</option>`).join('')}</select></div>
    <span class="muted">Gives +${rng[0]}–${rng[1]} ${STATLBL[sel.k]}${it[kind]?` (replaces +${it[kind].v} ${STATLBL[it[kind].k]})`:''}</span><br><span style="font-size:12px">${costText(cost,p)}</span>`:'<br><span class="muted">Equip a matching item first.</span>')+'</div>';
  const b=document.createElement('button');b.textContent=kind==='bs'?'Temper':'Enchant';b.disabled=!ok||!it||!hasMats(p,cost);b.onclick=()=>craftTarget(p,pk,r);row.appendChild(b);
  const ss=row.querySelector('[data-s]'),sk=row.querySelector('[data-k]');if(ss)ss.onchange=()=>{sel.slot=ss.value;renderProf()};if(sk)sk.onchange=()=>{sel.k=sk.value;renderProf()};box.appendChild(row)}
let profOpen=false;
function toggleProf(v){profOpen=v===undefined?!profOpen:v;if(profOpen){toggleInv(false);toggleTal(false);closeShop()}$('prof').classList.toggle('hidden',!profOpen);hideTip();if(profOpen){mouse.l=false;renderProf()}}
function closeProf(){if(profOpen)toggleProf(false)}
function renderProf(){const p=players[0];if(!p)return;$('matsRow').innerHTML=Object.entries(MAT_FAM).map(([k,f])=>`<span class="mat">${f.icon} ${f.n}: ${[1,2,3].map(t=>`<b style="color:${GRADE_COL[t-1]}">${p.mats[t===1?k:k+t]||0}</b>`).join(' / ')}</span>`).join('')+`<span class="mat">💠 Essence: <b>${p.mats.essence||0}</b></span><span class="muted" style="width:100%">Grades: <span style="color:${GRADE_COL[0]}">normal</span> / <span style="color:${GRADE_COL[1]}">good</span> / <span style="color:${GRADE_COL[2]}">grand</span>. Better grades drop from stronger monsters.</span>`;
  $('matsRow').insertAdjacentHTML('beforeend','<span class="mat">'+['herb1','herb2','herb3','berries','water','vial','meat','meat2','meat3'].map(k=>`<span title="${MATS[k].n}">${MATS[k].icon} <b style="color:${GRADE_COL[MATS[k].t-1]}">${p.mats[k]||0}</b></span>`).join(' &nbsp;')+'</span>');
  const el=$('profList');el.innerHTML='';
  for(const[pk,P]of Object.entries(PROF)){const s=p.prof[pk],box=document.createElement('div');box.className='branch';
    box.innerHTML=`<h3>${P.icon} ${P.name} ${s!=null?`<span class="muted">(${s}/100)</span>`:''}</h3>`+(s==null?`<p class="muted" style="text-align:center">Learn it from the trainer at ${P.at} in a city.</p>`:`<div class="bar xp" style="margin-bottom:8px"><i style="width:${s}%"></i></div>`);
    for(const r of P.recipes){if(r.target){targetRow(p,pk,r,box);continue}const ok=s!=null&&s>=r.req,mats=hasMats(p,r.cost);const row=document.createElement('div');row.className='srow';
      row.innerHTML=`<div class="nm"><b style="font-weight:normal">${r.n}</b> <span class="muted">${ok?'':'(skill '+r.req+')'}</span><br><span class="muted">${r.desc}</span><br><span style="font-size:12px">${costText(r.cost,p)}</span></div>`;
      const b=document.createElement('button');b.textContent='Craft';b.disabled=!ok||!mats;b.onclick=()=>craft(p,pk,r);row.appendChild(b);box.appendChild(row)}
    el.appendChild(box)}
  $('bagInfo').textContent=`${p.bagName||'Starter Pouch'}: ${p.bagSize} slots`+(p.lootBonus?` · +${Math.round(p.lootBonus*100)}% loot chance`:'')}

// ================= Shops =================
let curShop=null;
function shopItems(type,p){const slots=SHOPS[type].sells.filter(s=>SLOTS.includes(s));if(!slots.length)return[];return Array.from({length:6},(_,i)=>genItem(p.level+(i<2?1:0),i<2?2:i<4?1:0,p.cls,pick(slots),RAR_W.shop))}
function openShop(type,b){const p=players[0],def=SHOPS[type];let st;
  if(type==='tilda'){if(!p.shop||Date.now()-p.shop.t>300000||p.shop.lvl<p.level-1)restock(p);st=p.shop}
  else{if(!b.stock||Date.now()-b.stock.t>300000||b.stock.lvl<p.level-1)b.stock={t:Date.now(),lvl:p.level,items:shopItems(type,p)};st=b.stock}
  curShop={type,def,b,st};toggleInv(false);toggleTal(false);closeProf();shopOpen=true;mouse.l=false;$('shop').classList.remove('hidden');$('shopTitle').textContent=def.name;renderShop()}
function renderShop(){const p=players[0],cs=curShop;if(!cs)return;$('shopGold').textContent=p.gold;const st=$('stock');st.innerHTML='';const def=cs.def;
  const row=(icon,html,price,fn,tip,dis)=>{const d=document.createElement('div');d.className='srow';d.innerHTML=`<div class="ic">${icon}</div><div class="nm">${html}</div>`;const b=document.createElement('button');b.textContent=price===0?'Learn':'🪙 '+price;b.disabled=dis||p.gold<price;b.onclick=()=>{if(p.gold>=price&&!dis)fn()};d.appendChild(b);if(tip){d.onmouseenter=()=>showTip(tip());d.onmouseleave=hideTip}return d};
  const supRow=(k,price,label)=>st.appendChild(row(supHtml(k),`${label||supName(k)} <span class="muted">(${supCount(p,k)} owned)</span><br><span class="muted">${SUP[k]?supDesc(k,p):MATS[k].n+' for crafting.'}</span>`,price,()=>{p.gold-=price;addSup(p,k,1);sfx('gold');renderShop();save()}));
  if(def.sells.includes('potion')){const t=potTier(p.level);for(const k of['hp'+t,'mp'+t])supRow(k,SUP[k].price)}
  if(def.sells.includes('supplies')){for(const[k,pr]of[['vial',3],['water',2]])st.appendChild(row(MATS[k].icon,`${MATS[k].n} <span class="muted">(${p.mats[k]||0} owned)</span><br><span class="muted">${k==='vial'?'Needed for Alchemy.':'For Cooking, or drink it (X) to restore a little mana.'}</span>`,pr,()=>{p.gold-=pr;p.mats[k]=(p.mats[k]||0)+1;sfx('gold');renderShop();save()}))}
  if(def.sells.includes('light'))LIGHTS.forEach((L,i)=>{if(p.light>i)return;st.appendChild(row(L.icon,`${L.name} <span class="muted">${p.level<L.lvl?'(level '+L.lvl+')':''}</span><br><span class="muted">${L.desc}</span>`,L.cost,()=>{p.gold-=L.cost;p.light=i+1;sfx('loot',{rar:1});toast(`You carry a ${L.name.toLowerCase()} now.`,'gold');renderShop();save()},null,p.level<L.lvl))});
  if(def.sells.includes('mount'))for(const k of(cs.b&&cs.b.mounts)||[]){const M=MOUNTS[k],own=p.mounts.includes(k);st.appendChild(row(M.icon,`${M.name} <span class="muted">${own?'(owned)':p.level<M.lvl?'(level '+M.lvl+')':''}</span><br><span class="muted">${M.desc}</span>`,M.cost,()=>{p.gold-=M.cost;p.mounts.push(k);p.mount=k;sfx('quest');toast(`${M.name} is yours! Press F to ride.`,'gold');renderShop();buildAbar(p);save()},null,own||p.level<M.lvl))}
  cs.st.items.forEach((it,i)=>st.appendChild(row(itemIcon(it),`<span style="color:${RAR[it.rar].c}">${it.name}</span>`,buyPrice(it),()=>{if(p.bag.length>=p.bagSize){toast('Bag is full');return}p.gold-=buyPrice(it);p.bag.push(it);cs.st.items.splice(i,1);hideTip();sfx('gold');toast('Bought '+it.name);renderShop();save()},()=>itemTip(it,p.gear[it.slot]||null))));
  const sv=$('services');sv.innerHTML='';
  const tr=cs.b&&cs.b.trainer;if(tr){const P=PROF[tr];sv.insertAdjacentHTML('beforeend','<div class="muted" style="margin:12px 0 4px">Trainer</div>');
    if(p.prof[tr]==null)sv.appendChild(row(P.icon,`Learn ${P.name}<br><span class="muted">Only taught here. Craft with materials from monsters anywhere (P opens your professions).</span>`,0,()=>{p.prof[tr]=1;sfx('quest');toast(`You learned ${P.name}! Press P to craft.`,'gold');renderShop();save()}));
    else sv.insertAdjacentHTML('beforeend',`<div class="srow"><div class="ic">${P.icon}</div><div class="nm">${P.name}: skill ${p.prof[tr]}/100 <span class="muted">(press P to craft)</span></div></div>`)}
  if(def.services){sv.insertAdjacentHTML('beforeend','<div class="muted" style="margin:12px 0 4px">Services</div>');
    const spent=Object.values(p.talents).reduce((a,b)=>a+b,0),ab=Object.values(p.attr).reduce((a,b)=>a+b,0);
    sv.appendChild(row('🔄',`Reset talents <span class="muted">(refund ${spent} points)</span>`,respecPrice(p),()=>{if(!spent)return;p.gold-=respecPrice(p);p.tpoints+=spent;p.talents={};calcStats(p);toast('Talents reset');renderShop();save()}));
    if(p.spec)sv.appendChild(row('⭐',`Change specialization <span class="muted">(${TAL[p.cls].specs[p.spec].name})</span>`,respecPrice(p)*2,()=>{p.gold-=respecPrice(p)*2;for(const t of TAL[p.cls].specs[p.spec].tree){p.tpoints+=p.talents[t.id]||0;delete p.talents[t.id]}p.spec=null;p.abil=abilList(p);calcStats(p);buildAbar(p);closeShop();toggleTal(true);save()}));
    sv.appendChild(row('⚖️',`Reset attributes <span class="muted">(refund ${ab} points)</span>`,respecPrice(p),()=>{if(!ab)return;p.gold-=respecPrice(p);p.points+=ab;p.attr={str:0,agi:0,int:0,sta:0};calcStats(p);toast('Attributes reset');renderShop();save()}))}
  const bag=$('sbag');bag.innerHTML='';for(let i=0;i<p.bagSize;i++){const it=p.bag[i];const d=document.createElement('div');d.className='cell';
    if(it){d.style.borderColor=RAR[it.rar].c;d.innerHTML=cellHtml(it);d.onmouseenter=()=>showTip(itemTip(it,p.gear[it.slot]||null)+`<div class="ts" style="margin-top:6px">Click to sell for ${sellPrice(it)} gold</div>`);d.onmouseleave=hideTip;
      d.onclick=()=>{p.gold+=sellPrice(it);p.bag.splice(i,1);hideTip();sfx('gold');renderShop();save()}}bag.appendChild(d)}}

// ================= Bosses with pattern lists (dungeon bosses) =================
function genericBoss(e,t,hpf){const b=ETYPES[e.type],pats=b.pats;if(!pats)return false;
  if(pats.includes('enrage')&&hpf<.3&&!e.enraged){e.enraged=true;toast(e.name+' becomes enraged!','danger');shake=10}
  const opts=pats.filter(x=>x!=='enrage'&&(!x.startsWith('summon')||(hpf<.75&&time-e.lastSummon>15)));if(!opts.length){e.pat=1.2;return false}
  const pt=pick(opts),col=b.shot||'#fff';
  if(pt.startsWith('summon:')){e.lastSummon=time;bossSummon(e,pt.slice(7),3,Math.max(1,e.lvl-2));toast(e.name+' calls for aid!');e.pat=2.4;return true}
  switch(pt){
    case'charge':{const a=e.aim;e.charge={a,wind:.65,t:.5,hit:new Set()};areas.push(mkArea({x:e.x,y:e.y,r:0,delay:.65,kind:'line',a,len:330,side:'enemy',src:e}));e.pat=2.6;return true}
    case'fan':for(let i=-2;i<=2;i++){const a=e.aim+i*.2;fireProj({side:'enemy',src:e,x:e.x,y:e.y,vx:Math.cos(a)*310,vy:Math.sin(a)*310,dmg:e.dmg*.7,col,kind:'orb',life:1.8,r:8})}e.pat=2.3;return true;
    case'nova':{const n=hpf<.5?18:12;for(let k=0;k<n;k++){const a=k/n*TAU+rt;fireProj({side:'enemy',src:e,x:e.x,y:e.y,vx:Math.cos(a)*230,vy:Math.sin(a)*230,dmg:e.dmg*.6,col,kind:'orb',life:2.4,r:7})}e.pat=2.5;return true}
    case'slam':e.busyUntil=time+.9;areas.push(mkArea({x:t.x,y:t.y,r:110,delay:.9,side:'enemy',src:e,burst:{dmg:e.dmg*1.5},kind:'tele'}));e.pat=2.6;return true;
    case'spin':e.busyUntil=time+.8;areas.push(mkArea({x:e.x,y:e.y,r:115,delay:.8,follow:e,side:'enemy',src:e,burst:{dmg:e.dmg*1.4},kind:'tele'}));e.pat=2.7;return true;
    case'boulder':for(let k=0;k<2;k++)areas.push(mkArea({x:t.x+rand(-60,60)*k,y:t.y+rand(-60,60)*k,r:80,delay:1.1+k*.25,side:'enemy',src:e,burst:{dmg:e.dmg*1.1,stun:.6},kind:'boulder',onBurst:a=>{shake=8;sfx('slam');burst(a.x,a.y,'#8a7a5a',30,200)}}));e.busyUntil=time+.5;e.pat=2.8;return true}
  e.pat=1.3;return false}
function caveSpawner(){const p=players[0];if(!p||p.dead)return;for(const e of enemies)if(!e.persist&&!e.target&&dist(e,p)>1500)e.remove=true;
  if(enemies.length>=16)return;const sp=zone.spawn;
  for(let tries=0;tries<14;tries++){const a=rand(0,TAU),d=rand(560,900),x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d;if(!free(x,y,16))continue;
    const type=pick(sp.pool),lvl=sp.lvl[0]+Math.floor(Math.random()*(sp.lvl[1]-sp.lvl[0]+1)),n=type==='bat'||type==='sporeling'?3:ETYPES[type].big?1:(Math.random()<.5?2:1);
    for(let k=0;k<n;k++){const ex=x+rand(-40,40),ey=y+rand(-40,40);if(free(ex,ey,ETYPES[type].r))spawnEnemy(type,ex,ey,lvl)}break}}
function restock(p){p.shop={t:Date.now(),lvl:p.level,items:Array.from({length:6},(_,i)=>genItem(p.level,i<2?1:0,p.cls,null,RAR_W.shop))}}
