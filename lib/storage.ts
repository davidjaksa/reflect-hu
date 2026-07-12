import { createReadStream } from 'node:fs'
import { mkdir, readFile, rename } from 'node:fs/promises'
import path from 'node:path'
import SftpClient from 'ssh2-sftp-client'

export interface StorageAdapter {
  putFile(localPath: string, storageKey: string): Promise<void>
  getBuffer(storageKey: string): Promise<Buffer>
}

function safeKey(storageKey: string) {
  const normalized = path.posix.normalize(`/${storageKey}`).slice(1)
  if (!normalized || normalized.startsWith('..')) throw new Error('Érvénytelen storage kulcs')
  return normalized
}

class SftpStorage implements StorageAdapter {
  async getBuffer(storageKey: string) {
    const client = new SftpClient()
    try {
      await client.connect({
        host: process.env.STORAGE_HOST,
        port: Number(process.env.STORAGE_PORT ?? 23),
        username: process.env.STORAGE_USER,
        password: process.env.STORAGE_PASSWORD,
        readyTimeout: 20_000,
      })
      const result = await client.get(`/${safeKey(storageKey)}`)
      if (!Buffer.isBuffer(result)) throw new Error('A távoli fájl nem olvasható.')
      return result
    } finally {
      await client.end().catch(() => undefined)
    }
  }

  async putFile(localPath: string, storageKey: string) {
    const client = new SftpClient()
    const key = safeKey(storageKey)
    const remotePath = `/${key}`
    try {
      await client.connect({
        host: process.env.STORAGE_HOST,
        port: Number(process.env.STORAGE_PORT ?? 23),
        username: process.env.STORAGE_USER,
        password: process.env.STORAGE_PASSWORD,
        readyTimeout: 20_000,
      })
      await client.mkdir(path.posix.dirname(remotePath), true)
      await client.put(createReadStream(localPath), remotePath)
    } finally {
      await client.end().catch(() => undefined)
    }
  }
}

class MountedStorage implements StorageAdapter {
  async getBuffer(storageKey: string) {
    const root = process.env.STORAGE_MOUNT_PATH ?? '/storage'
    return readFile(path.join(root, safeKey(storageKey)))
  }

  async putFile(localPath: string, storageKey: string) {
    const root = process.env.STORAGE_MOUNT_PATH ?? '/storage'
    const destination = path.join(root, safeKey(storageKey))
    await mkdir(path.dirname(destination), { recursive: true })
    await rename(localPath, destination)
  }
}

export function getStorage(): StorageAdapter {
  if (process.env.STORAGE_DRIVER === 'mount') return new MountedStorage()
  // Default to SFTP (Hetzner Storage Box)
  return new SftpStorage()
}
