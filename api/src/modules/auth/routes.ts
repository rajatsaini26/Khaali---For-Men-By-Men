import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { users, streaks } from '../../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const InitSchema = z.object({
  device_id: z.string().min(1),
  language: z.enum(['en', 'hi']).optional().default('en'),
});

export async function authRoutes(app: FastifyInstance) {
  /**
   * POST /auth/init
   * Creates or retrieves a user from device_id.
   * Returns a JWT scoped to that UUID.
   */
  app.post('/init', async (request, reply) => {
    const parsed = InitSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid request', details: parsed.error.issues });
    }

    const { device_id, language } = parsed.data;

    // Find or create user
    let user = await db.query.users.findFirst({
      where: eq(users.deviceId, device_id),
    });

    if (!user) {
      const newId = uuidv4();
      await db.insert(users).values({
        id: newId,
        deviceId: device_id,
        language,
      });

      // Initialize streak row
      await db.insert(streaks).values({
        userId: newId,
        currentStreak: 0,
        longestStreak: 0,
      });

      user = await db.query.users.findFirst({
        where: eq(users.id, newId),
      });
    }

    if (!user) return reply.code(500).send({ error: 'Failed to create user' });

    // Issue JWT
    const token = app.jwt.sign({ userId: user.id, deviceId: user.deviceId });

    return reply.send({
      token,
      user_id: user.id,
      language: user.language,
    });
  });
}
