import fs from 'node:fs';
const path='dist/app.js';
let source=fs.readFileSync(path,'utf8');
function replace(a,b){if(!source.includes(a))throw Error('Missing edit target: '+a.slice(0,80));source=source.replace(a,b);}
replace("const catIcons=['box','chip','file'];",`const catIcons=['box','chip','file'];
Object.assign(icons,{
 calendar:'<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18M8 15h2m4 0h2"/>',
 people:'<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/>',
 flag:'<path d="M5 21V3m0 1c5-4 9 4 14 0v10c-5 4-9-4-14 0"/>',
 tool:'<path d="m14 6 4 4 3-3a6 6 0 0 1-8 7l-7 7-3-3 7-7a6 6 0 0 1 7-8Z"/>'
});
const categoryIconChoices=[['box','자재'],['chip','회로'],['file','문서'],['calendar','일정'],['clock','시간'],['check','완료'],['people','협업'],['flag','목표'],['tool','도구'],['orbit','프로젝트']];
function categories(s=sub()){return s?.categories||cats.map((name,i)=>({name,icon:catIcons[i]}));}
function categoryColor(i){return palette[i%palette.length];}
function validCategories(s){return s.categories===undefined||(Array.isArray(s.categories)&&s.categories.length>0&&s.categories.every(c=>c&&typeof c.name==='string'&&c.name.trim().length>0&&c.name.length<=40&&categoryIconChoices.some(([key])=>key===c.icon)));}
`);
replace("palette.includes(s.color)&&date(s.start)","palette.includes(s.color)&&validCategories(s)&&date(s.start)");
replace("t.cat>=0&&t.cat<3","t.cat>=0&&t.cat<(s.categories?.length??3)");
replace("color=isTask?palette[r.cat]:r.color","color=isTask?categoryColor(r.cat):r.color");
replace("icon(catIcons[r.cat])","icon(categories()[r.cat]?.icon)");
replace("'<div class=\"category-grid\">'+cats.map((c,i)=>", "'<div class=\"category-toolbar\"><h2>업무별 현황</h2><button class=\"secondary\" data-action=\"category-settings\">'+icon('settings')+'메뉴 설정</button></div><div class=\"category-grid\" style=\"--category-columns:'+Math.min(categories(s).length,5)+'\">'+categories(s).map((c,i)=>");
replace("icon(catIcons[i])+'</span><b>'+c", "icon(c.icon)+'</span><b>'+esc(c.name)");
replace("style=\"--color:'+palette[i]+'\"><i", "style=\"--color:'+categoryColor(i)+'\"><i");
replace("'+i+'\">+ '+c+' 업무 추가", "'+i+'\">+ '+esc(c.name)+' 업무 추가");
replace("cats.map((c,i)=>'<option", "categories().map((c,i)=>'<option");
replace("+'>'+c+'</option>'", "+'>'+esc(c.name)+'</option>'");
replace("'분류: '+cats[item.cat]", "'분류: '+categories()[item.cat].name");
replace("case 'settings':settings();break;","case 'settings':settings();break;case 'category-settings':categorySettings();break;");
fs.writeFileSync(path,source);
