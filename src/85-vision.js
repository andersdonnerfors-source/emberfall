// ================= Field of view, fog of war and monster awareness =================
const VISION=480;// how far your character can see (world pixels)
const FOGS=2;// tiles per fog cell
// ---- Exploration: each zone remembers which cells you have seen
function fogOf(z){if(!z.fog){const w=Math.ceil(z.MW/FOGS),h=Math.ceil(z.MH/FOGS);const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');g.fillStyle='#07070a';g.fillRect(0,0,w,h);
  z.fog={w,h,grid:new Uint8Array(w*h),cv,g};if(z.kind==='interior')revealAll(z);const saved=Net.role!=='guest'&&players[0]&&players[0].explored&&players[0].explored[z.id];if(saved)unpackFog(z,saved)}return z.fog}
function revealCell(f,i){if(f.grid[i])return;f.grid[i]=1;f.g.clearRect(i%f.w,Math.floor(i/f.w),1,1)}
function revealAll(z){const f=z.fog;for(let i=0;i<f.grid.length;i++)revealCell(f,i)}
function revealAround(p){const f=fogOf(zone),r=(zone.dark?Math.min(VISION,lightRadius(p)+80):VISION)/TILE/FOGS,cx=p.x/TILE/FOGS,cy=p.y/TILE/FOGS;
  for(let y=Math.floor(cy-r);y<=cy+r;y++)for(let x=Math.floor(cx-r);x<=cx+r;x++){if(x<0||y<0||x>=f.w||y>=f.h)continue;if(Math.hypot(x+.5-cx,(y+.5-cy))<=r)revealCell(f,y*f.w+x)}}
function explored(z,tx,ty){const f=fogOf(z),x=Math.floor(tx/FOGS),y=Math.floor(ty/FOGS);return x>=0&&y>=0&&x<f.w&&y<f.h&&f.grid[y*f.w+x]===1}
function packFog(z){const g=z.fog.grid;let s='';for(let i=0;i<g.length;i+=8){let b=0;for(let k=0;k<8;k++)if(g[i+k])b|=1<<k;s+=String.fromCharCode(b)}return btoa(s)}
function unpackFog(z,str){try{const s=atob(str),f=z.fog;for(let i=0;i<s.length;i++){const b=s.charCodeAt(i);for(let k=0;k<8;k++)if(b&(1<<k)&&i*8+k<f.grid.length)revealCell(f,i*8+k)}}catch(e){}}
function storeExplored(p){p.explored=p.explored||{};for(const id in zones){const z=zones[id];if(z.fog&&z.kind!=='interior')p.explored[id]=packFog(z)}}
let fogT=0;function fogTick(dt){fogT-=dt;if(fogT>0)return;fogT=.25;const p=players[0];if(p&&!p.dead)revealAround(p)}
// ---- Field of view: the world past your sight is hazed in grey and its monsters are hidden
const visCv=document.createElement('canvas'),vctx=visCv.getContext('2d');
function visibleTo(p,e){return dist(p,e)<=VISION}
function visAlpha(p,e){return clamp((VISION-dist(p,e))/70,0,1)}
function drawVisionHaze(){if(!zone||zone.dark||zone.kind==='interior')return;const p=players[0];if(!p||p.dead)return;
  if(visCv.width!==Math.ceil(W)||visCv.height!==Math.ceil(H)){visCv.width=Math.ceil(W);visCv.height=Math.ceil(H)}
  vctx.globalCompositeOperation='source-over';vctx.clearRect(0,0,W,H);vctx.fillStyle='rgba(190,192,200,.42)';vctx.fillRect(0,0,W,H);
  const[sx,sy]=S(p.x,p.y);vctx.globalCompositeOperation='destination-out';vctx.save();vctx.translate(sx,sy-20);vctx.scale(1,TILT);
  const g=vctx.createRadialGradient(0,0,VISION*.82,0,0,VISION);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');vctx.fillStyle=g;vctx.beginPath();vctx.arc(0,0,VISION,0,TAU);vctx.fill();vctx.restore();
  ctx.drawImage(visCv,0,0,W,H)}
