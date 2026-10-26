import {read,bucket,photoKey,sameOrigin,fail} from '@/lib/server';
import {streamZip,type ZipEntry} from '@/lib/zip-stream';
import {MAX_GALLERY_PHOTOS} from '@/lib/capacity';
export async function POST(req:Request){try{
 sameOrigin(req);
 const text=await req.text();if(text.length>150000)throw Error('Choose a smaller selection.');
 const a=JSON.parse(new URLSearchParams(text).get('selection')||'{}');
 if(!Array.isArray(a.ids)||!a.ids.length||a.ids.length>MAX_GALLERY_PHOTOS||!a.ids.every((id:unknown)=>typeof id==='string'))throw Error('Choose photographs to download.');
 if(!['Web & social','Press & print'].includes(a.purpose))throw Error('Choose a download size.');
 const {data}=await read(),g=data.galleries.find(g=>g.id===a.galleryId);
 if(!g||!g.downloadEnabled||['cleared','clearing','deleting'].includes(g.status))throw Error('Downloads are unavailable for this gallery.');
 const ids=[...new Set<string>(a.ids)];const photos=ids.map(id=>g.photos.find(p=>p.id===id));
 if(photos.some(p=>!p||p.demo))throw Error('One or more photographs are unavailable. Reopen the download area.');
 const selected=photos as NonNullable<typeof photos[number]>[];
 if(selected.reduce((n,p)=>n+p.bytes,0)>512*1024*1024)throw Error('Use the download parts shown in the gallery for this large selection.');
 const variant=a.purpose==='Press & print'?'original':'web';
 const open=async(p:typeof selected[number])=>{const object=await bucket().get(photoKey(g,p,variant));if(!object)throw Error('A photograph is unavailable. Retry the download.');return object.body as ReadableStream<Uint8Array>};
 // Read the first object before returning a download, so common storage failures show a useful error.
 const first=await open(selected[0]);
 const entries:ZipEntry[]=selected.map((p,i)=>({name:p.id+'_'+p.filename.replace(/[^a-zA-Z0-9_. -]/g,'_'),open:()=>i===0?Promise.resolve(first):open(p)}));
 const guide=new TextEncoder().encode(`YOUR STUDIO\n${g.title}\n${selected.length} photographs\n${a.purpose}\n\nOriginal uploaded JPEGs for Press & print; stored web renditions for Web & social. Lightroom publishes 2400px proofs. No enlargement. Download size does not grant usage rights.\n`);
 entries.push({name:'READ-ME.txt',open:async()=>new Blob([guide]).stream()});
 const filename='HAS_'+g.title.replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,80)+'_'+(a.purpose==='Press & print'?'originals':'web')+'.zip';
 return new Response(streamZip(entries),{headers:{'Content-Type':'application/zip','Content-Disposition':`attachment; filename="${filename}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
}catch(e){return fail(e)}}
