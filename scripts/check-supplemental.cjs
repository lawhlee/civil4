const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),C=require(root+'/study-core.js'),T=require(root+'/text.js'),Cite=require(root+'/citations.js');
const data=JSON.parse(fs.readFileSync(root+'/supplemental-ox.json')),extra=data.questions,baseData=JSON.parse(fs.readFileSync(root+'/questions.json')),qs=[...baseData.questions,...extra],audit=JSON.parse(fs.readFileSync(root+'/supplemental-case-audit.json'));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const selection=extra.flatMap(q=>q.oxItemIds.map(id=>[id,q.truths[id]])).sort((a,b)=>a[0].localeCompare(b[0]));
// Fingerprints of the approved 202-minus-45 selection and the complete 111 source questions.
assert.equal(hash(selection),'4584007f4a82ad4d04ce5aca0bf8e28d20a8499ce5207dd4edf8facfb3252c1e');
// Approved complete parent text fingerprint after the 2026-11-11 OCR repairs.
const originals=[...new Map(extra.map(q=>[q.sourceParentId,q.text])).values()].sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(hash(originals.map(q=>({id:q.id,stem:q.stem,items:q.items.map(({id,label,text,contextText})=>({id,label,text,contextText})),choiceTable:q.choiceTable}))),'708d4e3c84b8959e4ecba10a29c0e0f91b714b63b377d711db732dea8c4dd0a8');
assert.equal(extra.length,119);assert.equal(originals.length,111);assert.equal(selection.length,157);assert.equal(new Set(selection.map(x=>x[0])).size,157);
assert.deepEqual(data.selection.excludedNumbers,[15,16,17,18,19,20,21,25,30,49,53,55,57,58,59,60,61,62,63,64,65,66,68,70,73,74,75,76,77,78,88,105,106,107,108,109,164,165,166,167,168,169,171,172,173]);
const topicCounts={};for(const q of extra)topicCounts[q.section]=(topicCounts[q.section]||0)+q.oxItemIds.length;
assert.deepEqual(topicCounts,{'사무관리':1,'부당이득':60,'불법행위':96});
const config={...C.defaults,topics:[...C.topics],count:'all',shuffle:false};
for(const [bank,conceptMode,n] of [['base','mcq',60],['base','ox',187],['extra','mcq',157],['extra','ox',157],['all','mcq',217],['all','ox',344]])assert.equal(C.pool(qs,{...config,bank,conceptMode}).length,n);
assert.equal(C.pool(qs,{...config,type:'concept',conceptMode:'ox'}).length,319);
assert.equal(C.pool(qs,{...config,type:'case',conceptMode:'ox'}).length,25);
assert.equal(C.pool(qs,{...config,bank:'extra',type:'case'}).length,157);
assert.equal(C.pool(qs,{...config,bank:'extra',source:'bar'}).length,78);
assert.equal(C.pool(qs,{...config,bank:'extra',source:'mock'}).length,79);
const tasks=qs.flatMap(C.tasks);assert.equal(tasks.length,379);assert.equal(new Set(tasks.map(t=>t.key)).size,379);
let records={},images=new Set();
for(const q of extra){
 assert.equal(q.oxOnly,true);assert.ok(T.valid(q.text,q.sourceParentId));
 assert.ok(T.questionHTML(q.text).length>50);
 assert.equal(C.oxItems(q).length,q.oxItemIds.length);assert.ok(q.questionImages.length&&q.explanationImages.length);
 for(const [id,n]of Object.entries(q.selectionNumbers)){assert.ok(q.oxItemIds.includes(id));assert.ok(n>=1&&n<=202&&!data.selection.excludedNumbers.includes(n));}
 for(const task of C.tasks(q)){
  assert.equal(task.mode,'ox');const item=q.text.items.find(i=>i.id===task.itemId);
  assert.ok(item.explanation.startsWith(item.label+' ('+(q.truths[item.id]?'O':'X')+') '));
  assert.equal([...item.explanation.matchAll(/^[①-⑤ㄱㄴㄷㄹㅁ][.．]?\s*\([OX○×0]\)/gm)].length,1,item.id);assert.ok(!item.explanation.includes('MGI Point'));
  assert.equal(C.grade(task,q,q.truths[item.id]),true);assert.equal(C.grade(task,q,!q.truths[item.id]),false);
  records=C.addAttempt(records,task.key,false);assert.ok(C.wrongItems(qs,records).some(t=>t.key===task.key));
  assert.ok(!C.pool(qs,{...config,bank:'extra',status:'unseen'},records).some(t=>t.key===task.key));
  records=C.addAttempt(records,task.key,true);assert.ok(!C.wrongItems(qs,records).some(t=>t.key===task.key));
  assert.equal(records[task.key].attempts,2);
  for(const ref of Cite.extract(item.explanation))assert.ok(audit.questions[q.id].some(r=>r.caseNumber===ref.caseNumber),'Missing case status '+ref.caseNumber);
 }
 for(const src of [...q.questionImages,...q.explanationImages]){images.add(src);const svg=fs.readFileSync(path.join(root,src),'utf8');assert.match(src,/^originals\/additional\/[a-z0-9_-]+\.svg$/);assert.ok(svg.length>200);assert.match(svg,/href="data:image\/webp;base64,[A-Za-z0-9+/=]+"/);assert.ok(!/<script|onload=|https?:\/\/[^w]/i.test(svg));}
}
assert.equal(images.size,357);assert.equal(C.wrongItems(qs,records).length,0);
assert.equal(C.pool(qs,{...config,bank:'extra',status:'unseen'},records).length,0);
assert.equal(audit.summary.uniqueCaseNumbers,123);assert.equal(audit.summary.officialIndexMatched,120);assert.equal(audit.summary.officialHeaderMatched,2);assert.equal(audit.summary.verifiedCases,122);assert.equal(audit.summary.unmatched,1);
assert.equal(audit.cases['2016다12656'].status,'unverified');assert.ok(Object.values(audit.questions).flat().some(r=>r.caseNumber==='2016다12656'&&r.status==='unverified'));
for(const c of Object.values(audit.cases).filter(c=>c.status==='verified')){assert.ok(c.verifiedAt);assert.ok(['law.go.kr','www.law.go.kr','www.nhis.or.kr'].includes(new URL(c.url).hostname));}
console.log('PASS · approved 157 O/X / 111 complete originals / 357 crops / 319 total O/X / filters, grading and wrong review');
