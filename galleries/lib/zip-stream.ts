// Stored ZIP entries with data descriptors: one image chunk in memory at a time.
const encoder=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=(n>>>1)^((n&1)?0xedb88320:0);return n>>>0});
function record(size:number,signature:number){const bytes=new Uint8Array(size);new DataView(bytes.buffer).setUint32(0,signature,true);return bytes}
export type ZipEntry={name:string;open:()=>Promise<ReadableStream<Uint8Array>>};
export function streamZip(entries:ZipEntry[]){
 async function* chunks(){
  const central:Uint8Array[]=[];let offset=0;
  for(const entry of entries){
   const name=encoder.encode(entry.name);const body=await entry.open(),reader=body.getReader();
   const header=record(30+name.length,0x04034b50),h=new DataView(header.buffer);h.setUint16(4,20,true);h.setUint16(6,0x808,true);h.setUint16(12,33,true);h.setUint16(26,name.length,true);header.set(name,30);
   const start=offset;offset+=header.length;let size=0,crc=0xffffffff,complete=false;
   try{yield header;while(true){const r=await reader.read();if(r.done){complete=true;break}size+=r.value.length;offset+=r.value.length;if(offset>0xf0000000)throw Error('Archive too large. Download a smaller selection.');for(const b of r.value)crc=(crc>>>8)^table[(crc^b)&255];yield r.value}}
   finally{if(!complete)await reader.cancel().catch(()=>{});reader.releaseLock()}
   crc=(crc^0xffffffff)>>>0;
   const tail=record(16,0x08074b50),t=new DataView(tail.buffer);t.setUint32(4,crc,true);t.setUint32(8,size,true);t.setUint32(12,size,true);yield tail;offset+=16;
   const item=record(46+name.length,0x02014b50),v=new DataView(item.buffer);v.setUint16(4,20,true);v.setUint16(6,20,true);v.setUint16(8,0x808,true);v.setUint16(14,33,true);v.setUint32(16,crc,true);v.setUint32(20,size,true);v.setUint32(24,size,true);v.setUint16(28,name.length,true);v.setUint32(42,start,true);item.set(name,46);central.push(item);
  }
  const length=central.reduce((n,c)=>n+c.length,0);for(const item of central)yield item;
  const end=record(22,0x06054b50),v=new DataView(end.buffer);v.setUint16(8,entries.length,true);v.setUint16(10,entries.length,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);yield end;
 }
 const iterator=chunks();return new ReadableStream<Uint8Array>({async pull(controller){try{const next=await iterator.next();if(next.done)controller.close();else controller.enqueue(next.value)}catch(e){controller.error(e)}},async cancel(){await iterator.return(undefined)}});
}
