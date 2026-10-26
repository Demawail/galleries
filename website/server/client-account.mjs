import {queueGalleryAlert} from './gallery-alerts.mjs';
// Account gateway; the private API's sign-in secrets never reach JSON responses.
export async function handleClientAccount(req,env,send=fetch,ctx){
 const u=new URL(req.url),action=u.pathname.split('/')[2],headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive'};
 const reply=(v,status=200,extra={})=>Response.json(v,{status,headers:{...headers,...extra}});
 if(!['state','request','verify','note','logout'].includes(action)||u.pathname!=='/client-account/'+action)return reply({error:'Not found'},404);
 if(req.method!==(action==='state'?'GET':'POST'))return reply({error:'Not found'},404);
 if(req.method==='POST'&&((req.headers.get('Origin')&&req.headers.get('Origin')!==u.origin)||req.headers.get('Sec-Fetch-Site')==='cross-site'))return reply({error:'Request not allowed.'},403);
 if(!env.HAS_GALLERY_SERVICE_TOKEN)return reply({error:'Account service is unavailable.'},503);
 try{
 let body='';if(req.method==='POST'){const reader=req.body?.getReader();if(!reader)return reply({error:'Missing request'},400);let size=0;const parts=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12000){await reader.cancel();return reply({error:'Request too large'},413)}parts.push(value)}body=await new Blob(parts).text();JSON.parse(body)}
 if(action==='request'){
  if(!env.RESEND_API_KEY)return reply({error:'Email sign-in is temporarily unavailable.'},503);
  const now=Date.now(),ip=req.headers.get('CF-Connecting-IP')||'unknown',bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+':'+Math.floor(now/3600000))),id=Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
  const rate=await env.DB.prepare('INSERT INTO client_account_limits(id,count,expires) VALUES(?,1,?) ON CONFLICT(id) DO UPDATE SET count=count+1 RETURNING count').bind(id,now+7200000).first();if(rate.count>15)return reply({error:'Please wait before requesting another sign-in email.'},429);await env.DB.prepare('DELETE FROM client_account_limits WHERE expires<?').bind(now).run();
 }
 const h={'OAI-Sites-Authorization':'Bearer '+env.HAS_GALLERY_SERVICE_TOKEN,'Content-Type':'application/json'};const session=req.headers.get('Cookie')?.match(/(?:^|;\s*)has_client_session=(hasaccount_[a-f0-9]{64})(?:;|$)/)?.[1];if(session)h['X-Client-Session']=session;
 const r=await send('https://galleries.example.invalid/api/client-account/'+action,{method:req.method,headers:h,...(body?{body}:{}),redirect:'manual'});if(!(r.headers.get('Content-Type')||'').includes('application/json'))return reply({error:'Account service is unavailable.'},502);const j=await r.json();if(!r.ok)return reply({error:j.error||'Unable to complete this request.'},r.status);
 if(action==='request'){
  const link='https://studio.example.invalid/my-galleries/#signin='+j.token;
  const mail=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'Your Studio <newsletter@example.invalid>',to:[j.email],subject:'Your Studio Galleries sign-in link',text:'Open your personal gallery history:\n\n'+link+'\n\nThis one-use link expires in 15 minutes. Keep it private. If you did not request it, you can ignore this email. Signing in does not subscribe you to a newsletter.'}),signal:AbortSignal.timeout(12000)});if(!mail.ok)return reply({error:'We could not send the link. Please try again.'},502);return reply({ok:true});
 }
 if(action==='verify'){if(!/^hasaccount_[a-f0-9]{64}$/.test(j.session))return reply({error:'Sign-in failed.'},502);await queueGalleryAlert(j.notification,env,send,ctx);await queueGalleryAlert(j.signupNotification,env,send,ctx);return reply({ok:true},200,{'Set-Cookie':'has_client_session='+j.session+'; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=2592000'})}
 if(action==='logout')return reply({ok:true},200,{'Set-Cookie':'has_client_session=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0'});
 return reply(j);
 }catch{return reply({error:'Unable to complete this request. Please try again.'},503)}
}
