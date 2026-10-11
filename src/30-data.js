// ================= Data =================
const CLASSES={
  paladin:{name:'Paladin',icon:'🛡️',desc:'A holy knight. Tough and steady, fights up close and heals.',hp:150,mana:90,armor:22,speed:165,dmg:15,hat:'helm',weapon:'sword',shield:true},
  sorcerer:{name:'Sorcerer',icon:'🔥',desc:'Master of fire and frost. Fragile, but devastating at range.',hp:100,mana:150,armor:8,speed:172,dmg:13,hat:'pointy',weapon:'staff',robe:true,orb:'#ff9a3a'},
  hunter:{name:'Hunter',icon:'🏹',desc:'Swift ranger of the wilds. Arrows, traps and a loyal wolf.',hp:108,mana:110,armor:10,speed:188,dmg:12,hat:'hood',weapon:'bow'},
  necromancer:{name:'Necromancer',icon:'💀',desc:'Commands the dead. Raises skeletons, curses foes, drains life.',hp:96,mana:135,armor:7,speed:168,dmg:11,hat:'hood',weapon:'skullstaff',robe:true,darkHood:true,orb:'#7dff9a'},
};
const UNLOCK=[1,1,3,5,7,10];
const ang=(p,tx,ty)=>Math.atan2(ty-p.y,tx-p.x);
const ABIL={
  paladin:[
    {name:'Crusader Strike',icon:'⚔️',cd:.55,mana:0,desc:'Swing your sword in a wide arc.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);melee(p,a,80,1.8,p.stats.dmg,{});swing(p,a,'#fff2c0',80)}},
    {name:'Shield Bash',icon:'🛡️',cd:6,mana:15,desc:'Bash enemies in front of you, stunning them for 1.5 s.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);melee(p,a,88,1.3,p.stats.dmg*1.3,{stun:1.5,knock:70});swing(p,a,'#9fd0ff',88)}},
    {name:'Holy Light',icon:'✨',cd:10,mana:30,desc:'Heal yourself and nearby allies for 35% of their health.',cast:p=>{for(const q of friendlies())if(dist(p,q)<220)heal(q,q.maxHp*.35*(p.healMult||1));burst(p.x,p.y,'#ffe9a0',34,170)}},
    {name:'Consecration',icon:'🔆',cd:12,mana:35,desc:'Sanctify the ground around you, burning enemies for 5 s.',cast:p=>{areas.push(mkArea({x:p.x,y:p.y,r:115,dur:5,tick:.5,tickDmg:p.stats.dmg*.5,side:'player',src:p,kind:'holy'}))}},
    {name:'Divine Shield',icon:'🌟',cd:30,mana:40,desc:'Become immune to all damage for 3 s.',cast:p=>{p.invulnUntil=time+3;burst(p.x,p.y,'#fff6c8',26,130)}},
  ],
  sorcerer:[
    {name:'Fire Bolt',icon:'🔥',cd:.45,mana:0,desc:'Hurl a bolt of fire toward the cursor.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*540,vy:Math.sin(a)*540,dmg:p.stats.dmg,col:'#ff8a2a',r:7,life:1.3,kind:'orb'})}},
    {name:'Frost Nova',icon:'❄️',cd:8,mana:25,desc:'Blast frost around you, damaging and slowing enemies.',cast:p=>{for(const e of inRadius(enemies,p.x,p.y,145))dealDamage(e,p.stats.dmg*.9,p,{slow:3,slowF:.4});fx.push({k:'ring',x:p.x,y:p.y,r:145,life:.4,max:.4,col:'#bfe6ff'});burst(p.x,p.y,'#cfefff',36,260)}},
    {name:'Blink',icon:'💨',cd:7,mana:20,desc:'Teleport a short distance toward the cursor.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);let d=Math.min(240,Math.hypot(tx-p.x,ty-p.y)),nx=p.x,ny=p.y,ok=false;for(;d>8;d-=8){nx=p.x+Math.cos(a)*d;ny=p.y+Math.sin(a)*d;if(free(nx,ny,p.r)){ok=true;break}}if(!ok)return false;burst(p.x,p.y,'#a8d8ff',20,110);p.x=nx;p.y=ny;burst(p.x,p.y,'#a8d8ff',20,110)}},
    {name:'Fireball',icon:'☄️',cd:6,mana:30,desc:'A slow fireball that explodes, burning everything nearby.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty),d=clamp(Math.hypot(tx-p.x,ty-p.y),60,650);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*430,vy:Math.sin(a)*430,dmg:p.stats.dmg*.4,col:'#ff5a1a',r:11,life:d/430,kind:'orb',explode:{r:95,dmg:p.stats.dmg*1.7}})}},
    {name:'Meteor',icon:'🌠',cd:20,mana:50,desc:'Call down a meteor at the cursor, then burning ground.',cast:(p,tx,ty)=>{areas.push(mkArea({x:tx,y:ty,r:120,delay:1,burst:{dmg:p.stats.dmg*4.2},dur:3,tick:.5,tickDmg:p.stats.dmg*.35,side:'player',src:p,kind:'meteor',onBurst:a=>{shake=12;sfx('boom');burst(a.x,a.y,'#ff8a2a',60,320)}}))}},
  ],
  hunter:[
    {name:'Arrow Shot',icon:'🏹',cd:.5,mana:0,desc:'Loose a fast arrow toward the cursor.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*720,vy:Math.sin(a)*720,dmg:p.stats.dmg,col:'#e8dcc0',r:5,life:1,kind:'arrow'})}},
    {name:'Multi-Shot',icon:'🎯',cd:6,mana:20,desc:'Fire five arrows in a cone.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);for(let i=-2;i<=2;i++){const b=a+i*.14;fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(b)*700,vy:Math.sin(b)*700,dmg:p.stats.dmg*.85,col:'#e8dcc0',r:5,life:.9,kind:'arrow'})}}},
    {name:'Snare Trap',icon:'🪤',cd:10,mana:20,desc:'Place a trap. It bursts when an enemy steps on it, rooting foes for 2 s.',cast:(p,tx,ty)=>{let a=ang(p,tx,ty),d=Math.min(300,Math.hypot(tx-p.x,ty-p.y));areas.push(mkArea({x:p.x+Math.cos(a)*d,y:p.y+Math.sin(a)*d,r:40,dur:20,side:'player',src:p,kind:'trap',trapDmg:p.stats.dmg*1.6}))}},
    {name:'Call Wolf',icon:'🐺',cd:25,mana:35,desc:'Summon a wolf companion that fights for 30 s.',cast:p=>{for(const a of allies)if(a.owner===p&&a.kind==='wolf'&&!a.temp)a.until=0;summon(p,'wolf',p.x+20,p.y+10,30)}},
    {name:'Rain of Arrows',icon:'🌧️',cd:16,mana:45,desc:'Arrows rain down on an area for 3 s.',cast:(p,tx,ty)=>{areas.push(mkArea({x:tx,y:ty,r:120,dur:3,tick:.3,tickDmg:p.stats.dmg*.5,side:'player',src:p,kind:'rain'}))}},
  ],
  necromancer:[
    {name:'Shadow Bolt',icon:'🟣',cd:.55,mana:0,desc:'A bolt of shadow toward the cursor.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*490,vy:Math.sin(a)*490,dmg:p.stats.dmg*1.05,col:'#b06aff',r:7,life:1.3,kind:'orb'})}},
    {name:'Raise Skeleton',icon:'💀',cd:4,mana:25,desc:'Raise a skeleton warrior (up to 3) for 40 s.',cast:(p,tx,ty)=>{const sk=allies.filter(a=>a.owner===p&&a.kind==='skeleton'&&!a.temp);if(sk.length>=3+(p.tm.skel||0))sk[0].until=0;let a=ang(p,tx,ty),d=Math.min(140,Math.hypot(tx-p.x,ty-p.y)),x=p.x+Math.cos(a)*d,y=p.y+Math.sin(a)*d;if(!free(x,y,13)){x=p.x;y=p.y}summon(p,'skeleton',x,y,40)}},
    {name:'Life Drain',icon:'🩸',cd:5,mana:20,desc:'A bolt that steals life from its target.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*520,vy:Math.sin(a)*520,dmg:p.stats.dmg*1.5,col:'#e0304a',r:8,life:1.2,kind:'orb',fx:{lifesteal:.6}})}},
    {name:'Curse of Frailty',icon:'🕯️',cd:12,mana:30,desc:'Curse an area: enemies take 40% more damage and are slowed for 6 s.',cast:(p,tx,ty)=>{for(const e of inRadius(enemies,tx,ty,130)){e.cursedUntil=time+6;e.slowUntil=time+6;e.slowF=.7}areas.push(mkArea({x:tx,y:ty,r:130,dur:1,side:'player',src:p,kind:'curse'}));burst(tx,ty,'#b06aff',30,160)}},
    {name:'Bone Storm',icon:'🦴',cd:18,mana:45,desc:'A storm of bones whirls around you for 4 s.',cast:p=>{areas.push(mkArea({x:p.x,y:p.y,r:120,dur:4,tick:.3,tickDmg:p.stats.dmg*.55,side:'player',src:p,kind:'bones',follow:p}))}},
  ],
};
// ---- Talents & specializations
// Talent mods: aN = +% damage of ability N, cN = −seconds cooldown, mN = −% mana cost (N=5 is the specialization ability).
// dmg/crit/hpPct/armorPct/speed/mregen/cdr/heal/pet/leech/skel = general bonuses. `req` = points needed in that tree first.
// Levels 2–9 feed the class tree; at level 10 you pick one of three specializations, each with its own tree,
// a passive bonus and a signature ability (key R).
const SPEC_LEVEL=10;
const TAL={
  paladin:{core:{b:'Paladin',t:[
      {id:'pc1',n:'Might of the Light',d:'Crusader Strike deals +8% damage per rank.',max:3,m:{a0:.08}},
      {id:'pc2',n:'Fortitude',d:'+5% health per rank.',max:3,m:{hpPct:.05}},
      {id:'pc3',n:'Devotion',d:'+10% mana regeneration per rank.',max:3,req:3,m:{mregen:.1}},
      {id:'pc4',n:'Swift Justice',d:'+2% cooldown reduction and +2% move speed per rank.',max:3,req:3,m:{cdr:.02,speed:.02}}]},
    specs:{
      retribution:{name:'Retribution',icon:'⚔️',desc:'A crusader of righteous fury. Big, sweeping melee damage.',passiveText:'+10% damage and +5% critical chance.',passive:{dmg:.1,crit:.05},
        ability:{name:'Divine Storm',icon:'🌪️',cd:10,mana:35,sfx:'storm',desc:'Spin with holy fury, striking every enemy around you hard.',cast:p=>{for(const e of inRadius(enemies,p.x,p.y,135))dealDamage(e,p.stats.dmg*2.2,p,{});for(let k=0;k<4;k++)swing(p,k*Math.PI/2,'#ffe08a',130);fx.push({k:'ring',x:p.x,y:p.y,r:135,life:.35,max:.35,col:'#ffe08a'});burst(p.x,p.y,'#ffe08a',30,220)}},
        tree:[{id:'pr1',n:'Sharpened Blade',d:'Crusader Strike deals +12% damage per rank.',max:3,m:{a0:.12}},
          {id:'pr2',n:'Zeal',d:'+2% critical chance per rank.',max:3,m:{crit:.02}},
          {id:'pr3',n:'Avenging Fury',d:'+10% damage with all abilities.',max:1,req:3,m:{dmg:.1}},
          {id:'pr4',n:'Tempest',d:'Divine Storm: +15% damage and −1 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1}},
          {id:'pr5',n:'Wrath of the Light',d:'+12% damage and +5% critical chance.',max:1,req:7,m:{dmg:.12,crit:.05}}]},
      protection:{name:'Protection',icon:'🛡️',desc:'An unbreakable wall. Shrugs off blows and stuns foes.',passiveText:'+20% armor and +10% health.',passive:{armorPct:.2,hpPct:.1},
        ability:{name:"Avenger's Shield",icon:'🥏',cd:9,mana:30,sfx:'shield',desc:'Hurl your shield. It cuts through up to 3 enemies and stuns them.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*560,vy:Math.sin(a)*560,dmg:p.stats.dmg*1.8,col:'#cfe8ff',r:10,life:1,kind:'shield',pierce:3,fx:{stun:1}})}},
        tree:[{id:'pp1',n:'Bulwark',d:'+10% armor per rank.',max:3,m:{armorPct:.1}},
          {id:'pp2',n:'Shield Mastery',d:'Shield Bash: +15% damage and −1 s cooldown per rank.',max:3,m:{a1:.15,c1:1}},
          {id:'pp3',n:"Guardian's Grace",d:'+10% health. Divine Shield cooldown −10 s.',max:1,req:3,m:{hpPct:.1,c4:10}},
          {id:'pp4',n:'Righteous Shield',d:"Avenger's Shield: +15% damage and −1 s cooldown per rank.",max:3,req:4,m:{a5:.15,c5:1}},
          {id:'pp5',n:'Bastion',d:'+15% health and +20% armor.',max:1,req:7,m:{hpPct:.15,armorPct:.2}}]},
      holy:{name:'Holy',icon:'✨',desc:'A healer touched by the light. Outlasts anything.',passiveText:'Heals 25% more and +20% mana regeneration.',passive:{heal:.25,mregen:.2},
        ability:{name:"Light's Hammer",icon:'🔨',cd:14,mana:40,sfx:'holy',desc:'Drop a hammer of light: for 4 s it burns enemies and heals allies standing in it.',cast:(p,tx,ty)=>{areas.push(mkArea({x:tx,y:ty,r:120,dur:4,tick:.5,tickDmg:p.stats.dmg*.55,healTick:p.maxHp*.03*(p.healMult||1),side:'player',src:p,kind:'holy'}));burst(tx,ty,'#fff1b0',30,200)}},
        tree:[{id:'ph1',n:'Radiance',d:'Holy Light heals 12% more per rank.',max:3,m:{heal:.12}},
          {id:'ph2',n:'Hallowed Ground',d:'Consecration deals +15% damage per rank.',max:3,m:{a3:.15}},
          {id:'ph3',n:'Blessed Spirit',d:'+30% mana regeneration. Holy Light cooldown −3 s.',max:1,req:3,m:{mregen:.3,c2:3}},
          {id:'ph4',n:'Hammer of Dawn',d:"Light's Hammer: +20% damage and −1.5 s cooldown per rank.",max:3,req:4,m:{a5:.2,c5:1.5}},
          {id:'ph5',n:'Saint',d:'Heals 30% more and +10% damage.',max:1,req:7,m:{heal:.3,dmg:.1}}]}}},
  sorcerer:{core:{b:'Sorcerer',t:[
      {id:'sc1',n:'Kindling',d:'Fire Bolt deals +8% damage per rank.',max:3,m:{a0:.08}},
      {id:'sc2',n:'Mana Font',d:'+10% mana regeneration per rank.',max:3,m:{mregen:.1}},
      {id:'sc3',n:'Arcane Focus',d:'+2% critical chance per rank.',max:3,req:3,m:{crit:.02}},
      {id:'sc4',n:'Quickening',d:'+2% cooldown reduction per rank.',max:3,req:3,m:{cdr:.02}}]},
    specs:{
      fire:{name:'Fire',icon:'🔥',desc:'Pure destruction. Burns everything in sight.',passiveText:'Fire Bolt +10%, Fireball +15% and Meteor +15% damage.',passive:{a0:.1,a3:.15,a4:.15},
        ability:{name:'Inferno',icon:'🔥',cd:10,mana:40,sfx:'fire',desc:'Breathe a wide cone of seven fire bolts.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);for(let i=-3;i<=3;i++){const b=a+i*.12;fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(b)*520,vy:Math.sin(b)*520,dmg:p.stats.dmg*.9,col:'#ff7a1a',r:8,life:.8,kind:'orb'})}}},
        tree:[{id:'sf1',n:'Pyromania',d:'Fireball: +15% damage and −0.5 s cooldown per rank.',max:3,m:{a3:.15,c3:.5}},
          {id:'sf2',n:'Combustion',d:'+3% critical chance per rank.',max:3,m:{crit:.03}},
          {id:'sf3',n:'Cataclysm',d:'Meteor deals +40% damage. Cooldown −5 s.',max:1,req:3,m:{a4:.4,c4:5}},
          {id:'sf4',n:'Wildfire',d:'Inferno: +15% damage and −1 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1}},
          {id:'sf5',n:'Phoenix Heart',d:'+15% damage with all abilities.',max:1,req:7,m:{dmg:.15}}]},
      frost:{name:'Frost',icon:'❄️',desc:'Cold control. Slows, shields and outlasts.',passiveText:'+15% armor and +8% health.',passive:{armorPct:.15,hpPct:.08},
        ability:{name:'Blizzard',icon:'🌨️',cd:15,mana:45,sfx:'frost',desc:'A blizzard rages at the cursor for 6 s, freezing and slowing enemies.',cast:(p,tx,ty)=>{areas.push(mkArea({x:tx,y:ty,r:140,dur:6,tick:.4,tickDmg:p.stats.dmg*.45,tickFx:{slow:1,slowF:.45},side:'player',src:p,kind:'blizzard'}))}},
        tree:[{id:'sr1',n:'Biting Cold',d:'Frost Nova: +20% damage and −1 s cooldown per rank.',max:3,m:{a1:.2,c1:1}},
          {id:'sr2',n:'Ice Barrier',d:'+8% health and +10% armor per rank.',max:3,m:{hpPct:.08,armorPct:.1}},
          {id:'sr3',n:'Shatter',d:'+8% critical chance. Frost Nova costs 50% less mana.',max:1,req:3,m:{crit:.08,m1:.5}},
          {id:'sr4',n:'Deep Winter',d:'Blizzard: +15% damage and −1.5 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1.5}},
          {id:'sr5',n:'Glacial Heart',d:'+12% damage and +10% health.',max:1,req:7,m:{dmg:.12,hpPct:.1}}]},
      arcane:{name:'Arcane',icon:'✴️',desc:'Raw magic. Fast spells, short cooldowns.',passiveText:'+8% cooldown reduction and +20% mana regeneration.',passive:{cdr:.08,mregen:.2},
        ability:{name:'Arcane Barrage',icon:'✴️',cd:6,mana:30,sfx:'arcane',desc:'Fire six arcane missiles toward the cursor.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);for(let i=0;i<6;i++){const b=a+(i-2.5)*.08;fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(b)*(560+i*20),vy:Math.sin(b)*(560+i*20),dmg:p.stats.dmg*.75,col:'#c890ff',r:6,life:1.1,kind:'orb'})}}},
        tree:[{id:'sa1',n:'Blink Mastery',d:'Blink cooldown −1 s per rank.',max:3,m:{c2:1}},
          {id:'sa2',n:'Arcane Flow',d:'+10% mana regeneration and +2% cooldown reduction per rank.',max:3,m:{mregen:.1,cdr:.02}},
          {id:'sa3',n:'Archmage',d:'+12% damage with all abilities.',max:1,req:3,m:{dmg:.12}},
          {id:'sa4',n:'Barrage Mastery',d:'Arcane Barrage: +15% damage and −0.5 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:.5}},
          {id:'sa5',n:'Time Warp',d:'+10% cooldown reduction and +5% critical chance.',max:1,req:7,m:{cdr:.1,crit:.05}}]}}},
  hunter:{core:{b:'Hunter',t:[
      {id:'hc1',n:'Steady Aim',d:'Arrow Shot deals +8% damage per rank.',max:3,m:{a0:.08}},
      {id:'hc2',n:'Fleet Foot',d:'+3% move speed per rank.',max:3,m:{speed:.03}},
      {id:'hc3',n:'Keen Eye',d:'+2% critical chance per rank.',max:3,req:3,m:{crit:.02}},
      {id:'hc4',n:'Endurance',d:'+5% health per rank.',max:3,req:3,m:{hpPct:.05}}]},
    specs:{
      marksman:{name:'Marksmanship',icon:'🎯',desc:'A deadly shot from afar. Huge critical hits.',passiveText:'+6% critical chance and +10% Arrow Shot damage.',passive:{crit:.06,a0:.1},
        ability:{name:'Piercing Shot',icon:'🎯',cd:8,mana:30,sfx:'snipe',desc:'A mighty arrow that pierces through every enemy in a line.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*900,vy:Math.sin(a)*900,dmg:p.stats.dmg*3,col:'#fff0a0',r:8,life:1,kind:'arrow',pierce:10})}},
        tree:[{id:'hm1',n:'Volley',d:'Multi-Shot: +15% damage and −0.5 s cooldown per rank.',max:3,m:{a1:.15,c1:.5}},
          {id:'hm2',n:'Precision',d:'+2% critical chance per rank.',max:3,m:{crit:.02}},
          {id:'hm3',n:'Deadeye',d:'+6% critical chance. Rain of Arrows deals +30% damage.',max:1,req:3,m:{crit:.06,a4:.3}},
          {id:'hm4',n:'Penetrating Shots',d:'Piercing Shot: +15% damage and −1 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1}},
          {id:'hm5',n:'Sniper',d:'+15% damage with all abilities.',max:1,req:7,m:{dmg:.15}}]},
      survival:{name:'Survival',icon:'💥',desc:'Traps, explosives and toughness. Hard to pin down.',passiveText:'+6% move speed and +10% health.',passive:{speed:.06,hpPct:.1},
        ability:{name:'Explosive Volley',icon:'💥',cd:9,mana:35,sfx:'arrow',desc:'Fire three arrows that explode on impact.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty),d=clamp(Math.hypot(tx-p.x,ty-p.y),80,600);for(let i=-1;i<=1;i++){const b=a+i*.15;fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(b)*620,vy:Math.sin(b)*620,dmg:p.stats.dmg*.4,col:'#ffb060',r:6,life:d/620,kind:'arrow',explode:{r:75,dmg:p.stats.dmg*1.3}})}}},
        tree:[{id:'hs1',n:'Trapper',d:'Snare Trap: +20% damage and −1.5 s cooldown per rank.',max:3,m:{a2:.2,c2:1.5}},
          {id:'hs2',n:'Rugged',d:'+10% armor per rank.',max:3,m:{armorPct:.1}},
          {id:'hs3',n:'Hardy',d:'+15% health and +20% armor.',max:1,req:3,m:{hpPct:.15,armorPct:.2}},
          {id:'hs4',n:'Demolition',d:'Explosive Volley: +15% damage and −1 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1}},
          {id:'hs5',n:'Apex Survivor',d:'+10% damage, +5% move speed and +10% health.',max:1,req:7,m:{dmg:.1,speed:.05,hpPct:.1}}]},
      beast:{name:'Beast Mastery',icon:'🐺',desc:'Fight beside your wolves. The pack does the work.',passiveText:'Your wolves get +30% damage and health.',passive:{pet:.3},
        ability:{name:'Call of the Pack',icon:'🐾',cd:30,mana:45,sfx:'howl',desc:'Two more wolves join the hunt for 15 s.',cast:p=>{for(let i=0;i<2;i++)summon(p,'wolf',p.x+rand(-40,40),p.y+rand(-30,30),15,true)}},
        tree:[{id:'hb1',n:'Pack Bond',d:'Your wolves get +15% damage and health per rank.',max:3,m:{pet:.15}},
          {id:'hb2',n:'Feral Call',d:'Call Wolf cooldown −4 s per rank.',max:3,m:{c3:4}},
          {id:'hb3',n:'Alpha',d:'Wolves get +40% damage and health. Call Wolf costs 50% less mana.',max:1,req:3,m:{pet:.4,m3:.5}},
          {id:'hb4',n:'Pack Leader',d:'Call of the Pack: wolves +15% damage, cooldown −3 s per rank.',max:3,req:4,m:{a5:.15,c5:3}},
          {id:'hb5',n:'Beast Within',d:'Wolves +30% stronger and +10% damage for you.',max:1,req:7,m:{pet:.3,dmg:.1}}]}}},
  necromancer:{core:{b:'Necromancer',t:[
      {id:'nc1',n:'Dark Bolts',d:'Shadow Bolt deals +8% damage per rank.',max:3,m:{a0:.08}},
      {id:'nc2',n:'Grave Chill',d:'+8% armor per rank.',max:3,m:{armorPct:.08}},
      {id:'nc3',n:'Soul Siphon',d:'+10% mana regeneration per rank.',max:3,req:3,m:{mregen:.1}},
      {id:'nc4',n:'Dread',d:'+3% damage with all abilities per rank.',max:3,req:3,m:{dmg:.03}}]},
    specs:{
      shadow:{name:'Affliction',icon:'☠️',desc:'Curses and plagues. Your wounds feed you.',passiveText:'Heal for 4% of damage dealt. Life Drain +15%.',passive:{leech:.04,a2:.15},
        ability:{name:'Soul Plague',icon:'☠️',cd:14,mana:40,sfx:'shadow',desc:'A plague cloud at the cursor curses and rots enemies for 6 s.',cast:(p,tx,ty)=>{for(const e of inRadius(enemies,tx,ty,130)){e.cursedUntil=time+6}areas.push(mkArea({x:tx,y:ty,r:130,dur:6,tick:.5,tickDmg:p.stats.dmg*.6,side:'player',src:p,kind:'plague'}));burst(tx,ty,'#8aff6a',30,150)}},
        tree:[{id:'na1',n:'Hunger',d:'Life Drain: +15% damage and −0.5 s cooldown per rank.',max:3,m:{a2:.15,c2:.5}},
          {id:'na2',n:'Dark Pact',d:'Heal for +2% of damage dealt per rank.',max:3,m:{leech:.02}},
          {id:'na3',n:'Doom',d:'+12% damage with all abilities. Curse cooldown −4 s.',max:1,req:3,m:{dmg:.12,c3:4}},
          {id:'na4',n:'Pestilence',d:'Soul Plague: +15% damage and −1.5 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1.5}},
          {id:'na5',n:'Reaper',d:'+15% damage and +5% critical chance.',max:1,req:7,m:{dmg:.15,crit:.05}}]},
      bone:{name:'Bone',icon:'🦴',desc:'Armored in bone. Spears and storms of it.',passiveText:'+20% armor and +10% health.',passive:{armorPct:.2,hpPct:.1},
        ability:{name:'Bone Spear',icon:'🦴',cd:7,mana:30,sfx:'bone',desc:'Launch a spear of bone that pierces everything in a line.',cast:(p,tx,ty)=>{const a=ang(p,tx,ty);fireProj({side:'player',src:p,x:p.x,y:p.y,vx:Math.cos(a)*650,vy:Math.sin(a)*650,dmg:p.stats.dmg*2.6,col:'#ece6d4',r:9,life:1.1,kind:'arrow',pierce:8})}},
        tree:[{id:'nb1',n:'Bone Armor',d:'+8% health and +10% armor per rank.',max:3,m:{hpPct:.08,armorPct:.1}},
          {id:'nb2',n:'Bone Mastery',d:'Bone Storm: +15% damage and −1.5 s cooldown per rank.',max:3,m:{a4:.15,c4:1.5}},
          {id:'nb3',n:'Ossuary',d:'+8% critical chance. Bone Storm deals +30% damage.',max:1,req:3,m:{crit:.08,a4:.3}},
          {id:'nb4',n:'Splintering Spears',d:'Bone Spear: +15% damage and −1 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:1}},
          {id:'nb5',n:'Lord of Bones',d:'+12% damage and +20% armor.',max:1,req:7,m:{dmg:.12,armorPct:.2}}]},
      undeath:{name:'Undeath',icon:'⚰️',desc:'Master of the risen dead. An army at your back.',passiveText:'Skeletons +25% stronger, and you can raise one more.',passive:{pet:.25,skel:1},
        ability:{name:'Army of the Dead',icon:'⚰️',cd:35,mana:50,sfx:'summon',desc:'Raise four extra skeletons for 15 s.',cast:p=>{for(let i=0;i<4;i++){const a=i/4*TAU,x=p.x+Math.cos(a)*50,y=p.y+Math.sin(a)*50;summon(p,'skeleton',free(x,y,13)?x:p.x,free(x,y,13)?y:p.y,15,true)}}},
        tree:[{id:'nu1',n:'Grave Strength',d:'Skeletons get +15% damage and health per rank.',max:3,m:{pet:.15}},
          {id:'nu2',n:'Quick Rites',d:'Raise Skeleton: −0.6 s cooldown and −15% mana cost per rank.',max:3,m:{c1:.6,m1:.15}},
          {id:'nu3',n:'Lich Lord',d:'Skeletons +40% stronger. +20% mana regeneration.',max:1,req:3,m:{pet:.4,mregen:.2}},
          {id:'nu4',n:'Endless Legion',d:'Army of the Dead: +15% damage and −3 s cooldown per rank.',max:3,req:4,m:{a5:.15,c5:3}},
          {id:'nu5',n:'Death Lord',d:'Skeletons +30% stronger, and you can raise one more.',max:1,req:7,m:{pet:.3,skel:1}}]}}},
};
function specOf(p){return p.spec?TAL[p.cls].specs[p.spec]:null}
function trees(p){const r=[TAL[p.cls].core],s=specOf(p);if(s)r.push({b:s.name,t:s.tree});return r}
function treePts(p,tr){return tr.t.reduce((s,t)=>s+(p.talents[t.id]||0),0)}
function talentMods(p){const m={},add=(o,r)=>{for(const k in o)m[k]=(m[k]||0)+o[k]*r};for(const tr of trees(p))for(const t of tr.t){const r=p.talents[t.id]||0;if(r)add(t.m,r)}const s=specOf(p);if(s)add(s.passive,1);return m}
const SPEC_LOCKED={name:'Specialization',icon:'⭐',cd:1,mana:0,desc:'Reach level 10 and choose a specialization to unlock a signature ability.',cast:()=>false};
function abilList(p){const s=specOf(p);return[...ABIL[p.cls],s?s.ability:SPEC_LOCKED]}
function abilCost(p,i){return Math.round(p.abil[i].mana*(1-Math.min(.9,p.tm['m'+i]||0)))}
function abilCd(p,i){return Math.max(.3,p.abil[i].cd-(p.tm['c'+i]||0))*(i>0?1-p.stats.cdr:1-(p.stats.haste||0))}
const ETYPES={
  wolf:{name:'Grey Wolf',r:14,hp:28,dmg:5,speed:150,range:24,atkCd:.9,xp:12,h:30},
  goblin:{name:'Goblin',r:13,hp:42,dmg:7,speed:105,range:28,atkCd:1.1,xp:16,h:42},
  archer:{name:'Shade Archer',r:13,hp:34,dmg:8,speed:95,range:380,ranged:1,atkCd:1.8,xp:20,h:52},
  troll:{name:'Cave Troll',r:24,hp:150,dmg:20,speed:72,range:40,atkCd:2.4,windup:.6,xp:55,h:84},
  wight:{name:'Barrow Wight',r:14,hp:48,dmg:9,speed:118,range:28,atkCd:1,xp:24,h:52},
  frostwolf:{name:'Frost Wolf',r:15,hp:36,dmg:6,speed:155,range:24,atkCd:.9,xp:15,h:32,hitFx:{slow:1.5,slowF:.6}},
  icetroll:{name:'Ice Troll',r:24,hp:170,dmg:21,speed:70,range:40,atkCd:2.4,windup:.6,xp:60,h:84,big:1},
  scorpion:{name:'Dune Scorpion',r:16,hp:46,dmg:8,speed:115,range:28,atkCd:1.1,xp:18,h:30},
  wurm:{name:'Sand Wurm',r:22,hp:130,dmg:17,speed:60,range:38,atkCd:2,windup:.6,xp:50,h:60,big:1},
  raider:{name:'Dune Raider',r:13,hp:38,dmg:9,speed:100,range:380,ranged:1,atkCd:1.7,xp:20,h:52},
  spider:{name:'Gloom Spider',r:15,hp:40,dmg:7,speed:140,range:24,atkCd:1,xp:16,h:26,hitFx:{slow:1.2,slowF:.6}},
  beetle:{name:'Bog Beetle',r:16,hp:62,dmg:8,speed:85,range:26,atkCd:1.2,xp:18,h:24},
  mosquito:{name:'Mire Bloodfly',r:11,hp:18,dmg:4,speed:175,range:22,atkCd:.7,xp:10,h:40},
  lurker:{name:'Bog Lurker',r:24,hp:160,dmg:20,speed:72,range:40,atkCd:2.3,windup:.6,xp:58,h:84,big:1},
  greyfang:{name:'Old Greyfang',r:24,hp:700,dmg:14,speed:165,range:30,atkCd:1,xp:250,boss:1,h:50},
  skarg:{name:'Skarg the Goblin Warlord',r:22,hp:1100,dmg:17,speed:110,range:36,atkCd:1.2,xp:450,boss:1,h:70},
  mossback:{name:'Mossback the Troll',r:34,hp:1700,dmg:28,speed:70,range:50,atkCd:2.2,windup:.7,xp:800,boss:1,h:120},
  barrowking:{name:'The Barrow King',r:28,hp:1900,dmg:22,speed:85,range:48,atkCd:1.6,windup:.5,xp:1500,boss:1,h:96},
  cspider:{name:'Crystal Spider',r:15,hp:48,dmg:8,speed:135,range:24,atkCd:1,xp:18,h:26,hitFx:{slow:1.2,slowF:.6}},
  bat:{name:'Cave Bat',r:11,hp:22,dmg:5,speed:190,range:22,atkCd:.7,xp:12,h:38},
  golem:{name:'Crystal Golem',r:22,hp:180,dmg:20,speed:66,range:40,atkCd:2.2,windup:.6,xp:60,h:80,big:1},
  myconid:{name:'Myconid Spore-Caller',r:16,hp:70,dmg:9,speed:80,range:330,ranged:1,atkCd:2,xp:26,h:58,shot:'#a8ff6a'},
  sporeling:{name:'Sporeling',r:11,hp:26,dmg:6,speed:120,range:22,atkCd:1,xp:12,h:28},
  mummy:{name:'Tomb Mummy',r:14,hp:64,dmg:10,speed:92,range:28,atkCd:1.1,xp:26,h:52},
  venomfang:{name:'Venomfang',r:22,hp:900,dmg:16,speed:150,range:30,atkCd:1,xp:400,boss:1,h:40,pats:['charge','fan','charge'],shot:'#8aff6a'},
  broodmother:{name:'Broodmother Nyx',r:30,hp:1400,dmg:18,speed:100,range:34,atkCd:1.2,xp:700,boss:1,h:52,pats:['summon:spider','nova','slam'],shot:'#b0ff8a'},
  rimeclaw:{name:'Rimeclaw',r:24,hp:1300,dmg:20,speed:160,range:30,atkCd:1,xp:700,boss:1,h:50,pats:['charge','summon:frostwolf','nova'],shot:'#bfeaff'},
  halvar:{name:'King Halvar the Frozen',r:32,hp:2000,dmg:30,speed:75,range:50,atkCd:2,windup:.7,xp:1100,boss:1,h:120,pats:['slam','boulder','nova','enrage'],shot:'#bfeaff'},
  anubek:{name:'Anubek the Embalmer',r:22,hp:1900,dmg:24,speed:85,range:330,ranged:1,atkCd:1.6,xp:1100,boss:1,h:72,pats:['nova','summon:mummy','slam'],shot:'#ffd86a'},
  scarablord:{name:'The Scarab Swarmlord',r:30,hp:2300,dmg:28,speed:110,range:36,atkCd:1.3,xp:1300,boss:1,h:46,pats:['charge','summon:beetle','spin'],shot:'#ffd86a'},
  sunking:{name:'The Sun King',r:30,hp:3000,dmg:30,speed:85,range:48,atkCd:1.6,windup:.5,xp:2200,boss:1,h:100,pats:['slam','nova','summon:mummy','fan','enrage'],shot:'#ffcf4a'},
  webweaver:{name:'Webweaver',r:16,hp:60,dmg:10,speed:130,range:24,atkCd:1,xp:24,h:30,hitFx:{slow:1.4,slowF:.55}},
  giantspider:{name:'Giant Spider',r:26,hp:260,dmg:24,speed:120,range:34,atkCd:1.3,xp:90,h:44,big:1,elite:1,hitFx:{slow:1.6,slowF:.5}},
  direwolf:{name:'Dire Wolf',r:22,hp:220,dmg:22,speed:170,range:30,atkCd:1,xp:80,h:46,big:1,elite:1},
  obsidiangolem:{name:'Obsidian Golem',r:26,hp:320,dmg:30,speed:62,range:44,atkCd:2.2,windup:.6,xp:110,h:96,big:1,elite:1},
  ancientwraith:{name:'Ancient Wraith',r:18,hp:200,dmg:22,speed:115,range:330,ranged:1,atkCd:1.6,xp:95,h:70,big:1,elite:1,shot:'#9fe8ff'},
};
// The story: the Lamp of Emberfall kept the dead asleep. When the Barrow King woke, he shattered it and gave its
// three Ember Shards to his strongest servants. Each shard corrupts the land around it. Win them back, relight the lamp.
const QUESTS=[
  {title:'Wolves at the Door',goal:'Slay 6 grey wolves in the meadows around Emberfall',need:6,target:['wolf'],rec:1,reward:{xp:100,potions:2,rar:1},
   text:'Traveller, you come at an ill hour. Three nights ago the Lamp of Emberfall went dark, the old light that has kept our valley safe for a thousand years. Since then the grey wolves have grown bold and hungry. They prowl right up to our fences. Thin their numbers, and we will talk more.',
   wait:'The wolves still howl at night. They roam the meadows all around the village.',done:'Fewer howls tonight. You have a steady hand. Now hear the rest of it: the Lamp did not simply go out. Someone shattered it.'},
  {title:'Webs in the Gloomwood',goal:'Slay 8 gloom spiders in the Gloomwood to the south',need:8,target:['spider'],site:wsc({x:117,y:150}),rec:3,reward:{xp:250,potions:2,rar:1},
   text:'Our woodcutters will not go south any more. In the Gloomwood, webs now hang between the trees like grey curtains, and the spiders grow fat and bold. The forest has turned sick since the Lamp broke. Burn back the spiders and look for the cause.',
   wait:'The Gloomwood still crawls with spiders. Follow the south road.',done:'You saw it too? A cold glow, deep in the woods, near the old wolf den. I fear I know what it is. Sit, and I will tell you.'},
  {title:'Old Greyfang',goal:'Slay Old Greyfang in his den in the Gloomwood',need:1,target:['greyfang'],site:DEN,boss:'greyfang',rec:6,reward:{xp:500,potions:2,rar:2},
   text:'When the Lamp was shattered, its three Ember Shards were scattered, and each was given to a fell creature to guard. One is lodged in the hide of Old Greyfang, a wolf as large as a pony and grey as ash. The shard has made him cruel and the forest sick. His den lies in the heart of the Gloomwood. Bring me that shard.',
   wait:'Greyfang still lives. His den lies at the end of the south road, among the bones.',done:'The first Ember Shard! Feel how it hums, warm again in your hand. One shard of three. The second went north, into the Frostfells.'},
  {title:'The Frozen Road',goal:'Slay 8 creatures of the Frostfells to the north',need:8,target:['frostwolf','goblin','icetroll'],site:wsc({x:100,y:42}),rec:6,reward:{xp:700,potions:2,rar:1},
   text:'Snow has fallen in the Frostfells out of season, and goblins have come down from the high passes with frost wolves at their heels. Clear the north road so we can learn where the second shard is hidden. Dress warmly. The frost wolves bite cold.',
   wait:'The north road is still not safe. Keep thinning the Frostfells creatures.',done:'The road is open, and the scouts have found it: a goblin war-camp, and in it a warlord who wears a glowing stone on a chain.'},
  {title:'Skarg the Warlord',goal:'Defeat Skarg the Goblin Warlord in his camp in the Frostfells',need:1,target:['skarg'],site:CAMP,boss:'skarg',rec:9,reward:{xp:1100,potions:2,rar:2},
   text:'Skarg, they call him. He wears the second Ember Shard as a trophy and spins two great axes for sport. When he is hurt he calls his goblins to him, and when you come close he whirls like a storm. Strike, then step back. Bring me that shard.',
   wait:'Skarg still holds the second shard in his camp to the north.',done:'Two shards of three! The Lamp is beginning to answer: I saw it glimmer last night. The last shard went east, beyond the Sunscar Desert.'},
  {title:'Sand and Bone',goal:'Slay 8 creatures of the Sunscar Desert to the east',need:8,target:['scorpion','raider','wurm'],site:wsc({x:162,y:108}),rec:9,reward:{xp:1500,potions:2,rar:1},
   text:'East of here the land turns to sand and bone: the Sunscar Desert. Scorpions the size of dogs, wurms that rise from the dunes, and raiders who shoot from afar. Fight your way across. The canyon caves lie beyond.',
   wait:'The Sunscar still blocks the way east. Keep fighting across the sands.',done:'You crossed the Sunscar. Then you are ready for the worst of the three guardians.'},
  {title:'Mossback',goal:'Defeat Mossback the Troll at the canyon caves in the east',need:1,target:['mossback'],site:TROLL,boss:'mossback',rec:12,reward:{xp:2100,potions:2,rar:2},
   text:'In the canyon caves sleeps a troll older than our village. Mossback, for the moss grows on his back like a hillside. The last shard sits in his belly, and it has woken him. He hurls boulders at anyone who comes near, and when wounded he rages. Watch the ground. Keep moving.',
   wait:'Mossback still guards the last shard in the eastern caves. Mind the boulders.',done:'All three Ember Shards! I will work them back into the Lamp tonight. But the Barrow King will feel it, and he will not sit idle.'},
  {title:'Into the Mirefen',goal:'Slay 10 creatures of the Mirefen Bog to the west',need:10,target:['beetle','mosquito','lurker','webweaver'],site:wsc({x:32,y:132}),rec:12,reward:{xp:2700,potions:2,rar:2},
   text:'While I mend the Lamp, the King sends his creatures out of the Mirefen Bog to stop me: beetles with shells like shields, swarms of bloodflies, and lurkers that rise from the mud. The bog lies between us and the barrow-downs. Clear the way, and mind the mud, it slows the feet.',
   wait:'The Mirefen still swarms. Clear a path through the bog to the west.',done:'It is done. The Lamp of Emberfall burns again! Its light has broken the ward on the barrow. Now, at last, he can be reached.'},
  {title:'The Barrow King',goal:'End the Barrow King in the barrow-downs to the south-west',need:1,target:['barrowking'],site:BARROW,boss:'barrowking',rec:15,reward:{xp:4000,potions:2,rar:3},
   text:'Far to the south-west lie the barrow-downs, where kings of a forgotten age were laid to rest. One of them does not rest. He shattered our Lamp and woke the land against us. He calls the dead to his side, and his cold magic fills the air. Go now, with the Lamp\'s light at your back. End the Barrow King.',
   wait:'The cold still creeps from the barrow-downs. The King awaits.',done:'The downs are silent and the Lamp shines over the whole valley. Songs will be sung of you in Emberfall for a long, long time.'},
];

const RAR=[{n:'Common',c:'#d8d2c4',m:1,x:0},{n:'Magic',c:'#6fa8ff',m:1.3,x:1},{n:'Rare',c:'#ffd84a',m:1.7,x:2},{n:'Epic',c:'#c77dff',m:2.2,x:3},{n:'Legendary',c:'#ff9a2a',m:2.9,x:4}];
const SLOTS=['weapon','offhand','helm','armor','legs','boots','cape','ring'],
  SLOTNAME={weapon:'Weapon',offhand:'Off-hand',helm:'Head',armor:'Chest',legs:'Legs',boots:'Boots',cape:'Cape',ring:'Ring'},
  SLOTICON={weapon:'⚔️',offhand:'🛡️',helm:'⛑️',armor:'🧥',legs:'👖',boots:'🥾',cape:'🧣',ring:'💍'};
// Weapons are typed: the type decides which weapon skill trains and how the weapon looks.
const WEAPONS={paladin:[['sword','Longsword'],['sword','Bastard Sword'],['axe','Battleaxe'],['mace','Warhammer']],sorcerer:[['staff','Staff'],['staff','Ember Rod'],['wand','Wand']],
  hunter:[['bow','Longbow'],['bow','Recurve Bow'],['bow','Yew Bow']],necromancer:[['staff','Bone Staff'],['staff','Grim Scepter'],['wand','Skull Wand']]};
const WTYPE_NAME={sword:'Swords',axe:'Axes',mace:'Maces',staff:'Staves',wand:'Wands',bow:'Bows'};
const BASES={armor:['Mail Hauberk','Leather Jerkin','Robe','Brigandine','Cloak'],helm:['Helm','Hood','Circlet','Cowl'],ring:['Ring','Band','Signet']};
// Each class finds gear that fits it. The base name also decides how the piece looks on your hero.
const CBASES={
  paladin:{offhand:['Kite Shield','Heater Shield','Tower Shield'],helm:['Great Helm','Barbute','Winged Helm'],armor:['Mail Hauberk','Breastplate','Brigandine'],legs:['Mail Leggings','Plate Greaves'],boots:['Sabatons','Iron Boots'],cape:["Knight's Cape",'Tabard Cloak']},
  hunter:{offhand:['Quiver','Hunting Quiver'],helm:['Hood','Leather Cap','Feathered Hat'],armor:['Leather Jerkin','Scale Vest',"Ranger's Tunic"],legs:['Leather Breeches','Trail Pants'],boots:['Soft Boots','Tracker Boots'],cape:["Ranger's Cloak",'Fur Mantle']},
  sorcerer:{offhand:['Tome','Focus Orb'],helm:['Wizard Hat','Circlet','Cowl'],armor:['Robe','Vestments','Spellweave Robe'],legs:['Silk Leggings','Wrapped Trousers'],boots:['Slippers','Silk Shoes'],cape:['Starry Cloak','Mantle']},
  necromancer:{offhand:['Grimoire','Skull Totem'],helm:['Cowl','Skull Circlet','Hood'],armor:['Robe','Bone Vestments','Grave Shroud'],legs:['Dark Leggings','Wrapped Trousers'],boots:['Grave Boots','Slippers'],cape:['Shroud','Tattered Cloak']}};
const PREF=['Worn','Sturdy','Elven','Dwarven','Ancient','Moonlit','Shadowed','Gilded','Runed',"Wanderer's",'Kingsguard','Ember','Ashen','Silver'];
const SUFF=['of the North','of Embers','of the Deep','of Valor','of Whispers','of the Fallen King','of the Westmark','of Dusk'];
// Gear attributes. Main stats: Strength, Agility, Intellect (your class uses one for damage), Stamina for health.
const STATGEN={str:l=>3+l*1.2,agi:l=>3+l*1.2,int:l=>3+l*1.2,sta:l=>3+l*1.3,hit:l=>1+l*.12,crit:l=>1+l*.15,
  hp:l=>10+l*5,mana:l=>8+l*3,armor:l=>3+l*1.4,dmgPct:l=>4+l*1.6,cdr:l=>2+l*.25,speed:l=>2+l*.25,healPct:l=>3+l*.8,petPct:l=>4+l*1,leech:l=>1+l*.1};
const STATLBL={str:'Strength',agi:'Agility',int:'Intellect',sta:'Stamina',hit:'% Hit chance',crit:'% Critical chance',hp:'Health',mana:'Mana',armor:'Armor',dmgPct:'% Damage',
  cdr:'% Cooldown reduction',speed:'% Move speed',healPct:'% Healing',petPct:'% Minion power',leech:'% Life steal'};
const RANDSTATS=['sta','crit','hit','cdr','speed'];
// Each class has a main stat that powers its damage. Holy paladins heal with Intellect.
const MAIN_STAT={paladin:'str',sorcerer:'int',hunter:'agi',necromancer:'int'};
const ATTR_PT=3; // one attribute point = +3 of that stat
// The first attribute on each slot ('main' = your class's main stat) and how strong it rolls.
const PRIMARY={weapon:['main',1],offhand:['main',.8],helm:['sta',.8],armor:['armor',1],legs:['armor',.6],boots:['sta',.7],cape:['main',.6],ring:['crit',.8]};
// What each class and specialization wants on its gear (used for dungeon loot tables and attribute rolls).
const SPEC_STATS={paladin:['str','sta'],sorcerer:['int','crit'],hunter:['agi','crit'],necromancer:['int','petPct'],
  retribution:['str','crit'],protection:['sta','armor'],holy:['int','healPct'],fire:['int','crit'],frost:['int','sta'],arcane:['int','cdr'],
  marksman:['agi','crit'],survival:['agi','sta'],beast:['agi','petPct'],shadow:['int','leech'],bone:['int','armor'],undeath:['int','petPct']};
const SPEC_WEAPON={retribution:'axe',protection:'mace',holy:'mace',fire:'staff',frost:'staff',arcane:'wand',shadow:'wand',bone:'staff',undeath:'staff'};

// ---- Shops, mounts, professions
const SHOPS={
  tilda:{name:"Tilda's Wares",keeper:'Tilda the Trader',sells:['potion','gear'],services:true},
  general:{name:'General Store',keeper:'Odda',icon:'🧺',sells:['potion','light','supplies'],services:true},
  smith:{name:'Blacksmith',keeper:'Brannoc',icon:'⚒️',sells:['weapon','offhand'],trainer:'blacksmithing'},
  armorer:{name:'Armorer & Tanner',keeper:'Hilde',icon:'🛡️',sells:['armor','helm','legs','boots','cape'],trainer:'leatherworking'},
  jeweler:{name:'Jeweler & Enchanter',keeper:'Saphira',icon:'💍',sells:['ring'],trainer:'enchanting'},
  stable:{name:'Stable',keeper:'Garrick',icon:'🐎',sells:['mount']}};
const KEEPER_LOOK={general:{skin:'#f1c9a5',hair:'#c9a25a',cloth:'#4a6a3a'},smith:{skin:'#b47a52',hair:'#1e1510',cloth:'#5a3a22',beard:'#1e1510'},armorer:{skin:'#f6d5b8',hair:'#8a2d1c',cloth:'#6a4a2a'},
  jeweler:{skin:'#d9a47a',hair:'#3a4a6a',cloth:'#4a2f6a'},stable:{skin:'#8a5a3a',hair:'#4a2e1a',cloth:'#7a6a4a',beard:'#4a2e1a'}};
const LIGHTS=[{name:'Torch',icon:'🔥',lvl:1,cost:40,r:250,desc:'Lights up dark caves and dungeons around you.'},{name:'Lantern',icon:'🏮',lvl:8,cost:450,r:340,desc:'A brighter, wider light for the deep places.'}];
const MOUNTS={
  cow:{name:'Bessie the Cow',icon:'🐄',lvl:3,cost:150,speed:.3,desc:'Slow and steady, but better than walking. +30% move speed.'},
  horse:{name:'Riding Horse',icon:'🐎',lvl:7,cost:650,speed:.5,desc:'A swift brown horse. +50% move speed.'},
  ostrich:{name:'Desert Strider',icon:'🦤',lvl:12,cost:2200,speed:.75,desc:'A giant running bird from the Sunscar. +75% move speed.'},
  dragon:{name:'Young Ember Dragon',icon:'🐉',lvl:16,cost:7500,speed:1.1,fly:true,desc:'Flies over water. +110% move speed.'}};
// Materials come in three grades. Better grades drop from stronger monsters and are needed for higher crafting skill.
const MAT_FAM={hide:{n:'Hide',icon:'🟫'},silk:{n:'Silk',icon:'🕸️'},ore:{n:'Ore',icon:'⛏️'},dust:{n:'Arcane Dust',icon:'✨'}};
const GRADE=['','Good ','Grand '],GRADE_COL=['#efe6d2','#6fa8ff','#ff9a2a'];
const MATS={essence:{n:'Essence',icon:'💠',t:3}};
for(const[k,f]of Object.entries(MAT_FAM))for(let t=1;t<=3;t++)MATS[t===1?k:k+t]={n:GRADE[t-1]+f.n,icon:f.icon,t,fam:k};
// Gathered ingredients: herbs grow wild (better herbs in harder regions), berries on bushes, water from city wells, meat from beasts.
Object.assign(MATS,{herb1:{n:'Meadowsweet',icon:'🌿',t:1},herb2:{n:'Silverthorn',icon:'🌱',t:2},herb3:{n:'Duskbloom',icon:'🌺',t:3},
  vial:{n:'Empty Vial',icon:'⚱️',t:1},water:{n:'Fresh Water',icon:'💧',t:1},berries:{n:'Wild Berries',icon:'🫐',t:1},
  meat:{n:'Raw Meat',icon:'🥩',t:1},meat2:{n:'Tender Meat',icon:'🥩',t:2},meat3:{n:'Prime Meat',icon:'🥩',t:3}});
const MOB_MEAT={wolf:'meat',frostwolf:'meat',bat:'meat',scorpion:'meat2',wurm:'meat2',beetle:'meat2',lurker:'meat2',greyfang:'meat2',
  direwolf:'meat3',rimeclaw:'meat3',scarablord:'meat3'};
// Which material (and grade) each monster can drop.
const MOB_MAT={wolf:'hide',frostwolf:'hide',bat:'hide',spider:'silk',mosquito:'silk',goblin:'ore',archer:'dust',sporeling:'dust',
  scorpion:'hide2',wurm:'hide2',beetle:'hide2',lurker:'hide2',cspider:'silk2',webweaver:'silk2',troll:'ore2',icetroll:'ore2',raider:'ore2',golem:'ore2',wight:'dust2',mummy:'dust2',myconid:'dust2',
  direwolf:'hide3',giantspider:'silk3',obsidiangolem:'ore3',ancientwraith:'dust3',
  greyfang:'hide2',rimeclaw:'hide2',venomfang:'silk2',broodmother:'silk2',skarg:'ore2',mossback:'ore3',halvar:'ore3',scarablord:'hide3',barrowking:'dust3',anubek:'dust3',sunking:'dust3'};
// Each profession is taught in one city only. Every profession has everyday recipes plus stronger ones that need better materials.
// "target" recipes work on an equipped item: Blacksmithing and Enchanting each add one extra attribute (never the same stat twice).
const PROF={
  alchemy:{name:'Alchemy',icon:'⚗️',at:'the General Store in Emberfall',city:'emberfall',recipes:[
    {id:'al1',n:'Minor Healing Potion ×2',req:0,cost:{herb1:2,vial:2},desc:'Restores 50 health instantly.',make:p=>addSup(p,'hp1',2)},
    {id:'al2',n:'Minor Mana Potion ×2',req:0,cost:{herb1:1,dust:1,vial:2},desc:'Restores 50 mana instantly.',make:p=>addSup(p,'mp1',2)},
    {id:'al3',n:'Power Potion',req:20,cost:{herb1:2,herb2:1,vial:1},desc:'A potion brewed for YOUR class and specialization. 3 minutes.',make:p=>addSup(p,'pow1',1)},
    {id:'al4',n:'Healing Potion',req:25,cost:{herb1:3,vial:1},desc:'Restores 100 health instantly.',make:p=>addSup(p,'hp2',1)},
    {id:'al5',n:'Mana Potion',req:25,cost:{herb1:2,dust:2,vial:1},desc:'Restores 100 mana instantly.',make:p=>addSup(p,'mp2',1)},
    {id:'al6',n:'Greater Healing Potion',req:50,cost:{herb2:2,herb1:1,vial:1},desc:'Restores 250 health instantly.',make:p=>addSup(p,'hp3',1)},
    {id:'al7',n:'Greater Mana Potion',req:50,cost:{herb2:2,dust2:1,vial:1},desc:'Restores 250 mana instantly.',make:p=>addSup(p,'mp3',1)},
    {id:'al8',n:'Greater Power Potion',req:60,cost:{herb2:2,herb3:1,essence:1,vial:1},desc:'A stronger potion for your class and specialization. 3 minutes.',make:p=>addSup(p,'pow2',1)},
    {id:'al9',n:'Superior Healing Potion',req:75,cost:{herb3:2,herb2:1,vial:1},desc:'Restores 500 health instantly.',make:p=>addSup(p,'hp4',1)},
    {id:'al10',n:'Superior Mana Potion',req:75,cost:{herb3:2,dust3:1,vial:1},desc:'Restores 500 mana instantly.',make:p=>addSup(p,'mp4',1)}]},
  cooking:{name:'Cooking',icon:'🍳',at:'the General Store in Mirewatch',city:'mirewatch',recipes:[
    {id:'ck1',n:'Roasted Meat ×2',req:0,cost:{meat:2},desc:'Restores about 25 health per second while you eat.',make:p=>addSup(p,'roast',2)},
    {id:'ck2',n:'Berry Juice ×2',req:10,cost:{berries:2,water:2},desc:'Restores about 18 mana per second while you drink.',make:p=>addSup(p,'juice',2)},
    {id:'ck3',n:"Hunter's Stew",req:35,cost:{meat2:2,berries:2,water:1},desc:'Restores health and mana while you eat.',make:p=>addSup(p,'stew',1)},
    {id:'ck4',n:'Westmark Feast',req:70,cost:{meat3:1,meat2:1,herb2:1},desc:'A big meal: strong health and mana, and Well Fed (+Stamina, +main stat) for 10 minutes.',make:p=>addSup(p,'feast',1)}]},
  blacksmithing:{name:'Blacksmithing',icon:'⚒️',at:'the Blacksmith in Emberfall',city:'emberfall',recipes:[
    {id:'bs0',n:'Sharpening Stone',req:0,cost:{ore:1},desc:'Everyday: +3% damage for 10 minutes.',make:p=>addSup(p,'stone',1)},
    {id:'bs1',n:'Temper Gear',req:0,target:['weapon','offhand','helm','armor','legs','boots'],cost:'temper',desc:'Adds or rerolls the Blacksmith attribute on an equipped item: Strength, Stamina, Armor or Hit.',make:(p,s)=>improveItem(p,s,'bs')},
    {id:'bs2',n:'Forge Iron Weapon',req:5,cost:{ore:6},desc:'A magic weapon for your class.',make:p=>craftGear(p,'weapon',1,Math.max(3,Math.round(p.prof.blacksmithing/5)+3))},
    {id:'bs3',n:'Forge Steel Weapon',req:35,cost:{ore2:8,dust:2},desc:'A rare weapon for your class.',make:p=>craftGear(p,'weapon',2,Math.round(p.prof.blacksmithing/5)+6)},
    {id:'bs4',n:'Forge Steel Helm',req:45,cost:{ore2:8,hide:2},desc:'A rare helm.',make:p=>craftGear(p,'helm',2,Math.round(p.prof.blacksmithing/5)+6)},
    {id:'bs5',n:'Forge Mithril Weapon',req:70,cost:{ore3:8,dust2:3,essence:1},desc:'An epic weapon for your class.',make:p=>craftGear(p,'weapon',3,Math.round(p.prof.blacksmithing/5)+8)}]},
  leatherworking:{name:'Leatherworking',icon:'🧵',at:'the Armorer & Tanner in Frosthold',city:'frosthold',recipes:[
    {id:'lw0',n:'Armor Kit',req:0,cost:{hide:1},desc:'Everyday: +armor for 10 minutes.',make:p=>addSup(p,'kit',1)},
    {id:'lw1',n:'Leather Satchel',req:0,cost:{hide:8},desc:'Bag with 24 slots.',make:p=>bagUp(p,24,0,'Leather Satchel')},
    {id:'lw2',n:'Stitch Leather Armor',req:15,cost:{hide:10,silk:2},desc:'A magic armor piece.',make:p=>craftGear(p,'armor',1,Math.round(p.prof.leatherworking/5)+4)},
    {id:'lw3',n:"Traveler's Pack",req:35,cost:{hide2:10,silk2:4},desc:'Bag with 28 slots and +5% loot chance.',make:p=>bagUp(p,28,.05,"Traveler's Pack")},
    {id:'lw4',n:'Hardened Leather Armor',req:50,cost:{hide2:12,silk2:4,ore2:2},desc:'A rare armor piece.',make:p=>craftGear(p,'armor',2,Math.round(p.prof.leatherworking/5)+7)},
    {id:'lw5',n:'Grand Spidersilk Bag',req:70,cost:{hide3:8,silk3:6,essence:2},desc:'Bag with 32 slots and +10% loot chance.',make:p=>bagUp(p,32,.1,'Grand Spidersilk Bag')}]},
  enchanting:{name:'Enchanting',icon:'✨',at:'the Jeweler & Enchanter in Sunreach',city:'sunreach',recipes:[
    {id:'en0',n:'Wizard Oil',req:0,cost:{dust:1},desc:'Everyday: +3% damage and healing for 10 minutes.',make:p=>addSup(p,'oil',1)},
    {id:'en1',n:'Enchant Gear',req:0,target:['weapon','offhand','helm','armor','legs','boots','cape','ring'],cost:'enchant',desc:'Adds or rerolls the Enchanter attribute on an equipped item: Intellect, Agility, Critical chance, Hit or Stamina.',make:(p,s)=>improveItem(p,s,'en')}]}};

// ---- Dungeons and caves
const DUNGEONS={
  d_web:{seed:101,rooms:7,lvl:[6,8],pool:['spider','spider','cspider'],bosses:['venomfang','broodmother'],decor:['web','web','bones'],tag:['Silkweaver','Venom-Kissed','Broodmother\'s','Webbed']},
  d_frost:{seed:202,rooms:8,lvl:[10,12],pool:['frostwolf','icetroll','goblin','frostwolf'],bosses:['rimeclaw','halvar'],decor:['icecrystal','bones','snowrock'],tag:['Rimebound','Frostfang','Halvar\'s','Glacial']},
  d_tomb:{seed:303,rooms:9,lvl:[15,17],pool:['mummy','scorpion','mummy','raider'],bosses:['anubek','scarablord','sunking'],decor:['urn','urn','skull'],tag:['Sunforged','Embalmed','Pharaoh\'s','Scarab']}};
const CAVES={
  c_glimmer:{seed:404,pool:['bat','bat','cspider','golem'],glow:'crystal',color:'#7ad0ff',glowCol:'rgba(110,200,255,.22)'},
  c_fungal:{seed:505,pool:['sporeling','sporeling','myconid','beetle'],glow:'glowshroom',color:'#a8ff6a',glowCol:'rgba(150,255,110,.2)'}};
