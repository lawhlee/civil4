const assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=require('../questions.json').questions,extra=require('../supplemental-ox.json').questions,qs=[...base,...extra],C=require('../study-core.js'),T=require('../text.js'),Cite=require('../citations.js');
const a=require('../case-audit.json'),s=require('../supplemental-case-audit.json');
const fixed=qs.map(q=>({id:q.id,answers:q.answers,truths:q.truths,oxItemIds:q.oxItemIds,questionImages:q.questionImages,explanationImages:q.explanationImages}));
assert.equal(crypto.createHash('sha256').update(JSON.stringify(fixed)).digest('hex'),'a04a567e1fe826f73399660c2ed1bf94c250638eea630ff6ffee2406ba1088b3');
const q=extra.find(q=>q.id==='extra_civil_mock_5_045_unjust'),i=C.oxItems(q).find(i=>i.id==='civil_mock_5_045__ox_1');
assert.match(T.statementPlain(q.text,i),/甲회사의 乙회사에 대한/);assert.equal(q.truths[i.id],true);assert.match(i.explanation,/정정 안내/);assert.match(q.originalTextNote,/원문 이미지/);
const source=base.find(q=>q.id==='civil_mock_5_103');assert.match(source.text.items[1].text,/63세/);assert.equal(source.truths[source.text.items[1].id],false);
for(const q of qs){const refs=(q.oxOnly?s:a).questions[q.id],cases=(q.oxOnly?s:a).cases;
 const texts=q.oxOnly?C.oxItems(q).map(i=>i.explanation):[q.text.explanation];
 for(const text of texts){assert.ok(!/3\s*009\.01\.30|3\s*012\.03\.15|204다229343|받이어:|손해배상재권|해딩히는|상실히는/.test(text));
  for(const m of Cite.extract(text)){assert.ok(refs.some(r=>r.caseNumber===m.caseNumber),q.id+' missing '+m.caseNumber);assert.ok(cases[m.caseNumber],m.caseNumber);}
 }
}
assert.equal(s.cases['2016다12656'].status,'unverified');
assert.equal(a.cases['2011므2997'].liveChecked,true);assert.equal(a.cases['2011므2997'].decisionDate,'2014-11-20');
console.log('PASS · corrected creditor/debtor, false exam option preserved, citation coverage, unchanged grading/IDs/images');
