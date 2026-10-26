'use client';
import {useState} from 'react';
import {downloadParts} from '@/lib/download-parts';
import {downloadPhotos} from '@/lib/download';
import type {Photo,Gallery} from '@/lib/model';
export function DownloadButtons({photos,purpose,gallery,disabled}:{photos:Photo[];purpose:string;gallery:Gallery;disabled:boolean}){
 const [busy,setBusy]=useState<number|null>(null),[message,setMessage]=useState('');
 const server=purpose!=='Email & presentations'&&photos.every(p=>!p.demo),parts=downloadParts(photos,server);
 return <div className="download-parts"><p className="small">{server?'Your browser saves the ZIP as photographs arrive. Keep the download running until it finishes.':'Email-sized and sample photographs are prepared in smaller batches.'} {parts.length>1?`This selection is divided into ${parts.length} ZIP files. Download each part below.`:''}</p>{!photos.length&&<p>Choose at least one photograph.</p>}{parts.map((part,i)=>server?<form key={i} action="/api/download" method="post" target="_blank"><input type="hidden" name="selection" value={JSON.stringify({galleryId:gallery.id,ids:part.map(p=>p.id),purpose})}/><button className="btn dark" disabled={disabled} type="submit">{parts.length>1?`Download part ${i+1} (${part.length} photographs)`:`Download ${part.length} photograph${part.length===1?'':'s'}`}</button></form>:<button key={i} className="btn dark" disabled={disabled||busy!==null} onClick={async()=>{setBusy(i);setMessage('');try{await downloadPhotos(part,purpose,gallery);setMessage(`Part ${i+1} is ready.`)}catch(e){setMessage((e as Error).message)}finally{setBusy(null)}}}>{busy===i?'Preparing photographs…':parts.length>1?`Download part ${i+1} (${part.length} photographs)`:'Download photographs'}</button>)}{message&&<p role="status">{message}</p>}</div>
}
