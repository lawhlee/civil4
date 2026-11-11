(function(root){'use strict';
const database=typeof module!=='undefined'&&module.exports?require('./question-layouts.js'):root.StudyQuestionLayouts;
// Formatting ranges are tied to the exact reflowed text. Unrecognized text is left intact.
function plan(id,field,text,key){const entry=database?.questions?.[id]?.fields?.[field];return entry&&entry.key===key(text)?entry:null;}
function nodes(text,entry){
 if(!entry)return null;let end=0;
 for(const b of entry.blocks){if(!Number.isInteger(b.start)||!Number.isInteger(b.end)||b.start<end||b.end<=b.start||b.end>text.length||!['box','table'].includes(b.type))return null;end=b.end;}
 return entry.blocks;
}
function cellHTML(text,c,paragraphs,escape){
 const a=c.length===4?c[2]:c[0],b=c.length===4?c[3]:c[1];
 return (a>c[0]?'<span class="layout-source-token" aria-hidden="true">'+escape(text.slice(c[0],a))+'</span>':'')+paragraphs(text.slice(a,b))+(b<c[1]?'<span class="layout-source-token" aria-hidden="true">'+escape(text.slice(b,c[1]))+'</span>':'');
}
function headings(headers,escape){return headers?'<thead data-layout-label><tr>'+headers.map(h=>'<th scope="col">'+escape(h)+'</th>').join('')+'</tr></thead>':'';}
function choiceHTML(id,items,paragraphs,escape,key,includeLabel=true){
 const table=database?.questions?.[id]?.choiceRows;if(!table)return null;
 const rows=items.map(i=>table.rows.find(r=>r.id===i.id));if(rows.some((r,n)=>!r||r.key!==key(items[n].text)))return null;
 return '<div class="text-table-scroll material-table-scroll" tabindex="0" aria-label="객관식 선택지 표">'+'<table class="text-material-table text-answer-table">'+headings(includeLabel?['선택지',...table.columns]:table.columns,escape)+'<tbody>'+rows.map((r,n)=>'<tr data-text-id="'+escape(items[n].id)+'">'+(includeLabel?'<th scope="row">'+escape(items[n].label)+'</th>':'')+r.cells.map(c=>'<td>'+cellHTML(items[n].text,c,paragraphs,escape)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
}
function shared(id){return database?.questions?.[id]?.sharedStemBox===true;}
function reference(id){return database?.questions?.[id]?.trailingReference||null;}
function render(text,entry,paragraphs,escape,plain=false){
 const blocks=nodes(text,entry);if(!blocks)return plain?text:paragraphs(text);let pos=0,out=[];
 const prose=s=>plain?s:paragraphs(s);
 for(const b of blocks){out.push(prose(text.slice(pos,b.start)));const cuts=[b.start,...(b.breaks||[]).filter(n=>n>b.start&&n<b.end),b.end];
  if(b.type==='table'&&Array.isArray(b.rows)){
   let last=b.start;const cells=b.rows.flat();
   const valid=cells.length&&cells.every(c=>{const ok=Array.isArray(c)&&(c.length===2||c.length===4)&&Number.isInteger(c[0])&&Number.isInteger(c[1])&&c[0]>=last&&c[1]>=c[0]&&c[1]<=b.end&&!text.slice(last,c[0]).trim();last=c[1];return ok;})&&!text.slice(last,b.end).trim();
   if(valid){
    if(plain)out.push(b.rows.map(row=>row.map(c=>text.slice(c[0],c[1]).trim()).join('\t')).join('\n'));
    else out.push('<div class="text-table-scroll material-table-scroll" tabindex="0" aria-label="문제에 제시된 자료 표"><table class="text-material-table">'+headings(b.headers,escape)+'<tbody>'+b.rows.map((row,n)=>'<tr>'+row.map(c=>{const tag=b.header&&n===0?'th':'td';return '<'+tag+(tag==='th'?' scope="col"':'')+'>'+cellHTML(text,c,paragraphs,escape)+'</'+tag+'>';}).join('')+'</tr>').join('')+'</tbody></table></div>');
   }else out.push(prose(text.slice(b.start,b.end)));
  }else{
   const body=cuts.slice(0,-1).map((a,i)=>{const part=prose(text.slice(a,cuts[i+1]));return !plain&&b.title&&i===0?'<div class="material-title">'+part+'</div>':part;}).join(plain?'\n\n':'');
   out.push(plain?body:'<section class="question-material" aria-label="문제에 제시된 자료">'+body+'</section>');
  }
  pos=b.end;
 }
 out.push(prose(text.slice(pos)));return out.filter(Boolean).join(plain?'\n\n':'');
}
function groups(id,count){const g=database?.questions?.[id]?.statementGroups||[];let last=-1;return g.filter(x=>{if(!Array.isArray(x)||!x.length||x.some((n,i)=>!Number.isInteger(n)||n<=last||n>=count||(i&&n!==x[i-1]+1)))return false;last=x.at(-1);return true;});}
const api={plan,render,groups,choiceHTML,shared,reference};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyLayout=api;
})(typeof window!=='undefined'?window:globalThis);

