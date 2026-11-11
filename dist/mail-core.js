'use strict';
const MailReview = (() => {
 const fields=['name','start','end','progress','owner','cat'];
 const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
 function validate(c){
  if(!c||typeof c.id!=='string'||!c.id||typeof c.projectId!=='string'||typeof c.summary!=='string'||!c.summary.trim()||!c.source||typeof c.source.id!=='string'||typeof c.source.subject!=='string'||typeof c.source.evidence!=='string'||!c.source.evidence.trim()||!c.proposed||typeof c.proposed!=='object')throw Error('메일 제안 형식이 올바르지 않습니다.');
  if(!safeLink(c.source.url))throw Error('Outlook 원문 링크가 올바르지 않습니다.');
  return c;
 }
 function safeLink(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password&&['outlook.office.com','outlook.office365.com','outlook.live.com'].includes(u.hostname);}catch{return false;}}
 function pending(data,items){return items.filter(c=>!data.mailReview?.[c.id]);}
 function apply(data,items,selections,at,idFactory){
  const result=JSON.parse(JSON.stringify(data));result.mailReview=result.mailReview||{};
  const seen=new Set();
  for(const selection of selections){
   const c=validate(items.find(x=>x.id===selection.id));
   if(seen.has(c.id)||result.mailReview[c.id])throw Error('이미 처리된 제안입니다.');seen.add(c.id);
   if(selection.reject){result.mailReview[c.id]={status:'dismissed',at};continue;}
   const p=result.projects.find(x=>x.id===selection.projectId),s=p?.subs.find(x=>x.id===selection.subId);
   if(!s)throw Error('반영할 하위 프로젝트를 선택해 주세요.');
   let task=selection.taskId?s.tasks.find(x=>x.id===selection.taskId):null;
   if(selection.taskId&&!task)throw Error('대상 업무가 삭제되었습니다. 다시 확인해 주세요.');
   if(task&&selection.expected&&JSON.stringify(task)!==selection.expected)throw Error('업무가 변경되었습니다. 반영 대기 화면을 다시 열어 확인해 주세요.');
   const fresh=!task,before=task?JSON.parse(JSON.stringify(task)):null;
   if(!task)task={id:idFactory(),name:'',start:'',end:'',progress:0,owner:'',cat:0,note:'',history:[]};
   for(const key of fields)if(Object.prototype.hasOwnProperty.call(selection.values,key))task[key]=selection.values[key];
   if(typeof task.name!=='string'||!task.name.trim()||!isDate(task.start)||(task.end&&(!isDate(task.end)||task.end<task.start))||!Number.isFinite(task.progress)||task.progress<0||task.progress>100||!Number.isInteger(task.cat)||task.cat<0||task.cat>=(s.categories?.length??3)||typeof task.owner!=='string')throw Error('업무명, 시작일, 종료일, 분류와 진행률을 확인해 주세요.');
   const changes=fresh?'신규 업무 등록':fields.filter(k=>task[k]!==before[k]).map(k=>k+': '+before[k]+' → '+task[k]).join(' / ');
   const text='메일 반영 · '+c.summary+(changes?'\n'+changes:'')+'\n원문: '+c.source.subject+'\n'+c.source.url;
   task.history.unshift({at,text});
   const date=new Date(at).toLocaleString('sv-SE',{timeZone:'Asia/Seoul'});
   task.note+=(task.note.trim()?'\n\n':'')+'['+date+']\n'+text;
   if(fresh)s.tasks.push(task);
   result.history.unshift({at,text:'메일 반영 · '+task.name,context:p.name+' / '+s.name});
   result.mailReview[c.id]={status:'applied',at,taskId:task.id,sourceId:c.source.id};
  }
  return result;
 }
 return {validate,safeLink,pending,apply,isDate};
})();
if(typeof module!=='undefined')module.exports=MailReview;
