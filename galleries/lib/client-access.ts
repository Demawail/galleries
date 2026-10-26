import {archiveConfigured} from './archive-jobs';
import {db,read} from './server';
import {digest} from './lightroom';
import {clientPinLimit,sharedClientPins,sharedSubmission,overLimitMessage,reviewSections,type Gallery,type Reviewer,type Workspace} from './model';
export const publicOrigin='https://studio.example.invalid';
export const publicLink=(token:string)=>publicOrigin+'/galleries/'+token;
export const randomSecret=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
type Link=NonNullable<Gallery['clientLinks']>[number];
export function linkChain(g:Gallery,link:Link):Link[]{
 const chain:Link[]=[];let current:Link|undefined=link;
 while(current){
  if(chain.length>=8||chain.some(l=>l.id===current!.id)||current.revoked)return [];
  if(current.scope!=='all'&&!g.sections.some(s=>s.id===current!.scope))return [];
  if(current.collectionId&&!g.clientCollections?.some(c=>c.id===current!.collectionId&&!c.deleted&&c.linkId===current!.parentId))return [];
  chain.push(current);if(!current.parentId)break;
  current=g.clientLinks?.find(l=>l.id===current!.parentId);if(!current)return [];
 }
 return chain;
}
export function linkAvailable(g:Gallery,link:Link){return g.status==='live'&&Number.isFinite(Date.parse(g.expires))&&Date.parse(g.expires)>Date.now()&&linkChain(g,link).length>0}
export function photoAllowed(g:Gallery,link:Link,p:{id:string;section:string;demo?:boolean}){
 const chain=linkChain(g,link);return !p.demo&&!!chain.length&&chain.every(l=>(l.scope==='all'||p.section===l.scope)&&(!l.collectionId||g.clientCollections!.find(c=>c.id===l.collectionId)!.photoIds.includes(p.id)));
}
export async function clientAccess(token:string,req:Request,full=false){
 if(!/^[a-f0-9]{64}$/.test(token))throw Error('This gallery link is unavailable.');
 const current=full?await read():{data:JSON.parse((await db().prepare("SELECT payload FROM workspaces WHERE id='owner'").first<{payload:string}>())?.payload||'{"galleries":[]}') as Workspace,revision:0};
 const g=current.data.galleries.find(g=>g.clientLinks?.some(l=>l.token===token&&!l.revoked));
 const link=g?.clientLinks?.find(l=>l.token===token&&!l.revoked);
 if(!g||!link||!linkAvailable(g,link))throw Error('This gallery link is closed or unavailable.');
 const secret=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';
 const hash=/^hasreview_[a-f0-9]{64}$/.test(secret)?await digest(secret):'';
 let reviewer=hash?g.reviewers.find(r=>r.clientLinkId===link.id&&(r.clientSessionHash===hash||r.clientSessionHashes?.includes(hash))):undefined;
 if(!reviewer||req.headers.get('X-Review-Choice')){const session=req.headers.get('X-Client-Session')||'';if(/^hasaccount_[a-f0-9]{64}$/.test(session)){const choice=req.headers.get('X-Review-Choice')||'';const rows=(await db().prepare("SELECT v.reviewer_id FROM client_visits v JOIN client_sessions s ON s.contact_id=v.contact_id WHERE s.hash=? AND s.expires>? AND v.gallery_id=? AND v.link_id=? AND (?='' OR v.reviewer_id=?) LIMIT 2").bind(await digest(session),Date.now(),g.id,link.id,choice,choice).all()).results as {reviewer_id:string}[];if(rows.length===1)reviewer=g.reviewers.find(r=>r.id===rows[0].reviewer_id&&r.clientLinkId===link.id)}}
 return {current,g,link,reviewer,hash};
}
export function clientState(g:Gallery,link:NonNullable<Gallery['clientLinks']>[number],reviewer?:Reviewer){
 const photos=g.photos.filter(p=>photoAllowed(g,link,p));
 const photoUrl=(id:string,size='web')=>'/galleries/'+link.token+'/photo/'+encodeURIComponent(id)+'?size='+size;
 const cover=photos.find(p=>p.url===g.cover)||photos[0];
 const section=g.sections.find(s=>s.id===link.scope);
 const submission=sharedSubmission(g);const latest=submission.latest;
 return {submission:{...submission,latest:latest?{...latest,photoIds:latest.photoIds.filter(id=>photos.some(p=>p.id===id)),photoCount:latest.photoIds.length}:null},overLimit:overLimitMessage(g),gallery:{id:g.id,title:g.title,client:g.client||g.title,note:g.note,date:g.date,location:g.location,expires:g.expires,cover:cover?photoUrl(cover.id):'',coverPosition:g.coverPosition,downloadEnabled:g.downloadEnabled,backgroundDownloads:archiveConfigured(),allowance:clientPinLimit(g),scopeName:link.collectionId?g.clientCollections?.find(c=>c.id===link.collectionId)?.name:link.scope==='all'?'All photographs':section?.name,sections:reviewSections(g,{section:link.scope} as Reviewer).filter(s=>!link.collectionId||photos.some(p=>p.section===s.id)).map(s=>({id:s.id,name:s.name})),collections:reviewer?(g.clientCollections||[]).filter(c=>!c.deleted&&c.reviewerId===reviewer.id&&c.linkId===link.id).map(c=>({id:c.id,name:c.name,version:c.version,photoIds:c.photoIds.filter(id=>photos.some(p=>p.id===id))})):[],photos:photos.map(p=>({id:p.id,filename:p.filename,section:p.section,favorite:p.favorite,bytes:p.bytes,url:photoUrl(p.id)}))},reviewer:reviewer?{id:reviewer.id,name:reviewer.name,allowance:clientPinLimit(g),usedPinCount:sharedClientPins(g).length,pins:sharedClientPins(g).filter(id=>photos.some(p=>p.id===id)),notes:Object.fromEntries(Object.entries(reviewer.notes).filter(([id])=>photos.some(p=>p.id===id))),crops:Object.fromEntries(Object.entries(reviewer.crops).filter(([id])=>photos.some(p=>p.id===id))),resumeEnabled:!!reviewer.resumeHash,submitted:submission.locked?latest?.at:null,receipt:latest?.receipt,version:reviewer.reviewVersion||0}:null};
}
