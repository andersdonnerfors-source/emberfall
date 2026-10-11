// ================= World seeds: every hero has a world of their own =================
// The four regions (Frostfells, Sunscar, Gloomwood, Mirefen) sit in wedges around Emberfall. A world seed shuffles
// their order, turns the whole map and varies each wedge's size. Every fixed place (cities, dungeons, camps, quest
// sites, signposts) keeps its region and distance, so the story still flows outward from Emberfall.
// Seed 0 is the original hand-made layout (heroes made before seeds keep their world).
const OLD_WEDGE={1:[-150,110],2:[-40,90],3:[50,68],4:[118,92]};// region: [start angle, width] in degrees (screen y points down)
let WEDGE=OLD_WEDGE;
function inWedge(a,w){return((a-w[0])%360+360)%360<w[1]}
function wedgeOfOld(a){for(const b of[1,2,3,4])if(inWedge(a,OLD_WEDGE[b]))return b;return 4}
// Moves a point given on the original 200-tile plan into this world's layout (returns tile coordinates).
function wtx(bx,by){const dx=bx-100,dy=by-100,d=Math.hypot(dx,dy);if(d<.01)return{x:Math.round(100*WS),y:Math.round(100*WS)};
  const a=Math.atan2(dy,dx)*180/Math.PI,b=wedgeOfOld(a),o=OLD_WEDGE[b],n=WEDGE[b],f=(((a-o[0])%360+360)%360)/o[1],na=(n[0]+f*n[1])*Math.PI/180,j=WSEED?1+(hash(Math.round(bx),Math.round(by)*7)-.5)*.12:1;
  return{x:Math.round((100+Math.cos(na)*d*j)*WS),y:Math.round((100+Math.sin(na)*d*j)*WS)}}
function layoutWorld(seed){WSEED=seed|0;
  if(!WSEED)WEDGE=OLD_WEDGE;
  else{const r=mulberry32(WSEED*7919+13),order=[1,2,3,4].sort(()=>r()-.5),w={1:110,2:90,3:68,4:92};let tot=0;for(const b of order){w[b]*=.85+r()*.3;tot+=w[b]}
    let a=r()*360;WEDGE={};for(const b of order){const ww=w[b]*360/tot;WEDGE[b]=[a,ww];a+=ww}}
  const seen=new Set(),places=[CAMP,BARROW,DEN,TROLL,...CITIES,...ENTRANCES,...QUESTS.map(q=>q.site).filter(Boolean)];
  for(const o of places){if(seen.has(o))continue;seen.add(o);Object.assign(o,wtx(o._bx,o._by))}
  for(const q of QUESTS){q._t=q._t||{text:q.text,wait:q.wait,done:q.done,goal:q.goal};for(const k in q._t)q[k]=fillDir(q._t[k])}
  for(const s of SIGNS){s._t=s._t||s.t;s.t=fillDir(s._t)}for(const r of RUMORS){r._t=r._t||r.t;r.t=fillDir(r._t)}}
// Direction words in texts follow the layout: {forest} becomes "south" in one world and "north-east" in another.
function dirWord(a){return['east','south-east','south','south-west','west','north-west','north','north-east'][Math.round(((a%360)+360)%360/45)%8]}
function angTo(from,to){return Math.atan2(to.y-from.y,to.x-from.x)*180/Math.PI}
function fillDir(s){const ent=id=>ENTRANCES.find(e=>e.id===id),city=id=>CITIES.find(c=>c.id===id),mid=b=>WEDGE[b][0]+WEDGE[b][1]/2;
  const T={snow:mid(1),desert:mid(2),forest:mid(3),swamp:mid(4),barrow:angTo(VC,BARROW),troll:angTo(VC,TROLL),dfrost:angTo(VC,ent('d_frost')),glimmer:angTo(VC,ent('c_glimmer')),
    frosthold:angTo(VC,city('frosthold')),sunreach:angTo(VC,city('sunreach')),mirewatch:angTo(VC,city('mirewatch')),fungal:angTo(city('mirewatch'),ent('c_fungal'))};
  return s.replace(/\{(\w+)\}/g,(m,k)=>{const a=T[k.toLowerCase()];if(a==null)return m;const w=dirWord(a);return k[0]===k[0].toUpperCase()?w[0].toUpperCase()+w.slice(1):w})}
// Builds the overworld for a seed (only when it differs from the one already built).
let builtSeed=null;
function ensureWorld(seed){seed=seed|0;if(builtSeed===seed&&zones.over)return;layoutWorld(seed);for(const k in zones)delete zones[k];
  zones.over=genOverworld();addHints(zones.over);addInnkeepers(zones.over);useZone(zones.over);zones.over.terrain=genTerrain();useZone(zones.over);builtSeed=seed}
function newWorldSeed(){return 1+Math.floor(Math.random()*2147483646)}
