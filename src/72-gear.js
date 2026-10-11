// ================= Visible gear =================
// Everything you equip shows on your hero. Item level picks the material (iron → steel → silver → gilded mithril),
// rarity adds colored trim, gems and glow, and an element in the name (Ember, Rimebound, Shadowed…) makes the piece burn, frost or shimmer.
const METAL=['#8e8a82','#b9c3cd','#e2eaf1','#f2e3b2'],LEATHER=['#6e4c2c','#7c5634','#5c3b27','#3c2b24'],WOOD=['#8a5a32','#6a4026','#3e2a20','#e8dcc0'];
function gearTier(it){return it.lvl<6?0:it.lvl<11?1:it.lvl<16?2:3}
function gearVis(it,cloth){if(!it)return null;const t=gearTier(it),el=elemOf(it),ec=el?ELEM_COL[el]:null,rc=it.rar>0?RAR[it.rar].c:null;
  return{kind:visKind(it),t,rar:it.rar,metal:METAL[t],leather:LEATHER[t],wood:WOOD[t],cloth:cloth,trim:rc||(t>=2?'#d8b050':shade(METAL[t],-30)),gem:rc||'#c03030',ec,glow:ec||(it.rar>=3?rc:null),name:it.name}}
function gearLook(p){const g=p.gear||{},cl=p.look.cloth,v={};for(const sl of SLOTS)if(g[sl])v[sl]=gearVis(g[sl],cl);
  v.pack=p.bagSize>=32?3:p.bagSize>=28?2:p.bagSize>=24?1:0;
  let top=-1;for(const sl of['armor','helm','cape','legs','boots','offhand'])if(g[sl])top=Math.max(top,g[sl].rar);v.aura=top>=3?RAR[top].c:null;return v}
// Sparks and embers from glowing gear (spawned in the update step, drawn with the other particles).
function gearFx(p,dt){if(p.dead||!p.gear)return;const w=p.gear.weapon;
  if(w&&(w.rar>=1&&elemOf(w)||w.rar>=3)){const v=gearVis(w),rate=2+w.rar*3;if(Math.random()<rate*dt){const d=rand(14,34);
    parts.push({x:p.x+Math.cos(p.aim)*d,y:p.y+Math.sin(p.aim)*d,z:22+rand(-4,6),vx:rand(-8,8),vy:rand(-8,8),vz:v.ec==='#7ad8ff'?-6:rand(18,40),life:.7,max:.7,col:v.glow,size:rand(1.4,2.6),ng:true})}}
  const v=gearLook(p);if(v.aura&&Math.random()<dt*4)parts.push({x:p.x+rand(-14,14),y:p.y+rand(-6,6),z:rand(4,40),vx:0,vy:0,vz:20,life:.9,max:.9,col:v.aura,size:1.6,ng:true})}

// ---- Pieces, drawn in the hero's local space (feet at 0,0; face = 1 right, -1 left)
function glowOn(c,col,b){if(col){c.shadowColor=col;c.shadowBlur=b}}
function glowOff(c){c.shadowBlur=0}
function drawCape(c,s,face,bw,sw,v){const k=v.t,len=(30+k*2)*s,top=-31*s,back=-face*7*bw*s,flow=sw*2*s+Math.sin(rt*2.2)*1.5*s;
  const g=c.createLinearGradient(0,top,0,top+len);g.addColorStop(0,shade(v.cloth,v.rar?8:-5));g.addColorStop(1,shade(v.cloth,-40));c.fillStyle=g;
  c.beginPath();c.moveTo(back-6*bw*s,top);c.lineTo(back+6*bw*s,top);c.quadraticCurveTo(back-face*3*s,top+len*.6,back-face*(8*s+flow),top+len);
  c.lineTo(back-face*(-5*s+flow),top+len+2*s);c.quadraticCurveTo(back-face*2*s,top+len*.5,back-6*bw*s,top);c.closePath();c.fill();
  if(v.rar){c.strokeStyle=v.trim;c.lineWidth=1.4*s;glowOn(c,v.glow,6*s);c.stroke();glowOff(c)}
  if(v.t>=2){c.fillStyle=v.trim;circ(c,back,top+len*.45,1.8*s);c.fill()}}
