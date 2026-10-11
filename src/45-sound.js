// ================= Sound =================
// Everything is synthesized with Web Audio, so there are no sound files to load.
const Snd={ctx:null,master:null,sfxG:null,musG:null,vol:Object.assign({sfx:.7,music:.45,muted:false},fetchStore('emberfall-audio')||{}),last:{}};
function saveAudio(){store('emberfall-audio',Snd.vol)}
function audioInit(){if(Snd.ctx){if(Snd.ctx.state==='suspended')Snd.ctx.resume();return}try{const C=window.AudioContext||window.webkitAudioContext;Snd.ctx=new C();
  Snd.master=Snd.ctx.createGain();Snd.master.connect(Snd.ctx.destination);Snd.sfxG=Snd.ctx.createGain();Snd.sfxG.connect(Snd.master);Snd.musG=Snd.ctx.createGain();Snd.musG.connect(Snd.master);applyVol()}catch(e){Snd.ctx=null}}
function applyVol(){if(!Snd.ctx)return;Snd.master.gain.value=Snd.vol.muted?0:1;Snd.sfxG.gain.value=Snd.vol.sfx;Snd.musG.gain.value=Snd.vol.music*.6}
addEventListener('pointerdown',audioInit);document.addEventListener('click',e=>{if(e.target.closest&&e.target.closest('button'))sfx('click')});addEventListener('keydown',audioInit);
function tone(o){const c=Snd.ctx;if(!c)return;const t=c.currentTime+(o.delay||0),osc=c.createOscillator(),g=c.createGain();osc.type=o.type||'sine';osc.frequency.setValueAtTime(o.f,t);
  if(o.f2)osc.frequency.exponentialRampToValueAtTime(Math.max(20,o.f2),t+o.dur);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.2,t+(o.attack||.01));g.gain.exponentialRampToValueAtTime(.0001,t+o.dur);
  osc.connect(g);g.connect(o.dest||Snd.sfxG);osc.start(t);osc.stop(t+o.dur+.05)}
let noiseBuf=null;
function noise(o){const c=Snd.ctx;if(!c)return;if(!noiseBuf){noiseBuf=c.createBuffer(1,c.sampleRate,c.sampleRate);const d=noiseBuf.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1}
  const t=c.currentTime+(o.delay||0),s=c.createBufferSource(),f=c.createBiquadFilter(),g=c.createGain();s.buffer=noiseBuf;f.type=o.ft||'lowpass';f.frequency.setValueAtTime(o.f||1000,t);if(o.f2)f.frequency.exponentialRampToValueAtTime(o.f2,t+o.dur);f.Q.value=o.q||1;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(o.vol||.2,t+(o.attack||.005));g.gain.exponentialRampToValueAtTime(.0001,t+o.dur);s.connect(f);f.connect(g);g.connect(o.dest||Snd.sfxG);s.start(t,Math.random()*.5);s.stop(t+o.dur+.05)}
