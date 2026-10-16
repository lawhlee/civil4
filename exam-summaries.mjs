export const summaryChapters = [
  [11,'채권자대위권'],[12,'채권자취소권'],[13,'채권양도'],
  [14,'면책적 채무인수'],[15,'이행인수'],[16,'다수당사자의 채권관계'],
];
export const summaryExamOptions = [
  ['all','전체 시험'],['bar-mock','변호사시험 + 모의고사'],
  ['actual','변호사시험'],['mock','모의고사'],['judicial','사법시험'],
];
export const summaryMatchLabel = type => type === '직접 일치' ? '해설 직접 인용' : type;
const examMatches = (type,exam) => !exam || exam === 'all'
  || (exam === 'bar-mock' && ['변호사시험','모의고사'].includes(type))
  || ({actual:'변호사시험',mock:'모의고사',judicial:'사법시험'}[exam] === type);
// Both constraints must belong to the same problem connection.
export function summaryMappings(item,filter={}) {
  return item.mappings.filter(mapping => examMatches(mapping.examType,filter.exam)
    && (!filter.chapter || mapping.chapter === Number(filter.chapter)));
}
export function selectSummaries(items,filter={}) {
  const terms = String(filter.search || '').trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
  return items.filter(item => {
    const mappings = summaryMappings(item,filter);
    if (!mappings.length) return false;
    const haystack = [item.citation,item.topic,item.summary,...(item.sourceLabels || []),
      ...mappings.flatMap(m => [`사례${m.problemId}`,m.examType,m.examLabel,m.title,summaryMatchLabel(m.type)])]
      .join(' ').toLocaleLowerCase('ko');
    return terms.every(term => haystack.includes(term));
  });
}
// Scope each original ruling's connections before merging; different members
// cannot jointly satisfy the exam and chapter filters.
export function selectSummaryGroups(data,filter={}) {
  const definitions=new Map();
  for(const group of data.groups || [])for(const caseId of group.caseIds)definitions.set(caseId,group);
  const groups=new Map();
  for(const item of data.cases){
    const definition=definitions.get(item.caseId),id=definition?.id || `case-${item.caseId}`;
    if(!groups.has(id))groups.set(id,{
      id,topic:definition?.topic || item.topic,summary:definition?.summary || item.summary,
      sentences:definition?.sentences || item.sentences,members:[],allMembers:[],
    });
    const group=groups.get(id);
    group.allMembers.push(item);
    if(summaryMappings(item,filter).length)group.members.push(item);
  }
  const terms=String(filter.search || '').trim().toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
  return [...groups.values()].filter(group=>{
    if(!group.members.length)return false;
    const haystack=[group.topic,group.summary,...group.members.flatMap(item=>[
      item.citation,item.topic,item.summary,...(item.sourceLabels || []),
      ...summaryMappings(item,filter).flatMap(m=>[`사례${m.problemId}`,m.examType,m.examLabel,m.title,summaryMatchLabel(m.type),m.holding,m.notes]),
    ])].join(' ').toLocaleLowerCase('ko');
    return terms.every(term=>haystack.includes(term));
  });
}
// One problem row can have multiple distinct ruling connections. Keep those
// attributions, including their matching status and any cautionary notes.
export function summaryGroupMappings(group,filter={}) {
  const problems=new Map();
  for(const item of group.members)for(const mapping of summaryMappings(item,filter)){
    if(!problems.has(mapping.problemId))problems.set(mapping.problemId,{...mapping,attributions:[]});
    const problem=problems.get(mapping.problemId);
    problem.attributions.push({...mapping,caseId:item.caseId,citation:item.citation});
  }
  return [...problems.values()].sort((a,b)=>a.problemId.localeCompare(b.problemId,'ko',{numeric:true}));
}
export function summaryCounts(items) {
  const unique = [...new Map(items.map(item => [item.caseId,item])).values()];
  return {
    total:unique.length,
    barAndMock:selectSummaries(unique,{exam:'bar-mock'}).length,
    actual:selectSummaries(unique,{exam:'actual'}).length,
    mock:selectSummaries(unique,{exam:'mock'}).length,
    judicial:selectSummaries(unique,{exam:'judicial'}).length,
    direct:unique.filter(item => item.mappings.some(m => m.type === '직접 일치')).length,
  };
}
export function summaryPage(items,page=1,size=12) {
  const pages = Math.max(1,Math.ceil(items.length / size));
  const current = Math.max(1,Math.min(pages,Math.floor(page) || 1));
  return {items:items.slice((current-1)*size,current*size),page:current,pages,total:items.length};
}
