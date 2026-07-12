local LrDialogs = import 'LrDialogs'
local LrHttp = import 'LrHttp'
local LrPathUtils = import 'LrPathUtils'
local LrView = import 'LrView'
local bind = LrView.bind

local provider = {}

provider.exportPresetFields = {
  { key = 'lumenUrl', default = 'https://photos.example.com' },
  { key = 'lumenApiKey', default = '' },
  { key = 'lumenAlbumId', default = '' },
}

function provider.sectionsForTopOfDialog(viewFactory, propertyTable)
  return {
    {
      title = 'Lumen kapcsolat',
      synopsis = bind 'lumenUrl',
      viewFactory:column {
        spacing = viewFactory:control_spacing(),
        viewFactory:row { viewFactory:static_text { title = 'Szerver URL', width = 100 }, viewFactory:edit_field { value = LrView.bind 'lumenUrl', width_in_chars = 35 } },
        viewFactory:row { viewFactory:static_text { title = 'API kulcs', width = 100 }, viewFactory:password_field { value = LrView.bind 'lumenApiKey', width_in_chars = 35 } },
        viewFactory:row { viewFactory:static_text { title = 'Album UUID', width = 100 }, viewFactory:edit_field { value = LrView.bind 'lumenAlbumId', width_in_chars = 35 } },
      },
    },
  }
end

function provider.processRenderedPhotos(functionContext, exportContext)
  local settings = exportContext.propertyTable
  local progress = exportContext:configureProgress { title = 'Publikálás a Lumen archívumba' }
  for _, rendition in exportContext:renditions { stopIfCanceled = true } do
    local success, pathOrMessage = rendition:waitForRender()
    if success then
      local file = io.open(pathOrMessage, 'rb')
      local body = file:read('*all')
      file:close()
      local headers = {
        { field = 'Content-Type', value = 'image/jpeg' },
        { field = 'X-File-Name', value = LrPathUtils.leafName(pathOrMessage) },
        { field = 'X-Album-Id', value = settings.lumenAlbumId },
        { field = 'Authorization', value = 'Bearer ' .. settings.lumenApiKey },
      }
      local _, responseHeaders = LrHttp.post(settings.lumenUrl .. '/api/uploads', body, headers)
      if not responseHeaders or tonumber(responseHeaders.status) >= 300 then rendition:uploadFailed('A Lumen szerver visszautasította a fájlt.') end
    else
      LrDialogs.message('Lumen export hiba', pathOrMessage, 'critical')
    end
    progress:setPortionComplete(_ - 1, exportContext.exportSession:countRenditions())
  end
end

return provider
