// ================= Hints: waymarks and bards =================
// Signposts along the roads and a bard in every city drop vague clues about what lies ahead,
// so the player explores instead of following an arrow everywhere.
const SIGNS=[
  {x:101,y:120,t:'South ⟶ The Gloomwood.\nWebs drift on the wind there, and the old wolf den is full of bones. Mind the fang.'},
  {x:99,y:82,t:'North ⟶ Frosthold.\nPast the town the snow never melts, and something old sleeps under the ice in the far north-west.'},
  {x:120,y:102,t:'East ⟶ Sunreach.\nThe sun burns hottest over the tombs of forgotten kings.'},
  {x:82,y:99,t:'West ⟶ Mirewatch.\nThe bog glows at night. Some say the light comes from below the roots.'},
  {x:111,y:52,t:'Turn back, traveller.\nDrums in the high pass. Goblins do not share their camp.'},
  {x:128,y:32,t:'The miners dug too deep.\nNow the stones sing, and shine blue in the dark.'},
  {x:52,y:140,t:'Here lie the old kings. Let them sleep.\n(Someone has scratched underneath: "they don\'t")'},
  {x:32,y:90,t:'Do not breathe the spores below the roots.\nThe mushrooms down there move.'},
  {x:97,y:144,t:'Silk thicker than rope hangs in the hollow ahead.\nWhatever spun it was very, very big.'},
  {x:172,y:82,t:'Three crowns. Three coffins. One sun.\nThe tomb remembers who stole from it.'},
  {x:146,y:91,t:'Sunreach stables ⟶\nStrider birds faster than any horse. Dragons? Only for fools and kings.'},
  {x:105,y:96,t:'Emberfall stable ⟶\nCows and horses for hire. Ride, don\'t walk.'},
  {x:165,y:118,t:'Canyon caves ahead.\nThe ground shakes when the old troll turns in his sleep.'}];
const RUMORS=[
  {l:[1,5],t:'They say a wolf the size of a pony lairs where the south road ends. Grey as ash, and twice as mean.'},
  {l:[3,9],t:'Woodcutters swear there\'s a hollow under the Gloomwood, thick with silk. Treasure too, if you live long enough to find it.'},
  {l:[1,8],t:'Caves and crypts are black as pitch. A torch from any General Store is worth its weight in gold.'},
  {l:[3,12],t:'Old Garrick at the Emberfall stable sells cows you can ride. Laugh all you like, it beats walking.'},
  {l:[6,13],t:'Frosthold\'s smith says the dwarf halls in the far north-west are full of ice, wolves and a frozen king.'},
  {l:[7,14],t:'Miners up north found a cave where the rocks glow blue. Most of them came back. Most.'},
  {l:[9,17],t:'Out past Sunreach, among the dunes, there\'s a tomb with three thrones. The Sun King keeps his gold close.'},
  {l:[10,20],t:'The Sunreach stable breeds giant running birds, and, they whisper, a dragon or two for a king\'s ransom.'},
  {l:[11,18],t:'West of Mirewatch the bog\'s roots hide hollows full of glowing mushrooms. Breathe shallow down there.'},
  {l:[1,20],t:'Each craft has its master in one city only. Steel is taught in Emberfall, leather up in Frosthold, and the art of enchanting in sunny Sunreach.'},
  {l:[1,20],t:'A crafter is only as good as their silk and hide. The finest grades come from the biggest beasts.'},
  {l:[12,20],t:'Go far enough past any road and the land turns wild. The edges of the world crawl with giants: spiders as big as carts, wolves as dark as night.'},
  {l:[8,20],t:'The bosses deep in the dungeons guard gear made for heroes like you. The finest pieces are rare, so keep going back.'},
  {l:[1,20],t:'Use a weapon long enough and your hands learn it. The same goes for spells.'}];
const BARD_NAMES={emberfall:'Wren the Bard',frosthold:'Old Haldor',sunreach:'Samira the Storyteller',mirewatch:'Fenwick the Wanderer'};
function snapToRoad(x,y){let best=null,bd=1e9;for(let dy=-7;dy<=7;dy++)for(let dx=-7;dx<=7;dx++){if(getT(x+dx,y+dy)!==T.PATH)continue;const d=Math.hypot(dx,dy);if(d<bd){bd=d;best={x:x+dx,y:y+dy}}}
  if(!best)return{x,y};for(const[ox,oy]of[[1,0],[-1,0],[0,1],[0,-1]])if(getT(best.x+ox,best.y+oy)===T.GRASS)return{x:best.x+ox,y:best.y+oy};return best}
function addHints(z){z.signs=SIGNS.map(s=>{const q=snapToRoad(Math.round(s.x*WS),Math.round(s.y*WS));return{x:(q.x+.5)*TILE,y:(q.y+.5)*TILE,t:s.t}});for(const s of z.signs)z.decor.push({k:'sign',x:s.x,y:s.y});
  for(const c of CITIES)z.npcs.push({kind:'bard',x:(c.x+3.5)*TILE,y:(c.y+2.2)*TILE,name:BARD_NAMES[c.id],look:{skin:'#e3c3a0',hair:'#6b4423',cloth:'#6a2a5a'}})}
function showNote(title,who,text){dialogOpen=true;mouse.l=false;$('dialog').classList.remove('hidden');$('dTitle').textContent=title;$('dWho').textContent=who;$('dText').innerHTML=text.replace(/\n/g,'<br>');$('dGoal').textContent='';
  const btns=$('dBtns');btns.innerHTML='';const b=document.createElement('button');b.className='btn primary';b.textContent='Farewell';b.onclick=closeDialog;btns.appendChild(b);sfx('click')}
function readSign(s){showNote('A weathered waymark','Carved into the wood',s.t)}
function bardTalk(n){const p=players[0],pool=RUMORS.filter(r=>p.level>=r.l[0]&&p.level<=r.l[1]),pick2=pool.sort(()=>Math.random()-.5).slice(0,2);
  showNote('Tales from the road',n.name,pick2.map(r=>'“'+r.t+'”').join('\n\n'))}
function signUnderMouse(){if(!zone.signs)return null;const p=players[0];for(const s of zone.signs){const[sx,sy]=S(s.x,s.y);if(Math.hypot(mouse.x-sx,mouse.y-(sy-30))<30&&p&&dist(p,s)<420)return s}return null}
