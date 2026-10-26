import {clientPinLimit,setClientPinLimit,sharedClientPins} from '@/lib/model';
import {read,write,sameOrigin,fail} from '@/lib/server';
import {publicLink,randomSecret} from '@/lib/client-access';
export async function GET(req:Request){try{const {data}=await read(),g=data.galleries.find(g=>g.id===new URL(req.url).searchParams.get('galleryId'));if(!g)throw Error('Gallery not found.');return Response.json({usedPinCount:sharedClientPins(g).length,allowance:clientPinLimit(g),links:(g.clientLinks||[]).map(l=>({...l,url:publicLink(l.token)}))},{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e)}}
export async function POST(req:Request){try{sameOrigin(req);const a=await req.json() as any;
 for(let attempt=0;attempt<6;attempt++){
 const current=await read(),g=current.data.galleries.find(g=>g.id===a.galleryId);if(!g||['cleared','clearing','deleting'].includes(g.status))throw Error('Gallery unavailable.');
 if(a.action==='revoke'){const l=g.clientLinks?.find(l=>l.id===a.id);if(!l)throw Error('Link not found.');l.revoked=true;for(const child of g.clientLinks||[])if(child.parentId===l.id)child.revoked=true}
 else if(a.action==='allowance'){setClientPinLimit(g,Number(a.allowance));g.activity.unshift({at:new Date().toISOString(),text:`Client pin limit updated for everyone: ${g.clientPinAllowance}`})}
 else if(a.action==='create'){
 if(g.status!=='live'||Date.parse(g.expires)<=Date.now())throw Error('Open the gallery before creating a client link.');
 if(a.scope!=='all'&&!g.sections.some(s=>s.id===a.scope))throw Error('Section not found.');
 if(!Number.isSafeInteger(a.allowance)||a.allowance<1)throw Error('Enter a positive whole number of pins.');
 setClientPinLimit(g,Number(a.allowance));g.clientLinks??=[];if(!g.clientLinks.some(l=>l.scope===a.scope&&!l.parentId&&!l.revoked))g.clientLinks.push({id:crypto.randomUUID(),token:randomSecret(),scope:a.scope,allowance:a.allowance,created:new Date().toISOString(),revoked:false});
 }else throw Error('Unknown action.');
 try{await write(current.data,current.revision);return Response.json({usedPinCount:sharedClientPins(g).length,allowance:clientPinLimit(g),links:(g.clientLinks||[]).map(l=>({...l,url:publicLink(l.token)}))},{headers:{'Cache-Control':'no-store'}})}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e}
 }throw Error('The workspace is busy. Try again.');
}catch(e){return fail(e)}}
