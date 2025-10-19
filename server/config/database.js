import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const dbPath = path.join(__dirname, '..', 'emoreco.db')
const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS spaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    person_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS analyses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    space_id INTEGER,
    audio_path TEXT,
    transcription TEXT NOT NULL,
    language TEXT,
    hume_emotions TEXT,
    primary_emotion TEXT NOT NULL,
    detailed_analysis TEXT NOT NULL,
    chat_history TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL
  );

  CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
  CREATE INDEX IF NOT EXISTS idx_analyses_space_id ON analyses(space_id);
  CREATE INDEX IF NOT EXISTS idx_spaces_user_id ON spaces(user_id);
`)

export default db
