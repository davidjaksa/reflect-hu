import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { NextResponse } from 'next/server'

/**
 * GET /api/plugin/download
 * Streams the Lumen.lrplugin directory as a tar.gz archive.
 * Requires admin session (enforced by middleware).
 */
export async function GET() {
  try {
    const pluginDir = path.join(process.cwd(), 'integrations', 'lightroom', 'Lumen.lrplugin')

    // Build a simple tar in memory (no native deps needed for a handful of Lua files)
    const files = await readdir(pluginDir)
    const entries: Array<{ name: string; content: Buffer }> = []
    for (const file of files) {
      const content = await readFile(path.join(pluginDir, file))
      entries.push({ name: file, content })
    }

    // Build a POSIX ustar tar archive
    const blocks: Buffer[] = []
    for (const { name, content } of entries) {
      const header = buildTarHeader(`Lumen.lrplugin/${name}`, content.length)
      blocks.push(header)
      // File data, padded to 512-byte block boundary
      const padded = Math.ceil(content.length / 512) * 512
      const dataBlock = Buffer.alloc(padded)
      content.copy(dataBlock)
      blocks.push(dataBlock)
    }
    // Two 512-byte zero blocks mark end-of-archive
    blocks.push(Buffer.alloc(1024))

    const tar = Buffer.concat(blocks)

    return new NextResponse(tar, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-tar',
        'Content-Disposition': 'attachment; filename="Lumen.lrplugin.tar"',
        'Content-Length': String(tar.length),
      },
    })
  } catch (error) {
    console.error('[v0] Plugin download error:', error)
    return NextResponse.json({ error: 'Plugin csomag nem elérhető.' }, { status: 500 })
  }
}

function buildTarHeader(name: string, size: number): Buffer {
  const header = Buffer.alloc(512)
  const write = (offset: number, value: string, length: number) =>
    header.write(value.slice(0, length), offset, 'utf8')
  const writeOctal = (offset: number, value: number, length: number) =>
    header.write(value.toString(8).padStart(length - 1, '0') + '\0', offset, 'ascii')

  write(0, name, 100)            // name
  write(100, '0000644\0', 8)     // mode
  write(108, '0000000\0', 8)     // uid
  write(116, '0000000\0', 8)     // gid
  writeOctal(124, size, 12)      // size
  writeOctal(136, Math.floor(Date.now() / 1000), 12) // mtime
  header.fill(' ', 148, 156)     // checksum placeholder
  write(156, '0', 1)             // type: regular file
  write(265, 'ustar  \0', 8)     // magic

  // Compute checksum
  let checksum = 0
  for (let i = 0; i < 512; i++) checksum += header[i]
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 'ascii')

  return header
}
