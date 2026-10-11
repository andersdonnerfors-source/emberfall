// ================= 2.5D characters, creatures and buildings =================
// o.wv (from gearVis) styles a hero's weapon: metal and size by item level, trim, runes and glow by rarity and element.
function drawWeapon(c,w,s,o){c.lineCap='round';const v=o.wv,t=v?v.t:0,met=v?v.metal:'#c8d2dc',trim=v?v.trim:'#d4ac52',gl=v&&(v.rar>=1||v.ec)?v.glow:null,pulse=.75+.25*Math.sin(rt*4);
  const runes=(x0,x1,col)=>{if(!v||v.rar<2)return;c.save();glowOn(c,col,6*s);c.fillStyle=col;for(let k=0;k<3+v.rar;k++){const xx=x0+(x1-x0)*(k+.5)/(3+v.rar);c.fillRect(xx,-.5*s,1.2*s,1*s)}c.restore()};
  switch(w){
    case'staff':case'skullstaff':{const L=(22+t*2)*s,wood=v?v.wood:w==='staff'?'#8a6a42':'#5a4a40',g=c.createLinearGradient(0,-2*s,0,2*s);g.addColorStop(0,shade(wood,15));g.addColorStop(1,shade(wood,-45));c.strokeStyle=g;c.lineWidth=3.2*s;c.beginPath();c.moveTo(-12*s,0);c.lineTo(L,0);c.stroke();
      if(v&&v.t>=1){c.strokeStyle=trim;c.lineWidth=1.4*s;for(const xx of[4,10])c.beginPath(),c.moveTo(xx*s,-1.8*s),c.lineTo(xx*s,1.8*s),c.stroke()}
      const orb=(v&&(v.ec||v.rar>=1)?v.glow:null)||o.orb||'#ff9a3a',R=(4.4+t*.5)*s;
      if(v&&v.t>=2){c.strokeStyle=trim;c.lineWidth=1.3*s;for(const sd of[-1,1]){c.beginPath();c.moveTo(L-3*s,0);c.quadraticCurveTo(L+1*s,sd*7*s,L+R*1.6,sd*2*s);c.stroke()}}
      c.shadowColor=orb;c.shadowBlur=(12+(v?v.rar*4:0))*s*pulse;
      if(w==='staff'){const og=c.createRadialGradient(L+2*s,-1.5*s,.5*s,L+3*s,0,R*1.05);og.addColorStop(0,'#fff');og.addColorStop(.4,orb);og.addColorStop(1,shade(orb,-40));c.fillStyle=og;circ(c,L+3*s,0,R);c.fill()}
      else{c.fillStyle='#e6e0cc';circ(c,L+3*s,0,R*1.1);c.fill();c.shadowBlur=0;c.fillStyle=v&&v.rar?orb:'#1a1a1a';c.shadowColor=orb;c.shadowBlur=v&&v.rar?6*s:0;circ(c,L+2.2*s,-1.4*s,1*s);c.fill();circ(c,L+2.2*s,1.4*s,1*s);c.fill()}
      if(v&&v.rar>=3){c.fillStyle=orb;for(let k=0;k<3;k++){const a=rt*3+k*2.1;circ(c,L+3*s+Math.cos(a)*R*1.8,Math.sin(a)*R*1.8,1.1*s);c.fill()}}c.shadowBlur=0;break}
    case'wand':{const L=(14+t)*s,orb=(v&&(v.ec||v.rar>=1)?v.glow:null)||o.orb||'#c890ff';c.strokeStyle=v?v.wood:'#3a2a1e';c.lineWidth=2.4*s;c.beginPath();c.moveTo(-4*s,0);c.lineTo(L,0);c.stroke();
      if(v&&v.t>=1){c.fillStyle=trim;c.fillRect(L-3*s,-1.8*s,2*s,3.6*s)}c.shadowColor=orb;c.shadowBlur=(10+(v?v.rar*4:0))*s*pulse;c.fillStyle=orb;circ(c,L+1*s,0,(2.6+t*.3)*s);c.fill();c.shadowBlur=0;break}
    case'sword':{const L=(26+t*2.5)*s,wd=(2+t*.2)*s;c.fillStyle=v?shade(v.leather,-10):'#5a3b22';rr(c,-5*s,-1.5*s,6*s,3*s,1*s);c.fill();
      c.fillStyle=trim;rr(c,1*s,-(5+t*.8)*s,2.6*s,(10+t*1.6)*s,1*s);c.fill();if(v&&v.rar>=2){c.fillStyle=v.gem;glowOn(c,v.glow,5*s);circ(c,2.3*s,0,1.3*s);c.fill();glowOff(c)}
      const g=c.createLinearGradient(0,-wd,0,wd);g.addColorStop(0,'#ffffff');g.addColorStop(.5,met);g.addColorStop(1,shade(met,-35));c.fillStyle=g;glowOn(c,gl,(4+(v?v.rar*3:0))*s*pulse);
      c.beginPath();c.moveTo(3.5*s,-wd);c.lineTo(L-4*s,-wd*.6);c.lineTo(L,0);c.lineTo(L-4*s,wd*.6);c.lineTo(3.5*s,wd);c.fill();glowOff(c);
      if(v&&v.ec&&v.rar>=1){c.save();c.globalCompositeOperation='lighter';c.fillStyle=v.ec;c.globalAlpha*=.35*pulse;c.beginPath();c.moveTo(4*s,-wd*.5);c.lineTo(L-4*s,-wd*.3);c.lineTo(L-1*s,0);c.lineTo(L-4*s,wd*.3);c.lineTo(4*s,wd*.5);c.fill();c.restore()}
      runes(6*s,L-6*s,v&&(v.ec||v.gem));break}
    case'bow':{const R=(15+t)*s,limb=v?v.wood:'#8a5a32';c.strokeStyle=limb;c.lineWidth=(2.8+t*.2)*s;glowOn(c,gl,(3+(v?v.rar*2:0))*s*pulse);c.beginPath();c.arc(0,0,R,-1.25,1.25);c.stroke();glowOff(c);
      c.strokeStyle=v&&v.rar?trim:'#c8a070';c.lineWidth=1*s;c.beginPath();c.arc(0,0,R,-.4,.4);c.stroke();
      if(v&&v.t>=1){c.fillStyle=v.t>=2?trim:met;for(const a of[-1.25,1.25]){circ(c,Math.cos(a)*R,Math.sin(a)*R,1.4*s);c.fill()}}
      if(v&&v.t>=3){c.strokeStyle=trim;c.lineWidth=1.2*s;for(const sd of[-1,1]){c.beginPath();c.moveTo(Math.cos(sd*1.25)*R,Math.sin(sd*1.25)*R);c.quadraticCurveTo(Math.cos(sd*1.4)*R*1.2,Math.sin(sd*1.4)*R*1.2,Math.cos(sd*1.15)*R*1.25,Math.sin(sd*1.15)*R*1.25);c.stroke()}}
      c.strokeStyle=v&&v.rar?v.gem:'rgba(240,230,210,.85)';c.lineWidth=1;glowOn(c,v&&v.rar?v.gem:null,4*s);c.beginPath();c.moveTo(Math.cos(-1.25)*R,Math.sin(-1.25)*R);c.lineTo(Math.cos(1.25)*R,Math.sin(1.25)*R);c.stroke();glowOff(c);
      if(v&&v.rar>=3){c.save();c.globalCompositeOperation='lighter';c.strokeStyle=v.glow;c.lineWidth=1.6*s;c.globalAlpha*=pulse;glowOn(c,v.glow,8*s);c.beginPath();c.moveTo(Math.cos(1.25)*R,0);c.lineTo(R+6*s,0);c.stroke();c.restore()}break}
    case'club':c.fillStyle='#6b4a2a';c.beginPath();c.moveTo(-4*s,-2*s);c.lineTo(20*s,-5.5*s);c.lineTo(25*s,0);c.lineTo(20*s,5.5*s);c.lineTo(-4*s,2*s);c.fill();c.fillStyle='rgba(0,0,0,.25)';c.fillRect(8*s,-1*s,10*s,2*s);break;
    case'mace':{const H=(5.6+t*.5)*s;c.fillStyle=v?shade(v.leather,-15):'#4a3020';rr(c,-5*s,-1.6*s,22*s,3.2*s,1*s);c.fill();if(v&&v.t>=1){c.fillStyle=trim;c.fillRect(14*s,-2*s,2*s,4*s)}
      const g=c.createRadialGradient(19*s,-2*s,1*s,20*s,0,H*1.25);g.addColorStop(0,'#f4f8fb');g.addColorStop(1,shade(met,-40));c.fillStyle=g;glowOn(c,gl,(4+(v?v.rar*3:0))*s*pulse);circ(c,20*s,0,H);c.fill();
      c.fillStyle=v&&v.t>=2?trim:shade(met,-15);for(let k=0;k<6+t*2;k++){const a=k/(6+t*2)*TAU;c.beginPath();c.moveTo(20*s+Math.cos(a)*H*.9,Math.sin(a)*H*.9);c.lineTo(20*s+Math.cos(a)*H*1.55,Math.sin(a)*H*1.55);c.lineTo(20*s+Math.cos(a+.3)*H*.9,Math.sin(a+.3)*H*.9);c.fill()}glowOff(c);
      if(v&&v.rar>=2){c.fillStyle=v.gem;glowOn(c,v.glow,6*s);circ(c,20*s,0,1.6*s);c.fill();glowOff(c)}break}
    case'axe':{const B=1+t*.12;c.fillStyle=v?shade(v.leather,-10):'#5a3b22';rr(c,-4*s,-1.5*s,26*s,3*s,1*s);c.fill();const g=c.createLinearGradient(16*s,-12*s*B,28*s,12*s*B);g.addColorStop(0,'#f0f4f8');g.addColorStop(1,shade(met,-35));c.fillStyle=g;glowOn(c,gl,(4+(v?v.rar*3:0))*s*pulse);
      c.beginPath();c.moveTo(16*s,-2*s);c.quadraticCurveTo(22*s,-12*s*B,28*s,-9*s*B);c.lineTo(26*s,2*s);c.closePath();c.fill();c.beginPath();c.moveTo(16*s,2*s);c.quadraticCurveTo(22*s,12*s*B,28*s,9*s*B);c.lineTo(26*s,-2*s);c.closePath();c.fill();glowOff(c);
      if(v&&v.t>=2){c.strokeStyle=trim;c.lineWidth=1*s;c.beginPath();c.moveTo(19*s,-6*s*B);c.lineTo(25*s,-6*s*B);c.moveTo(19*s,6*s*B);c.lineTo(25*s,6*s*B);c.stroke()}break}
    case'blade':c.fillStyle='#5a3b22';c.fillRect(-3*s,-1.3*s,5*s,2.6*s);c.fillStyle='#a8a398';c.beginPath();c.moveTo(2*s,-2*s);c.lineTo(17*s,-.5*s);c.lineTo(18*s,1*s);c.lineTo(2*s,2*s);c.fill();break}}
