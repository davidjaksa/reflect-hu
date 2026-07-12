# Vercel Quick Start

## 1. Prerequisites

- GitHub account with this repo pushed
- Vercel account (free tier OK)
- Neon account for PostgreSQL

## 2. Create & Configure Vercel Project

```bash
# Option A: GitHub auto-integration (recommended)
# Push to GitHub, then go to vercel.com and import your repo

# Option B: Vercel CLI
vercel deploy
```

## 3. Set Up Neon Database

```bash
# 1. Go to neon.tech and create a project
# 2. Copy the connection string

# 3. Run migrations (locally or via Vercel CLI)
export DATABASE_URL="postgresql://user:pass@host:5432/lumen"
pnpm run migrate

# 4. Create admin user
pnpm run setup:admin
```

## 4. Generate Secrets

```bash
openssl rand -base64 32 > SESSION_SECRET
openssl rand -base64 32 > SHARE_SESSION_SECRET
openssl rand -base64 32 > ADMIN_API_KEY
openssl rand -base64 32 > CRON_SECRET
```

## 5. Add Vercel Blob Storage

Go to **Vercel Dashboard → Storage → Blob** and create a new storage instance. Copy the token.

## 6. Set Environment Variables in Vercel

Go to **Project Settings → Environment Variables** and add:

```
DATABASE_URL=postgresql://...
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_...
STORAGE_DRIVER=blob
SESSION_SECRET=<from step 4>
SHARE_SESSION_SECRET=<from step 4>
ADMIN_API_KEY=<from step 4>
CRON_SECRET=<from step 4>
NODE_ENV=production
```

## 7. Deploy

```bash
git push origin main  # If using GitHub auto-deploy
# OR
vercel deploy --prod
```

## 8. Test

1. Open `https://your-app.vercel.app/login`
2. Log in with `admin@lumen.local` and the password you set
3. Try uploading a photo
4. Check Vercel Logs for cron job execution

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Database connection refused" | Check `DATABASE_URL` format, ensure Neon is running |
| "Blob token invalid" | Verify `BLOB_READ_WRITE_TOKEN` in Vercel dashboard |
| "Jobs not processing" | Check `/api/cron/process-jobs` in Vercel Logs, verify `CRON_SECRET` |
| "Upload fails" | Ensure `STORAGE_DRIVER=blob` is set |

## Useful Commands

```bash
# View Vercel logs
vercel logs

# Redeploy
vercel deploy --prod

# Open project
vercel open

# List deployments
vercel deployments

# Rollback
vercel rollback
```

## Storage Options

| Option | Speed | Cost | Best For |
|--------|-------|------|----------|
| **Vercel Blob** | Very Fast | Pay-as-you-go | Vercel deployments |
| **Storage Box** | Moderate | Fixed monthly | Self-hosted + Vercel |
| **Docker volumes** | Fastest | Free | Local dev only |

**Recommendation for Vercel:** Use Vercel Blob (it's designed for Vercel and has no egress costs within Vercel ecosystem).

## Full Documentation

See `VERCEL_DEPLOYMENT.md` for complete setup and troubleshooting guide.
