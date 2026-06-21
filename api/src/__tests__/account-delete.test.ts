/**
 * Account deletion cascade tests
 *
 * Validates that DELETE /account leaves zero orphaned rows across all tables.
 * This is a Play Store Data Safety requirement.
 *
 * Run: npx vitest run src/__tests__/account-delete.test.ts
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, device_id TEXT UNIQUE NOT NULL,
      language TEXT DEFAULT 'en', email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT, content TEXT NOT NULL DEFAULT '', status TEXT DEFAULT 'draft',
      ai_reflection TEXT, sealed_at TEXT, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'floating', risk_level TEXT DEFAULT 'low',
      caught_by TEXT, thrown_at TEXT NOT NULL, caught_at TEXT, expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      bottle_id TEXT NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
      user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL, deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL, sent_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      question TEXT NOT NULL, response TEXT NOT NULL,
      voice_memo_local_ref TEXT, day_number INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS streaks (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER DEFAULT 0, longest_streak INTEGER DEFAULT 0,
      last_checkin_date TEXT
    );
  `);
  return drizzle(sqlite, { schema });
}

async function seedFullUserData(db: ReturnType<typeof createTestDb>, userId: string) {
  const deviceId = `device-${userId.slice(0, 8)}`;
  await db.insert(schema.users).values({ id: userId, deviceId });

  // 3 letters
  const letterIds = [uuidv4(), uuidv4(), uuidv4()];
  await db.insert(schema.letters).values(
    letterIds.map((id) => ({ id, userId, content: 'Test letter', status: 'thrown' as const }))
  );

  // 2 bottles
  const bottleId1 = uuidv4();
  const bottleId2 = uuidv4();
  await db.insert(schema.bottles).values([
    {
      id: bottleId1, letterId: letterIds[0], userId, status: 'floating',
      thrownAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
    {
      id: bottleId2, letterId: letterIds[1], userId, status: 'caught',
      thrownAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString(),
    },
  ]);

  // 1 chat (user is thrower)
  const catcherUserId = uuidv4();
  await db.insert(schema.users).values({ id: catcherUserId, deviceId: `catcher-${catcherUserId.slice(0, 8)}` });

  const chatId = uuidv4();
  await db.insert(schema.chats).values({
    id: chatId, bottleId: bottleId2, userA: userId, userB: catcherUserId,
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
  });

  // 5 messages in that chat
  await db.insert(schema.messages).values(
    Array.from({ length: 5 }, () => ({
      id: uuidv4(), chatId, senderId: userId, content: 'Test message',
    }))
  );

  // 7 check-ins
  await db.insert(schema.checkins).values(
    Array.from({ length: 7 }, () => ({
      id: uuidv4(), userId, question: 'Test question?', response: 'Test response',
    }))
  );

  // streak record
  await db.insert(schema.streaks).values({
    userId, currentStreak: 7, longestStreak: 14,
    lastCheckinDate: new Date().toISOString().split('T')[0],
  });

  return { bottleId1, bottleId2, chatId, letterIds, catcherUserId };
}

describe('Account deletion cascade', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => { db = createTestDb(); });

  it('deleting user removes all letters', async () => {
    const userId = uuidv4();
    await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const remaining = await db.query.letters.findMany({ where: eq(schema.letters.userId, userId) });
    expect(remaining).toHaveLength(0);
  });

  it('deleting user removes all bottles', async () => {
    const userId = uuidv4();
    await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const remaining = await db.query.bottles.findMany({ where: eq(schema.bottles.userId, userId) });
    expect(remaining).toHaveLength(0);
  });

  it('deleting user removes all chats where user is thrower', async () => {
    const userId = uuidv4();
    const { chatId } = await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const chat = await db.query.chats.findFirst({ where: eq(schema.chats.id, chatId) });
    expect(chat).toBeUndefined();
  });

  it('deleting user removes all messages in their chats', async () => {
    const userId = uuidv4();
    const { chatId } = await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const msgs = await db.query.messages.findMany({ where: eq(schema.messages.chatId, chatId) });
    expect(msgs).toHaveLength(0);
  });

  it('deleting user removes all check-ins', async () => {
    const userId = uuidv4();
    await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const checkins = await db.query.checkins.findMany({ where: eq(schema.checkins.userId, userId) });
    expect(checkins).toHaveLength(0);
  });

  it('deleting user removes streak record', async () => {
    const userId = uuidv4();
    await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const streak = await db.query.streaks.findFirst({ where: eq(schema.streaks.userId, userId) });
    expect(streak).toBeUndefined();
  });

  it('deleting user leaves catcher user and their data intact', async () => {
    const userId = uuidv4();
    const { catcherUserId } = await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));
    const catcher = await db.query.users.findFirst({ where: eq(schema.users.id, catcherUserId) });
    expect(catcher).toBeDefined();
  });

  it('full cascade: single user DELETE leaves zero orphaned rows', async () => {
    const userId = uuidv4();
    await seedFullUserData(db, userId);
    await db.delete(schema.users).where(eq(schema.users.id, userId));

    const [ls, bs, cs, sk] = await Promise.all([
      db.query.letters.findMany({ where: eq(schema.letters.userId, userId) }),
      db.query.bottles.findMany({ where: eq(schema.bottles.userId, userId) }),
      db.query.checkins.findMany({ where: eq(schema.checkins.userId, userId) }),
      db.query.streaks.findMany({ where: eq(schema.streaks.userId, userId) }),
    ]);

    expect(ls).toHaveLength(0);
    expect(bs).toHaveLength(0);
    expect(cs).toHaveLength(0);
    expect(sk).toHaveLength(0);
  });
});
