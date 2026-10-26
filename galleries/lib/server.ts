import {createPhotoStorage,photoStorageBase} from './photo-storage';
import { env } from 'cloudflare:workers';
import {readWorkspace,writeWorkspace,findPhoto} from './workspace-store';
import { seed, type Photo,type Gallery,type Workspace } from './model';
export function db(){const d=(env as any).DB;if(!d)throw Error('Gallery storage is unavailable. Please try again shortly.');return d as D1Database}
export function bucket(){return createPhotoStorage(env as any)}
export function newPhotoBase(galleryId:string,photoId:string){return photoStorageBase(env as any,galleryId,photoId)}
export async function read(){return readWorkspace(db())}
export async function write(data:Workspace,revision:number){return writeWorkspace(db(),data,revision)}
export async function lookupPhoto(id:string){return findPhoto(db(),id)}
export function sameOrigin(req:Request){const origin=req.headers.get('origin');if(origin&&origin!==new URL(req.url).origin)throw Error('This request is not allowed.');}
export function fail(e:unknown,status=400){console.error(e instanceof Error?e.message:'Gallery request failed');return Response.json({error:e instanceof Error?e.message:'Unable to complete this request.'},{status,headers:{'Cache-Control':'no-store'}})}

export function photoKey(g:Pick<Gallery,'id'>,p:Photo,variant:string){return `${p.storageKey||`${g.id}/${p.id}`}/${variant}`}

export function photoKeys(g:Gallery,p:Photo){return [...new Set([p.storageKey||`${g.id}/${p.id}`,...(p.storageHistory||[])])].flatMap(base=>['original','web','email'].map(v=>`${base}/${v}`))}
