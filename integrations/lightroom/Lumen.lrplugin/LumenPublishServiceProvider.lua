--[[
  Lumen Publish Service Provider for Lightroom Classic 6+
  Provides two-way sync: upload new/changed photos and track remote state.
--]]

local LrDialogs   = import 'LrDialogs'
local LrHttp      = import 'LrHttp'
local LrPathUtils = import 'LrPathUtils'
local LrView      = import 'LrView'
local LrTasks     = import 'LrTasks'

local bind = LrView.bind

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

local function apiPost(baseUrl, apiKey, path, body, mimeType)
  local headers = {
    { field = 'Authorization', value = 'Bearer ' .. apiKey },
    { field = 'Content-Type',  value = mimeType or 'application/octet-stream' },
  }
  local result, responseHeaders = LrHttp.post(baseUrl .. path, body, headers)
  local status = responseHeaders and tonumber(responseHeaders.status) or 0
  return result, status
end

local function apiGet(baseUrl, apiKey, path)
  local headers = {
    { field = 'Authorization', value = 'Bearer ' .. apiKey },
  }
  local result, responseHeaders = LrHttp.get(baseUrl .. path, headers)
  local status = responseHeaders and tonumber(responseHeaders.status) or 0
  return result, status
end

-- ---------------------------------------------------------------------------
-- Provider definition
-- ---------------------------------------------------------------------------

local provider = {}

provider.small_icon         = 'lumen_icon.png'
provider.publish_fallbackNameBinding = 'fullName'

provider.exportPresetFields = {
  { key = 'lumenUrl',     default = 'https://photos.example.com' },
  { key = 'lumenApiKey',  default = '' },
  { key = 'lumenAlbumId', default = '' },
}

-- ---------------------------------------------------------------------------
-- Settings UI
-- ---------------------------------------------------------------------------

function provider.sectionsForTopOfDialog(viewFactory, propertyTable)
  local vf = viewFactory
  return {
    {
      title    = 'Lumen szerver',
      synopsis = bind 'lumenUrl',
      vf:column {
        spacing = vf:control_spacing(),
        vf:row {
          vf:static_text { title = 'Szerver URL', width = 110 },
          vf:edit_field   { value = bind 'lumenUrl',    width_in_chars = 38 },
        },
        vf:row {
          vf:static_text  { title = 'API kulcs', width = 110 },
          vf:password_field { value = bind 'lumenApiKey', width_in_chars = 38 },
        },
        vf:row {
          vf:static_text { title = 'Album UUID', width = 110 },
          vf:edit_field   { value = bind 'lumenAlbumId', width_in_chars = 38 },
        },
        vf:row {
          vf:push_button {
            title  = 'Kapcsolat tesztelése',
            action = function()
              local result, status = apiGet(
                propertyTable.lumenUrl, propertyTable.lumenApiKey, '/api/health'
              )
              if status == 200 then
                LrDialogs.message('Lumen', 'Kapcsolat sikeres.', 'info')
              else
                LrDialogs.message('Lumen', 'Nem sikerult csatlakozni. Ellenorizd az URL-t es az API kulcsot. (HTTP ' .. status .. ')', 'critical')
              end
            end,
          },
        },
      },
    },
  }
end

-- ---------------------------------------------------------------------------
-- Photo rendering options (used by both export and publish)
-- ---------------------------------------------------------------------------

provider.allowFileFormats = { 'JPEG' }
provider.allowColorSpaces = { 'sRGB' }
provider.canExportVideo   = false

function provider.updateExportSettings(exportSettings)
  exportSettings.LR_format          = 'JPEG'
  exportSettings.LR_jpeg_quality    = 90
  exportSettings.LR_minimizeEmbeddedMetadata = false
  exportSettings.LR_embedColorProfile = true
  exportSettings.LR_export_colorSpace = 'sRGB'
  exportSettings.LR_size_doConstrain  = false
end

-- ---------------------------------------------------------------------------
-- Publish: upload new / changed photos
-- ---------------------------------------------------------------------------

function provider.processRenderedPhotos(functionContext, exportContext)
  local settings = exportContext.propertyTable
  local baseUrl  = settings.lumenUrl
  local apiKey   = settings.lumenApiKey
  local albumId  = settings.lumenAlbumId

  if albumId == '' then
    LrDialogs.message('Lumen', 'Allitsd be az Album UUID-t a Publish Service beallitasaiban.', 'critical')
    return
  end

  local nPhotos = exportContext.exportSession:countRenditions()
  local progress = exportContext:configureProgress {
    title = string.format('Publikalas a Lumenbe (%d foto)...', nPhotos),
  }

  local idx = 0
  for _, rendition in exportContext:renditions { stopIfCanceled = true } do
    idx = idx + 1
    local success, pathOrMessage = rendition:waitForRender()

    if success then
      local file     = io.open(pathOrMessage, 'rb')
      local body     = file:read('*all')
      file:close()

      local filename = LrPathUtils.leafName(pathOrMessage)
      local path     = string.format('/api/uploads?albumId=%s', albumId)

      -- Inject X-File-Name and X-Album-Id for the server
      local headers = {
        { field = 'Authorization', value = 'Bearer ' .. apiKey },
        { field = 'Content-Type',  value = 'image/jpeg' },
        { field = 'X-File-Name',   value = filename },
        { field = 'X-Album-Id',    value = albumId },
      }

      local result, responseHeaders = LrHttp.post(baseUrl .. '/api/uploads', body, headers)
      local status = responseHeaders and tonumber(responseHeaders.status) or 0

      if status >= 200 and status < 300 then
        -- Store the remote asset ID so Lightroom can track edits/deletions
        -- (result is expected to be JSON: {"id":"...","status":"queued"})
        rendition:recordPublishedPhotoId(filename)
        rendition:recordPublishedPhotoUrl(
          string.format('%s/api/media/%s', baseUrl, filename)
        )
      else
        rendition:uploadFailed(
          string.format('A Lumen szerver visszautasitotta a fajlt (HTTP %d).', status)
        )
      end
    else
      rendition:uploadFailed(pathOrMessage)
    end

    progress:setPortionComplete(idx, nPhotos)
  end
end

-- ---------------------------------------------------------------------------
-- Publish: delete photos removed from the published collection
-- ---------------------------------------------------------------------------

function provider.deletePhotosFromPublishedCollection(publishSettings, arrayOfPhotoIds, deletedCallback)
  -- arrayOfPhotoIds contains the publishedPhotoId strings we stored above.
  -- We map each filename back to an asset via the search API.
  for _, photoId in ipairs(arrayOfPhotoIds) do
    local path   = string.format('/api/assets?filename=%s', LrHttp.encodeForQuery(photoId))
    local result, status = apiGet(publishSettings.lumenUrl, publishSettings.lumenApiKey, path)
    if status == 200 and result then
      -- Simple JSON parse for the first id field
      local assetId = result:match('"id"%s*:%s*"([^"]+)"')
      if assetId then
        apiPost(
          publishSettings.lumenUrl,
          publishSettings.lumenApiKey,
          string.format('/api/assets/%s', assetId),
          '',
          'application/json'
        )
      end
    end
    deletedCallback(photoId)
  end
end

-- ---------------------------------------------------------------------------
-- Publish: check whether remote photos are up to date
-- ---------------------------------------------------------------------------

function provider.getCommentsFromPublishedCollection(publishSettings, publishedCollection, commentCallback)
  -- No comments feature; this is a no-op stub required by the SDK.
end

return provider
