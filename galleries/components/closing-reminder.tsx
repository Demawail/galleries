'use client';
import {useState} from 'react';
import {save} from '@/lib/download';
export function ClosingReminder({galleryId,reviewerId,expires}:{galleryId:string;reviewerId:string;expires:string}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const available=Date.parse(expires)-Date.now()>86400000;
 async function download(){setBusy(true);setMessage('');try{const r=await fetch('/api/calendar?'+new URLSearchParams({galleryId,reviewerId}));if(!r.ok){const j=await r.json().catch(()=>null) as {error?:string}|null;throw Error(j?.error||'Unable to prepare this reminder. Refresh and try again.')}save(await r.blob(),'gallery-closing-reminder.ics');setMessage('Open the downloaded file and save it in your calendar. Check that the one-day alert is enabled.')}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}
 return <div className="closing-reminder"><button className="text-link" disabled={busy||!available} onClick={download}>{busy?'Preparing reminder…':'Add closing reminder'}</button><p>{available?'Calendar alert one day before closing. If the date changes, update your calendar event.':'Less than a day remains. Review and download your photographs now.'}</p>{message&&<p role="status">{message}</p>}</div>;
}
