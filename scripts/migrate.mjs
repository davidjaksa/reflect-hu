/**
 * scripts/migrate.mjs
 *
 * Egyszeri adatbázis-inicializálás: létrehozza az összes táblát és indexet
 * az init.sql fájl alapján, ha még nem léteznek.
 *
 * Futtatás: node scripts/migrate.mjs
 *
 * Szükséges env változók: DATABASE_URL
 */

import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const sqlPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '../database/init.sql',
)

async function main() {
  console.log('Migrálás elindítva…')

  // Enable pgvector extension first (requires superuser or rds_superuser)
  try {
    await pool.query("CREATE EXTENSION IF NOT EXISTS vector")
    console.log('  pgvector extension: OK')
  } catch (err) {
    console.warn('  pgvector extension: figyelmeztetés —', err.message)
    console.warn('  Folytassuk a többi migrációval…')
  }

  const sql = await readFile(sqlPath, 'utf8')

  // Split on semicolons at end-of-statement (skip pgvector CREATE EXTENSION line,
  // already handled above)
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.toLowerCase().startsWith('create extension'))

  let ok = 0
  let skipped = 0

  for (const statement of statements) {
    try {
      await pool.query(statement)
      ok++
    } catch (err) {
      if (err.code === '42P07' /* duplicate_table */ || err.code === '42710' /* duplicate_object */) {
        skipped++
      } else {
        console.error('\nHiba a következő utasításnál:\n', statement.slice(0, 200))
        console.error('PostgreSQL hiba:', err.message)
        await pool.end()
        process.exit(1)
      }
    }
  }

  console.log(`Kész. Végrehajtott: ${ok}, Már meglévő (kihagyva): ${skipped}`)
  await pool.end()
}

main().catch((err) => {
  console.error('Végzetes hiba:', err.message)
  process.exit(1)
})
