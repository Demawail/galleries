import {AwsClient} from 'aws4fetch';
import {env} from 'cloudflare:workers';
import {ownStorageConfigured} from './photo-storage';
export async function storageSnapshot(){
 const e=env as any,owned=ownStorageConfigured(e);let bytes=0,objects=0,cursor='',complete=false;
 for(let page=0;page<20;page++){
  if(owned){const url=new URL(`https://${e.HAS_R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${e.HAS_R2_BUCKET}`);url.searchParams.set('list-type','2');url.searchParams.set('max-keys','1000');if(cursor)url.searchParams.set('continuation-token',cursor);
   const c=new AwsClient({accessKeyId:e.HAS_R2_ACCESS_KEY_ID,secretAccessKey:e.HAS_R2_SECRET_ACCESS_KEY,service:'s3',region:'auto',retries:1});const r=await c.fetch(url,{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Storage inventory could not be read. The storage credential may need bucket-list permission.');const xml=await r.text();
   for(const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)){const size=Number(m[1].match(/<Size>(\d+)<\/Size>/)?.[1]);if(!Number.isFinite(size))throw Error('Unexpected storage inventory response.');bytes+=size;objects++}
   complete=/<IsTruncated>false<\/IsTruncated>/.test(xml);if(complete)break;cursor=xml.match(/<NextContinuationToken>([^<]+)<\/NextContinuationToken>/)?.[1]?.replaceAll('&amp;','&')||'';if(!cursor)throw Error('Incomplete storage response.');
  }else{if(!e.BUCKET)throw Error('Storage is not connected.');const r=await e.BUCKET.list({limit:1000,...(cursor?{cursor}:{})});for(const o of r.objects){bytes+=o.size;objects++}complete=!r.truncated;if(complete)break;cursor=r.cursor;}
 }
 return {bytes,objects,complete,observed:new Date().toISOString(),scope:owned?'Connected Cloudflare R2 bucket, all objects':'This app’s Sites-managed bucket',provider:owned?'Cloudflare':'ChatGPT Sites',note:'Point-in-time stored bytes, including renditions and retained objects. Not account-wide usage or billable GB-month. Other buckets, operations and hosting are not included.'};
}