const MELEE_W=new Set(['sword','axe','mace','club','blade']);
function drawHumanoid(c,x,y,o){
  const s=o.s||1,face=Math.cos(o.aim||0)<0?-1:1,mv=o.moving!==false,sw=mv?Math.sin(o.walk||0):0,bw=o.bw||1,hs=o.hairStyle||'short',ol='rgba(0,0,0,.38)',gv=o.gv||{};
  const bob=mv?Math.abs(Math.cos(o.walk||0))*1.8*s:(Math.sin(rt*2.2+(o.ph||0))*.5+.5)*.7*s,ae=o.atk?Math.sin((1-o.atk)*Math.PI):0;
  const ch=gv.armor,lg=gv.legs,bt=gv.boots,legC=lg?(lg.kind==='plate'?lg.metal:shade(lg.cloth,-45)):o.legs||'#3a2f24';
  const cloth=ch?(ch.kind==='plate'?ch.metal:ch.kind==='leather'?ch.leather:ch.cloth):o.cloth,robe=ch?ch.kind==='robe':o.robe;
  c.save();c.translate(x,y);if(o.alpha!=null)c.globalAlpha=o.alpha;c.lineJoin='round';c.lineCap='round';
  // rarity aura at the feet (epic and legendary armor)
  if(gv.aura){const a=.25+.12*Math.sin(rt*3);c.save();c.globalCompositeOperation='lighter';const g=c.createRadialGradient(0,0,2*s,0,0,22*s);g.addColorStop(0,gv.aura+'88');g.addColorStop(1,'rgba(0,0,0,0)');c.globalAlpha*=a*2;c.fillStyle=g;ell(c,0,0,24*s,9*s);c.fill();c.restore()}
  if(gv.cape)drawCape(c,s,face,bw,sw,gv.cape);
  if(gv.pack)drawPack(c,s,face,bw,gv.pack);
  if(gv.offhand&&gv.offhand.kind==='quiver')drawQuiver(c,s,face,bw,gv.offhand);
  // legs with boots; the far leg is darker for depth
  const bootC=bt?(bt.kind==='plate'?bt.metal:bt.kind==='cloth'?shade(bt.cloth,-30):bt.leather):shade(legC,-42),bootH=bt?(bt.kind==='plate'?6:bt.kind==='leather'?5:3.6):3.6;
  const leg=(lx,ang,far)=>{const len=13*s;c.save();c.translate(lx+2.5*s,-13*s);c.rotate(ang);c.translate(-(lx+2.5*s),13*s);const g=c.createLinearGradient(lx,0,lx+5*s,0);g.addColorStop(0,shade(legC,far?-8:22));g.addColorStop(1,shade(legC,far?-42:-20));c.fillStyle=g;rr(c,lx,-13*s,5*s,len,2*s);c.fill();
    if(lg&&lg.kind==='plate'){c.fillStyle=shade(lg.metal,far?-10:25);ell(c,lx+2.5*s,-8*s,2.8*s,2*s);c.fill()}
    c.fillStyle=far?shade(bootC,-25):bootC;rr(c,lx-.7*s,-13*s+len-bootH*s,6.4*s,(bootH+.4)*s,1.8*s);c.fill();
    if(bt&&bt.rar){c.fillStyle=bt.trim;c.fillRect(lx-.7*s,-13*s+len-bootH*s,6.4*s,1*s)}c.fillStyle='rgba(255,255,255,.12)';c.fillRect(lx+.6*s,-13*s+len-3*s,2*s,1*s);c.restore()};
  leg(-6*s,sw*.45,face>0);leg(1*s,-sw*.45,face<0);
  c.translate(face*ae*1.5*s,-bob);// upper body bobs with each step and leans into attacks
  const helmV=gv.helm,hooded=helmV?helmV.kind==='hood':o.hat==='hood',helmed=helmV?helmV.kind==='helm':o.hat==='helm';
  if(o.hair&&!hooded&&!helmed&&(hs==='long'||hs==='braids')){c.fillStyle=shade(o.hair,-10);rr(c,-8.5*s,-44*s,17*s,(hs==='long'?23:15)*s,5*s);c.fill()}
  const sh=-29*s,ax=7.4*bw*s,sleeve=ch&&ch.kind==='plate'?ch.metal:cloth;
  // far arm behind the body
  {const hx=-face*(ax+2.4*s)-sw*face*3.2*s,hy=-19.5*s-Math.abs(sw)*1.2*s;c.strokeStyle=shade(sleeve,-42);c.lineWidth=4.8*s;c.beginPath();c.moveTo(-face*ax,sh);c.lineTo(hx,hy);c.stroke();c.fillStyle=shade(o.skin,-25);circ(c,hx,hy+.5*s,2.4*s);c.fill()}
  // torso
  {const gr=c.createLinearGradient(-9*bw*s,-32*s,9*bw*s,-8*s);gr.addColorStop(0,shade(cloth,ch&&ch.kind==='plate'?40:26));gr.addColorStop(.55,cloth);gr.addColorStop(1,shade(cloth,-34));c.fillStyle=gr}
  if(robe){c.beginPath();c.moveTo(-8*bw*s,-32*s);c.lineTo(8*bw*s,-32*s);c.quadraticCurveTo(10*bw*s,-14*s,11*bw*s,-2*s);c.lineTo(-11*bw*s,-2*s);c.quadraticCurveTo(-10*bw*s,-14*s,-8*bw*s,-32*s);c.closePath()}else rr(c,-9*bw*s,-32*s,18*bw*s,20*s,5*s);
  c.fill();c.strokeStyle=ol;c.lineWidth=1.1;c.stroke();
  c.fillStyle='rgba(255,255,255,.1)';ell(c,-face*3*s,-27*s,4*bw*s,3*s);c.fill();
  if(ch)drawChestDetail(c,s,face,bw,ch,robe);
  else{c.fillStyle=o.trim||'rgba(0,0,0,.3)';c.fillRect(-9*bw*s,-18*s,18*bw*s,3*s);if(o.trim){c.fillRect(-1*s,-32*s,2*s,o.robe?30*s:14*s);c.fillRect(-9*bw*s,-32*s,18*bw*s,2*s);c.fillStyle='#d8b050';rr(c,-2*s,-18.5*s,4*s,4*s,1*s);c.fill()}}
  if(o.bandage){c.strokeStyle='rgba(120,100,70,.55)';c.lineWidth=1.2;for(let k=0;k<6;k++){c.beginPath();c.moveTo(-9*s,-30*s+k*4.5*s);c.lineTo(9*s,-28*s+k*4.5*s);c.stroke()}}
  // shoulders: plate pauldrons grow with item level
  if(ch&&ch.kind==='plate'){const r=(3.8+ch.t*.6)*s;for(const sd of[-1,1]){const px=sd*face*ax*.95,g=c.createRadialGradient(px-1*s,sh-2*s,.5*s,px,sh,r*1.3);g.addColorStop(0,shade(ch.metal,35));g.addColorStop(1,shade(ch.metal,-30));c.fillStyle=g;ell(c,px,sh+.5*s,r,r*.78);c.fill();
      c.strokeStyle=ch.trim;c.lineWidth=1*s;glowOn(c,ch.glow,4*s);c.stroke();glowOff(c);if(ch.t>=3){c.fillStyle=ch.trim;c.beginPath();c.moveTo(px-1.5*s,sh-r*.6);c.lineTo(px+sd*face*1*s,sh-r*.6-5*s);c.lineTo(px+1.5*s,sh-r*.6);c.fill()}}}
  else{const g=c.createRadialGradient(-face*ax*.9,sh-1*s,.5*s,-face*ax*.9,sh,4*s);g.addColorStop(0,shade(cloth,30));g.addColorStop(1,shade(cloth,-15));c.fillStyle=g;ell(c,-face*ax*.95,sh+1*s,3.6*s,2.8*s);c.fill()}
  if(!helmV&&o.hat==='helm'){c.fillStyle='#9aa2ac';ell(c,face*ax*.95,sh+1*s,4*s,3*s);c.fill();ell(c,-face*ax*.95,sh+1*s,4*s,3*s);c.fill()}
  // head
  if(hooded){const hc=helmV?(helmV.rar?shade(helmV.cloth,-25):'#4a3a2a'):o.hatColor;c.fillStyle=shade(hc,-10);circ(c,0,-39*s,10.5*s);c.fill()}
  {const gr=c.createRadialGradient(-2.5*s,-42*s,1*s,0,-39*s,8.6*s);gr.addColorStop(0,shade(o.skin,16));gr.addColorStop(1,shade(o.skin,-20));c.fillStyle=gr}circ(c,0,-39*s,8*s);c.fill();c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1;c.stroke();
  if(o.ears){c.fillStyle=o.skin;c.beginPath();c.moveTo(-7*s,-41*s);c.lineTo(-15*s,-47*s);c.lineTo(-6*s,-37*s);c.moveTo(7*s,-41*s);c.lineTo(15*s,-47*s);c.lineTo(6*s,-37*s);c.fill()}
  c.fillStyle=shade(o.skin,-22);circ(c,face*5.2*s,-38*s,1.2*s);c.fill();
  if(o.hair&&!hooded){c.fillStyle=o.hair;
    if(!helmed){if(hs==='mohawk')rr(c,-1.8*s,-52*s,3.6*s,12*s,1.5*s),c.fill();
      else if(hs!=='bald'){c.beginPath();c.arc(0,-40*s,8.6*s,Math.PI,TAU);c.fill();c.fillRect(face>0?-8.6*s:4.6*s,-41*s,4*s,(hs==='short'?7:10)*s);c.fillStyle='rgba(255,255,255,.14)';c.beginPath();c.arc(-2*s,-45*s,4*s,Math.PI*1.1,Math.PI*1.7);c.lineTo(-2*s,-45*s);c.fill();c.fillStyle=o.hair}
      if(hs==='ponytail'){c.beginPath();c.ellipse(-face*10*s,-36*s,3*s,7.5*s,face*.4,0,TAU);c.fill()}}
    if(hs==='braids'){c.fillRect(-9.5*s,-39*s,2.6*s,16*s);c.fillRect(6.9*s,-39*s,2.6*s,16*s)}}
  const bs=o.beardStyle;if(bs&&bs!=='none'&&o.hair){if(bs==='stubble'){c.fillStyle='rgba(40,28,18,.35)';c.beginPath();c.arc(0,-37.5*s,7*s,.12*Math.PI,.88*Math.PI);c.fill()}
    else{const L=bs==='long'?-22:-30;c.fillStyle=o.hair;c.beginPath();c.moveTo(-7.4*s,-39*s);c.lineTo(7.4*s,-39*s);c.lineTo(5*s,(L+4)*s);c.lineTo(face*1.5*s,L*s);c.lineTo(-5*s,(L+4)*s);c.closePath();c.fill();c.fillStyle=o.skin;c.fillRect(face*2*s-2*s,-36*s,4*s,1.4*s)}}
  if(o.beard){c.fillStyle=o.beard;c.beginPath();c.moveTo(-6*s,-37*s);c.lineTo(6*s,-37*s);c.lineTo(face*2*s,-25*s);c.fill()}
  c.fillStyle=o.eyes||'#1b140e';if(o.glow){c.shadowColor=o.eyes;c.shadowBlur=8*s}
  c.fillRect(face*1*s-.9*s,-41.5*s,1.9*s,2.4*s);c.fillRect(face*5*s-.9*s,-41.5*s,1.9*s,2.4*s);c.shadowBlur=0;
  if(!o.glow){c.fillStyle='rgba(255,255,255,.7)';c.fillRect(face*1*s-.4*s,-41.3*s,.7*s,.7*s);c.fillRect(face*5*s-.4*s,-41.3*s,.7*s,.7*s)}
  c.strokeStyle='rgba(60,30,20,.45)';c.lineWidth=.9*s;c.beginPath();c.moveTo(face*1.5*s,-35*s);c.lineTo(face*4*s,-35.3*s);c.stroke();
  if(o.shadowFace||(hooded&&helmV&&o.darkHood)){c.fillStyle='rgba(0,0,0,.3)';circ(c,0,-39*s,8*s);c.fill()}
  if(helmV)drawHelm(c,s,face,helmV,o.hair);
  else if(o.hat==='hood'){const g=c.createLinearGradient(0,-54*s,0,-40*s);g.addColorStop(0,shade(o.hatColor,18));g.addColorStop(1,o.hatColor);c.fillStyle=g;c.beginPath();c.arc(0,-43*s,10.5*s,Math.PI,TAU);c.fill()}
  else if(o.hat==='helm'){const g=c.createLinearGradient(-9*s,-50*s,9*s,-40*s);g.addColorStop(0,'#e0e6ec');g.addColorStop(1,shade(o.hatColor||'#a7adb5',-25));c.fillStyle=g;c.beginPath();c.arc(0,-41*s,9.2*s,Math.PI,TAU);c.fill();c.fillRect(-9.2*s,-42*s,18.4*s,3*s);c.fillRect(face*2*s-1*s,-42*s,2*s,5.5*s);c.fillStyle='#b8322a';c.beginPath();c.ellipse(-face*2*s,-51*s,3*s,5*s,face*-.5,0,TAU);c.fill()}
  else if(o.hat==='pointy'){const g=c.createLinearGradient(-7*s,0,7*s,0);g.addColorStop(0,shade(o.hatColor,22));g.addColorStop(1,shade(o.hatColor,-25));c.fillStyle=g;ell(c,0,-45*s,13*s,3.5*s);c.fill();c.beginPath();c.moveTo(-7*s,-46*s);c.lineTo(7*s,-46*s);c.quadraticCurveTo(0,-56*s,-face*6*s,-69*s);c.closePath();c.fill();c.fillStyle='#e8c26a';c.fillRect(-7*s,-48*s,14*s,2*s)}
  else if(o.hat==='crown'){const g=c.createLinearGradient(0,-55*s,0,-45*s);g.addColorStop(0,'#fff0a0');g.addColorStop(1,'#b08a2a');c.fillStyle=g;c.beginPath();c.moveTo(-8*s,-45*s);c.lineTo(-8*s,-53*s);c.lineTo(-4*s,-49*s);c.lineTo(0,-55*s);c.lineTo(4*s,-49*s);c.lineTo(8*s,-53*s);c.lineTo(8*s,-45*s);c.closePath();c.fill();c.fillStyle='#e04a4a';circ(c,0,-48*s,1.4*s);c.fill()}
  // near arm, hand and weapon
  c.strokeStyle=shade(sleeve,-14);c.lineWidth=4.8*s;c.beginPath();c.moveTo(face*ax,sh);c.lineTo(face*9*bw*s,-22*s);c.stroke();
  if(o.weapon){const melee=MELEE_W.has(o.weapon);c.save();c.translate(face*9*bw*s,-22*s);c.rotate((o.aimS!=null?o.aimS:o.aim||0)+(melee?-face*1.3*ae:0));if(!melee)c.translate(ae*5*s,0);drawWeapon(c,o.weapon,s,o);
    if(ae>.3&&!melee&&o.orb){c.save();c.globalCompositeOperation='lighter';c.globalAlpha*=ae;glowOn(c,o.orb,16*s);c.fillStyle=o.orb;circ(c,(o.weapon==='bow'?16:27)*s,0,(3+ae*4)*s);c.fill();c.restore()}c.restore()}
  c.fillStyle=o.skin;circ(c,face*9*bw*s,-22*s,2.8*s);c.fill();
  if(gv.offhand&&gv.offhand.kind!=='quiver')drawOffhand(c,s,face,bw,gv.offhand);
  else if(!o.gv&&o.shield){c.save();c.translate(-face*10*bw*s,-22*s);const g=c.createRadialGradient(-2*s,-2*s,1*s,0,0,8*s);g.addColorStop(0,'#eef2f6');g.addColorStop(1,'#7a828c');c.fillStyle=g;circ(c,0,0,7.8*s);c.fill();c.fillStyle=o.shieldColor||'#2c4a8a';circ(c,0,0,5.8*s);c.fill();c.fillStyle='#e8c26a';c.fillRect(-1*s,-4*s,2*s,8*s);c.fillRect(-3.5*s,-1.5*s,7*s,2*s);c.restore()}
  c.restore()}
