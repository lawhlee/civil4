export const sections=['채권의 양도','채무의 인수','채권자대위권','채권자취소권','분할채권과 분할채무','연대채무','불가분채권과 불가분채무','보증채무'];
export const blank=()=>({version:1,records:{},bookmarks:[],session:null});
export const questionKind=q=>q.kind==='statute'?'statute':'case';
export const priorityFor=(q,priorities={})=>priorities[q.id]||null;
export const priorityMatches=(q,priorities={},level='all')=>!level||level==='all'||priorityFor(q,priorities)?.level===level;
export function subjectFor(q,cases,statutes=[]){return questionKind(q)==='statute'?statutes.find(s=>s.id===q.statuteId):cases[q.caseId-1];}
export function sourceMatches(subject,kind,source){
  if(!source||source==='all')return true;
  if(source==='extra')return kind==='case'&&subject.extra===true;
  if(source==='week7')return subject.week7===true;
  if(kind==='statute')return source==='book'?subject.sources.some(x=>x==='book'||x==='supplement'):subject.sources.includes(source);
  if(source==='book')return !subject.extra;
  if(source==='ppt')return subject.excerpts.some(x=>/PPT/.test(x.source));
  return false;
}
export function pool(questions,cases,state,filter={},statutes=[],priorities={}){
  return questions.filter(q=>{
    const kind=questionKind(q),c=subjectFor(q,cases,statutes),r=state.records[q.id];
    return c&&(!filter.kind||filter.kind==='all'||kind===filter.kind)&&priorityMatches(q,priorities,filter.priority)
      &&(filter.group==null||filter.group===''||c.group===Number(filter.group))
      &&sourceMatches(c,kind,filter.source)
      &&(!filter.mode||filter.mode==='all'||(filter.mode==='unseen'?!r:filter.mode==='wrong'?r&&r.lastCorrect===false:state.bookmarks.includes(q.id)));
  });
}
export function shuffle(a,random=Math.random){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export function selectStudyQuestions(items,count,randomize=true,random=Math.random){
  const banks=['case','statute'].map(kind=>items.filter(q=>questionKind(q)===kind)).map(bank=>randomize?shuffle(bank,random):bank);
  const positions=[0,0],selected=[],limit=Math.min(items.length,Math.max(0,count));
  while(selected.length<limit){
    for(let i=0;i<2&&selected.length<limit;i++)if(positions[i]<banks[i].length)selected.push(banks[i][positions[i]++]);
  }
  return randomize?shuffle(selected,random):selected;
}
export function record(state,q,choice){const correct=choice===q.answer;const old=state.records[q.id]||{attempts:0,correct:0};state.records[q.id]={attempts:old.attempts+1,correct:old.correct+Number(correct),lastCorrect:correct,lastChoice:choice,at:Date.now()};return correct;}
export function validate(data,ids,retiredIds=new Set()){
  if(!data||data.version!==1||!data.records||Array.isArray(data.records)||!Array.isArray(data.bookmarks))throw Error('지원하지 않는 백업 형식입니다.');
  const out=blank();
  for(const [id,r] of Object.entries(data.records)){
    if((!ids.has(id)&&!retiredIds.has(id))||!r||!Number.isSafeInteger(r.attempts)||r.attempts<1||r.attempts>1e8||!Number.isSafeInteger(r.correct)||r.correct<0||r.correct>r.attempts||typeof r.lastCorrect!=='boolean'||![true,false,null].includes(r.lastChoice)||!Number.isFinite(r.at))throw Error('학습 기록이 올바르지 않습니다.');
    // A known scope removal must not invalidate the remaining learning history.
    if(ids.has(id))out.records[id]={attempts:r.attempts,correct:r.correct,lastCorrect:r.lastCorrect,lastChoice:r.lastChoice,at:r.at};
  }
  out.bookmarks=[...new Set(data.bookmarks.filter(x=>ids.has(x)))];
  return out;
}
