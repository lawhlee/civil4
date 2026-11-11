(function(root){'use strict';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Every corpus line boundary has an explicit, text-bound spacing decision.
// Unknown or changed text keeps its line breaks; no global space substitution.
const lineBreaks=typeof module!=='undefined'&&module.exports?require('./line-breaks.js'):root.StudyLineBreaks;
function spacingKey(s){let a=2166136261,b=5381;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b,33)^c;}return s.length.toString(36)+'-'+(a>>>0).toString(16)+'-'+(b>>>0).toString(16);}
function applyLineBreaks(text,flags){
 const raw=String(text||'').replace(/\r\n?/g,'\n'),lines=raw.split('\n');
 if(typeof flags!=='string'||flags.length!==lines.length-1||/[^jsk]/.test(flags))return raw.trim();
 let out=lines[0];
 for(let i=1;i<lines.length;i++){
  const action=flags[i-1];
  if(action==='k')out+='\n'+lines[i];
  else out=out.replace(/[ \t\u00a0]+$/,'')+(action==='s'?' ':'')+lines[i].replace(/^[ \t\u00a0]+/,'');
 }
 return out.trim();
}
function reflow(text){const raw=String(text||'').replace(/\r\n?/g,'\n');return applyLineBreaks(raw,lineBreaks?.decisions?.[spacingKey(raw)]);}
function paragraphs(text){return reflow(text).split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+escape(p)+'</p>').join('');}
function body(item){const text=String(item.text||'').trim();return text.startsWith(item.label)?text.slice(item.label.length).replace(/^[.．、)）\s]+/,''):text;}
function valid(record,id){return !!(record?.id===id&&typeof record.stem==='string'&&record.stem.trim()&&typeof record.explanation==='string'&&record.explanation.trim()&&Array.isArray(record.items)&&record.items.length&&record.items.every(i=>i.id&&i.label&&typeof i.text==='string'&&i.text.trim()));}
const layout=typeof module!=='undefined'&&module.exports?require('./layout.js'):root.StudyLayout;
function fieldValue(record,field){const item=/^items\.(\d+)\.text$/.exec(field);return item&&record.items[Number(item[1])]?body(record.items[Number(item[1])]):field.split('.').reduce((v,k)=>v?.[k],record)||'';}
function fieldHTML(record,field,plain=false){const text=reflow(fieldValue(record,field));return layout?layout.render(text,layout.plan(record.id,field,text,spacingKey),paragraphs,escape,plain):(plain?text:paragraphs(text));}
function sharedReference(record){const ref=layout?.reference(record.id);if(!ref)return null;const text=reflow(fieldValue(record,ref.field));return ref.key===spacingKey(text)&&ref.start>=0&&ref.end<=text.length?{...ref,text:text.slice(ref.start,ref.end)}:null;}
function referenceHTML(record,plain=false){const ref=sharedReference(record);return ref?(plain?ref.text:'<section class="question-material shared-reference" aria-label="공통 참고자료">'+paragraphs(ref.text)+'</section>'):'';}
function contextPlain(record,item){return [fieldHTML(record,'stem',true),fieldHTML(record,'items.'+record.items.indexOf(item)+'.contextText',true),referenceHTML(record,true)].filter(Boolean).join('\n\n');}
function contextHTML(record,item){const index=record.items.indexOf(item);return fieldHTML(record,'stem')+fieldHTML(record,'items.'+index+'.contextText')+referenceHTML(record);}
function statementPlain(record,item){const field='items.'+record.items.indexOf(item)+'.text',ref=sharedReference(record);return ref?.field===field?reflow(fieldValue(record,field)).slice(0,ref.start).trim():fieldHTML(record,field,true);}
function statementHTML(record,item){const field='items.'+record.items.indexOf(item)+'.text',ref=sharedReference(record);if(ref?.field===field)return paragraphs(statementPlain(record,item));return layout?.choiceHTML(record.id,[{...item,text:reflow(body(item))}],paragraphs,escape,spacingKey,false)||fieldHTML(record,field);}
function questionHTML(record){
 if(record.questionText)return '<div class="text-stem">'+fieldHTML(record,'questionText')+'</div>';
 const stem=fieldHTML(record,'stem'),answerTable=layout?.choiceHTML(record.id,record.items.map(i=>({...i,text:reflow(body(i))})),paragraphs,escape,spacingKey);
 let html='<div class="text-stem">'+stem+'</div>';
 const groupStarts=new Map((layout?.groups(record.id,record.items.length)||[]).map(g=>[g[0],g]));
 if(answerTable)html+=answerTable;
 else {let i=0;while(i<record.items.length){const group=groupStarts.get(i),count=group?.length||1,shared=i===0&&group&&layout?.shared(record.id)&&stem.endsWith('</section>');
  if(shared)html='<div class="text-stem">'+stem.slice(0,-10)+'<ol class="text-statements">';
  else html+=group?'<section class="question-material statement-material" aria-label="문제에 제시된 지문"><ol class="text-statements">':'<ol class="text-statements">';
  for(let n=0;n<count;n++,i++){const item=record.items[i];html+='<li data-text-id="'+escape(item.id)+'"><b class="statement-label">'+escape(item.label)+'</b><div>'+statementHTML(record,item)+'</div></li>';}
  html+='</ol>'+(shared?'</section></div>':group?'</section>':'');
 }}
 html+=referenceHTML(record);
 const table=record.choiceTable;
 if(table)html+='<div class="text-table-scroll"><table class="text-choice-table"><caption>객관식 선택지</caption><thead><tr>'+table.headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead><tbody>'+table.rows.map(row=>'<tr>'+row.map((cell,i)=>(i?'<td>':'<th scope="row">')+escape(cell)+(i?'</td>':'</th>')).join('')+'</tr>').join('')+'</tbody></table></div>';
 return html;
}
function questionPlain(record){if(record.questionText)return fieldHTML(record,'questionText',true);let text=fieldHTML(record,'stem',true)+'\n\n'+record.items.map(i=>i.label+' '+statementPlain(record,i)).join('\n\n');if(sharedReference(record))text+='\n\n'+referenceHTML(record,true);if(record.choiceTable)text+='\n\n'+[record.choiceTable.headers,...record.choiceTable.rows].map(row=>row.join('\t')).join('\n');return text;}
const api={sharedReference,referenceHTML,contextPlain,statementPlain,fieldHTML,contextHTML,statementHTML,escape,spacingKey,applyLineBreaks,reflow,paragraphs,body,valid,questionHTML,questionPlain};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyText=api;
})(typeof window!=='undefined'?window:globalThis);

