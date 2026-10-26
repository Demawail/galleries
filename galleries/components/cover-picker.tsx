'use client';
import {useState} from 'react';
import type {Gallery} from '@/lib/model';
export function CoverPicker({gallery,busy,onPick}:{gallery:Gallery;busy:boolean;onPick:(url:string)=>void}){
 const [query,setQuery]=useState(''),[limit,setLimit]=useState(72);
 const photos=gallery.photos.filter(p=>p.filename.toLowerCase().includes(query.toLowerCase()));
 return <><label>Find a photograph<input value={query} placeholder="Search by filename" onChange={e=>{setQuery(e.target.value);setLimit(72)}}/></label><div className="cover-picker-grid">{photos.slice(0,limit).map(p=><button key={p.id} type="button" disabled={busy} aria-pressed={gallery.cover===p.url} onClick={()=>onPick(p.url)}><img src={p.url} alt="" loading="lazy"/><span>{p.filename}</span>{gallery.cover===p.url&&<strong>Current cover</strong>}</button>)}</div>{!photos.length&&<p>No photographs found.</p>}{photos.length>limit&&<button type="button" className="btn" onClick={()=>setLimit(n=>n+72)}>Show more photographs</button>}</>;
}