// Chest armor details on top of the torso shape.
function drawChestDetail(c,s,face,bw,v,robe){
  if(v.kind==='plate'){c.strokeStyle=shade(v.metal,-45);c.lineWidth=1*s;c.beginPath();c.moveTo(0,-31*s);c.lineTo(0,-14*s);c.stroke();
    c.fillStyle='rgba(255,255,255,.25)';ell(c,-face*3.5*s,-26*s,3*bw*s,4*s);c.fill();
    c.fillStyle=v.trim;c.fillRect(-9*bw*s,-32*s,18*bw*s,1.6*s);c.fillStyle='#4a3020';c.fillRect(-9*bw*s,-16*s,18*bw*s,2.6*s);c.fillStyle=v.trim;rr(c,-2*s,-16.6*s,4*s,3.8*s,1*s);c.fill();
    if(v.t>=2||v.rar>=2){glowOn(c,v.glow,6*s);c.fillStyle=v.gem;c.beginPath();c.moveTo(0,-29*s);c.lineTo(2.4*s,-25.5*s);c.lineTo(0,-22*s);c.lineTo(-2.4*s,-25.5*s);c.fill();glowOff(c)}
    if(v.t>=3){c.strokeStyle=v.trim;c.lineWidth=.8*s;for(const sd of[-1,1]){c.beginPath();c.arc(sd*4.5*bw*s,-24*s,3*s,0,TAU);c.stroke()}}}
  else if(v.kind==='leather'){c.strokeStyle=shade(v.leather,-40);c.lineWidth=2.2*s;c.beginPath();c.moveTo(-8*bw*s,-31*s);c.lineTo(7*bw*s,-15*s);c.stroke();
    c.fillStyle='#3a2616';c.fillRect(-9*bw*s,-16*s,18*bw*s,2.6*s);c.fillStyle=v.trim;rr(c,-2*s,-16.6*s,4*s,3.8*s,1*s);c.fill();
    c.fillStyle=v.t>=2?v.trim:shade(v.metal,-10);for(let k=0;k<2+v.t*2;k++){circ(c,(-6+k*(12/(1+v.t*2)))*bw*s,-28*s+k*1.5*s,.9*s);c.fill()}
    if(v.rar){c.strokeStyle=v.trim;c.lineWidth=1*s;glowOn(c,v.glow,4*s);c.strokeRect(-9*bw*s,-32*s,18*bw*s,1.2*s);glowOff(c)}}
  else{c.fillStyle=v.trim;glowOn(c,v.glow,v.rar>=2?6*s:0);c.fillRect(-1.2*s,-32*s,2.4*s,robe?30*s:14*s);c.fillRect(-11*bw*s,-4*s,22*bw*s,2*s);c.fillRect(-8*bw*s,-32*s,16*bw*s,1.8*s);glowOff(c);
    c.fillStyle='#2a1a10';c.fillRect(-9*bw*s,-18*s,18*bw*s,2.2*s);
    if(v.t>=2||v.rar>=2){glowOn(c,v.ec||v.trim,6*s);c.fillStyle=v.ec||v.trim;for(let k=-2;k<=2;k++){circ(c,k*4*bw*s,-6*s,.9*s);c.fill()}glowOff(c)}
    if(v.t>=3){c.strokeStyle=v.trim;c.lineWidth=.8*s;c.beginPath();c.arc(0,-25*s,3.2*s,0,TAU);c.stroke()}}}
