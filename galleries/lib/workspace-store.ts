import {seed,type Workspace,type Photo} from './model';
import {upgradeWorkspace} from './workspace-upgrades';

type Snapshot=Map<string,Map<string,{payload:string;position:number}>>;
const snapshots=new WeakMap<Workspace,Snapshot>();
function remember(data:Workspace){snapshots.set(data,new Map(data.galleries.map(g=>[g.id,new Map(g.photos.map((p,position)=>[p.id,{payload:JSON.stringify(p),position}]))])))}
function metadata(data:Workspace){return JSON.stringify({...data,galleries:data.galleries.map(g=>({...g,photos:[]}))})}
const conflict=()=>Error('Another window changed this gallery. Refresh and try again.');

export async function readWorkspace(d:D1Database):Promise<{data:Workspace;revision:number}>{
 let row=await d.prepare('SELECT payload,revision,photo_storage_version FROM workspaces WHERE id=?').bind('owner').first<{payload:string;revision:number;photo_storage_version:number}>();
 if(!row){await d.prepare('INSERT OR IGNORE INTO workspaces (id,payload,revision,updated_at) VALUES (?,?,?,?)').bind('owner',JSON.stringify(seed()),0,new Date().toISOString()).run();return readWorkspace(d)}
 const data=JSON.parse(row.payload) as Workspace;
 if(!row.photo_storage_version){
  // Snapshot and backfill are atomic with the switch. A stale reader cannot overwrite a newer edit.
  const guard='SELECT 1 FROM workspaces WHERE id=\'owner\' AND revision=? AND photo_storage_version=0';
  await d.batch([
   d.prepare(`INSERT OR IGNORE INTO workspace_legacy_snapshots (id,payload,revision) SELECT id,payload,revision FROM workspaces WHERE id='owner' AND revision=? AND photo_storage_version=0`).bind(row.revision),
   d.prepare(`INSERT INTO gallery_photos (id,gallery_id,source_id,position,payload) SELECT json_extract(p.value,'$.id'),json_extract(g.value,'$.id'),json_extract(p.value,'$.sourceId'),CAST(p.key AS INTEGER),p.value FROM workspaces w,json_each(w.payload,'$.galleries') g,json_each(g.value,'$.photos') p WHERE w.id='owner' AND w.revision=? AND w.photo_storage_version=0`).bind(row.revision),
   d.prepare(`UPDATE workspaces SET payload=?,photo_storage_version=1,revision=revision+1,updated_at=? WHERE id='owner' AND EXISTS (${guard})`).bind(metadata(data),new Date().toISOString(),row.revision),
  ]);
  return readWorkspace(d);
 }
 // One transactional batch gives metadata and photo records a consistent revision.
 const results=await d.batch([
  d.prepare("SELECT payload,revision FROM workspaces WHERE id='owner'"),
  d.prepare('SELECT gallery_id,payload FROM gallery_photos ORDER BY gallery_id,position,id'),
 ]);
 const fresh=results[0].results[0] as {payload:string;revision:number};
 const hydrated=JSON.parse(fresh.payload) as Workspace;
 const galleries=new Map(hydrated.galleries.map(g=>[g.id,g]));
 for(const item of results[1].results as {gallery_id:string;payload:string}[])galleries.get(item.gallery_id)?.photos.push(JSON.parse(item.payload));
 remember(hydrated);
 if(upgradeWorkspace(hydrated)){try{return await writeWorkspace(d,hydrated,fresh.revision)}catch(e){if((e as Error).message===conflict().message)return readWorkspace(d);throw e}}
 return {data:hydrated,revision:fresh.revision};
}

export async function writeWorkspace(d:D1Database,data:Workspace,revision:number){
 const before=snapshots.get(data);if(!before)throw Error('Reload the workspace before saving.');
 const mutation=crypto.randomUUID();
 const guard="EXISTS (SELECT 1 FROM workspaces WHERE id='owner' AND mutation_id=?)";
 const statements=[d.prepare("UPDATE workspaces SET payload=?,revision=revision+1,mutation_id=?,updated_at=? WHERE id='owner' AND revision=? AND photo_storage_version=1").bind(metadata(data),mutation,new Date().toISOString(),revision)];
 const event=(g:any,kind:string,filename='')=>statements.push(d.prepare(`INSERT INTO studio_events(id,at,gallery_id,title,kind,filename) SELECT ?,?,?,?,?,? WHERE ${guard}`).bind(crypto.randomUUID(),new Date().toISOString(),g.id,g.title,kind,filename,mutation));
 const present=new Set(data.galleries.map(g=>g.id));
 for(const id of before.keys())if(!present.has(id))statements.push(d.prepare(`DELETE FROM gallery_photos WHERE gallery_id=? AND ${guard}`).bind(id,mutation));
 for(const g of data.galleries){
  if(!before.has(g.id))event(g,'Gallery created');
  const previous=before.get(g.id)||new Map();const ids=new Set(g.photos.map(p=>p.id));
  for(const id of previous.keys())if(!ids.has(id))statements.push(d.prepare(`DELETE FROM gallery_photos WHERE id=? AND gallery_id=? AND ${guard}`).bind(id,g.id,mutation));
  for(const [position,p] of g.photos.entries()){
   const payload=JSON.stringify(p),old=previous.get(p.id);
   if(!p.demo){if(!old)event(g,'Photograph added',p.filename);else {const prior=JSON.parse(old.payload);if(prior.storageKey!==p.storageKey||prior.lrChecksum!==p.lrChecksum)event(g,'Photograph republished',p.filename);else if(prior.section!==p.section)event(g,'Collection changed',p.filename)}}if(old?.payload===payload&&old.position===position)continue;
   statements.push(d.prepare(`INSERT INTO gallery_photos (id,gallery_id,source_id,position,payload) SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(id) DO UPDATE SET gallery_id=excluded.gallery_id,source_id=excluded.source_id,position=excluded.position,payload=excluded.payload`).bind(p.id,g.id,p.sourceId,position,payload,mutation));
  }
 }
 const result=await d.batch(statements);if(!result[0].meta.changes)throw conflict();remember(data);return {data,revision:revision+1};
}

export async function findPhoto(d:D1Database,id:string):Promise<{photo:Photo;galleryId:string;status:string}|null>{
 const query=()=>d.prepare(`SELECT p.payload,p.gallery_id,json_extract(g.value,'$.status') AS status FROM gallery_photos p JOIN workspaces w ON w.id='owner' JOIN json_each(w.payload,'$.galleries') g ON json_extract(g.value,'$.id')=p.gallery_id WHERE p.id=?`).bind(id).first<{payload:string;gallery_id:string;status:string}>();
 let row=await query();
 if(!row){const legacy=await d.prepare("SELECT photo_storage_version FROM workspaces WHERE id='owner'").first<{photo_storage_version:number}>();if(!legacy?.photo_storage_version){await readWorkspace(d);row=await query()}}
 return row?{photo:JSON.parse(row.payload),galleryId:row.gallery_id,status:row.status}:null;
}
