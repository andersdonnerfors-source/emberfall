// ================= State =================
let state='title',invOpen=false,dialogOpen=false,pauseOpen=false,talOpen=false,shopOpen=false;
let time=0,rt=0,camX=0,camY=0,shake=0,saveT=0,spawnT=0;
let players=[],enemies=[],allies=[],projs=[],areas=[],parts=[],texts=[],drops=[],fx=[];
let quest={idx:0,state:'offer',prog:0},flags={};
const warden={x:(VC.x+2)*TILE,y:(VC.y-1)*TILE,r:14,aim:Math.PI};
const keys={},mouse={x:0,y:0,l:false};
let noManaT=0;