function drawWolf(c,x,y,o){const s=o.s||1,face=Math.cos(o.aim||0)<0?-1:1,sw=Math.sin(o.walk||0),ol='rgba(0,0,0,.4)';c.save();c.translate(x,y);c.scale(face,1);c.lineJoin='round';
  const g=c.createLinearGradient(0,-24*s,0,-6*s);g.addColorStop(0,shade(o.col,22));g.addColorStop(1,shade(o.col,-32));
  for(const[lx,ph,far]of[[-10,1,1],[6,-1,1],[-5,-1,0],[11,1,0]]){c.save();c.translate((lx+1.9)*s,-11*s);c.rotate(sw*ph*.55);c.fillStyle=shade(o.col,far?-38:-12);rr(c,-1.9*s,0,3.8*s,11*s,1.5*s);c.fill();c.restore()}
  c.fillStyle=g;c.beginPath();c.moveTo(-15*s,-17*s);c.quadraticCurveTo(-27*s,-23*s,-28*s,-12*s);c.lineTo(-15*s,-13*s);c.fill();
  ell(c,0,-15*s,17*s,8.5*s);c.fill();c.strokeStyle=ol;c.lineWidth=1.1;c.stroke();
  c.fillStyle=shade(o.col,-38);ell(c,0,-10*s,14*s,3*s);c.fill();
  const hg=c.createRadialGradient(13*s,-24*s,1*s,15*s,-21*s,8*s);hg.addColorStop(0,shade(o.col,25));hg.addColorStop(1,shade(o.col,-25));c.fillStyle=hg;circ(c,15*s,-21*s,7.5*s);c.fill();c.stroke();
  rr(c,18*s,-22.5*s,9.5*s,5.5*s,2.5*s);c.fill();c.fillStyle='#1a1414';circ(c,27*s,-21*s,1.4*s);c.fill();
  c.fillStyle=shade(o.col,-10);c.beginPath();c.moveTo(11*s,-26*s);c.lineTo(13*s,-34*s);c.lineTo(17*s,-27*s);c.fill();c.beginPath();c.moveTo(16*s,-27*s);c.lineTo(19*s,-34.5*s);c.lineTo(21*s,-26*s);c.fill();
  c.fillStyle=o.eye;c.shadowColor=o.eye;c.shadowBlur=6;c.fillRect(17*s,-24*s,2.6*s,2*s);c.shadowBlur=0;c.restore()}
