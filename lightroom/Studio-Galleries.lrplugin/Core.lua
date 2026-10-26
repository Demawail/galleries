local LrApplication = import 'LrApplication'
local LrBinding = import 'LrBinding'
local LrDialogs = import 'LrDialogs'
local LrFunctionContext = import 'LrFunctionContext'
local LrHttp = import 'LrHttp'
local LrPasswords = import 'LrPasswords'
local LrPrefs = import 'LrPrefs'
local LrTasks = import 'LrTasks'
local LrUUID = import 'LrUUID'
local LrView = import 'LrView'
local Json = dofile(_PLUGIN.path .. '/Json.lua')
local M = { endpoint='https://studio.example.invalid/gallery-bridge/lightroom', json=Json }
local prefs=LrPrefs.prefsForPlugin()
function M.connections() return prefs.connections or {} end
function M.items()
 local list={};for _,c in ipairs(M.connections()) do list[#list+1]={title=c.name,value=c.id} end
 if #list==0 then list[1]={title='Connect Studio Galleries first',value=''} end
 return list
end
function M.token(id)
 if not id or id=='' then error('Connect this Publish Service to a gallery first.') end
 local token=LrPasswords.retrieve('gallery:'..id)
 if not token or token=='' then error('Connection key unavailable. Connect this gallery again.') end
 return token
end
function M.decode(body,headers)
 if not body then error('Cannot reach HAS. Check your connection and retry.') end
 local ok,data=pcall(Json.decode,body)
 if not ok or type(data)~='table' then error('HAS returned an unexpected response. Please retry later.') end
 if not headers or not headers.status or headers.status<200 or headers.status>=300 then error(data.error or 'HAS could not complete this request.',0) end
 return data
end
function M.post(id,data)
 local body,h=LrHttp.post(M.endpoint,Json.encode(data),{{field='Authorization',value='Bearer '..M.token(id)},{field='Content-Type',value='application/json'}},30)
 return M.decode(body,h),body
end
function M.get(id,mode,token,galleryId)
 if galleryId then return M.post(id,{action='read',galleryId=galleryId,mode=mode}) end
 local body,h=LrHttp.get(M.endpoint..(mode=='selects' and '?mode=selects' or ''),{{field='Authorization',value='Bearer '..(token or M.token(id))}},30)
 return M.decode(body,h),body
end
function M.upload(id,path,sourceId,section,galleryId,sectionKey)
 local body,h=LrHttp.postMultipart(M.endpoint,{{name='sourceId',value=sourceId},{name='section',value=section},{name='galleryId',value=galleryId or ''},{name='sectionKey',value=sectionKey or ''},{name='image',filePath=path,fileName=import('LrPathUtils').leafName(path),contentType='image/jpeg'}},{{field='Authorization',value='Bearer '..M.token(id)}},120)
 return M.decode(body,h)
end
function M.catalogId(catalog)
 local id=catalog:getPropertyForPlugin(_PLUGIN,'catalogId')
 if not id then catalog:withWriteAccessDo('Identify HAS catalog',function() id=catalog:getPropertyForPlugin(_PLUGIN,'catalogId');if not id then id=LrUUID.generateUUID();catalog:setPropertyForPlugin(_PLUGIN,'catalogId',id) end end,{timeout=30}) end
 if not id then error('Could not identify this Lightroom catalog. Please retry.') end
 return id
end
function M.sourceId(catalogId,photo)
 local uuid=photo:getRawMetadata('uuid');if not uuid then error('This photograph has no stable Lightroom identity.') end
 return 'lr:'..catalogId..':'..tostring(photo.localIdentifier)..':'..uuid
end
function M.connect(onConnected)
 LrTasks.startAsyncTask(function()
  LrFunctionContext.callWithContext('HAS connect',function(context)
   local p=LrBinding.makePropertyTable(context);p.key=''
   local f=LrView.osFactory()
   local result=LrDialogs.presentModalDialog{title='Connect Studio Galleries',actionVerb='Connect',contents=f:column{bind_to_object=p,spacing=12,f:static_text{title='Create a workspace connection using Lightroom on the Studio Galleries dashboard, then paste its key here. A gallery-only key also works for a single shoot.',width_in_chars=65,wrap=true},f:password_field{value=LrView.bind('key'),width_in_chars=65}}}
   if result~='ok' then return end
   local token=p.key:gsub('%s','');p.key=''
   if not token:match('^haslr_%x+$') or #token~=70 then LrDialogs.message('That connection key is not valid.',nil,'warning');return end
   local ok,data=LrTasks.pcall(function()return M.get(nil,nil,token)end)
   if not ok then LrDialogs.message('Could not connect.',tostring(data),'warning');return end
   local connectionId=data.scope=='workspace' and ('workspace:'..data.connectionId) or data.gallery.id
   local connectionName=data.scope=='workspace' and 'Studio Galleries · all shoots' or data.gallery.title
   local saved,err=LrTasks.pcall(function()
    LrPasswords.store('gallery:'..connectionId,token)
    local all={} -- connection records contain no secrets
    for _,c in ipairs(M.connections()) do if c.id~=connectionId then all[#all+1]=c end end
    all[#all+1]={id=connectionId,name=connectionName};prefs.connections=all
   end)
   token=nil
   if not saved then LrDialogs.message('Could not save the secure connection.',tostring(err),'warning');return end
   if onConnected then onConnected(connectionId) end
   LrDialogs.message('Connected to '..connectionName,'The key is stored in your OS password store.','info')
  end)
 end)
end
function M.chooseConnection()
 local chosen
 LrFunctionContext.callWithContext('Choose HAS gallery',function(context)
  local p=LrBinding.makePropertyTable(context);p.id=M.items()[1].value
  local f=LrView.osFactory()
  if LrDialogs.presentModalDialog{title='Retrieve HAS selects',actionVerb='Retrieve',contents=f:column{bind_to_object=p,f:popup_menu{value=LrView.bind('id'),items=M.items(),width_in_chars=45},f:static_text{title='Creates source-photo collections for submitted client pins and Photographer’s Favorites. Ratings and flags stay unchanged.',width_in_chars=60,wrap=true}}}=='ok' then chosen=p.id end
 end)
 if not chosen or chosen=='' then return end
 local info=M.get(chosen)
 if info.scope~='workspace' then return chosen end
 if #info.galleries==0 then LrDialogs.message('No published galleries yet.','Publish a Lightroom collection first.','info');return end
 local galleryId
 LrFunctionContext.callWithContext('Choose shoot',function(context)
  local p=LrBinding.makePropertyTable(context);local items={};for _,g in ipairs(info.galleries) do items[#items+1]={title=g.title,value=g.id} end;p.id=items[1].value
  local f=LrView.osFactory()
  if LrDialogs.presentModalDialog{title='Choose a HAS gallery',actionVerb='Retrieve',contents=f:popup_menu{bind_to_object=p,value=LrView.bind('id'),items=items,width_in_chars=45}}=='ok' then galleryId=p.id end
 end)
 if galleryId then return chosen,galleryId end
end
return M
