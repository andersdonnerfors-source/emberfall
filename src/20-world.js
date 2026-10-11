// ================= World =================
// The game is made of zones: the big overworld, shop interiors, dungeons and caves. Each zone has its own
// tile map; the active one is swapped into the globals below (map, tvar, bio, MW, MH, decor, buildings…).
const TILE=48,TILT=0.72,OW=632,WS=OW/200;// the world is ~10x the area of the first version; old layout coordinates are scaled by WS
const wsc=p=>Object.assign({},p,{x:Math.round(p.x*WS),y:Math.round(p.y*WS),_bx:p.x,_by:p.y});// _bx/_by: place on the original plan
const T={GRASS:0,TREE:1,WATER:2,PATH:3,STONE:4,WALL:5,HOUSE:6,DIRT:7,BRIDGE:8,BOG:9,PLANK:10,CAVE:11,ROCK:12};
const BLOCK=new Set([T.TREE,T.WATER,T.WALL,T.HOUSE,T.ROCK]);
const FLYBLOCK=new Set([T.TREE,T.WALL,T.HOUSE,T.ROCK]);// a dragon flies over water
const PBLOCK=new Set([T.TREE,T.WALL,T.HOUSE,T.ROCK]);
const VC=wsc({x:100,y:100}),CAMP=wsc({x:116,y:37}),BARROW=wsc({x:46,y:154}),DEN=wsc({x:100,y:166}),TROLL=wsc({x:171,y:120});
const B={MEADOW:0,SNOW:1,DESERT:2,FOREST:3,SWAMP:4,CAVE:5,DUNGEON:6,INDOOR:7};
const BIOME_NAME=['Emberfall Meadows','The Frostfells','The Sunscar Desert','The Gloomwood','The Mirefen Bog','Underground','Dungeon','Indoors'];
let MW=OW,MH=OW,map=new Uint8Array(MW*MH),tvar=new Float32Array(MW*MH),bio=new Uint8Array(MW*MH),decor=[],buildings=[],zone=null;
const zones={};
function biomeOf(x,y){const dx=x-VC.x,dy=y-VC.y,d=Math.hypot(dx,dy),n=vnoise(x/14/WS+200,y/14/WS+200);if(d<(34+n*12)*WS)return B.MEADOW;
  const a=Math.atan2(dy,dx)*180/Math.PI+(n-.5)*34;for(const b of[1,2,3])if(inWedge(a,WEDGE[b]))return b;return B.SWAMP}
function biomeAtW(wx,wy){const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);if(x<0||y<0||x>=MW||y>=MH)return zone&&zone.kind!=='over'?zone.biome:B.MEADOW;return bio[y*MW+x]}
function setT(x,y,t){if(x>=0&&y>=0&&x<MW&&y<MH)map[y*MW+x]=t}
function getT(x,y){if(x<0||y<0||x>=MW||y>=MH)return zone&&zone.kind==='over'?T.TREE:T.WALL;return map[y*MW+x]}
function tileAt(wx,wy){return getT(Math.floor(wx/TILE),Math.floor(wy/TILE))}
const TRUNK_R=15;
function solidAt(wx,wy,fly){const x=Math.floor(wx/TILE),y=Math.floor(wy/TILE);if(x<0||y<0||x>=MW||y>=MH)return true;const t=map[y*MW+x];
  if(t===T.TREE)return Math.hypot(wx-(x+.5)*TILE,wy-(y+.76)*TILE)<TRUNK_R;return(fly?FLYBLOCK:BLOCK).has(t)}
