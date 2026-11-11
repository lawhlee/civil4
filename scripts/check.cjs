const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),C=require(root+'/study-core.js'),T=require(root+'/text.js');
const data=JSON.parse(fs.readFileSync(root+'/questions.json')),qs=data.questions,audit=JSON.parse(fs.readFileSync(root+'/case-audit.json'));
assert.deepEqual(data.counts,{total:60,concept:35,case:25,ox:162});
assert.equal(new Set(qs.map(q=>q.id)).size,60);
const base={...C.defaults,topics:[...C.topics],count:'all',shuffle:false};
assert.equal(C.pool(qs,base).length,60);
assert.equal(C.pool(qs,{...base,type:'concept'}).length,35);
assert.equal(C.pool(qs,{...base,type:'case',conceptMode:'ox'}).length,25);
assert.ok(C.pool(qs,{...base,type:'case',conceptMode:'ox'}).every(t=>t.mode==='mcq'));
const mixed=C.pool(qs,{...base,conceptMode:'ox'});assert.equal(mixed.length,187);assert.equal(mixed.filter(t=>t.mode==='ox').length,162);
assert.equal(C.pool(qs,{...base,source:'bar'}).length,30);assert.equal(C.pool(qs,{...base,source:'mock'}).length,30);
for(const [topic,count]of [['사무관리',3],['부당이득',25],['불법행위',32]])assert.equal(C.pool(qs,{...base,topics:[topic]}).length,count);
for(const q of qs){assert.deepEqual(q.answers.length,1);assert.ok(q.answers[0]>=1&&q.answers[0]<=5);assert.ok(T.questionHTML(q.text).length>50);assert.ok(q.explanationImages.length>0);for(const src of [...q.questionImages,...q.explanationImages])assert.ok(fs.statSync(root+'/'+src).size>0);if(q.text.choiceTable)assert.equal(q.text.choiceTable.rows.length,5);for(const i of q.text.items)assert.equal(typeof q.truths[i.id],'boolean');}
// A negative stem must grade the statement's truth, not copy the MCQ answer.
const q=qs.find(q=>q.id==='civil_bar_5_077'),t={key:q.text.items[0].id,parentId:q.id,mode:'ox',itemId:q.text.items[0].id};assert.equal(q.answers[0],5);assert.equal(q.truths[t.itemId],true);assert.equal(C.grade(t,q,true),true);assert.equal(C.grade(t,q,false),false);
let rec=C.addAttempt({},t.key,false,'2026-11-10T01:00:00Z');assert.equal(C.wrongItems(qs,rec).length,1);assert.equal(C.pool(qs,{...base,type:'concept',conceptMode:'ox',status:'unseen'},rec).length,161);rec=C.addAttempt(rec,t.key,true,'2026-11-10T02:00:00Z');assert.equal(C.wrongItems(qs,rec).length,0);assert.equal(rec[t.key].attempts,2);assert.equal(rec[t.key].wrongCount,1);assert.equal(rec[t.key].correctCount,1);
assert.equal(audit.summary.uniqueCaseNumbers,183);assert.equal(audit.summary.liveVerifiedCases,183);assert.equal(Object.keys(audit.questions).length,60);assert.equal(Object.values(audit.questions).flat().length,267);assert.equal(Object.values(audit.questions).flat().filter(r=>r.status==='mismatch').length,2);for(const [n,c]of Object.entries(audit.cases)){assert.equal(c.caseNumber,n);assert.equal(c.status,'verified');assert.equal(c.liveChecked,true);assert.ok(['law.go.kr','nhis.or.kr','scourt.go.kr'].some(d=>new URL(c.url).hostname===d||new URL(c.url).hostname.endsWith('.'+d)));}
console.log('PASS · 60 MCQ / 162 concept OX / 187 mixed tasks / 191 source crops / 183 verified cases');
const concepts=qs.filter(q=>q.type==='concept');
assert.equal(concepts.flatMap(q=>q.text.items).length,162);
for(const q of concepts)for(const i of q.text.items){assert.ok(i.explanation.startsWith(i.label+' ('),i.id);assert.equal([...i.explanation.matchAll(/^[①-⑤ㄱㄴㄷㄹㅁ][.．]?\s*\([OX○×0]\)/gm)].length,1,i.id);assert.ok(!i.explanation.includes('MGI Point'),i.id);}
const shared=qs.find(q=>q.id==='civil_mock_5_082');
assert.ok(!shared.text.items[1].explanation.includes('공동상속'));assert.ok(shared.text.items[3].explanation.includes('공동상속'));
const short=qs.find(q=>q.id==='civil_bar_5_077').text.items[1].explanation;
assert.ok(short.startsWith('② (O) 민법 제749조 제1항 참조.'));assert.ok(short.includes('민법 제749조(수익자의 악의인정)'));assert.ok(!short.includes('③.'));
console.log('PASS · 162 O/X excerpts, shared paragraphs separated, related statute text preserved');