const chord=(fs,o)=>fs.forEach((f,i)=>tone(Object.assign({f,delay:i*(o.gap||0)},o)));
const SFX={
  swing:()=>noise({f:2600,f2:500,ft:'bandpass',q:1.5,dur:.18,vol:.28}),
  bash:()=>{noise({f:900,f2:150,dur:.2,vol:.35});tone({f:140,f2:70,type:'square',dur:.15,vol:.12})},
  storm:()=>{noise({f:3000,f2:400,ft:'bandpass',q:1,dur:.5,vol:.3});chord([523,784],{type:'triangle',dur:.5,vol:.06})},
  shield:()=>{tone({f:500,f2:900,type:'triangle',dur:.25,vol:.1});noise({f:3000,ft:'bandpass',dur:.2,vol:.12})},
  shieldup:()=>chord([523,659,784,1047],{type:'sine',dur:.9,vol:.07,gap:.04,attack:.05}),
  holy:()=>chord([523,659,784],{type:'sine',dur:.7,vol:.08,gap:.05,attack:.05}),
  fire:()=>{noise({f:900,f2:200,dur:.32,vol:.28});tone({f:220,f2:110,type:'sawtooth',dur:.2,vol:.04})},
  meteor:()=>{noise({f:400,f2:2000,dur:.9,vol:.25,attack:.6});tone({f:200,f2:600,type:'sawtooth',dur:.9,vol:.03,attack:.6})},
  frost:()=>{noise({f:6000,f2:2000,ft:'highpass',dur:.5,vol:.16});tone({f:1300,f2:650,type:'triangle',dur:.4,vol:.06})},
  arcane:()=>{for(let i=0;i<6;i++)tone({f:700+i*90,f2:1100+i*90,type:'sine',dur:.12,vol:.05,delay:i*.03})},
  blink:()=>tone({f:300,f2:1400,type:'sine',dur:.22,vol:.12}),
  arrow:()=>{tone({f:950,f2:280,type:'triangle',dur:.12,vol:.12});noise({f:4000,f2:1500,ft:'highpass',dur:.08,vol:.08})},
  snipe:()=>{tone({f:1400,f2:200,type:'sawtooth',dur:.25,vol:.08});noise({f:5000,f2:800,ft:'bandpass',dur:.3,vol:.15})},
  trap:()=>{tone({f:300,type:'square',dur:.06,vol:.08});tone({f:200,type:'square',dur:.06,vol:.08,delay:.07})},
  howl:()=>{tone({f:420,f2:680,type:'sine',dur:.5,vol:.1,attack:.15});tone({f:680,f2:520,type:'sine',dur:.6,vol:.08,delay:.45})},
  shadow:()=>{tone({f:300,f2:110,type:'sine',dur:.35,vol:.14});tone({f:452,f2:166,type:'sine',dur:.35,vol:.07})},
  drain:()=>{tone({f:200,f2:500,type:'sawtooth',dur:.35,vol:.05});noise({f:600,ft:'bandpass',q:4,dur:.35,vol:.1})},
  curse:()=>chord([233,277,330],{type:'sawtooth',dur:.6,vol:.04,gap:.06}),
  bone:()=>{for(let i=0;i<4;i++)noise({f:2500,ft:'bandpass',q:6,dur:.05,vol:.15,delay:i*.04})},
  summon:()=>{tone({f:110,f2:220,type:'square',dur:.45,vol:.05});noise({f:500,f2:150,dur:.45,vol:.1})},
  hit:()=>noise({f:1300,f2:300,dur:.08,vol:.16}),
  hurt:()=>{tone({f:170,f2:85,type:'square',dur:.13,vol:.1});noise({f:700,dur:.1,vol:.12})},
  die:()=>{tone({f:280,f2:60,type:'sawtooth',dur:.3,vol:.06});noise({f:500,f2:100,dur:.25,vol:.1})},
  bossdie:()=>{noise({f:900,f2:40,dur:1.6,vol:.4});tone({f:110,f2:30,type:'sawtooth',dur:1.5,vol:.15});chord([262,330,392,523],{type:'triangle',dur:.9,vol:.1,gap:.15,delay:.7})},
  roar:()=>{noise({f:320,f2:110,ft:'bandpass',q:3,dur:1.3,vol:.45,attack:.25});tone({f:72,f2:50,type:'sawtooth',dur:1.3,vol:.12,attack:.25})},
  boom:()=>{noise({f:700,f2:60,dur:.7,vol:.42});tone({f:95,f2:30,type:'sine',dur:.6,vol:.4})},
  slam:()=>{noise({f:450,f2:80,dur:.4,vol:.35});tone({f:80,f2:40,type:'sine',dur:.4,vol:.3})},
  enemyshot:()=>tone({f:620,f2:260,type:'triangle',dur:.1,vol:.04}),
  level:()=>chord([392,494,587,784],{type:'triangle',dur:.55,vol:.13,gap:.11,attack:.02}),
  spec:()=>chord([262,392,523,659,784,1047],{type:'triangle',dur:.8,vol:.1,gap:.08}),
  gold:()=>{tone({f:1300,type:'square',dur:.07,vol:.04});tone({f:1950,type:'square',dur:.12,vol:.04,delay:.06})},
  loot:o=>chord([660,880,1100,1320,1760].slice(0,2+(o.rar||0)),{type:'triangle',dur:.35,vol:.08,gap:.07}),
  potion:()=>{for(let i=0;i<4;i++)tone({f:420+i*130,f2:520+i*130,type:'sine',dur:.08,vol:.08,delay:i*.06})},
  accept:()=>chord([440,554,659],{type:'triangle',dur:.3,vol:.09,gap:.08}),
  quest:()=>chord([523,659,784,1047],{type:'sine',dur:.5,vol:.1,gap:.09}),
  click:()=>tone({f:720,type:'triangle',dur:.05,vol:.05}),
  nomana:()=>tone({f:200,type:'square',dur:.1,vol:.03}),
  death:()=>chord([392,349,311,262],{type:'triangle',dur:.7,vol:.1,gap:.28}),
  victory:()=>{chord([523,659,784,1047],{type:'triangle',dur:.6,vol:.1,gap:.15});chord([587,740,880,1175],{type:'triangle',dur:1.2,vol:.1,gap:.15,delay:.7})},
};
function sfx(name,opt){if(!Snd.ctx||Snd.vol.muted)return;const now=Snd.ctx.currentTime,thr={boom:.08,slam:.08,hit:.06,hurt:.12,die:.05,gold:.05,enemyshot:.08,click:.03};if(thr[name]&&now-(Snd.last[name]||0)<thr[name])return;Snd.last[name]=now;const f=SFX[name];if(f)f(opt||{})}
// Generative background music: one mood per region, more urgent during boss fights.
const MUSIC=[{root:220,scale:[0,2,4,7,9],tempo:.9,wave:'triangle'},{root:196,scale:[0,3,5,7,10],tempo:1.25,wave:'sine'},{root:207.65,scale:[0,1,4,5,7,8],tempo:.75,wave:'triangle'},{root:174.6,scale:[0,3,5,6,7,10],tempo:1.1,wave:'sine'},{root:164.8,scale:[0,1,3,6,7],tempo:1.35,wave:'sine'},
  {root:146.8,scale:[0,1,3,5,7,8],tempo:1.5,wave:'sine'},{root:130.8,scale:[0,1,3,6,7,10],tempo:1.2,wave:'sawtooth'},{root:246.9,scale:[0,2,4,5,7,9],tempo:1,wave:'triangle'}]; // + cave, dungeon, indoors