function free(x,y,r,fly){const k=r*.7;return!solidAt(x-k,y-k,fly)&&!solidAt(x+k,y-k,fly)&&!solidAt(x-k,y+k,fly)&&!solidAt(x+k,y+k,fly)}
function moveEnt(e,dx,dy){const f=!!e.fly;if(free(e.x+dx,e.y,e.r,f))e.x+=dx;if(free(e.x,e.y+dy,e.r,f))e.y+=dy}
// Walks toward a point; when blocked by trees or walls, steers around them instead of getting stuck.
function moveToward(e,x,y,step){const dx=x-e.x,dy=y-e.y,d=Math.hypot(dx,dy);if(d<1)return;const s=Math.min(step,d),base=Math.atan2(dy,dx);
  const a=base+(e.steerT>time?e.steerA:0),ox=e.x,oy=e.y;moveEnt(e,Math.cos(a)*s,Math.sin(a)*s);
  if(Math.hypot(e.x-ox,e.y-oy)<s*.3){const pref=e.steerA>0?1:-1;for(const off of[.8*pref,-.8*pref,1.5*pref,-1.5*pref,2.3*pref,-2.3*pref]){e.x=ox;e.y=oy;moveEnt(e,Math.cos(base+off)*s,Math.sin(base+off)*s);if(Math.hypot(e.x-ox,e.y-oy)>=s*.5){e.steerA=off;e.steerT=time+.7;return}}e.x=ox;e.y=oy}}
const tw=p=>({x:(p.x+.5)*TILE,y:(p.y+.5)*TILE});
function lineClear(x0,y0,x1,y1,set){const n=Math.ceil(Math.hypot(x1-x0,y1-y0)/16);for(let i=1;i<n;i++){const t=i/n;if(set.has(tileAt(x0+(x1-x0)*t,y0+(y1-y0)*t)))return false}return true}
// Small A* on the tile grid (8 directions, no corner cutting), capped so it stays cheap.
function findPath(x0,y0,x1,y1){const sx=Math.floor(x0/TILE),sy=Math.floor(y0/TILE),gx=Math.floor(x1/TILE),gy=Math.floor(y1/TILE);if(sx===gx&&sy===gy)return[];
  const heap=[],f=o=>o[2]+o[3];
  const push=o=>{heap.push(o);let i=heap.length-1;while(i>0){const p=(i-1)>>1;if(f(heap[p])<=f(heap[i]))break;[heap[p],heap[i]]=[heap[i],heap[p]];i=p}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let i=0;for(;;){const l=i*2+1,r=l+1;let m=i;if(l<heap.length&&f(heap[l])<f(heap[m]))m=l;if(r<heap.length&&f(heap[r])<f(heap[m]))m=r;if(m===i)break;[heap[m],heap[i]]=[heap[i],heap[m]];i=m}}return top};
  push([sx,sy,0,Math.hypot(gx-sx,gy-sy)]);const came=new Map(),gs=new Map([[sy*MW+sx,0]]);let best=null,bh=1e9,n=0;const open=heap;
  while(open.length&&n<900){const[cx,cy,g,h]=pop();if(g>gs.get(cy*MW+cx))continue;n++;
    if(h<bh){bh=h;best=cy*MW+cx}if(cx===gx&&cy===gy)break;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=cx+dx,ny=cy+dy;if(BLOCK.has(getT(nx,ny)))continue;if(dx&&dy&&(BLOCK.has(getT(cx+dx,cy))||BLOCK.has(getT(cx,cy+dy))))continue;
      const k=ny*MW+nx,ng=g+(dx&&dy?1.414:1);if(ng<(gs.has(k)?gs.get(k):1e9)){gs.set(k,ng);came.set(k,cy*MW+cx);push([nx,ny,ng,Math.hypot(gx-nx,gy-ny)])}}}
  const path=[];let c=best;const start=sy*MW+sx;while(c!=null&&c!==start&&path.length<200){path.push({x:(c%MW+.5)*TILE,y:(Math.floor(c/MW)+.5)*TILE});c=came.get(c)}return path.reverse()}
// AI movement: straight when the way is clear, otherwise follow a short A* path.
function navMove(e,x,y,step){if(lineClear(e.x,e.y,x,y,BLOCK)){e.path=null;moveToward(e,x,y,step);return}
  if(!e.path||e.pathT<time||!e.pathGoal||Math.hypot(e.pathGoal.x-x,e.pathGoal.y-y)>96){e.path=findPath(e.x,e.y,x,y);e.pathT=time+1+Math.random()*.6;e.pathGoal={x,y}}
  while(e.path.length&&Math.hypot(e.path[0].x-e.x,e.path[0].y-e.y)<20)e.path.shift();
  if(e.path.length)moveToward(e,e.path[0].x,e.path[0].y,step);else moveToward(e,x,y,step)}
