'use strict';
let mailItems=[],mailBusy=false,mailExpected={},mailRequest=null;
const mailDialog=document.createElement('dialog');mailDialog.id='mail-dialog';document.body.append(mailDialog);
function mailPending(){return MailReview.pending(state,mailItems);}
function mailBadge(){const b=document.querySelector('#mail-badge');if(b)b.textContent='메일 반영 대기 '+mailPending().length;}
function mailRefresh(){if(DESKTOP)window.chrome.webview.postMessage({type:'mail-refresh'});}
function mailOptions(list,current,blank){return (blank?'<option value="">'+esc(blank)+'</option>':'')+list.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===current?'selected':'')+'>'+esc(x.name)+'</option>').join('');}
function mailDraw(){
 mailExpected={};
 mailDialog.innerHTML='<div class="mail-top"><h2>메일 반영 대기 <span class="pill">'+mailPending().length+'</span></h2><button class="secondary" id="mail-close">닫기</button></div><p>원문과 변경 내용을 확인한 후 체크한 항목만 반영합니다. 날짜가 없는 제안은 직접 입력해 주세요.</p><p class="mail-meta" id="mail-status">메일 조회는 매일 09:00 · 12:00 · 15:00 · 18:00 (한국 시간)</p><form id="mail-form" autocomplete="off">'+mailPending().map(c=>{
 const p=state.projects.find(x=>x.id===c.projectId),s=p?.subs.find(x=>x.id===c.subId);
 return '<article class="mail-card" data-mail-id="'+esc(c.id)+'"><label class="mail-select"><input type="checkbox" name="selected"><h3>'+esc(c.proposed.name||c.source.subject)+'</h3></label><p>'+esc(c.summary)+'</p><p class="mail-meta">'+esc(c.source.sender||'')+' · '+esc(c.source.receivedAt||'')+'<br>'+esc(c.source.subject)+'</p><details><summary>원문 근거와 분류 이유</summary><blockquote>'+esc(c.source.evidence)+'</blockquote><p class="mail-meta">'+esc(c.reason||'')+'</p><button type="button" class="secondary" data-mail-open="'+esc(c.id)+'">Outlook 원문 열기</button></details>'+(c.warning?'<p class="mail-warning">'+esc(c.warning)+'</p>':'')+'<div class="mail-grid"><label>프로젝트<select name="projectId">'+mailOptions(state.projects,p?.id,'프로젝트 선택')+'</select></label><label>하위 프로젝트<select name="subId">'+mailOptions(p?.subs||[],s?.id,'하위 프로젝트 선택')+'</select></label><label>반영 대상<select name="taskId"><option value="">새 업무로 등록</option>'+mailOptions(s?.tasks||[],c.taskId)+'</select></label></div><div class="mail-values"></div></article>';
 }).join('')+(!mailPending().length?'<div class="mail-empty">반영 대기 중인 메일이 없습니다.</div>':'')+'<div class="mail-bottom"><span class="mail-error" id="mail-error" role="alert"></span><div class="flex"><button type="button" class="secondary" id="mail-refresh">목록 새로고침</button><button type="button" class="secondary" id="mail-dismiss">선택 제외</button><button class="primary" type="submit">선택한 항목 반영</button></div></div></form>';
 mailDialog.querySelectorAll('.mail-card').forEach(mailFields);
}
function mailFields(card){
 const c=mailItems.find(x=>x.id===card.dataset.mailId),p=state.projects.find(x=>x.id===card.querySelector('[name=projectId]').value),s=p?.subs.find(x=>x.id===card.querySelector('[name=subId]').value),t=s?.tasks.find(x=>x.id===card.querySelector('[name=taskId]').value);
 mailExpected[c.id]=t?JSON.stringify(t):null;
 const d={name:c.proposed.name||'',start:'',end:'',progress:0,owner:'',cat:0,...t,...c.proposed};
 const field=(label,name,type='text')=>'<label>'+label+'<input autocomplete="off" name="'+name+'" type="'+type+'" value="'+esc(d[name]??'')+'" '+(name==='progress'?'min="0" max="100"':'')+'></label>';
 card.querySelector('.mail-values').innerHTML='<p class="mail-meta">'+(t?'기존 업무: '+esc(t.name)+' · '+esc(t.start)+' ~ '+esc(t.end||'미정')+' · '+t.progress+'% → 아래 값으로 반영':'신규 업무 · 진행률 미기재 시 초기값 0% (아래에서 변경 가능)')+'</p><div class="mail-grid">'+field('업무 이름','name')+field('시작일 · 미기재 시 직접 입력','start','date')+field('종료일 · 비워두면 미정','end','date')+field('담당자 · 미기재 시 미정','owner')+field('진행률 %','progress','number')+'<label>업무 메뉴<select name="cat">'+(s?categories(s):cats.map(name=>({name}))).map((x,i)=>'<option value="'+i+'" '+(i===d.cat?'selected':'')+'>'+esc(x.name)+'</option>').join('')+'</select></label></div>';
}
function mailOpen(){mailDraw();mailDialog.showModal();mailRefresh();}
document.addEventListener('click',e=>{if(e.target.closest('#mail-badge'))mailOpen();});
mailDialog.addEventListener('cancel',e=>{if(mailBusy)e.preventDefault();});
mailDialog.addEventListener('change',e=>{
 const card=e.target.closest('.mail-card');if(!card)return;
 const p=state.projects.find(x=>x.id===card.querySelector('[name=projectId]').value);
 if(e.target.name==='projectId')card.querySelector('[name=subId]').innerHTML=mailOptions(p?.subs||[],'','하위 프로젝트 선택');
 if(['projectId','subId'].includes(e.target.name)){const s=p?.subs.find(x=>x.id===card.querySelector('[name=subId]').value);card.querySelector('[name=taskId]').innerHTML='<option value="">새 업무로 등록</option>'+mailOptions(s?.tasks||[],'');}
 if(['projectId','subId','taskId'].includes(e.target.name))mailFields(card);
});
mailDialog.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b||mailBusy)return;
 if(b.id==='mail-close')mailDialog.close();
 if(b.id==='mail-refresh'){mailDraw();mailRefresh();}
 if(b.id==='mail-dismiss')mailCommit(true);
 if(b.dataset.mailOpen){const c=mailItems.find(x=>x.id===b.dataset.mailOpen);if(MailReview.safeLink(c.source.url)&&DESKTOP)window.chrome.webview.postMessage({type:'mail-open',url:c.source.url});}
});
mailDialog.addEventListener('submit',e=>{e.preventDefault();mailCommit(false);});
function mailCommit(reject){
 if(mailBusy||corruptData)return;
 try{
  const selections=[...mailDialog.querySelectorAll('.mail-card')].filter(card=>card.querySelector('[name=selected]').checked).map(card=>{
   const get=n=>card.querySelector('[name='+n+']').value;
   return {id:card.dataset.mailId,reject,projectId:get('projectId'),subId:get('subId'),taskId:get('taskId'),expected:mailExpected[card.dataset.mailId],values:{name:get('name').trim(),start:get('start'),end:get('end'),owner:get('owner').trim(),progress:Number(get('progress')),cat:Number(get('cat'))}};
  });
  if(!selections.length)throw Error('먼저 반영할 항목을 체크해 주세요.');
  const next=MailReview.apply(state,mailItems,selections,stamp(),uid);
  if(!valid(next))throw Error('일정 정보를 확인해 주세요.');
  if(!confirm(selections.length+'개 항목을 '+(reject?'대기 목록에서 제외':'일정과 변경 기록에 반영')+'할까요?'))return;
  if(!DESKTOP)throw Error('Orbit 데스크톱에서 반영해 주세요.');
  mailBusy=true;mailRequest={id:uid(),next};mailDialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=true);
  window.chrome.webview.postMessage({type:'mail-commit',requestId:mailRequest.id,data:next});
 }catch(err){mailDialog.querySelector('#mail-error').textContent=err.message;}
}
if(DESKTOP){
 window.chrome.webview.addEventListener('message',e=>{
  const m=e.data;
  if(m.type==='mail-queue'){
   const validItems=[];for(const c of m.items||[]){try{MailReview.validate(c);validItems.push(c);}catch{}}
   mailItems=validItems;mailBadge();
   const status=mailDialog.querySelector('#mail-status');if(status)status.textContent=m.message+' · 닫았다 다시 열거나 목록 새로고침으로 새 항목을 표시합니다.';
  }
  if(m.type==='mail-committed'&&m.requestId===mailRequest?.id){state=mailRequest.next;mailBusy=false;mailRequest=null;render();mailDraw();mailBadge();toast('선택한 메일을 처리했습니다.');}
  if(m.type==='mail-failed'&&m.requestId===mailRequest?.id){mailBusy=false;mailRequest=null;mailDialog.querySelectorAll('button,input,select').forEach(el=>el.disabled=false);mailDialog.querySelector('#mail-error').textContent=m.message;}
 });
 mailRefresh();setInterval(mailRefresh,15000);
}
new MutationObserver(mailBadge).observe(document.querySelector('#app'),{childList:true});
