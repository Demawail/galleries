import {configuredAlert} from '@/lib/alert-settings';
import {account,history,issueLink,redeem} from '@/lib/client-history';
import {db} from '@/lib/server';
import {digest} from '@/lib/lightroom';
const json=(x:unknown,status=200)=>Response.json(x,{status,headers:{'Cache-Control':'private, no-store'}});
type C={params:Promise<{action:string}>};
export async function GET(req:Request,{params}:C){try{if((await params).action!=='state')return json({error:'Not found'},404);const c=await account(req);return c?json({client:c,...await history(c.id)}):json({client:null})}catch{return json({error:'History is unavailable. Try again.'},503)}}
export async function POST(req:Request,{params}:C){try{const {action}=await params;const text=await req.text();if(text.length>12000)return json({error:'Request too large'},413);const a=JSON.parse(text||'{}');
 if(action==='request'){const email=String(a.email||'').trim().toLowerCase();if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');return json({token:await issueLink(email),email})}
 if(action==='verify'){const {session,newContactId}=await redeem(String(a.token||''));const who=await account(new Request(req.url,{headers:{'X-Client-Session':session}}));const event={name:who?.name,email:who?.email,at:new Date().toISOString()};return json({session,notification:await configuredAlert({...event,kind:'signin',id:await digest(session)}),signupNotification:newContactId?await configuredAlert({...event,kind:'signup',id:newContactId}):null})}
 const c=await account(req);if(!c)return json({error:'Sign in to view your history.'},401);
 if(action==='logout'){await db().prepare('DELETE FROM client_sessions WHERE hash=?').bind(await digest(req.headers.get('X-Client-Session')||'')).run();return json({ok:true})}
 if(action==='note'){const body=String(a.body||'').trim();if(!body||body.length>5000)throw Error('Write a note, up to 5,000 characters.');if(!['private','shared'].includes(a.visibility))throw Error('Choose who can see the note.');const n=await db().prepare('SELECT COUNT(*) n FROM client_journal WHERE contact_id=?').bind(c.id).first<{n:number}>();if(n!.n>=500)throw Error('Your notebook is full.');await db().prepare('INSERT INTO client_journal(id,contact_id,visibility,body,created_at) VALUES(?,?,?,?,?)').bind(crypto.randomUUID(),c.id,a.visibility,body,new Date().toISOString()).run();return json({ok:true})}
 return json({error:'Not found'},404);
 }catch(e){return json({error:(e as Error).message},400)}}
