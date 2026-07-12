# Lumen — Vercel Deployment Guide

This guide explains how to deploy Lumen to Vercel with a serverless architecture.

## Architecture Overview

**Vercel Deployment** replaces Docker Compose and local services with managed cloud solutions:

| Component | Docker | Vercel |
|-----------|--------|--------|
| **Web App** | `docker compose up web` | Vercel Functions + Static Export |
| **Database** | Local PostgreSQL | Neon (serverless PostgreSQL) |
| **Storage** | SFTP Storage Box | Vercel Blob |
| **Worker** | `docker compose up worker` | Vercel Cron (`/api/cron/process-jobs`) |

## Setup Steps

### 1. Create a Neon Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Get your connection string: `postgresql://user:password@host.neon.tech:5432/dbname`
4. Run migrations:
   ```bash
   DATABASE_URL="your_neon_connection_string" pnpm run migrate
   ```

### 2. Set Up Vercel Blob Storage

1. Create a new Vercel project or use an existing one
2. Go to **Storage → Blob**
3. Create a new Blob storage instance
4. Copy the `BLOB_READ_WRITE_TOKEN`

### 3. Generate Secret Keys

```bash
# Generate three 32-byte secrets
SESSION_SECRET=$(openssl rand -base64 32)
SHARE_SESSION_SECRET=$(openssl rand -base64 32)
ADMIN_API_KEY=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)

echo "SESSION_SECRET=$SESSION_SECRET"
echo "SHARE_SESSION_SECRET=$SHARE_SESSION_SECRET"
echo "ADMIN_API_KEY=$ADMIN_API_KEY"
echo "CRON_SECRET=$CRON_SECRET"
```

### 4. Create Admin User

Run locally or in a Vercel Function:

```bash
DATABASE_URL="your_neon_connection_string" pnpm run setup:admin
```

This creates an initial admin user (default: `admin@lumen.local` / `password`).

### 5. Configure Environment Variables in Vercel

In your Vercel project settings (**Settings → Environment Variables**), add:

```
DATABASE_URL=postgresql://user:password@host.neon.tech:5432/lumen
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
STORAGE_DRIVER=blob
SESSION_SECRET=<generated_secret>
SHARE_SESSION_SECRET=<generated_secret>
ADMIN_API_KEY=<generated_secret>
CRON_SECRET=<generated_secret>
NODE_ENV=production
```

### 6. Deploy to Vercel

```bash
# Using Vercel CLI
vercel deploy

# Or push to GitHub and enable Vercel auto-deployments
git push origin main
```

## How Vercel Cron Works

The `/api/cron/process-jobs` endpoint is called every 5 minutes (configurable in `vercel.json`).

**Job Flow:**
1. User uploads photos → job queued in `jobs` table
2. Cron triggers `/api/cron/process-jobs`
3. Processor fetches pending jobs from Neon
4. For each job:
   - Downloads asset from Vercel Blob
   - Processes (extract metadata, generate preview, CLIP indexing)
   - Uploads results back to Vercel Blob
   - Updates job status in Neon
5. Next cron cycle continues with remaining jobs

**Limitations:**
- Vercel Functions have a 60-second timeout
- Large files or heavy processing may need to be split across multiple cron cycles
- For production, consider Vercel's background functions or use a queue service (Bull, RabbitMQ)

## Storage Configuration

### Using Vercel Blob (Recommended)

No additional setup needed—just set `STORAGE_DRIVER=blob`.

### Using Hetzner Storage Box (Alternative)

If you prefer to keep Storage Box:

```env
STORAGE_DRIVER=sftp
STORAGE_HOST=uNNNNN.your-storagebox.de
STORAGE_PORT=23
STORAGE_USER=uNNNNN
STORAGE_PASSWORD=<your_password>
```

## Lightroom Plugin Configuration

1. Install the plugin: Download from `https://your-vercel-app.vercel.app/api/plugin/download`
2. In Lightroom, go to **File → Plugin Manager → Lumen Archive**
3. Configure:
   - **Server URL:** `https://your-vercel-app.vercel.app`
   - **API Key:** `<your_ADMIN_API_KEY>`
   - **Album ID:** (leave empty for automatic album selection)

## Troubleshooting

### Database Connection Issues

- Verify Neon database is running and accessible
- Check `DATABASE_URL` format: `postgresql://user:password@host.neon.tech:5432/db`
- Test locally: `psql your_connection_string -c "SELECT version();"`

### Blob Storage Errors

- Ensure `BLOB_READ_WRITE_TOKEN` is correct
- Check that the token has both read and write permissions
- For SFTP, verify STORAGE_HOST, STORAGE_USER, and STORAGE_PASSWORD

### Jobs Not Processing

- Check Vercel Logs: Dashboard → Project → **Deployments → Logs**
- Verify `CRON_SECRET` is set and matches what cron requests send
- Ensure cron job is enabled in `vercel.json`

## Performance Tips

1. **Enable automatic image optimization:** Vercel handles this via Next.js Image Optimization API
2. **Use regional databases:** Neon supports branching and read replicas
3. **Monitor Blob usage:** Vercel charges by storage and bandwidth
4. **Consider caching:** Set appropriate Cache-Control headers for static assets

## Rollback

To rollback a deployment:

```bash
# List deployments
vercel deployments

# Revert to a previous deployment
vercel rollback
```

## Next Steps

- Set up a custom domain (Vercel project settings → **Domains**)
- Configure analytics (Vercel dashboard → **Analytics**)
- Enable Vercel Observability to monitor function execution
- Consider adding CDN caching headers for gallery assets
