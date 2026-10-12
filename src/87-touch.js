// ---- Touch: auto-aim (pure logic; the controls are added below)
const Aim={target:null},AIM_MELEE=120,AIM_FAR=460,_aimR={};
// Reach of ability i: 120 for the attack and melee abilities, 460 for ranged and spells (decided once per ability, from its cast code).
function aimRange(p,i){const a=p.abil[i];if(!a)return AIM_FAR;const k=a.name;return _aimR[k]||(_aimR[k]=String(a.cast).includes('melee(')?AIM_MELEE:AIM_FAR)}
// Direction the player faces: the move vector if moving, else where p.aim points.
function aimFace(p){const i=p.input||{},l=Math.hypot(i.mx||0,i.my||0);return l>0?{x:i.mx/l,y:i.my/l}:{x:Math.cos(p.aim||0),y:Math.sin(p.aim||0)}}
// Lower is better: distance x (1.6 - 0.6 cos(angle off the facing)), so enemies straight ahead win.
function aimScore(p,e,face){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),fl=Math.hypot(face.x,face.y);return d<1e-6||fl<1e-6?d:d*(1.6-.6*(dx*face.x+dy*face.y)/(d*fl))}
// Keeps cur while it is still a candidate, unless another one scores under 70% of its score.
function aimPick(p,cands,face,cur){let best=null,bs=1e9;for(const e of cands){const s=aimScore(p,e,face);if(s<bs){bs=s;best=e}}
  if(cur&&cands.includes(cur)&&!(bs<.7*aimScore(p,cur,face)))return cur;return best}
// While idle on touch: re-pick the preview target every 0.2 s (the ring under it shows what the next tap will hit).
function aimPreview(p){if(!Touch.on||isPaused()||rt<(Aim.pt||0))return;Aim.pt=rt+.2;if(Touch.fire||Touch.drag)return;Aim.target=aimPick(p,aimCands(p,aimRange(p,0)),aimFace(p),Aim.target)}
function aimCands(p,range,list=enemies,los=(a,b)=>lineClear(a.x,a.y,b.x,b.y,PBLOCK)){return list.filter(e=>!e.dead&&e.hp>0&&dist(p,e)<=range&&los(p,e))}
// Most hurt party member in reach (for heals), else the caster.
function aimFriendly(p,range){let best=p,bf=2;for(const q of players){if(q.dead||q.away||dist(p,q)>range)continue;const f=q.hp/q.maxHp;if(f<bf){bf=f;best=q}}return best}
// Where ability i should land: the auto-target, the most hurt ally for heals, or 200 px ahead.
function aimPoint(p,i){const a=p.abil[i],r=aimRange(p,i);if(a&&a.heal)return aimFriendly(p,r);
  const f=aimFace(p);Aim.target=aimPick(p,aimCands(p,r),f,Aim.target);
  if(Aim.target){hudTarget=Aim.target;return{x:Aim.target.x,y:Aim.target.y}}
  return{x:p.x+f.x*200,y:p.y+f.y*200}}

