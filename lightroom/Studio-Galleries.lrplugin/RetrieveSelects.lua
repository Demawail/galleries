local Core=dofile(_PLUGIN.path..'/Core.lua')
local LrApplication=import 'LrApplication'
local LrDialogs=import 'LrDialogs'
local LrTasks=import 'LrTasks'
local LrMD5=import 'LrMD5'
LrTasks.startAsyncTask(function()
 local ok,err=LrTasks.pcall(function()
  local id,galleryId=Core.chooseConnection();if not id or id=='' then return end
  local data,body=Core.get(id,'selects',nil,galleryId);local catalog=LrApplication.activeCatalog();local catalogId=Core.catalogId(catalog)
  local wanted={};for _,group in ipairs(data.groups) do for _,item in ipairs(group.photos) do wanted[item.sourceId]=true end end
  local lookup={};for _,photo in ipairs(catalog:getAllPhotos()) do local source=Core.sourceId(catalogId,photo);if wanted[source] then lookup[source]=photo end end
  local groups,aggregate,seen,notes={},{},{},{};local missing=0
  for _,group in ipairs(data.groups) do
   local photos={};local groupSeen={}
   for _,item in ipairs(group.photos) do
    local photo=lookup[item.sourceId]
    if photo then
     if not groupSeen[item.sourceId] then photos[#photos+1]=photo;groupSeen[item.sourceId]=true end
     if not seen[item.sourceId] then aggregate[#aggregate+1]=photo;seen[item.sourceId]=true end
     notes[item.sourceId]=(notes[item.sourceId] or '')..group.name..': '..(item.note or '')..(item.crop and '\nCrop intention: '..Core.json.encode(item.crop) or '')..'\n\n'
    else missing=missing+1 end
   end
   groups[#groups+1]={name=group.name..' ['..group.id:sub(1,8)..']',photos=photos}
  end
  if #aggregate==0 then LrDialogs.message('No matching Lightroom selects.',tostring(missing)..' selections do not belong to this catalog or were uploaded outside the plug-in. Nothing changed.','info');return end
  if LrDialogs.confirm('Create source-photo collections?',tostring(#aggregate)..' source photos matched. '..tostring(missing)..' selections could not be matched and will be skipped. Ratings, flags and edits stay unchanged.','Create collections','Cancel')~='ok' then return end
  catalog:withWriteAccessDo('Retrieve HAS selects',function()
   local root=catalog:createCollectionSet('HAS Selects',nil,true)
   local gallery=catalog:createCollectionSet(data.gallery.title:gsub('[/:\\]','-'):sub(1,80)..' ['..data.gallery.id:sub(1,8)..']',root,true)
   local snapshot=catalog:createCollectionSet('Selects ['..LrMD5.digest(body):sub(1,12)..']',gallery,true)
   catalog:createCollection('All selects',snapshot,true):addPhotos(aggregate)
   for _,group in ipairs(groups) do if #group.photos>0 then catalog:createCollection(group.name:gsub('[/:\\]','-'):sub(1,120),snapshot,true):addPhotos(group.photos) end end
   for source,text in pairs(notes) do lookup[source]:setPropertyForPlugin(_PLUGIN,'reviewNotes',text) end
  end,{timeout=30})
  LrDialogs.message('HAS selects retrieved.',tostring(#aggregate)..' source photos in HAS Selects. '..tostring(missing)..' unmatched. Notes and crop intentions are in the HAS review notes metadata field. Previous snapshots are retained.','info')
 end)
 if not ok then LrDialogs.message('Could not retrieve selects.',tostring(err),'warning') end
end)
