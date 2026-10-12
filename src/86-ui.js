// ================= Glass UI: shared components (panel, header, tabs, button, row, tooltip, bottom sheet) =================
const uiToken=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function uiEl(tag,cls,txt){const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e}
// A glass window with a header (title + close) and optional tabs. Fill `el.body`, then attach `el` to the page.
function uiPanel(title,o){o=o||{};const el=uiEl('div','panel glass'),h=uiEl('div','g-head'),b=uiEl('div','g-body');h.appendChild(uiEl('span','g-title',title));
 if(o.onClose){const x=uiEl('button','x','✕');x.setAttribute('aria-label','Close');x.onclick=o.onClose;h.appendChild(x)}
 el.appendChild(h);el.head=h;
 if(o.tabs&&o.tabs.length){const t=uiEl('div','g-tabs');o.tabs.forEach((n,i)=>{const k=uiEl('button',i?'':'on',n);k.onclick=()=>{[...t.children].forEach(c=>c.classList.toggle('on',c===k));if(o.onTab)o.onTab(i)};t.appendChild(k)});el.appendChild(t);el.tabs=t}
 el.appendChild(b);el.body=b;return el}
// A bottom sheet of tappable rows (>=48 px). Returns {el, close()}; it opens at once and removes itself on close.
function uiSheet(title,rows){const el=uiEl('div','sheet panel glass'),done=()=>{el.classList.remove('open');setTimeout(()=>el.remove(),220)};
 el.appendChild(uiEl('div','g-head',title));
 for(const r of rows){const b=uiEl('button','g-row');if(r.icon)b.appendChild(uiEl('span','g-ic',r.icon));b.appendChild(uiEl('span','',r.label));b.onclick=()=>{done();if(r.onTap)r.onTap()};el.appendChild(b)}
 document.body.appendChild(el);requestAnimationFrame(()=>el.classList.add('open'));return {el,close:done}}

// ================= Live portraits (head and shoulders, drawn with the in-game hero figure) =================
const phoneUI=()=>matchMedia('(pointer:coarse)').matches&&Math.min(innerWidth,innerHeight)<500,PORT=new Map();
const portraitKey=(look,gear,cls)=>{const L=look||{},g=gear||{},f=it=>it?it.name+'|'+it.rar+'|'+(it.ilvl||it.lvl||''):'';return JSON.stringify([cls||'',L.skin,L.hair,L.eyes,L.hairStyle,L.beard,L.headgear,L.body,L.cloth,L.trim,f(g.helm),f(g.armor)])};
function drawPortrait(cv,look,gear,cls){const p={cls:cls||'paladin',look:look||{},gear:gear||{},bagSize:20},o=playerLook(p),S=cv.width,c=cv.getContext('2d');
  if(o.gv){delete o.gv.cape;delete o.gv.pack;delete o.gv.offhand;delete o.gv.aura}o.wv=null;o.weapon=null;o.shield=false;o.aim=.3;o.aimS=.3;o.walk=0;o.moving=false;o.s=S/112*3.4;
  c.clearRect(0,0,S,S);c.save();c.beginPath();c.arc(S/2,S/2,S/2-1,0,TAU);c.clip();
  const g=c.createRadialGradient(S/2,S*.4,S*.05,S/2,S/2,S*.7);g.addColorStop(0,'#3a3a46');g.addColorStop(1,'#0e0e14');c.fillStyle=g;c.fillRect(0,0,S,S);
  drawHumanoid(c,S/2,S*.5+39*o.s,o);c.restore();c.strokeStyle='rgba(255,255,255,.28)';c.lineWidth=Math.max(1,S/56);c.beginPath();c.arc(S/2,S/2,S/2-c.lineWidth/2,0,TAU);c.stroke()}
// One cached 112x112 canvas per look+head+chest gear. Do not put it in the page directly (it is shared): copy it with portraitEl.
function portraitFor(p){const k=portraitKey(p.look,p.gear,p.cls);let cv=PORT.get(k);if(!cv){if(PORT.size>60)PORT.clear();cv=document.createElement('canvas');cv.width=cv.height=112;drawPortrait(cv,p.look,p.gear,p.cls);PORT.set(k,cv)}return cv}
function portraitEl(p,px){const d=Math.round(px*(devicePixelRatio||1)),e=document.createElement('canvas');e.width=e.height=d;e.style.cssText=`width:${px}px;height:${px}px;border-radius:50%;flex:none`;e.getContext('2d').drawImage(portraitFor(p),0,0,d,d);return e}
