import {db} from './server';
export type PortfolioFolder={id:string;name:string};
export type PortfolioLibrary={folders:PortfolioFolder[];membership:Record<string,string>;revision:number};
export async function readPortfolioLibrary():Promise<PortfolioLibrary>{
 await db().prepare("INSERT OR IGNORE INTO portfolio_library(id,payload,revision) VALUES('owner','{\"folders\":[],\"membership\":{}}',0)").run();
 const row=await db().prepare("SELECT payload,revision FROM portfolio_library WHERE id='owner'").first<{payload:string;revision:number}>();
 return {...JSON.parse(row!.payload),revision:row!.revision};
}
export async function changePortfolioLibrary(a:any){
 const state=await readPortfolioLibrary();if(a.revision!==state.revision)throw Error('Folders changed in another window. Reload folders and try again.');
 const folder=state.folders.find(f=>f.id===a.folderId);
 if(['create','rename'].includes(a.operation)){
  const name=typeof a.name==='string'?a.name.trim():'';
  if(!name||name.length>60)throw Error('Give your folder a name, up to 60 characters.');
  if(state.folders.some(f=>f.id!==(a.operation==='rename'?a.folderId:null)&&f.name.toLowerCase()===name.toLowerCase()))throw Error('That folder name already exists.');
  if(a.operation==='rename'){if(!folder)throw Error('Folder not found.');folder.name=name}
  else{if(state.folders.length>=100)throw Error('Use up to 100 folders.');a.folderId=crypto.randomUUID();state.folders.push({id:a.folderId,name})}
 }else if(a.operation==='remove'){
  if(!folder)throw Error('Folder not found.');state.folders=state.folders.filter(f=>f.id!==folder.id);
  for(const [id,parent] of Object.entries(state.membership))if(parent===folder.id)delete state.membership[id];
 }else if(a.operation!=='move')throw Error('Unknown folder action.');
 if(a.operation==='move'||(a.operation==='create'&&a.imageIds?.length)){
  if(a.folderId!==''&&!state.folders.some(f=>f.id===a.folderId))throw Error('Folder not found.');
  if(!Array.isArray(a.imageIds)||!a.imageIds.length||a.imageIds.length>1000||a.imageIds.some((id:any)=>typeof id!=='string'||! /^[a-f0-9-]{36}$/.test(id)))throw Error('Select between 1 and 1,000 photographs.');
  const assets=new Set((await db().prepare('SELECT id FROM portfolio_assets WHERE removed=0').all<{id:string}>()).results.map(p=>p.id));
  if(a.imageIds.some((id:string)=>!assets.has(id)))throw Error('A selected photograph is unavailable. Reload your library.');
  for(const id of a.imageIds)if(a.folderId)state.membership[id]=a.folderId;else delete state.membership[id];
 }
 const {revision,...payload}=state;
 const saved=await db().prepare("UPDATE portfolio_library SET payload=?,revision=revision+1 WHERE id='owner' AND revision=? RETURNING revision").bind(JSON.stringify(payload),revision).first<{revision:number}>();
 if(!saved)throw Error('Folders changed in another window. Reload folders and try again.');
 return {...payload,revision:saved.revision,folderId:a.folderId};
}
