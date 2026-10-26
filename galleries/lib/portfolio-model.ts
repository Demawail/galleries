export type PortfolioImage={id:string;width:number;height:number;alt:string};
export type PortfolioPage={id:string;slug:string;name:string;cover:string;images:string[];visible:boolean};
export type PortfolioDraft={name:string;tagline:string;bio:string;email:string;phone:string;instagram:string;representation:string;licensing:string;contactImage:string;featured:string[];pages:PortfolioPage[];alts:Record<string,string>};
export type PortfolioPublic=Omit<PortfolioDraft,'alts'> & {images:PortfolioImage[]};
export const emptyPortfolio=():PortfolioDraft=>({name:'',tagline:'',bio:'',email:'',phone:'',instagram:'',representation:'',licensing:'',contactImage:'',featured:[],pages:[],alts:{}});
export function portfolioSlug(name:string){return name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64)}
export function portfolioRefs(d:PortfolioDraft){return [...new Set([...d.featured,d.contactImage,...d.pages.flatMap(p=>[p.cover,...p.images])].filter(Boolean))]}
// Accept handles and Instagram share links; persist only a clean HTTPS profile URL.
export function normalizeInstagram(value:string){
 const raw=value.trim();if(!raw)return '';
 let handle=raw.replace(/^@/,'');
 if(!/^@?[a-zA-Z0-9_.]+$/.test(raw)){
  try{const url=new URL(/^https?:\/\//i.test(raw)?raw:'https://'+raw);
   if(!['http:','https:'].includes(url.protocol)||!['instagram.com','www.instagram.com','m.instagram.com'].includes(url.hostname.toLowerCase())||url.username||url.password||url.port)throw Error();
   const match=url.pathname.match(/^\/@?([a-zA-Z0-9_.]+)\/?$/);if(!match)throw Error();handle=match[1];
  }catch{throw Error('Enter an Instagram username, like @yourname, or a profile link.');}
 }
 if(!/^[a-zA-Z0-9_](?:[a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_])?$/.test(handle)||handle.includes('..'))throw Error('Enter a valid Instagram username, like @yourname.');
 return 'https://www.instagram.com/'+handle.toLowerCase()+'/';
}
export function validatePortfolio(input:any):PortfolioDraft{
 const text=(v:any,max:number)=>{if(typeof v!=='string'||v.length>max)throw Error('Check your portfolio text and field lengths.');return v.trim()};
 const ids=(v:any,max:number)=>{if(!Array.isArray(v)||v.length>max||v.some(x=>typeof x!=='string'||! /^[a-f0-9-]{36}$/.test(x)))throw Error('Invalid photograph selection.');return [...new Set(v)] as string[]};
 const image=(v:any)=>v===''?'':ids([v],1)[0];
 const d:PortfolioDraft={name:text(input.name,80),tagline:text(input.tagline,120),bio:text(input.bio,6000),email:text(input.email,254),phone:text(input.phone,80),instagram:normalizeInstagram(text(input.instagram,2048)),representation:text(input.representation,1500),licensing:text(input.licensing,1500),contactImage:image(input.contactImage),featured:ids(input.featured,20),pages:[],alts:{}};
 if(d.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))throw Error('Enter a valid contact email.');
 if(!Array.isArray(input.pages)||input.pages.length>24)throw Error('Use up to 24 portfolio pages.');
 d.pages=input.pages.map((p:any)=>{const name=text(p.name,60),slug=text(p.slug,64),id=text(p.id,36);if(!name||! /^[a-f0-9-]{36}$/.test(id)||! /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||['contact','data','image','index'].includes(slug)||typeof p.visible!=='boolean')throw Error('Give every page a unique name and URL.');return {id,name,slug,cover:image(p.cover),images:ids(p.images,300),visible:p.visible}});
 if(new Set(d.pages.map(p=>p.slug)).size!==d.pages.length||new Set(d.pages.map(p=>p.id)).size!==d.pages.length)throw Error('Page names and URLs must be unique.');
 if(input.alts&&typeof input.alts==='object')for(const id of portfolioRefs(d))if(input.alts[id]!==undefined)d.alts[id]=text(input.alts[id],250);
 return d;
}
// Editorial rhythm, never more than two images across. Portrait-heavy sequences
// stay in offset pairs; a landscape can open each three-image movement.
export function portfolioRows(images:PortfolioImage[]){const portraitHeavy=images.filter(p=>p.height>p.width).length>images.length*.6;const rows:{wide:boolean;images:PortfolioImage[]}[]=[];let i=0;while(i<images.length){const p=images[i];const wide=!portraitHeavy&&p.width/p.height>=1.25&&(rows.length%2===0||i===images.length-1);rows.push({wide,images:images.slice(i,i+(wide?1:2))});i+=wide?1:2}return rows}