function drawPack(c,s,face,bw,tier){const x=-face*10*bw*s;c.save();
  if(tier===1){c.fillStyle='#7a5432';rr(c,x-4*s,-22*s,8*s,10*s,2*s);c.fill();c.strokeStyle='#4a321e';c.lineWidth=1.2*s;c.beginPath();c.moveTo(x-3*s,-31*s);c.lineTo(x,-22*s);c.stroke()}
  else{const big=tier===3,w=(big?11:9)*s,h=(big?17:14)*s,g=c.createLinearGradient(x-w/2,0,x+w/2,0);g.addColorStop(0,big?'#5a6a8a':'#8a6038');g.addColorStop(1,big?'#2e3850':'#4e3420');
    c.fillStyle=g;rr(c,x-w/2,-31*s,w,h,3*s);c.fill();c.fillStyle=big?'#c8d0e8':'#c8b088';c.fillRect(x-w/2,-26*s,w,1.5*s);
    if(tier>=2){c.fillStyle=big?'#8a7ab0':'#6a8a4a';rr(c,x-w/2-1*s,-35*s,w+2*s,5*s,2.5*s);c.fill()}
    if(big){glowOn(c,'#a8b8ff',6*s);c.fillStyle='#d8e0ff';circ(c,x,-23*s,1.4*s);c.fill();glowOff(c)}}c.restore()}
function drawQuiver(c,s,face,bw,v){const x=-face*7*bw*s;c.save();c.translate(x,-22*s);c.rotate(-face*.35);
  c.fillStyle=v.leather;rr(c,-3*s,-12*s,6*s,16*s,2*s);c.fill();c.fillStyle=v.trim;c.fillRect(-3*s,-12*s,6*s,1.6*s);c.fillRect(-3*s,2*s,6*s,1.4*s);
  glowOn(c,v.glow,5*s);c.fillStyle=v.rar?v.gem:'#e8e0d0';for(let k=-1;k<=1;k++){c.beginPath();c.moveTo(k*2*s,-12*s);c.lineTo(k*2*s-1.4*s,-17*s);c.lineTo(k*2*s+1.4*s,-17*s);c.fill()}glowOff(c);c.restore()}
function drawOffhand(c,s,face,bw,v){const x=-face*10*bw*s,y=-22*s;c.save();c.translate(x,y);
  switch(v.kind){
    case'shield':{const big=1+v.t*.1,kite=v.t>=1;c.scale(big,big);const g=c.createRadialGradient(-2*s,-3*s,1*s,0,0,9*s);g.addColorStop(0,shade(v.metal,25));g.addColorStop(1,shade(v.metal,-35));c.fillStyle=g;
      if(kite){c.beginPath();c.moveTo(-7.5*s,-7*s);c.lineTo(7.5*s,-7*s);c.quadraticCurveTo(7.5*s,4*s,0,10*s);c.quadraticCurveTo(-7.5*s,4*s,-7.5*s,-7*s);c.fill()}else{circ(c,0,0,7.8*s);c.fill()}
      c.fillStyle=v.rar?shade(v.cloth,-10):'#5a3a22';if(kite){c.beginPath();c.moveTo(-5.6*s,-5.2*s);c.lineTo(5.6*s,-5.2*s);c.quadraticCurveTo(5.6*s,3*s,0,7.6*s);c.quadraticCurveTo(-5.6*s,3*s,-5.6*s,-5.2*s);c.fill()}else{circ(c,0,0,5.8*s);c.fill()}
      glowOn(c,v.glow,6*s);c.fillStyle=v.trim;c.fillRect(-1*s,-5*s,2*s,10*s);c.fillRect(-4*s,-2*s,8*s,2*s);if(v.t>=2){c.fillStyle=v.gem;circ(c,0,-1*s,1.8*s);c.fill()}glowOff(c);break}
    case'tome':{c.rotate(-.2*face);c.fillStyle=v.rar?shade(v.gem,-45):'#5a3a28';rr(c,-6*s,-7*s,12*s,14*s,1.5*s);c.fill();c.fillStyle='#efe6cc';c.fillRect(-5*s,-6*s,1.6*s,12*s);
      glowOn(c,v.glow||v.trim,6*s);c.fillStyle=v.trim;circ(c,1*s,0,2.4*s);c.fill();if(v.t>=2){c.strokeStyle=v.trim;c.lineWidth=.8*s;c.strokeRect(-3.5*s,-5.5*s,9*s,11*s)}glowOff(c);break}
    case'orb':{const bob=Math.sin(rt*3)*2*s,col=v.ec||v.gem;glowOn(c,col,10*s);const g=c.createRadialGradient(-1*s,-2*s+bob,.5*s,0,bob,6*s);g.addColorStop(0,'#fff');g.addColorStop(.5,col);g.addColorStop(1,shade(col,-50));c.fillStyle=g;circ(c,0,-4*s+bob,4.5*s+v.t*.4*s);c.fill();glowOff(c);break}
    case'skull':{const bob=Math.sin(rt*2.5)*2*s;c.fillStyle='#e8e2cc';circ(c,0,-4*s+bob,4.6*s);c.fill();c.fillRect(-2.6*s,-1*s+bob,5.2*s,3*s);glowOn(c,v.ec||'#7dff9a',8*s);c.fillStyle=v.ec||'#7dff9a';
      circ(c,-1.6*s,-4.5*s+bob,1.1*s);c.fill();circ(c,1.6*s,-4.5*s+bob,1.1*s);c.fill();glowOff(c);break}}
  c.restore()}
