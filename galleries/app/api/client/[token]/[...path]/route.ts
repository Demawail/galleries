import {archiveDownloadUrl,jobRow,archivePhotos,listArchives,createArchive} from '@/lib/archive-jobs';
import {configuredAlert} from '@/lib/alert-settings';
import {recordUsage} from '@/lib/usage';
import {visit,beginDownload,receiveDownload,historyAccess} from '@/lib/client-history';
import {clientAccess,clientState,publicLink,randomSecret,photoAllowed,linkChain} from '@/lib/client-access';
import {digest} from '@/lib/lightroom';
import {bucket,lookupPhoto,photoKey,write} from '@/lib/server';
import {command,clientPinLimit,sharedClientPins} from '@/lib/model';
import {streamZip} from '@/lib/zip-stream';
import {closingCalendar} from '@/lib/calendar';
type Context={params:Promise<{token:string;path:string[]}>};
const headers={'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow, noarchive','X-Content-Type-Options':'nosniff'};
const json=(v:unknown,status=200)=>Response.json(v,{status,headers});
export async function GET(req:Request,{params}:Context){try{const {token,path}=await params,action=path[0];
 if(action==='state'&&path.length===1){const {g,link,reviewer}=await clientAccess(token,req,true);if(reviewer)await visit(g,reviewer,req);return json(clientState(g,link,reviewer))}
 const {g,link,reviewer}=await clientAccess(token,req,['archives','archive-file'].includes(action));
 if(action==='archives'&&path.length===1){if(!reviewer)return json({error:'Enter your name first.'},401);return json({jobs:await listArchives(g,link,reviewer)})}
 if(action==='archive-file'&&path.length===2){
 const job=await jobRow(path[1]);if(!job||job.secret!==new URL(req.url).searchParams.get('ticket')||job.status!=='ready')return json({error:'Download unavailable.'},404);
 archivePhotos(job,g,link);const range=req.headers.get('Range');if(range&&!/^bytes=\d*-\d*$/.test(range))return json({error:'Invalid byte range.'},416);
 return new Response(null,{status:302,headers:{...headers,Location:archiveDownloadUrl(job),'Referrer-Policy':'no-referrer'}});
 }
 if(action==='calendar'&&path.length===1)return new Response(closingCalendar(g,publicLink(token)),{headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="gallery-closing-reminder.ics"'}});
 if(action==='photo'&&path.length===2){const found=await lookupPhoto(path[1]);if(!found||found.galleryId!==g.id||found.photo.demo||!photoAllowed(g,link,found.photo))return json({error:'Photograph unavailable.'},404);
 const url=new URL(req.url),size=url.searchParams.get('size')==='original'?'original':'web';if((size==='original'||url.searchParams.has('download'))&&!g.downloadEnabled)return json({error:'Downloads are unavailable.'},403);
 const obj=await bucket().get(photoKey(g,found.photo,size));if(!obj)return json({error:'Photograph unavailable.'},404);
 const ticket=url.searchParams.has('download')?await beginDownload(g,reviewer,req,[found.photo],size):'';
 return new Response(obj.body,{headers:{...headers,...(ticket?{'X-Download-Id':ticket}:{}),'Content-Type':'image/jpeg',...(url.searchParams.has('download')?{'Content-Disposition':`attachment; filename="${found.photo.filename.replace(/[^a-zA-Z0-9_.-]/g,'_')}"`}:{})}})}
 return json({error:'Not found.'},404);
}catch{return json({error:'This gallery link is closed or unavailable.'},403)}}
export async function POST(req:Request,{params}:Context){try{
 const {token,path}=await params;if(path.length!==1||!['join','review','download','resume','attach','received','event','share-collection','collection','archive'].includes(path[0]))return json({error:'Not found.'},404);
 const text=await req.text();if(text.length>150000)return json({error:'Request too large.'},413);
 const a=path[0]==='download'?JSON.parse(new URLSearchParams(text).get('selection')||'{}'):JSON.parse(text);
 if(path[0]==='event'){const {g,link}=await clientAccess(token,req);if(!['gallery_view','gallery_section','download_requested','download_failed'].includes(a.kind))throw Error('Invalid event.');const page=String(a.page||'all');if(!['all','pins','favorites','downloads',...g.sections.filter(s=>link.scope==='all'||s.id===link.scope).map(s=>s.id)].includes(page))throw Error('Invalid section.');await recordUsage(req,{id:a.id,kind:a.kind,gallery:g.id,page,count:a.count});return json({ok:true})}
 if(path[0]==='attach'||path[0]==='received'){const {g,reviewer}=await clientAccess(token,req);if(!reviewer)return json({error:'Enter your name first.'},401);if(path[0]==='received')return json({ok:true,notification:await receiveDownload(g,reviewer,req,String(a.id||''))});await visit(g,reviewer,req);return json({ok:true})}
 if(path[0]==='archive'){const {g,link,reviewer}=await clientAccess(token,req,true);if(!reviewer)return json({error:'Enter your name first.'},401);return json(await createArchive(g,link,reviewer,req,a))}
 if(path[0]==='download'){
 const {g,link,reviewer}=await clientAccess(token,req,true);if(!g.downloadEnabled)throw Error('Downloads are unavailable.');
 if(!Array.isArray(a.ids)||!a.ids.length||a.ids.length>1000||!a.ids.every((id:unknown)=>typeof id==='string'))throw Error('Choose photographs.');
 const selected=[...new Set<string>(a.ids)].map(id=>g.photos.find(p=>p.id===id&&photoAllowed(g,link,p)));
 if(selected.some(p=>!p))return json({error:'Photograph outside this link.'},403);
 const photos=selected as NonNullable<typeof selected[number]>[];if(photos.reduce((n,p)=>n+p.bytes,0)>512*1024*1024)throw Error('Download a smaller part.');
 const size=a.size==='original'?'original':'web';
 const entries=photos.map(p=>({name:p.id+'_'+p.filename.replace(/[^a-zA-Z0-9_.-]/g,'_'),open:async()=>{const o=await bucket().get(photoKey(g,p,size));if(!o)throw Error('Photo unavailable');return o.body as ReadableStream<Uint8Array>}}));
 const ticket=await beginDownload(g,reviewer,req,photos,size);
 return new Response(streamZip(entries),{headers:{...headers,...(ticket?{'X-Download-Id':ticket}:{}),'Content-Type':'application/zip','Content-Disposition':'attachment; filename="HAS-photographs.zip"'}});
 }
 for(let attempt=0;attempt<6;attempt++){
 const {current,g,link,reviewer,hash}=await clientAccess(token,req,true);
 if(path[0]==='collection'){
 if(!reviewer)return json({error:'Enter your name before creating a collection.'},401);
 g.clientCollections??=[];
 let c=g.clientCollections.find(c=>c.id===a.id&&!c.deleted&&c.reviewerId===reviewer.id&&c.linkId===link.id);
 if(a.action==='create'){
  if(typeof a.id!=='string'||!/^collection-[a-f0-9-]{36}$/.test(a.id))throw Error('Invalid collection identifier.');
  if(c)return json(clientState(g,link,reviewer));
  if(g.clientCollections.some(c=>c.id===a.id))throw Error('Collection identifier already used.');
  if(g.clientCollections.length>=200)throw Error('This gallery has reached its collection limit.');
  c={id:a.id,name:'',photoIds:[],reviewerId:reviewer.id,linkId:link.id,version:0,created:new Date().toISOString(),updated:new Date().toISOString()};g.clientCollections.push(c);
 }else if(!c)return json({error:'Collection unavailable.'},404);
 if(a.action!=='create'&&a.version!==c.version)return json({error:'This collection changed in another window. Refresh before saving.'},409);
 if(a.action==='delete')c.deleted=true;
 else if(['create','update'].includes(a.action)){
  if(typeof a.name!=='string'||!a.name.trim()||a.name.trim().length>80)throw Error('Name your collection, up to 80 characters.');
  if(!Array.isArray(a.ids)||a.ids.length>1000||!a.ids.every((id:unknown)=>typeof id==='string'))throw Error('Choose photographs.');
  const ids=[...new Set<string>(a.ids)];if(ids.some(id=>!g.photos.some(p=>p.id===id&&photoAllowed(g,link,p))))return json({error:'Photograph outside this link.'},403);
  c.name=a.name.trim();c.photoIds=ids;
 }else throw Error('Action unavailable.');
 c.version++;c.updated=new Date().toISOString();
 try{await write(current.data,current.revision);return json(clientState(g,link,reviewer))}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e;continue}
 }
 if(path[0]==='share-collection'){
 if(!reviewer)return json({error:'Enter your name before sharing a collection.'},401);
 if(a.collection){
 const c=g.clientCollections?.find(c=>c.id===a.collection&&!c.deleted&&c.reviewerId===reviewer.id&&c.linkId===link.id);
 if(!c)return json({error:'Collection unavailable.'},404);
 if(linkChain(g,link).length>=8)throw Error('Ask the photographer for a new gallery link.');
 g.clientLinks??=[];let child=g.clientLinks.find(l=>l.collectionId===c.id&&l.parentId===link.id&&!l.revoked);
 if(child)return json({url:publicLink(child.token),name:c.name});
 if(g.clientLinks.length>=500)throw Error('Please ask the photographer for a collection link.');
 child={id:crypto.randomUUID(),token:randomSecret(),scope:link.scope,parentId:link.id,collectionId:c.id,allowance:clientPinLimit(g),created:new Date().toISOString(),revoked:false};g.clientLinks.push(child);
 try{await write(current.data,current.revision);return json({url:publicLink(child.token),name:c.name})}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e;continue}
 }
 const section=g.sections.find(s=>s.id===a.section);
 if(!section||(link.scope!=='all'&&link.scope!==section.id)||(link.collectionId&&!g.photos.some(p=>p.section===section.id&&photoAllowed(g,link,p))))return json({error:'Collection outside this link.'},403);
 if(link.collectionId||link.scope!=='all')return json({url:publicLink(link.token),name:section.name});
 g.clientLinks??=[];
 const existing=g.clientLinks.find(l=>l.parentId===link.id&&l.scope===section.id&&!l.revoked);
 if(existing)return json({url:publicLink(existing.token),name:section.name});
 if(g.clientLinks.length>=500)return json({error:'Please ask the photographer for a collection link.'},400);
 const child={id:crypto.randomUUID(),token:randomSecret(),scope:section.id,parentId:link.id,allowance:clientPinLimit(g),created:new Date().toISOString(),revoked:false};
 g.clientLinks.push(child);
 try{await write(current.data,current.revision);return json({url:publicLink(child.token),name:section.name})}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e;continue}
 }
 if(path[0]==='resume'){
 let target=reviewer;let credential='';
 if(a.action==='redeem'){
 if(!hash||typeof a.credential!=='string'||!/^hasresume_[a-f0-9]{64}$/.test(a.credential))throw Error('This resume link is unavailable.');
 const resumeHash=await digest(a.credential);target=g.reviewers.find(r=>r.clientLinkId===link.id&&r.resumeHash===resumeHash);
 if(!target)throw Error('This resume link is revoked or unavailable.');
 target.clientSessionHashes=[...new Set([...(target.clientSessionHashes||[]),hash])].slice(-10);
 }else{
 if(!target)return json({error:'Enter your name to begin reviewing.'},401);
 if(a.action==='create'){credential='hasresume_'+randomSecret();target.resumeHash=await digest(credential)}
 else if(a.action==='revoke')delete target.resumeHash;else throw Error('Action unavailable.');
 }
 try{await write(current.data,current.revision);return json({...clientState(g,link,target),...(credential?{resumeCredential:credential}:{})})}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e;continue}
 }
 if(path[0]==='join'){
 if(reviewer){await visit(g,reviewer,req);return json(clientState(g,link,reviewer));}if(!hash||typeof a.name!=='string'||!a.name.trim()||a.name.length>80)throw Error('Enter your name.');
 if(g.reviewers.filter(r=>r.clientLinkId===link.id).length>=200)throw Error('This link has reached its reviewer limit. Contact the photographer.');
 const r={id:'client-'+hash,name:a.name.trim(),section:link.scope,allowance:clientPinLimit(g),pins:[...sharedClientPins(g)],notes:{},crops:{},submitted:null,receipt:null,clientLinkId:link.id,clientSessionHash:hash,reviewVersion:0};g.reviewers.push(r);
 try{await write(current.data,current.revision);await visit(g,r,req);return json(clientState(g,link,r))}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e;continue}
 }
 if(!reviewer)return json({error:'Enter your name to begin reviewing.'},401);
 if(a.version!==(reviewer.reviewVersion||0))return json({error:'Your review changed in another window. Refresh before saving again.'},409);
 if(!['pin','note','crop','submit','reopen','extension'].includes(a.type))return json({error:'Action unavailable.'},403);
 if(['pin','note','crop'].includes(a.type)&&!g.photos.some(p=>p.id===a.photoId&&photoAllowed(g,link,p)))return json({error:'Photograph outside this link.'},403);
 if(a.type==='note'&&a.baseNote!==undefined&&a.baseNote!==(reviewer.notes[a.photoId]||''))return json({error:'This note changed in another tab. Your draft is kept. Compare the saved note before retrying.',noteConflict:true,savedNote:reviewer.notes[a.photoId]||''},409);
 if(a.type==='pin'&&typeof a.pinned!=='boolean')throw Error('Choose a pin state.');
 const action={type:a.type,galleryId:g.id,reviewerId:reviewer.id,photoId:a.photoId,note:a.note,context:a.context,x:a.x,y:a.y,days:a.days,shortlistRevision:a.shortlistRevision};
 if(a.type!=='pin'||reviewer.pins.includes(a.photoId)!==a.pinned)command(current.data,action);
 reviewer.reviewVersion=(reviewer.reviewVersion||0)+1;
 try{await write(current.data,current.revision);await recordUsage(req,{id:crypto.randomUUID(),kind:'gallery_review',gallery:g.id,page:a.type}).catch(()=>{});const receipt=a.type==='submit'?g.submissionHistory?.at(-1):null;const notification=receipt?.photoIds.length?await configuredAlert({kind:'submission',id:receipt.receipt,name:receipt.name,title:g.title,galleryId:g.id,count:receipt.photoIds.length,at:receipt.at}):null;return json({...clientState(g,link,reviewer),...(notification?{notification}:{})})}catch(e){if(!(e as Error).message.startsWith('Another window'))throw e}
 }return json({error:'Gallery is busy. Please try again.'},409);
}catch(e){return json({error:(e as Error).message},400)}}
