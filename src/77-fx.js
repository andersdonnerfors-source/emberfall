// ================= Spell and combat effects =================
// Magic particles glow (drawn additively from cached soft sprites), spells leave trails, hits spark,
// casts draw a rune circle under the caster, and explosions flash, ring and smoke.
const glowCache=new Map();
function glowSprite(col){let c=glowCache.get(col);if(c)return c;c=document.createElement('canvas');c.width=c.height=32;const g=c.getContext('2d'),gr=g.createRadialGradient(16,16,0,16,16,16);
  gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.28,col);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,32,32);glowCache.set(col,c);
  if(glowCache.size>200)glowCache.delete(glowCache.keys().next().value);return c}
function drawParticles(){for(const q of parts){if(q.gl||q.ng)continue;const[sx,sy]=S(q.x,q.y);ctx.globalAlpha=Math.max(0,q.life/q.max);ctx.fillStyle=q.col;if(q.smoke){circ(ctx,sx,sy-q.z,q.size*(1.6-q.life/q.max*.6));ctx.fill()}else ctx.fillRect(sx-q.size/2,sy-q.z-q.size/2,q.size,q.size)}
  ctx.globalAlpha=1;ctx.save();ctx.globalCompositeOperation='lighter';
  for(const q of parts){if(!(q.gl||q.ng))continue;const[sx,sy]=S(q.x,q.y);ctx.globalAlpha=Math.max(0,q.life/q.max);
    if(q.streak){ctx.fillStyle=q.col;ctx.fillRect(sx,sy-q.z-14,q.size,14);continue}const r=q.size*2.6;ctx.drawImage(glowSprite(q.col),sx-r,sy-q.z-r,r*2,r*2)}
  ctx.restore();ctx.globalAlpha=1}
function sparks(x,y,z,col,n,spd,life){for(let i=0;i<n;i++){const a=rand(0,TAU),s=rand(.3,1)*spd;parts.push({x,y,z,vx:Math.cos(a)*s,vy:Math.sin(a)*s,vz:rand(-.3,1)*spd*.6,life:rand(.6,1)*(life||.4),max:life||.4,col,size:rand(1.2,2.6),gl:true})}}
// Color of a spell by its sound/theme.
const FX_COL={fire:'#ff7a2a',meteor:'#ff5a1a',frost:'#8fd8ff',blink:'#c890ff',holy:'#ffe08a',shieldup:'#ffe08a',bash:'#ffe08a',shadow:'#b06aff',drain:'#c84aff',curse:'#b06aff',summon:'#7dff9a',bone:'#e8e2cc',
  arrow:'#f0e2b8',trap:'#e8c890',howl:'#cfe0ff',snipe:'#fff2c0',swing:'#fff3d0'};
const AREA_COL={holy:'#ffe08a',blizzard:'#bfe6ff',plague:'#8aff6a',meteor:'#ff7a2a',rain:'#f0e2b8',curse:'#b06aff',bones:'#ece6d4',trap:'#e8c890',tele:'#ffae4a'};
function weaponCol(p){const w=p.gear&&p.gear.weapon,e=w&&elemOf(w);return e?ELEM_COL[e]:'#fff3d0'}
function hitSpark(t,col,crit){const z=(t.h||40)*.55;sparks(t.x,t.y,z,col,crit?18:8,crit?260:170,crit?.5:.32);
  fx.push({k:'flash',x:t.x,y:t.y,z,r:crit?46:24,life:crit?.22:.12,max:crit?.22:.12,col});if(crit){fx.push({k:'ring',x:t.x,y:t.y,r:70,life:.25,max:.25,col});shake=Math.max(shake,3)}}
// A rune circle under the caster and a burst of light at the hand.
function castFx(p,i){const ab=p.abil[i],col=FX_COL[ab.sfx||CASTSFX[p.cls][i]]||CLASSES[p.cls].orb||'#ffe08a';
  if(i===0){const d=24;sparks(p.x+Math.cos(p.aim)*d,p.y+Math.sin(p.aim)*d,26,col,4,90,.25);return}
  fx.push({k:'glyph',x:p.x,y:p.y,r:46,life:.6,max:.6,col});sparks(p.x+Math.cos(p.aim)*22,p.y+Math.sin(p.aim)*22,28,col,14,150,.45);
  fx.push({k:'flash',x:p.x+Math.cos(p.aim)*22,y:p.y+Math.sin(p.aim)*22,z:28,r:40,life:.2,max:.2,col})}
