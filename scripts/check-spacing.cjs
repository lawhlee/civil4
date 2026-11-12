const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),T=require('../text.js'),C=require('../study-core.js'),Cite=require('../citations.js'),spacing=require('../text-spacing.js');
const qs=[...require('../questions.json').questions,...require('../supplemental-ox.json').questions];
const baseline={exports:{}};
vm.runInNewContext(fs.readFileSync(root+'/text.js','utf8'),{module:baseline,require:p=>p==='./text-spacing.js'?{}:require(path.resolve(root,p))});
const oldT=baseline.exports,fields=[];
for(const q of qs){
 const add=(key,raw)=>{if(typeof raw==='string'&&raw.trim())fields.push({id:q.text.id,key,raw:key.endsWith('.text')?T.body({text:raw,label:q.text.items[Number(key.split('.')[1])]?.label}):raw});};
 if(q.text.questionText)add('questionText',q.text.questionText);
 else{add('stem',q.text.stem);q.text.items.forEach((i,n)=>{add('items.'+n+'.text',i.text);add('items.'+n+'.contextText',i.contextText);});}
 if(!q.oxOnly)add('explanation',q.text.explanation);
 for(const i of C.oxItems(q))add('items.'+q.text.items.indexOf(i)+'.explanation',i.explanation);
}
const unique=[...new Map(fields.map(f=>[f.id+'|'+f.key+'|'+f.raw,f])).values()],keys=new Map(unique.map(f=>[T.spacingKey(f.raw),f]));
assert.equal(unique.length,1334);
assert.equal(Object.keys(spacing.lineBreaks).length,111);
assert.equal(Object.keys(spacing.repairs).length,42);
for(const [key,flags]of Object.entries(spacing.lineBreaks)){
 const f=keys.get(key);assert.ok(f,'Unused line map '+key);
 assert.equal(flags.length,f.raw.split('\n').length-1);assert.match(flags,/^[jsk]+$/);
}
for(const [key,repair]of Object.entries(spacing.repairs)){
 const f=keys.get(key);assert.ok(f,'Unused repair '+key);
 const joined=T.applyLineBreaks(f.raw,spacing.lineBreaks[key]??require('../line-breaks.js').decisions[key]);
 assert.equal(T.spacingKey(joined),repair.key);
 assert.equal(T.spacingKey(T.reflow(f.raw)),repair.afterKey,'Repair did not apply: '+f.id+' '+f.key);
 // A source change invalidates both the offsets and the line-join decisions.
 assert.equal(T.reflow(f.raw+'!'),(f.raw+'!').trim());
}
let changed=0;
for(const f of unique){
 const out=T.reflow(f.raw),old=oldT.reflow(f.raw);
 assert.equal(T.reflow(out),out,'Non-idempotent '+f.id+' '+f.key);
 assert.deepEqual(Cite.extract(out).map(r=>r.caseNumber),Cite.extract(old).map(r=>r.caseNumber),'Citation changed: '+f.id+' '+f.key);
 if(out!==old)changed++;
}
assert.equal(changed,123);
const field=(id,key)=>{const f=unique.find(f=>f.id===id&&f.key===key);assert.ok(f,id+' '+key);return T.reflow(f.raw);};
assert.match(field('civil_bar_5_066','items.4.text'),/유익비로 청구할 수 있다/);
assert.match(field('civil_mock_5_045','items.4.explanation'),/타인을 위하여/);
assert.match(field('civil_mock_5_088','items.0.explanation'),/2009다24187,24194/);
const repaired=field('civil_mock_4_055','items.4.explanation');
assert.match(repaired,/형평의 원칙에 비추어/);assert.match(repaired,/그 비율을 제1심과 다르게 정할 수 있다/);assert.ok(!repaired.endsWith('율'));
const structure=html=>(html.match(/<(?:table|section)\b[^>]*class="[^"]*"/g)||[]).join('\n');
for(const q of qs){
 assert.equal(structure(T.questionHTML(q.text)),structure(oldT.questionHTML(q.text)),'Table/box structure changed: '+q.id);
 for(const i of C.oxItems(q))assert.equal(structure(T.statementHTML(q.text,i)),structure(oldT.statementHTML(q.text,i)),'O/X layout changed: '+i.id);
}
assert.equal(T.reflow('새로운\n문단\n\n목록  A'), '새로운\n문단\n\n목록  A');
const html=fs.readFileSync(root+'/index.html','utf8');
assert.ok(html.indexOf('src="text-spacing.js?')<html.indexOf('src="text.js?'));
console.log('PASS · 1,334 fields / 111 reviewed line maps / 42 exact repairs / 123 corrected fields / citations and tables preserved');
