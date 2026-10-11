// ================= Home city, teleport and the death penalty =================
const HEARTH_CAST=3,HEARTH_CD=120;
const INNKEEPERS={emberfall:'Marta of the Ember Inn',frosthold:'Bjorn of the Frozen Hearth',sunreach:'Yusuf of the Oasis Rest',mirewatch:'Old Nell of the Lantern'};
function homeCity(p){return CITIES.find(c=>c.id===(p.home||'emberfall'))||CITIES[0]}
function homeSpot(p){const c=homeCity(p);return{x:(c.x+.5)*TILE,y:(c.y+2.5)*TILE}}
function addInnkeepers(z){for(const c of CITIES)z.npcs.push({kind:'innkeeper',city:c.id,x:(c.x-3.5)*TILE,y:(c.y+2.4)*TILE,name:INNKEEPERS[c.id],look:{skin:'#f1c9a5',hair:'#d8d4cc',cloth:'#3a5a7a'}})}
function innTalk(n){const p=players[0],c=CITIES.find(c=>c.id===n.city),isHome=(p.home||'emberfall')===c.id;
  showNote(c.name+' Inn',n.name,isHome?`Welcome back! ${c.name} is your home. Use your Hearthstone (H) to return here from anywhere in the world.`:`A warm bed and a hot meal, traveller. Make ${c.name} your home, and your Hearthstone (H) will carry you back here. You will also wake here if you fall.\n\nYour home is now ${homeCity(p).name}.`);
  if(!isHome){const b=document.createElement('button');b.className='btn primary';b.textContent=`Make ${c.name} my home`;b.onclick=()=>{p.home=c.id;sfx('quest');toast(`${c.name} is now your home.`,'gold');closeDialog();save()};$('dBtns').prepend(b)}}
function startHearth(p){if(p.dead)return;if(p.hearthCd>time){toast(`Your Hearthstone is recharging (${Math.ceil(p.hearthCd-time)} s).`);return}
  if(p.hearthCast>0){p.hearthCast=0;return}if(p.mounted)dismount(p,true);p.hearthCast=HEARTH_CAST;sfx('blink')}
function updateHearth(p,dt,moving){if(!(p.hearthCast>0))return;if(moving){p.hearthCast=0;toast('Teleport cancelled. Stand still while it charges.');return}
  p.hearthCast-=dt;if(Math.random()<.5)parts.push({x:p.x+rand(-14,14),y:p.y+rand(-6,6),z:2,vx:0,vy:0,vz:rand(40,90),life:.8,max:.8,col:'#9fd8ff',size:2.5,ng:true});
  if(p.hearthCast<=0){p.hearthCast=0;p.hearthCd=time+HEARTH_CD;const s=homeSpot(p);burst(p.x,p.y,'#9fd8ff',30,160);if(zone.id!=='over')enterZone('over',s.x,s.y);else{p.x=s.x;p.y=s.y;for(const a of allies){a.x=s.x+rand(-30,30);a.y=s.y+rand(-20,20)}}
    burst(p.x,p.y,'#9fd8ff',30,160);sfx('spec');toast('You arrive home in '+homeCity(p).name+'.','gold')}}
// Dying costs 10% of the current level's experience (and can drop you a level) plus 10% of your weapon skill.
// Dying costs half a level of experience (you can drop a level) and 10% of your weapon skill.
const DEATH_XP=.5;
function deathPenalty(p){const need=xpNeed(p.level);let pct=p.xp/need-DEATH_XP,msg=`You lost ${DEATH_XP*100}% of a level's experience`;
  if(pct<0&&p.level>1){p.level--;pct+=1;msg=`You dropped to level ${p.level}`;levelDownPoints(p)}
  p.xp=Math.max(0,Math.round(Math.max(0,pct)*xpNeed(p.level)));
  const wt=wtypeOf(p),s=skillOf(p,wt);if(s>1){const loss=Math.max(1,Math.round(s*.1));p.skills[wt]=Math.max(1,s-loss);msg+=` and ${loss} ${SKILL_NAME[wt]} skill`}
  calcStats(p);buildAbar(p);setTimeout(()=>toast(msg+'.','danger'),300)}
function levelDownPoints(p){// take back the points that level gave
  for(let k=0;k<2;k++){if(p.points>0){p.points--;continue}const a=Object.entries(p.attr).sort((x,y)=>y[1]-x[1])[0];if(a&&a[1]>0)p.attr[a[0]]--}
  if(p.tpoints>0){p.tpoints--;return}
  const tr=[...trees(p)].reverse();for(const t of tr)for(const n of[...t.t].reverse())if(p.talents[n.id]){p.talents[n.id]--;if(!p.talents[n.id])delete p.talents[n.id];return}}
