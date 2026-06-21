import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { bottles, letters, chats, users } from '../../db/schema/sqlite';
import { eq, and, ne, isNull, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { classifyLetterRisk } from '../../lib/gemini';

const BOTTLE_EXPIRY_DAYS = 30;
const CHAT_EXPIRY_DAYS = 7;

export async function bottleRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  /**
   * POST /bottles/throw/:letter_id
   * Run crisis filter → if safe, add letter to the bottle pool.
   * Blocks if risk_level is 'high' or 'crisis'.
   */
  app.post('/throw/:letter_id', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { letter_id } = request.params as { letter_id: string };

    const letter = await db.query.letters.findFirst({
      where: and(eq(letters.id, letter_id), eq(letters.userId, userId)),
    });

    if (!letter) return reply.code(404).send({ error: 'Letter not found' });
    if (letter.status !== 'sealed') {
      return reply.code(409).send({ error: 'Letter must be sealed before throwing' });
    }

    // FR-3.2: Only one active thrown bottle per user at a time
    const activeBottle = await db.query.bottles.findFirst({
      where: and(eq(bottles.userId, userId), eq(bottles.status, 'floating')),
    });
    if (activeBottle) {
      return reply.code(409).send({ error: 'You already have a bottle in the sea. Wait for it to be caught or expire.' });
    }

    // Crisis filter — blocks if high or crisis
    let riskResult;
    try {
      riskResult = await classifyLetterRisk(letter.content);
    } catch (err) {
      app.log.error({ err: err as Error }, '[crisis-filter] Gemini unavailable');
      // NFR-3.3: Hold back from pool but keep letter saved
      return reply.code(503).send({
        error: 'Safety check temporarily unavailable. Your letter is saved privately. Try again in a moment.',
        letter_saved: true,
      });
    }

    if (riskResult.risk_level === 'high' || riskResult.risk_level === 'crisis') {
      // Update letter to flagged — it stays private
      await db.update(letters).set({ status: 'private' }).where(eq(letters.id, letter_id));
      return reply.code(200).send({
        blocked: true,
        risk_level: riskResult.risk_level,
        helplines: {
          message_en: "Before this goes anywhere — are you okay right now? You don't have to answer. But these people are listening:",
          message_hi: "इससे पहले कि यह कहीं जाए — क्या तुम ठीक हो अभी? जवाब देना ज़रूरी नहीं। लेकिन ये लोग सुनते हैं:",
          contacts: [
            { name: 'iCall', number: '9152987821' },
            { name: 'Vandrevala Foundation', number: '1860-2662-345' },
          ],
          letter_note_en: "Your letter is saved privately. It's not lost.",
          letter_note_hi: "तुम्हारा खत private save है। खोया नहीं।",
        },
      });
    }

    // Safe to throw — create bottle record
    const thrownAt = new Date();
    const expiresAt = new Date(thrownAt.getTime() + BOTTLE_EXPIRY_DAYS * 86400000);

    const bottleId = uuidv4();
    await db.insert(bottles).values({
      id: bottleId,
      letterId: letter_id,
      userId,
      status: 'floating',
      riskLevel: riskResult.risk_level,
      thrownAt: thrownAt.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });

    await db.update(letters).set({ status: 'thrown' }).where(eq(letters.id, letter_id));

    return reply.send({
      blocked: false,
      bottle_id: bottleId,
      expires_at: expiresAt.toISOString(),
      message_en: "It's out there. Someone will find it. Or the sea will keep it. Either way — you let it go.",
      message_hi: "यह वहाँ है। कोई मिलेगा। या समंदर रखेगा। किसी भी तरह — तुमने छोड़ दिया।",
    });
  });

  /**
   * GET /bottles/sea
   * Returns 3 random floating bottles for the user to browse.
   * FR-3.1: Never shows the user their own bottle.
   */
  app.get('/sea', async (request, reply) => {
    const userId = (request.user as any).userId;

    // SQLite: get random floating bottles not owned by this user
    const poolBottles = await db
      .select({
        bottleId: bottles.id,
        theme: letters.theme,
        content: letters.content,
        thrownAt: bottles.thrownAt,
      })
      .from(bottles)
      .innerJoin(letters, eq(bottles.letterId, letters.id))
      .where(
        and(
          eq(bottles.status, 'floating'),
          ne(bottles.userId, userId),
          isNull(bottles.caughtBy),
        )
      )
      .orderBy(sql`RANDOM()`)
      .limit(3);

    return reply.send({ bottles: poolBottles });
  });

  /**
   * POST /bottles/:id/keep
   * Catch a bottle — creates an ephemeral 7-day chat.
   */
  app.post('/:id/keep', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };

    const bottle = await db.query.bottles.findFirst({ where: eq(bottles.id, id) });
    if (!bottle) return reply.code(404).send({ error: 'Bottle not found' });
    if (bottle.status !== 'floating') return reply.code(409).send({ error: 'Bottle no longer available' });
    if (bottle.userId === userId) return reply.code(403).send({ error: 'Cannot catch your own bottle' });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CHAT_EXPIRY_DAYS * 86400000);
    const chatId = uuidv4();

    // Update bottle status
    await db.update(bottles)
      .set({ status: 'caught', caughtBy: userId, caughtAt: now.toISOString() })
      .where(eq(bottles.id, id));

    // Update letter status
    await db.update(letters).set({ status: 'caught' }).where(eq(letters.id, bottle.letterId));

    // Create ephemeral chat
    await db.insert(chats).values({
      id: chatId,
      bottleId: id,
      userA: bottle.userId,   // thrower
      userB: userId,           // catcher
      expiresAt: expiresAt.toISOString(),
    });

    return reply.send({
      chat_id: chatId,
      expires_at: expiresAt.toISOString(),
      message_en: "You have 7 days. No names. No photos. No judgment. When it ends, it's gone.",
      message_hi: "7 दिन हैं। कोई नाम नहीं। कोई फोटो नहीं। कोई judgment नहीं। जब खत्म होगा, सब चला जाएगा।",
    });
  });

  /**
   * POST /bottles/:id/release
   * Release a bottle back to the pool.
   */
  app.post('/:id/release', async (request, reply) => {
    const { id } = request.params as { id: string };

    const bottle = await db.query.bottles.findFirst({ where: eq(bottles.id, id) });
    if (!bottle || bottle.status !== 'floating') {
      return reply.code(404).send({ error: 'Bottle not found or not available' });
    }

    // Simply leave it in the pool (no status change needed — it was never caught)
    return reply.send({
      message_en: 'Back to the sea.',
      message_hi: 'वापस समंदर में।',
    });
  });
}
