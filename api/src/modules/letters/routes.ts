import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { letters } from '../../db/schema/sqlite';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { reflectLetter } from '../../lib/gemini';

const CreateLetterSchema = z.object({
  theme: z.string().optional(),
  content: z.string().min(1, 'Letter content cannot be empty'),
});

const SealLetterSchema = z.object({
  destination: z.enum(['private', 'pool']),
});

export async function letterRoutes(app: FastifyInstance) {
  // All letter routes require authentication
  app.addHook('onRequest', (app as any).authenticate);

  /**
   * POST /letters
   * Create a new draft letter.
   */
  app.post('/', async (request, reply) => {
    const userId = (request.user as any).userId;
    const parsed = CreateLetterSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const { theme, content } = parsed.data;
    const id = uuidv4();

    await db.insert(letters).values({ id, userId, theme, content, status: 'draft' });

    return reply.code(201).send({ letter_id: id });
  });

  /**
   * POST /letters/:id/reflect
   * Call Gemini to generate an AI reflection. Stores result on the letter row.
   */
  app.post('/:id/reflect', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };

    const letter = await db.query.letters.findFirst({
      where: and(eq(letters.id, id), eq(letters.userId, userId)),
    });

    if (!letter) return reply.code(404).send({ error: 'Letter not found' });

    // Fetch user's language preference
    const user = await db.query.users.findFirst({
      where: eq((await import('../../db/schema/sqlite')).users.id, userId),
    });
    const language = (user?.language ?? 'en') as 'en' | 'hi';

    let reflection: string;
    try {
      reflection = await reflectLetter(letter.content, language);
    } catch (err) {
      app.log.error({ err: err as Error }, '[reflect] Gemini error');
      return reply.code(503).send({
        error: 'Reflection service temporarily unavailable. You can still seal your letter.',
        fallback: true,
      });
    }

    // Persist reflection on letter
    await db.update(letters)
      .set({ aiReflection: reflection })
      .where(eq(letters.id, id));

    return reply.send({ reflection });
  });

  /**
   * POST /letters/:id/seal
   * Seal a letter as 'private' or mark as 'sealed' ready to be thrown.
   * 'pool' destination sets status to 'sealed'; the throw endpoint moves it to 'thrown'.
   */
  app.post('/:id/seal', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };

    const parsed = SealLetterSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const { destination } = parsed.data;

    const letter = await db.query.letters.findFirst({
      where: and(eq(letters.id, id), eq(letters.userId, userId)),
    });

    if (!letter) return reply.code(404).send({ error: 'Letter not found' });
    if (letter.status !== 'draft') return reply.code(409).send({ error: 'Letter already sealed' });

    const newStatus = destination === 'private' ? 'private' : 'sealed';
    const sealedAt = new Date().toISOString();

    await db.update(letters)
      .set({ status: newStatus, sealedAt })
      .where(eq(letters.id, id));

    return reply.send({ letter_id: id, status: newStatus, sealed_at: sealedAt });
  });

  /**
   * GET /letters/mine
   * Get all of the user's private letters (their journal).
   */
  app.get('/mine', async (request, reply) => {
    const userId = (request.user as any).userId;

    const myLetters = await db.query.letters.findMany({
      where: and(eq(letters.userId, userId), eq(letters.status, 'private')),
    });

    return reply.send({ letters: myLetters });
  });
}
