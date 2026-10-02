import {computeDataset,filterRows,sortRows,toCsv,toJson,VALUE_BANDS,RESPONSE_STATES,QUOTE_STATES} from './tracker.mjs';
let source=[],computed=[],visible=[];
const $=s=>document.querySelector(s);
const asOf=$('#as-of'), tbody=$('#rows'), status=$('#status'), count=$('#count');
function fillSelect(el,values){for(const v of values){const o=document.createElement('option');o.value=v;o.textContent=v.replaceAll('_',' ');el.append(o);}}
fillSelect($('#response-filter'),RESPONSE_STATES); fillSelect($('#value-filter'),VALUE_BANDS);
function stateClass(s){return 'state '+s.toLowerCase();}
function render(){
  computed=computeDataset(source,asOf.value);
  visible=filterRows(computed,{search:$('#search').value,due:$('#due-filter').value,owner:$('#owner-filter').value,response:$('#response-filter').value,value:$('#value-filter').value});
  visible=sortRows(visible,$('#sort-key').value,$('#sort-dir').value);
  tbody.replaceChildren();
  for(const r of visible){
    const tr=document.createElement('tr');
    for(const f of ['quote_id','customer_alias','sent_date','value_band','next_follow_up_date','owner','response_state','quote_state']){const td=document.createElement('td');td.textContent=r[f]??'';tr.append(td);}
    const td=document.createElement('td'); const badge=document.createElement('span');badge.className=stateClass(r.due_state);badge.textContent=r.due_state.replaceAll('_',' ');td.append(badge);tr.append(td);
    const why=document.createElement('td');why.textContent=r.computed_reason;tr.append(why);tbody.append(tr);
  }
  const due=computed.filter(r=>['OVERDUE','DUE_TODAY'].includes(r.due_state)).length;
  const review=computed.filter(r=>r.due_state==='REVIEW').length;
  count.textContent=`${visible.length} visible / ${computed.length} total`;
  status.textContent=`As of ${asOf.value}: ${due} due or overdue, ${review} review.`;
}
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
for(const id of ['search','due-filter','owner-filter','response-filter','value-filter','sort-key','sort-dir','as-of']) $(`#${id}`).addEventListener('input',render);
$('#export-csv').addEventListener('click',()=>download('quote-follow-up-current-view.csv',toCsv(visible),'text/csv'));
$('#export-json').addEventListener('click',()=>download('quote-follow-up-current-view.json',toJson(visible),'application/json'));
$('#add-demo').addEventListener('click',()=>{source.push({quote_id:`Q-${1100+source.length}`,customer_alias:'Demo Prospect',sent_date:asOf.value,value_band:'1K_5K',next_follow_up_date:asOf.value,owner:'Avery',response_state:'NO_RESPONSE',quote_state:'OPEN',notes:'Added locally in this browser only'});render();});
$('#edit-first').addEventListener('click',()=>{if(!source.length)return;source[0]={...source[0],response_state:'ASKED_QUESTION',notes:'Edited locally in this browser only'};render();});
fetch('./data/quotes.json').then(r=>r.json()).then(d=>{source=d; const owners=[...new Set(d.map(x=>x.owner))].sort();fillSelect($('#owner-filter'),owners);render();}).catch(e=>{status.textContent='REVIEW: sample data failed to load. '+e.message;});
window.__DAY09__={get source(){return source},get computed(){return computed},get visible(){return visible},render};
