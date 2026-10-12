// ================= Glass UI: shared components (panel, header, tabs, button, row, tooltip, bottom sheet) =================
const uiToken=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function uiEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
// A glass window with a header (title + close) and optional tabs. Fill `el.body`, then attach `el` to the page.
function uiPanel(title,o){o=o||{};const el=uiEl('div','panel glass'),h=uiEl('div','g-head'),b=uiEl('div','g-body');h.appendChild(uiEl('span','g-title',title));
 if(o.onClose){const x=uiEl('button','x','✕');x.setAttribute('aria-label','Close');x.onclick=o.onClose;h.appendChild(x)}
 el.appendChild(h);el.head=h;
 if(o.tabs&&o.tabs.length){const t=uiEl('div','g-tabs');o.tabs.forEach((n,i)=>{const k=uiEl('button',i?'':'on',n);k.onclick=()=>{[...t.children].forEach(c=>c.classList.toggle('on',c===k));if(o.onTab)o.onTab(i)};t.appendChild(k)});el.appendChild(t);el.tabs=t}
 el.appendChild(b);el.body=b;return el}
// A bottom sheet of tappable rows (>=48 px) over a dimmed backdrop. Returns {el, bg, close(), closed}; it opens at once and removes itself on close.
// A row tap, the close button, a tap on the backdrop or Escape closes it.
function uiSheet(title,rows){const el=uiEl('div','sheet panel glass'),bg=uiEl('div','sheet-bg'),h=uiEl('div','g-head'),x=uiEl('button','x','✕');let shut=false;
 const key=e=>{if(e.code==='Escape'){e.stopImmediatePropagation();e.preventDefault();done()}},
  done=()=>{if(shut)return;shut=true;removeEventListener('keydown',key,true);el.classList.remove('open');bg.classList.remove('open');setTimeout(()=>{el.remove();bg.remove()},220)};
 h.appendChild(uiEl('span','g-title',title));x.setAttribute('aria-label','Close');x.onclick=done;h.appendChild(x);el.appendChild(h);bg.onclick=done;
 for(const r of rows){const b=uiEl('button','g-row');if(r.icon)b.appendChild(uiEl('span','g-ic',r.icon));b.appendChild(uiEl('span','',r.label));b.onclick=()=>{done();if(r.onTap)r.onTap()};el.appendChild(b)}
 document.body.append(bg,el);addEventListener('keydown',key,true);requestAnimationFrame(()=>{if(!shut){el.classList.add('open');bg.classList.add('open')}});return {el,bg,close:done,get closed(){return shut}}}

// ================= Live portraits (head and shoulders, drawn with the in-game hero figure) =================
const PORT=new Map();
const portraitKey=(look,gear,cls)=>{const L=look||{},g=gear||{},f=it=>it?it.name+'|'+it.rar+'|'+(it.ilvl||it.lvl||''):'';return JSON.stringify([cls||'',L.skin,L.hair,L.eyes,L.hairStyle,L.beard,L.headgear,L.body,L.cloth,L.trim,f(g.helm),f(g.armor)])};
function drawPortrait(cv,look,gear,cls){const p={cls:cls||'paladin',look:look||{},gear:gear||{},bagSize:20},o=playerLook(p),S=cv.width,c=cv.getContext('2d');
  if(o.gv){delete o.gv.cape;delete o.gv.pack;delete o.gv.offhand;delete o.gv.aura}o.wv=null;o.weapon=null;o.shield=false;o.aim=.3;o.aimS=.3;o.walk=0;o.moving=false;o.s=S/112*3.4;
  c.clearRect(0,0,S,S);c.save();c.beginPath();c.arc(S/2,S/2,S/2-1,0,TAU);c.clip();
  const g=c.createRadialGradient(S/2,S*.4,S*.05,S/2,S/2,S*.7);g.addColorStop(0,'#3a3a46');g.addColorStop(1,'#0e0e14');c.fillStyle=g;c.fillRect(0,0,S,S);
  drawHumanoid(c,S/2,S*.5+39*o.s,o);c.restore();c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=Math.max(1,S/56);c.beginPath();c.arc(S/2,S/2,S/2-c.lineWidth/2,0,TAU);c.stroke()}