function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function clearing(c,r,t){for(let dy=-r-2;dy<=r+2;dy++)for(let dx=-r-2;dx<=r+2;dx++){const rr2=r+(hash(c.x+dx,c.y+dy+5)-.5)*2;if(Math.hypot(dx,dy)<=rr2){const cur=getT(c.x+dx,c.y+dy);if(cur!==T.HOUSE)setT(c.x+dx,c.y+dy,t)}}}
function road(a,b){const n=Math.ceil(Math.hypot(b.x-a.x,b.y-a.y));const L=Math.max(1,n),nx=-(b.y-a.y)/L,ny=(b.x-a.x)/L;
  for(let i=0;i<=n;i++){const t=i/n,w=Math.sin(t*Math.PI*3)*2.6*Math.sin(t*Math.PI);const x=Math.round(a.x+(b.x-a.x)*t+nx*w),y=Math.round(a.y+(b.y-a.y)*t+ny*w);
    for(const[ox,oy]of[[0,0],[1,0],[0,1]]){const cur=getT(x+ox,y+oy);if(cur===T.HOUSE||cur===T.WALL)continue;setT(x+ox,y+oy,cur===T.WATER||cur===T.BRIDGE?T.BRIDGE:T.PATH)}}}

// ---- Cities, buildings and fixed entrances
// Building types: house (just scenery) or a shop you can walk into. Positions are offsets from the city center.
const CITIES=[
  {id:'emberfall',name:'Emberfall',x:100,y:100,r:13,style:'meadow',b:[['general',-9,-8,{trainer:'alchemy'}],['smith',5,-8,{trainer:'blacksmithing'}],['stable',-10,4,{mounts:['cow','horse']}],['house',6,5],['house',-2,8]]},
  {id:'frosthold',name:'Frosthold',x:80,y:50,r:11,style:'snow',b:[['armorer',-8,-7,{trainer:'leatherworking'}],['smith',3,-7],['general',-8,3],['house',4,4]]},
  {id:'sunreach',name:'Sunreach',x:153,y:86,r:11,style:'desert',b:[['jeweler',-8,-7,{trainer:'enchanting'}],['stable',3,-7,{mounts:['ostrich','dragon']}],['general',-8,3],['house',4,4]]},
  {id:'mirewatch',name:'Mirewatch',x:46,y:110,r:11,style:'swamp',b:[['armorer',-8,-7],['jeweler',3,-7],['general',-8,3,{trainer:'cooking'}],['house',4,4]]},
].map(wsc);
const ENTRANCES=[
  {id:'d_web',kind:'dungeon',name:'The Webbed Hollow',x:95,y:150,lvl:[6,8]},
  {id:'d_frost',kind:'dungeon',name:'Frostfang Halls',x:58,y:32,lvl:[10,12]},
  {id:'d_tomb',kind:'dungeon',name:'Tomb of the Sun Kings',x:182,y:76,lvl:[15,17]},
  {id:'c_glimmer',kind:'cave',name:'Glimmerdeep',x:130,y:22,lvl:[8,11]},
  {id:'c_fungal',kind:'cave',name:'The Fungal Hollows',x:24,y:84,lvl:[12,15]},
].map(wsc);
function placeBuilding(list,doors,type,bx,by,opts,city){const shop=type!=='house',w=shop?4:3,d=shop?3:2;
  for(let y=-1;y<=d;y++)for(let x=-1;x<=w;x++)setT(bx+x,by+y,y===d||x<0||x===w||y<0?T.PATH:T.HOUSE);
  const b=Object.assign({id:(city?city.id:'x')+'_'+list.length,x:bx,y:by,w,d,type,shop:shop?type:null,style:city?city.style:'meadow',city:city?city.name:''},opts||{});
  b.door={x:(bx+w/2)*TILE,y:(by+d)*TILE+18};list.push(b);
  if(shop)doors.push({x:b.door.x,y:b.door.y,to:'int_'+b.id,label:SHOPS[type].name,building:b});return b}
