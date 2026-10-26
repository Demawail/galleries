import {MAX_GALLERY_PHOTOS} from '@/lib/capacity';
import {write,bucket,photoKeys,newPhotoBase} from '@/lib/server';
import {digest,lrAuth,lrJSON,lrGallery} from '@/lib/lightroom';
import {command,type Photo,type Gallery} from '@/lib/model';
function galleryInfo(g:Gallery,mode?:string){
 if(mode==='selects')return lrJSON({gallery:{id:g.id,title:g.title},groups:[{id:'photographer',name:'Photographer’s Favorites',receipt:'favorites',photos:g.photos.filter(p=>p.favorite).map(p=>({sourceId:p.sourceId,filename:p.filename,note:g.reviewers.find(r=>r.id==='photographer')?.notes[p.id]||'',crop:g.reviewers.find(r=>r.id==='photographer')?.crops[p.id]||null}))},...g.reviewers.filter(r=>r.id!=='photographer'&&r.submitted).map(r=>({id:r.id,name:r.name,receipt:r.receipt,submitted:r.submitted,photos:r.pins.map(id=>g.photos.find(p=>p.id===id)).filter((p):p is Photo=>!!p).map(p=>({sourceId:p.sourceId,filename:p.filename,note:r.notes[p.id]||'',crop:r.crops[p.id]||null}))}))]});
 return lrJSON({gallery:{id:g.id,title:g.title},sections:g.sections,limit:MAX_GALLERY_PHOTOS,exportPixels:2400});
}
export async function GET(req:Request){try{const auth=await lrAuth(req);if(!auth.gallery)return lrJSON({scope:'workspace',connectionId:auth.connection.id,name:'Studio Galleries',galleries:auth.current.data.galleries.filter(g=>!['cleared','clearing','deleting'].includes(g.status)).map(g=>({id:g.id,title:g.title}))});return galleryInfo(auth.gallery,new URL(req.url).searchParams.get('mode')||'')}catch{return lrJSON({error:'Connection expired, revoked, or gallery unavailable.'},401)}}
export async function POST(req:Request){
 let auth;try{auth=await lrAuth(req)}catch{return lrJSON({error:'Connection expired, revoked, or gallery unavailable.'},401)}
 let keys:string[]=[];let committed=false;
 try{
 if((req.headers.get('Content-Type')||'').startsWith('application/json')){
 const text=await req.text();if(text.length>4096)throw Error('Request too large.');const a=JSON.parse(text);
 const fresh=await lrAuth(req);
 if(a.action==='read')return galleryInfo(lrGallery(fresh,a.galleryId),a.mode);
 if(a.action!=='ensureGallery'||fresh.connection.gallery_id!=='*')throw Error('Use a workspace connection to create galleries from Lightroom.');
 if(typeof a.key!=='string'||!/^lr-gallery:[a-zA-Z0-9-]{16,64}:[0-9]+$/.test(a.key)||typeof a.title!=='string'||!a.title.trim())throw Error('Choose a named Lightroom collection.');
 const title=a.title.trim().slice(0,120),{current}=fresh;
 let g=current.data.galleries.find(g=>g.lrPublishKey===a.key);
 if(g&&['cleared','clearing','deleting'].includes(g.status))throw Error('This gallery is unavailable. Create a new Lightroom collection.');
 if(!g){command(current.data,{type:'create',title});g=current.data.galleries[0];g.lrPublishKey=a.key;g.id='lr-'+(await digest(a.key)).slice(0,32);g.activity.unshift({at:new Date().toISOString(),text:'Created from Lightroom.'});await write(current.data,current.revision)}
 else if(g.title!==title){g.title=title;await write(current.data,current.revision)}
 return galleryInfo(g);
 }
 const reader=req.body?.getReader();if(!reader)throw Error('Missing JPEG.');let size=0;const chunks:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>7*1024*1024){await reader.cancel();throw Error('Use a JPEG under 6 MB.')}chunks.push(value)}const form=await new Response(new Blob(chunks as BlobPart[]),{headers:{'Content-Type':req.headers.get('Content-Type')||''}}).formData();
 const file=form.get('image'),source=String(form.get('sourceId')||''),sectionName=String(form.get('section')||'Proofs').trim().slice(0,80);if(!(file instanceof File))throw Error('Lightroom did not send a rendered JPEG. Reload the Studio Galleries plug-in and retry.');
 if(file.size<4)throw Error(`${file.name}: Lightroom sent an empty image. Retry this photograph.`);
 if(file.size>6*1024*1024)throw Error(`${file.name}: the rendered JPEG is ${(file.size/1024/1024).toFixed(1)} MB; the limit is 6 MB. Reload Studio Galleries plug-in 1.1.1 or newer to apply the proof-size settings, then retry.`);
 if(!/^lr:[a-zA-Z0-9-]{16,64}:[0-9]+:[a-zA-Z0-9-]{16,64}$/.test(source))throw Error(`${file.name}: Lightroom sent an invalid source identity. Keep this photo in its existing collection and report this error.`);
 if(!sectionName)throw Error('Name the Lightroom collection or section before publishing.');
 const bytes=await file.arrayBuffer(),head=new Uint8Array(bytes);if(head[0]!==255||head[1]!==216||head[2]!==255)throw Error('Only JPEG photographs are supported.');const checksum=await digest(bytes);
 // Reload after receiving bytes and revalidate revocation before committing.
 const fresh=await lrAuth(req),{current}=fresh,g=lrGallery(fresh,String(form.get('galleryId')||''));const firstPublish=g.photos.length===0;let p=g.photos.find(p=>p.sourceId===source);
 const sectionKey=String(form.get('sectionKey')||'');if(sectionKey&&!/^lr-section:[a-zA-Z0-9-]{16,64}:[0-9]+$/.test(sectionKey))throw Error('Invalid Lightroom section.');const rootSection=!!g.lrPublishKey&&sectionKey===g.lrPublishKey.replace('lr-gallery:','lr-section:');let section=g.sections.find(s=>sectionKey?s.lrKey===sectionKey:s.name===sectionName);if(!section&&rootSection){section=g.sections.find(s=>s.id==='proofs'&&!s.lrKey);if(section)section.lrKey=sectionKey;}if(!section){section={id:crypto.randomUUID(),name:sectionName,...(sectionKey?{lrKey:sectionKey}:{})};g.sections.push(section)}const renamed=section.name!==sectionName;section.name=sectionName;
 if(p&&p.section!==section.id&&g.reviewers.some(r=>r.pins.includes(p!.id)))throw Error('This photograph has client pins. Keep its existing section when republishing.');
 if(p?.lrChecksum===checksum&&p.section===section.id){if(renamed)await write(current.data,current.revision);return lrJSON({id:p.id,url:'https://galleries.example.invalid/g/'+g.id,unchanged:true})};
 if(!p&&g.photos.length>=MAX_GALLERY_PHOTOS)throw Error(`This gallery has reached its ${MAX_GALLERY_PHOTOS.toLocaleString()} photograph limit.`);const id=p?.id||crypto.randomUUID(),base=`${newPhotoBase(g.id,id)}/versions/${crypto.randomUUID()}`,old=p?photoKeys(g,p):[];
 for(const variant of ['original','web','email']){const key=base+'/'+variant;keys.push(key);await bucket().put(key,bytes,{httpMetadata:{contentType:'image/jpeg'}})}
 if(!p){const url='/api/photo/'+id;p={id,sourceId:source,section:section.id,filename:'',url:url+'?size=web',web:url+'?size=web',email:url+'?size=email',original:url+'?size=original',favorite:false,cleared:false,destination:'none',look:'Lightroom proof · 2400 px',bytes:file.size,demo:false};g.photos.push(p)}
 p.storageHistory=[...new Set([...(p.storageHistory||[]),...(p.storageKey?[p.storageKey]:[])])];p.storageKey=base;p.lrChecksum=checksum;p.section=section.id;p.filename=file.name.replace(/[^a-zA-Z0-9_. -]/g,'_').slice(0,150);p.bytes=file.size;if(!g.cover)g.cover=p.url;g.activity.unshift({at:new Date().toISOString(),text:'Published from Lightroom: '+p.filename});g.activity=g.activity.slice(0,100);
 if(firstPublish&&g.lrPublishKey&&g.status==='draft'){g.status='live';g.expires=new Date(Date.now()+30*86400000).toISOString()}await write(current.data,current.revision);committed=true;
 // Old renditions are no longer referenced. Cleanup failure cannot undo a committed publish.
 if(old.length)try{await bucket().delete(old)}catch{console.warn('Lightroom old rendition cleanup pending')}
 return lrJSON({id:p.id,url:'https://galleries.example.invalid/g/'+g.id,unchanged:false});
 }catch(e){if(!committed&&keys.length)await bucket().delete(keys).catch(()=>{});return lrJSON({error:e instanceof Error?e.message:'Unable to publish. Retry this photograph.'},400)}
}
