import {deleteGallery} from '@/lib/delete-gallery';
import {photoKeys,read,write,sameOrigin,fail,bucket} from '@/lib/server';
import {command,isClosed} from '@/lib/model';
export async function GET(){try{return Response.json(await read(),{headers:{'Cache-Control':'no-store'}})}catch(e){return fail(e,503)}}
export async function POST(req:Request){try{sameOrigin(req);const a=await req.json() as any;if(a.type==='delete-gallery')return Response.json(await deleteGallery(a,{read,write,removeFiles:async g=>{const keys=g.photos.filter(p=>!p.demo).flatMap(p=>photoKeys(g,p));if(keys.length)await bucket().delete(keys)}}));
const current=await read();if(a.revision!==current.revision)return Response.json({error:'Another window changed this gallery. Refresh and try again.'},{status:409});
if(a.type==='clear'){
const g=current.data.galleries.find(g=>g.id===a.galleryId);if(!g||g.status==='deleting'||!g.archiveConfirmed||!isClosed(g))throw Error('Close the gallery and confirm the local archive before clearing hosted copies.');
// Persist closure before object deletion. Retain file records, selections and shoot notes.
g.status='clearing';await write(current.data,current.revision);
const keys=g.photos.filter(p=>!p.demo).flatMap(p=>photoKeys(g,p));if(keys.length)await bucket().delete(keys);
const fresh=await read();const item=fresh.data.galleries.find(x=>x.id===g.id)!;item.status='cleared';item.activity.unshift({at:new Date().toISOString(),text:'Hosted copies removed. Shoot record and selections retained.'});return Response.json(await write(fresh.data,fresh.revision));
}
return Response.json(await write(command(current.data,a),current.revision));}catch(e){return fail(e,(e as {status?:number}).status||400)}}
