import {read,fail} from '@/lib/server';
import {closingCalendar} from '@/lib/calendar';
export async function GET(req:Request){try{
 const request=new URL(req.url),{data}=await read(),g=data.galleries.find(g=>g.id===request.searchParams.get('galleryId'));
 if(!g)return new Response('Gallery not found.',{status:404});
 const reviewer=g.reviewers.find(r=>r.id===request.searchParams.get('reviewerId')&&r.id!=='photographer');
 if(!reviewer)return new Response('Reviewer not found.',{status:404});
 const link=new URL('/g/'+encodeURIComponent(g.id),request.origin);link.searchParams.set('reviewer',reviewer.id);
 return new Response(closingCalendar(g,link.href),{headers:{'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'attachment; filename="gallery-closing-reminder.ics"','Cache-Control':'private, no-store'}});
}catch(e){return fail(e)}}