// Extra creatures: spider variants, scarab, bat, myconid, sporeling
function drawCreature(c,x,y,o){const s=o.s||1,face=Math.cos(o.aim||0)<0?-1:1,w=o.walk||0;c.save();c.translate(x,y);c.scale(face,1);c.lineJoin=c.lineCap='round';
  switch(o.kind){
    case'spider':case'cspider':case'webweaver':case'giantspider':{const P={spider:['#1e1a22','#2a2430','#5a4a60','#6a2a3a','#ff3a3a'],cspider:['#3a5a7a','#4a7aa8','#bfeaff','#9fe8ff','#e0faff'],webweaver:['#2a3a1e','#3e5a2a','#a8d878','#e8e8c0','#ffe04a'],giantspider:['#1a1020','#2e1a38','#6a4a7a','#c84a2a','#ff2a1a']}[o.kind];bugLegs(c,8,20,s,w,P[0],2.2);
      radialBall(c,-6*s,-11*s,10*s,P[1],P[2]);c.fillStyle=P[3];c.fillRect(-9*s,-15*s,6*s,2*s);if(o.kind==='giantspider'){c.fillRect(-9*s,-9*s,6*s,2*s)}
      radialBall(c,6*s,-10*s,6*s,P[1],P[2]);c.fillStyle=P[4];c.shadowColor=c.fillStyle;c.shadowBlur=6;c.fillRect(8*s,-12*s,1.9*s,1.9*s);c.fillRect(10*s,-10*s,1.9*s,1.9*s);c.shadowBlur=0;break}
    case'scarab':{bugLegs(c,6,16,s,w,'#5a4210',2.4);const g=c.createRadialGradient(-4*s,-14*s,1*s,0,-10*s,15*s);g.addColorStop(0,'#fff0a0');g.addColorStop(.5,'#d8a830');g.addColorStop(1,'#6a4a10');c.fillStyle=g;ell(c,0,-10*s,14*s,9*s);c.fill();c.strokeStyle='rgba(60,40,0,.6)';c.lineWidth=1.4;c.stroke();c.beginPath();c.moveTo(-12*s,-10*s);c.lineTo(10*s,-10*s);c.stroke();
      c.fillStyle='#4a3208';circ(c,13*s,-10*s,5*s);c.fill();c.beginPath();c.moveTo(15*s,-12*s);c.lineTo(24*s,-20*s);c.lineTo(17*s,-9*s);c.fill();c.fillStyle='#ff4a2a';circ(c,15*s,-11*s,1.2*s);c.fill();break}
    case'bat':{const z=26*s+Math.sin(rt*7+x)*4*s,fl=Math.sin(rt*22+x);c.translate(0,-z);c.fillStyle='#3a2a3a';for(const sd of[-1,1]){c.beginPath();c.moveTo(0,-2*s);c.quadraticCurveTo(sd*10*s,-12*s-fl*6*s,sd*20*s,-4*s-fl*8*s);c.quadraticCurveTo(sd*12*s,-2*s,sd*8*s,3*s);c.closePath();c.fill()}
      radialBall(c,0,0,5*s,'#4a3a4a','#8a7a8a');c.fillStyle='#ff6a6a';circ(c,2.5*s,-1*s,1*s);c.fill();circ(c,-.5*s,-1*s,1*s);c.fill();break}
    case'myconid':case'sporeling':{const big=o.kind==='myconid',k=big?1:.6,bob=Math.abs(Math.sin(w*.5))*2*s;c.translate(0,-bob);
      c.fillStyle='#e8dcc0';rr(c,-6*k*s,-24*k*s,12*k*s,24*k*s,5*k*s);c.fill();c.strokeStyle='rgba(0,0,0,.3)';c.lineWidth=1;c.stroke();
      if(big){c.strokeStyle='#d8ccb0';c.lineWidth=3*s;c.beginPath();c.moveTo(5*s,-14*s);c.lineTo(11*s,-8*s+Math.sin(w)*2*s);c.moveTo(-5*s,-14*s);c.lineTo(-10*s,-9*s);c.stroke()}
      const g=c.createRadialGradient(-5*k*s,-34*k*s,2*s,0,-28*k*s,18*k*s);g.addColorStop(0,big?'#ff9aea':'#c0ff8a');g.addColorStop(.5,big?'#a83a9a':'#5aa83a');g.addColorStop(1,big?'#4a1a4a':'#1a4a1a');c.fillStyle=g;c.beginPath();c.ellipse(0,-26*k*s,17*k*s,11*k*s,0,Math.PI,TAU);c.fill();c.fillRect(-17*k*s,-26.5*k*s,34*k*s,2*s);
      c.fillStyle='rgba(255,255,230,.7)';for(const[sx2,sy2]of[[-8,-32],[4,-34],[9,-28],[-2,-28]]){circ(c,sx2*k*s,sy2*k*s,1.8*k*s);c.fill()}
      c.fillStyle=big?'#ffe0ff':'#e0ffd0';c.shadowColor=c.fillStyle;c.shadowBlur=6;circ(c,3*k*s,-18*k*s,1.4*s);c.fill();circ(c,-1*k*s,-18*k*s,1.4*s);c.fill();c.shadowBlur=0;break}}
  c.restore()}

// ---- Buildings with real volume: front wall, two roof planes, chimney, door and shop sign
const BSTYLE={meadow:{wall:['#dcc194','#a5865c'],roof:['#b25e40','#5e2c1c'],trim:'#5a3d24'},snow:{wall:['#cfc8ba','#958c7c'],roof:['#6a5a52','#2a2220'],trim:'#3a2a1e',snow:true},
  desert:{wall:['#ecd6a4','#c4a468'],roof:['#e0c48a','#a88a50'],trim:'#8a6a3a',flat:true},swamp:{wall:['#9a8a64','#5a4a32'],roof:['#5a6a3a','#2a3418'],trim:'#3a2a18'}};