function boomFx(x,y,r,col){fx.push({k:'flash',x,y,z:10,r:r*1.4,life:.3,max:.3,col});fx.push({k:'ring',x,y,r:r*1.25,life:.45,max:.45,col:'#fff3d0'});
  sparks(x,y,8,col,34,r*3.2,.6);for(let i=0;i<10;i++)parts.push({x:x+rand(-r,r)*.5,y:y+rand(-r,r)*.4,z:rand(4,20),vx:rand(-30,30),vy:rand(-20,20),vz:rand(30,70),life:rand(.8,1.4),max:1.4,col:'rgba(60,50,45,.6)',size:rand(5,9),ng:false,smoke:true})}
// Ground effects drawn under units: rune circles and glowing rings for active spell areas.
function drawGroundFx(){for(const f of fx){if(f.k!=='glyph')continue;const[sx,sy]=S(f.x,f.y),k=1-f.life/f.max,r=f.r*(.6+.4*k);ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=1-k;
    ctx.strokeStyle=f.col;ctx.lineWidth=2;ctx.shadowColor=f.col;ctx.shadowBlur=10;ell(ctx,sx,sy,r,r*TILT);ctx.stroke();ell(ctx,sx,sy,r*.72,r*.72*TILT);ctx.stroke();
    for(let j=0;j<8;j++){const a=j/8*TAU+rt*2;ctx.fillStyle=f.col;ctx.fillRect(sx+Math.cos(a)*r*.86-2,sy+Math.sin(a)*r*.86*TILT-2,4,4)}ctx.restore()}
  for(const a of areas){if(a.delay>0||a.side!=='player'||!a.dur)continue;const col=AREA_COL[a.kind];if(!col)continue;const[sx,sy]=S(a.x,a.y),fade=Math.min(1,(a.dur-a.t)*3,a.t*4);
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55*fade;ctx.strokeStyle=col;ctx.lineWidth=2.5;ctx.setLineDash([14,10]);ctx.lineDashOffset=-rt*40;ctx.shadowColor=col;ctx.shadowBlur=12;
    ell(ctx,sx,sy,a.r,a.r*TILT);ctx.stroke();ctx.setLineDash([]);const g=ctx.createRadialGradient(sx,sy,0,sx,sy,a.r);g.addColorStop(0,col+'40');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.globalAlpha=(.5+.2*Math.sin(rt*5))*fade;
    ctx.save();ctx.translate(sx,sy);ctx.scale(1,TILT);circ(ctx,0,0,a.r);ctx.fill();ctx.restore();ctx.restore();
    if(Math.random()<.5){const an=rand(0,TAU),rr2=Math.sqrt(Math.random())*a.r;parts.push({x:a.x+Math.cos(an)*rr2,y:a.y+Math.sin(an)*rr2,z:2,vx:0,vy:0,vz:rand(30,70),life:.7,max:.7,col,size:1.8,gl:true})}}}
// Air effects: flashes of light, glowing weapon swings and the level-up pillar.
function drawAirFx(){ctx.save();ctx.globalCompositeOperation='lighter';
  for(const f of fx){const k=1-f.life/f.max;
    if(f.k==='flash'){const[sx,sy]=S(f.x,f.y),y=sy-(f.z||20),r=f.r*(1+k*.6);ctx.globalAlpha=1-k;ctx.drawImage(glowSprite(f.col),sx-r,y-r,r*2,r*2)}
    else if(f.k==='swing'){const[sx,sy]=S(f.x,f.y);ctx.save();ctx.translate(sx,sy-22);ctx.scale(1,TILT);ctx.globalAlpha=(1-k)*.9;const R=f.r*.85,a0=f.a-1.1+k*.9,a1=f.a+.35+k*.9;
      ctx.strokeStyle=f.col;ctx.shadowColor=f.col;ctx.shadowBlur=14;ctx.lineWidth=10*(1-k*.5);ctx.beginPath();ctx.arc(0,0,R,a0,a1);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,R,a0+.3,a1);ctx.stroke();ctx.restore()}
    else if(f.k==='pillar'){const[sx,sy]=S(f.x,f.y),w=34*(1-k*.5);ctx.globalAlpha=(1-k)*.8;const g=ctx.createLinearGradient(0,sy-260,0,sy);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.6,f.col);g.addColorStop(1,'#ffffff');ctx.fillStyle=g;ctx.fillRect(sx-w/2,sy-260,w,260);ctx.drawImage(glowSprite(f.col),sx-60,sy-50,120,80)}}
  ctx.restore();ctx.globalAlpha=1}
