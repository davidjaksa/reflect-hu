CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'client')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_token_idx ON sessions(token);
CREATE INDEX sessions_user_idx ON sessions(user_id);

CREATE TABLE portfolio_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  cover_asset_id uuid,
  sort_order int NOT NULL DEFAULT 0,
  published bool NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES portfolio_collections(id) ON DELETE CASCADE,
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  alt_text text,
  caption text,
  UNIQUE (collection_id, asset_id)
);

CREATE INDEX portfolio_items_collection_idx ON portfolio_items(collection_id);

CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE REFERENCES users(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE albums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'client', 'public')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid REFERENCES albums(id) ON DELETE SET NULL,
  media_type text NOT NULL CHECK (media_type IN ('image', 'video', 'raw')),
  original_name text NOT NULL,
  storage_key text UNIQUE NOT NULL,
  sha256 text NOT NULL,
  mime_type text NOT NULL,
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  status text NOT NULL DEFAULT 'uploaded',
  captured_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}',
  search_text tsvector GENERATED ALWAYS AS (to_tsvector('simple', coalesce(original_name, '') || ' ' || coalesce(metadata::text, ''))) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX assets_album_idx ON assets(album_id);
CREATE INDEX assets_search_idx ON assets USING gin(search_text);

CREATE TABLE asset_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  variant text NOT NULL,
  storage_key text UNIQUE NOT NULL,
  mime_type text NOT NULL,
  width integer,
  height integer,
  byte_size bigint NOT NULL,
  UNIQUE(asset_id, variant)
);

CREATE TABLE embeddings (
  asset_id uuid PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  model text NOT NULL,
  model_version text NOT NULL,
  embedding vector(512) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX embeddings_cosine_idx ON embeddings USING hnsw (embedding vector_cosine_ops);

CREATE TABLE people (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  cover_asset_id uuid REFERENCES assets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE faces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  person_id uuid REFERENCES people(id) ON DELETE SET NULL,
  box jsonb NOT NULL,
  embedding vector(512),
  confidence real NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX faces_asset_idx ON faces(asset_id);
CREATE INDEX faces_person_idx ON faces(person_id);
CREATE INDEX faces_embedding_idx ON faces USING hnsw (embedding vector_cosine_ops);

CREATE TABLE share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id uuid NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  password_hash text,
  allow_download boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id uuid REFERENCES assets(id) ON DELETE CASCADE,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  priority integer NOT NULL DEFAULT 100,
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  locked_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX jobs_queue_idx ON jobs(status, priority, available_at);