// One cached 112x112 canvas per look+head+chest gear. Do not put it in the page directly (it is shared): copy it with portraitEl.
function portraitFor(p){const k=portraitKey(p.look,p.gear,p.cls);let cv=PORT.get(k);if(!cv){if(PORT.size>60)PORT.clear();cv=document.createElement('canvas');cv.width=cv.height=112;drawPortrait(cv,p.look,p.gear,p.cls);PORT.set(k,cv)}return cv}
function portraitEl(p,px){const d=Math.round(px*(devicePixelRatio||1)),e=document.createElement('canvas');e.width=e.height=d;e.style.cssText=`width:${px}px;height:${px}px;border-radius:50%;flex:none`;e.getContext('2d').drawImage(portraitFor(p),0,0,d,d);return e}

// ================= Target frame, action bar state =================
// Monster portrait: the same body drawing as corpses (drawUnitBody), cached per monster type.
const MPORT=new Map(),monsterKey=u=>(u.type||u.kind||'?')+(u.boss?'*':'');
function monsterPortrait(u){const k=monsterKey(u);let cv=MPORT.get(k);if(!cv){cv=document.createElement('canvas');cv.width=cv.height=112;const c=cv.getContext('2d'),S=112,sc=Math.min(3,78/Math.max(30,u.h||40));
  c.save();c.beginPath();c.arc(S/2,S/2,S/2-1,0,TAU);c.clip();const g=c.createRadialGradient(S/2,S*.4,S*.05,S/2,S/2,S*.7);g.addColorStop(0,u.boss?'#4a2a5a':'#3a3a46');g.addColorStop(1,'#0e0e14');c.fillStyle=g;c.fillRect(0,0,S,S);
  c.translate(S/2,S*.9);c.scale(sc,sc);const a=u.aim;u.aim=0;try{drawUnitBody(c,u)}finally{u.aim=a}c.restore();c.strokeStyle=u.boss?'rgba(200,120,255,.6)':'rgba(255,255,255,.28)';c.lineWidth=2;c.beginPath();c.arc(S/2,S/2,S/2-1,0,TAU);c.stroke();MPORT.set(k,cv)}return cv}
// State of action-bar slot i. cdFrac = share of the cooldown still left, ready = the 0.6 s glow after it ends (p.cdEnd[i] = when it ended).
function abarState(p,i,now){now=now===undefined?rt:now;const cd=Math.max(0,p.cds[i]||0),mx=p.cdMax[i]||1,e=p.cdEnd&&p.cdEnd[i];
  return{cd,cdFrac:cd>0?Math.min(1,cd/mx):0,poor:p.mana<abilCost(p,i),ready:cd<=0&&e!=null&&now-e>=0&&now-e<.6}}
// The enemy under the mouse (desktop). Same screen projection as drawUnit.
function enemyUnderMouse(){let best=null,bd=1e9;for(const e of enemies){if(e.dead||e.hp<=0)continue;const[sx,sy]=S(e.x,e.y),h=(e.h||40)*.5,d=Math.hypot(mouse.x-sx,mouse.y-(sy-h)),r=Math.max(e.r||12,14)+12+h*.3;if(d<r&&d<bd){bd=d;best=e}}return best}

// HUD column layout: the target frame sits centred when it fits beside the player frame and minimap at this UI size, else (.low) directly under the player frame; the party list follows whichever is lowest. Heights are read live (buffs grow the player frame).
// On a phone the side columns are narrower (compact player frame, 120 px minimap), and the quest line hides whenever it would reach the touch buttons below it.
function layoutHud(){const ui=+document.documentElement.style.getPropertyValue('--ui')||1,ph=Layout.phone,tf=$('tframe'),pf=$('pframe'),pa=$('party'),low=innerWidth<((ph?440:588)+(tf.classList.contains('boss')?240:200))*ui+20,h=e=>e.getBoundingClientRect().height/ui;tf.classList.toggle('low',low);
  let y=(ph?10:14)+h(pf)+8;if(low){tf.style.top=y+'px';if(!tf.classList.contains('hidden'))y+=h(tf)+8}else tf.style.top='';pa.style.top=y+'px';
  const q=$('quest');let clash=false;if(ph&&Touch.on){const c=$('right').getBoundingClientRect(),qb=q.getBoundingClientRect().bottom;// .clash only hides it (visibility), so it keeps its box
    for(const e of document.querySelectorAll('#arc .tslot,#quick,#ctx')){const r=e.getBoundingClientRect();if(r.width&&r.right>c.left&&r.left<c.right&&r.top<qb+6)clash=true}}
  q.classList.toggle('clash',clash)}
