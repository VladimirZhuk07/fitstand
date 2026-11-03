// Фитстенд — модель подбора размера рамы и посадки. Без DOM: работает в браузере и в Node.
(function (root) {
const D=Math.PI/180;
const V=(x,y)=>({x,y});
const add=(a,b)=>V(a.x+b.x,a.y+b.y);
const sub=(a,b)=>V(a.x-b.x,a.y-b.y);
const mul=(a,k)=>V(a.x*k,a.y*k);
const len=a=>Math.hypot(a.x,a.y);
const nrm=a=>{const l=len(a)||1;return V(a.x/l,a.y/l)};
const dirv=deg=>V(Math.cos(deg*D),Math.sin(deg*D));
const angOf=a=>Math.atan2(a.y,a.x)/D;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));

function ik2(a,b,l1,l2,sign){
  const d0=sub(b,a), d=len(d0);
  const dc=clamp(d,Math.abs(l1-l2)+1,l1+l2-0.5);
  const base=Math.atan2(d0.y,d0.x);
  const A=Math.acos(clamp((l1*l1+dc*dc-l2*l2)/(2*l1*dc),-1,1));
  const j=add(a,mul(V(Math.cos(base+sign*A),Math.sin(base+sign*A)),l1));
  const e=add(j,mul(nrm(sub(b,j)),l2));
  return {j,e,over:d-(l1+l2)};
}

const HIP_OFF=V(-20,40), ANK=V(-55,100), AEK=0.9;