function drawHelm(c,s,face,v,hair){const k=v.kind;
  if(k==='helm'){const g=c.createLinearGradient(-9*s,-51*s,9*s,-40*s);g.addColorStop(0,shade(v.metal,25));g.addColorStop(1,shade(v.metal,-35));c.fillStyle=g;
    c.beginPath();c.arc(0,-41*s,9.4*s,Math.PI,TAU);c.fill();c.fillRect(-9.4*s,-42*s,18.8*s,3.2*s);c.fillRect(face*2*s-1*s,-42*s,2*s,6*s);
    if(v.t>=1){c.fillRect(-9.4*s,-42*s,3*s,8*s);c.fillRect(6.4*s,-42*s,3*s,8*s)}
    c.fillStyle=v.trim;c.fillRect(-9.4*s,-43*s,18.8*s,1.4*s);
    if(/Winged/.test(v.name)||v.t>=3){c.fillStyle=v.t>=3?v.trim:'#eef0f2';glowOn(c,v.glow,5*s);for(const sd of[-1,1]){c.beginPath();c.moveTo(sd*8*s,-45*s);c.quadraticCurveTo(sd*16*s,-50*s,sd*15*s,-58*s);c.quadraticCurveTo(sd*11*s,-52*s,sd*7*s,-49*s);c.fill()}glowOff(c)}
    else{c.fillStyle=v.rar?v.gem:'#b8322a';glowOn(c,v.glow,6*s);c.beginPath();c.ellipse(-face*2*s,-52*s,3*s,5.5*s,face*-.5,0,TAU);c.fill();glowOff(c)}
    if(v.t>=2){c.fillStyle=v.gem;glowOn(c,v.glow,5*s);circ(c,0,-46*s,1.6*s);c.fill();glowOff(c)}}
  else if(k==='hood'){const col=v.rar?shade(v.cloth,-25):'#4a3a2a';const g=c.createLinearGradient(0,-55*s,0,-38*s);g.addColorStop(0,shade(col,18));g.addColorStop(1,col);c.fillStyle=g;
    c.beginPath();c.arc(0,-42*s,10.6*s,Math.PI,TAU);c.lineTo(10.6*s,-36*s);c.lineTo(7*s,-36*s);c.lineTo(7*s,-42*s);c.lineTo(-7*s,-42*s);c.lineTo(-7*s,-36*s);c.lineTo(-10.6*s,-36*s);c.fill();
    if(v.rar){c.strokeStyle=v.trim;c.lineWidth=1.2*s;glowOn(c,v.glow,4*s);c.beginPath();c.arc(0,-42*s,10.6*s,Math.PI,TAU);c.stroke();glowOff(c)}}
  else if(k==='cap'){c.fillStyle=v.leather;c.beginPath();c.arc(0,-43*s,8.6*s,Math.PI,TAU);c.fill();c.fillRect(-10*s,-44*s,20*s,2.2*s);
    c.strokeStyle=v.rar?v.gem:'#c8b088';c.lineWidth=2*s;glowOn(c,v.glow,5*s);c.beginPath();c.moveTo(-face*5*s,-48*s);c.quadraticCurveTo(-face*12*s,-58*s,-face*18*s,-56*s);c.stroke();glowOff(c)}
  else if(k==='wizard'){const col=v.rar?shade(v.gem,-35):shade(v.cloth,-25),g=c.createLinearGradient(-7*s,0,7*s,0);g.addColorStop(0,shade(col,22));g.addColorStop(1,shade(col,-25));c.fillStyle=g;
    ell(c,0,-45*s,13*s,3.5*s);c.fill();c.beginPath();c.moveTo(-7*s,-46*s);c.lineTo(7*s,-46*s);c.quadraticCurveTo(0,-56*s,-face*(6+v.t)*s,-(69+v.t*2)*s);c.closePath();c.fill();
    c.fillStyle=v.trim;c.fillRect(-7*s,-48*s,14*s,2*s);if(v.rar){glowOn(c,v.glow||v.gem,7*s);c.fillStyle='#fff8d0';circ(c,-face*1*s,-55*s,1.5*s);c.fill();glowOff(c)}}
  else if(k==='circlet'){c.strokeStyle=v.metal;c.lineWidth=1.8*s;c.beginPath();c.arc(0,-41*s,8.4*s,Math.PI*1.05,Math.PI*1.95);c.stroke();
    if(/Skull/.test(v.name)){c.fillStyle='#e8e2cc';circ(c,0,-48*s,2.6*s);c.fill()}glowOn(c,v.glow||v.gem,7*s);c.fillStyle=v.gem;circ(c,0,-48.5*s,1.6*s);c.fill();glowOff(c)}}
