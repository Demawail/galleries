import {AwsClient} from 'aws4fetch';

type StorageEnv={BUCKET?:R2Bucket;HAS_R2_ACCOUNT_ID?:string;HAS_R2_BUCKET?:string;HAS_R2_ACCESS_KEY_ID?:string;HAS_R2_SECRET_ACCESS_KEY?:string};
const prefix='owned-r2/';
export function ownStorageConfigured(e:StorageEnv){
 const values=[e.HAS_R2_ACCOUNT_ID,e.HAS_R2_BUCKET,e.HAS_R2_ACCESS_KEY_ID,e.HAS_R2_SECRET_ACCESS_KEY];
 if(!values.some(Boolean))return false;
 if(!values.every(Boolean)||! /^[a-f0-9]{32}$/.test(e.HAS_R2_ACCOUNT_ID!)||! /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(e.HAS_R2_BUCKET!))throw Error('The private photo storage connection needs attention.');
 return true;
}
export function photoStorageBase(e:StorageEnv,galleryId:string,photoId:string){return (ownStorageConfigured(e)?prefix:'')+galleryId+'/'+photoId}
export function createPhotoStorage(e:StorageEnv){
 function managed(){if(!e.BUCKET)throw Error('Photo storage is unavailable.');return e.BUCKET}
 async function request(key:string,method:string,body?:ArrayBuffer|Uint8Array,contentType?:string){
  if(!ownStorageConfigured(e))throw Error('Reconnect your private photo storage to access this photograph.');
  if(!key.startsWith(prefix)||key.split('/').some(part=>!part||part==='.'||part==='..'))throw Error('Invalid photo storage key.');
  const client=new AwsClient({accessKeyId:e.HAS_R2_ACCESS_KEY_ID!,secretAccessKey:e.HAS_R2_SECRET_ACCESS_KEY!,service:'s3',region:'auto',retries:2});
  const url=`https://${e.HAS_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${e.HAS_R2_BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
  const response=await client.fetch(url,{method,body:body as BodyInit|undefined,headers:contentType?{'Content-Type':contentType}:undefined,redirect:'manual',signal:AbortSignal.timeout(90000)});
  if(method==='GET'&&response.status===404)return null;
  if(!response.ok){await response.body?.cancel();throw Error(`Private photo storage could not ${method==='GET'?'read':method==='PUT'?'save':'remove'} the photograph (${response.status}). Please retry.`)}
  return response;
 }
 return {
  async get(key:string){if(!key.startsWith(prefix))return managed().get(key);const r=await request(key,'GET');return r?{body:r.body!,arrayBuffer:()=>r.arrayBuffer()}:null},
  async put(key:string,bytes:ArrayBuffer|Uint8Array,options?:{httpMetadata?:{contentType?:string}}){if(!key.startsWith(prefix)){await managed().put(key,bytes,options);return}const r=await request(key,'PUT',bytes,options?.httpMetadata?.contentType);await r?.body?.cancel()},
  async delete(keys:string|string[]){const list=typeof keys==='string'?[keys]:keys;const legacy=list.filter(k=>!k.startsWith(prefix));if(legacy.length)await managed().delete(legacy);const owned=list.filter(k=>k.startsWith(prefix));for(let i=0;i<owned.length;i+=5)await Promise.all(owned.slice(i,i+5).map(async key=>{const r=await request(key,'DELETE');await r?.body?.cancel()}))},
 };
}
