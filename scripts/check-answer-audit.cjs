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
const q=id=>bank.find(q=>(q.sourceParentId||q.id)===id),ex=id=>T.reflow(q(id).text.explanation);
for(const id of ['civil_mock_5_107','civil_mock_5_108']){assert.ok(!ex(id).includes('그 변제금 중 사용자의 과실비율'));assert.match(ex(id),/2012다74236/);assert.match(ex(id),/단독으로 부담하는 부분부터/);}
assert.match(ex('civil_mock_5_084'),/종료되면 소유자인 임대인/);assert.ok(!ex('civil_mock_5_106').includes('피용자의 불법행위는 사무집행관련성 x'));
assert.match(ex('civil_bar_5_068'),/질권자 丙/);assert.ok(!ex('civil_bar_5_068').includes('질권자 丁'));
const age=q('civil_mock_5_103').text.items[1];assert.match(T.statementPlain(q('civil_mock_5_103').text,age),/63세/);assert.equal(A.items[age.id].truth,false);
assert.match(A.items['civil_mock_4_055__ox_3'].cases.join(','),/2012다13637/);
const main=fs.readFileSync(require('path').resolve(__dirname,'../index.html'),'utf8');assert.ok(main.indexOf('src="text-legal.js?')<main.indexOf('src="text.js?'));
console.log('PASS · 429 reviewed statements / 277 of 278 original case bodies / 2 citation-pending statements / '+applied.size+' exact text repairs / unchanged answers and layouts');
