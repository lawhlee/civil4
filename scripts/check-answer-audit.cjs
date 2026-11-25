const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs');
const T=require('../text.js'),C=require('../study-core.js'),A=require('../answer-audit.json'),P=require('../text-legal.js');
const bank=[...require('../questions.json').questions,...require('../supplemental-ox.json').questions],hash=s=>crypto.createHash('sha256').update(s).digest('hex');
let covered=new Set(),applied=new Set();
for(const q of bank){
 const row=A.questions[q.id];assert.ok(row);assert.deepEqual(row.items,(q.oxOnly?C.oxItems(q):q.text.items).map(i=>i.id));
 for(const i of q.oxOnly?C.oxItems(q):q.text.items){
  const r=A.items[i.id];assert.ok(r);assert.ok(!covered.has(i.id));covered.add(i.id);
  assert.equal(r.truth,q.truths[i.id]);assert.equal(r.statementSha256,hash(T.statementPlain(q.text,i)));assert.ok(r.cases.length||r.articles.length);
  assert.equal(r.status==='citation-pending',r.cases.some(n=>A.cases[n].status==='unavailable'));
  for(const n of r.cases)assert.ok(A.cases[n]);for(const n of r.articles)assert.ok(A.statutes[n]);
 }
 const raws=[q.text.stem,q.text.explanation,q.text.questionText,...q.text.items.flatMap(i=>[T.body(i),i.contextText,i.explanation])].filter(Boolean);
 for(const raw of raws){const joined=T.spacingReflow(raw),key=T.spacingKey(joined),repair=P.repairs[key];if(!repair)continue;applied.add(key);const out=T.reflow(raw);assert.equal(T.spacingKey(out),repair.afterKey);assert.equal(T.reflow(out),out);assert.notEqual(out,joined);}
}
assert.equal(covered.size,429);assert.equal(applied.size,Object.keys(P.repairs).length);assert.equal(A.summary.officialBodies,277);assert.equal(A.summary.originalCaseNumbers,278);assert.equal(A.summary.answerChanges,0);
assert.deepEqual(A.summary.pendingItems.sort(),['civil_bar_2_067__ox_2','civil_mock_2_057__ox_5']);
const ratificationItems=[['civil_bar_2_067__ox_2',false],['civil_mock_2_057__ox_5',true]];
const ratificationCases=['2001다44291','2020다210686','2020다210693'];
for(const [id,truth] of ratificationItems){
 const r=A.items[id],q=bank.find(q=>q.id===r.questionId),i=q.text.items.find(i=>i.id===id),rendered=T.reflow(i.explanation);
 assert.equal(q.truths[id],truth);
 assert.equal(r.explanationSha256,hash(rendered));
 assert.match(rendered,/\[판례 근거 보강\].*2001다44291.*2020다210686, 210693/s);
 assert.ok(ratificationCases.every(n=>r.cases.includes(n)&&A.cases[n].status==='web-body-reviewed'));
 assert.ok(r.articles.includes(741));
 assert.equal(r.status,'citation-pending');
 assert.ok(r.cases.includes('2016다12656'));
}
assert.equal(A.cases['2016다12656'].status,'unavailable');
assert.match(T.reflow(bank.find(q=>q.id==='extra_civil_bar_2_067_unjust').text.items[1].explanation),/2017다3499/);

const q=id=>bank.find(q=>(q.sourceParentId||q.id)===id),ex=id=>T.reflow(q(id).text.explanation);
for(const id of ['civil_mock_5_107','civil_mock_5_108']){assert.ok(!ex(id).includes('그 변제금 중 사용자의 과실비율'));assert.match(ex(id),/2012다74236/);assert.match(ex(id),/단독으로 부담하는 부분부터/);}
assert.match(ex('civil_mock_5_084'),/종료되면 소유자인 임대인/);assert.ok(!ex('civil_mock_5_106').includes('피용자의 불법행위는 사무집행관련성 x'));
assert.match(ex('civil_bar_5_068'),/질권자 丙/);assert.ok(!ex('civil_bar_5_068').includes('질권자 丁'));
const age=q('civil_mock_5_103').text.items[1];assert.match(T.statementPlain(q('civil_mock_5_103').text,age),/63세/);assert.equal(A.items[age.id].truth,false);
assert.match(A.items['civil_mock_4_055__ox_3'].cases.join(','),/2012다13637/);
const main=fs.readFileSync(require('path').resolve(__dirname,'../index.html'),'utf8');assert.ok(main.indexOf('src="text-legal.js?')<main.indexOf('src="text.js?'));
console.log('PASS · 429 reviewed statements / 277 of 278 original case bodies / 2 citation-pending statements / '+applied.size+' exact text repairs / unchanged answers and layouts');

for(const [id,index,expected] of [
 ['civil_mock_5_082',2,['민법 제740조(관리자의 무과실손해보상청구권)','본인의 현존이익']],
 ['civil_bar_4_011',3,['① 채무자 아닌 자가','② 전항의 경우']],
 ['civil_bar_5_066',0,['대하여 국가의 사무를 처리하면서','대법원 2014. 12. 11. 선고 2012다15602 판결']]
]){
 const question=q(id),item=question.text.items[index],excerpt=T.reflow(item.explanation);
 for(const phrase of expected){
  assert.ok(excerpt.includes(phrase),item.id);
  assert.ok(T.reflow(question.text.explanation).includes(phrase),id);
 }
 assert.equal(A.items[item.id].explanationSha256,hash(excerpt));
}
assert.ok(T.questionHTML(q('civil_mock_2_050').text).includes('사기·강박에 의한 법률행위'));
