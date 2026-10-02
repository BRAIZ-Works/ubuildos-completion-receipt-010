export const VALUE_BANDS = ['UNDER_1K','1K_5K','5K_15K','15K_PLUS'];
export const RESPONSE_STATES = ['NO_RESPONSE','ASKED_QUESTION','FOLLOW_UP_LATER','DECLINED','ACCEPTED'];
export const QUOTE_STATES = ['OPEN','PENDING','WON','LOST','WITHDRAWN'];
export const CLOSED_STATES = new Set(['WON','LOST','WITHDRAWN']);
export const REQUIRED_FIELDS = ['quote_id','customer_alias','sent_date','value_band','next_follow_up_date','owner','response_state','quote_state'];

export function isIsoDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return false;
  const [y,m,d]=value.split('-').map(Number); const dt=new Date(Date.UTC(y,m-1,d));
  return dt.getUTCFullYear()===y && dt.getUTCMonth()===m-1 && dt.getUTCDate()===d;
}
export function validateRecord(r){
  const reasons=[];
  for(const f of REQUIRED_FIELDS){ if(r[f]===undefined || r[f]===null || String(r[f]).trim()==='') reasons.push(`Missing required field: ${f}`); }
  if(r.sent_date && !isIsoDate(r.sent_date)) reasons.push('Invalid sent_date; expected YYYY-MM-DD');
  if(r.next_follow_up_date && !isIsoDate(r.next_follow_up_date)) reasons.push('Invalid next_follow_up_date; expected YYYY-MM-DD');
  if(r.last_contact_date && !isIsoDate(r.last_contact_date)) reasons.push('Invalid last_contact_date; expected YYYY-MM-DD');
  if(r.value_band && !VALUE_BANDS.includes(r.value_band)) reasons.push(`Unknown value_band: ${r.value_band}`);
  if(r.response_state && !RESPONSE_STATES.includes(r.response_state)) reasons.push(`Unknown response_state: ${r.response_state}`);
  if(r.quote_state && !QUOTE_STATES.includes(r.quote_state)) reasons.push(`Unknown quote_state: ${r.quote_state}`);
  return reasons;
}
export function computeRecord(source, asOfDate){
  const r=structuredClone(source);
  const reasons=validateRecord(r);
  if(!isIsoDate(asOfDate)) reasons.push('Invalid as_of_date; expected YYYY-MM-DD');
  let due_state='REVIEW', computed_reason=reasons.join('; ');
  if(!reasons.length){
    if(CLOSED_STATES.has(r.quote_state)){
      due_state='CLOSED'; computed_reason=`Quote state ${r.quote_state} is closed; timing does not create a follow-up.`;
    } else if(r.next_follow_up_date < asOfDate){
      due_state='OVERDUE'; computed_reason=`Next follow-up ${r.next_follow_up_date} is before as-of ${asOfDate}.`;
    } else if(r.next_follow_up_date === asOfDate){
      due_state='DUE_TODAY'; computed_reason=`Next follow-up equals as-of ${asOfDate}.`;
    } else {
      due_state='UPCOMING'; computed_reason=`Next follow-up ${r.next_follow_up_date} is after as-of ${asOfDate}.`;
    }
  }
  return {...r, due_state, computed_reason, as_of_date: asOfDate};
}
export function computeDataset(records, asOfDate){
  const seen=new Set();
  return records.map(r=>{
    const out=computeRecord(r,asOfDate);
    if(r.quote_id && seen.has(r.quote_id)) return {...out,due_state:'REVIEW',computed_reason:`Duplicate quote_id: ${r.quote_id}`};
    if(r.quote_id) seen.add(r.quote_id);
    return out;
  });
}
export function filterRows(rows,{search='',due='ALL',owner='ALL',response='ALL',value='ALL'}={}){
  const q=search.trim().toLowerCase();
  return rows.filter(r=>(!q || [r.quote_id,r.customer_alias,r.owner,r.response_state,r.value_band,r.notes].some(v=>String(v||'').toLowerCase().includes(q)))
    && (due==='ALL'||r.due_state===due) && (owner==='ALL'||r.owner===owner) && (response==='ALL'||r.response_state===response) && (value==='ALL'||r.value_band===value));
}
export function sortRows(rows,key='next_follow_up_date',dir='asc'){
  const mul=dir==='desc'?-1:1; return [...rows].sort((a,b)=>String(a[key]??'').localeCompare(String(b[key]??''))*mul);
}
const CSV_FIELDS=['quote_id','customer_alias','sent_date','value_band','next_follow_up_date','owner','response_state','quote_state','last_contact_date','notes','due_state','computed_reason','as_of_date'];
const esc=v=>`"${String(v??'').replaceAll('"','""')}"`;
export function toCsv(rows){return [CSV_FIELDS.join(','),...rows.map(r=>CSV_FIELDS.map(f=>esc(r[f])).join(','))].join('\n')+'\n';}
export function toJson(rows){return JSON.stringify(rows,null,2)+'\n';}