// ---- Touch controls: stick (left thumb), attack + ability arc + quick row (right thumb), context and menu buttons, hold for tooltips.
// Shown after a touch (or on a coarse-pointer device); any mouse movement or key press hides them, so keyboard and mouse play is unchanged.
const Touch={on:false,mx:0,my:0,fire:false,aimOverride:null,ptr:{}},STICK_R=60,STICK_DEAD=.1,STICK_RUN=.5,STICK_ZONE=.45,DRAG_PX=18,HOLD_MS=450,SLOT_R=28,ARC_R=104,ARC_ANG=[0,205,171,136,102,67];
// Stick offset in px -> vector of length <= 1 (60 px radius, the inner 10% is dead).
function stickVec(dx,dy){const d=Math.hypot(dx,dy),n=d/STICK_R;if(n<=STICK_DEAD)return{x:0,y:0};const m=Math.min(1,(n-STICK_DEAD)/(1-STICK_DEAD));return{x:dx/d*m,y:dy/d*m}}
const touchIsDrag=(dx,dy)=>Math.hypot(dx,dy)>DRAG_PX;
function touchReset(){Touch.ptr={};Touch.mx=Touch.my=0;Touch.fire=false;Touch.aimOverride=null;Touch.drag=null;Touch.kx=Touch.ky=0;if(Touch.hold)clearTimeout(Touch.hold.t);Touch.hold=null;touchDrawStick();touchDrawAim()}
function touchShow(on){if(Touch.on===on)return;Touch.on=on;document.body.classList.toggle('touch',on);touchReset();$('tmenu').classList.add('hidden')}
// Stick: one owner pointer; it appears where the thumb lands in the left 45%.
function stickDown(e){if(Touch.ptr.stick!=null||e.clientX>innerWidth*STICK_ZONE)return false;Touch.ptr.stick=e.pointerId;Touch.sx=e.clientX;Touch.sy=e.clientY;Touch.mx=Touch.my=Touch.kx=Touch.ky=0;touchDrawStick();return true}
// The thumb moves on screen; the world is squashed by TILT, so the move vector is turned to match what the player sees.
function stickMove(e){if(e.pointerId!==Touch.ptr.stick)return;const dx=e.clientX-Touch.sx,dy=e.clientY-Touch.sy,d=Math.hypot(dx,dy),v=stickVec(dx,dy),m=Math.hypot(v.x,v.y),wy=dy/TILT,wl=Math.hypot(dx,wy)||1,k=Math.min(d,STICK_R)/(d||1);
  Touch.mx=dx/wl*m;Touch.my=wy/wl*m;Touch.kx=dx*k;Touch.ky=dy*k;touchDrawStick()}
function stickUp(e){if(e.pointerId!==Touch.ptr.stick)return;delete Touch.ptr.stick;Touch.mx=Touch.my=Touch.kx=Touch.ky=0;touchDrawStick()}
function touchDrawStick(){const s=$('stick'),on=Touch.ptr.stick!=null;s.classList.toggle('on',on);s.style.left=on?Touch.sx+'px':'';s.style.top=on?Touch.sy+'px':'';s.style.setProperty('--kx',(Touch.kx||0)+'px');s.style.setProperty('--ky',(Touch.ky||0)+'px')}
// Attack: held = attacking the auto-target, like holding the left mouse button.
function atkDown(e){if(Touch.ptr.atk!=null||state!=='play'||isPaused())return false;Touch.ptr.atk=e.pointerId;Touch.fire=true;return true}
function atkUp(e){if(e.pointerId!==Touch.ptr.atk)return;delete Touch.ptr.atk;Touch.fire=false}
// Ability slots: a tap casts at aimPoint; a drag past 18 px aims (aimOverride) and casts on release; leaving the slot and coming back onto it cancels.
function slotDown(i,e){if(Touch.ptr.abil!=null||state!=='play'||isPaused())return false;const el=document.querySelector('#arc [data-i="'+i+'"]'),r=el&&el.getBoundingClientRect(),c=r&&r.width?{x:r.left+r.width/2,y:r.top+r.height/2}:{x:e.clientX,y:e.clientY};
  Touch.ptr.abil=e.pointerId;Touch.drag={i,x0:e.clientX,y0:e.clientY,cx:c.x,cy:c.y,on:false,out:false,cancel:false};Touch.aimOverride=null;return true}
function slotMove(e){const d=Touch.drag,p=players[0];if(!d||e.pointerId!==Touch.ptr.abil||!p)return;const dx=e.clientX-d.x0,dy=e.clientY-d.y0;if(!d.on&&touchIsDrag(dx,dy))d.on=true;if(!d.on)return;
  const dc=Math.hypot(e.clientX-d.cx,e.clientY-d.cy);if(dc>SLOT_R)d.out=true;d.cancel=d.out&&dc<=SLOT_R;Touch.aimOverride=d.cancel?null:touchAimAt(p,d.i,dx,dy);touchDrawAim()}
function slotUp(e,lost){const d=Touch.drag,p=players[0];if(!d||e.pointerId!==Touch.ptr.abil)return;delete Touch.ptr.abil;Touch.drag=null;const held=Touch.hold&&Touch.hold.fired&&Touch.hold.id===e.pointerId;
  if(p&&!lost&&!held&&!d.cancel&&(!d.on||Touch.aimOverride))p.input.abil[d.i]=true;if(!d.on||d.cancel||lost||held)Touch.aimOverride=null;touchDrawAim()}
