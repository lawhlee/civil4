(function(root){'use strict';
const subjectNames={civil:'민법',criminal:'형법',constitution:'헌법'};
const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,'');
function grade(selected,answers){if(!Array.isArray(answers))return null;const a=[...new Set(answers)].sort();const s=[...new Set(selected)].filter(n=>n!==0).sort();return a.length===s.length&&a.every((v,i)=>v===s[i]);}
function gradeOX(selected,truth){return typeof selected==='boolean'&&typeof truth==='boolean'?selected===truth:null;}
function reconstructOX(group){
 const items=group.items||[],negative=group.polarity==='negative';
 if(group.type==='standard'||(group.type==='special'&&items.every(i=>i.optionNumber)))return items.filter(i=>i.truth!==negative).map(i=>i.optionNumber).sort((a,b)=>a-b);
 if(group.type!=='combination'||!Array.isArray(group.options))return null;
 const labels=items.filter(i=>i.truth!==negative).map(i=>i.label),wanted=new Set(labels);
 return group.options.filter(o=>{
  if(group.combinationRule==='grouped'){
   const categories=[...new Set(items.map(i=>i.category))];
   return o.groups&&Object.keys(o.groups).length===categories.length&&categories.every(c=>{const wanted=new Set(items.filter(i=>i.category===c&&i.truth).map(i=>i.label));return Array.isArray(o.groups[c])&&o.groups[c].length===wanted.size&&o.groups[c].every(x=>wanted.has(x));});
  }
  if(group.combinationRule==='count')return o.count===wanted.size;
  if(!Array.isArray(o.labels))return false;
  const actual=new Set(o.labels);
  return(group.combinationRule==='subset'||actual.size===wanted.size)&&[...actual].every(x=>wanted.has(x));
 }).map(o=>o.number).sort((a,b)=>a-b);
}
function expandOX(parents,groups){
 const lookup=new Map(parents.map(q=>[q.id,q])),seen=new Set(),out=[];
 for(const group of groups){
  const parent=lookup.get(group.parentId);if(!parent)throw new Error('Unknown O/X parent');
  const derived=reconstructOX(group);
  if(derived&&JSON.stringify(derived)!==JSON.stringify([...parent.answers].sort((a,b)=>a-b)))throw new Error('O/X source answer mismatch');
  for(const item of group.items){
   if(typeof item.truth!=='boolean'||!item.id||seen.has(item.id)||!item.regions?.length)throw new Error('Invalid O/X statement');
   seen.add(item.id);
   out.push({...parent,id:item.id,format:'ox',parentId:parent.id,parentAnswers:parent.answers,originalQuestion:parent.question,question:item.regions,stem:[...(group.stem||[]),...(item.contextRegions||[])],label:item.label,truth:item.truth,answers:item.truth?[1]:[2],answerNote:[...new Set([parent.answerNote,group.displayNote,item.displayNote].filter(Boolean))].join('\n'),contextPrompt:item.contextPrompt||group.contextPrompt||group.instruction||'이 지문은 옳다.',title:parent.title+' · 지문 '+item.label,search:item.text||parent.search,verification:group.verification,order:out.length});
  }
 }
 return out;
}
function status(record){return record?.lastResult===true?'correct':record?.lastResult===false?'wrong':'unseen';}
function match(q,f,records){const r=records[q.id]||{};if(f.subject&&q.subject!==f.subject)return false;if(f.kind&&q.kind!==f.kind)return false;if(f.year&&String(q.year)!==String(f.year))return false;if(f.month&&String(q.month)!==String(f.month))return false;if(f.part&&q.part!==f.part)return false;if(f.chapter&&q.chapter!==f.chapter)return false;if(f.section&&q.section!==f.section)return false;if(f.tag&&!(r.tags||[]).includes(f.tag))return false;if(f.status==='saved'&&!r.saved)return false;if(f.status==='noted'&&!r.note?.trim())return false;if(['correct','wrong','unseen'].includes(f.status)&&status(r)!==f.status)return false;if(f.status==='changed'&&!(q.answerNote||(Array.isArray(q.parentAnswers??q.answers)&&(q.parentAnswers??q.answers).length!==1)))return false;if(f.search){const hay=normalize([q.title,q.part,q.chapter,q.section,q.search,subjectNames[q.subject],q.year,...(r.tags||[])].join(' '));if(!f.search.trim().split(/\s+/).every(t=>hay.includes(normalize(t))))return false;}return true;}
function shuffled(list,random=Math.random){const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function summarize(records,ids){let done=0,correct=0,wrong=0,saved=0;for(const id of ids){const r=records[id]||{};if(r.lastResult===true){done++;correct++;}if(r.lastResult===false){done++;wrong++;}if(r.saved)saved++;}return{done,correct,wrong,saved,accuracy:done?Math.round(correct/done*100):null};}
function mergeRecords(current,incoming,allowed){const out={...current};for(const[id,r]of Object.entries(incoming||{})){if(!allowed.has(id)||!r||typeof r!=='object')continue;const safe={saved:!!r.saved,note:String(r.note||'').slice(0,30000),tags:Array.isArray(r.tags)?[...new Set(r.tags.filter(x=>typeof x==='string').map(x=>x.trim().slice(0,50)).filter(Boolean))].slice(0,40):[],attempts:Math.max(0,Number(r.attempts)||0),wrongCount:Math.max(0,Number(r.wrongCount)||0),lastResult:typeof r.lastResult==='boolean'?r.lastResult:null,lastAt:typeof r.lastAt==='string'?r.lastAt:null};if(!out[id]||(safe.lastAt||'')>=(out[id].lastAt||'')){out[id]={...out[id],...safe,tags:[...new Set([...(out[id]?.tags||[]),...safe.tags])]};}}return out;}
const api={subjectNames,normalize,grade,gradeOX,reconstructOX,expandOX,status,match,shuffled,summarize,mergeRecords};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyCore=api;
})(typeof window!=='undefined'?window:globalThis);

