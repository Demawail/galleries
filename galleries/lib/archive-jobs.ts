import {env} from 'cloudflare:workers';
import {db,read,photoKey} from './server';
import {linkAvailable,photoAllowed,randomSecret} from './client-access';
import {beginDownload} from './client-history';
import type {Gallery,Reviewer,ClientLink} from './model';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
export type ArchiveJob={id:string;gallery_id:string;link_id:string;reviewer_id:string;files:string;size:string;status:string;created:number;expires:number;secret:string;lease:string|null;lease_until:number;bytes:number;error:string|null};
export function archiveConfigured(){const e=env as any;return e.HAS_ZIP_ENABLED==='true'&&!!e.HAS_ZIP_WORKER_TOKEN&&/^https:\/\/[^/]+\/?$/.test(e.HAS_ZIP_WORKER_URL||'')}
export async function archiveWorker(path:string,options:RequestInit={}){
 if(!archiveConfigured())throw Error('Background downloads are not connected yet.');const e=env as any;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
 // Limit connection/header wait, not the lifetime of a large streamed ZIP.
 try{return await fetch(e.HAS_ZIP_WORKER_URL.replace(/\/$/,'')+path,{...options,headers:{...options.headers,Authorization:'Bearer '+e.HAS_ZIP_WORKER_TOKEN},redirect:'manual',signal:controller.signal})}finally{clearTimeout(timer)}
}
export function archiveDownloadUrl(job:ArchiveJob){
 if(!archiveConfigured())throw Error('Background downloads are unavailable.');
 return (env as any).HAS_ZIP_WORKER_URL.replace(/\/$/,'')+'/download/'+job.id+'/'+job.lease+'?ticket='+job.secret;
}
export async function jobRow(id:string){if(!uuid.test(id))return null;return db().prepare('SELECT * FROM download_jobs WHERE id=?').bind(id).first<ArchiveJob>()}
export function archivePhotos(job:ArchiveJob,g:Gallery,link:ClientLink){
 if(job.gallery_id!==g.id||job.link_id!==link.id||job.expires<=Date.now()||!g.downloadEnabled||!linkAvailable(g,link))throw Error('This download has expired or gallery access has changed.');
 const files=JSON.parse(job.files) as {id:string;filename:string;key:string}[];
 if(files.some(f=>!g.photos.some(p=>p.id===f.id&&photoAllowed(g,link,p))))throw Error('This selection changed. Prepare a new download.');return files;
}
export async function validateArchive(job:ArchiveJob){const {data}=await read(),g=data.galleries.find(g=>g.id===job.gallery_id),link=g?.clientLinks?.find(l=>l.id===job.link_id);if(!g||!link)throw Error('Gallery unavailable.');return {g,link,files:archivePhotos(job,g,link)}}
function clientJob(j:ArchiveJob,token:string){return {id:j.id,status:j.status==='building'&&j.lease_until<Date.now()?'failed':j.status,count:JSON.parse(j.files).length,size:j.size,created:j.created,expires:j.expires,bytes:j.bytes,error:j.error,url:j.status==='ready'?'/galleries/'+token+'/archive-file/'+j.id+'?ticket='+j.secret:null}}
export async function listArchives(g:Gallery,link:ClientLink,reviewer:Reviewer){const rows=(await db().prepare('SELECT * FROM download_jobs WHERE gallery_id=? AND link_id=? AND reviewer_id=? AND expires>? ORDER BY created DESC LIMIT 20').bind(g.id,link.id,reviewer.id,Date.now()).all()).results as ArchiveJob[];return rows.map(j=>{try{archivePhotos(j,g,link);return clientJob(j,link.token)}catch{return {...clientJob(j,link.token),status:'unavailable',url:null,error:'Gallery access or collection contents changed.'}}})}
export async function createArchive(g:Gallery,link:ClientLink,reviewer:Reviewer,req:Request,a:any){
 if(!archiveConfigured())throw Error('Background downloads are not connected yet.');
 if(!uuid.test(a.id||''))throw Error('Invalid download request.');
 let job=await jobRow(a.id);
 if(job&&(job.gallery_id!==g.id||job.link_id!==link.id||job.reviewer_id!==reviewer.id))throw Error('Download unavailable.');
 if(!job){
 if(!g.downloadEnabled)throw Error('Downloads are unavailable.');
 if(!Array.isArray(a.ids)||!a.ids.length||a.ids.length>1000||!a.ids.every((id:unknown)=>typeof id==='string'))throw Error('Choose photographs.');
 const photos=[...new Set<string>(a.ids)].map(id=>g.photos.find(p=>p.id===id&&photoAllowed(g,link,p)));
 if(photos.some(p=>!p))throw Error('Photograph outside this link.');const selected=photos as NonNullable<typeof photos[number]>[];
 if(selected.reduce((n,p)=>n+p.bytes,0)>20*1024**3)throw Error('Choose up to 20 GB per ZIP.');
 const size=a.size==='original'?'original':'web',now=Date.now();
 // Atomic per-gallery hourly quota also limits cross-reviewer abuse and duplicate tabs.
 const result=await db().prepare(`INSERT OR IGNORE INTO download_jobs(id,gallery_id,link_id,reviewer_id,files,size,created,expires,secret) SELECT ?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM download_jobs WHERE gallery_id=? AND created>?)<20`).bind(a.id,g.id,link.id,reviewer.id,JSON.stringify(selected.map(p=>({id:p.id,filename:p.filename,key:photoKey(g,p,size)}))),size,now,Math.min(now+86400000,Date.parse(g.expires)),randomSecret(),g.id,now-3600000).run();
 job=await jobRow(a.id);if(!job)throw Error('This gallery has reached its hourly download preparation limit. Please try again later.');
 if(job.reviewer_id!==reviewer.id||job.link_id!==link.id)throw Error('Download unavailable.');
 if(result.meta.changes)await beginDownload(g,reviewer,new Request(req.url,{headers:new Headers([...req.headers,['X-Download-Attempt',job.id]])}),selected,size);
 }
 archivePhotos(job,g,link);
 if(job.status==='queued'||(job.status==='building'&&job.lease_until<Date.now())){const dispatch=await db().prepare('UPDATE download_jobs SET dispatched=? WHERE id=? AND dispatched<? RETURNING id').bind(Date.now(),job.id,Date.now()-60000).first();if(!dispatch)return clientJob(job,link.token);let r;try{r=await archiveWorker('/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:job.id})})}catch(e){await db().prepare('UPDATE download_jobs SET dispatched=0 WHERE id=?').bind(job.id).run();throw e}await r.body?.cancel();if(!r.ok){await db().prepare('UPDATE download_jobs SET dispatched=0 WHERE id=?').bind(job.id).run();throw Error('Download preparation could not start. Retry this request.');}}
 return clientJob(job,link.token);
}
