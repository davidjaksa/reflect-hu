const intervalMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000)

console.log('[lumen-worker] Media worker started')

const timer = setInterval(() => {
  // The production implementation claims queued PostgreSQL jobs here with
  // SELECT ... FOR UPDATE SKIP LOCKED, then runs the idempotent media pipeline.
}, intervalMs)

timer.unref()

process.on('SIGTERM', () => {
  clearInterval(timer)
  process.exit(0)
})

await new Promise(() => {})
