// ================= Atmosphere: day and night, regional mood, fog, ambient life and dread =================
// A day lasts 12 minutes. Nights are truly dark: only your hero, fires, lamps and spells push back the black,
// and monsters' eyes glow. Every region has its own colour mood, fog drifts through the woods and bogs,
// and blood stains the ground for a while after a fight.
const DAY_LEN=720;let worldClock=DAY_LEN*.18;
function dayPhase(){return(worldClock%DAY_LEN)/DAY_LEN}
// 0 = full day, 1 = deep night. Day .00–.50, dusk .50–.62, night .62–.90, dawn .90–1.00.
function nightness(){const t=dayPhase();return t<.5?0:t<.62?(t-.5)/.12:t<.9?1:1-(t-.9)/.1}
function timeOfDayName(){const t=dayPhase();return t<.5?'Day':t<.62?'Dusk':t<.9?'Night':'Dawn'}
// ---- Regional mood: a colour grade that blends as you travel
const MOODS={0:{tint:'#d9d3c6',k:.35,fog:.10},1:{tint:'#b8c8e0',k:.45,fog:.16},2:{tint:'#e8c9a0',k:.40,fog:.06},3:{tint:'#7f9a80',k:.62,fog:.30},4:{tint:'#8fa078',k:.58,fog:.34},
  barrow:{tint:'#7f8fb0',k:.65,fog:.32},deep:{tint:'#b07a72',k:.6,fog:.22},cave:{tint:'#8a8aa8',k:.3,fog:0},dungeon:{tint:'#a08a7a',k:.3,fog:0},indoor:{tint:'#f0d8b0',k:.15,fog:0}};
const mood={r:217,g:211,b:198,k:.35,fog:.1};
function moodKey(){if(!zone||zone.kind==='interior')return'indoor';if(zone.kind==='cave')return'cave';if(zone.kind==='dungeon')return'dungeon';const p=players[0];if(!p)return 0;
  const tx=p.x/TILE,ty=p.y/TILE,b=biomeAtW(p.x,p.y);if(Math.hypot(tx-BARROW.x,ty-BARROW.y)<34*WS)return'barrow';if(isDeep(tx,ty,b))return'deep';return b}
function hexRgb(h){const n=parseInt(h.slice(1),16);return[n>>16,n>>8&255,n&255]}
function updateMood(dt){const m=MOODS[moodKey()]||MOODS[0],[r,g,b]=hexRgb(m.tint),k=Math.min(1,dt*.8);mood.r+=(r-mood.r)*k;mood.g+=(g-mood.g)*k;mood.b+=(b-mood.b)*k;mood.k+=(m.k-mood.k)*k;mood.fog+=(m.fog-mood.fog)*k}
function drawMood(){ctx.save();ctx.globalCompositeOperation='multiply';ctx.globalAlpha=mood.k;ctx.fillStyle=`rgb(${mood.r|0},${mood.g|0},${mood.b|0})`;ctx.fillRect(0,0,W,H);ctx.restore();
  // a touch of contrast so darks feel deep
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.25;ctx.fillStyle='#202028';ctx.fillRect(0,0,W,H);ctx.restore()}
// ---- Night: darkness with holes cut by every light source
const nightCv=document.createElement('canvas'),nctx=nightCv.getContext('2d');
function nightLights(){const L=[],n=nightness();for(const p of[...players,...Net.avatars.values()])if(!p.dead&&!p.away)L.push([p.x,p.y-10,p.light?LIGHTS[p.light-1].r*1.05:230,1]);
  for(const d of decor){if(d.k==='fire'||d.k==='walltorch')L.push([d.x,d.y-10,300,1]);else if(d.k==='lamp')L.push([d.x,d.y-30,210,.95]);else if(d.k==='well'||d.k==='stall')L.push([d.x,d.y-20,120,.5])}
  for(const pr of projs)if(pr.kind==='orb')L.push([pr.x,pr.y-20,110,.85]);for(const a of areas)if(AREA_COL[a.kind]&&!a.delay)L.push([a.x,a.y,a.r*1.3,.75]);
  for(const f of fx)if(f.k==='flash'||f.k==='pillar')L.push([f.x,f.y,(f.r||60)*2.2,.7*f.life/f.max]);
  for(const b of buildings)if(b.shop)L.push([b.door.x,b.door.y-30,150,.8]);return L}
