import {db} from './server';
export type AlertSettings={recipient:string;signup:boolean;signin:boolean;download:boolean;submission:boolean};
export const defaultAlerts:AlertSettings={recipient:'owner@example.invalid',signup:true,signin:true,download:true,submission:true};
export async function alertSettings():Promise<AlertSettings>{const row=await db().prepare("SELECT payload FROM client_alert_settings WHERE id='owner'").first<{payload:string}>();return {...defaultAlerts,...(row?JSON.parse(row.payload):{})}}
// A settings failure must never interrupt a client's sign-in or download.
export async function configuredAlert(event:Record<string,unknown>){try{return {...event,settings:await alertSettings()}}catch{console.error('Unable to load activity alert settings.');return null}}
