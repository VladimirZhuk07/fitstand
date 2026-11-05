// Фитстенд — отрисовка велосипеда сбоку (SVG-разметка, мм, ось y вверх). Без DOM.
// Функции модели (V, add, cockpit, legAt …) берутся из глобальной области: их кладёт model.js.
(function (root) {
const fx=n=>n.toFixed(1);
const P=v=>`${fx(v.x)},${fx(-v.y)}`;
function L_(a,b,cls,w,extra=''){return `<line class="${cls}" x1="${fx(a.x)}" y1="${fx(-a.y)}" x2="${fx(b.x)}" y2="${fx(-b.y)}" stroke-width="${w}" ${extra}/>`}
function arcPts(c,r,a0,a1,n=24){let s=[];for(let i=0;i<=n;i++){const a=(a0+(a1-a0)*i/n)*D;s.push(P(V(c.x+r*Math.cos(a),c.y+r*Math.sin(a))));}return s.join(' ')}
function wheel(c,g,id){
  const r=g.wheelR, rimR=r-g.tyre-5;
  let sp='';
  for(let i=0;i<20;i++){const a=i*18*D, a2=a+(i%2?0.35:-0.35);
    const h=V(c.x+26*Math.cos(a2),c.y+26*Math.sin(a2)), e=V(c.x+rimR*Math.cos(a),c.y+rimR*Math.sin(a));sp+=L_(h,e,'s-metal',2.6);}
  // rim: spokes, rim, hub; tyre: the rubber — two parts on the drawing
  return {
    rim:`<g${id?` id="${id}"`:''}>${sp}</g>
  <circle class="s-rim nf" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="${fx(rimR)}" stroke-width="13"/>
  <circle class="f-metal" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="30"/><circle class="f-panel" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="9"/>`,
    tyre:`<circle class="s-tyre nf" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="${fx(r-g.tyre/2)}" stroke-width="${fx(g.tyre)}"/>`,
  };
}
function geomPts(g){
  const sta=g.STA*D, hta=g.HTA*D;
  const sd=V(-Math.cos(sta),Math.sin(sta));
  const R=V(-Math.sqrt(g.cs*g.cs-g.drop*g.drop),g.drop);
  const ck=cockpit(g);
  const Hb=sub(ck.Ht,mul(ck.u,g.HT));
  const F=V(g.reach+(g.stack-g.drop)/Math.tan(hta)+g.rake/Math.sin(hta),g.drop);
  const S=saddlePt(g), hip=add(S,mul(HIP_OFF,g.sc));
  const up=upperOf(g,hip,ck.hand);
  return {sta,hta,sd,R,ck,Hb,F,S,hip,up,ground:g.drop-g.wheelR};
}
// brakes: disc rotor + caliper, or a rim caliper where the fork / seat stay crosses the rim
function brakesMarkup(g,R,F,crown,stayTop){
  if(g.brake==='none') return '<g data-k="noBrakes"></g>';
  const rimR=g.wheelR-g.tyre-5;
  if(g.brake==='disc'){
    let s='';
    for(const [c,ang] of [[R,-150],[F,-30]]){
      const p=add(c,mul(dirv(ang),80)), t=dirv(ang+90);
      s+=`<circle class="s-metal nf" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="80" stroke-width="8"/>`;
      s+=L_(add(p,mul(t,-25)),add(p,mul(t,25)),'s-ink',22);
    }
    return `<g data-k="disc">${s}</g>`;
  }
  let s='';
  for(const [c,top] of [[F,crown],[R,stayTop]]){
    const d=nrm(sub(top,c)), n=V(-d.y,d.x), p=add(c,mul(d,g.wheelR+20));
    s+=L_(add(p,mul(n,-28)),add(p,mul(n,28)),'s-ink',14);
  }
  return `<g data-k="rim">${s}</g>`;
}
// одноколёсный: колесо, штырь от оси к седлу, шатуны на оси
function unicycleMarkup(g,hl){
  const part=(name,inner)=>`<g data-part="${name}"${hl===name?' data-on':''}>${inner}</g>`;
  const C=V(0,0), S=V(0,g.saddleH), top=V(0,g.wheelR+50), ground=-g.wheelR;
  const pN=mul(dirv(-30),g.crank), pF=mul(dirv(150),g.crank);
  let s=`<ellipse class="shadow" cx="0" cy="${fx(-ground)}" rx="${fx(g.wheelR*0.9)}" ry="18"/>`;
  s+=`<line class="ground" x1="${fx(-g.wheelR-600)}" y1="${fx(-ground)}" x2="${fx(g.wheelR+600)}" y2="${fx(-ground)}"/>`;
  s+=`<g opacity=".42">${L_(C,pF,'s-ink',24)}${L_(add(pF,V(-48,0)),add(pF,V(48,0)),'s-ink',20)}</g>`;
  const w=wheel(C,g,null);
  s+=part('rims',w.rim)+part('tyres',w.tyre);
  s+=part('frame',`<g data-k="unicycle">${L_(add(C,V(-34,0)),add(top,V(-34,0)),'s-frame',22)}${L_(add(C,V(34,0)),add(top,V(34,0)),'s-frame',22)}${L_(add(top,V(-40,0)),add(top,V(40,0)),'s-frame',26)}</g>`);
  s+=part('fork','')+part('brakes','')+part('cockpit','');
  s+=part('saddle',L_(top,S,'s-metal',24)+`<path class="f-ink" d="M${P(add(S,V(-110,4)))} C${P(add(S,V(-40,8)))} ${P(add(S,V(40,8)))} ${P(add(S,V(110,4)))} Q${P(add(S,V(118,-22)))} ${P(add(S,V(80,-26)))} L${P(add(S,V(-80,-26)))} Q${P(add(S,V(-118,-22)))} ${P(add(S,V(-110,4)))} Z"/>`);
  s+=part('drivetrain',L_(C,pN,'s-ink',28)+'<circle class="f-metal" cx="0" cy="0" r="16"/>');
  s+=part('pedals',L_(add(pN,V(-48,0)),add(pN,V(48,0)),'s-ink',22));
  return hl?`<g class="hl" data-hl="${hl}">${s}</g>`:s;
}
function bikeMarkup(g,ux,opts={}){
  const live=opts.live!==false, motor=!!opts.motor, hl=opts.highlight||null;
  if(g.unicycle&&!live) return unicycleMarkup(g,hl);
  const {sd,R,ck,Hb,F,S,hip,up,ground,hta}=geomPts(g);
  const BB=V(0,0), u=ck.u;
  const part=(name,inner)=>`<g data-part="${name}"${hl===name?' data-on':''}>${inner}</g>`;
  const id=n=>live?` id="${n}"`:'';
  const th=-30, pN=mul(dirv(th),g.crank), pF=mul(dirv(th+180),g.crank);
  const crankAt=(p,w)=>live?'':` x1="0" y1="0" x2="${fx(p.x)}" y2="${fx(-p.y)}"`;
  const pedalAt=p=>live?'':` x1="${fx(p.x-48)}" y1="${fx(-p.y)}" x2="${fx(p.x+48)}" y2="${fx(-p.y)}"`;
  const pedals=!g.noPedals, chain=pedals&&!g.frontPedals;
  let s='';
  // grid + ground
  const gx0=R.x-g.wheelR-2000, gx1=F.x+g.wheelR+2000;
  if(live) s+=`<rect x="${fx(gx0)}" y="-4000" width="${fx(gx1-gx0)}" height="${fx(4000-ground+400)}" fill="url(#grid)" />`;
  s+=`<ellipse class="shadow" cx="${fx((R.x+F.x)/2)}" cy="${fx(-ground)}" rx="${fx((F.x-R.x)/2+g.wheelR*0.8)}" ry="18"/>`;
  s+=`<line class="ground" x1="${fx(gx0)}" y1="${fx(-ground)}" x2="${fx(gx1)}" y2="${fx(-ground)}"/>`;
  // far side: crank, pedal, leg
  if(pedals&&!g.frontPedals) s+=`<g opacity=".42"><line${id('fCrank')} class="s-ink" stroke-width="24"${crankAt(pF)}/><line${id('fPedal')} class="s-ink" stroke-width="20"${pedalAt(pF)}/></g>`;
  if(live) s+=`<g class="rider" opacity=".36"><line id="fThigh" class="s-rider" stroke-width="${fx(g.headR*0.72)}"/><line id="fShin" class="s-rider" stroke-width="${fx(g.headR*0.54)}"/><line id="fFoot" class="s-rider" stroke-width="${fx(g.headR*0.36)}"/></g>`;
  // wheels + fenders
  let rims='', tyres='';
  if(g.trike){const w=wheel(add(R,V(-46,0)),g,null);tyres+=`<g data-k="trike" opacity=".45">${w.tyre}</g>`;rims+=`<g opacity=".45">${w.rim}</g>`;}
  for(const [c,id] of [[R,'wR'],[F,'wF']]){const w=wheel(c,g,live?id:null);tyres+=w.tyre;rims+=w.rim;}
  if(g.trainingWheels){
    const r=g.wheelR*0.42, c=V(R.x-40,ground+r);
    tyres+=`<circle class="s-tyre nf" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="${fx(r-9)}" stroke-width="18"/>`;
    rims+=`<g data-k="trainingWheels">${L_(R,c,'s-metal',12)}<circle class="f-metal" cx="${fx(c.x)}" cy="${fx(-c.y)}" r="12"/></g>`;
  }
  s+=part('rims',rims)+part('tyres',tyres);
  if(g.fender>0.02){
    s+=`<g opacity="${fx(g.fender)}"><polyline class="s-metal nf" stroke-width="16" points="${arcPts(R,g.wheelR+22,8,200)}"/><polyline class="s-metal nf" stroke-width="16" points="${arcPts(F,g.wheelR+22,-28,128)}"/></g>`;
  }
  // frame points
  const T=mul(sd,g.ST), Tj=mul(sd,g.ST-25);
  const HtJ=sub(ck.Ht,mul(u,24)), HbJ=add(Hb,mul(u,36));
  const stayTop=sub(Tj,mul(sd,15));
  const crown=sub(Hb,mul(u,14));
  // frame
  let fr=L_(R,BB,'s-frame',22)+L_(R,stayTop,'s-frame',18);
  // top tube: from the head tube to the seat tube top, or down to a third of the seat tube on a step-through frame
  const ttEnd=g.stepThrough?mul(sd,g.ST*0.35):Tj;
  const tt=L_(ttEnd,HtJ,'s-frame',30);
  fr+=L_(BB,T,'s-frame',32)+(g.stepThrough?`<g data-k="stepThrough">${tt}</g>`:tt)+L_(BB,HbJ,'s-frame',40);
  fr+=L_(sub(Hb,mul(u,8)),add(ck.Ht,mul(u,4)),'s-frame',48);
  fr+=`<circle class="s-frame nf" cx="${fx(R.x)}" cy="${fx(-R.y)}" r="1" stroke-width="22"/>`;
  if(g.rearShock){
    const a=mul(sd,g.ST*0.55), b=add(R,mul(sub(stayTop,R),0.45));
    fr+=`<g data-k="rearShock">${L_(a,b,'s-ink',30)}${L_(add(a,mul(nrm(sub(b,a)),40)),sub(b,mul(nrm(sub(b,a)),40)),'s-metal',14)}<circle class="f-ink" cx="0" cy="0" r="30"/></g>`;
  }
  if(g.hinge){const m=mul(add(ttEnd,HtJ),0.5);fr+=`<circle data-k="hinge" class="f-panel s-ink" cx="${fx(m.x)}" cy="${fx(-m.y)}" r="26" stroke-width="8"/>`;}
  s+=part('frame',fr);
  // fork
  let fk;
  if(g.susp){
    const ax=nrm(sub(crown,F)), lowTop=add(F,mul(ax,len(sub(crown,F))*0.45)), n=V(-ax.y,ax.x);
    fk=L_(crown,F,'s-metal',22)+`<g data-k="susp">${L_(F,lowTop,'s-ink',36)}${L_(add(crown,mul(n,-30)),add(crown,mul(n,30)),'s-frame',24)}</g>`;
  }else{
    const axisCtl=V(g.reach+(g.stack-(g.drop+180))/Math.tan(hta),g.drop+180);
    fk=`<path class="s-frame nf" stroke-width="24" d="M${P(crown)} Q${P(axisCtl)} ${P(F)}"/>`;
  }
  s+=part('fork',fk);
  if(g.cargoBox){
    const x0=F.x-g.wheelR*0.85, x1=F.x+g.wheelR*0.9, y0=F.y+g.wheelR+40, y1=y0+260;
    s+=`<g data-k="cargoBox"><path class="f-panel s-ink" stroke-width="12" d="M${P(V(x0,y0))} L${P(V(x1,y0))} L${P(V(x1,y1))} L${P(V(x0,y1))} Z"/>${L_(V(x0+20,y0),HbJ,'s-metal',14)}</g>`;
  }
  // brakes over the frame and fork, so rim calipers stay visible
  s+=part('brakes',brakesMarkup(g,R,F,crown,stayTop));
  // motor + battery
  if(motor){
    const dt=sub(HbJ,BB);
    s+=`<g data-k="motor">${L_(mul(dt,0.25),mul(dt,0.8),'s-ink',70)}<circle class="f-metal" cx="0" cy="0" r="70"/></g>`;
  }
  // cockpit: steerer, spacers, stem, handlebar
  let cp=L_(add(ck.Ht,mul(u,8)),ck.spTop,'s-metal',38)+L_(ck.spTop,ck.steerTop,'s-ink',40)+L_(ck.stemBase,ck.C,'s-ink',30);
  cp+=`<circle class="f-ink" cx="${fx(ck.C.x)}" cy="${fx(-ck.C.y)}" r="24"/>`;
  const {G,dk,sk}=ck;
  const ctl=add(ck.C,V((g.barReach-g.sweep)*0.55,32*sk+4));
  let bar=`M${P(ck.C)} Q${P(ctl)} ${P(G)}`;
  if(dk>0.02){const E=add(G,V(-15*dk,-g.barDrop)), E2=add(G,V(-95*dk,-g.barDrop+8*dk));
    bar+=` C${P(add(G,V(58*dk,-6*dk)))} ${P(add(G,V(58*dk,-g.barDrop*0.92)))} ${P(E)} L${P(E2)}`;}
  cp+=`<path class="s-ink nf" stroke-width="25" d="${bar}"/>`;
  if(dk>0.02){
    cp+=`<g opacity="${fx(dk)}"><path class="f-ink" d="M${P(add(G,V(-14,-4)))} Q${P(add(G,V(-6,38*dk)))} ${P(add(G,V(28*dk,34*dk)))} Q${P(add(G,V(56*dk,30*dk)))} ${P(add(G,V(48*dk,-26*dk)))} L${P(add(G,V(26*dk,-30*dk)))} Z"/>${L_(add(G,V(40*dk,-24*dk)),add(G,V(30*dk,-108*dk)),'s-ink',12)}</g>`;
  }
  if(sk>0.02) cp+=`<g opacity="${fx(sk)}">${L_(add(G,V(30*sk,-2*sk)),add(G,V(-75*sk,4*sk)),'s-rider',40)}</g>`;
  s+=part('cockpit',cp);
  // saddle + seatpost
  let sa=L_(add(S,mul(sd,-48)),T,'s-metal',24);
  if(g.suspPost) sa+=`<g data-k="suspPost">${L_(T,add(T,mul(sd,40)),'s-ink',34)}</g>`;
  sa+=`<path class="f-ink" d="M${P(add(S,V(-118,4)))} C${P(add(S,V(-40,2)))} ${P(add(S,V(60,-2)))} ${P(add(S,V(148,-10)))} Q${P(add(S,V(156,-26)))} ${P(add(S,V(122,-28)))} L${P(add(S,V(-60,-26)))} Q${P(add(S,V(-128,-24)))} ${P(add(S,V(-128,-6)))} Z"/>`;
  s+=part('saddle',sa);
  // drivetrain: chain, cassette, chainring, guard, near crank
  const rc=g.ring*12.7/(2*Math.PI), rg=34;
  let dr='', pd='';
  if(chain){
    dr+=`<g data-k="chain">${L_(V(0,rc),V(R.x,R.y+rg),'s-metal',7)}${L_(V(0,-rc),V(R.x,R.y-rg),'s-metal',7)}</g>`;
    dr+=`<circle class="s-ink nf" cx="${fx(R.x)}" cy="${fx(-R.y)}" r="${rg}" stroke-width="9"/>`;
    dr+=`<circle class="s-ink nf" cx="0" cy="0" r="${fx(rc)}" stroke-width="11"/><circle class="f-metal" cx="0" cy="0" r="38"/>`;
    if(g.guard>0.02&&g.brake!=='none') dr+=`<polyline class="s-frame nf" opacity="${fx(g.guard*0.9)}" stroke-width="30" points="${arcPts(V(0,0),rc+20,-25,205)}"/>`;
    dr+=`<line${id('nCrank')} class="s-ink" stroke-width="28"${crankAt(pN)}/><circle class="f-metal" cx="0" cy="0" r="16"/>`;
    pd=`<line${id('nPedal')} class="s-ink" stroke-width="22"${pedalAt(pN)}/>`;
  }else if(g.frontPedals){
    const a=add(F,pN), b=add(F,pF);
    dr+=`<g data-k="frontPedals"><g opacity=".42">${L_(F,b,'s-ink',20)}</g>${L_(F,a,'s-ink',24)}<circle class="f-metal" cx="${fx(F.x)}" cy="${fx(-F.y)}" r="14"/></g>`;
    pd=L_(add(a,V(-36,0)),add(a,V(36,0)),'s-ink',18);
  }else{
    dr+='<g data-k="noPedals"></g>';
  }
  s+=part('drivetrain',dr);
  s+=part('pedals',pd);
  if(live){
    // near leg + upper body
    const hr=g.headR;
    s+=`<g class="rider"><line id="nThigh" class="s-rider" stroke-width="${fx(hr*0.72)}"/><line id="nShin" class="s-rider" stroke-width="${fx(hr*0.54)}"/><line id="nFoot" class="s-rider" stroke-width="${fx(hr*0.36)}"/>`;
    s+=`<circle class="f-rider" cx="${fx(hip.x)}" cy="${fx(-hip.y)}" r="${fx(hr*0.62)}"/>`;
    s+=L_(hip,up.shoulder,'s-rider',fx(hr*1.0));
    s+=L_(up.shoulder,add(up.shoulder,mul(nrm(sub(up.head,up.shoulder)),hr*0.6)),'s-rider',fx(hr*0.42));
    s+=L_(up.shoulder,up.elbow,'s-rider',fx(hr*0.46))+L_(up.elbow,up.hand,'s-rider',fx(hr*0.38));
    s+=`<circle class="f-rider" cx="${fx(up.hand.x)}" cy="${fx(-up.hand.y)}" r="${fx(hr*0.26)}"/>`;
    s+=`<circle class="f-rider" cx="${fx(up.head.x)}" cy="${fx(-up.head.y)}" r="${fx(hr)}"/>`;
    const tilt=(90-up.alpha)*0.55, hc=up.head, R2=hr*1.1;
    s+=`<path class="f-frame" transform="rotate(${fx(tilt)} ${fx(hc.x)} ${fx(-hc.y)})" d="M${fx(hc.x-R2-8)} ${fx(-hc.y+8)} A${fx(R2)} ${fx(R2)} 0 0 1 ${fx(hc.x+R2)} ${fx(-hc.y+2)} L${fx(hc.x+R2*0.55)} ${fx(-hc.y+16)} Z"/>`;
    s+=`</g>`;
    // dimensions
    const fs=fx(12*ux), tk=6*ux;
    let d='';
    const n=V(-Math.sin(g.STA*D),-Math.cos(g.STA*D)), off=150;
    const a=add(BB,mul(n,off)), b=add(S,mul(n,off));
    const tick=(p,dir)=>L_(add(p,mul(dir,tk)),sub(p,mul(dir,tk)),'',1);
    d+=L_(a,b,'',1)+tick(a,n)+tick(b,n)+L_(add(BB,mul(n,20)),add(a,mul(n,6*ux)),'dash',1)+L_(add(S,mul(n,40)),add(b,mul(n,6*ux)),'dash',1);
    const mid=add(mul(add(a,b),0.5),mul(n,16*ux));
    d+=`<text class="halo" font-size="${fs}" text-anchor="middle" transform="translate(${P(mid).replace(',',' ')}) rotate(${fx(g.STA-180)})">седло ${Math.round(g.saddleH)}</text>`;
    const wy=ground-60;
    d+=L_(V(R.x,wy),V(F.x,wy),'',1)+L_(V(R.x,wy+tk*1.6),V(R.x,wy-tk*1.6),'',1)+L_(V(F.x,wy+tk*1.6),V(F.x,wy-tk*1.6),'',1);
    d+=`<text class="halo" font-size="${fs}" text-anchor="middle" x="${fx((R.x+F.x)/2)}" y="${fx(-wy+16*ux)}">база ${Math.round(F.x-R.x)}</text>`;
    const dx=Math.max(up.hand.x,G.x)+70, dropV=S.y-G.y;
    d+=L_(add(S,V(150,0)),V(dx+tk*1.6,S.y),'dash',1)+L_(V(dx,S.y),V(dx,G.y),'',1)+L_(V(dx-tk*1.6,G.y),V(dx+tk*1.6,G.y),'',1)+L_(V(dx-tk*1.6,S.y),V(dx+tk*1.6,S.y),'',1);
    d+=`<text class="halo" font-size="${fs}" x="${fx(dx+9*ux)}" y="${fx(-(S.y+G.y)/2+4*ux)}">${dropV>=0?'перепад':'руль выше'} ${Math.abs(Math.round(dropV))}</text>`;
    s+=`<g class="dims">${d}</g>`;
  }
  return hl?`<g class="hl" data-hl="${hl}">${s}</g>`:s;
}
function boundsOf(g,rider,ux){
  if(g.unicycle) return {x:-g.wheelR-200,y:-(g.saddleH+120),w:2*g.wheelR+400,h:g.saddleH+120+g.wheelR+80};
  const {R,F,ck,S,up,ground}=geomPts(g);
  const minX=R.x-g.wheelR-70, maxX=Math.max(F.x+g.wheelR+50,Math.max(up.hand.x,ck.G.x)+70+130*ux);
  const minY=ground-60-34*ux;
  const top=(rider?up.head.y+g.headR*1.25+50:Math.max(S.y,ck.steerTop.y,ck.G.y)+110)+56*ux;
  return {x:minX,y:-top,w:maxX-minX,h:top-minY};
}

const api = { fx, P, L_, arcPts, wheel, geomPts, bikeMarkup, boundsOf };
if (typeof module === 'object' && module.exports) module.exports = api;
else Object.assign(root, api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
