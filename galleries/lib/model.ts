export type Photo={storageKey?:string;storageHistory?:string[];lrChecksum?:string;id:string;filename:string;section:string;url:string;original?:string;email?:string;web?:string;sourceId:string;favorite:boolean;cleared:boolean;destination:string;look:string;bytes:number;demo:boolean};
export type Reviewer={clientLinkId?:string;clientSessionHash?:string;clientSessionHashes?:string[];resumeHash?:string;reviewVersion?:number;allowanceCustomized?:boolean;id:string;name:string;section:string;allowance:number;pins:string[];notes:Record<string,string>;crops:Record<string,{context:string;x:number;y:number}>;submitted:string|null;receipt:string|null};
export function clientPinLimit(g:Gallery):number{return g.clientPinAllowance??DEFAULT_PIN_ALLOWANCE}
export function sharedClientPins(g:Gallery):string[]{return g.clientPins??[...new Set(g.reviewers.filter(r=>r.id!=='photographer').flatMap(r=>r.pins))]}
export function setClientPinLimit(g:Gallery,n:number){
 if(!Number.isSafeInteger(n)||n<1)throw Error('Enter a positive whole-number client pin limit.');
 preserveSubmissions(g);
 g.clientPinAllowance=n;g.clientPins=sharedClientPins(g);if(g.clientPins.length>n)g.shortlistReopened=true;
 for(const r of g.reviewers)if(r.id!=='photographer'){r.allowance=n;r.allowanceCustomized=true;r.pins=[...g.clientPins];if(r.pins.length>n){r.submitted=null;r.receipt=null}}
 for(const link of g.clientLinks||[])link.allowance=n;
}
export type ClientCollection={id:string;name:string;photoIds:string[];reviewerId:string;linkId:string;version:number;created:string;updated:string;deleted?:boolean};
export type ClientLink={collectionId?:string;parentId?:string;id:string;token:string;scope:string;allowance:number;revoked:boolean;created:string};
export type Submission={receipt:string;at:string;reviewerId:string;name:string;photoIds:string[];revision:number;legacy?:boolean};
export type Gallery={clientCollections?:ClientCollection[];shortlistRevision?:number;submissionHistory?:Submission[];shortlistReopened?:boolean;clientPins?:string[];clientPinAllowance?:number;clientLinks?:ClientLink[];lrPublishKey?:string;id:string;title:string;client:string;date:string;location:string;note:string;privateNotes:string;cover:string;coverPosition:number;titlePosition:string;expires:string;status:'draft'|'live'|'archived'|'clearing'|'cleared'|'deleting';archiveConfirmed:boolean;downloadEnabled:boolean;extensionPrice:number;extensionRequests:{id:string;days:number;reviewer:string;at:string;status:string}[];sections:{id:string;name:string;lrKey?:string}[];photos:Photo[];reviewers:Reviewer[];activity:{at:string;text:string}[]};
export type Workspace={galleries:Gallery[];version:number};
export const DEFAULT_PIN_ALLOWANCE=20;
export const stamp=()=>new Date().toISOString();
export const isClosed=(g:Gallery)=>g.status!=='live'||Date.parse(g.expires)<=Date.now();
export const allowed=(g:Gallery,r:Reviewer)=>g.photos.filter(p=>r.section==='all'||p.section===r.section);
export function seed():Workspace{return {version:4,galleries:[]};}

