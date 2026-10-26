import {env} from 'cloudflare:workers';
import {db,bucket} from '@/lib/server';
import {archiveConfigured,jobRow,validateArchive} from '@/lib/archive-jobs';
const headers={'Cache-Control':'no-store'};
function authorized(req:Request){return archiveConfigured()&&req.headers.get('Authorization')==='Bearer '+(env as any).HAS_ZIP_WORKER_TOKEN}
export async function GET(req:Request){try{
 if(!authorized(req))return new Response('Forbidden',{status:403});const u=new URL(req.url),job=await jobRow(u.searchParams.get('id')||'');if(!job)return new Response('Missing',{status:404});
 if(u.searchParams.has('ticket')&&u.searchParams.get('ticket')!==job.secret)return new Response('Forbidden',{status:403});
 const {files}=await validateArchive(job);
 if(u.searchParams.has('photo')){if(job.status!=='building'||job.lease!==u.searchParams.get('lease')||job.lease_until<Date.now())throw Error('Lease expired.');const file=files.find(f=>f.id===u.searchParams.get('photo'));if(!file)return new Response('Missing',{status:404});const object=await bucket().get(file.key);if(!object)return new Response('Missing',{status:404});return new Response(object.body,{headers:{...headers,'Content-Type':'image/jpeg'}})}
 return Response.json({id:job.id,status:job.status,lease:job.lease,expires:job.expires,count:files.length},{headers});
}catch{return new Response('Download unavailable',{status:410,headers})}}
export async function POST(req:Request){try{
 if(!authorized(req))return new Response('Forbidden',{status:403});const text=await req.text();if(text.length>2000)throw Error('Too large');const a=JSON.parse(text),job=await jobRow(a.id||'');if(!job)return new Response('Missing',{status:404});const {files}=await validateArchive(job),now=Date.now();
 if(a.action==='claim'){
 const lease=crypto.randomUUID();const result=await db().prepare("UPDATE download_jobs SET status='building',lease=?,lease_until=?,error=NULL WHERE id=? AND (status='queued' OR (status='building' AND lease_until<?)) RETURNING id").bind(lease,now+16*60000,job.id,now).first();
 if(!result)return Response.json({status:job.status},{status:job.status==='building'?409:200,headers});
 return Response.json({id:job.id,lease,expires:job.expires,files:files.map(f=>({id:f.id,name:f.id+'_'+f.filename.replace(/[^a-zA-Z0-9_.-]/g,'_')}))},{headers});
 }
 if(typeof a.lease!=='string'||job.lease!==a.lease||job.status!=='building'||job.lease_until<now)return new Response('Lease unavailable',{status:409});
 if(a.action==='complete'){
 if(!Number.isSafeInteger(a.bytes)||a.bytes<1||a.bytes>21*1024**3)throw Error('Invalid size');
 await db().prepare("UPDATE download_jobs SET status='ready',bytes=?,lease_until=0 WHERE id=? AND lease=? AND status='building'").bind(a.bytes,job.id,a.lease).run();
 }else if(a.action==='retry'||a.action==='fail'){
 await db().prepare('UPDATE download_jobs SET status=?,error=?,lease_until=0 WHERE id=? AND lease=? AND status=\'building\'').bind(a.action==='retry'?'queued':'failed',a.action==='fail'?'Could not prepare this ZIP. Please try a new download.':null,job.id,a.lease).run();
 }else throw Error('Invalid action');return Response.json({ok:true},{headers});
}catch{return new Response('Download unavailable',{status:410,headers})}}
