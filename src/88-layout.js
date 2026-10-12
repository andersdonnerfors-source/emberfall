// ================= Phone or desktop layout, orientation card, graphics =================
// Phone = touch present (a coarse pointer, or a touch has happened) and the short screen side under 500 px.
// env is window, or a fake {innerWidth, innerHeight, matchMedia, touchSeen} in the self-tests.
// touchSeen is a var (so a window property) because the first resize() in src/10-core.js runs before this file.
var touchSeen=false;
function isPhone(env=window){return(env.matchMedia('(pointer:coarse)').matches||!!env.touchSeen)&&Math.min(env.innerWidth,env.innerHeight)<500}
// Canvas pixels per CSS pixel: 1 on Low, and on Auto on a phone; else 1.5-2 by the screen's density.
function renderScale(gfx,phone,dpr){return gfx==='low'||gfx==='auto'&&phone?1:Math.min(2,Math.max(1.5,dpr))}
function gfxPref(){try{return Settings.gfx||'auto'}catch(e){return'auto'}}// Settings (src/75-loot.js) does not exist yet on the first resize()
// Touch button sizes from the screen height: 390 and up keep the full sizes, 260 and under the small ones, linear in between. mini = minimap px, stick = idle stick ring.
function touchSizes(h){const t=Math.max(0,Math.min(1,(h-260)/130)),L=(a,b)=>Math.round(a+(b-a)*t);return{atk:L(64,84),ab:L(44,56),q:L(36,40),mini:L(96,120),stick:L(96,120)}}
function applyTouchSizes(){const r=document.documentElement.style,z=touchSizes(innerHeight);for(const[k,v]of[['--t-atk',z.atk],['--t-ab',z.ab],['--t-q',z.q],['--t-mini',z.mini]])Layout.phone?r.setProperty(k,v+'px'):r.removeProperty(k)}
// Positions (px centres, CSS pixels) for the right-thumb cluster: attack in the bottom-right corner, the quick pair right above it (else left of it when there is no room),
// then n abilities (square boxes that never touch) packed on rings round the attack button, from straight left up to straight up, always below `limit` (bottom of minimap + quest) and clear of each other.
// o.ir / o.ib / o.il are the safe-area insets (notch, home bar) added to the margins. Returns {atk:{x,y}, quick:{x,y,w,h}, abil:[{x,y}], left (leftmost edge of the cluster), mb (bottom margin)}.
function touchPlace(o){const{W,H,atk,ab,q,limit,n}=o,il=o.il||0,mr=(o.mr??8)+(o.ir||0),mb=(o.mb??4)+(o.ib||0),cx=W-mr-atk/2,cy=H-mb-atk/2,qw=2*q+6,out={atk:{x:cx,y:cy},abil:[],mb};
  let qy=cy-atk/2-6-q;out.quick=qy>=limit?{x:W-mr-qw,y:qy,w:qw,h:q}:{x:cx-atk/2-6-qw,y:cy-q/2,w:qw,h:q};
  const R1=(atk+ab)/2+6,hit=(x,y,c)=>Math.max(Math.abs(x-c.x),Math.abs(y-c.y))<ab+1,near=(x,y)=>Math.max(Math.abs(x-cx),Math.abs(y-cy))<(atk+ab)/2+1,k=out.quick,rect=(x,y)=>x+ab/2+1>k.x&&x-ab/2-1<k.x+k.w&&y+ab/2+1>k.y&&y-ab/2-1<k.y+k.h;
  for(let i=0;i<n;i++){let put=null;
    for(let r=R1;r<W&&!put;r+=2)for(let a=180;a>=90;a-=3){const x=cx+r*Math.cos(a*Math.PI/180),y=cy-r*Math.sin(a*Math.PI/180);
      if(y-ab/2<limit||x-ab/2<il+4||near(x,y)||rect(x,y)||out.abil.some(c=>hit(x,y,c)))continue;put={x,y};break}
    out.abil.push(put||{x:cx-R1,y:cy})}
  out.left=Math.min(cx-atk/2,out.quick.x,...out.abil.map(c=>c.x-ab/2));return out}