// A drag of 120 px reaches the ability's full range, in the dragged direction (as seen on screen).
function touchAimAt(p,i,dx,dy){const r=aimRange(p,i),wy=dy/TILT,l=Math.hypot(dx,wy)||1,k=Math.min(1,Math.hypot(dx,dy)/120)*r;return{x:p.x+dx/l*k,y:p.y+wy/l*k}}
// Aim line from the hero, plus a ground circle for spells (melee shows the line only).
function touchDrawAim(){const g=$('aimSvg'),d=Touch.drag,p=players[0],q=Touch.aimOverride;document.querySelectorAll('#arc .tslot').forEach(s=>{const me=!!d&&+s.dataset.i===d.i;s.classList.toggle('act',me&&d.on&&!d.cancel);s.classList.toggle('cancel',me&&d.cancel)});
  if(!d||!d.on||!q||!p){g.classList.add('hidden');return}g.classList.remove('hidden');const[a,b]=S(p.x,p.y),[x,y]=S(q.x,q.y),L=g.children[0],E=g.children[1],sp=aimRange(p,d.i)>AIM_MELEE;
  L.setAttribute('x1',a);L.setAttribute('y1',b-24);L.setAttribute('x2',x);L.setAttribute('y2',sp?y:y-24);E.style.display=sp?'':'none';E.setAttribute('cx',x);E.setAttribute('cy',y);E.setAttribute('rx',44);E.setAttribute('ry',44*TILT)}
// Touch version of readInput: stick -> move (walks below 0.5, runs from 0.5), then the aim for whatever fires this frame.
function touchInput(p){const i=p.input,v=Math.hypot(Touch.mx,Touch.my),s=Math.min(1,v/STICK_RUN);i.mx=v>0?Touch.mx/v*s:0;i.my=v>0?Touch.my/v*s:0;i.fire=Touch.fire;
  const k=i.abil.findIndex((b,j)=>j>0&&b),d=Touch.drag;let q=null;if(k>0){q=Touch.aimOverride||aimPoint(p,k);Touch.aimOverride=null}else if(i.fire)q=aimPoint(p,0);else if(d&&d.on&&Touch.aimOverride)q=Touch.aimOverride;else if(v>0)q={x:p.x+Touch.mx/v*100,y:p.y+Touch.my/v*100};
  if(q){i.ax=q.x;i.ay=q.y}}
// Hold 450 ms on anything with a tooltip ([data-tip] or a mouse-enter tooltip) to show it; lifting hides it. It also stands in for right-click.
// Moving more than 18 px ends the hold (and hides its tooltip), so a held ability slot that is then dragged still aims and casts.
function tipEl(t){for(let e=t;e&&e!==document.body&&e.nodeType===1;e=e.parentElement)if(e.dataset.tip!=null||e.onmouseenter)return e;return null}
function holdStart(e){const el=tipEl(e.target);if(!el)return;if(Touch.hold)clearTimeout(Touch.hold.t);const h=Touch.hold={id:e.pointerId,x:e.clientX,y:e.clientY,el,fired:false};
  h.t=setTimeout(()=>{if(Touch.hold!==h)return;h.fired=true;mouse.x=h.x;mouse.y=h.y;if(el.dataset.tip!=null)showTip(el.dataset.tip);else el.onmouseenter({target:el});if(el.oncontextmenu)el.oncontextmenu({target:el,preventDefault(){},stopPropagation(){}})},HOLD_MS)}
function holdMove(e){const h=Touch.hold;if(h&&e.pointerId===h.id&&touchIsDrag(e.clientX-h.x,e.clientY-h.y)){clearTimeout(h.t);Touch.hold=null;if(h.fired)hideTip()}}
function holdEnd(e){const h=Touch.hold;if(!h||e.pointerId!==h.id)return;clearTimeout(h.t);Touch.hold=null;if(h.fired){hideTip();Touch.noClick=performance.now()+500}}
// Builds the arc for the hero's class (again whenever the class changes): attack in the corner, abilities 1-4 round it, R on top.
function touchBuild(p){Touch.built=p.abil;touchLayout.key=null;document.querySelectorAll('#arc .tslot').forEach(s=>{const i=+s.dataset.i,a=p.abil[i],src=$('abar').children[i];s.innerHTML=`<div class="ic">${a?a.icon:''}</div><div class="cd"></div><div class="cdt"></div>`;s.onmouseenter=i&&src?src.onmouseenter:null;// no hold-tooltip on the attack button: holding it is attacking
  if(i){const g=ARC_ANG[i]*Math.PI/180,c=42-28;s.style.left=(c+Math.cos(g)*ARC_R)+'px';s.style.top=(c-Math.sin(g)*ARC_R)+'px'}})}
