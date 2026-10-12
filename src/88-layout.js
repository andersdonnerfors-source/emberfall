// ================= Phone or desktop layout, orientation card, graphics =================
// Phone = touch present (a coarse pointer, or a touch has happened) and the short screen side under 500 px.
// env is window, or a fake {innerWidth, innerHeight, matchMedia, touchSeen} in the self-tests.
// touchSeen is a var (so a window property) because the first resize() in src/10-core.js runs before this file.
var touchSeen=false;
function isPhone(env=window){return(env.matchMedia('(pointer:coarse)').matches||!!env.touchSeen)&&Math.min(env.innerWidth,env.innerHeight)<500}
// Canvas pixels per CSS pixel: 1 on Low, and on Auto on a phone; else 1.5-2 by the screen's density.
function renderScale(gfx,phone,dpr){return gfx==='low'||gfx==='auto'&&phone?1:Math.min(2,Math.max(1.5,dpr))}
function gfxPref(){try{return Settings.gfx||'auto'}catch(e){return'auto'}}// Settings (src/75-loot.js) does not exist yet on the first resize()
// Particle counts: halved on a phone unless Graphics is High.
const Layout={phone:null,turn:false};
function fxScale(){return Layout.phone&&Settings.gfx!=='high'?.5:1}
// Toggles body.phone (and re-scales the UI) when the layout changes, body.nofx (no glass blur) on Low or Auto on a phone, and the orientation card.
// In portrait the card covers the game and solo play pauses (isPaused); in co-op the world keeps going.
function applyLayout(){const ph=isPhone(),b=document.body;
  if(ph!==Layout.phone){Layout.phone=ph;b.classList.toggle('phone',ph);applyUi();touchReset();resize();if(state==='play')renderParty()}
  b.classList.toggle('nofx',Settings.gfx==='low'||Settings.gfx==='auto'&&ph);
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