function genOverworld(){MW=MH=OW;map=new Uint8Array(MW*MH);tvar=new Float32Array(MW*MH);bio=new Uint8Array(MW*MH);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const n=vnoise(x/13+50,y/13+50)*.65+vnoise(x/4.5+9,y/4.5+9)*.35,b=biomeOf(x,y),h=hash(x+999,y);let t=T.GRASS;
    bio[y*MW+x]=b;
    if(b===B.DESERT){if(n<.13)t=T.WATER;else if(h<.025)t=T.TREE}
    else if(b===B.SNOW){if(n<.24)t=T.WATER;else if(n>.6?h<.3:h<.04)t=T.TREE}
    else if(b===B.FOREST){if(n<.22)t=T.WATER;else if(n>.55?h<.34:h<.07)t=T.TREE}
    else if(b===B.SWAMP){if(n<.3)t=T.WATER;else if(n<.46)t=T.BOG;else if(n>.7?h<.3:h<.03)t=T.TREE}
    else{if(n<.27)t=T.WATER;else if(n>.66?h<.3:h<.035)t=T.TREE}
    if(Math.min(x,y,MW-1-x,MH-1-y)<3)t=T.TREE;map[y*MW+x]=t;tvar[y*MW+x]=hash(x,y+777)}
  clearing(CAMP,8,T.GRASS);clearing(BARROW,10,T.GRASS);clearing(DEN,7,T.GRASS);clearing(TROLL,8,T.GRASS);
  for(const c of CITIES)clearing(c,c.r,T.GRASS);for(const e of ENTRANCES)clearing(e,4,T.GRASS);
  for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){if(Math.hypot(dx,dy)<5.5&&hash(dx+CAMP.x,dy+CAMP.y)<.7)setT(CAMP.x+dx,CAMP.y+dy,T.DIRT);if(Math.hypot(dx,dy)<5&&hash(dx+DEN.x,dy+DEN.y+3)<.6)setT(DEN.x+dx,DEN.y+dy,T.DIRT)}
  for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){const d=Math.hypot(dx,dy);if(d<6&&hash(dx+TROLL.x,dy+TROLL.y)<.75)setT(TROLL.x+dx,TROLL.y+dy,T.STONE)}
  for(let dy=-8;dy<=8;dy++)for(let dx=-8;dx<=8;dx++){const d=Math.hypot(dx,dy);if(d<6.6)setT(BARROW.x+dx,BARROW.y+dy,T.STONE);else if(d<7.8)setT(BARROW.x+dx,BARROW.y+dy,T.WALL)}
  const R=(a,b)=>road(a,b);
  for(const c of CITIES)if(c.id!=='emberfall')R(VC,c);
  R(VC,CAMP);R(VC,DEN);R(VC,TROLL);R(CITIES[3],BARROW);R(VC,wtx(100,193));R(VC,wtx(7,96));R(VC,wtx(193,104));R(CITIES[1],wtx(78,7));
  R(DEN,ENTRANCES[0]);R(CITIES[1],ENTRANCES[1]);R(CITIES[2],ENTRANCES[2]);R(CAMP,ENTRANCES[3]);R(CITIES[3],ENTRANCES[4]);
  decor=[];buildings=[];const doors=[],lights=[];
  for(const c of CITIES){for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++)if(Math.hypot(x,y)<3.6)setT(c.x+x,c.y+y,T.PATH);
    for(const[type,dx,dy,o]of c.b)placeBuilding(buildings,doors,type,c.x+dx,c.y+dy,o,c);
    decor.push({k:'fire',x:(c.x+.5)*TILE,y:(c.y+.5)*TILE});for(const[lx,ly]of[[-4.5,-4.5],[4.5,-4.5],[-4.5,4.5],[4.5,4.5]])decor.push({k:'lamp',x:(c.x+lx+.5)*TILE,y:(c.y+ly+.5)*TILE});decor.push({k:'well',x:(c.x+(c.id==='emberfall'?3.5:2.5))*TILE,y:(c.y+(c.id==='emberfall'?2.5:-1.5))*TILE})}
  decor.push({k:'stall',x:(VC.x-1.5)*TILE,y:(VC.y-1.2)*TILE});
  for(const e of ENTRANCES){decor.push({k:e.kind==='dungeon'?'crypt':'cavemouth',x:(e.x+.5)*TILE,y:(e.y-.6)*TILE,name:e.name,lvl:e.lvl});doors.push({x:(e.x+.5)*TILE,y:(e.y+.6)*TILE,to:e.id,label:`${e.name} (level ${e.lvl[0]}–${e.lvl[1]})`})}
  const DK={0:['bush','bush','rock'],1:['snowrock','snowrock','bush'],2:['rock','skull','rock'],3:['shroom','web','bush'],4:['reeds','reeds','shroom']};
  for(let y=3;y<MH-3;y++)for(let x=3;x<MW-3;x++){const t=getT(x,y),h=hash(x+31,y+17),b=bio[y*MW+x];if((t===T.GRASS||t===T.BOG)&&h>(b===B.MEADOW?.975:.965)&&!CITIES.some(c=>Math.hypot(x-c.x,y-c.y)<c.r))decor.push({k:DK[b][Math.floor(hash(x,y+9)*3)],x:(x+.5)*TILE,y:(y+.6)*TILE,v:hash(x,y+3)})}
  for(let y=3;y<MH-3;y++)for(let x=3;x<MW-3;x++){if(getT(x,y)!==T.GRASS||hash(x+71,y+13)<.991||CITIES.some(c=>Math.hypot(x-c.x,y-c.y)<c.r+2))continue;const b=bio[y*MW+x];
    const g=isDeep(x,y,b)||b===B.SWAMP?3:b===B.SNOW||b===B.DESERT?2:1;decor.push({k:'herb',g:'herb'+g,x:(x+.5)*TILE,y:(y+.6)*TILE,v:hash(x,y+5)})}
  decor.push({k:'fire',x:(CAMP.x+.5)*TILE,y:(CAMP.y+.5)*TILE});
  for(const[dx,dy,c]of[[-3,-3,'#7a3b26'],[3,-3,'#6a5a3a'],[-4,2,'#5a4a2a'],[3,3,'#7a3b26'],[0,-5,'#6a5a3a']])decor.push({k:'tent',x:(CAMP.x+dx+.5)*TILE,y:(CAMP.y+dy+.5)*TILE,c});
  for(let i=0;i<9;i++){const a=i/9*TAU+.3,r=4.2+hash(i,9)*1.5;decor.push({k:'grave',x:(BARROW.x+.5+Math.cos(a)*r)*TILE,y:(BARROW.y+.5+Math.sin(a)*r)*TILE,v:hash(i,4)})}
  const ga=Math.atan2(CITIES[3].y-BARROW.y,CITIES[3].x-BARROW.x),gate=[];for(let r=6;r<=8.6;r+=.5)for(let w=-1.5;w<=1.5;w+=.5){const gx=Math.round(BARROW.x+Math.cos(ga)*r-Math.sin(ga)*w),gy=Math.round(BARROW.y+Math.sin(ga)*r+Math.cos(ga)*w);if(getT(gx,gy)===T.WALL&&!gate.includes(gy*MW+gx))gate.push(gy*MW+gx)}
  decor.push({k:'mound',x:(BARROW.x+.5)*TILE,y:(BARROW.y-1.5)*TILE});decor.push({k:'cave',x:(TROLL.x+.5)*TILE,y:(TROLL.y-3.5)*TILE});
  for(let i=0;i<7;i++){const a=i/7*TAU,r=3+hash(i,77)*2.5;decor.push({k:'bones',x:(DEN.x+.5+Math.cos(a)*r)*TILE,y:(DEN.y+.5+Math.sin(a)*r)*TILE})}
  return{id:'over',kind:'over',name:'The Westmark',MW,MH,map,tvar,bio,decor,buildings,doors,lights,npcs:[],dark:false,spawn:true,barrowGate:gate}}

