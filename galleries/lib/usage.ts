import {pacificBoundary,nextDay} from './usage-dates';
import {db,read} from './server';
import {digest} from './lightroom';
export const kinds=['gallery_view','gallery_section','gallery_review','download_requested','download_received','download_failed','portfolio_view','portfolio_navigation'] as const;
const uuid=/^[a-f0-9-]{36}$/;
export async function usageIdentity(req:Request){
 const raw=req.headers.get('X-Usage-Browser')||'',actor=uuid.test(raw)?await digest('usage:'+raw):'';
 const session=req.headers.get('X-Client-Session')||'';
 const who=/^hasaccount_[a-f0-9]{64}$/.test(session)?await db().prepare('SELECT contact_id FROM client_sessions WHERE hash=? AND expires>?').bind(await digest(session),Date.now()).first<{contact_id:string}>():null;
 const mode=req.headers.get('X-Usage-Mode');return {actor,account_id:who?.contact_id||'',audience:mode==='owner'||mode==='test'?mode:'audience'};
}
export async function recordUsage(req:Request,a:{id:string;kind:string;gallery?:string;page?:string;from?:string;count?:number}){
 if(!uuid.test(a.id)||!kinds.includes(a.kind as any))throw Error('Invalid activity event.');
 const who=await usageIdentity(req);if(!who.actor)return;
 const id=await digest(who.actor+':'+a.id+':'+a.kind),at=new Date().toISOString();
 await db().batch([db().prepare('INSERT OR IGNORE INTO usage_events(id,kind,at,actor,account_id,audience,gallery_id,page,from_page,file_count,operation_id) VALUES(?,?,?,?,?,?,?,?,?,?,?)').bind(id,a.kind,at,who.actor,who.account_id,who.audience,a.gallery||'',a.page||'',a.from||'',Math.max(0,Math.min(1000,Math.floor(a.count||0))),a.kind.startsWith('download_')?a.id:''),db().prepare('DELETE FROM usage_events WHERE at<?').bind(new Date(Date.now()-180*86400000).toISOString())]);
}
export async function usageReport(start:string,end:string){const lo=pacificBoundary(start),hi=pacificBoundary(nextDay(end));if(lo>=hi||Date.parse(hi)-Date.parse(lo)>93*86400000)throw Error('Choose a range of up to 92 days.');
 const collected=await db().prepare("SELECT started_at FROM usage_collection WHERE id='v1'").first<{started_at:string}>();
 const exclusions=(await db().prepare('SELECT * FROM usage_exclusions').all()).results as any[];
 const rows=(await db().prepare('SELECT * FROM usage_events WHERE at>=? AND at<? ORDER BY at,id LIMIT 50001').bind(lo,hi).all()).results as any[];
 if(rows.length>50000)throw Error('Too many events. Choose a smaller date range.');
 const excluded=(r:any)=>r.audience!=='audience'||exclusions.some(x=>(x.kind==='browser'&&x.subject===r.actor)||(x.kind==='account'&&x.subject===r.account_id)||(x.kind==='gallery'&&x.subject===r.gallery_id));
 const included=rows.filter(r=>!excluded(r));const counts=Object.fromEntries(kinds.map(k=>[k,included.filter(r=>r.kind===k).length]));const views=included.filter(r=>r.kind==='gallery_view'||r.kind==='portfolio_view');
 const {data}=await read();const keys=[...new Set(included.map(r=>r.gallery_id?'gallery:'+r.gallery_id:'portfolio:'+r.page))];const groups=keys.map(key=>{const e=included.filter(r=>(r.gallery_id?'gallery:'+r.gallery_id:'portfolio:'+r.page)===key);return {key,title:key.startsWith('gallery:')?data.galleries.find(g=>g.id===key.slice(8))?.title||key:key,views:e.filter(r=>r.kind==='gallery_view'||r.kind==='portfolio_view').length,requests:e.filter(r=>r.kind==='download_requested').length,receipts:e.filter(r=>r.kind==='download_received').length,failures:e.filter(r=>r.kind==='download_failed').length}});
 return {groups,start,end,timezone:'America/Los_Angeles',utc:{start:lo,endExclusive:hi},collectionStarted:collected?.started_at||null,retainedSince:new Date(Date.now()-180*86400000).toISOString(),coverage:collected&&lo>=collected.started_at&&Date.parse(lo)>=Date.now()-180*86400000?'Tracked period; blocked or interrupted requests can still be missing.':'Partial or untracked period. Missing history is not zero activity.',counts,viewEvents:views.length,browserEstimate:new Set(views.map(r=>r.actor)).size,verifiedAccounts:new Set(views.map(r=>r.account_id).filter(Boolean)).size,excludedEvents:rows.length-included.length,exclusions,events:rows.map(r=>({...r,excluded:excluded(r)})),definitions:{views:'One successful page opening. Reloads and later returns count again; polling and slideshow frames do not.',browserEstimate:'Distinct pseudonymous browser storage IDs among views. Not people: storage resets and multiple devices inflate this; blocking reduces it.',verifiedAccounts:'Distinct signed-in account IDs at event time among views. Not retroactively inferred from names.',downloads:'Requests and browser-received or failed attempts are separate events. Retries start new attempts; transport retries reuse an event ID. A receipt does not prove disk save.',failures:'Client-reported failures only. A missing receipt is unknown, not a failure.',privacy:'No tokens, email, notes, IP addresses or full URLs in analytics. Raw events retained 180 days.'}};
}
