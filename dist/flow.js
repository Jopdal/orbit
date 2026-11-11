'use strict';
const flowViews=new Map();
let currentFlow=null;
function taskIntersects(task,start,end){return daynum(task.start)<end&&(!task.end||daynum(task.end)+1>start);}
function wheelPixels(event){const value=Math.abs(event.deltaY)>=Math.abs(event.deltaX)?event.deltaY:event.deltaX;return value*(event.deltaMode===1?24:event.deltaMode===2?600:1);}
function springStep(position,target,velocity,dt){const step=Math.min(.032,Math.max(.001,dt));const acceleration=125*(target-position)-23*velocity;const nextVelocity=velocity+acceleration*step;return {position:position+nextVelocity*step,velocity:nextVelocity};}
function flowTimeline(rows){
 return '<section class="timeline-panel flow-panel"><div class="toolbar"><div class="flex"><h2 style="font-size:14px">업무 타임라인</h2><div class="segment"><button data-span="14" class="'+(span===14?'active':'')+'">2주</button><button data-span="30" class="'+(span===30?'active':'')+'">월간</button></div></div><div class="flex"><input class="search" aria-label="일정 검색" autocomplete="off" placeholder="일정 검색..." value="'+esc(filter)+'"><button class="quiet" data-action="today">오늘</button><b class="flow-period"></b></div></div><div class="flow-surface" role="region" aria-label="마우스 휠로 좌우 이동하는 업무 타임라인"><div class="flow-header"><div class="flow-label-head">업무 / 담당자</div><div class="flow-date-clip"><div class="flow-dates"></div></div></div><div class="flow-body"><div class="flow-rows"></div><div class="flow-empty" hidden>이 날짜 범위에 해당하는 업무가 없습니다.</div></div><div class="flow-today-line"><span>오늘</span></div><div class="flow-reference-line"><span></span></div></div><div class="legend"><span><i style="--color:#9271d9"></i>오늘 기준선</span><span><i style="--color:#55a9b7"></i>탐색 기준선</span><span class="hint">마우스 휠로 과거 · 미래 이동</span></div></section>';
}
function setupFlow(){
 if(currentFlow){cancelAnimationFrame(currentFlow.raf);currentFlow.observer?.disconnect();currentFlow=null;}
 const surface=$('.flow-surface');if(!surface)return;
 const key=subId,cached=flowViews.get(key),start=cached?.position??windowStart;
 const f={surface,key,position:start,target:start,velocity:0,raf:0,last:0,cell:span===14?76:42,nodes:new Map(),width:0,daysKey:'',visibleKey:'',all:sub().tasks.filter(t=>t.name.toLowerCase().includes(filter.toLowerCase())),reduced:matchMedia('(prefers-reduced-motion: reduce)').matches};
 currentFlow=f;surface.style.setProperty('--cell',f.cell+'px');
 f.observer=new ResizeObserver(()=>paintFlow(f));f.observer.observe(surface);paintFlow(f);
}
function flowRow(task){
 return '<div class="flow-row-label"><span class="mini-icon">'+icon(categories()[task.cat]?.icon)+'</span><button class="label-copy" data-task="'+task.id+'"><b>'+esc(task.name)+'</b><small>'+esc(task.owner||'담당자 미정')+'</small></button></div><div class="flow-track"><button class="bar flow-bar '+(!task.end?'open-ended':'')+'" data-task="'+task.id+'" style="--color:'+taskColor(task)+'" title="'+esc(task.name)+' · '+short(task.start)+' ~ '+short(task.end)+'"><i class="bar-fill" style="width:'+task.progress+'%"></i><span>'+esc(task.name)+'</span><span class="percent">'+task.progress+'%'+(!task.end?' ∞':'')+'</span></button></div>';
}
function flowReference(position,cell,todayDay){const x=3.5*cell,todayX=(todayDay+.5-position)*cell;return {x,day:Math.floor(position+3.5),merged:Math.abs(todayX-x)<1};}
function paintFlow(f){
 if(!f.surface.isConnected)return;
 const body=f.surface.querySelector('.flow-body');const width=Math.max(1,body.clientWidth-250),end=f.position+width/f.cell;
 f.surface.querySelector('.flow-header').style.paddingRight=(f.surface.clientWidth-body.clientWidth)+'px';f.width=width;flowViews.set(f.key,{position:f.position});
 const first=Math.floor(f.position),count=Math.ceil(width/f.cell)+2,daysKey=first+':'+count+':'+f.cell;
 const dates=f.surface.querySelector('.flow-dates');
 if(f.daysKey!==daysKey){dates.innerHTML=Array.from({length:count},(_,i)=>{const value=first+i,d=dateAt(value);return '<div class="flow-day '+(value===daynum(today())?'today':'')+'" title="'+d+'"><small>'+['일','월','화','수','목','금','토'][new Date(d).getUTCDay()]+'</small><span>'+Number(d.slice(5,7))+'/'+Number(d.slice(-2))+'</span></div>';}).join('');f.daysKey=daysKey;}
 dates.style.transform='translateX('+(-(f.position-first)*f.cell)+'px)';
 const rows=f.surface.querySelector('.flow-rows'),visible=f.all.filter(t=>taskIntersects(t,f.position,end)),wanted=new Set(visible.map(t=>t.id));
 rows.style.height=Math.max(90,visible.length*64)+'px';
 f.surface.querySelector('.flow-empty').hidden=visible.length>0;
 visible.forEach((task,index)=>{
   let entry=f.nodes.get(task.id);
   if(!entry){const element=document.createElement('div');element.className='flow-row';element.dataset.row=task.id;element.innerHTML=flowRow(task);rows.appendChild(element);entry={element,animation:null,timer:null};f.nodes.set(task.id,entry);if(!f.reduced)entry.animation=element.animate([{opacity:0,transform:'translateY(64px) scale(.97)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:560,easing:'cubic-bezier(.65,0,.2,1)'});}
   if(entry.timer){clearTimeout(entry.timer);entry.timer=null;entry.animation?.cancel();entry.element.classList.remove('flow-leaving');}
   const element=entry.element;element.style.top=(index*64)+'px';element.style.pointerEvents='';
   const track=element.querySelector('.flow-track');track.style.backgroundPositionX=(-(f.position-first)*f.cell)+'px';
   const left=Math.max(0,(daynum(task.start)-f.position)*f.cell),right=task.end?Math.min(width,(daynum(task.end)+1-f.position)*f.cell):width;
   const bar=element.querySelector('.flow-bar');bar.style.left=left+'px';bar.style.width=Math.max(1,right-left)+'px';
 });
 f.nodes.forEach((entry,id)=>{if(wanted.has(id)||entry.timer)return;entry.element.style.pointerEvents='none';entry.element.classList.add('flow-leaving');entry.animation?.cancel();if(!f.reduced)entry.animation=entry.element.animate([{opacity:1,transform:'translateY(0) scale(1)'},{opacity:0,transform:'translateY(64px) scale(.97)'}],{duration:400,easing:'cubic-bezier(.65,0,.2,1)',fill:'forwards'});entry.timer=setTimeout(()=>{entry.element.remove();f.nodes.delete(id);},f.reduced?0:400);});
 const todayLine=f.surface.querySelector('.flow-today-line'),todayX=(daynum(today())+.5-f.position)*f.cell;
 todayLine.hidden=todayX<0||todayX>width;todayLine.style.left=(250+todayX)+'px';
 const reference=flowReference(f.position,f.cell,daynum(today())),focusDate=dateAt(reference.day);
 const referenceLine=f.surface.querySelector('.flow-reference-line');
 referenceLine.style.left=(250+reference.x)+'px';
 referenceLine.hidden=reference.merged||reference.x>width;
 referenceLine.querySelector('span').textContent=focusDate.replaceAll('-','.');
 f.surface.closest('.flow-panel').querySelector('.flow-period').textContent=focusDate.slice(0,7).replace('-','. ');
}
function moveFlow(target){
 const f=currentFlow;if(!f)return;
 f.target=Math.max(daynum(today())-36500,Math.min(daynum(today())+36500,target));
 if(f.reduced){f.position=f.target;f.velocity=0;paintFlow(f);return;}
 if(f.raf)return;f.last=performance.now();
 function frame(now){if(currentFlow!==f||!f.surface.isConnected)return;const next=springStep(f.position,f.target,f.velocity,(now-f.last)/1000);f.last=now;f.position=next.position;f.velocity=next.velocity;paintFlow(f);if(Math.abs(f.target-f.position)<.002&&Math.abs(f.velocity)<.008){f.position=f.target;f.velocity=0;f.raf=0;paintFlow(f);return;}f.raf=requestAnimationFrame(frame);}
 f.raf=requestAnimationFrame(frame);
}
function moveTimelineToToday(){moveFlow(daynum(today())-3);}
function shiftLiveTimeline(direction){if(currentFlow)moveFlow(currentFlow.target+direction*span);}
document.addEventListener('wheel',e=>{if(!e.target.closest('.flow-surface')||e.ctrlKey||!currentFlow)return;e.preventDefault();moveFlow(currentFlow.target+wheelPixels(e)/currentFlow.cell*.9);},{passive:false});
