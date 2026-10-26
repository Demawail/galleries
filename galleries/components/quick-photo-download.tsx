'use client';
import {useRef,useState} from 'react';
import {Download,LoaderCircle} from 'lucide-react';
import {toast} from 'sonner';
import {save} from '@/lib/download';
import type {Photo} from '@/lib/model';
export function QuickPhotoDownload({photo,disabled}:{photo:Photo;disabled:boolean}){
 const [loading,setLoading]=useState(false),pending=useRef(false);
 async function download(){if(pending.current||disabled)return;pending.current=true;setLoading(true);try{const response=await fetch(photo.web||photo.url);if(!response.ok)throw Error('Unable to download this photograph. Please try again.');save(await response.blob(),photo.filename)}catch(e){toast.error((e as Error).message)}finally{pending.current=false;setLoading(false)}}
 return <button type="button" className="quick-photo-download" aria-label={`Download ${photo.filename} (web JPEG)`} title={disabled?'Downloads unavailable':'Download web JPEG'} disabled={disabled||loading} aria-busy={loading} onClick={e=>{e.stopPropagation();void download()}}>{loading?<LoaderCircle size={18} className="animate-spin"/>:<Download size={18}/>}</button>;
}
