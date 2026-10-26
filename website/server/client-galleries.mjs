import {queueGalleryAlert} from './gallery-alerts.mjs';
// Public capability gateway: only client operations, never owner APIs.
export async function handleClientGallery(req,env,send=fetch,ctx){
 const url=new URL(req.url),security={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'};
 const fail=(error,status)=>Response.json({error},{status,headers:security});
 const match=url.pathname.match(/^\/galleries\/([a-f0-9]{64})(?:\/(share\.png|state|join|review|resume|attach|received|event|share-collection|collection|archive|archives|archive-file\/[^/]+|download|calendar|photo\/[^/]+))?\/?$/);
 if(!match)return fail('Not found.',404);const token=match[1],action=match[2];
 if(!action||action==='share.png'){
  if(!['GET','HEAD'].includes(req.method))return fail('Not found.',404);
  if(!env.HAS_GALLERY_SERVICE_TOKEN)return fail('Gallery connection unavailable.',503);
  try{
   const state=await send('https://galleries.example.invalid/api/client/'+token+'/state',{headers:{'OAI-Sites-Authorization':'Bearer '+env.HAS_GALLERY_SERVICE_TOKEN},redirect:'manual'});
   if(!state.ok)return fail('This gallery link is closed or unavailable.',403);
   if(!(state.headers.get('Content-Type')||'').includes('application/json'))return fail('Gallery connection unavailable.',502);
   const {gallery:g}=await state.json();if(!g?.title)return fail('Gallery unavailable.',403);
   if(action==='share.png')return new Response(req.method==='HEAD'?null:await renderGalleryShareImage(g.title,g.scopeName),{headers:{...security,'Content-Type':'image/png'}});
   const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
   const title=g.title+(g.scopeName&&g.scopeName!=='All photographs'?' · '+g.scopeName:''),description='Photographs by Your Photographer. Open the gallery to view photographs and make your selects.',canonical='https://studio.example.invalid/galleries/'+token;
   let revision=2166136261;for(const c of title)revision=Math.imul(revision^c.codePointAt(0),16777619)>>>0;
   const image=canonical+'/share.png?v='+revision.toString(16),meta=[['description',description],['og:type','website'],['og:site_name','Studio Galleries'],['og:title',title],['og:description',description],['og:url',canonical],['og:image',image],['og:image:secure_url',image],['og:image:type','image/png'],['og:image:width','1200'],['og:image:height','630'],['og:image:alt',title+' — Photographer: Your Photographer'],['twitter:card','summary_large_image'],['twitter:title',title],['twitter:description',description],['twitter:image',image],['twitter:image:alt',title+' — Photographer: Your Photographer']].map(([key,value])=>'<meta '+(key.startsWith('og:')?'property':'name')+'="'+key+'" content="'+escape(value)+'">').join('');
   const response=await env.ASSETS.fetch(new Request(new URL('/client-gallery/index.html',url.origin)));let html=await response.text();html=html.replace(/<title>[^<]*<\/title>/,'<title>'+escape(title)+'</title>').replace('</head>',meta+'</head>');
   return new Response(req.method==='HEAD'?null:html,{status:response.status,headers:{...security,'Content-Type':'text/html; charset=utf-8'}});
  }catch{return fail('Gallery connection unavailable. Try again.',502)}
 }
 const post=['join','review','resume','attach','received','event','share-collection','collection','archive','download'].includes(action);if(req.method!==(post?'POST':'GET'))return fail('Not found.',404);
 if(post&&((req.headers.get('Origin')&&req.headers.get('Origin')!==url.origin)||req.headers.get('Sec-Fetch-Site')==='cross-site'))return fail('Request not allowed.',403);
 if(!env.HAS_GALLERY_SERVICE_TOKEN)return fail('Gallery connection unavailable.',503);
 try{
 let body;if(post){const chunks=[];let size=0;const reader=req.body?.getReader();if(!reader)return fail('Missing request.',400);while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>150000){await reader.cancel();return fail('Request too large.',413)}chunks.push(value)}body=new Blob(chunks)}
 const target=new URL('https://galleries.example.invalid/api/client/'+token+'/'+action);if(action.startsWith('photo/')){if(url.searchParams.get('size')==='original')target.searchParams.set('size','original');if(url.searchParams.has('download'))target.searchParams.set('download','1')}
 if(action.startsWith('archive-file/'))target.searchParams.set('ticket',url.searchParams.get('ticket')||'');
 const h={'OAI-Sites-Authorization':'Bearer '+env.HAS_GALLERY_SERVICE_TOKEN};const auth=req.headers.get('Authorization');if(auth&&/^Bearer hasreview_[a-f0-9]{64}$/.test(auth))h.Authorization=auth;const session=req.headers.get('Cookie')?.match(/(?:^|;\s*)has_client_session=(hasaccount_[a-f0-9]{64})(?:;|$)/)?.[1];if(session)h['X-Client-Session']=session;if(post)h['Content-Type']=req.headers.get('Content-Type')||'application/json';
 if(action.startsWith('archive-file/')&&req.headers.get('Range'))h.Range=req.headers.get('Range');
 for(const name of ['X-Usage-Browser','X-Usage-Mode','X-Download-Attempt','X-Review-Choice']){const v=req.headers.get(name);if(v&&v.length<=80)h[name]=v}
 const response=await send(target,{method:req.method,headers:h,body,redirect:'manual'}),type=response.headers.get('Content-Type')||'';
 // The authenticated gallery may hand off large ZIPs to its configured worker.
 // Keep the bulk transfer outside the Sites proxy, while the worker rechecks access.
 if(action.startsWith('archive-file/')&&response.status===302){
  const location=response.headers.get('Location')||'';let target;try{target=new URL(location)}catch{return fail('Download unavailable.',502)}
  if(target.protocol!=='https:'||target.username||target.password||!/^\/download\/[a-f0-9-]{36}\/[a-f0-9-]{36}$/.test(target.pathname)||! /^[a-f0-9]{64}$/.test(target.searchParams.get('ticket')||''))return fail('Download unavailable.',502);
  await response.body?.cancel();return new Response(null,{status:302,headers:{...security,Location:location}});
 }
 if(!/^(application\/(json|zip)|image\/jpeg|text\/calendar)/.test(type))return fail('Gallery connection unavailable.',502);
 if(['received','review'].includes(action)&&response.ok&&type.includes('application/json')){const data=await response.json();await queueGalleryAlert(data.notification,env,send,ctx);delete data.notification;return Response.json(action==='received'?{ok:true}:data,{headers:security});}
 const out={...security,'Content-Type':type};const disposition=response.headers.get('Content-Disposition');if(disposition)out['Content-Disposition']=disposition;const ticket=response.headers.get('X-Download-Id');if(ticket)out['X-Download-Id']=ticket;
 for(const name of ['Content-Length','Content-Range','Accept-Ranges','ETag']){const value=response.headers.get(name);if(value)out[name]=value}
 return new Response(response.body,{status:response.status,headers:out});
 }catch{return fail('Gallery connection unavailable. Try again.',502)}
}
