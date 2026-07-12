# Lumen — Supabase + SFTP + Vercel Deployment Guide

This guide walks through deploying Lumen to Vercel with Supabase as the database and SFTP Storage Box for gallery storage.

## Prerequisites

1. **Vercel account** — https://vercel.com
2. **Supabase account** — https://supabase.com
3. **Hetzner Storage Box** (SFTP) — https://www.hetzner.com/storage/storage-box
4. **GitHub repository** — Your code should be in a GitHub repo for Vercel deployment

## Step 1: Set Up Supabase Project

### 1.1 Create a new Supabase project
- Go to https://app.supabase.com
- Click "New project"
- Choose your organization and region (preferably closest to your users)
- Set a strong database password

### 1.2 Get your API keys
Once the project is created:
- Go to **Settings > API**
- Copy your **Project URL** (this is `SUPABASE_URL`)
- Copy your **anon public** key (this is `SUPABASE_ANON_KEY`)
- Save these — you'll need them in Vercel settings

### 1.3 Create the database schema
- Go to **SQL Editor** in Supabase
- Click **New query**
- Copy the entire SQL from `/supabase/migrations/001_initial_schema.sql` in this repo
- Run the query
- Verify all tables are created (check **Table Editor**)

Alternative: Use Supabase CLI to apply migrations:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## Step 2: Set Up Hetzner Storage Box (SFTP)

If you already have SFTP access configured, skip to Step 3.

### 2.1 Create/access your Storage Box
- Log in to your Hetzner account
- Go to **Storage > Storage Boxes**
- Create a new Storage Box or use an existing one
- Note your:
  - **Host** — e.g., `uNNNNN.your-storagebox.de`
  - **Username** — e.g., `uNNNNN`
  - **Password** — your SFTP password

### 2.2 Create storage directories (optional)
You can pre-create these via SFTP client for organization:
```
/originals/   — full-resolution images
/previews/    — preview-size images
/thumbnails/  — thumbnail-size images
/archives/    — downloadable ZIP exports
```

## Step 3: Connect GitHub to Vercel

### 3.1 Push code to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/reflect-hu.git
git push -u origin main
```

### 3.2 Import project into Vercel
- Go to https://vercel.com/dashboard
- Click **Add New... > Project**
- Select your GitHub repository (`reflect-hu`)
- Click **Import**

### 3.3 Configure environment variables
In Vercel project settings, go to **Settings > Environment Variables** and add:

#### Database (Supabase)
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...your_anon_key...
```

#### Storage (SFTP)
```
STORAGE_DRIVER=sftp
STORAGE_HOST=uNNNNN.your-storagebox.de
STORAGE_PORT=23
STORAGE_USER=uNNNNN
STORAGE_PASSWORD=your_sftp_password
```

#### Authentication & Security
Generate these with `openssl rand -base64 32`:
```
SESSION_SECRET=your_random_32_byte_base64_string
SHARE_SESSION_SECRET=another_random_32_byte_base64_string
ADMIN_API_KEY=admin_api_key_random_string
CRON_SECRET=cron_secret_random_string
```

#### Optional: AI Indexing
```
# CLIP_MODEL=Xenova/clip-vit-base-patch32  (optional, for semantic search)
```

## Step 4: Deploy to Vercel

### 4.1 Trigger deployment
- In Vercel dashboard, click **Deploy**
- Or: push code to GitHub (`git push`) and Vercel auto-deploys
- Wait for build to complete (typically 2-3 minutes)

### 4.2 Create the first admin user
Once deployed, use the setup script via Vercel's serverless functions or locally:

**Option A: Local setup (before deploying to production)**
```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=eyJhbGc...
export STORAGE_DRIVER=sftp
export STORAGE_HOST=uNNNNN.your-storagebox.de
export STORAGE_PORT=23
export STORAGE_USER=uNNNNN
export STORAGE_PASSWORD=your_password

node scripts/setup-admin.mjs
```

**Option B: Via Supabase directly** (post-deployment)
- Go to Supabase **SQL Editor**
- Insert an admin user directly (see below)
- Then access `/login` on your Vercel domain

### 4.3 Insert first admin via SQL (if using Option B)
```sql
INSERT INTO users (email, password_hash, role) VALUES (
  'admin@example.com',
  '$2a$10$...bcrypt_hash_here...',  -- Use bcryptjs to generate this
  'admin'
);
```

To generate the bcrypt hash:
```bash
node -e "console.log(require('bcryptjs').hashSync('your_password', 10))"
```

## Step 5: Access Your App

- Navigate to your Vercel deployment URL (e.g., `https://lumen.vercel.app`)
- Go to `/login`
- Enter your admin email and password
- You're logged in!

## Troubleshooting

### Database Connection Errors
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are correct
- Check that Supabase project is active (not paused)
- Verify all tables were created in SQL Editor

### SFTP Connection Errors
- Test SFTP credentials manually: `sftp -P 23 uNNNNN@uNNNNN.your-storagebox.de`
- Ensure password is correct
- Check Hetzner console for active connections limit issues

### Cron Jobs Not Running
- Verify `CRON_SECRET` is set in Vercel
- Check Vercel Functions logs: Dashboard > Deployments > Cron
- Ensure `/api/cron/process-jobs` endpoint returns 200 OK

### Admin Login Fails
- Check that users table has at least one admin user
- Verify password hash is correct (bcryptjs format)
- Check browser console for error messages

## Next Steps

1. **Upload photos** — Use the admin dashboard to create albums and upload images
2. **Invite clients** — Create client records and generate share links
3. **Publish collections** — Create portfolio collections for public viewing
4. **Configure Lightroom** — Install and configure the Publish Service plugin

## Support

For issues, check:
- Vercel deployment logs: `vercel logs`
- Supabase project logs: **Logs** tab in Supabase dashboard
- SFTP connectivity via SSH client

## Additional Resources

- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Hetzner Storage Box Guide](https://docs.hetzner.cloud/storage/storage-box)
