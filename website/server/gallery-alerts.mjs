// Events come only from the authenticated private Galleries service.
export async function queueGalleryAlert(event,env,send=fetch,ctx){
 if(!event||!['signup','signin','download','submission'].includes(event.kind)||typeof event.id!=='string')return;
 const task=deliverGalleryAlert(event,env,send).catch(()=>console.error('Gallery owner alert failed; client operation unaffected.'));
 if(ctx?.waitUntil)ctx.waitUntil(task);else await task;
}
export async function deliverGalleryAlert(event,env,send=fetch){
 const settings=event.settings||{recipient:'owner@example.invalid',signup:true,signin:true,download:true,submission:true};
 if(settings[event.kind]!==true)return;
 if(typeof settings.recipient!=='string'||settings.recipient.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.recipient))throw Error('Invalid alert recipient');
 if(!env.RESEND_API_KEY)throw Error('Email unavailable');
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(event.kind+':'+event.id));
 const id=Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
 const now=Date.now();
 const claim=await env.DB.prepare('INSERT INTO gallery_alerts(id,created_at,lease) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET lease=excluded.lease WHERE sent_at IS NULL AND lease<? RETURNING id').bind(id,now,now+60000,now).first();
 if(!claim)return;
 const clean=x=>String(x||'').replace(/[\r\n]/g,' ').slice(0,250);
 const who=event.email?clean(event.name)+' <'+clean(event.email)+'>':clean(event.name)+' (name supplied by visitor, email not verified)';
 const at=new Date(event.at).toLocaleString('en-US',{timeZone:'America/Los_Angeles',dateStyle:'medium',timeStyle:'short'})+' Pacific';
 const subject=event.kind==='submission'?clean(event.name)+' has completed their pin request':event.kind==='signup'?'Galleries: new client '+clean(event.email):event.kind==='signin'?'Galleries: '+clean(event.email)+' signed in':'Galleries: '+clean(event.name)+' downloaded '+Number(event.count)+' image'+(Number(event.count)===1?'':'s');
 const text=event.kind==='submission'?`${who} has completed their pin request.\n\nGallery: ${clean(event.title)}\nPins submitted: ${Number(event.count)}\nWhen: ${at}\n\nView selections: https://galleries.example.invalid/studio/${encodeURIComponent(event.galleryId)}\n\nThis is the gallery’s shared shortlist, submitted by the named reviewer.`:event.kind==='signup'?`${who} created a gallery account and verified their email.\n\nWhen: ${at}`:event.kind==='signin'?`${who} signed in to their gallery history.\n\nWhen: ${at}`:`${who} downloaded images.\n\nGallery: ${clean(event.title)}\nImages: ${Number(event.count)}\nSize: ${clean(event.size)}\nWhen: ${at}\n\nThe browser confirmed receipt of this download. This does not confirm a save to disk.`;
 const body=JSON.stringify({from:'Your Studio <newsletter@example.invalid>',to:[settings.recipient],subject,text});
 try{
  for(let attempt=0;attempt<3;attempt++){
   try{
    const response=await send('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'gallery-alert/'+id},body,signal:AbortSignal.timeout(7000)});
    if(response.ok){await env.DB.prepare('UPDATE gallery_alerts SET sent_at=?,lease=0 WHERE id=?').bind(Date.now(),id).run();return;}
   }catch(error){if(attempt===2)throw error;}
  }
  throw Error('Provider unavailable');
 }finally{await env.DB.prepare('UPDATE gallery_alerts SET lease=0 WHERE id=? AND sent_at IS NULL').bind(id).run();}
}
