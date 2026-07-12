return {
  LrSdkVersion        = 13.0,
  LrSdkMinimumVersion = 6.0,
  LrToolkitIdentifier = 'hu.lumen.archive.publish',
  LrPluginName        = 'Lumen Archive',

  -- Legacy one-shot export (backward compat)
  LrExportServiceProvider = {
    title = 'Lumen Export',
    file  = 'LumenExportServiceProvider.lua',
  },

  -- Full Publish Service with two-way sync
  LrPublishServiceProvider = {
    title                      = 'Lumen Archive',
    file                       = 'LumenPublishServiceProvider.lua',
    supportsIncrementalPublish = 'only',
  },

  VERSION = { major = 0, minor = 2, revision = 0, build = 1 },
}
