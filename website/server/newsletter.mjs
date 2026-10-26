// The recipient and sender are fixed server-side. No gallery links or review data leave the site.
export async function handleNewsletter(request, env, send = fetch) {
 const origin=request.headers.get('Origin'), allowed=new Set([new URL(request.url).origin,'https://studio.example.invalid','https://studio.example.invalid','https://galleries.example.invalid']);
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin',...(origin&&allowed.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
 const reply=(data,status=200)=>Response.json(data,{status,headers});
 if(origin&&!allowed.has(origin))return reply({error:'Request not allowed.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST','Access-Control-Allow-Headers':'Content-Type'}});
 if(request.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))return reply({error:'Invalid request.'},400);
 if(!env.RESEND_API_KEY||!env.DB)return reply({error:'Signup is temporarily unavailable. Please try again later.'},503);
 let input;
 try{const reader=request.body?.getReader();if(!reader)return reply({error:'Missing email.'},400);let size=0,parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>2048){await reader.cancel();return reply({error:'Request too large.'},413)}parts.push(value)}input=JSON.parse(await new Blob(parts).text())}catch{return reply({error:'Invalid request.'},400)}
 const email=typeof input?.email==='string'?input.email.trim().toLowerCase():'';
 if(email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||/[\r\n<>]/.test(email)||input.consent!==true||input.website)return reply({error:'Please enter a valid email address and try again.'},400);
 const source=input.source==='gallery'?'gallery':'website';
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),v=>v.toString(16).padStart(2,'0')).join('');
 try{
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS newsletter_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL)').run();
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS newsletter_sent (id TEXT PRIMARY KEY, sent_at INTEGER NOT NULL)').run();
  const now=Date.now(),day=Math.floor(now/86400000),id=await hash(email+'|'+source+'|'+day),ip=await hash((request.headers.get('CF-Connecting-IP')||'unknown')+'|'+Math.floor(now/3600000));
  if(await env.DB.prepare('SELECT id FROM newsletter_sent WHERE id=?').bind(id).first())return reply({ok:true});
  const rate=await env.DB.prepare('INSERT INTO newsletter_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(ip,now+3600000).first();
  if(rate.count>5)return reply({error:'Too many attempts. Please try again in an hour.'},429);
  // Stable message + provider idempotency avoids duplicate notifications after a timeout.
  const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'newsletter/'+id},body:JSON.stringify({from:'Your Studio <newsletter@example.invalid>',to:['owner@example.invalid'],subject:'New Your Studio newsletter signup',text:'Newsletter signup: '+email+'\n\nSource: '+(source==='gallery'?'Studio Galleries review page':'Your Studio website')+'\nConsent: Visitor selected Subscribe and agreed to receive the Your Studio newsletter.\n\nPlease add this email to the newsletter list.'}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)return reply({error:'Your signup could not be sent. Please try again.'},502);
  const result=await response.json();if(!result.id)return reply({error:'Your signup could not be confirmed. Please try again.'},502);
  await env.DB.prepare('INSERT OR IGNORE INTO newsletter_sent(id,sent_at) VALUES(?,?)').bind(id,now).run();
  await env.DB.batch([env.DB.prepare('DELETE FROM newsletter_limits WHERE expires<?').bind(now),env.DB.prepare('DELETE FROM newsletter_sent WHERE sent_at<?').bind(now-172800000)]);
  return reply({ok:true});
 }catch{return reply({error:'Your signup could not be confirmed. Please try again.'},502)}
}
