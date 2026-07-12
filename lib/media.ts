const rawExtensions = new Set(['dng', 'cr2', 'cr3', 'nef', 'arw', 'raf', 'orf', 'rw2'])

export function mediaTypeFor(name: string, mimeType: string) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  if (rawExtensions.has(extension)) return 'raw' as const
  if (mimeType.startsWith('video/')) return 'video' as const
  return 'image' as const
}

export function safeFilename(name: string) {
  return name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 180)
}