// Phone only: hides slots that are not unlocked yet (level below UNLOCK, or no spec for the R slot), sizes the buttons from the screen height (touchSizes)
// and places attack, abilities, quick pair and context button with touchPlace, all below the minimap + quest stack. Re-runs when level, spec, size or that stack changes.
const touchVis=(p,i)=>i===0||!!p.abil[i]&&p.abil[i]!==SPEC_LOCKED&&p.level>=UNLOCK[i];
function touchLayout(p){const ph=!!Layout.phone,tc=$('touch'),arc=$('arc'),ql=$('quick'),cx=$('ctx'),sl=[...arc.querySelectorAll('.tslot')];
  if(!ph){if(touchLayout.ph){touchLayout.ph=false;touchLayout.key=null;sl.forEach(s=>{s.style.display=''});for(const e of[arc,ql,cx]){e.style.left=e.style.top=e.style.right=e.style.bottom=''}Touch.built=null;touchBuild(p)}return}
  const z=touchSizes(innerHeight),lim=Math.ceil($('right').getBoundingClientRect().bottom)+4,vis=sl.map(s=>touchVis(p,+s.dataset.i)),key=[innerWidth,innerHeight,lim,vis.join()].join('|');
  if(touchLayout.ph&&key===touchLayout.key)return;touchLayout.ph=true;touchLayout.key=key;
  const idx=vis.map((v,i)=>v&&i>0?i:-1).filter(i=>i>0),r=touchPlace({W:innerWidth,H:innerHeight,atk:z.atk,ab:z.ab,q:z.q,limit:lim,n:idx.length}),ax=r.atk.x-z.atk/2,ay=r.atk.y-z.atk/2;
  sl.forEach((s,i)=>{s.style.display=vis[i]?'':'none'});arc.style.right=arc.style.bottom='auto';arc.style.left=ax+'px';arc.style.top=ay+'px';
  idx.forEach((i,k)=>{const s=sl[i];s.style.left=(r.abil[k].x-z.ab/2-ax)+'px';s.style.top=(r.abil[k].y-z.ab/2-ay)+'px'});
  ql.style.right=ql.style.bottom='auto';ql.style.left=r.quick.x+'px';ql.style.top=r.quick.y+'px';cx.style.right=(innerWidth-r.left+8)+'px';cx.style.bottom=r.mb+'px'}
// Per frame (from updateHud): cooldowns and counts mirror the action bar; the context button follows interactables(); the menu button sits left of the minimap.
function touchFrame(p){if(Touch.built!==p.abil)touchBuild(p);touchLayout(p);if(!p.dead)aimPreview(p);else Aim.target=null;const ab=$('abar').children;
  document.querySelectorAll('#arc .tslot').forEach(s=>{const a=ab[+s.dataset.i];if(!a)return;for(const c of['locked','poor','rdy'])s.classList.toggle(c,a.classList.contains(c));s.style.setProperty('--e',a.style.getPropertyValue('--e'));s.children[2].textContent=a.children[3].textContent});
  document.querySelectorAll('#quick .qb').forEach(b=>{const src=b.dataset.src&&$(b.dataset.src),n=b.querySelector('.cnt');if(src){b.classList.toggle('nomana',src.classList.contains('nomana'));if(n)n.textContent=(src.querySelector('.cnt')||src.querySelector('.cdt')).textContent}
    else if(b.dataset.q==='mount')b.firstChild.textContent=p.mount?MOUNTS[p.mount].icon:'🐎'});
  const it=!p.dead&&interactables(p)[0],cx=$('ctx');cx.classList.toggle('hidden',!it);if(it){cx._act=it.act;const t=it.label||(it.o===warden?'Talk':it.o===merchant?'Shop':'Use');if(cx.textContent!==t)cx.textContent=t}
  const r=$('mini').getBoundingClientRect(),mb=$('menuBtn');mb.style.right=(innerWidth-r.left+8)+'px';mb.style.top=r.top+'px';
  if(isPaused()&&!Touch.paused){touchReset();p.input.abil.fill(false);p.input.fire=false}Touch.paused=isPaused();if(Touch.drag)touchDrawAim()}
