import cron from 'node-cron';
import { db } from '../db/index';
import { chats, bottles, messages } from '../db/schema/sqlite';
import { lt, eq, and, isNull } from 'drizzle-orm';
import Database from 'better-sqlite3';

export function startCronJobs() {
  console.log('⏰ Starting cron jobs...');

  // ─── Chat Expiry — runs every hour ──────────────────────────────────────────
  // FR-4.4: Chats and ALL messages HARD DELETED at exactly 7 days.
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date().toISOString();
      const expiredChats = await db.query.chats.findMany({
        where: and(
          lt(chats.expiresAt, now),
          isNull(chats.deletedAt),
        ),
      });

      for (const chat of expiredChats) {
        // Hard delete messages first (FK cascade handles it, but being explicit)
        await db.delete(messages).where(eq(messages.chatId, chat.id));
        // Hard delete the chat row — no soft delete, no backup
        await db.delete(chats).where(eq(chats.id, chat.id));
        console.log(`[cron] Hard-deleted expired chat ${chat.id}`);
      }

      if (expiredChats.length > 0) {
        console.log(`[cron] Chat expiry: deleted ${expiredChats.length} chats`);
      }
    } catch (err) {
      console.error('[cron] Chat expiry error:', err);
    }
  });

  // ─── Bottle Expiry — runs daily at 2am ──────────────────────────────────────
  // FR-3.5: Bottles uncaught after 30 days auto-expire.
  cron.schedule('0 2 * * *', async () => {
    try {
      const now = new Date().toISOString();
      const result = await db
        .update(bottles)
        .set({ status: 'expired' })
        .where(
          and(
            eq(bottles.status, 'floating'),
            lt(bottles.expiresAt, now),
          )
        );
      console.log(`[cron] Bottle expiry: expired floating bottles older than 30 days`);
    } catch (err) {
      console.error('[cron] Bottle expiry error:', err);
    }
  });

  // ─── Streak Reset — runs daily at midnight IST (18:30 UTC) ──────────────────
  // FR-5.5: Missing a day resets current_streak to 0 at midnight IST.
  cron.schedule('30 18 * * *', async () => {
    try {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Reset streaks for users whose last check-in was before yesterday
      // Use raw SQLite client for parameterised UPDATE
      const client = (db as any).session.client as Database.Database;
      client.prepare(
        `UPDATE streaks SET current_streak = 0
         WHERE last_checkin_date IS NOT NULL
           AND last_checkin_date < ?
           AND current_streak > 0`
      ).run(yesterday);
      console.log('[cron] Streak reset: reset broken streaks');
    } catch (err) {
      console.error('[cron] Streak reset error:', err);
    }
  });

  console.log('✅ Cron jobs scheduled: chat expiry (hourly), bottle expiry (daily 2am), streak reset (midnight IST)');
}