function drawBuilding(b){const st=BSTYLE[b.style]||BSTYLE.meadow,x0=b.x*TILE-camX,x1=(b.x+b.w)*TILE-camX,yb=((b.y+b.d)*TILE-camY)*TILT,yt=(b.y*TILE-camY)*TILT,H=b.shop?60:48,R=st.flat?6:b.shop?40:32,ym=(yt+yb)/2,ov=8,wdt=x1-x0,cx=(x0+x1)/2;
  softShadow(ctx,cx+14,yb+2,wdt*.62,16,.85);
  // front wall
  {const g=ctx.createLinearGradient(x0,0,x1,0);g.addColorStop(0,st.wall[0]);g.addColorStop(1,st.wall[1]);ctx.fillStyle=g}ctx.fillRect(x0,yb-H,wdt,H);
  ctx.fillStyle='rgba(0,0,0,.18)';ctx.fillRect(x0,yb-6,wdt,6);
  ctx.fillStyle=st.trim;ctx.fillRect(x0,yb-H,wdt,4);ctx.fillRect(x0,yb-H,5,H);ctx.fillRect(x1-5,yb-H,5,H);if(!st.flat){ctx.fillRect(x0,yb-H*.52,wdt,3)}
  // windows
  const win=(wx)=>{ctx.fillStyle='#3a2616';ctx.fillRect(wx-9,yb-H*.82,18,16);const g=ctx.createLinearGradient(0,yb-H*.82,0,yb-H*.82+16);g.addColorStop(0,'#fff0b0');g.addColorStop(1,'#e8a84a');ctx.fillStyle=g;ctx.fillRect(wx-7,yb-H*.82+2,14,12);ctx.fillStyle=st.trim;ctx.fillRect(wx-1,yb-H*.82+2,2,12);ctx.fillRect(wx-7,yb-H*.82+7,14,2)};
  if(wdt>140){win(x0+wdt*.2);win(x1-wdt*.2)}else win(x0+wdt*.25);
  // door (shops have an arched door you can walk through)
  const dx=b.door?b.door.x-camX:cx;if(b.shop){ctx.fillStyle='#2a1a0e';ctx.beginPath();ctx.moveTo(dx-13,yb);ctx.lineTo(dx-13,yb-26);ctx.arc(dx,yb-26,13,Math.PI,TAU);ctx.lineTo(dx+13,yb);ctx.fill();ctx.fillStyle='#5a3a20';ctx.fillRect(dx-11,yb-24,22,24);ctx.fillStyle='#d8b050';circ(ctx,dx+6,yb-12,1.6);ctx.fill();
    ctx.fillStyle='rgba(255,200,120,.2)';ctx.fillRect(dx-13,yb,26,5)}
  else{ctx.fillStyle='#3a2616';ctx.fillRect(dx+wdt*.12-9,yb-24,18,24)}
  // roof
  const back=st.flat?yt-H:yt-H,fr=yb-H+3;
  if(st.flat){ctx.fillStyle=st.roof[0];ctx.fillRect(x0-4,back-2,wdt+8,fr-back+2);ctx.fillStyle=st.roof[1];ctx.fillRect(x0-4,fr-6,wdt+8,6);ctx.fillRect(x0-4,back-6,wdt+8,5)}
  else{const ridge=ym-H-R;{const g=ctx.createLinearGradient(0,back,0,ridge);g.addColorStop(0,shade(st.roof[0],12));g.addColorStop(1,st.roof[0]);ctx.fillStyle=g}
    ctx.beginPath();ctx.moveTo(x0-ov,back);ctx.lineTo(x1+ov,back);ctx.lineTo(x1+ov,ridge);ctx.lineTo(x0-ov,ridge);ctx.closePath();ctx.fill();
    {const g=ctx.createLinearGradient(0,ridge,0,fr);g.addColorStop(0,st.roof[0]);g.addColorStop(1,st.roof[1]);ctx.fillStyle=g}ctx.beginPath();ctx.moveTo(x0-ov,ridge);ctx.lineTo(x1+ov,ridge);ctx.lineTo(x1+ov,fr);ctx.lineTo(x0-ov,fr);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.18)';ctx.lineWidth=1.5;for(let k=1;k<5;k++){const yy=ridge+(fr-ridge)*k/5;ctx.beginPath();ctx.moveTo(x0-ov,yy);ctx.lineTo(x1+ov,yy);ctx.stroke()}
    ctx.strokeStyle='rgba(255,255,255,.1)';for(let k=1;k<3;k++){const yy=back+(ridge-back)*k/3;ctx.beginPath();ctx.moveTo(x0-ov,yy);ctx.lineTo(x1+ov,yy);ctx.stroke()}
    ctx.fillStyle=shade(st.roof[1],-20);ctx.fillRect(x0-ov,ridge-2,wdt+ov*2,4);ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(x0-ov,fr,wdt+ov*2,4);
    if(st.snow){ctx.fillStyle='rgba(245,250,255,.92)';ctx.beginPath();ctx.moveTo(x0-ov,back);ctx.lineTo(x1+ov,back);ctx.lineTo(x1+ov,ridge+6);ctx.quadraticCurveTo(cx,ridge+12,x0-ov,ridge+6);ctx.closePath();ctx.fill()}}
  // chimney with a little smoke
  const chx=x1-wdt*.25,chy=st.flat?back:(back+(ym-H-R))/2;ctx.fillStyle='#6a5a52';ctx.fillRect(chx-6,chy-20,12,22);ctx.fillStyle='#4a3a32';ctx.fillRect(chx-8,chy-22,16,4);
  if(Math.random()<.05)parts.push({x:(chx+camX),y:(chy-22)/TILT+camY,z:0,vx:rand(4,12),vy:0,vz:30,life:2,max:2,col:'rgba(200,200,200,.5)',size:4,ng:true});
  // shop sign hanging next to the door
  if(b.shop){const S2=SHOPS[b.shop],sx2=dx+30,sy2=yb-H+14;ctx.strokeStyle='#3a2a1a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(dx+18,sy2-8);ctx.lineTo(sx2+12,sy2-8);ctx.stroke();
    ctx.fillStyle='#6a4a2a';rr(ctx,sx2-12,sy2-4,26,22,4);ctx.fill();ctx.strokeStyle='#3a2616';ctx.stroke();ctx.font='14px system-ui';ctx.textAlign='center';ctx.fillText(S2.icon||'🪙',sx2+1,sy2+12);
    const p=players[0];if(p&&Math.hypot(p.x-b.door.x,p.y-b.door.y)<300){ctx.font='12px Georgia';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(S2.name,cx+1,back-14);ctx.fillStyle='#f3e6c0';ctx.fillText(S2.name,cx,back-15)}}}