function drawNight(){const n=nightness();if(n<=.01||!zone||zone.kind!=='over')return;if(nightCv.width!==Math.ceil(W)||nightCv.height!==Math.ceil(H)){nightCv.width=Math.ceil(W);nightCv.height=Math.ceil(H)}
  nctx.globalCompositeOperation='source-over';nctx.clearRect(0,0,W,H);nctx.fillStyle=`rgba(4,6,16,${.8*n})`;nctx.fillRect(0,0,W,H);nctx.globalCompositeOperation='destination-out';
  for(const[x,y,r,a]of nightLights()){const[sx,sy]=S(x,y);if(sx<-r||sy<-r||sx>W+r||sy>H+r)continue;const fl=.96+.04*Math.sin(rt*8+x);const g=nctx.createRadialGradient(sx,sy,0,sx,sy,r*fl);
    g.addColorStop(0,`rgba(0,0,0,${a})`);g.addColorStop(.5,`rgba(0,0,0,${a*.75})`);g.addColorStop(1,'rgba(0,0,0,0)');nctx.fillStyle=g;nctx.fillRect(sx-r,sy-r,r*2,r*2)}
  ctx.drawImage(nightCv,0,0,W,H);
  // warm glow around fires and lamps, cold moonlight sheen
  ctx.save();ctx.globalCompositeOperation='lighter';for(const d of decor){if(d.k!=='fire'&&d.k!=='lamp')continue;const[sx,sy]=S(d.x,d.y);if(sx<-300||sy<-300||sx>W+300||sy>H+300)continue;
    ctx.globalAlpha=n*(d.k==='fire'?.5:.35)*(.9+.1*Math.sin(rt*9+d.x));ctx.drawImage(glowSprite(d.k==='fire'?'#ff8a30':'#ffc870'),sx-140,sy-150,280,240)}
  ctx.globalAlpha=n*.05;ctx.fillStyle='#4060c0';ctx.fillRect(0,0,W,H);ctx.restore();ctx.globalAlpha=1;drawEyes(n)}
// Monsters' eyes burn in the dark.
function drawEyes(n){if(n<.25)return;ctx.save();ctx.globalCompositeOperation='lighter';const p=players[0];
  for(const e of enemies){if(e.dead)continue;const[sx,sy]=S(e.x,e.y);if(sx<-50||sy<-50||sx>W+50||sy>H+50)continue;if(p&&Math.hypot(e.x-p.x,e.y-p.y)<150)continue;
    const face=Math.cos(e.aim||0)<0?-1:1,s=(e.boss?1.8:1)*(ETYPES[e.type].big?1.4:1),hy=sy-(e.h||40)*.78,col=/wight|wraith|barrow|skeleton|mummy|frost|rime|ice/.test(e.type)?'#8ff':e.boss?'#ff3a2a':'#ff6a3a';
    ctx.globalAlpha=(n-.2)*(.7+.3*Math.sin(rt*3+e.nid));for(const dx of[2,6])ctx.drawImage(glowSprite(col),sx+face*dx*s-5*s,hy-5*s,10*s,10*s)}ctx.restore()}
// ---- Drifting fog banks, thicker in dark woods, bogs and the barrow-downs
const fogSpr=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),gr=g.createRadialGradient(64,64,0,64,64,64);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(.6,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);return c})();
function drawFogBanks(){const dens=mood.fog+(zone&&zone.kind==='over'?nightness()*.08:0);if(dens<.02)return;const C=520,wx=rt*14,x0=Math.floor((camX-wx)/C)-1,x1=Math.floor((camX-wx+W)/C)+1,y0=Math.floor(camY/C)-1,y1=Math.floor((camY+H/TILT)/C)+1;
  ctx.save();const n=nightness();for(let gy=y0;gy<=y1;gy++)for(let gx=x0;gx<=x1;gx++){const h=hash(gx*7+3,gy*13+5);if(h<.35)continue;
    const x=(gx+hash(gx,gy*3))*C+wx,y=(gy+hash(gx*5,gy))*C,[sx,sy]=S(x,y),r=C*(.55+h*.5);ctx.globalAlpha=dens*(.5+.5*Math.sin(rt*.3+h*9));
    ctx.filter=n>.5?'brightness(.35)':'none';ctx.drawImage(fogSpr,sx-r,sy-r*.45,r*2,r*.9)}ctx.filter='none';ctx.restore();ctx.globalAlpha=1}