const STYLES={
  road:  {name:'Шоссе', STA:73.5,HTA:73,drop:70,cs:410,tyre:28,rake:45,stemIdeal:100,stemMin:70,stemMax:140,stemAng:-6,stemAngs:[-6,-17,6,17],spMax:50,barReach:80,barDrop:125,sweep:0,fender:0,guard:0,ring:50,saddleK:0.883,alpha:46,alphaFlex:3,beta:90,torsoNorm:[40,52],reachAdj:-14,heightAdj:0,crankMax:175,expoMax:320,barAdd:0,barMin:360,barMax:460,flat:false,brake:'rim',susp:false,hinge:false,oneSize:false},
  gravel:{name:'Грэвел',STA:73,HTA:71,drop:75,cs:425,tyre:42,rake:50,stemIdeal:80,stemMin:50,stemMax:120,stemAng:-6,stemAngs:[-6,-17,6,17],spMax:50,barReach:75,barDrop:110,sweep:0,fender:0,guard:0,ring:40,saddleK:0.883,alpha:51,alphaFlex:3,beta:88,torsoNorm:[45,58],reachAdj:-35,heightAdj:0,crankMax:175,expoMax:320,barAdd:40,barMin:400,barMax:500,flat:false,brake:'disc',susp:false,hinge:false,oneSize:false},
  city:  {name:'Город', STA:71,HTA:69,drop:60,cs:450,tyre:42,rake:50,stemIdeal:80,stemMin:40,stemMax:120,stemAng:20,stemAngs:[20,7,35],spMax:60,barReach:0,barDrop:0,sweep:150,fender:1,guard:1,ring:38,saddleK:0.875,alpha:68,alphaFlex:2.5,beta:62,torsoNorm:[60,78],reachAdj:-40,heightAdj:0,crankMax:170,expoMax:380,barAdd:180,barMin:560,barMax:680,flat:true,brake:'rim',susp:false,hinge:false,oneSize:false},
  hybrid:{name:'Гибрид',STA:72,HTA:70.5,drop:70,cs:440,tyre:38,rake:50,stemIdeal:90,stemMin:60,stemMax:120,stemAng:7,stemAngs:[7,-7,17],spMax:40,barReach:0,barDrop:0,sweep:60,fender:0,guard:0,ring:44,saddleK:0.88,alpha:58,alphaFlex:3,beta:75,torsoNorm:[50,65],reachAdj:-60,heightAdj:0,crankMax:175,expoMax:340,barAdd:200,barMin:580,barMax:680,flat:true,brake:'disc',susp:false,hinge:false,oneSize:false},
  mtb:   {name:'MTB',   STA:75,HTA:66,drop:40,cs:435,tyre:58,rake:44,stemIdeal:50,stemMin:35,stemMax:80,stemAng:0,stemAngs:[0,-6,6],spMax:30,barReach:0,barDrop:0,sweep:30,fender:0,guard:0,ring:32,saddleK:0.883,alpha:50,alphaFlex:3,beta:80,torsoNorm:[42,58],reachAdj:-40,heightAdj:0,crankMax:175,expoMax:380,barAdd:340,barMin:720,barMax:800,flat:true,brake:'disc',susp:true,hinge:false,oneSize:false},
  folding:{name:'Складной',STA:70,HTA:72,drop:-40,cs:400,tyre:35,rake:40,stemIdeal:60,stemMin:40,stemMax:100,stemAng:10,stemAngs:[10],spMax:250,barReach:0,barDrop:0,sweep:120,fender:1,guard:1,ring:52,saddleK:0.875,alpha:65,alphaFlex:2.5,beta:65,torsoNorm:[58,78],reachAdj:-40,heightAdj:0,crankMax:170,expoMax:9999,barAdd:140,barMin:540,barMax:600,flat:true,brake:'rim',susp:false,hinge:true,oneSize:true}
};
const WHEEL_R={'700c':311,'650b':292,'29':311,'27.5':292,'20':203};
const FOLDING_RANGE=[150,195];
const CITY={reach:30,stack:5,ht:20};
const ROAD_SIZES=[['XS',480,372,522,110],['S',510,378,543,130],['M',540,385,565,150],['L',560,392,588,172],['XL',580,400,612,195],['XXL',610,410,636,218]];
function sizesFor(style){
  if(style==='folding') return [{n:'Один',st:340,reach:390,stack:560,ht:180,wheel:'20'}];
  return ROAD_SIZES.map(([n,st,r,s,ht],i)=>{
    const wheel=i===0?'650b':'700c';
    if(style==='gravel') return {n,st:st-10,reach:r-3,stack:s+25,ht:ht+25,wheel};
    if(style==='city') return {n,st:[430,460,500,530,560,590][i],reach:r-CITY.reach,stack:s+CITY.stack,ht:ht+CITY.ht,wheel};
    if(style==='hybrid') return {n,st:[440,470,500,530,560,590][i],reach:r-15,stack:s+25,ht:ht+20,wheel};
    if(style==='mtb') return {n,st:[380,400,420,440,470,500][i],reach:r+65,stack:s+60,ht:[95,100,105,115,125,135][i],wheel:i<2?'27.5':'29'};
    return {n,st,reach:r,stack:s,ht,wheel};
  });
}
function bodyOf(p){
  const H=p.H*10, I=p.I*10;
  const hipH=I+0.06*H, ankleH=0.039*H, leg=hipH-ankleH;
  return {torso:0.818*H-hipH, thigh:leg*0.5, shin:leg*0.5, arm:p.A*10+70, headR:0.062*H, foot:0.15*H};
}
function saddlePt(g){return mul(V(-Math.cos(g.STA*D),Math.sin(g.STA*D)),g.saddleH)}
function barGeom(g,C){
  const dk=g.barDrop/125, sk=g.sweep/150;
  const G=add(C,V(g.barReach-g.sweep,35*sk));
  const hand=add(G,V(8*dk,28*dk+12*sk));
  return {G,hand,dk,sk};
}
function cockpit(g){
  const Ht=V(g.reach,g.stack), u=dirv(180-g.HTA), q=dirv(90-g.HTA+g.stemAng);
  const spTop=add(Ht,mul(u,15+g.sp));
  const steerTop=add(spTop,mul(u,40));
  const stemBase=add(spTop,mul(u,20));
  const C=add(stemBase,mul(q,g.stemL));
  return Object.assign({Ht,u,q,spTop,steerTop,stemBase,C},barGeom(g,C));
}
function legAt(g,hip,th){
  const pedal=mul(dirv(th),g.crank);
  const ank=add(pedal,mul(ANK,g.sc));
  const k=ik2(hip,ank,g.thigh,g.shin,1);
  const toe=add(pedal,V(g.foot*0.45,-14));
  return {pedal,knee:k.j,ankle:k.e,toe,over:k.over};
}
function upperOf(g,hip,hand){
  const s=ik2(hip,hand,g.torso,g.arm*AEK,1);
  const shoulder=s.j;
  const el=ik2(shoulder,hand,g.arm*0.52,g.arm*0.48,-1);
  const a=angOf(sub(shoulder,hip));
  const head=add(add(shoulder,mul(dirv(a),g.headR*0.9)),V(g.headR*0.8,g.headR*0.75));
  return {shoulder,elbow:el.j,hand:el.e,alpha:a,head,over:s.over};
}
function kneeFlex(l,hip){
  const a=nrm(sub(hip,l.knee)), b=nrm(sub(l.ankle,l.knee));
  return 180-Math.acos(clamp(a.x*b.x+a.y*b.y,-1,1))/D;
}
function evalSize(p,st,b,sz,i,alpha,crank){
  const g={STA:st.STA,HTA:st.HTA,drop:st.drop,cs:st.cs,tyre:st.tyre,rake:st.rake,
    wheelR:WHEEL_R[sz.wheel]+st.tyre,reach:sz.reach,stack:sz.stack,ST:sz.st,HT:sz.ht,
    saddleH:p.I*10*st.saddleK-(crank-172.5*p.H/178),crank,stemAng:st.stemAng,barReach:st.barReach,barDrop:st.barDrop,sweep:st.sweep,
    fender:st.fender,guard:st.guard,ring:st.ring,brake:st.brake,susp:st.susp,hinge:st.hinge,sp:0,stemL:0,sc:p.H/178,
    torso:b.torso,thigh:b.thigh,shin:b.shin,arm:b.arm,headR:b.headR,foot:b.foot};
  const S=saddlePt(g), hip=add(S,mul(HIP_OFF,g.sc));
  const sh=add(hip,mul(dirv(alpha),b.torso));
  // hand target from body angles, with a calibration term so frame sizes track real size charts
  const target=add(add(sh,mul(dirv(alpha+180+st.beta),b.arm*AEK)),V(st.reachAdj-(p.H-165)*0.95,st.heightAdj));
  const off=barGeom(g,V(0,0)).hand;
  const Cw=sub(target,off);
  const Ht=V(g.reach,g.stack), u=dirv(180-g.HTA);
  let opt=null;
  st.stemAngs.forEach((sa,k)=>{
    const q=dirv(90-g.HTA+sa);
    const r=sub(Cw,add(Ht,mul(u,35))), det=u.x*q.y-u.y*q.x;
    const spRaw=(r.x*q.y-q.x*r.y)/det;
    const sp=Math.round(clamp(spRaw,0,st.spMax)/5)*5;
    const r2=sub(r,mul(u,sp));
    const Lraw=r2.x*q.x+r2.y*q.y;
    const L=Math.round(clamp(Lraw,st.stemMin,st.stemMax)/10)*10;
    const gg=Object.assign({},g,{sp,stemL:L,stemAng:sa});
    const e=len(sub(cockpit(gg).hand,target))+(k?6:0);
    if(!opt||e<opt.e) opt={e,sp,L,sa,Lraw,spRaw};
  });
  const {sp,L,Lraw,spRaw}=opt; g.stemAng=opt.sa;
  g.sp=sp; g.stemL=L;
  const ck=cockpit(g);
  const err=len(sub(ck.hand,target));
  const expo=g.saddleH-g.ST;
  const expoMax=st.expoMax;
  const pen=Math.max(0,90-expo)*3+Math.max(0,expo-expoMax)*3;
  const score=Math.abs(L-st.stemIdeal)*0.6+err*1.4+pen;
  return {i,sz,g,score,err,expo,expoMax,Lraw,spRaw};
}
function fit(p){
  const st=STYLES[p.style], b=bodyOf(p);
  const c0=p.I<74?165:p.I<80?170:p.I<86?172.5:175;
  const crank=Math.min(c0,st.crankMax);
  const sizes=sizesFor(p.style);
  // size is chosen for a neutral back, then the cockpit is tuned for the rider's flexibility
  const cands=sizes.map((sz,i)=>evalSize(p,st,b,sz,i,st.alpha,crank));
  const pick=cands.reduce((a,c)=>c.score<a.score?c:a);
  const alpha=st.alpha-(p.flex-3)*st.alphaFlex;
  const best=evalSize(p,st,b,pick.sz,pick.i,alpha,crank);
  const g=best.g, S=saddlePt(g), hip=add(S,mul(HIP_OFF,g.sc)), ck=cockpit(g);
  const up=upperOf(g,hip,ck.hand);
  let kMin=999;
  for(let th=0;th<360;th+=5){kMin=Math.min(kMin,kneeFlex(legAt(g,hip,th),hip));}
  const R=V(-Math.sqrt(g.cs*g.cs-g.drop*g.drop),g.drop);
  const hta=g.HTA*D;
  const Fx=g.reach+(g.stack-g.drop)/Math.tan(hta)+g.rake/Math.sin(hta);
  const barW=clamp(Math.round((p.W*10+st.barAdd)/20)*20,st.barMin,st.barMax);
  return {st,best,cands,g,alpha:up.alpha,knee:kMin,drop:S.y-ck.G.y,wheelbase:Fx-R.x,barW,
    near:cands.filter(c=>c.i!==pick.i&&c.score<pick.score+14).map(c=>c.i)};
}

const api = { WHEEL_R, FOLDING_RANGE, D, V, add, sub, mul, len, nrm, dirv, angOf, clamp, ik2, HIP_OFF, ANK, AEK, STYLES, CITY, ROAD_SIZES,
  sizesFor, bodyOf, saddlePt, barGeom, cockpit, legAt, upperOf, kneeFlex, evalSize, fit };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
