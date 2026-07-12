import { createClient } from '@supabase/supabase-js'

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          role: 'admin' | 'client'
          created_at: string
        }
      }
      sessions: {
        Row: {
          id: string
          user_id: string
          token: string
          expires_at: string
          created_at: string
        }
      }
      albums: {
        Row: {
          id: string
          name: string
          description: string | null
          owner_id: string
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
      }
      clients: {
        Row: {
          id: string
          admin_id: string
          name: string
          email: string
          phone: string | null
          created_at: string
        }
      }
      assets: {
        Row: {
          id: string
          album_id: string
          filename: string
          mime_type: string
          media_type: 'image' | 'video'
          status: 'uploading' | 'processing' | 'ready' | 'failed'
          created_at: string
        }
      }
      asset_files: {
        Row: {
          id: string
          asset_id: string
          variant: 'original' | 'preview' | 'thumbnail'
          storage_key: string
          mime_type: string
          width: number | null
          height: number | null
          byte_size: number | null
          created_at: string
        }
      }
      shares: {
        Row: {
          id: string
          album_id: string
          client_id: string
          share_token: string
          password_hash: string | null
          expires_at: string | null
          created_at: string
        }
      }
      jobs: {
        Row: {
          id: string
          type: 'ai_index' | 'generate_thumbnail' | 'export_archive'
          asset_id: string | null
          status: 'pending' | 'processing' | 'completed' | 'failed'
          data: Record<string, unknown> | null
          error: string | null
          attempts: number
          created_at: string
          updated_at: string
        }
      }
      embeddings: {
        Row: {
          id: string
          asset_id: string
          model: string
          model_version: string
          embedding: number[] | null
          created_at: string
        }
      }
      people: {
        Row: {
          id: string
          album_id: string
          name: string
          created_at: string
        }
      }
      faces: {
        Row: {
          id: string
          asset_id: string
          person_id: string | null
          embedding: number[] | null
          bbox_x: number | null
          bbox_y: number | null
          bbox_width: number | null
          bbox_height: number | null
          confidence: number | null
          created_at: string
        }
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          description: string | null
          status: 'draft' | 'published'
          created_at: string
          updated_at: string
        }
      }
      collection_items: {
        Row: {
          id: string
          collection_id: string
          album_id: string
          position: number | null
          created_at: string
        }
      }
    }
  }
}

let supabaseClient: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_ANON_KEY

    if (!url || !key) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables')
    }

    supabaseClient = createClient<Database>(url, key)
  }

  return supabaseClient
}

// Export helper functions for common queries
export async function getUserByEmail(email: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }

  return data
}

export async function getSessionByToken(token: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from('sessions')
    .select('*, users:user_id(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows found
    throw error
  }

  return data
}

export async function createSession(userId: string, token: string, expiresAt: Date) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('sessions').insert({
    user_id: userId,
    token,
    expires_at: expiresAt.toISOString(),
  } as any)

  if (error) throw error
  return data
}

export async function deleteSession(token: string) {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from('sessions').delete().eq('token', token)
  if (error) throw error
}

export async function getAlbumsByUser(userId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('albums').select('*').eq('owner_id', userId)
  if (error) throw error
  return data || []
}

export async function getAlbumById(albumId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from('albums').select('*').eq('id', albumId).single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data
}
