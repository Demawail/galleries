import {db,read} from '@/lib/server';
import {digest} from '@/lib/lightroom';
import {visit,history} from '@/lib/client-history';
export async function GET(req:Request){try{const id=new URL(req.url).searchParams.get('id');if(id){const client=await db().prepare('SELECT id,name,email,created_at FROM client_contacts WHERE id=?').bind(id).first();if(!client)return Response.json({error:'Client not found'},{status:404});return Response.json({client,...await history(id,true)},{headers:{'Cache-Control':'no-store'}})}
 const known=new Set((await db().prepare('SELECT id FROM client_visits').all()).results.map((x:any)=>x.id));const {data}=await read();for(const g of data.galleries)for(const r of g.reviewers)if(r.clientLinkId&&!known.has(await digest(g.id+':'+r.id)))await visit(g,r,undefined,false);
 const clients=(await db().prepare('SELECT c.id,c.name,c.email,c.created_at,COUNT(v.id) galleries,MAX(v.last_at) last_at FROM client_contacts c LEFT JOIN client_visits v ON v.contact_id=c.id GROUP BY c.id ORDER BY COALESCE(MAX(v.last_at),c.created_at) DESC').all()).results;
 return Response.json({clients},{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Client history is unavailable. Try again.'},{status:503})}}