function str(v:unknown,max=500){if(typeof v!=='string')throw Error('Please enter valid text.');return v.trim().slice(0,max)}
export function command(ws:Workspace,a:any):Workspace{
if(!a||typeof a.type!=='string')throw Error('Unknown action.');
if(a.type==='create'){
const title=str(a.title,120);if(!title)throw Error('Give the gallery a title.');const id=crypto.randomUUID();
ws.galleries.unshift({id,title,client:str(a.client||'',120),date:new Date().toISOString().slice(0,10),location:'',note:'Your photographs are ready. Take your time and pin your favorites. — Photographer',privateNotes:'',cover:'',coverPosition:50,titlePosition:'left',expires:new Date(Date.now()+30*86400000).toISOString(),status:'draft',archiveConfirmed:false,downloadEnabled:true,extensionPrice:25,extensionRequests:[],sections:[{id:'proofs',name:'Proofs'}],photos:[],reviewers:[{id:crypto.randomUUID(),name:'Client',section:'all',allowance:DEFAULT_PIN_ALLOWANCE,pins:[],notes:{},crops:{},submitted:null,receipt:null}],activity:[]});return ws;
}
const g=ws.galleries.find(g=>g.id===a.galleryId);if(!g)throw Error('Gallery not found.');
preserveSubmissions(g);
if(g.status==='deleting'||g.status==='clearing')throw Error('This gallery is being removed. Retry its removal before making changes.');
const log=(text:string)=>{g.activity.unshift({at:stamp(),text});g.activity=g.activity.slice(0,100)};
if(a.reviewerId==='photographer'&&['note','crop'].includes(a.type)&&!g.reviewers.some(r=>r.id==='photographer'))g.reviewers.push({id:'photographer',name:'Your Photographer',section:'all',allowance:250,pins:[],notes:{},crops:{},submitted:null,receipt:null});
g.clientPins=sharedClientPins(g);
for(const person of g.reviewers)if(person.id!=='photographer'){person.allowance=clientPinLimit(g);person.pins=[...g.clientPins]}
const r=g.reviewers.find(r=>r.id===a.reviewerId);
if(['pin','note','crop','submit','reopen','extension'].includes(a.type)){
if(!r)throw Error('Reviewer not found.');
if(a.type!=='extension'&&a.type!=='reopen'&&r.id!=='photographer'&&isClosed(g))throw Error('This gallery is closed.');
if(['pin','note','crop'].includes(a.type)){
if(r.id!=='photographer'&&sharedSubmission(g).locked&&a.type!=='pin')throw Error('Reopen your selects before making changes.');
if(!allowed(g,r).some(p=>p.id===a.photoId))throw Error('This photograph is outside your section.');
}
if(a.type==='pin'){if(r.pins.includes(a.photoId))r.pins=r.pins.filter(id=>id!==a.photoId);else {if(r.pins.length>=r.allowance)throw Error(`You have used all ${r.allowance} pins. Unpin one to make room.`);r.pins.push(a.photoId)}if(r.id!=='photographer'){g.clientPins=[...r.pins];g.shortlistRevision=(g.shortlistRevision||0)+1;for(const person of g.reviewers)if(person.id!=='photographer'){person.pins=[...g.clientPins];person.submitted=null;person.receipt=null}log(`${r.name} ${r.pins.includes(a.photoId)?'pinned':'unpinned'} ${g.photos.find(p=>p.id===a.photoId)?.filename||'a photograph'} in the shared shortlist.`)}}
if(a.type==='note')r.notes[a.photoId]=str(a.note,1500);
if(a.type==='crop'){if(!['Website header','Magazine story','Profile','Campaign','Instagram feed','LinkedIn promoted post'].includes(a.context))throw Error('Choose a preview.');r.crops[a.photoId]={context:a.context,x:Math.max(0,Math.min(100,Number(a.x)||0)),y:Math.max(0,Math.min(100,Number(a.y)||0))}}
if(a.type==='submit'){
 const excess=overLimitMessage(g);if(excess)throw Error(excess);
 if(a.shortlistRevision!==undefined&&a.shortlistRevision!==(g.shortlistRevision||0))throw Error('The shared pins changed. Review them before submitting.');
 if(sharedSubmission(g).locked)return ws;
 if(!g.clientPins.length)throw Error('Pin at least one photograph first.');
 const receipt={receipt:crypto.randomUUID(),at:stamp(),reviewerId:r.id,name:r.name,photoIds:[...g.clientPins],revision:g.shortlistRevision||0};
 g.submissionHistory!.push(receipt);g.shortlistReopened=false;
 for(const person of g.reviewers)if(person.id!=='photographer'){person.submitted=receipt.at;person.receipt=receipt.receipt}
 log(`${r.name} submitted ${g.clientPins.length} shared pins.`);
}
if(a.type==='reopen'){g.shortlistReopened=true;for(const person of g.reviewers)if(person.id!=='photographer'){person.submitted=null;person.receipt=null}log(`${r.name} reopened the shared shortlist.`)}
if(a.type==='extension'){if(![30,90,365].includes(a.days))throw Error('Choose an extension period.');g.extensionRequests.unshift({id:crypto.randomUUID(),days:a.days,reviewer:r.name,at:stamp(),status:'requested'});log(`${r.name} requested ${a.days} more days. No payment taken.`)}
return ws;
}
switch(a.type){
case 'settings':{
const s=a.settings||{};for(const k of ['title','client','date','location','note','privateNotes'] as const)if(k in s)g[k]=str(s[k],k==='privateNotes'?10000:k==='note'?2000:150);
if(!g.title)throw Error('A title is required.');
if(!/^\d{4}-\d{2}-\d{2}$/.test(g.date)||!Number.isFinite(Date.parse(g.date)))throw Error('Choose a valid shoot date.');
if(s.expires){const date=Date.parse(s.expires);if(!Number.isFinite(date))throw Error('Choose a valid closing date.');g.expires=new Date(date).toISOString()}
if(typeof s.downloadEnabled==='boolean')g.downloadEnabled=s.downloadEnabled;
if(typeof s.archiveConfirmed==='boolean')g.archiveConfirmed=s.archiveConfirmed;
if(Number.isFinite(s.extensionPrice))g.extensionPrice=Math.max(0,Math.min(10000,s.extensionPrice));
if(s.cover!==undefined){if(s.cover!==''&&!g.photos.some(p=>p.url===s.cover))throw Error('Choose a gallery cover.');g.cover=s.cover}
if(Number.isFinite(s.coverPosition))g.coverPosition=Math.max(0,Math.min(100,s.coverPosition));
if(['left','center'].includes(s.titlePosition))g.titlePosition=s.titlePosition;
log('Gallery details updated.');break;}
case 'section':{const name=str(a.name,80);if(!name)throw Error('Name your section.');g.sections.push({id:crypto.randomUUID(),name});log(`Section added: ${name}`);break;}
case 'reviewer':{const name=str(a.name,80),n=clientPinLimit(g);if(!name||!Number.isSafeInteger(n)||n<1)throw Error('Add a name and a positive whole-number pin allowance.');if(a.section!=='all'&&!g.sections.some(s=>s.id===a.section))throw Error('Section not found.');g.reviewers.push({id:crypto.randomUUID(),name,section:a.section,allowance:n,allowanceCustomized:true,pins:[...sharedClientPins(g)],notes:{},crops:{},submitted:null,receipt:null});log(`Reviewer added: ${name}`);break;}
case 'client-pin-limit':
case 'reviewer-allowance':{setClientPinLimit(g,Number(a.allowance));log(`Client pin limit updated for everyone: ${g.clientPinAllowance}`);break;}
case 'section-selected':{
if(!g.sections.some(s=>s.id===a.section)||!Array.isArray(a.photoIds)||!a.photoIds.length)throw Error('Choose photographs and a section.');const ids=new Set(a.photoIds);const photos=g.photos.filter(p=>ids.has(p.id));if(photos.length!==ids.size)throw Error('A selected photograph is unavailable.');for(const p of photos)p.section=a.section;log(`${photos.length} photographs assigned to a section. Pins and notes retained.`);break;
}
case 'favorite-selected':{
if(!Array.isArray(a.photoIds)||!a.photoIds.length||a.photoIds.some((id:unknown)=>typeof id!=='string'))throw Error('Select photographs to star.');
const ids=new Set<string>(a.photoIds),photos=g.photos.filter(p=>ids.has(p.id));
if(photos.length!==ids.size)throw Error('One or more selected photographs are no longer in this gallery. Refresh and try again.');
for(const p of photos)p.favorite=true;
log(`${photos.length} photographs added to Photographer’s Favorites.`);break;
}
case 'photo':{const p=g.photos.find(p=>p.id===a.photoId);if(!p)throw Error('Photo not found.');if(typeof a.favorite==='boolean')p.favorite=a.favorite;if(typeof a.cleared==='boolean'){p.cleared=a.cleared;if(!p.cleared)p.destination='none'}if(a.destination){if(!['none','portfolio','featured','project'].includes(a.destination))throw Error('Unknown destination.');if(a.destination!=='none'&&!p.cleared)throw Error('Confirm public-use clearance first.');p.destination=a.destination}if(a.section){if(!g.sections.some(s=>s.id===a.section))throw Error('Section not found.');p.section=a.section}break;}
case 'status':{if(!['draft','live','archived'].includes(a.status))throw Error('Invalid gallery status.');if(g.status==='cleared')throw Error('Hosted files have been removed. Create a new gallery to republish.');if(a.status==='live'&&!g.photos.length)throw Error('Upload a photograph before opening.');if(a.status==='live'&&Date.parse(g.expires)<=Date.now())throw Error('Choose a future closing date first.');g.status=a.status;log(`Gallery ${a.status}.`);break;}
case 'approve-extension':{const e=g.extensionRequests.find(e=>e.id===a.requestId);if(!e||e.status!=='requested')throw Error('Request not available.');if(g.status==='cleared')throw Error('Images are unavailable.');e.status='granted';g.expires=new Date(Math.max(Date.now(),Date.parse(g.expires))+e.days*86400000).toISOString();g.status='live';log(`Granted ${e.days} days as a complimentary extension.`);break;}
default:throw Error('Unknown action.');}
return ws;
}

