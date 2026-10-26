-- v0.1 offline bridge. No network, credentials or rating/flag edits.
-- Select the relevant shoot photos in Classic before invoking this command.
local LrApplication = import 'LrApplication'
local LrDialogs = import 'LrDialogs'
local LrTasks = import 'LrTasks'
local LrPathUtils = import 'LrPathUtils'

local function parseCSV(text)
  local rows, row, field, quoted, i = {}, {}, '', false, 1
  while i <= #text do
    local c = text:sub(i,i)
    if quoted then
      if c == '"' then
        if text:sub(i+1,i+1) == '"' then field = field .. '"'; i = i+1
        else quoted = false end
      else field = field .. c end
    elseif c == '"' then quoted = true
    elseif c == ',' then table.insert(row,field); field = ''
    elseif c == '\n' then table.insert(row,field); table.insert(rows,row); row={}; field=''
    elseif c ~= '\r' then field = field .. c end
    i=i+1
  end
  if quoted then error('CSV ends inside a quoted field.') end
  if field ~= '' or #row > 0 then table.insert(row,field); table.insert(rows,row) end
  return rows
end
local function stem(name) return string.lower((name:gsub('%.[^%.]+$',''))) end

LrTasks.startAsyncTask(function()
  local catalog = LrApplication.activeCatalog()
  local targets = catalog:getTargetPhotos()
  if #targets == 0 then LrDialogs.message('Select the shoot photographs first.','The bridge matches only against your selected photos.','info'); return end
  local paths = LrDialogs.runOpenPanel { title='Choose HAS-submitted-selects.csv', canChooseFiles=true, canChooseDirectories=false, allowsMultipleSelection=false, fileTypes={'csv'} }
  if not paths then return end
  local file = io.open(paths[1], 'rb')
  if not file then LrDialogs.message('Could not read CSV.',nil,'critical'); return end
  local text = file:read('*a'); file:close()
  local ok, rows = pcall(parseCSV,text)
  if not ok or #rows < 2 then LrDialogs.message('No submitted selections found.','Export submitted CSV from Studio after submitting pins.','warning'); return end
  local headers={};for n,h in ipairs(rows[1]) do headers[h]=n end
  if not headers['Reviewer'] or not headers['Filename'] or not headers['Submitted'] then LrDialogs.message('This is not a HAS selects CSV.',nil,'warning');return end
  local lookup={}
  for _,photo in ipairs(targets) do
    local path=photo:getRawMetadata('path')
    if path then local key=stem(LrPathUtils.leafName(path)); if lookup[key] then lookup[key]=false else lookup[key]=photo end end
  end
  -- Build a separate count so a third duplicate never becomes unique again.
  local counts={}
  for _,photo in ipairs(targets) do local path=photo:getRawMetadata('path');if path then local key=stem(LrPathUtils.leafName(path));counts[key]=(counts[key] or 0)+1 end end
  local groups, all, seen, missing, ambiguous = {}, {}, {}, 0, 0
  for n=2,#rows do
    local row=rows[n];local filename=row[headers['Filename']];local reviewer=row[headers['Reviewer']];local submitted=row[headers['Submitted']]
    if filename and reviewer and submitted and submitted~='' then
      local key=stem(filename);local photo=lookup[key]
      if (counts[key] or 0)>1 then ambiguous=ambiguous+1
      elseif not photo then missing=missing+1
      else
        groups[reviewer]=groups[reviewer] or {};table.insert(groups[reviewer],photo)
        if not seen[key] then table.insert(all,photo);seen[key]=true end
      end
    end
  end
  if #all==0 then LrDialogs.message('No unique source matches.',tostring(missing)..' missing; '..tostring(ambiguous)..' ambiguous. Export filenames must retain source stems.','warning');return end
  local result=LrDialogs.confirm('Create HAS selects collections?',tostring(#all)..' matched sources. '..tostring(missing)..' missing, '..tostring(ambiguous)..' ambiguous (skipped). Ratings and flags stay unchanged.','Create collections','Cancel')
  if result~='ok' then return end
  local label='HAS Selects '..os.date('%Y-%m-%d %H-%M-%S')
  catalog:withWriteAccessDo('Import HAS selects',function()
    local set=catalog:createCollectionSet(label,nil,true)
    local aggregate=catalog:createCollection('All submitted selects',set,true);aggregate:addPhotos(all)
    for reviewer,photos in pairs(groups) do
      local safe=reviewer:gsub('[/:\\]','-'):sub(1,100)
      local collection=catalog:createCollection(safe,set,true);collection:addPhotos(photos)
    end
  end)
  LrDialogs.message('HAS selects imported.',tostring(#all)..' sources added under '..label..'. '..tostring(missing)..' missing; '..tostring(ambiguous)..' ambiguous.','info')
end)
