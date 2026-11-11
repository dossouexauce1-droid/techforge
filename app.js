document.documentElement.classList.add('js');
const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Menu mobile */
const toggle=document.querySelector('.menu-toggle'),nav=document.querySelector('#navigation');
const closeMenu=()=>{nav.classList.remove('open');toggle.setAttribute('aria-expanded','false');};
toggle?.addEventListener('click',()=>toggle.setAttribute('aria-expanded',String(nav.classList.toggle('open'))));
nav?.querySelectorAll('a').forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});

/* Onglets des programmes */
const tabs=[...document.querySelectorAll('[role=tab]')];
function activate(tab){tabs.forEach(t=>{const active=t===tab;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;document.getElementById(t.getAttribute('aria-controls')).hidden=!active;});}
tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>activate(tab));tab.addEventListener('keydown',e=>{let next;if(e.key==='ArrowRight')next=(index+1)%tabs.length;if(e.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();activate(tabs[next]);tabs[next].focus();}});});

/* Heure locale du Bénin */
const clock=document.getElementById('clock');
if(clock){
  const format=new Intl.DateTimeFormat('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Africa/Porto-Novo'});
  const tick=()=>{clock.textContent='Cotonou '+format.format(new Date());};
  tick();clock.hidden=false;setInterval(tick,1000);
}

/* Barre de progression de lecture et redressement du cadre de la scène au défilement */
const progress=document.createElement('div');progress.className='progress';progress.setAttribute('aria-hidden','true');document.body.prepend(progress);
const frame=document.querySelector('.stage-frame');
function onScroll(){
  const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform=`scaleX(${max>0?scrollY/max:0})`;
  if(frame&&!reduced){const p=Math.min(1,scrollY/(innerHeight*.45));frame.style.setProperty('--tilt',(10*(1-p)).toFixed(2)+'deg');frame.style.setProperty('--zoom',(.95+.05*p).toFixed(3));}
}
addEventListener('scroll',onScroll,{passive:true});onScroll();

/* Cartes éclairées par le pointeur */
document.querySelectorAll('.card').forEach(card=>card.addEventListener('pointermove',e=>{const box=card.getBoundingClientRect();card.style.setProperty('--mx',e.clientX-box.left+'px');card.style.setProperty('--my',e.clientY-box.top+'px');}));

/* Apparitions au défilement, décalées entre voisins */
const seen=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add(entry.target.dataset.seen||'in');seen.unobserve(entry.target);}}),{threshold:.2,rootMargin:'0px 0px -6% 0px'});
document.querySelectorAll('[data-reveal]').forEach(el=>{
  const index=[...el.parentElement.children].filter(child=>child.hasAttribute('data-reveal')).indexOf(el);
  el.style.transitionDelay=index*90+'ms';seen.observe(el);
  el.addEventListener('transitionend',()=>{el.style.transitionDelay='';},{once:true});
});
document.querySelectorAll('.steps li').forEach(el=>{el.dataset.seen='on';seen.observe(el);});

/* Terminal : la commande se tape, puis les lignes arrivent */
const terminal=document.getElementById('terminal');
if(terminal){
  const cmd=terminal.querySelector('.t-cmd'),lines=[...terminal.querySelectorAll('.t-out')],text=cmd.textContent;
  if(reduced)lines.forEach(line=>line.classList.add('shown'));
  else{
    cmd.textContent='';
    new IntersectionObserver((entries,observer)=>{
      if(!entries[0].isIntersecting)return;
      observer.disconnect();cmd.classList.add('typing');let i=0;
      const type=()=>{cmd.textContent=text.slice(0,++i);if(i<text.length)setTimeout(type,38+Math.random()*50);else lines.forEach((line,n)=>setTimeout(()=>{line.classList.add('shown');if(n===lines.length-1)cmd.classList.remove('typing');},450+n*520));};
      setTimeout(type,700);
    },{threshold:.6}).observe(terminal);
  }
}