// ---- Scenery for interiors, dungeons, caves and entrances
function drawDecor2(d,sx,sy){const c=ctx;switch(d.k){
  case'lamp':{softShadow(c,sx,sy,10,4);c.fillStyle='#2a2420';c.fillRect(sx-2,sy-52,4,52);c.fillRect(sx-7,sy-3,14,4);c.fillStyle='#3a322a';c.fillRect(sx-8,sy-62,16,12);
    const n=nightness(),fl=.85+.15*Math.sin(rt*11+d.x);c.fillStyle=`rgba(255,${190+40*fl|0},110,${.55+.45*Math.max(n,.3)*fl})`;c.fillRect(sx-5,sy-59,10,7);c.fillStyle='#1e1a16';c.beginPath();c.moveTo(sx-10,sy-62);c.lineTo(sx,sy-70);c.lineTo(sx+10,sy-62);c.fill();break}
  case'herb':{const ready=!((d.next||0)>time),t=+d.g.slice(4),col=['#f0f0c0','#d8e8ff','#c84aff'][t-1];softShadow(c,sx,sy,10,4);c.strokeStyle=t===2?'#7a9a8a':'#4a8a3a';c.lineWidth=2;
    for(let k=-2;k<=2;k++){c.beginPath();c.moveTo(sx,sy);c.quadraticCurveTo(sx+k*4,sy-8,sx+k*5,sy-12-Math.abs(k)*-1);c.stroke()}
    if(ready){c.fillStyle=col;c.shadowColor=col;c.shadowBlur=t*4;for(let k=-1;k<=1;k++){circ(c,sx+k*5,sy-13+Math.abs(k)*2,2.6);c.fill()}c.shadowBlur=0;
      if(t>1&&Math.random()<.02)parts.push({x:d.x+rand(-6,6),y:d.y,z:14,vx:0,vy:0,vz:14,life:1,max:1,col,size:1.6,ng:true})}break}
  case'counter':{const w=d.w,x0=sx;const g=c.createLinearGradient(0,sy-26,0,sy);g.addColorStop(0,'#8a5a32');g.addColorStop(1,'#4a2e18');c.fillStyle='#a8784a';c.fillRect(x0,sy-34,w,10);c.fillStyle=g;c.fillRect(x0,sy-24,w,24);c.fillStyle='rgba(0,0,0,.25)';for(let k=1;k<6;k++)c.fillRect(x0+w*k/6,sy-24,2,24);break}
  case'barrel':{softShadow(c,sx,sy,16,6);const g=c.createLinearGradient(sx-12,0,sx+12,0);g.addColorStop(0,'#8a5a32');g.addColorStop(1,'#4a2e18');c.fillStyle=g;rr(c,sx-12,sy-30,24,30,6);c.fill();c.fillStyle='#3a3a3a';c.fillRect(sx-12,sy-25,24,3);c.fillRect(sx-12,sy-9,24,3);c.fillStyle='#a8784a';ell(c,sx,sy-30,12,4);c.fill();break}
  case'shelf':{c.fillStyle='#5a3a20';c.fillRect(sx-36,sy-48,72,48);c.fillStyle='#3a2414';for(const yy of[-34,-18])c.fillRect(sx-34,sy+yy,68,3);const cols=['#c84a3a','#4a8ac8','#e8c24a','#6ab04a','#a86ac8'];for(let k=0;k<8;k++){c.fillStyle=cols[k%5];c.fillRect(sx-30+k*8,sy-44+(k%2)*16,5,10)}break}
  case'rug':{c.fillStyle='rgba(140,40,40,.55)';ell(c,sx,sy,90,34);c.fill();c.strokeStyle='rgba(232,194,106,.5)';c.lineWidth=3;ell(c,sx,sy,78,28);c.stroke();break}
  case'anvil':{softShadow(c,sx,sy,22,7);c.fillStyle='#3a3a40';c.fillRect(sx-6,sy-14,12,14);c.fillStyle='#5a5a62';c.beginPath();c.moveTo(sx-20,sy-22);c.lineTo(sx+16,sy-22);c.lineTo(sx+24,sy-17);c.lineTo(sx+14,sy-14);c.lineTo(sx-16,sy-14);c.closePath();c.fill();break}
  case'forge':{c.fillStyle='#5a4a44';rr(c,sx-30,sy-40,60,40,6);c.fill();c.fillStyle='#2a1a14';rr(c,sx-20,sy-30,40,20,4);c.fill();const f=Math.sin(rt*10)*3;const g=c.createRadialGradient(sx,sy-20,2,sx,sy-20,22);g.addColorStop(0,'#fff0a0');g.addColorStop(.5,'#ff8a2a');g.addColorStop(1,'rgba(120,20,0,0)');c.fillStyle=g;ell(c,sx,sy-20,18+f,9);c.fill();if(Math.random()<.2)parts.push({x:d.x+rand(-10,10),y:d.y,z:20,vx:rand(-6,6),vy:0,vz:rand(40,90),life:.8,max:.8,col:'#ffb04a',size:1.8,ng:true});break}
  case'rack':{c.fillStyle='#4a2e18';c.fillRect(sx-30,sy-40,60,4);c.fillRect(sx-30,sy-10,60,4);for(let k=0;k<4;k++){c.save();c.translate(sx-22+k*15,sy-8);c.rotate(-Math.PI/2);drawWeapon(c,['sword','axe','mace','sword'][k],.9,{});c.restore()}break}
  case'mannequin':drawHumanoid(c,sx,sy,{s:1,skin:'#c8a878',cloth:'#7a7a82',hat:'helm',hatColor:'#9aa2ac',aim:.4,walk:0,legs:'#4a3a2a'});break;
  case'hides':{for(let k=0;k<3;k++){c.fillStyle=['#8a5a32','#6a4a2a','#a8784a'][k];c.beginPath();c.ellipse(sx-24+k*24,sy-22,10,16,0,0,TAU);c.fill()}break}
  case'crystalcase':{c.fillStyle='#4a3a2a';c.fillRect(sx-26,sy-20,52,20);c.fillStyle='rgba(200,230,255,.25)';c.fillRect(sx-24,sy-42,48,22);c.strokeStyle='rgba(255,255,255,.4)';c.strokeRect(sx-24,sy-42,48,22);for(let k=0;k<3;k++){c.fillStyle=['#c890ff','#7ad0ff','#ff8ac8'][k];c.shadowColor=c.fillStyle;c.shadowBlur=8;circ(c,sx-14+k*14,sy-30,3.5);c.fill()}c.shadowBlur=0;break}
  case'hay':{c.fillStyle='#d8b850';rr(c,sx-24,sy-22,48,22,6);c.fill();c.strokeStyle='#a8882a';c.lineWidth=1;for(let k=0;k<8;k++){c.beginPath();c.moveTo(sx-20+k*6,sy-20);c.lineTo(sx-18+k*6,sy-2);c.stroke()}break}
  case'saddle':{c.fillStyle='#4a2e18';c.fillRect(sx-24,sy-30,48,4);c.fillStyle='#8a4a2a';c.beginPath();c.ellipse(sx,sy-24,16,9,0,Math.PI,TAU);c.fill();break}
  case'sacks':{for(let k=0;k<3;k++){c.fillStyle=['#c8b088','#b8a078','#d8c098'][k];c.beginPath();c.ellipse(sx-14+k*14,sy-10-(k===1?6:0),11,13,0,0,TAU);c.fill()}break}
  case'walltorch':{c.fillStyle='#3a2a1a';c.fillRect(sx-2,sy-38,4,14);const f=Math.sin(rt*14+sx)*2;c.fillStyle='#ff8a2a';c.beginPath();c.moveTo(sx-6,sy-38);c.lineTo(sx+6,sy-38);c.lineTo(sx+f,sy-54);c.closePath();c.fill();c.fillStyle='#ffe08a';c.beginPath();c.moveTo(sx-3,sy-38);c.lineTo(sx+3,sy-38);c.lineTo(sx+f*.5,sy-47);c.closePath();c.fill();break}
  case'icecrystal':case'crystal':{const col=d.col||'#9fe8ff';c.shadowColor=col;c.shadowBlur=14;for(const[ox,h,w2]of[[-7,26,6],[2,36,7],[9,20,5]]){const g=c.createLinearGradient(sx+ox-w2,0,sx+ox+w2,0);g.addColorStop(0,'#ffffff');g.addColorStop(.4,col);g.addColorStop(1,shade(col,-45));c.fillStyle=g;c.beginPath();c.moveTo(sx+ox-w2,sy);c.lineTo(sx+ox,sy-h);c.lineTo(sx+ox+w2,sy);c.closePath();c.fill()}c.shadowBlur=0;break}
  case'glowshroom':{c.shadowColor=d.col;c.shadowBlur=12;for(const[ox,h,r]of[[-8,14,7],[4,20,9],[11,10,5]]){c.fillStyle='#d8e8c8';c.fillRect(sx+ox-1.5,sy-h,3,h);c.fillStyle=d.col;c.beginPath();c.ellipse(sx+ox,sy-h,r,r*.6,0,Math.PI,TAU);c.fill()}c.shadowBlur=0;break}
  case'stalag':{const g=c.createLinearGradient(sx-10,0,sx+10,0);g.addColorStop(0,'#5a5a66');g.addColorStop(1,'#25252c');c.fillStyle=g;c.beginPath();c.moveTo(sx-11,sy);c.lineTo(sx-2,sy-30-d.v*16);c.lineTo(sx+10,sy);c.closePath();c.fill();break}
  case'urn':{softShadow(c,sx,sy,12,5);const g=c.createLinearGradient(sx-10,0,sx+10,0);g.addColorStop(0,'#d8a860');g.addColorStop(1,'#7a5a28');c.fillStyle=g;c.beginPath();c.ellipse(sx,sy-12,10,12,0,0,TAU);c.fill();c.fillRect(sx-5,sy-28,10,6);c.fillStyle='#3a6a8a';c.fillRect(sx-10,sy-14,20,3);break}
  case'crypt':{softShadow(c,sx,sy+6,90,26,.8);c.fillStyle='#6a665c';rr(c,sx-70,sy-64,140,70,10);c.fill();c.fillStyle='#8a867a';rr(c,sx-76,sy-72,152,14,5);c.fill();c.fillStyle='#121014';c.beginPath();c.moveTo(sx-26,sy+6);c.lineTo(sx-26,sy-30);c.arc(sx,sy-30,26,Math.PI,TAU);c.lineTo(sx+26,sy+6);c.fill();
    for(let k=0;k<3;k++){c.fillStyle=`rgba(90,85,78,${.9-k*.2})`;c.fillRect(sx-24+k*3,sy-4+k*4,48-k*6,4)}c.fillStyle='#ff8a2a';for(const ox of[-46,46]){c.fillRect(sx+ox-2,sy-46,4,10);const f=Math.sin(rt*12+ox)*2;c.beginPath();c.moveTo(sx+ox-5,sy-46);c.lineTo(sx+ox+5,sy-46);c.lineTo(sx+ox+f,sy-60);c.fill()}
    labelName(d,sx,sy-84);break}
  case'cavemouth':{softShadow(c,sx,sy+6,100,30,.8);const g=c.createLinearGradient(0,sy-70,0,sy);g.addColorStop(0,'#7a766c');g.addColorStop(1,'#4a463e');c.fillStyle=g;c.beginPath();c.ellipse(sx,sy,100,58,0,Math.PI,TAU);c.fill();c.fillStyle='#0a0a0e';c.beginPath();c.ellipse(sx,sy+4,36,34,0,Math.PI,TAU);c.fill();
    c.fillStyle='#7ad0ff';c.shadowColor='#7ad0ff';c.shadowBlur=10;circ(c,sx-60,sy-14,3);c.fill();circ(c,sx+54,sy-22,2.5);c.fill();c.shadowBlur=0;labelName(d,sx,sy-70);break}
  case'sign':{softShadow(c,sx,sy,12,5);const g=c.createLinearGradient(sx-3,0,sx+3,0);g.addColorStop(0,'#7a5a3a');g.addColorStop(1,'#3a2616');c.fillStyle=g;c.fillRect(sx-3,sy-40,6,40);c.fillStyle='#8a6a42';c.beginPath();c.moveTo(sx-20,sy-46);c.lineTo(sx+16,sy-46);c.lineTo(sx+24,sy-38);c.lineTo(sx+16,sy-30);c.lineTo(sx-20,sy-30);c.closePath();c.fill();c.strokeStyle='#3a2616';c.lineWidth=1.2;c.stroke();c.fillStyle='rgba(40,25,10,.6)';for(let k=0;k<3;k++)c.fillRect(sx-15+k*9,sy-40,6,2);const p=players[0];if(p&&dist(p,d)<420&&!dialogOpen){c.fillStyle='#ffe08a';c.font='bold 14px Georgia';c.textAlign='center';c.globalAlpha=.6+.4*Math.sin(rt*3);c.fillText('?',sx,sy-52);c.globalAlpha=1}break}
  case'well':{softShadow(c,sx,sy,26,9);c.fillStyle='#7a766c';c.beginPath();c.ellipse(sx,sy-10,22,10,0,0,TAU);c.fill();c.fillStyle='#1a2a3a';c.beginPath();c.ellipse(sx,sy-12,16,6,0,0,TAU);c.fill();c.fillStyle='#4a2e18';c.fillRect(sx-20,sy-46,4,36);c.fillRect(sx+16,sy-46,4,36);c.fillStyle='#8a4a2a';c.beginPath();c.moveTo(sx-26,sy-44);c.lineTo(sx,sy-60);c.lineTo(sx+26,sy-44);c.closePath();c.fill();break}}}
