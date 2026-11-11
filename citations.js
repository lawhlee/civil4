(function(root){'use strict';
// Citation recognition does not change the textbook text or infer an OCR correction.
const CODES=('민재항 다카 감도 전도 카기 구단 고합 느합 초기 고단 가합 민상 형상 행상 민공 헌마 헌바 헌가 헌라 헌나 헌사 헌다 헌아 다 도 므 마 스 두 모 누 그 나 노 어 초 추 무 오 아 브 르 허 우').split(' ');
// A scan line may divide any part of a citation; a blank paragraph may not.
const gap='[ \\t\\u00a0]*(?:\\r?\\n[ \\t\\u00a0]*)?';
const codePattern=CODES.sort((a,b)=>b.length-a.length).map(s=>s.split('').join(gap)).join('|');
const source='(?<![0-9A-Za-z])(?:(?:1'+gap+'9|2'+gap+'0|4'+gap+'2)'+gap+'\\d'+gap+'\\d|\\d'+gap+'\\d)'+gap+'(?:'+codePattern+')'+gap+'\\d(?:'+gap+'\\d){0,6}(?!'+gap+'\\d)';
const abbreviated=new RegExp('^'+gap+'[,·ㆍ]'+gap+'(\\d(?:'+gap+'\\d){0,6})(?!'+gap+'\\d)');
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalize=value=>String(value||'').replace(/\s+/g,'');
let verified=Object.create(null),initPromise;
function extract(text){
 const original=String(text||''),full=Array.from(original.matchAll(new RegExp(source,'g'))),result=[];
 for(let i=0;i<full.length;i++){
  const m=full[i],number=normalize(m[0]),kind=number.includes('헌')?'detc':'prec';
  result.push({raw:m[0],caseNumber:number,kind,start:m.index,end:m.index+m[0].length});
  const prefix=number.replace(/\d+$/,''),limit=full[i+1]?.index??original.length;let end=m.index+m[0].length;
  while(end<limit){
   const tail=original.slice(end,limit).match(abbreviated);if(!tail)break;
   const nextEnd=end+tail[0].length,following=original.slice(nextEnd).replace(/^[ \t\r\n\u00a0]+/,'');
   // Reject a date, a numbered list, another full case number, or an OCR-like code.
   // Commas / middle dots abbreviate the same year and case code, never the serial digits.
   if(/^[.\/:\-–—]/.test(following)||/^[0-9A-Za-z]/.test(following))break;
   if(/^[가-힣]/.test(following)&&!/^(?:등|둥|참조|판결|결정|사건|병합|전원합의체)(?:$|[\s.,;:()（）\[\]가-힣])/.test(following))break;
   const start=nextEnd-tail[1].length;
   result.push({raw:tail[1],caseNumber:prefix+normalize(tail[1]),kind,start,end:nextEnd,abbreviated:true});end=nextEnd;
  }
 }
 return result;
}
function validNumber(value){const matches=extract(value);return matches.length===1&&matches[0].start===0&&matches[0].end===value.length;}
function safeOfficialUrl(value){
 try{
  const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash)return null;
  const law=/^(?:www\.)?law\.go\.kr$/.test(u.hostname)&&u.pathname.match(/^\/(?:LSW\/)?(prec|detc)InfoP\.do$/);
  const nhis=u.hostname==='www.nhis.or.kr'&&u.pathname.match(/^\/lm\/lmxsrv\/data\/(prec|detc)View\.do$/);
  const match=law||nhis;if(!match)return null;
  const parameter=law?match[1]+'Seq':'seqn';if([...u.searchParams].length!==1||!/^\d+$/.test(u.searchParams.get(parameter)||''))return null;
  return {url:u.href,kind:match[1],provider:law?'law':'nhis'};
 }catch(_){return null;}
}
function officialMetadataMatches(entry,key,kind){
 if(entry.provider!=='nhis'||typeof entry.metadataCaseNumber!=='string'||!extract(entry.metadataCaseNumber).some(m=>m.caseNumber===key))return false;
 try{
  const u=new URL(entry.metadataUrl);
  if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||u.hostname!=='www.nhis.or.kr'||u.pathname!=='/lm/lmxsrv/data/'+kind+'List.do')return false;
  const params=[...u.searchParams];if(new Set(params.map(([k])=>k)).size!==params.length)return false;
  const dateQuery=u.searchParams.get('searchType')===(kind==='prec'?'stcDt':'endDt')&&/^\d{8}$/.test(u.searchParams.get('searchKeyword')||'');
  const undatedQuery=kind==='detc'&&u.searchParams.get('searchSort')==='5'&&u.searchParams.get('page')==='1'&&!u.searchParams.has('searchType')&&!u.searchParams.has('searchKeyword');
  return params.every(([k,v])=>['pageShow','page'].includes(k)?/^\d+$/.test(v):(dateQuery&&['searchType','searchKeyword'].includes(k))||(undatedQuery&&k==='searchSort'));
 }catch(_){return false;}
}
function setIndex(index){
 const next=Object.create(null);
 for(const [number,entry] of Object.entries(index?.verified||{})){
  const key=normalize(number),target=safeOfficialUrl(entry?.url),kind=key.includes('헌')?'detc':'prec';
  if(!validNumber(key)||!target||target.kind!==kind||(entry.kind!=null&&entry.kind!==kind)||!/^\d{4}-\d{2}-\d{2}$/.test(entry.verifiedAt||''))continue;
  const bodyEvidence=entry.verification==='official-case-body'&&entry.verifiedCaseNumber===key&&/^[a-f0-9]{64}$/.test(entry.evidenceSha256||'')&&typeof entry.caseNumberEvidence==='string'&&extract(entry.caseNumberEvidence).some(m=>m.caseNumber===key);
  const accepted=target.provider==='law'?(entry.verification==='official-header'||bodyEvidence):entry.verification==='official-metadata'&&officialMetadataMatches(entry,key,kind);
  if(accepted)next[key]={...entry,url:target.url,provider:target.provider};
 }
 verified=next;return Object.keys(verified).length;
}
function mergeIndex(index){const retained=verified;setIndex(index);verified=Object.assign(Object.create(null),retained,verified);return Object.keys(verified).length;}
function linkFor(value){
 const number=normalize(value);if(!validNumber(number))return null;
 const kind=number.includes('헌')?'detc':'prec',entry=verified[number];
 if(entry){const label=entry.provider==='nhis'?'국민건강보험공단 건강LAW 원문':'국가법령정보센터 원문';const method=entry.verification==='official-metadata'?'공식 목록 사건번호 대조':entry.verification==='official-case-body'?'공식 원문 병합사건 확인':'원문 사건번호 확인';return {...entry,caseNumber:number,kind,status:'verified',label,title:number+' · '+label+(entry.provider==='nhis'?' (국가법령정보센터 제공)':'')+' · '+method+': '+entry.verifiedAt};}
 return {caseNumber:number,kind,status:'search',label:'국가법령정보센터 검색',title:number+' · 국가법령정보센터 검색 (원문 수록 여부 미확인)',url:'https://www.law.go.kr/'+(kind==='detc'?'detcSc.do':'precSc.do')+'?menuId=7&query='+encodeURIComponent(number)};
}
function inline(text){const original=String(text||'');let end=0,html='';for(const match of extract(original)){const link=linkFor(match.caseNumber);html+=escape(original.slice(end,match.start));html+='<a class="citation-link citation-'+link.status+'" data-case-number="'+escape(match.caseNumber)+'" data-citation-status="'+link.status+'" href="'+escape(link.url)+'" target="_blank" rel="noopener noreferrer" title="'+escape(link.title)+'" aria-label="'+escape(link.title)+'">'+escape(match.raw)+'</a>';end=match.end;}return html+escape(original.slice(end));}
function paragraphs(text){const T=root.StudyText||(typeof module!=='undefined'&&module.exports?require('./text.js'):null);return (T?T.reflow(text):String(text||'').trim()).split(/\n\s*\n/).filter(Boolean).map(p=>'<p>'+inline(p)+'</p>').join('');}
function init(url='./data/case-links.json'){
 if(!initPromise){
  const urls=url==='./data/case-links.json'?[url,'./data/case-link-supplements.json']:[url];
  initPromise=typeof root.fetch==='function'?Promise.all(urls.map(source=>root.fetch(source,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error('판례 링크 목록을 읽을 수 없습니다.');return r.json();}).catch(()=>null))).then(indices=>{for(const index of indices)if(index)mergeIndex(index);return Object.keys(verified).length;}):Promise.resolve(0);
 }
 return initPromise;
}
const api={extract,normalize,linkFor,inline,paragraphs,setIndex,mergeIndex,init};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyCitations=api;
})(typeof window!=='undefined'?window:globalThis);


