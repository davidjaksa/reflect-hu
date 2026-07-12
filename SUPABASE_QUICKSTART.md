# Lumen — Supabase + SFTP Quick Start (5 minutes)

## What's Changed

- **Database**: Now uses Supabase PostgreSQL (auto-scaling, built-in backups)
- **Storage**: Keeps SFTP Storage Box (no changes needed)
- **Deployment**: Ready for Vercel serverless + Cron jobs
- **Auth**: Custom HttpOnly sessions — no changes to login/admin flow

## Fastest Setup Path

### 1. Supabase Setup (2 min)
```bash
# Create project at https://supabase.com
# Copy these from Settings > API:
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=eyJhbGc...

# Run migrations in Supabase SQL Editor
# Paste content of: supabase/migrations/001_initial_schema.sql
```

### 2. Vercel Setup (2 min)
```bash
# Push code to GitHub
git push origin main

# In Vercel dashboard:
# 1. Import your repo
# 2. Add env variables (see SUPABASE_DEPLOYMENT.md)
# 3. Deploy
```

### 3. Create Admin (1 min)
```bash
# Locally (after setting env vars):
node scripts/setup-admin.mjs

# Or in Supabase SQL Editor, insert manually
```

## Required Environment Variables

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
STORAGE_DRIVER=sftp
STORAGE_HOST=uNNNNN.your-storagebox.de
STORAGE_PORT=23
STORAGE_USER=uNNNNN
STORAGE_PASSWORD=password
SESSION_SECRET=<openssl rand -base64 32>
SHARE_SESSION_SECRET=<openssl rand -base64 32>
ADMIN_API_KEY=<random string>
CRON_SECRET=<openssl rand -base64 32>
```

## Testing Locally

```bash
export SUPABASE_URL=...  # set your values
export SUPABASE_ANON_KEY=...
export STORAGE_DRIVER=sftp
export STORAGE_HOST=...
export STORAGE_PORT=23
export STORAGE_USER=...
export STORAGE_PASSWORD=...
export SESSION_SECRET=$(openssl rand -base64 32)
export SHARE_SESSION_SECRET=$(openssl rand -base64 32)

pnpm install
node scripts/setup-admin.mjs  # create first admin
pnpm dev  # start dev server
# Visit http://localhost:3000/login
```

## What Still Works

✅ Admin dashboard (Projekte, Ügyfelek, Személyek, Portfólió)  
✅ Client galleries (lightbox, ZIP download, password protection)  
✅ Lightroom Publish Service plugin  
✅ SFTP storage (no changes)  
✅ Rate limiting, HttpOnly sessions  
✅ CLIP semantic search (AI indexing)  
✅ Face detection admin UI  

## Next Steps

1. Read `SUPABASE_DEPLOYMENT.md` for detailed setup
2. Deploy to Vercel
3. Access your admin at `https://your-domain.vercel.app/login`

## Support

- **Database errors**: Check Supabase logs (Settings > Logs)
- **Storage errors**: Verify SFTP credentials with `sftp -P 23 user@host`
- **Deployment errors**: Check Vercel build logs (Deployments tab)

---

**Questions?** Review SUPABASE_DEPLOYMENT.md for complete troubleshooting.