let musT=0,musStep=0,drone=null,curMus=-1;
function setDrone(f){const c=Snd.ctx;if(drone){const old=drone;old.g.gain.setTargetAtTime(0,c.currentTime,.6);setTimeout(()=>{try{old.o1.stop();old.o2.stop()}catch(e){}},4000)}
  const g=c.createGain(),lp=c.createBiquadFilter(),o1=c.createOscillator(),o2=c.createOscillator();g.gain.value=0;lp.type='lowpass';lp.frequency.value=420;o1.type=o2.type='sawtooth';o1.frequency.value=f;o2.frequency.value=f*1.006;
  o1.connect(lp);o2.connect(lp);lp.connect(g);g.connect(Snd.musG);o1.start();o2.start();g.gain.setTargetAtTime(.022,c.currentTime,1.5);drone={o1,o2,g}}
function musicTick(dt){if(!Snd.ctx||Snd.ctx.state!=='running')return;const p=players[0],b=p&&state==='play'?biomeAtW(p.x,p.y):0,M=MUSIC[b]||MUSIC[0],boss=state==='play'&&enemies.some(e=>e.boss&&e.target);
  if(b!==curMus){curMus=b;setDrone(M.root/2)}musT-=dt;if(musT>0)return;musT=M.tempo*(boss?.5:1);musStep++;
  const f=M.root*Math.pow(2,pick(M.scale)/12)*(Math.random()<.3?2:1);if(Math.random()<.7)tone({f,type:M.wave,dur:M.tempo*2.4,vol:boss?.06:.045,attack:.08,dest:Snd.musG});
  if(boss&&musStep%2===0)tone({f:M.root/2,type:'sawtooth',dur:.22,vol:.05,dest:Snd.musG});
  if(musStep%8===0)tone({f:M.root*Math.pow(2,M.scale[2]/12)/2,type:'sine',dur:M.tempo*7,vol:.035,attack:.8,dest:Snd.musG})}

