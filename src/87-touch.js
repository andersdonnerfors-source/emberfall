// ---- Touch: auto-aim (pure logic; the controls are added below)
const Aim={target:null},AIM_MELEE=120,AIM_FAR=460,_aimR={};
// Reach of ability i: 120 for the attack and melee abilities, 460 for ranged and spells (decided once per ability, from its cast code).
function aimRange(p,i){const a=p.abil[i];if(!a)return AIM_FAR;const k=a.name;return _aimR[k]||(_aimR[k]=String(a.cast).includes('melee(')?AIM_MELEE:AIM_FAR)}
// Direction the player faces: the move vector if moving, else where p.aim points.
function aimFace(p){const i=p.input||{},l=Math.hypot(i.mx||0,i.my||0);return l>0?{x:i.mx/l,y:i.my/l}:{x:Math.cos(p.aim||0),y:Math.sin(p.aim||0)}}
// Lower is better: distance x (1.6 - 0.6 cos(angle off the facing)), so enemies straight ahead win.
function aimScore(p,e,face){const dx=e.x-p.x,dy=e.y-p.y,d=Math.hypot(dx,dy),fl=Math.hypot(face.x,face.y);return d<1e-6||fl<1e-6?d:d*(1.6-.6*(dx*face.x+dy*face.y)/(d*fl))}
// Keeps cur while it is still a candidate, unless another one scores under 70% of its score.
function aimPick(p,cands,face,cur){let best=null,bs=1e9;for(const e of cands){const s=aimScore(p,e,face);if(s<bs){bs=s;best=e}}
  if(cur&&cands.includes(cur)&&!(bs<.7*aimScore(p,cur,face)))return cur;return best}
function aimCands(p,range,list=enemies,los=(a,b)=>lineClear(a.x,a.y,b.x,b.y,PBLOCK)){return list.filter(e=>!e.dead&&e.hp>0&&dist(p,e)<=range&&los(p,e))}
// Most hurt party member in reach (for heals), else the caster.
function aimFriendly(p,range){let best=p,bf=2;for(const q of players){if(q.dead||q.away||dist(p,q)>range)continue;const f=q.hp/q.maxHp;if(f<bf){bf=f;best=q}}return best}
// Where ability i should land: the auto-target, the most hurt ally for heals, or 200 px ahead.
function aimPoint(p,i){const a=p.abil[i],r=aimRange(p,i);if(a&&a.heal)return aimFriendly(p,r);
  const f=aimFace(p);Aim.target=aimPick(p,aimCands(p,r),f,Aim.target);
  if(Aim.target){hudTarget=Aim.target;return{x:Aim.target.x,y:Aim.target.y}}
  return{x:p.x+f.x*200,y:p.y+f.y*200}}