// ---- Fullscreen (phone): a button next to the menu button, and a notice inside in-app browsers (Messenger, Instagram...), which cannot go fullscreen at all.
// fsMode: 'inapp' (open it in Safari/Chrome first), 'ios-a2hs' (iPhone: Add to Home Screen), 'api' (element fullscreen works), 'none' (already fullscreen/standalone, or no way).
const IAB_RE=/FBAN|FBAV|FB_IAB|Instagram|Messenger|Line\/|Snapchat|TikTok/;
function isInAppBrowser(ua){return IAB_RE.test(ua)||/iPhone|iPad|iPod/.test(ua)&&!/Safari\//.test(ua)}
function fsMode(o){if(o.standalone)return'none';if(isInAppBrowser(o.ua))return'inapp';if(/iPhone|iPod/.test(o.ua))return'ios-a2hs';return o.hasFsApi?'api':'none'}
function fsEl(){return document.fullscreenElement||document.webkitFullscreenElement||null}
// Safe-area insets in px (a probe element with padding:env(...)); 0 where unsupported.
function safeInsets(){let p=safeInsets.p;if(!p){p=safeInsets.p=document.createElement('div');p.style.cssText='position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';document.body.appendChild(p)}
  const c=getComputedStyle(p);return{t:parseFloat(c.paddingTop)||0,r:parseFloat(c.paddingRight)||0,b:parseFloat(c.paddingBottom)||0,l:parseFloat(c.paddingLeft)||0}}
// While we are in element fullscreen the mode stays 'api' so the button can toggle back out.
function fsEnv(){const d=document.documentElement,mm=q=>{try{return matchMedia(q).matches}catch(e){return false}};
  return{ua:navigator.userAgent||'',hasFsApi:!!(d.requestFullscreen||d.webkitRequestFullscreen),standalone:!fsEl()&&(!!navigator.standalone||mm('(display-mode: fullscreen), (display-mode: standalone)'))}}
function copyLink(){const u=location.href;try{navigator.clipboard.writeText(u).then(()=>toast('Link copied'),()=>prompt('Copy this link',u))}catch(e){prompt('Copy this link',u)}}
function fsRequest(){const d=document.documentElement,r=d.requestFullscreen||d.webkitRequestFullscreen;if(!r)return;let pr;try{pr=r.call(d)}catch(e){return}
  const lock=()=>{try{const l=screen.orientation&&screen.orientation.lock&&screen.orientation.lock('landscape');if(l&&l.catch)l.catch(()=>{})}catch(e){}};if(pr&&pr.then)pr.then(lock,()=>{});else lock()}
// Settings.fullscreen follows what really happens: set when fullscreen starts, cleared when it ends (button, Esc, Android back).
function fsSync(){const on=!!fsEl();if(!!Settings.fullscreen!==on){Settings.fullscreen=on;saveSettings()}}
addEventListener('fullscreenchange',fsSync);addEventListener('webkitfullscreenchange',fsSync);document.addEventListener('fullscreenchange',fsSync);document.addEventListener('webkitfullscreenchange',fsSync);
// The steps sit side by side (one column each) so the whole sheet fits a 220 px high screen.
function fsSheet(rows){const sh=uiSheet('Play in fullscreen',rows);sh.el.classList.add('fssheet');sh.el.style.setProperty('--n',rows.length)}
function fsClick(){const m=fsMode(fsEnv());
  if(m==='api'){if(fsEl()){try{const r=(document.exitFullscreen||document.webkitExitFullscreen).call(document);if(r&&r.catch)r.catch(()=>{})}catch(e){}}else fsRequest()}
  else if(m==='ios-a2hs')fsSheet([{icon:'1',label:'Tap the Share button in Safari'},{icon:'2',label:'Choose "Add to Home Screen"'},{icon:'3',label:'Open Emberfall from the new icon'}]);
  else if(m==='inapp')fsSheet([{icon:'!',label:'For the full screen, open Emberfall in Safari/Chrome'},{icon:'🔗',label:'Copy link',onTap:copyLink}])}
// Once per session, in an in-app browser: a dismissible banner with Copy link.
function fsBanner(){if(fsBanner.done)return;fsBanner.done=true;try{if(sessionStorage.getItem('ef-iab'))return;sessionStorage.setItem('ef-iab','1')}catch(e){}
  const b=uiEl('div','glass'),t=uiEl('span','','For the full screen, open Emberfall in Safari/Chrome'),c=uiEl('button','g-btn','Copy link'),x=uiEl('button','x','✕');b.id='iab';x.setAttribute('aria-label','Close');
  c.onclick=copyLink;x.onclick=()=>b.remove();b.append(t,c,x);document.body.appendChild(b);setTimeout(()=>b.remove(),10000)}
function fsBannerClose(){const b=$('iab');if(b)b.remove()}
// After load: with Fullscreen chosen earlier, the first touch goes fullscreen again (browsers only allow it inside a gesture).
addEventListener('pointerup',e=>{if(e.pointerType==='touch'&&!(e.target.closest&&e.target.closest('#fsBtn'))&&Settings.fullscreen&&Layout.phone&&!fsEl()&&fsMode(fsEnv())==='api')fsRequest()},true);
// Particle counts: halved on a phone unless Graphics is High.
const Layout={phone:null,turn:false};
function fxScale(){return Layout.phone&&Settings.gfx!=='high'?.5:1}
// Toggles body.phone (and re-scales the UI) when the layout changes, body.nofx (no glass blur) on Low or Auto on a phone, and the orientation card.
// In portrait the card covers the game and solo play pauses (isPaused); in co-op the world keeps going.
function applyLayout(){const ph=isPhone(),b=document.body;
  if(ph!==Layout.phone){Layout.phone=ph;b.classList.toggle('phone',ph);applyUi();touchReset();resize();if(state==='play')renderParty()}
  applyTouchSizes();b.classList.toggle('nofx',Settings.gfx==='low'||Settings.gfx==='auto'&&ph);
  const turn=ph&&innerHeight>innerWidth;if(turn!==Layout.turn){Layout.turn=turn;$('turn').classList.toggle('hidden',!turn);touchReset();mouse.l=false}}
addEventListener('resize',applyLayout);addEventListener('orientationchange',applyLayout);if(screen.orientation)screen.orientation.addEventListener('change',applyLayout);
addEventListener('pointerdown',e=>{if(e.pointerType==='touch'&&!touchSeen){touchSeen=true;applyLayout()}},true);

// ---- Phone inventory: a tap selects an item; the action row under the header offers what can be done with it.
let invSel=null;// {k:'bag'|'gear'|'sup', i: bag index, gear slot or supply key}
function invPick(s){invSel=s;hideTip();renderInv()}
// Shows a tooltip in the middle of the screen until the next tap (phones have no hover).
function tipCentre(h){showTip(h);const t=$('tip');t.style.left=Math.max(8,(innerWidth-t.offsetWidth)/2)+'px';t.style.top=Math.max(8,(innerHeight-t.offsetHeight)/2)+'px';setTimeout(()=>addEventListener('pointerdown',hideTip,{once:true,capture:true}),0)}
function dropItem(p,it){drops.push({kind:'item',item:it,x:p.x+Math.cos(p.aim||0)*60,y:p.y+Math.sin(p.aim||0)*60,t:0});toast('Dropped '+it.name)}
function invActs(p){const el=$('invActs'),s=invSel,it=s&&(s.k==='bag'?p.bag[s.i]:s.k==='gear'?p.gear[s.i]:null),ok=s&&(s.k==='sup'?supCount(p,s.i)>0:!!it);
  if(!Layout.phone||!ok){invSel=null;el.classList.add('hidden');return}el.classList.remove('hidden');el.innerHTML='';
  const btn=(t,fn)=>{const b=uiEl('button','g-btn',t);b.onclick=()=>{fn();save()};el.appendChild(b)},n=uiEl('span','ia-n',s.k==='sup'?supName(s.i):it.name);if(it)n.style.color=RAR[it.rar].c;el.appendChild(n);
  if(s.k==='bag'){btn('Equip',()=>{equipBag(p,s.i);invSel=null;renderInv()});
    if(shopOpen)btn('Sell',()=>{p.gold+=sellPrice(it);p.bag.splice(s.i,1);sfx('gold');toast('Sold '+it.name+' for '+sellPrice(it)+' gold');invSel=null;renderInv()});
    if(Net.role!=='guest')btn('Drop',()=>{p.bag.splice(s.i,1);dropItem(p,it);invSel=null;renderInv()});
    btn('Compare',()=>tipCentre(itemTip(it,p.gear[it.slot]||null)))}
  else if(s.k==='gear'){btn('Unequip',()=>{unequip(p,s.i);invSel=null;renderInv()});btn('Details',()=>tipCentre(itemTip(it)))}
  else{btn('Use',()=>{useSup(p,s.i);renderInv()});btn('Details',()=>tipCentre(`<div class="tn">${supName(s.i)}</div>${supDesc(s.i,p)}`))}}

// ---- Phone world map: drag to pan, pinch to zoom (1-4x), kept inside the view.
const WM={s:1,x:0,y:0,p:new Map()};
function wmApply(){const c=$('wmap');if(!Layout.phone){c.style.transform='';return}const w=c.offsetWidth,h=c.offsetHeight;
  WM.x=clamp(WM.x,w*(1-WM.s),0);WM.y=clamp(WM.y,h*(1-WM.s),0);c.style.transform=`translate(${WM.x}px,${WM.y}px) scale(${WM.s})`}
function wmReset(){WM.s=1;WM.x=WM.y=0;WM.p.clear();wmApply()}
{const v=$('wmapView'),ui=()=>+document.documentElement.style.getPropertyValue('--ui')||1,mid=()=>{const a=[...WM.p.values()];return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2,d:Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y)||1}};
  v.addEventListener('pointerdown',e=>{if(!Layout.phone||WM.p.size>=2)return;try{v.setPointerCapture(e.pointerId)}catch(_){}WM.p.set(e.pointerId,{x:e.clientX,y:e.clientY})});
  v.addEventListener('pointermove',e=>{const q=WM.p.get(e.pointerId);if(!q)return;const k=ui();
    if(WM.p.size===1){WM.x+=(e.clientX-q.x)/k;WM.y+=(e.clientY-q.y)/k;q.x=e.clientX;q.y=e.clientY}
    else{const a=mid();q.x=e.clientX;q.y=e.clientY;const b=mid(),r=v.getBoundingClientRect(),c=$('wmap'),ns=clamp(WM.s*b.d/a.d,1,4),f=ns/WM.s;
      const mx=(a.x-r.left)/k-c.offsetLeft,my=(a.y-r.top)/k-c.offsetTop;WM.x=mx-(mx-WM.x)*f+(b.x-a.x)/k;WM.y=my-(my-WM.y)*f+(b.y-a.y)/k;WM.s=ns}
    wmApply()});
  const up=e=>WM.p.delete(e.pointerId);v.addEventListener('pointerup',up);v.addEventListener('pointercancel',up)}
applyLayout();
