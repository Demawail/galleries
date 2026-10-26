import {db,read} from './server';
import {usageReport} from './usage';
import {pacificBoundary,nextDay} from './usage-dates';
export async function statsReport(start:string,end:string){
 const usage=await usageReport(start,end),{data}=await read();
 const lo=pacificBoundary(start),hi=pacificBoundary(nextDay(end));
 const events=(await db().prepare('SELECT * FROM studio_events WHERE at>=? AND at<? ORDER BY at DESC LIMIT 5001').bind(lo,hi).all()).results;
 const portfolio=(await db().prepare("SELECT id,created_at AS at,'Portfolio' AS title,'Portfolio photograph added' AS kind,alt AS filename FROM portfolio_assets WHERE created_at>=? AND created_at<? ORDER BY created_at DESC LIMIT 5001").bind(lo,hi).all()).results;
 const legacy=data.galleries.flatMap(g=>g.activity.filter(e=>e.at>=lo&&e.at<hi).map((e,i)=>({id:g.id+':'+i,at:e.at,title:g.title,kind:e.text,filename:''})));
 const records=(await db().prepare('SELECT id,kind,payload,updated_at FROM stats_records ORDER BY updated_at DESC LIMIT 500').all()).results.map((r:any)=>({id:r.id,kind:r.kind,updatedAt:r.updated_at,...JSON.parse(r.payload)}));
 return {usage,records,inventory:data.galleries.map(g=>({id:g.id,title:g.title,client:g.client,status:g.status,photos:g.photos.filter(p=>!p.demo).length,bytes:g.photos.filter(p=>!p.demo).reduce((n,p)=>n+p.bytes,0),pins:g.clientPins?.length||0,notes:g.reviewers.reduce((n,r)=>n+Object.values(r.notes).filter(Boolean).length,0),submissions:g.submissionHistory?.length||0,expires:g.expires})),events:events.slice(0,5000),portfolio:portfolio.slice(0,5000),truncated:events.length>5000||portfolio.length>5000,legacy:legacy.sort((a,b)=>b.at.localeCompare(a.at)),historyNote:'The durable upload ledger begins with the Stats release. Older gallery activity is partial, limited to the latest 100 entries per gallery. Shoot dates are not upload dates. Portfolio additions use their recorded creation time.'};
}
export async function saveStatsRecord(id:string,kind:string,payload:unknown){await db().prepare('INSERT INTO stats_records(id,kind,payload,updated_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(id,kind,JSON.stringify(payload),new Date().toISOString()).run()}