// ---- Ambient life: fireflies, snow, desert dust, bog motes, ash
function ambientTick(dt){if(!zone||zone.kind!=='over'||state!=='play')return;const p=players[0];if(!p)return;const k=moodKey(),n=nightness(),R=(a,b)=>a+Math.random()*(b-a);
  const spawn=(rate,f)=>{let c=rate*dt;while(c>0){if(Math.random()<c)f();c--}};const vx=camX+R(0,W),vy=camY+R(0,H/TILT);
  if(k===1)spawn(28,()=>parts.push({x:camX+R(-100,W),y:camY+R(-50,H/TILT),z:R(80,220),vx:R(-30,-10),vy:R(-5,5),vz:R(-60,-35),life:4,max:4,col:'#f4f8ff',size:R(1.5,3),ng:true}));
  else if(k===2)spawn(6,()=>parts.push({x:camX-20,y:camY+R(0,H/TILT),z:R(2,40),vx:R(160,260),vy:R(-10,10),vz:0,life:R(2,4),max:4,col:'rgba(220,190,140,.5)',size:R(1,2),streak:false,ng:true}));
  else if(k===3||k===0){if(n>.4)spawn(4*n,()=>parts.push({x:camX+R(0,W),y:camY+R(0,H/TILT),z:R(10,60),vx:R(-15,15),vy:R(-15,15),vz:R(-8,8),life:R(3,6),max:6,col:'#d8ff6a',size:1.6,gl:true}));
    else if(k===3)spawn(1.5,()=>parts.push({x:camX+R(0,W),y:camY+R(0,H/TILT),z:R(90,160),vx:R(-12,12),vy:R(-6,6),vz:R(-25,-12),life:6,max:6,col:'#5a6a30',size:2.4}))}
  else if(k===4)spawn(4,()=>parts.push({x:vx,y:vy,z:R(0,6),vx:R(-6,6),vy:R(-6,6),vz:R(10,22),life:R(2,4),max:4,col:'#9fe07a',size:1.4,gl:true}));
  else if(k==='barrow'||k==='deep')spawn(6,()=>parts.push({x:camX+R(0,W),y:camY+R(0,H/TILT),z:R(60,160),vx:R(-10,10),vy:R(-5,5),vz:R(-18,-8),life:6,max:6,col:k==='barrow'?'#9fb0d0':'#8a7470',size:R(1.5,2.5),ng:true}));
  // distant howls and cries at night
  if(n>.6&&Math.random()<dt/35)sfx(Math.random()<.5?'howl':'roar')}
// ---- Blood on the ground (fades away)
let decals=[];const BLOODLESS=/golem|wight|wraith|barrowking|skeleton|mummy|sporeling|myconid/;
function bloodAt(x,y,big,type){if(type&&BLOODLESS.test(type))return;if(decals.length>140)decals.shift();
  const n=big?1+Math.floor(Math.random()*2):1;for(let i=0;i<n;i++)decals.push({x:x+rand(-14,14),y:y+rand(-8,8),r:(big?rand(12,22):rand(4,9)),a:rand(0,TAU),t:time,life:big?45:20,z:zone.id})}
function drawDecals(){if(!decals.length)return;decals=decals.filter(d=>time-d.t<d.life);for(const d of decals){if(d.z!==zone.id)continue;const[sx,sy]=S(d.x,d.y);if(sx<-40||sy<-40||sx>W+40||sy>H+40)continue;
  const f=1-(time-d.t)/d.life;ctx.globalAlpha=.55*Math.min(1,f*2);ctx.fillStyle='#4a0808';ctx.save();ctx.translate(sx,sy);ctx.rotate(d.a);ctx.scale(1,TILT*.9);
  ctx.beginPath();ctx.ellipse(0,0,d.r,d.r*.7,0,0,TAU);ctx.fill();ctx.fillStyle='#2a0404';ctx.beginPath();ctx.ellipse(d.r*.2,0,d.r*.5,d.r*.35,0,0,TAU);ctx.fill();ctx.restore()}ctx.globalAlpha=1}
// ---- Dread: a red edge when you are hurt, and a heartbeat when you are close to death
let hurtFlash=0;
function drawDread(){const p=players[0];if(!p||p.dead||state!=='play')return;const f=p.hp/p.maxHp;let a=hurtFlash*.5;
  if(f<.35){const beat=Math.pow(Math.max(0,Math.sin(rt*(f<.15?9:6))),8);a=Math.max(a,(.35-f)*1.4+beat*.25);if(beat>.95&&rt>(drawDread.t||0)){drawDread.t=rt+.4;sfx('hurt')}}
  if(a<=.01)return;const g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*.32,W/2,H/2,Math.max(W,H)*.7);g.addColorStop(0,'rgba(120,0,0,0)');g.addColorStop(1,`rgba(140,0,0,${Math.min(.75,a)})`);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
let lastPhase='';
function atmosTick(dt){if(Net.role!=='guest')worldClock+=dt;const ph=timeOfDayName();if(ph!==lastPhase){if(lastPhase&&ph==='Dusk'&&zone.kind==='over')toast('The sun sinks. Night is coming, and the wilds grow bolder.','danger');if(lastPhase&&ph==='Dawn'&&zone.kind==='over')toast('Dawn breaks over the Westmark.','gold');lastPhase=ph}updateMood(dt);ambientTick(dt);hurtFlash=Math.max(0,hurtFlash-dt*2.5)}
