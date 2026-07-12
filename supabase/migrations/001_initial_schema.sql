-- Lumen — Fotóarchívum és ügyfélgaléria | Supabase Schema Migration
-- Execute this in Supabase SQL Editor to create the complete database schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_token_idx ON sessions(token);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- Albums table
CREATE TABLE IF NOT EXISTS albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX albums_owner_idx ON albums(owner_id);
CREATE INDEX albums_status_idx ON albums(status);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX clients_admin_idx ON clients(admin_id);

-- Assets table
CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  filename text NOT NULL,
  mime_type text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video')),
  status text NOT NULL CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assets_album_idx ON assets(album_id);
CREATE INDEX assets_status_idx ON assets(status);

-- Asset files table
CREATE TABLE IF NOT EXISTS asset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant text NOT NULL CHECK (variant IN ('original', 'preview', 'thumbnail')),
  storage_key text NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  byte_size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX asset_files_variant_idx ON asset_files(asset_id, variant);
CREATE INDEX asset_files_asset_idx ON asset_files(asset_id);

-- Shares table
CREATE TABLE IF NOT EXISTS shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  share_token text UNIQUE NOT NULL,
  password_hash text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX shares_album_idx ON shares(album_id);
CREATE INDEX shares_client_idx ON shares(client_id);
CREATE INDEX shares_token_idx ON shares(share_token);

-- Jobs table (for background processing)
CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('ai_index', 'generate_thumbnail', 'export_archive')),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  data jsonb,
  error text,
  attempts integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_status_idx ON jobs(status);
CREATE INDEX jobs_type_idx ON jobs(type);
CREATE INDEX jobs_asset_idx ON jobs(asset_id);

-- Embeddings table (for CLIP semantic search)
CREATE TABLE IF NOT EXISTS embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE,
  model text NOT NULL,
  model_version text NOT NULL,
  embedding vector(512),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX embeddings_asset_idx ON embeddings(asset_id);

-- People table (for face recognition)
CREATE TABLE IF NOT EXISTS people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX people_album_idx ON people(album_id);

-- Faces table (detected faces with bounding boxes)
CREATE TABLE IF NOT EXISTS faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  embedding vector(128),
  bbox_x real,
  bbox_y real,
  bbox_width real,
  bbox_height real,
  confidence real,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX faces_asset_idx ON faces(asset_id);
CREATE INDEX faces_person_idx ON faces(person_id);

-- Portfolio collections (public-facing)
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX collections_user_slug_idx ON collections(user_id, slug);
CREATE INDEX collections_status_idx ON collections(status);

-- Collection items (albums in portfolio)
CREATE TABLE IF NOT EXISTS collection_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  position integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX collection_items_collection_idx ON collection_items(collection_id);
CREATE INDEX collection_items_album_idx ON collection_items(album_id);
