// Narrow device gateway. The private Site credential never leaves this Worker.
export async function handleLightroomBridge(req,env){
 const fail=(error,status)=>Response.json({error},{status,headers:{'Cache-Control':'no-store'}});
 const url=new URL(req.url),authorization=req.headers.get('Authorization')||'';
 if(url.pathname!=='/gallery-bridge/lightroom'||!['GET','POST'].includes(req.method))return fail('Not found.',404);
 if(!/^Bearer haslr_[a-f0-9]{64}$/.test(authorization))return fail('Connect Studio Galleries in Lightroom first.',401);
 if(!env.HAS_GALLERY_SERVICE_TOKEN)return fail('The Lightroom connection is temporarily unavailable.',503);
 try{
 let body;if(req.method==='POST'){const chunks=[];let size=0;const reader=req.body?.getReader();if(!reader)return fail('Missing JPEG.',400);while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>7*1024*1024){await reader.cancel();return fail('Use a JPEG under 6 MB.',413)}chunks.push(value)}body=new Blob(chunks)}
 const target='https://galleries.example.invalid/api/lightroom'+(url.searchParams.get('mode')==='selects'?'?mode=selects':'');
 const headers={'Authorization':authorization,'OAI-Sites-Authorization':'Bearer '+env.HAS_GALLERY_SERVICE_TOKEN};if(req.method==='POST')headers['Content-Type']=req.headers.get('Content-Type')||'';
 const response=await fetch(target,{method:req.method,headers,body,redirect:'manual'});
 if(!(response.headers.get('Content-Type')||'').includes('application/json'))return fail('The gallery connection needs attention. Please retry later.',502);
 return new Response(response.body,{status:response.status,headers:{'Content-Type':'application/json','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return fail('The gallery connection is temporarily unavailable. Retry this photograph.',502)}
}