/* Scène : un véhicule en nuage de points émet des ondes qui révèlent ce qui l'entoure */
const canvas=document.getElementById('scene');
if(canvas){
  const ctx=canvas.getContext('2d'),hud={yaw:document.getElementById('hud-yaw'),obj:document.getElementById('hud-obj'),fps:document.getElementById('hud-fps')};
  const TAU=Math.PI*2,REACH=9;
  const lerp=(a,b,t)=>a+(b-a)*t;
  // Profil du véhicule vu de côté ; on en tire le toit, le dessous et les flancs
  const profile=[[-2.2,.38],[-2.14,.8],[-1.55,.98],[-.85,1.46],[.7,1.5],[1.5,1.08],[2.12,.86],[2.2,.42],[2.02,.26],[-2.02,.26]];
  const narrow=y=>lerp(1,.74,Math.max(0,Math.min(1,(y-.95)/.5)));
  const bands=10,palette=['#ff7a18','#ff6a2c','#ff5747','#ff4766','#ff3d81','#f03c9c','#d641b9','#b845d3','#9a49ea','#7c4dff'];
  const car=Array.from({length:bands},()=>[]);
  const put=(x,y,z)=>car[Math.max(0,Math.min(bands-1,Math.floor((2.2-x)/4.4*bands)))].push([x,y,z*narrow(y)]);
  profile.forEach((p,i)=>{
    const q=profile[(i+1)%profile.length],n=Math.ceil(Math.hypot(q[0]-p[0],q[1]-p[1])/.085);
    for(let k=0;k<n;k++){const x=lerp(p[0],q[0],k/n),y=lerp(p[1],q[1],k/n);for(let z=-.9;z<=.9001;z+=.1)put(x,y,z);}
  });
  const roof=profile.slice(0,8);
  const top=x=>{for(let i=0;i<roof.length-1;i++)if(x<=roof[i+1][0])return lerp(roof[i][1],roof[i+1][1],(x-roof[i][0])/(roof[i+1][0]-roof[i][0]));return .42;};
  for(let x=-2.1;x<=2.1;x+=.1)for(let y=.34;y<top(x)-.04;y+=.1)for(const z of [-.9,.9])put(x,y,z);
  const wheels=[];
  for(const cx of [-1.38,1.38])for(const side of [-1,1])for(const [r,count] of [[.37,30],[.22,18],[.08,6]])for(let i=0;i<count;i++){const a=i/count*TAU;wheels.push([cx+Math.cos(a)*r,.37+Math.sin(a)*r,side*.95]);}
  const sensor=[.1,1.74,0];
  // Sol : un champ de points que les ondes font briller
  const ground=[];
  for(let x=-REACH;x<=REACH;x+=.46)for(let z=-REACH;z<=REACH;z+=.46){const d=Math.hypot(x,z);if(d<REACH&&!(Math.abs(x)<2.3&&Math.abs(z)<1))ground.push([x,0,z,d]);}
  // Obstacles : x, z, largeur, hauteur, profondeur
  const obstacles=[[4.2,-2.4,.6,1.7,.6],[-4.8,2.9,1.8,1.1,1.1],[1.6,5,.9,.9,.9],[-3.2,-4.6,.7,1.6,.7],[6,2.4,1.3,1,1]].map(([x,z,w,h,d])=>{
    const points=[];
    for(let i=0;i<=w+.001;i+=.16)for(let j=0;j<=h+.001;j+=.16){points.push([x-w/2+i,j,z-d/2],[x-w/2+i,j,z+d/2]);}
    for(let i=0;i<=d+.001;i+=.16)for(let j=0;j<=h+.001;j+=.16){points.push([x-w/2,j,z-d/2+i],[x+w/2,j,z-d/2+i]);}
    for(let i=0;i<=w+.001;i+=.16)for(let k=0;k<=d+.001;k+=.16)points.push([x-w/2+i,h,z-d/2+k]);
    return {points,top:[x,h+.45,z],dist:Math.hypot(x,z)};
  });
  let w=0,h=0,dpr=1,yaw=.7,pitch=.34,spin=.11,clockT=0,last=0,visible=true,dragging=false,px=0,py=0,frames=0,fpsAt=0,cx=0,cy=0,focal=0;
  function resize(){
    dpr=Math.min(devicePixelRatio||1,2);w=canvas.clientWidth;h=canvas.clientHeight;
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    cx=w/2;cy=h*.5;focal=Math.min(w*1.3,h*2.15);
    if(reduced)draw(0);
  }
  let sinY=0,cosY=1,sinP=0,cosP=1;
  const out=[0,0,0];
  function project(p){
    const x=p[0]*cosY-p[2]*sinY,z=p[0]*sinY+p[2]*cosY,y=p[1]*cosP-z*sinP,depth=p[1]*sinP+z*cosP+15;
    out[0]=cx+x*focal/depth;out[1]=cy-(y-.7)*focal/depth;out[2]=depth;return out;
  }
  function dot(p,size,alpha){const q=project(p),s=size*focal/q[2]/60;ctx.globalAlpha=alpha;ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s);}
  const waves=[0,0,0];
  const ripple=d=>{let best=0;for(const r of waves){const g=Math.exp(-((d-r)*(d-r))/.1)*(1-r/REACH);if(g>best)best=g;}return best;};
  function draw(dt){
    clockT+=dt;yaw+=spin*dt;
    for(let k=0;k<3;k++)waves[k]=((clockT*1.9+k*REACH/3)%REACH);
    sinY=Math.sin(yaw);cosY=Math.cos(yaw);sinP=Math.sin(pitch);cosP=Math.cos(pitch);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.clearRect(0,0,w,h);
    // Lueur sous le véhicule
    const c=project([0,0,0]),glowR=focal/c[2]*3.4,glow=ctx.createRadialGradient(c[0],c[1],0,c[0],c[1],glowR);
    glow.addColorStop(0,'rgba(255,61,129,.34)');glow.addColorStop(.5,'rgba(124,77,255,.14)');glow.addColorStop(1,'rgba(124,77,255,0)');
    ctx.save();ctx.translate(c[0],c[1]);ctx.scale(1,.38);ctx.translate(-c[0],-c[1]);ctx.fillStyle=glow;ctx.fillRect(c[0]-glowR,c[1]-glowR,glowR*2,glowR*2);ctx.restore();
    ctx.globalCompositeOperation='lighter';
    // Sol
    ctx.fillStyle='#8f96ff';
    for(const p of ground)dot(p,1.5,.2*(1-p[3]/REACH)+.04);
    ctx.fillStyle='#4fe3ff';
    for(const p of ground){const g=ripple(p[3]);if(g>.04)dot([p[0],g*.22,p[2]],1.6+g*2.4,g);}
    // Obstacles
    let tracked=0;const labels=[];
    for(const o of obstacles){
      const g=ripple(o.dist),lit=Math.min(1,g*2.2);if(lit>.25)tracked++;
      ctx.fillStyle='#8f96ff';for(const p of o.points)dot(p,1.7,.3);
      if(lit>.03){ctx.fillStyle='#ffb36b';for(const p of o.points)dot(p,2.3,lit*.9);}
      if(lit>.2){const q=project(o.top);labels.push([q[0],q[1],o.dist,Math.min(1,lit*1.4)]);}
    }
    // Véhicule
    car.forEach((points,band)=>{ctx.fillStyle=palette[band];for(const p of points){const q=project(p),s=2.1*focal/q[2]/60;ctx.globalAlpha=Math.max(.2,Math.min(1,1.9-q[2]/12));ctx.fillRect(q[0]-s/2,q[1]-s/2,s,s);}});
    ctx.fillStyle='#ffffff';for(const p of wheels)dot(p,2.2,.85);
    const s=project(sensor),pulse=.6+.4*Math.sin(clockT*5.8);
    const halo=ctx.createRadialGradient(s[0],s[1],0,s[0],s[1],26);halo.addColorStop(0,`rgba(79,227,255,${.9*pulse})`);halo.addColorStop(1,'rgba(79,227,255,0)');
    ctx.globalAlpha=1;ctx.fillStyle=halo;ctx.fillRect(s[0]-26,s[1]-26,52,52);
    // Étiquettes de distance
    ctx.globalCompositeOperation='source-over';ctx.font='500 12px "JetBrains Mono",monospace';ctx.textBaseline='middle';
    for(const [x,y,dist,alpha] of labels){
      const text=dist.toFixed(1).replace('.',',')+' m',width=ctx.measureText(text).width+20;
      ctx.globalAlpha=alpha;ctx.fillStyle='rgba(20,18,32,.82)';ctx.strokeStyle='rgba(255,179,107,.7)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(x-width/2,y-12,width,24,12);ctx.fill();ctx.stroke();
      ctx.fillStyle='#ffd9b0';ctx.fillText(text,x-width/2+10,y+.5);
    }
    ctx.globalAlpha=1;
    return tracked;
  }
  function loop(now){
    const dt=Math.min(.05,(now-last)/1000||0);last=now;
    if(visible){
      const tracked=draw(dt);frames++;
      if(now-fpsAt>400){
        const deg=Math.round((((yaw*180/Math.PI)%360)+360)%360);
        hud.yaw.textContent=String(deg).padStart(3,'0')+'°';hud.obj.textContent=tracked;hud.fps.textContent=Math.round(frames*1000/(now-fpsAt));
        frames=0;fpsAt=now;
      }
    }
    requestAnimationFrame(loop);
  }
  canvas.addEventListener('pointerdown',e=>{dragging=true;px=e.clientX;py=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{
    if(!dragging)return;
    yaw+=(e.clientX-px)*.007;pitch=Math.max(.12,Math.min(.95,pitch+(e.clientY-py)*.004));px=e.clientX;py=e.clientY;
    if(reduced)draw(0);
  });
  const release=()=>{dragging=false;canvas.classList.remove('dragging');};
  canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting&&!document.hidden;}).observe(canvas);
  document.addEventListener('visibilitychange',()=>{visible=!document.hidden;});
  resize();
  if(reduced){spin=0;clockT=2.2;hud.yaw.textContent='040°';hud.obj.textContent=draw(0);hud.fps.textContent='–';}
  else requestAnimationFrame(loop);
}
