import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ─── Users ────────────────────────────────────────────────────────────────────
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),                          // UUID
  deviceId: text('device_id').notNull().unique(),
  language: text('language', { enum: ['en', 'hi'] }).default('en').notNull(),
  email: text('email'),                                 // optional, streak recovery only
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// ─── Letters ──────────────────────────────────────────────────────────────────
export const letters = sqliteTable('letters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  theme: text('theme'),
  content: text('content').notNull(),
  aiReflection: text('ai_reflection'),
  status: text('status', {
    enum: ['draft', 'private', 'sealed', 'thrown', 'caught', 'expired'],
  }).default('draft').notNull(),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  sealedAt: text('sealed_at'),
});

// ─── Bottles ──────────────────────────────────────────────────────────────────
export const bottles = sqliteTable('bottles', {
  id: text('id').primaryKey(),
  letterId: text('letter_id').notNull().unique().references(() => letters.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', {
    enum: ['floating', 'caught', 'released', 'expired', 'flagged'],
  }).default('floating').notNull(),
  riskLevel: text('risk_level', { enum: ['none', 'low', 'high', 'crisis'] }),
  thrownAt: text('thrown_at').default(sql`(datetime('now'))`).notNull(),
  caughtBy: text('caught_by').references(() => users.id),
  caughtAt: text('caught_at'),
  expiresAt: text('expires_at'),                       // thrown_at + 30 days
});

// ─── Chats ────────────────────────────────────────────────────────────────────
export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  bottleId: text('bottle_id').notNull().references(() => bottles.id, { onDelete: 'cascade' }),
  userA: text('user_a').notNull().references(() => users.id),  // thrower
  userB: text('user_b').notNull().references(() => users.id),  // catcher
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
  expiresAt: text('expires_at').notNull(),             // created_at + 7 days — hard enforced
  deletedAt: text('deleted_at'),
});

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  sentAt: text('sent_at').default(sql`(datetime('now'))`).notNull(),
});

// ─── Check-ins ────────────────────────────────────────────────────────────────
export const checkins = sqliteTable('checkins', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  question: text('question').notNull(),
  response: text('response'),
  voiceMemoLocalRef: text('voice_memo_local_ref'),     // device-local ref, never transmitted
  dayNumber: integer('day_number'),
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// ─── Streaks ──────────────────────────────────────────────────────────────────
export const streaks = sqliteTable('streaks', {
  userId: text('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  currentStreak: integer('current_streak').default(0).notNull(),
  longestStreak: integer('longest_streak').default(0).notNull(),
  lastCheckinDate: text('last_checkin_date'),
});

// ─── Monthly Reports ──────────────────────────────────────────────────────────
export const reports = sqliteTable('reports', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  periodStart: text('period_start'),
  periodEnd: text('period_end'),
  content: text('content'),                            // JSON stringified report
  createdAt: text('created_at').default(sql`(datetime('now'))`).notNull(),
});

// ─── App Versions ────────────────────────────────────────────────────────────
export const appVersions = sqliteTable('app_versions', {
  id: text('id').primaryKey(),
  platform: text('platform', { enum: ['ios', 'android'] }).notNull(),
  latestVersion: text('latest_version').notNull(),
  minSupportedVersion: text('min_supported_version').notNull(),
  forceUpdate: integer('force_update', { mode: 'boolean' }).default(false).notNull(),
  updateUrl: text('update_url').notNull(),
  messageEn: text('message_en'),
  messageHi: text('message_hi'),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`).notNull(),
});