// The automatic root bucket belongs to All photographs, not to the section tabs.
export function reviewSections(g:Gallery,r:Reviewer){
 const rootKey=g.lrPublishKey?.replace('lr-gallery:','lr-section:');
 return g.sections.filter(s=>s.id!=='finals'&&!(s.id==='proofs'&&s.name==='Proofs'&&!s.lrKey)&&!(rootKey&&s.lrKey===rootKey)&&(r.section==='all'||r.section===s.id));
}

// Additive migration: legacy receipts survive; their original snapshots were not stored.
export function preserveSubmissions(g:Gallery){
 g.shortlistRevision??=0;g.submissionHistory??=[];
 for(const r of g.reviewers)if(r.id!=='photographer'&&r.receipt&&r.submitted&&!g.submissionHistory.some(s=>s.receipt===r.receipt))g.submissionHistory.push({receipt:r.receipt,at:r.submitted,reviewerId:r.id,name:r.name,photoIds:[...r.pins],revision:g.shortlistRevision,legacy:true});
}
export function sharedSubmission(g:Gallery){
 const history=g.submissionHistory||g.reviewers.filter(r=>r.id!=='photographer'&&r.receipt&&r.submitted).map(r=>({receipt:r.receipt!,at:r.submitted!,reviewerId:r.id,name:r.name,photoIds:[...r.pins],revision:g.shortlistRevision||0,legacy:true}));
 const latest=[...history].sort((a,b)=>a.at.localeCompare(b.at)).at(-1)||null;
 const changed=!!latest&&(!!g.shortlistReopened||latest.revision!==(g.shortlistRevision||0));
 return {latest,changed,locked:!!latest&&!changed,revision:g.shortlistRevision||0};
}
export function overLimitMessage(g:Gallery){const n=sharedClientPins(g).length,limit=clientPinLimit(g),extra=n-limit;return extra>0?`You have ${n} shared pins and a limit of ${limit}. Remove ${extra} photograph${extra===1?'':'s'} before submitting.`:''}
