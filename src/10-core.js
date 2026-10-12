'use strict';
// ================= Basics =================
const $=id=>document.getElementById(id);
const cvs=$('game'),ctx=cvs.getContext('2d');
let W=0,H=0;
function resize(){const d=renderScale(gfxPref(),isPhone(),window.devicePixelRatio||1);// renderScale, gfxPref, isPhone: src/88-layout.js
  W=innerWidth;H=innerHeight;cvs.width=W*d;cvs.height=H*d;ctx.setTransform(d,0,0,d,0,0)}
addEventListener('resize',resize);resize();
const clamp=(v,a,b)=>v<a?a:v>b?b:v,rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const TAU=Math.PI*2;
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function ell(c,x,y,rx,ry){c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU)}
function circ(c,x,y,r){c.beginPath();c.arc(x,y,Math.max(.1,r),0,TAU)}
function shade(h,p){const n=parseInt(h.slice(1),16),f=1+p/100;const r=clamp(Math.round((n>>16)*f),0,255),g=clamp(Math.round((n>>8&255)*f),0,255),b=clamp(Math.round((n&255)*f),0,255);return'#'+((1<<24)|(r<<16)|(g<<8)|b).toString(16).slice(1)}
let WSEED=0;// the current world's seed (0 = the original world)
function hash(x,y){let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(WSEED,1442695041))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296}
function vnoise(x,y){const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,s=t=>t*t*(3-2*t);const a=hash(xi,yi),b=hash(xi+1,yi),c=hash(xi,yi+1),d=hash(xi+1,yi+1),u=s(xf),v=s(yf);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function store(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
function fetchStore(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}}