// ---- Awareness: monsters need a moment to notice you; stronger ones see farther and react faster
function viewerLevel(t){return t.isPlayer?t.level:t.owner?t.owner.level:1}
function aggroRange(e,t){const d=clamp(e.lvl-viewerLevel(t),-5,6);return clamp((e.boss?380:270)+d*42,150,VISION-30)}
function alertRate(e,t,dd,range){const d=e.lvl-viewerLevel(t);let r=1/1.15;r*=d>0?1+.35*d:1/(1+.22*-d);return r*(1+.8*(1-dd/range))}
function senseTargets(e,dt){let best=null,bd=1e9,br=0;for(const t of friendlies()){const d=dist(e,t),r=aggroRange(e,t);if(d<r&&d<bd&&(zone.kind!=='over'||lineClear(e.x,e.y,t.x,t.y,PBLOCK)||d<120)){bd=d;best=t;br=r}}
  if(best){e.alert=(e.alert||0)+dt*alertRate(e,best,bd,br);if(e.alert>=1){e.target=best;e.alert=0;e.aggroFlash=time+.7;if(best.isPlayer)sfx('enemyshot')}}else e.alert=Math.max(0,(e.alert||0)-dt*.6)}
function drawAwareness(u,sx,sy){if(u.side!=='enemy')return;const y=sy-u.h-28;
  if(u.aggroFlash>time){ctx.font='bold 20px Georgia';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText('!',sx+1,y+1);ctx.fillStyle='#ff4a3a';ctx.fillText('!',sx,y)}
  else if(!u.target&&u.alert>0){ctx.font='bold 18px Georgia';ctx.textAlign='center';ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillText('?',sx+1,y+1);ctx.fillStyle=`rgb(255,${Math.round(230-150*u.alert)},${Math.round(80-60*u.alert)})`;ctx.fillText('?',sx,y);
    ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillRect(sx-12,y+4,24,3);ctx.fillStyle='#ffb03a';ctx.fillRect(sx-12,y+4,24*u.alert,3)}}
// ---- World map (N or click the minimap)
let mapOpen=false;
function toggleMap(v){mapOpen=v===undefined?!mapOpen:v;$('worldmap').classList.toggle('hidden',!mapOpen);if(mapOpen){mouse.l=false;drawWorldMap()}}
function drawWorldMap(){const cv=$('wmap'),c=cv.getContext('2d'),S2=cv.width,z=zone,k=S2/Math.max(z.MW,z.MH);c.fillStyle='#07070a';c.fillRect(0,0,S2,S2);c.imageSmoothingEnabled=true;
  c.drawImage(z.terrain.ov,0,0,z.MW*k,z.MH*k);const f=fogOf(z);c.drawImage(f.cv,0,0,f.w*FOGS*k,f.h*FOGS*k);
  $('wmapTitle').textContent=z.kind==='over'?'The Westmark':z.name;
  if(z.kind==='over'){c.textAlign='center';for(const ct of CITIES)if(explored(z,ct.x,ct.y)){c.fillStyle='#fff3d0';c.fillRect(ct.x*k-4,ct.y*k-4,8,8);c.font='bold 13px Georgia';c.fillStyle='rgba(0,0,0,.7)';c.fillText(ct.name,ct.x*k+1,ct.y*k-9);c.fillStyle='#fff3d0';c.fillText(ct.name,ct.x*k,ct.y*k-10)}
    for(const e of ENTRANCES)if(explored(z,e.x,e.y)){c.fillStyle=e.kind==='dungeon'?'#ff7a4a':'#7ad0ff';c.beginPath();c.arc(e.x*k,e.y*k,5,0,TAU);c.fill();c.font='11px Georgia';c.fillStyle='#e8dcb8';c.fillText(e.name,e.x*k,e.y*k+16)}
    const p0=players[0];const home=homeCity(p0);c.font='16px system-ui';c.fillText('🏠',home.x*k,home.y*k+22);
    const tg=questTarget();if(tg){c.strokeStyle='#ffd84a';c.lineWidth=2;c.beginPath();c.arc(tg.x/TILE*k,tg.y/TILE*k,8,0,TAU);c.stroke()}}
  const p=players[0];if(p){c.fillStyle='#fff';c.strokeStyle='#000';c.beginPath();c.arc(p.x/TILE*k,p.y/TILE*k,5,0,TAU);c.fill();c.stroke()}
  const tot=f.grid.length,ex=f.grid.reduce((s,v)=>s+v,0);$('wmapPct').textContent=`${Math.round(ex/tot*100)}% explored`}
