import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { users } from '../../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  /**
   * GET /settings
   * Returns current user settings.
   */
  app.get('/', async (request, reply) => {
    const userId = (request.user as any).userId;
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    return reply.send({
      language: user.language,
      has_recovery_email: !!user.email,
    });
  });

  /**
   * PATCH /settings
   * Update language or recovery email.
   */
  app.patch('/', async (request, reply) => {
    const userId = (request.user as any).userId;
    const schema = z.object({
      language: z.enum(['en', 'hi']).optional(),
      email: z.string().email().optional().nullable(),
    });

    const parsed = schema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const updates: Record<string, any> = {};
    if (parsed.data.language !== undefined) updates.language = parsed.data.language;
    if (parsed.data.email !== undefined) updates.email = parsed.data.email;

    if (Object.keys(updates).length > 0) {
      await db.update(users).set(updates).where(eq(users.id, userId));
    }

    return reply.send({ success: true });
  });

  /**
   * DELETE /account
   * Permanently and irreversibly deletes the user and ALL their data.
   *
   * Data Safety compliance: this endpoint must cascade-remove:
   * - letters (+ ai_reflection content)
   * - checkins (+ voice memo refs)
   * - bottles (+ risk classification)
   * - chats + messages (hard delete, same as expiry cron)
   * - streaks
   * - reports
   *
   * All handled via ON DELETE CASCADE foreign keys defined in the schema.
   * Deleting the users row is sufficient — the DB enforces the rest.
   */
  app.delete('/account', async (request, reply) => {
    const userId = (request.user as any).userId;

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    // Single delete — ON DELETE CASCADE handles all child rows:
    // letters, bottles, chats, messages, checkins, streaks, reports
    await db.delete(users).where(eq(users.id, userId));

    return reply.send({
      success: true,
      message_en: 'Your account and all data have been permanently deleted.',
      message_hi: 'तुम्हारा account और सारा data हमेशा के लिए मिट गया।',
    });
  });
}
