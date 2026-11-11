(function(root){'use strict';
const topics=['사무관리','부당이득','불법행위'];
const defaults={topics:[...topics],type:'mixed',conceptMode:'mcq',source:'all',count:20,shuffle:true,status:'all'};
function pool(questions,config,records={}){return questions.filter(q=>config.topics.includes(q.section)&&(config.type==='mixed'||q.type===config.type)&&(config.source==='all'||q.kind===config.source)).flatMap(q=>q.type==='concept'&&config.conceptMode==='ox'?q.text.items.map(i=>({key:i.id,parentId:q.id,mode:'ox',itemId:i.id})): [{key:q.id,parentId:q.id,mode:'mcq'}]).filter(t=>config.status!=='unseen'||!records[t.key]?.attempts);}
function shuffle(items,random=Math.random){const out=items.slice();for(let i=out.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function wrongItems(questions,records,topic='all'){return questions.filter(q=>topic==='all'||q.section===topic).flatMap(q=>[{key:q.id,parentId:q.id,mode:'mcq'},...(q.type==='concept'?q.text.items.map(i=>({key:i.id,parentId:q.id,mode:'ox',itemId:i.id})):[])]).filter(t=>records[t.key]?.lastCorrect===false);}
function grade(task,q,selected){if(task.mode==='ox')return typeof selected==='boolean'&&selected===q.truths[task.itemId];return Number.isInteger(selected)&&q.answers.includes(selected);}
function addAttempt(records,key,correct,now=new Date().toISOString()){const p=records[key]||{};return {...records,[key]:{attempts:(p.attempts||0)+1,correctCount:(p.correctCount||0)+(correct?1:0),wrongCount:(p.wrongCount||0)+(correct?0:1),lastCorrect:correct,lastAt:now}};}
function taskLabel(task,q){return q.section+' · '+(q.kind==='bar'?'본시험':'모의시험')+' 문 '+q.number+(task.mode==='ox'?' · 지문 '+q.text.items.find(i=>i.id===task.itemId).label:'');}
const api={topics,defaults,pool,shuffle,wrongItems,grade,addAttempt,taskLabel};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.Civil4Core=api;
})(typeof window!=='undefined'?window:globalThis);