$('wmapClose').onclick=()=>toggleMap(false);$('mini').onclick=()=>{if(state==='play')toggleMap(true)};
// ---- Minimap: a zoomed view of the area around you, with fog of war
function drawMini(){const c=$('mini').getContext('2d'),p=players[0];c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.fillStyle='#07070a';c.fillRect(0,0,200,200);if(!p||!terrain)return;
  const V=Math.min(Math.max(MW,MH),56),k=200/(V*TILE),ox=clamp(p.x-V*TILE/2,Math.min(0,(MW-V)*TILE/2),Math.max(0,(MW-V)*TILE)),oy=clamp(p.y-V*TILE/2,Math.min(0,(MH-V)*TILE/2),Math.max(0,(MH-V)*TILE));
  const X=x=>(x-ox)*k,Y=y=>(y-oy)*k;c.drawImage(terrain.ov,X(0),Y(0),MW*TILE*k,MH*TILE*k);const f=fogOf(zone);c.drawImage(f.cv,X(0),Y(0),f.w*FOGS*TILE*k,f.h*FOGS*TILE*k);
  for(const e of enemies){if(dist(e,p)>VISION&&!(e.boss&&e.target))continue;c.fillStyle=e.boss?'#d070ff':lvlColor(p,e.lvl)==='#8a8a8a'?'#9a9a9a':'#ff5a46';const s=e.boss?6:3;c.fillRect(X(e.x)-s/2,Y(e.y)-s/2,s,s)}
  for(const c2 of corpsesOf(zone))if(lootable(c2)){c.fillStyle='#ffe08a';c.fillRect(X(c2.x)-1.5,Y(c2.y)-1.5,3,3)}
  c.textAlign='center';
  if(zone.id==='over'){c.fillStyle='#ffd84a';c.fillRect(X(warden.x)-2,Y(warden.y)-2,4,4);
    for(const ct of CITIES){if(!explored(zone,ct.x,ct.y))continue;c.font='bold 10px system-ui';c.fillStyle='rgba(0,0,0,.7)';c.fillText(ct.name,X((ct.x+.5)*TILE)+1,Y((ct.y-4)*TILE)+1);c.fillStyle='#fff3d0';c.fillText(ct.name,X((ct.x+.5)*TILE),Y((ct.y-4)*TILE))}
    for(const e of ENTRANCES){if(!explored(zone,e.x,e.y))continue;c.fillStyle=e.kind==='dungeon'?'#ff7a4a':'#7ad0ff';c.beginPath();c.arc(X((e.x+.5)*TILE),Y((e.y+.5)*TILE),4,0,TAU);c.fill();c.strokeStyle='#000';c.lineWidth=1;c.stroke()}
    for(const s of zone.signs||[])if(explored(zone,s.x/TILE,s.y/TILE)){c.fillStyle='#c8a060';c.fillRect(X(s.x)-1.5,Y(s.y)-1.5,3,3)}}
  else for(const d of zone.doors){c.fillStyle='#7aff9a';c.fillRect(X(d.x)-3,Y(d.y)-3,6,6)}
  const tg=questTarget();if(tg){const tx=X(tg.x),ty=Y(tg.y);if(tx>4&&ty>4&&tx<196&&ty<182){c.strokeStyle='#ffd84a';c.lineWidth=2;c.beginPath();c.arc(tx,ty,5+Math.sin(rt*4)*1.5,0,TAU);c.stroke()}
    else{const a=Math.atan2(ty-100,tx-100);c.fillStyle='#ffd84a';c.save();c.translate(100+Math.cos(a)*88,100+Math.sin(a)*84);c.rotate(a);c.beginPath();c.moveTo(7,0);c.lineTo(-5,-5);c.lineTo(-5,5);c.fill();c.restore()}}
  c.save();c.translate(X(p.x),Y(p.y));c.rotate(Math.atan2(Math.sin(p.aim),Math.cos(p.aim)));c.fillStyle='#fff';c.beginPath();c.moveTo(6,0);c.lineTo(-4,-4);c.lineTo(-4,4);c.closePath();c.fill();c.strokeStyle='#000';c.lineWidth=1;c.stroke();c.restore();
  c.font='10px Georgia';c.fillStyle='rgba(0,0,0,.65)';c.fillRect(0,186,200,14);c.fillStyle='#e8dcb8';c.fillText(zone.kind==='over'?BIOME_NAME[biomeAtW(p.x,p.y)]:zone.name,100,197)}