// ---- Shop interiors
function genInterior(b){MW=14;MH=10;map=new Uint8Array(MW*MH).fill(T.WALL);tvar=new Float32Array(MW*MH);bio=new Uint8Array(MW*MH).fill(B.INDOOR);
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++)map[y*MW+x]=T.PLANK;for(let i=0;i<MW*MH;i++)tvar[i]=hash(i,b.x+b.y);
  map[(MH-1)*MW+7]=T.PLANK;for(let x=3;x<=10;x++)map[3*MW+x]=T.HOUSE;
  const S2=SHOPS[b.shop],dec=[{k:'counter',x:3*TILE,y:4*TILE,w:8*TILE}];
  const add=(k,x,y,o)=>dec.push(Object.assign({k,x:x*TILE,y:y*TILE},o));
  add('barrel',1.6,7.6);add('barrel',12.4,7.4);add('shelf',2,1.3);add('shelf',11,1.3);add('rug',7,6.2);
  if(b.shop==='smith'){add('anvil',11.5,5.8);add('forge',2.2,5.6);add('rack',11,1.6)}
  else if(b.shop==='armorer'){add('mannequin',11.6,5.4);add('mannequin',2.4,5.4);add('hides',11,1.4)}
  else if(b.shop==='jeweler'){add('crystalcase',11.4,5.6);add('crystalcase',2.6,5.6)}
  else if(b.shop==='stable'){add('hay',2.4,6);add('hay',11.6,6.2);add('saddle',11,1.6)}
  else{add('sacks',11.6,5.8);add('sacks',2.4,6)}
  const lights=b.shop==='smith'?[{x:2.2*TILE,y:5.6*TILE,r:200,glow:'rgba(255,120,40,.25)'}]:[];
  return{id:'int_'+b.id,kind:'interior',name:S2.name+(b.city?' · '+b.city:''),biome:B.INDOOR,MW,MH,map,tvar,bio,decor:dec,buildings:[],lights,
    doors:[{x:7.5*TILE,y:9.3*TILE,to:'over',tx:b.door.x,ty:b.door.y+26,label:'Leave'}],
    npcs:[{kind:'keeper',x:7*TILE,y:2.4*TILE,shop:b.shop,name:S2.keeper,building:b,look:KEEPER_LOOK[b.shop]}],
    start:{x:7.5*TILE,y:7.6*TILE},dark:false,warm:true,spawn:false,shopB:b}}

