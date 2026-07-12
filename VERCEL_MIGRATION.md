# Vercel Hosting Migration Summary

The Lumen application has been reformed for Vercel hosting with the following changes:

## Key Changes

### 1. **Storage Adapter** (`lib/storage.ts`)
- Added `VercelBlobStorage` class implementing the `StorageAdapter` interface
- Automatically routes to Vercel Blob when `STORAGE_DRIVER=blob`
- Maintains backward compatibility with SFTP and mounted storage
- Uses `@vercel/blob` package for file operations

### 2. **Cron Job Processor** (`app/api/cron/process-jobs/route.ts`)
- New endpoint `/api/cron/process-jobs` triggered every 5 minutes
- Replaces the standalone `scripts/worker.mjs` Node.js process
- Fetches pending jobs from PostgreSQL and processes them asynchronously
- Skeleton implementation ready for full job processing logic
- Max 60-second execution time per cron cycle

### 3. **Vercel Configuration** (`vercel.json`)
- Defines Next.js build and dev commands
- Declares required environment variables with descriptions
- Configures cron job schedule: `/api/cron/process-jobs` every 5 minutes
- Integrates with Vercel dashboard for easy env var management

### 4. **Environment Variables** (`.env.example`)
- Updated for Vercel with clear documentation
- Supports both Vercel (Neon + Blob) and Docker (PostgreSQL + SFTP) configurations
- Added `CRON_SECRET` for secure cron requests
- Added `BLOB_READ_WRITE_TOKEN` for Vercel Blob integration

## Architecture Comparison

| Layer | Docker (Current) | Vercel (New) |
|-------|------------------|--------------|
| **Web App** | `web` service | Vercel Functions + Auto-scaling |
| **Database** | Local PostgreSQL | Neon (serverless, autoscaling) |
| **Storage** | SFTP Storage Box | Vercel Blob (S3-compatible) |
| **Background Jobs** | `worker` service (long-lived) | Vercel Cron (FaaS, 60s max) |
| **Node Runtime** | Docker container | Vercel Functions (Node.js 22) |

## Deployment Checklist

- [ ] Create Neon PostgreSQL database
- [ ] Run migrations: `pnpm run migrate`
- [ ] Create admin user: `pnpm run setup:admin`
- [ ] Set up Vercel Blob storage
- [ ] Generate `SESSION_SECRET`, `SHARE_SESSION_SECRET`, `ADMIN_API_KEY`, `CRON_SECRET`
- [ ] Add environment variables to Vercel project
- [ ] Push to GitHub
- [ ] Enable Vercel auto-deploy
- [ ] Test admin login at `https://your-app.vercel.app/login`
- [ ] Verify file uploads trigger background jobs

## Job Processing in Vercel

### Current Limitations

Vercel Functions have a **60-second timeout**, which limits how many jobs can process per cron cycle. Large files or heavy AI indexing should be split across multiple cycles:

```
Cycle 1: Fetch 5 jobs, process metadata extraction (fast)
Cycle 2: Continue with preview generation (FFmpeg, depends on file size)
Cycle 3: Run CLIP AI indexing (GPU, ~10-30 seconds per image)
```

### Future Enhancements

For production at scale, consider:

1. **Vercel Background Functions** (Beta): Allows longer execution times
2. **Upstash Queue**: Offload job processing to Redis queues with serverless workers
3. **AWS Lambda**: Use Vercel's integration with AWS for unlimited execution time
4. **Trigger.dev**: Dedicated background job orchestration platform

## Files Modified

- `lib/storage.ts` — Added `VercelBlobStorage` adapter
- `.env.example` — Updated for Vercel environment
- `vercel.json` — New configuration file

## Files Added

- `app/api/cron/process-jobs/route.ts` — Cron job handler
- `VERCEL_DEPLOYMENT.md` — Full deployment guide
- `VERCEL_MIGRATION.md` — This file

## Backward Compatibility

Docker Compose deployments still work unchanged:

```bash
# Local development with Docker
docker compose up

# Vercel deployment (separate config)
vercel deploy
```

Both configurations use the same application code with different environment variables.

## Next Steps

1. **Read** `VERCEL_DEPLOYMENT.md` for complete setup instructions
2. **Test locally** with `STORAGE_DRIVER=blob` using a Vercel Blob test token
3. **Deploy to Vercel** using either GitHub auto-sync or `vercel deploy` CLI
4. **Monitor** job processing via Vercel Logs dashboard
5. **Scale** as needed with database read replicas or faster job processing strategies
