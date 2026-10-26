// Worker-native PNG rendering. No external fonts, services or client JavaScript.
let shareGlyphPromise;
const shareBytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function shareGlyphs(){return shareGlyphPromise??=(async()=>{const text=await new Response(new Blob([shareBytes(shareGlyphData)]).stream().pipeThrough(new DecompressionStream('deflate'))).text();const g=JSON.parse(text);for(const v of Object.values(g))v[5]=shareBytes(v[5]);return g})()}
export async function renderGalleryShareImage(title,section=''){
 const glyphs=await shareGlyphs(),w=1200,h=630,pixels=new Uint8Array(w*h*3),bg=[31,55,43],cream=[247,248,237],green=[206,239,143];for(let i=0;i<pixels.length;i+=3)pixels.set(bg,i);
 function box(x,y,width,height,color){for(let yy=y;yy<y+height;yy++)for(let xx=x;xx<x+width;xx++)pixels.set(color,(yy*w+xx)*3)}
 const clean=s=>String(s||'').normalize('NFC').replace(/\s+/g,' ').trim();
 const glyph=c=>glyphs[c]||glyphs['?'];
 const width=(s,size)=>Array.from(s).reduce((n,c)=>n+glyph(c)[0]*size/72,0);
 function text(s,x,baseline,size,color){const scale=size/72;for(const c of s){const [advance,left,top,gw,gh,mask]=glyph(c);const dx=Math.round(x+left*scale),dy=Math.round(baseline+top*scale);for(let y=0;y<Math.ceil(gh*scale);y++)for(let xx=0;xx<Math.ceil(gw*scale);xx++){const px=dx+xx,py=dy+y;if(px<0||px>=w||py<0||py>=h)continue;const a=mask[Math.min(gh-1,Math.floor(y/scale))*gw+Math.min(gw-1,Math.floor(xx/scale))]/255;if(!a)continue;const idx=(py*w+px)*3;for(let k=0;k<3;k++)pixels[idx+k]=Math.round(pixels[idx+k]*(1-a)+color[k]*a)}x+=advance*scale}}
 function wrap(s,size,max){const lines=[];let line='';for(const c of Array.from(s)){if(width(line+c,size)>max&&line){const at=line.lastIndexOf(' ');if(at>line.length*.4){lines.push(line.slice(0,at));line=line.slice(at+1)+c}else{lines.push(line);line=c}}else line+=c}if(line)lines.push(line);return lines}
 function shorten(s,size,max){while(width(s,size)>max&&s.length)s=Array.from(s).slice(0,-1).join('');return s}
 title=clean(title)||'Photographs';section=clean(section);let size=80,lines=wrap(title,size,1040);while(lines.length>3&&size>44){size-=4;lines=wrap(title,size,1040)}if(lines.length>3)lines=[...lines.slice(0,2),shorten(lines[2],size,990)+'…'];
 box(64,52,64,64,green);text('H',78,100,48,bg);text('YOUR STUDIO',150,92,26,cream);text('PHOTOGRAPHY GALLERY',64,174,21,green);
 const baseline=lines.length===1?337:lines.length===2?291:250;lines.forEach((line,i)=>text(line,64,baseline+i*size*1.13,size,cream));
 if(section&&section!=='All photographs')text(shorten(section,29,1020),64,514,29,green);
 box(64,550,1072,1,[83,107,83]);text('Photographer: Your Photographer',64,588,23,cream);text('HAS',1078,588,23,green);
 const scan=new Uint8Array(h*(w*3+1));for(let y=0;y<h;y++)scan.set(pixels.subarray(y*w*3,(y+1)*w*3),y*(w*3+1)+1);
 const compressed=new Uint8Array(await new Response(new Blob([scan]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
 function chunk(type,data){const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);v.setUint32(0,data.length);out.set(new TextEncoder().encode(type),4);out.set(data,8);let crc=0xffffffff;for(const b of out.subarray(4,-4)){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}v.setUint32(out.length-4,(crc^0xffffffff)>>>0);return out}
 const ihdr=new Uint8Array(13),view=new DataView(ihdr.buffer);view.setUint32(0,w);view.setUint32(4,h);ihdr.set([8,2,0,0,0],8);
 return new Blob([new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())],{type:'image/png'});
}
