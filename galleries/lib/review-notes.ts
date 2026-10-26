import type {Gallery} from './model';
export function reviewNotes(g:Gallery){
 return g.photos.map(photo=>({photo,notes:g.reviewers.flatMap(reviewer=>{
  const text=reviewer.notes[photo.id];
  return text?.trim()?[{reviewerId:reviewer.id,name:reviewer.name,text,pinned:reviewer.id==='photographer'?photo.favorite:reviewer.pins.includes(photo.id),submitted:reviewer.submitted}]:[];
 })})).filter(item=>item.notes.length>0).sort((a,b)=>a.photo.filename.localeCompare(b.photo.filename,undefined,{numeric:true})||a.photo.id.localeCompare(b.photo.id));
}
