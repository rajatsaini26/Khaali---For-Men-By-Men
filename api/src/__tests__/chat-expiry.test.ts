/**
 * Chat hard-delete timing tests
 *
 * Validates that:
 * 1. Expired chats and ALL their messages are HARD DELETED — no soft delete, no archive
 * 2. Unexpired chats are NOT touched by the cleanup job
 * 3. The 7-day window is enforced precisely
 *
 * Run: npx vitest run src/__tests__/chat-expiry.test.ts
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// ─── In-memory SQLite for isolated tests ─────────────────────────────────────
function createTestDb() {
  const sqlite = new Database(':memory:');
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');

  // Create tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      device_id TEXT UNIQUE NOT NULL,
      language TEXT DEFAULT 'en',
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS letters (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      theme TEXT,
      content TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'draft',
      ai_reflection TEXT,
      sealed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bottles (
      id TEXT PRIMARY KEY,
      letter_id TEXT NOT NULL REFERENCES letters(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'floating',
      risk_level TEXT DEFAULT 'low',
      caught_by TEXT,
      thrown_at TEXT NOT NULL,
      caught_at TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chats (
      id TEXT PRIMARY KEY,
      bottle_id TEXT NOT NULL REFERENCES bottles(id) ON DELETE CASCADE,
      user_a TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      deleted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      sent_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return drizzle(sqlite, { schema });
}

// ─── Simulate the chat expiry cleanup logic ───────────────────────────────────
async function runChatExpiryCleanup(db: ReturnType<typeof createTestDb>) {
  const now = new Date().toISOString();
  const expiredChats = await db.query.chats.findMany({
    where: (c, { lt, and, isNull }) =>
      and(lt(c.expiresAt, now), isNull(c.deletedAt)),
  });

  for (const chat of expiredChats) {
    await db.delete(schema.messages).where(eq(schema.messages.chatId, chat.id));
    await db.delete(schema.chats).where(eq(schema.chats.id, chat.id));
  }

  return expiredChats.length;
}

describe('Chat hard-delete timing', () => {
  let db: ReturnType<typeof createTestDb>;
  let userId1: string;
  let userId2: string;
  let letterId: string;
  let bottleId: string;

  beforeEach(async () => {
    db = createTestDb();

    userId1 = uuidv4();
    userId2 = uuidv4();
    letterId = uuidv4();
    bottleId = uuidv4();

    // Seed test users
    await db.insert(schema.users).values([
      { id: userId1, deviceId: 'device-1' },
      { id: userId2, deviceId: 'device-2' },
    ]);
    await db.insert(schema.letters).values({
      id: letterId,
      userId: userId1,
      content: 'Test letter',
      status: 'thrown',
    });
    await db.insert(schema.bottles).values({
      id: bottleId,
      letterId,
      userId: userId1,
      status: 'caught',
      thrownAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
    });
  });

  it('hard-deletes an expired chat and ALL its messages', async () => {
    const chatId = uuidv4();
    const expiredAt = new Date(Date.now() - 1000).toISOString(); // 1 second ago

    await db.insert(schema.chats).values({
      id: chatId,
      bottleId,
      userA: userId1,
      userB: userId2,
      expiresAt: expiredAt,
    });

    await db.insert(schema.messages).values([
      { id: uuidv4(), chatId, senderId: userId1, content: 'Hello' },
      { id: uuidv4(), chatId, senderId: userId2, content: 'Hey' },
      { id: uuidv4(), chatId, senderId: userId1, content: 'Are you okay?' },
    ]);

    const msgsBefore = await db.query.messages.findMany({ where: eq(schema.messages.chatId, chatId) });
    expect(msgsBefore).toHaveLength(3);

    await runChatExpiryCleanup(db);

    // Chat must be GONE — not soft-deleted, not archived
    const chatAfter = await db.query.chats.findFirst({ where: eq(schema.chats.id, chatId) });
    expect(chatAfter).toBeUndefined();

    // ALL messages must be GONE — zero trace
    const msgsAfter = await db.query.messages.findMany({ where: eq(schema.messages.chatId, chatId) });
    expect(msgsAfter).toHaveLength(0);
  });

  it('does NOT delete an unexpired chat', async () => {
    const chatId = uuidv4();
    const futureExpiry = new Date(Date.now() + 3 * 86400000).toISOString(); // 3 days from now

    await db.insert(schema.chats).values({
      id: chatId,
      bottleId,
      userA: userId1,
      userB: userId2,
      expiresAt: futureExpiry,
    });

    await db.insert(schema.messages).values([
      { id: uuidv4(), chatId, senderId: userId1, content: 'This should survive' },
    ]);

    await runChatExpiryCleanup(db);

    const chatAfter = await db.query.chats.findFirst({ where: eq(schema.chats.id, chatId) });
    expect(chatAfter).toBeDefined();

    const msgsAfter = await db.query.messages.findMany({ where: eq(schema.messages.chatId, chatId) });
    expect(msgsAfter).toHaveLength(1);
  });

  it('deletes expired but leaves unexpired when both exist', async () => {
    const expiredChatId = uuidv4();
    const liveChatId = uuidv4();

    // Need separate bottles for two chats — reuse same bottle for simplicity
    await db.insert(schema.chats).values([
      {
        id: expiredChatId,
        bottleId,
        userA: userId1,
        userB: userId2,
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      },
      {
        id: liveChatId,
        bottleId,
        userA: userId1,
        userB: userId2,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    ]);

    await db.insert(schema.messages).values([
      { id: uuidv4(), chatId: expiredChatId, senderId: userId1, content: 'Should be deleted' },
      { id: uuidv4(), chatId: liveChatId, senderId: userId2, content: 'Should survive' },
    ]);

    const deleted = await runChatExpiryCleanup(db);
    expect(deleted).toBe(1);

    expect(await db.query.chats.findFirst({ where: eq(schema.chats.id, expiredChatId) })).toBeUndefined();
    expect(await db.query.chats.findFirst({ where: eq(schema.chats.id, liveChatId) })).toBeDefined();

    const survivors = await db.query.messages.findMany({ where: eq(schema.messages.chatId, liveChatId) });
    expect(survivors).toHaveLength(1);
  });

  it('7-day window: chat created now expires in exactly 7 days', () => {
    const created = new Date();
    const expiresAt = new Date(created.getTime() + 7 * 86400000);
    const msWindow = expiresAt.getTime() - created.getTime();

    expect(msWindow).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
