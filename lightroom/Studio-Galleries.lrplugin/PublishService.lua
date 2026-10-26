local Core=dofile(_PLUGIN.path .. '/Core.lua')
local LrApplication=import 'LrApplication'
local LrDialogs=import 'LrDialogs'
local LrTasks=import 'LrTasks'
local LrView=import 'LrView'
local P={supportsIncrementalPublish='only',canExportVideo=false,allowFileFormats={'JPEG'},allowColorSpaces={'sRGB'},hideSections={'exportLocation','fileNaming','fileSettings','imageSettings','outputSharpening','metadata','watermarking','video'},exportPresetFields={{key='connectionId',default=''}},titleForPublishedCollection='Collection',titleForPublishedCollectionSet='Gallery set',titleForGoToPublishedPhoto='Open in Studio Galleries',titleForGoToPublishedCollection='Open HAS gallery'}
local function proofSettings(p)
 p.LR_format='JPEG';p.LR_jpeg_quality=0.9;p.LR_export_colorSpace='sRGB'
 p.LR_size_doConstrain=true;p.LR_size_resizeType='longEdge';p.LR_size_maxHeight=2400;p.LR_size_maxWidth=2400;p.LR_size_units='pixels';p.LR_size_doNotEnlarge=true
 p.LR_minimizeEmbeddedMetadata=true;p.LR_removeLocationMetadata=true;p.LR_removeFaceMetadata=true;p.LR_useWatermark=false;p.LR_outputSharpeningOn=false;p.LR_renamingTokensOn=false
 p.LR_jpeg_useLimitSize=true;p.LR_jpeg_limitSize=5500
 p.LR_export_destinationType='tempFolder';p.LR_export_useSubfolder=false;p.LR_reimportExportedPhoto=false
end
-- Hidden built-in settings are not retained by a saved Publish Service.
-- Apply them before every render, including publishing without opening a dialog.
function P.updateExportSettings(p) proofSettings(p) end
function P.startDialog(p)
 proofSettings(p)
 p.connectionItems=Core.items();if not p.connectionId or p.connectionId=='' then p.connectionId=p.connectionItems[1].value end
end
function P.sectionsForTopOfDialog(f,p)
 return {{title='Studio Galleries',synopsis='Private proof publishing',f:column{bind_to_object=p,spacing=12,f:popup_menu{value=LrView.bind('connectionId'),items=LrView.bind('connectionItems'),width_in_chars=45},f:push_button{title='Connect Studio Galleries…',action=function() Core.connect(function(id)p.connectionItems=Core.items();p.connectionId=id end)end},f:static_text{title='With a workspace connection, a top-level collection becomes a gallery. A collection set becomes a gallery and its child collections become sections. JPEG proofs are sRGB, up to 2400 px. Edits republish to the same photograph and keep its pins.',width_in_chars=65,wrap=true},f:static_text{title='Removing a photo here keeps its hosted copy. Manage hosted photographs in Studio Galleries.',width_in_chars=65,wrap=true}}}}
end
function P.processRenderedPhotos(context,exportContext)
 local p=exportContext.propertyTable
 local ok,err=LrTasks.pcall(function()
  local info=Core.get(p.connectionId);if info.scope~='workspace' and info.gallery.id~=p.connectionId then error('Gallery connection mismatch. Reconnect before publishing.') end
  local catalogId=Core.catalogId(LrApplication.activeCatalog())
  local progress=exportContext:configureProgress{title='Publishing to Studio Galleries'}
  local section=exportContext.publishedCollectionInfo and exportContext.publishedCollectionInfo.name or 'Proofs'
  local galleryId=info.gallery and info.gallery.id;local sectionKey
  local collection=exportContext.publishedCollection
  local parent,root
  if info.scope=='workspace' then
   if not collection then error('Publish from a HAS published collection.') end
   parent=collection:getParent();root=parent or collection
   if parent and parent:getParent() then error('Use one collection-set level per gallery.') end
   section=parent and collection:getName() or 'Proofs'
   sectionKey='lr-section:'..catalogId..':'..tostring(collection.localIdentifier)
  end
  for _,rendition in exportContext:renditions{stopIfCanceled=true} do
   if progress:isCanceled() then break end
   local rendered,path=rendition:waitForRender()
   if rendered then
    if not galleryId then
     local created=Core.post(p.connectionId,{action='ensureGallery',key='lr-gallery:'..catalogId..':'..tostring(root.localIdentifier),title=root:getName()})
     galleryId=created.gallery.id
     exportContext.exportSession:recordRemoteCollectionId(galleryId)
     exportContext.exportSession:recordRemoteCollectionUrl('https://galleries.example.invalid/g/'..galleryId)
    end
    local uploaded,result=LrTasks.pcall(function()return Core.upload(p.connectionId,path,Core.sourceId(catalogId,rendition.photo),section,galleryId,sectionKey)end)
    if uploaded and result.id then rendition:recordPublishedPhotoId(result.id);rendition:recordPublishedPhotoUrl(result.url)
    else rendition:uploadFailed(tostring(result));if not uploaded then error(result,0) end end
   else rendition:uploadFailed(tostring(path)) end
  end
 end)
 if not ok then LrDialogs.message('Publishing paused.',tostring(err)..' Successfully published photos stay saved. Retry the remaining photographs.','warning') end
end
function P.deletePhotosFromPublishedCollection(settings,ids,deletedCallback)
 -- This service intentionally has no remote-delete permission.
 if LrDialogs.confirm('Remove from this Lightroom publish collection?', 'Hosted copies and client pins will remain in Studio Galleries.','Remove locally','Cancel')=='ok' then for _,id in ipairs(ids) do deletedCallback(id) end end
end
function P.deletePublishedCollection() LrDialogs.message('Hosted gallery retained.','Removing a Lightroom collection does not delete the section or its photographs in HAS.','info') end
function P.canAddCommentsToService() return false end
function P.getCollectionBehaviorInfo() return {defaultCollectionName='Proofs',canAddCollection=true,maxCollectionSetDepth=1} end
return P
