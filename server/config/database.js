import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
})

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS spaces (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      person_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS analyses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      space_id INTEGER REFERENCES spaces(id) ON DELETE SET NULL,
      audio_path TEXT,
      transcription TEXT NOT NULL,
      language TEXT,
      hume_emotions TEXT,
      primary_emotion TEXT NOT NULL,
      detailed_analysis TEXT NOT NULL,
      chat_history TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    )
  `)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_analyses_space_id ON analyses(space_id)`)
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id)`)
}

export function query(text, params) {
  const pgText = toPositional(text)
  return pool.query(pgText, params)
}

export async function getOne(text, params) {
  const result = await query(text, params)
  return result.rows[0] || null
}

export async function getAll(text, params) {
  const result = await query(text, params)
  return result.rows
}

export async function run(text, params) {
  const pgText = toPositional(text)
  const returningText = /^\s*INSERT/i.test(pgText)
    ? pgText + ' RETURNING id'
    : pgText
  const result = await pool.query(returningText, params)
  return { lastInsertRowid: result.rows[0]?.id ?? null, changes: result.rowCount }
}

function toPositional(sql) {
  let i = 0
  return sql.replace(/\?/g, () => `$${++i}`)
}

export default pool
