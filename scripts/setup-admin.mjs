/**
 * scripts/setup-admin.mjs
 *
 * Első admin felhasználó létrehozása az adatbázisban.
 * Futtatás: node scripts/setup-admin.mjs
 *
 * Szükséges env változók: DATABASE_URL
 */

import readline from 'node:readline'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, resolve))
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })

  console.log('\n--- Lumen: Admin felhasználó létrehozása ---\n')

  const email = (await ask(rl, 'E-mail cím: ')).trim().toLowerCase()
  if (!email || !email.includes('@')) {
    console.error('Érvénytelen e-mail cím.')
    process.exit(1)
  }

  const password = await ask(rl, 'Jelszó (min. 12 karakter): ')
  if (password.length < 12) {
    console.error('A jelszónak legalább 12 karakternek kell lennie.')
    process.exit(1)
  }

  rl.close()

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email])
  if (existing.rows.length > 0) {
    console.error(`Ez az e-mail már szerepel az adatbázisban: ${email}`)
    await pool.end()
    process.exit(1)
  }

  const hash = await bcrypt.hash(password, 12)
  const id = randomUUID()
  await pool.query(
    `INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, 'admin')`,
    [id, email, hash],
  )

  console.log(`\nAdmin sikeresen létrehozva:\n  ID:    ${id}\n  Email: ${email}\n`)
  await pool.end()
}

main().catch((err) => {
  console.error('Hiba:', err.message)
  process.exit(1)
})
