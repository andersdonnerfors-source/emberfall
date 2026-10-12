// ================= Character select =================
// A night camp under the stars: your heroes gather around a fire, the chosen one steps into the light.
// The list on the right shows each hero's name, level, class and where they last stood.
const SEL={idx:0,heroes:[],embers:[],stars:null,hits:[],busy:false};
const LAST_KEY='emberfall-last';
function heroLoc(d){const p=d.p;if(p.loc)return p.loc;if(!p.x)return homeCityName(p);const f=OW/(p.ws||200);return locName(p.x*f/TILE,p.y*f/TILE)}
function homeCityName(p){const c=CITIES.find(c=>c.id===(p.home||'emberfall'));return c?c.name:'Emberfall'}
function locName(tx,ty){for(const c of CITIES)if(Math.hypot(tx-c.x,ty-c.y)<c.r+2)return c.name;const b=biomeOf(Math.floor(tx),Math.floor(ty));
  if(Math.hypot(tx-BARROW.x,ty-BARROW.y)<12)return'The Barrow-downs';return isDeep(tx,ty,b)?'Deep Wilds · '+BIOME_NAME[b].replace(/^The /,''):BIOME_NAME[b]}
function selHero(i){const h=SEL.heroes[i];if(!h)return null;const d=h.data.p;return{cls:d.cls,look:d.look,gear:Object.assign({weapon:starterWeapon(d.cls),offhand:starterOffhand(d.cls)},d.gear||{}),bagSize:d.bagSize||20,level:d.level||1,spec:d.spec}}
async function openSelect(){state='title';show('title');if(Account.mode==='online'){await ensureProfile();netInit().catch(e=>console.error(e))}$('acctLabel').textContent=Account.mode==='offline'&&!storageOK()?'Saving is blocked in this window. Open the game with Play Emberfall.':Account.label();$('btnAcct').textContent=Account.mode==='online'?'Sign out':'Sign in';
  $('heroList').innerHTML='<div class="muted" style="padding:20px;text-align:center">Gathering your heroes…</div>';
  try{SEL.heroes=await Account.list()}catch(e){SEL.heroes=[];toast('Could not load heroes: '+e.message,'danger')}
  const last=fetchStore(LAST_KEY);SEL.idx=Math.max(0,SEL.heroes.findIndex(h=>h.id===last));renderSelect()}
