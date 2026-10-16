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
