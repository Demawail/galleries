import {uploadArchive} from './zip64.mjs';
const idPattern=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function config(env){if(!/^https:\/\/[^/]+\/?$/.test(env.GALLERY_ORIGIN||'')||!env.GALLERY_SERVICE_TOKEN||!env.ZIP_WORKER_TOKEN)throw Error('Worker connection unavailable');return env.GALLERY_ORIGIN.replace(/\/$/,'')+'/api/archive-worker'}
async function gallery(env,body,params='',signal){const response=await fetch(config(env)+params,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.ZIP_WORKER_TOKEN,'OAI-Sites-Authorization':'Bearer '+env.GALLERY_SERVICE_TOKEN,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual',signal});return response}
export async function prepare(jobId,env,attempt=1){
 let lease;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12*60000);
 try{
  const response=await gallery(env,{id:jobId,action:'claim'},'',controller.signal);
  if(response.status===410||response.status===404){await response.body?.cancel();return}
  if(!response.ok){await response.body?.cancel();throw Error('Claim unavailable')}
  const job=await response.json();if(!job.lease)return;lease=job.lease;
  if(!Array.isArray(job.files)||!job.files.length||job.files.length>1000)throw Error('Invalid manifest');
  const key='archives/'+jobId+'/'+lease+'.zip';
  const streams=[];let started=0;
  const entries=job.files.map((f,index)=>({name:f.name,open:async()=>{
   // At most the current photograph plus two ahead. Keep ZIP order while
   // overlapping network latency; never load the whole gallery into memory.
   while(started<Math.min(job.files.length,index+3)){
    const source=job.files[started++];const pending=gallery(env,null,'?'+new URLSearchParams({id:jobId,lease,photo:source.id}),controller.signal).then(async r=>{if(!r.ok||!r.headers.get('Content-Type')?.startsWith('image/jpeg')){await r.body?.cancel();throw Error('Photo unavailable')}return r.body});
    pending.catch(()=>{});streams.push(pending);
   }
   return streams[index];
  }}));
  const bytes=await uploadArchive(env.ARCHIVES,key,entries,job.expires);
  const done=await gallery(env,{id:jobId,lease,action:'complete',bytes},'',controller.signal);await done.body?.cancel();if(!done.ok){await env.ARCHIVES.delete(key);throw Error('Completion unavailable')}
 }catch(e){if(lease){const r=await gallery(env,{id:jobId,lease,action:attempt>=3?'fail':'retry'},'',AbortSignal.timeout(15000)).catch(()=>null);await r?.body?.cancel()}throw e}finally{clearTimeout(timer);controller.abort()}
}
export default {
 async fetch(req,env){
  const u=new URL(req.url),direct=u.pathname.match(/^\/download\/([^/]+)\/([^/]+)$/);
  if(direct){
   if(req.method!=='GET'||!idPattern.test(direct[1])||!idPattern.test(direct[2])||! /^[a-f0-9]{64}$/.test(u.searchParams.get('ticket')||''))return new Response('Forbidden',{status:403});
   // Validate the capability and current gallery policy on every request,
   // including resumed downloads. No private service credential reaches clients.
   try{const check=await gallery(env,null,'?'+new URLSearchParams({id:direct[1],ticket:u.searchParams.get('ticket')}),AbortSignal.timeout(20000));if(!check.ok){await check.body?.cancel();return new Response('Download unavailable',{status:403})}const job=await check.json();if(job.status!=='ready'||job.lease!==direct[2])return new Response('Download unavailable',{status:403});}catch{return new Response('Download unavailable',{status:503})}
  }else if(!env.ZIP_WORKER_TOKEN||req.headers.get('Authorization')!=='Bearer '+env.ZIP_WORKER_TOKEN)return new Response('Forbidden',{status:403});
  if(u.pathname==='/jobs'&&req.method==='POST'){const text=await req.text();if(text.length>1000)return new Response('Too large',{status:413});let a;try{a=JSON.parse(text)}catch{return new Response('Invalid request',{status:400})}if(!idPattern.test(a.id||''))return new Response('Invalid request',{status:400});await env.ZIP_QUEUE.send({id:a.id});return Response.json({queued:true})}
  const match=direct||u.pathname.match(/^\/files\/([^/]+)\/([^/]+)$/);
  if(match&&req.method==='GET'&&idPattern.test(match[1])&&idPattern.test(match[2])){
   const requestedRange=req.headers.get('Range');if(requestedRange&&!/^bytes=\d*-\d*$/.test(requestedRange))return new Response('Invalid range',{status:416});
   const obj=await env.ARCHIVES.get('archives/'+match[1]+'/'+match[2]+'.zip',{range:req.headers});if(!obj)return new Response('Missing',{status:404});if(Number(obj.customMetadata?.expires||0)<=Date.now()){await obj.body?.cancel();return new Response('Expired',{status:410})}
   const h=new Headers({'Content-Type':'application/zip','Content-Disposition':'attachment; filename="HAS-photographs.zip"','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Cache-Control':'private, no-store','Accept-Ranges':'bytes','ETag':obj.httpEtag});
   const range=obj.range;let status=200;if(range&&'offset'in range&&'length'in range){status=206;h.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${obj.size}`);h.set('Content-Length',String(range.length))}else h.set('Content-Length',String(obj.size));return new Response(obj.body,{status,headers:h});
  }
  return new Response('Not found',{status:404});
 },
 async queue(batch,env){for(const m of batch.messages){if(!idPattern.test(m.body?.id||'')){m.ack();continue}try{await prepare(m.body.id,env,m.attempts);m.ack()}catch{if(m.attempts>=3)m.ack();else m.retry({delaySeconds:60})}}}
};
