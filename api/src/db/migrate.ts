import { db } from './index';
import { users, letters, bottles, chats, messages, checkins, streaks, reports, appVersions } from './schema/sqlite';
import { sql } from 'drizzle-orm';

/**
 * Run all schema migrations for SQLite development database.
 * Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS pattern.
 */
export async function migrate() {
  console.log('🗄️  Running SQLite migrations...');

  // SQLite doesn't support raw SQL DDL via Drizzle migrate easily with better-sqlite3
  // We use the Drizzle ORM push pattern for dev
  const sqliteDb = (db as any).session.client as import('better-sqlite3').Database;

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      device_id TEXT UNIQUE NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      email TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT,
      content TEXT NOT NULL,
      ai_reflection TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      sealed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY,
      letter_id TEXT UNIQUE NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'floating',
      risk_level TEXT,
      thrown_at TEXT NOT NULL DEFAULT (datetime('now')),
      caught_by TEXT REFERENCES users(id),
      caught_at TEXT,
      expires_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      bottle_id TEXT NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
      user_a TEXT NOT NULL REFERENCES users(id),
      user_b TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      deleted_at TEXT
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id),
      content TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question TEXT NOT NULL,
      response TEXT,
      voice_memo_local_ref TEXT,
      day_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_checkin_date TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      period_start TEXT,
      period_end TEXT,
      content TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_versions (
      id TEXT PRIMARY KEY,
      platform TEXT NOT NULL,
      latest_version TEXT NOT NULL,
      min_supported_version TEXT NOT NULL,
      force_update INTEGER NOT NULL DEFAULT 0,
      update_url TEXT NOT NULL,
      message_en TEXT,
      message_hi TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_letters_user_id ON letters(user_id);
    CREATE INDEX IF NOT EXISTS idx_letters_status ON letters(status);
    CREATE INDEX IF NOT EXISTS idx_bottles_status ON bottles(status);
    CREATE INDEX IF NOT EXISTS idx_chats_expires_at ON chats(expires_at);
    CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
    CREATE INDEX IF NOT EXISTS idx_checkins_user_id ON checkins(user_id);
  `);

  // Seed app_versions with initial data if empty
  const existing = sqliteDb.prepare("SELECT COUNT(*) as count FROM app_versions").get() as { count: number };
  if (existing.count === 0) {
    const { v4: uuidv4 } = await import('uuid');
    sqliteDb.exec(`
      INSERT INTO app_versions (id, platform, latest_version, min_supported_version, force_update, update_url, message_en, message_hi)
      VALUES
        ('${uuidv4()}', 'android', '1.0.0', '1.0.0', 0, 'https://play.google.com/store/apps/details?id=com.goalfinstech.khaali', 'A new version of Khaali is available.', 'Khaali का नया version उपलब्ध है।'),
        ('${uuidv4()}', 'ios', '1.0.0', '1.0.0', 0, 'https://apps.apple.com/app/khaali', 'A new version of Khaali is available.', 'Khaali का नया version उपलब्ध है।');
    `);
    console.log('✅ Seeded app_versions table');
  }

  console.log('✅ SQLite migrations complete');
}