// ---- Dungeons: a fixed chain of rooms and corridors, with bosses in the last rooms
function genDungeon(e){const def=DUNGEONS[e.id],R=mulberry32(def.seed^WSEED);MW=MH=72;map=new Uint8Array(MW*MH).fill(T.WALL);tvar=new Float32Array(MW*MH);bio=new Uint8Array(MW*MH).fill(B.DUNGEON);
  for(let i=0;i<MW*MH;i++)tvar[i]=hash(i,def.seed);
  const rooms=[];let cx=9,cy=36;const nR=def.rooms;
  const carve=(x0,y0,x1,y1)=>{for(let y=Math.min(y0,y1);y<=Math.max(y0,y1);y++)for(let x=Math.min(x0,x1);x<=Math.max(x0,x1);x++)if(x>1&&y>1&&x<MW-2&&y<MH-2)map[y*MW+x]=T.STONE};
  for(let i=0;i<nR;i++){const big=i>=nR-def.bosses.length,w=(big?10:7)+Math.floor(R()*3),h=(big?8:6)+Math.floor(R()*3);
    const r={x:clamp(cx-Math.floor(w/2),3,MW-w-3),y:clamp(cy-Math.floor(h/2),3,MH-h-3),w,h};r.cx=r.x+Math.floor(w/2);r.cy=r.y+Math.floor(h/2);carve(r.x,r.y,r.x+w-1,r.y+h-1);
    if(rooms.length){const p=rooms[rooms.length-1];carve(p.cx,p.cy,r.cx,p.cy+1);carve(r.cx,p.cy,r.cx+1,r.cy)}rooms.push(r);
    cx=r.cx+13+Math.floor(R()*3);cy=clamp(r.cy+Math.floor((R()-.5)*26),10,MH-10);if(cx>MW-10){cx=r.cx;cy=r.cy>MH/2?r.cy-17:r.cy+17}}
  const dec=[],lights=[],spawns=[];
  for(const r of rooms){for(const tx of[r.x+1,r.x+r.w-2]){const wy=r.y-1;if(map[wy*MW+tx]===T.WALL){dec.push({k:'walltorch',x:(tx+.5)*TILE,y:(wy+1)*TILE-2});lights.push({x:(tx+.5)*TILE,y:(wy+1.2)*TILE,r:190,glow:'rgba(255,140,50,.2)'})}}
    for(let k=0;k<3;k++)dec.push({k:pick(def.decor),x:(r.x+.5+R()*(r.w-1))*TILE,y:(r.y+.5+R()*(r.h-1))*TILE,v:R()})}
  const first=rooms[0],L=def.lvl;
  for(let i=1;i<rooms.length-def.bosses.length;i++){const r=rooms[i];const n=3+Math.floor(R()*3);for(let k=0;k<n;k++)spawns.push({type:def.pool[Math.floor(R()*def.pool.length)],x:(r.x+1+R()*(r.w-2))*TILE,y:(r.y+1+R()*(r.h-2))*TILE,lvl:L[0]+Math.floor(R()*(L[1]-L[0]+1))})}
  def.bosses.forEach((bt,i)=>{const r=rooms[rooms.length-def.bosses.length+i];spawns.push({type:bt,x:(r.cx+.5)*TILE,y:(r.cy+.5)*TILE,lvl:L[1]+i,boss:i});
    for(let k=0;k<2;k++)spawns.push({type:def.pool[0],x:(r.cx+(k?2:-2))*TILE,y:(r.cy+1)*TILE,lvl:L[1]-1})});
  return{id:e.id,kind:'dungeon',name:e.name,biome:B.DUNGEON,MW,MH,map,tvar,bio,decor:dec,buildings:[],lights,dark:true,darkA:.9,spawn:false,def,ent:e,spawns,
    doors:[{x:(first.x+1.2)*TILE,y:(first.cy+.5)*TILE,to:'over',tx:(e.x+.5)*TILE,ty:(e.y+1.6)*TILE,label:'Leave the dungeon'}],npcs:[],
    start:{x:(first.x+2.6)*TILE,y:(first.cy+.5)*TILE}}}

