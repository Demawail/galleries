import {storageSnapshot} from '@/lib/storage-stats';
import {db} from '@/lib/server';
import {statsReport,saveStatsRecord} from '@/lib/stats';
import {text,validateReading} from '@/lib/stats-validation';
import {usageReport} from '@/lib/usage';
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(req:Request){try{const q=new URL(req.url).searchParams;return json(await statsReport(q.get('start')||'',q.get('end')||''))}catch(e){return json({error:(e as Error).message},400)}}
export async function POST(req:Request){try{
 if(req.headers.get('Origin')!==new URL(req.url).origin||req.headers.get('Sec-Fetch-Site')==='cross-site')throw Error('Request not allowed.');
 const raw=await req.text();if(raw.length>60000)throw Error('Report is too large.');const a=JSON.parse(raw);
 if(a.action==='storage'){const old=await db().prepare("SELECT payload FROM stats_records WHERE id='storage'").first<{payload:string}>();if(old&&Date.now()-Date.parse(JSON.parse(old.payload).observed)<3600000)return json({ok:true,cached:true});const result=await storageSnapshot();await saveStatsRecord('storage','storage',result);return json({ok:true})}
 if(a.action==='reading'){const reading=validateReading(a);await saveStatsRecord('reading:'+reading.provider+':'+reading.account+':'+reading.period,'reading',reading);return json({ok:true})}
 if(a.action==='report'){const start=text(a.start,10),end=text(a.end,10),u=await usageReport(start,end);const title=text(a.title,180);if(!title)throw Error('Give the report a title.');const report={start,end,title,summary:text(a.summary),fixes:text(a.fixes),recommendations:text(a.recommendations),limitations:text(a.limitations),source:text(a.source,500),evidence:{counts:u.counts,groups:u.groups,coverage:u.coverage,collectionStarted:u.collectionStarted,viewEvents:u.viewEvents,browserEstimate:u.browserEstimate,verifiedAccounts:u.verifiedAccounts,excludedEvents:u.excludedEvents},savedAt:new Date().toISOString()};await saveStatsRecord('report:'+start+':'+end,'report',report);return json({ok:true})}
 throw Error('Unknown action.');
 }catch(e){return json({error:(e as Error).message},400)}}