function labelName(d,sx,y){const p=players[0];if(!p||Math.hypot(p.x-d.x,p.y-d.y)>520)return;ctx.font='13px Georgia';ctx.textAlign='center';const t=`${d.name} · level ${d.lvl[0]}–${d.lvl[1]}`;ctx.fillStyle='rgba(0,0,0,.65)';ctx.fillText(t,sx+1,y+1);ctx.fillStyle=lvlColor(p,d.lvl[0]);ctx.fillText(t,sx,y)}
// Zone-specific wall sprites
function buildZoneSprites(){const mk=(top,side,deco)=>{const c=document.createElement('canvas');c.width=TILE*SS;c.height=(TILE*TILT+30)*SS;const g=c.getContext('2d');g.scale(SS,SS);const th=TILE*TILT,h=28;
    const fg=g.createLinearGradient(0,th,0,th+h);fg.addColorStop(0,side[0]);fg.addColorStop(1,side[1]);g.fillStyle=fg;g.fillRect(0,th-2,TILE,h+2);const tg=g.createLinearGradient(0,0,0,th);tg.addColorStop(0,top[0]);tg.addColorStop(1,top[1]);g.fillStyle=tg;g.fillRect(0,0,TILE,th);deco(g,th,h);return c};
  SPR.dwall=mk(['#4a4640','#36322e'],['#2e2a26','#1a1816'],(g,th,h)=>{g.strokeStyle='rgba(0,0,0,.35)';g.lineWidth=1;for(const y of[th+9,th+18]){g.beginPath();g.moveTo(0,y);g.lineTo(TILE,y);g.stroke()}g.fillStyle='rgba(70,100,50,.35)';circ(g,12,th+4,4);g.fill()});
  SPR.iwall=mk(['#6a4a30','#4a3220'],['#8a6a48','#5a4028'],(g,th,h)=>{g.fillStyle='rgba(0,0,0,.2)';for(let x=0;x<TILE;x+=12)g.fillRect(x,th,2,h)});
  SPR.rock=(()=>{const c=document.createElement('canvas');c.width=(TILE+12)*SS;c.height=(TILE+20)*SS;const g=c.getContext('2d');g.scale(SS,SS);radialBall(g,TILE/2+6,TILE*.62,TILE*.55,'#3a3a44','#6a6a78');radialBall(g,TILE*.3,TILE*.7,TILE*.32,'#33333c','#5a5a66');return c})()}
function drawZoneWall(x,y){const sx=x*TILE-camX,sy=(y*TILE-camY)*TILT;if(zone.kind==='interior')ctx.drawImage(SPR.iwall,sx,sy-28,TILE,TILE*TILT+30);else if(zone.kind==='dungeon')ctx.drawImage(SPR.dwall,sx,sy-28,TILE,TILE*TILT+30);else ctx.drawImage(SPR.wall,sx,sy-26,TILE,TILE*TILT+28)}
function drawRock(x,y){const sx=x*TILE-camX,sy=(y*TILE-camY)*TILT;ctx.drawImage(SPR.rock,sx-6,sy-TILE*.62,TILE+12,TILE+20)}
function drawNPC(n){const[sx,sy]=S(n.x,n.y);softShadow(ctx,sx,sy,18,7);const L=n.look||{},p=players[0];const aim=p?Math.atan2(p.y-n.y,p.x-n.x):0;
  drawHumanoid(ctx,sx,sy,{s:1.05,skin:L.skin||'#e3c3a0',hair:L.hair,beard:L.beard,cloth:L.cloth||'#5a4a3a',trim:'#d8b050',aim,walk:0,legs:'#3a2a1a',hairStyle:'short'});
  ctx.font='12px Georgia';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText(n.name,sx+1,sy-62);ctx.fillStyle='#e8dcb8';ctx.fillText(n.name,sx,sy-63);const b=Math.sin(rt*3)*3;ctx.font='18px system-ui';ctx.fillText(n.kind==='innkeeper'?'🛏️':n.kind==='bard'?'🎵':SHOPS[n.shop].icon||'🪙',sx,sy-78+b)}
