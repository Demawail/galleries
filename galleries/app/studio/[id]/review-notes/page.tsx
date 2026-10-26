import {notFound} from 'next/navigation';
import {read} from '@/lib/server';
import {reviewNotes} from '@/lib/review-notes';
export const dynamic='force-dynamic';
export default async function ReviewNotesPage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,{data}=await read(),gallery=data.galleries.find(g=>g.id===id);
 if(!gallery)notFound();
 const groups=reviewNotes(gallery),count=groups.reduce((n,g)=>n+g.notes.length,0);
 const href='/g/'+encodeURIComponent(id)+'?reviewer=photographer';
 const showImages=!['cleared','clearing','deleting'].includes(gallery.status);
 return <main className="all-review-notes"><a className="text-link" href={href}>← Back to gallery</a><header><div><span className="eyebrow">PHOTOGRAPHER VIEW</span><h1>All notes</h1><p>{gallery.title.replace(/\s+/g,' ')} · {count} {count===1?'note':'notes'} across {groups.length} {groups.length===1?'photograph':'photographs'}</p></div><a className="btn" href={'/studio/'+encodeURIComponent(id)+'/review-notes'}>Refresh notes</a></header><p className="notes-explainer">All saved retouching notes, including unpinned photographs and reviews still in progress.</p>{groups.length?<div className="review-notes-list">{groups.map(({photo,notes})=><article className="review-note-photo" key={photo.id}>{showImages&&<img src={photo.web||photo.url} alt={photo.filename} loading="lazy"/>}<div><h2>{photo.filename}</h2><span className="small">{gallery.sections.find(s=>s.id===photo.section)?.name}</span>{notes.map(note=><section className="review-note-entry" key={note.reviewerId}><h3>{note.name}<span>{note.reviewerId==='photographer'?'Photographer note':note.submitted?'Submitted':'Not submitted'} · {note.pinned?(note.reviewerId==='photographer'?'Favorite':'Pinned'):'Not pinned'}</span></h3><p>{note.text}</p></section>)}</div></article>)}</div>:<div className="empty-state"><h2>No retouching notes yet.</h2><p>Saved notes will appear here beside their filenames.</p></div>}</main>;
}