const TMENU={inv:()=>toggleInv(true),tal:()=>toggleTal(true),prof:()=>toggleProf(true),map:()=>toggleMap(true),friends:()=>toggleFriends(true),
  quest:()=>uiSheet('Quest',[...$('quest').querySelectorAll('.ql')].map(e=>({label:e.textContent}))),
  settings:()=>{if(!pauseOpen)togglePause();openOverlay('settings','pause')},food:()=>{const p=players[0];if(p)eatFood(p)},mount:()=>{const p=players[0];if(p&&!p.dead)toggleMount(p)},hearth:()=>{const p=players[0];if(p)startHearth(p)},mute:()=>{Snd.vol.muted=!Snd.vol.muted;applyVol();saveAudio();toast(Snd.vol.muted?'Sound off':'Sound on')},pause:()=>togglePause()};
function touchMenu(v){const m=$('tmenu');m.classList.toggle('hidden',v===undefined?!m.classList.contains('hidden'):!v);touchReset()}
{// Wiring. Each control captures its own pointer, so moving and casting work at the same time.
  const cap=e=>{try{e.target.setPointerCapture(e.pointerId)}catch(_){}e.preventDefault()};touchShow(matchMedia('(pointer:coarse)').matches);
  addEventListener('pointerdown',e=>{Touch.lastType=e.pointerType;if(e.pointerType==='touch'){touchShow(true);holdStart(e)}},true);
  addEventListener('pointermove',e=>{if(e.pointerType==='mouse'&&Touch.on&&(e.movementX||e.movementY))touchShow(false);stickMove(e);slotMove(e);holdMove(e)});
  const up=lost=>e=>{stickUp(e);atkUp(e);slotUp(e,lost);holdEnd(e)};addEventListener('pointerup',up(false));addEventListener('pointercancel',up(true));
  addEventListener('keydown',e=>{if(Touch.on&&!/^(INPUT|TEXTAREA)$/.test(e.target.tagName||''))touchShow(false)},true);addEventListener('blur',touchReset);document.addEventListener('visibilitychange',touchReset);addEventListener('orientationchange',touchReset);if(screen.orientation)screen.orientation.addEventListener('change',touchReset);
  addEventListener('click',e=>{if(performance.now()<(Touch.noClick||0)){Touch.noClick=0;e.stopPropagation();e.preventDefault()}},true);
  addEventListener('contextmenu',e=>{if(Touch.lastType==='touch'){e.preventDefault();e.stopPropagation()}},true);
  cvs.addEventListener('pointerdown',e=>{if(Touch.on&&e.pointerType==='touch'&&state==='play'&&!isPaused()&&stickDown(e))cap(e)});
  $('atk').addEventListener('pointerdown',e=>{if(atkDown(e))cap(e)});
  document.querySelectorAll('#arc .tslot:not(#atk)').forEach(s=>s.addEventListener('pointerdown',e=>{if(slotDown(+s.dataset.i,e))cap(e)}));
  const Q={hp:p=>drinkPotion(p,'hp'),mp:p=>drinkPotion(p,'mp'),food:p=>eatFood(p),mount:p=>{if(!p.dead)toggleMount(p)},hearth:p=>startHearth(p)};
  document.querySelectorAll('#quick .qb').forEach(b=>b.onclick=()=>{const p=players[0];if(p&&!isPaused())Q[b.dataset.q](p)});
  $('ctx').onclick=()=>{const p=players[0];if(p&&!p.dead&&!isPaused()&&$('ctx')._act)$('ctx')._act()};
  $('menuBtn').onclick=()=>touchMenu();document.querySelectorAll('#tmenu button').forEach(b=>b.onclick=()=>{touchMenu(false);if(!isPaused()||b.dataset.m==='pause'||b.dataset.m==='mute')TMENU[b.dataset.m]()})}