// ---- Caves: open caverns lit by glowing crystals and fungi
function genCave(e){const def=CAVES[e.id],R=mulberry32(def.seed^WSEED);MW=MH=90;let m=new Uint8Array(MW*MH);
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++)m[y*MW+x]=(x<2||y<2||x>MW-3||y>MH-3||R()<.44)?1:0;
  for(let it=0;it<5;it++){const n=new Uint8Array(MW*MH);for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){let c=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)c+=m[(y+dy)*MW+x+dx];n[y*MW+x]=c>=5?1:0}
    for(let x=0;x<MW;x++){n[x]=1;n[(MH-1)*MW+x]=1}for(let y=0;y<MH;y++){n[y*MW]=1;n[y*MW+MW-1]=1}m=n}
  const sx=8,sy=45;for(let y=sy-3;y<=sy+3;y++)for(let x=sx-3;x<=sx+3;x++)m[y*MW+x]=0;
  // keep only the cavern connected to the entrance
  const seen=new Uint8Array(MW*MH),q=[sy*MW+sx];seen[q[0]]=1;for(let h=0;h<q.length;h++){const c=q[h];for(const d of[1,-1,MW,-MW]){const n=c+d;if(!seen[n]&&!m[n]){seen[n]=1;q.push(n)}}}
  map=new Uint8Array(MW*MH);tvar=new Float32Array(MW*MH);bio=new Uint8Array(MW*MH).fill(B.CAVE);
  for(let i=0;i<MW*MH;i++){map[i]=seen[i]?T.CAVE:T.ROCK;tvar[i]=hash(i,def.seed)}
  const dec=[],lights=[];
  for(const c of q){const x=c%MW,y=Math.floor(c/MW);if(Math.hypot(x-sx,y-sy)<5)continue;const h=hash(x*3,y*7+def.seed);
    if(h<.03){dec.push({k:def.glow,x:(x+.5)*TILE,y:(y+.6)*TILE,v:hash(x,y),col:def.color});lights.push({x:(x+.5)*TILE,y:(y+.5)*TILE,r:150+hash(y,x)*60,glow:def.glowCol})}
    else if(h<.06)dec.push({k:'stalag',x:(x+.5)*TILE,y:(y+.6)*TILE,v:hash(x,y)})}
  return{id:e.id,kind:'cave',name:e.name,biome:B.CAVE,MW,MH,map,tvar,bio,decor:dec,buildings:[],lights,dark:true,darkA:.88,spawn:{pool:def.pool,lvl:e.lvl},def,ent:e,
    doors:[{x:(sx-1.5)*TILE,y:(sy+.5)*TILE,to:'over',tx:(e.x+.5)*TILE,ty:(e.y+1.6)*TILE,label:'Back to the surface'}],npcs:[],start:{x:(sx+1)*TILE,y:(sy+.5)*TILE}}}
