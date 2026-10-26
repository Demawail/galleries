import type {Gallery,Workspace} from './model';
export async function galleryFingerprint(g:Gallery){
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(g)));
 return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
type State={data:Workspace;revision:number};
type Store={read:()=>Promise<State>;write:(data:Workspace,revision:number)=>Promise<State>;removeFiles:(g:Gallery)=>Promise<void>};
const conflictMessage='Another window changed this gallery. Refresh and try again.';
export async function deleteGallery(a:{galleryId:string;confirmTitle:string;revision:number;galleryFingerprint?:string},store:Store){
 let locked:Gallery|undefined;
 for(let attempt=0;attempt<8;attempt++){
  const current=await store.read(),g=current.data.galleries.find(g=>g.id===a.galleryId);
  if(!g)return current;
  if(typeof a.confirmTitle!=='string'||a.confirmTitle.trim().replace(/\s+/g,' ')!==g.title.trim().replace(/\s+/g,' '))throw Error('Type the gallery title to confirm deletion.');
  if(g.status==='clearing')throw Error('Finish removing hosted copies before deleting this gallery.');
  if(g.status==='deleting'){locked=g;break}
  // A stale page is safe only when the confirmed gallery itself is unchanged.
  if(a.galleryFingerprint ? a.galleryFingerprint!==await galleryFingerprint(g) : a.revision!==current.revision)
   throw Object.assign(Error('This gallery changed. Review it again before deleting.'),{status:409});
  g.status='deleting';
  try{await store.write(current.data,current.revision);locked=g;break}catch(e){if((e as Error).message!==conflictMessage)throw e}
 }
 if(!locked)throw Object.assign(Error('Uploads are updating the workspace. Please try deleting again.'),{status:409});
 await store.removeFiles(locked);
 // Rebase only the confirmed deletion onto fresh data after storage cleanup.
 for(let attempt=0;attempt<8;attempt++){
  const current=await store.read();
  if(!current.data.galleries.some(g=>g.id===a.galleryId))return current;
  current.data.galleries=current.data.galleries.filter(g=>g.id!==a.galleryId);
  try{return await store.write(current.data,current.revision)}catch(e){if((e as Error).message!==conflictMessage)throw e}
 }
 throw Object.assign(Error('Gallery files removed. Retry deletion to finish removing its card.'),{status:409});
}