function refreshTitle(){if(state==='title')openSelect()}
function renderSelect(){const el=$('heroList');el.innerHTML='';const hs=SEL.heroes;
  if(!hs.length)el.innerHTML='<div class="selempty">No heroes yet.<br>The fire is lit and waiting.<br><br>Create your first hero to begin.</div>';
  hs.forEach((h,i)=>{const d=h.data.p,c=CLASSES[d.cls],spec=d.spec&&TAL[d.cls].specs[d.spec],row=document.createElement('div');row.className='herocard'+(i===SEL.idx?' on':'');
    row.innerHTML=`<div class="hc-ic"></div><div class="hc-tx"><b>${escapeHtml(d.name)}</b><span>Level ${d.level||1} ${c.name}${spec?' · '+spec.name:''}</span><small>📍 ${escapeHtml(heroLoc(h.data))}</small></div>`;
    row.firstChild.appendChild(portraitEl(selHero(i),40));row.onclick=()=>{SEL.idx=i;sfx('click');renderSelect()};row.ondblclick=()=>playSelected();el.appendChild(row)});
  const full=hs.length>=MAX_HEROES;$('btnNew').disabled=full;$('btnNew').title=full?`You can have ${MAX_HEROES} heroes. Delete one to make room.`:'';
  $('btnPlay').disabled=!hs.length;$('btnDel').disabled=!hs.length;$('selCount').textContent=`${hs.length} / ${MAX_HEROES}`;
  $('btnImport').classList.toggle('hidden',!(Account.mode==='online'&&allSaves().heroes.length&&hs.length<MAX_HEROES))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function playSelected(){const h=SEL.heroes[SEL.idx];if(!h)return;store(LAST_KEY,h.id);startGame(h.data,false,h.id)}
// Deleting asks you to type the hero's name, so it never happens by accident.
function askDelete(){const h=SEL.heroes[SEL.idx];if(!h)return;const name=h.data.p.name;$('confirm').classList.remove('hidden');$('cfTitle').textContent='Delete '+name+'?';
  $('cfText').innerHTML=`This removes <b>${escapeHtml(name)}</b> and all their gear forever. Type the hero's name to confirm.`;const inp=$('cfInput');inp.value='';inp.focus();$('cfOk').disabled=true;
  inp.oninput=()=>{$('cfOk').disabled=inp.value.trim()!==name};
  $('cfOk').onclick=async()=>{if(inp.value.trim()!==name)return;$('confirm').classList.add('hidden');try{await Account.remove(h.id);sfx('death');toast(name+' has been laid to rest.')}catch(e){toast('Could not delete: '+e.message,'danger')}openSelect()};
  $('cfNo').onclick=()=>$('confirm').classList.add('hidden')}
$('btnPlay').onclick=playSelected;$('btnDel').onclick=askDelete;
$('btnAcct').onclick=async()=>{await Account.signOut();showLogin()};
$('btnImport').onclick=async()=>{const n=await Account.importOffline();toast(n?`Moved ${n} offline hero${n>1?'es':''} into your account.`:'Nothing was moved.','gold');openSelect()};
addEventListener('keydown',e=>{if(state!=='title'||!$('confirm').classList.contains('hidden'))return;const n=SEL.heroes.length;if(!n)return;
  if(e.code==='ArrowDown'||e.code==='ArrowUp'){SEL.idx=(SEL.idx+(e.code==='ArrowDown'?1:n-1))%n;renderSelect()}if(e.code==='Enter')playSelected()});
cvs.addEventListener('mousedown',e=>{if(state!=='title')return;for(const h of SEL.hits)if(e.clientX>h.x&&e.clientX<h.x+h.w&&e.clientY>h.y&&e.clientY<h.y+h.h){SEL.idx=h.i;sfx('click');renderSelect();return}});

// ---- The camp scene
function selStars(){const r=mulberry32(77),s=[];for(let i=0;i<170;i++)s.push({x:r(),y:Math.pow(r(),1.6)*.6,z:r()*1.6+.4,ph:r()*TAU,sp:.6+r()*2});return s}
function ridge(c,base,amp,freq,seed,col,drift){c.fillStyle=col;c.beginPath();c.moveTo(0,H);for(let x=0;x<=W+20;x+=16){const n=vnoise((x+drift)/freq+seed,seed*.37);c.lineTo(x,base-n*amp)}c.lineTo(W,H);c.closePath();c.fill()}
function drawSelectScene(dt){const c=ctx;SEL.stars=SEL.stars||selStars();const gy=H*.74,fx=W*.36,fy=H*.84,sc=clamp(H/250,2,3.6);
  // sky, stars and moon
  let g=c.createLinearGradient(0,0,0,gy);g.addColorStop(0,'#05060f');g.addColorStop(.55,'#161230');g.addColorStop(.85,'#3b1f2a');g.addColorStop(1,'#5a2a1e');c.fillStyle=g;c.fillRect(0,0,W,H);
  for(const s of SEL.stars){c.globalAlpha=.25+.6*Math.abs(Math.sin(rt*s.sp+s.ph));c.fillStyle='#f4ecff';c.fillRect(s.x*W,s.y*gy,s.z,s.z)}c.globalAlpha=1;
  const mx=W*.74,my=H*.17;c.save();c.globalCompositeOperation='lighter';c.drawImage(glowSprite('#9fb4ff'),mx-120,my-120,240,240);c.restore();c.fillStyle='#e8ecf8';circ(c,mx,my,26);c.fill();c.fillStyle='rgba(150,160,190,.35)';circ(c,mx-8,my-5,6);c.fill();circ(c,mx+9,my+7,4);c.fill();
  // mountains, then the ruined tower on the ridge
  ridge(c,gy-60,170,260,3,'#1e1830',rt*2);ridge(c,gy-20,110,170,9,'#151224',rt*4);
  {const tx=W*.12,ty=gy-40;c.fillStyle='#0d0b16';c.beginPath();c.moveTo(tx-26,ty+40);c.lineTo(tx-20,ty-150);c.lineTo(tx-8,ty-162);c.lineTo(tx+2,ty-150);c.lineTo(tx+10,ty-170);c.lineTo(tx+22,ty-150);c.lineTo(tx+28,ty+40);c.fill();
    const l=.6+.4*Math.sin(rt*3.1)*Math.sin(rt*1.7);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=l;c.drawImage(glowSprite('#ffb060'),tx-30,ty-120,60,60);c.restore();c.fillStyle=`rgba(255,190,110,${.6+.4*l})`;c.fillRect(tx-3,ty-96,6,9)}
  ridge(c,gy+10,50,120,15,'#0e0b12',0);
  // ground and firelight
  g=c.createLinearGradient(0,gy,0,H);g.addColorStop(0,'#120d0c');g.addColorStop(1,'#070505');c.fillStyle=g;c.fillRect(0,gy+10,W,H);
  const fl=.85+.15*Math.sin(rt*13)*Math.sin(rt*7.3);c.save();c.globalCompositeOperation='lighter';g=c.createRadialGradient(fx,fy,0,fx,fy,W*.42*fl);g.addColorStop(0,'rgba(255,140,60,.5)');g.addColorStop(.35,'rgba(200,80,30,.16)');g.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=g;c.save();c.translate(fx,fy);c.scale(1,.42);circ(c,0,0,W*.42*fl);c.fill();c.restore();c.restore();
  // heroes around the fire: the chosen one stands in front, the others wait in the half-dark
  SEL.hits=[];const hs=SEL.heroes,spots=[[-.12,-.03],[-.21,-.06],[.2,-.07],[-.05,-.1],[.11,-.11]];let k=0;const order=[];
  hs.forEach((h,i)=>{if(i!==SEL.idx)order.push([i,spots[k++%spots.length]])});
  for(const[i,[ox,oy]]of order.sort((a,b)=>a[1][1]-b[1][1])){const p=selHero(i),hx=fx+ox*W,hy=fy+oy*H,o=playerLook(p);o.s=sc*.58;o.aim=hx<fx?0:Math.PI;o.aimS=o.aim;o.walk=0;o.moving=false;o.ph=i;
    c.filter='brightness(0.42) saturate(0.6)';softShadow(c,hx,hy,24*o.s,7*o.s);drawHumanoid(c,hx,hy,o);c.filter='none';SEL.hits.push({x:hx-14*o.s,y:hy-56*o.s,w:28*o.s,h:58*o.s,i})}
  drawCampfire(c,fx,fy,sc,dt);
  if(hs[SEL.idx]){const p=selHero(SEL.idx),hx=fx+W*.1,hy=fy+H*.035,o=playerLook(p);o.s=sc;o.aim=Math.PI*.92;o.aimS=o.aim;o.walk=0;o.moving=false;
    softShadow(c,hx,hy,26*sc,8*sc);drawHumanoid(c,hx,hy,o);c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.18*fl;c.drawImage(glowSprite('#ff9a50'),hx-40*sc,hy-60*sc,50*sc,70*sc);c.restore();
    SEL.hits.push({x:hx-14*sc,y:hy-56*sc,w:28*sc,h:58*sc,i:SEL.idx});
    const d=hs[SEL.idx].data.p;c.textAlign='center';c.font=`${Math.round(16+sc*3)}px Georgia`;c.fillStyle='rgba(0,0,0,.6)';c.fillText(d.name,hx+1,hy-60*sc+1);c.fillStyle='#f3e2b0';c.fillText(d.name,hx,hy-60*sc)}
  // drifting mist and a dark frame
  c.save();c.globalAlpha=.08;c.fillStyle='#b8b8d0';for(let i=0;i<4;i++){const x=((rt*12*(i+1)+i*W/3)%(W+600))-300;c.beginPath();c.ellipse(x,gy+30+i*22,320,26,0,0,TAU);c.fill()}c.restore();
  g=c.createRadialGradient(W*.4,H*.6,Math.min(W,H)*.3,W*.5,H*.5,Math.max(W,H)*.8);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,.75)');c.fillStyle=g;c.fillRect(0,0,W,H)}
function drawCampfire(c,x,y,sc,dt){const s=sc*.9;
  c.fillStyle='#3a3530';for(let i=0;i<8;i++){const a=i/8*TAU;c.beginPath();c.ellipse(x+Math.cos(a)*16*s,y+Math.sin(a)*6*s,4.5*s,3*s,0,0,TAU);c.fill()}
  c.strokeStyle='#4a2e18';c.lineWidth=4*s;c.lineCap='round';c.beginPath();c.moveTo(x-12*s,y+2*s);c.lineTo(x+10*s,y-5*s);c.moveTo(x+12*s,y+2*s);c.lineTo(x-10*s,y-5*s);c.stroke();
  c.save();c.globalCompositeOperation='lighter';for(let i=0;i<5;i++){const t=rt*(5+i)+i*1.7,h=(22+8*Math.sin(t))*s*(1-i*.12),w=(9-i)*s,ox=Math.sin(t*1.3)*2*s;
    const g=c.createRadialGradient(x+ox,y-h*.35,0,x+ox,y-h*.35,h*.7);g.addColorStop(0,i<2?'rgba(255,240,180,.9)':'rgba(255,160,60,.6)');g.addColorStop(1,'rgba(255,60,0,0)');c.fillStyle=g;
    c.beginPath();c.moveTo(x+ox-w,y-2*s);c.quadraticCurveTo(x+ox-w*.6,y-h*.6,x+ox+Math.sin(t*2)*3*s,y-h);c.quadraticCurveTo(x+ox+w*.6,y-h*.6,x+ox+w,y-2*s);c.fill()}
  c.drawImage(glowSprite('#ff8a30'),x-60*s,y-70*s,120*s,100*s);
  if(Math.random()<dt*28)SEL.embers.push({x:x+rand(-8,8)*s,y:y-10*s,vx:rand(-12,12),vy:-rand(40,90),life:rand(1.2,2.6),max:2.6});
  for(const e of SEL.embers){e.life-=dt;e.x+=(e.vx+Math.sin(rt*2+e.max*9)*14)*dt;e.y+=e.vy*dt;c.globalAlpha=Math.max(0,e.life/e.max);c.drawImage(glowSprite('#ffb050'),e.x-4,e.y-4,8,8)}
  SEL.embers=SEL.embers.filter(e=>e.life>0);c.restore();c.globalAlpha=1}
