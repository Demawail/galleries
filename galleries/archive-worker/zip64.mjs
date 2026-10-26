// ZIP64 stored entries: bounded memory, UTF-8 names, streaming CRC/data descriptors.
const enc=new TextEncoder(),table=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0});
const record=(size,sig)=>{const b=new Uint8Array(size);new DataView(b.buffer).setUint32(0,sig,true);return b};
export async function* zip64(entries){
 const central=[];let offset=0;
 for(const entry of entries){
  const name=enc.encode(entry.name),start=offset,h=record(50+name.length,0x04034b50),v=new DataView(h.buffer);v.setUint16(4,45,true);v.setUint16(6,0x808,true);v.setUint16(12,33,true);v.setUint32(18,0xffffffff,true);v.setUint32(22,0xffffffff,true);v.setUint16(26,name.length,true);v.setUint16(28,20,true);h.set(name,30);v.setUint16(30+name.length,1,true);v.setUint16(32+name.length,16,true);
  yield h;offset+=h.length;let size=0,crc=0xffffffff,complete=false;const reader=(await entry.open()).getReader();
  try{while(true){const {done,value}=await reader.read();if(done){complete=true;break}size+=value.length;offset+=value.length;if(offset>21*1024**3)throw Error('Archive exceeds 21 GB');for(let i=0;i<value.length;i++)crc=(crc>>>8)^table[(crc^value[i])&255];yield value}}finally{if(!complete)await reader.cancel().catch(()=>{});reader.releaseLock()}
  crc=(crc^0xffffffff)>>>0;const tail=record(24,0x08074b50),t=new DataView(tail.buffer);t.setUint32(4,crc,true);t.setBigUint64(8,BigInt(size),true);t.setBigUint64(16,BigInt(size),true);yield tail;offset+=24;
  const c=record(74+name.length,0x02014b50),d=new DataView(c.buffer);d.setUint16(4,45,true);d.setUint16(6,45,true);d.setUint16(8,0x808,true);d.setUint16(14,33,true);d.setUint32(16,crc,true);d.setUint32(20,0xffffffff,true);d.setUint32(24,0xffffffff,true);d.setUint16(28,name.length,true);d.setUint16(30,28,true);d.setUint32(42,0xffffffff,true);c.set(name,46);const x=46+name.length;d.setUint16(x,1,true);d.setUint16(x+2,24,true);d.setBigUint64(x+4,BigInt(size),true);d.setBigUint64(x+12,BigInt(size),true);d.setBigUint64(x+20,BigInt(start),true);central.push(c);
 }
 const length=central.reduce((n,b)=>n+b.length,0);for(const c of central)yield c;
 const end64=record(56,0x06064b50),e=new DataView(end64.buffer);e.setBigUint64(4,44n,true);e.setUint16(12,45,true);e.setUint16(14,45,true);e.setBigUint64(24,BigInt(entries.length),true);e.setBigUint64(32,BigInt(entries.length),true);e.setBigUint64(40,BigInt(length),true);e.setBigUint64(48,BigInt(offset),true);yield end64;
 const locator=record(20,0x07064b50),l=new DataView(locator.buffer);l.setBigUint64(8,BigInt(offset+length),true);l.setUint32(16,1,true);yield locator;
 const end=record(22,0x06054b50),z=new DataView(end.buffer);z.setUint16(8,65535,true);z.setUint16(10,65535,true);z.setUint32(12,0xffffffff,true);z.setUint32(16,0xffffffff,true);yield end;
}
export async function uploadArchive(bucket,key,entries,expires){
 const upload=await bucket.createMultipartUpload(key,{httpMetadata:{contentType:'application/zip'},customMetadata:{expires:String(expires)}});const parts=[];const capacity=8*1024*1024;let buffer=new Uint8Array(capacity),used=0,total=0;
 try{for await(const chunk of zip64(entries)){let at=0;while(at<chunk.length){const count=Math.min(capacity-used,chunk.length-at);buffer.set(chunk.subarray(at,at+count),used);used+=count;at+=count;total+=count;if(used===capacity){parts.push(await upload.uploadPart(parts.length+1,buffer));buffer=new Uint8Array(capacity);used=0}}}
 if(used)parts.push(await upload.uploadPart(parts.length+1,buffer.subarray(0,used)));await upload.complete(parts);return total;
 }catch(e){await upload.abort().catch(()=>{});throw e}
}
