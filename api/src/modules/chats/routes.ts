import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { chats, messages, users } from '../../db/schema/sqlite';
import { eq, and, or, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const SendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
});

export async function chatRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  /**
   * GET /chats/active
   * Returns all non-expired chats the user is a participant in.
   */
  app.get('/active', async (request, reply) => {
    const userId = (request.user as any).userId;
    const now = new Date().toISOString();

    const activeChats = await db.query.chats.findMany({
      where: and(
        or(
          eq(chats.userA, userId),
          eq(chats.userB, userId),
        ),
      ),
    });

    // Filter out expired/deleted chats in-process (SQLite doesn't support complex where easily)
    const live = activeChats.filter(
      (c) => c.expiresAt > now && c.deletedAt === null,
    );

    // Attach role: 'thrower' | 'catcher' and time remaining
    const result = live.map((c) => {
      const role = c.userA === userId ? 'thrower' : 'catcher';
      const msLeft = new Date(c.expiresAt).getTime() - Date.now();
      const daysLeft = Math.ceil(msLeft / 86400000);
      return {
        chat_id: c.id,
        role,
        days_left: daysLeft,
        expires_at: c.expiresAt,
        created_at: c.createdAt,
      };
    });

    return reply.send({ chats: result });
  });

  /**
   * GET /chats/:id/messages
   * Paginated message history. Only participants can read.
   */
  app.get('/:id/messages', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };
    const { cursor, limit = '50' } = request.query as { cursor?: string; limit?: string };

    const chat = await db.query.chats.findFirst({ where: eq(chats.id, id) });
    if (!chat) return reply.code(404).send({ error: 'Chat not found' });

    // Security: only participants can read — validated server-side, never client-trusted
    if (chat.userA !== userId && chat.userB !== userId) {
      return reply.code(403).send({ error: 'Not a participant in this chat' });
    }

    // Check expiry
    if (chat.deletedAt || new Date(chat.expiresAt) <= new Date()) {
      return reply.code(410).send({ error: 'This chat has ended.' });
    }

    const msgs = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
      orderBy: [desc(messages.sentAt)],
      limit: Math.min(parseInt(limit), 100),
    });

    // Label sender as 'you' or 'him' — never expose user IDs to client
    const labelled = msgs.reverse().map((m) => ({
      id: m.id,
      sender: m.senderId === userId ? 'you' : 'him',
      content: m.content,
      sent_at: m.sentAt,
    }));

    return reply.send({ messages: labelled, chat_id: id, expires_at: chat.expiresAt });
  });

  /**
   * POST /chats/:id/messages
   * Send a message. Validates sender is a participant.
   * Also broadcasts via Socket.io if io is attached.
   */
  app.post('/:id/messages', async (request, reply) => {
    const userId = (request.user as any).userId;
    const { id } = request.params as { id: string };

    const parsed = SendMessageSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const { content } = parsed.data;

    const chat = await db.query.chats.findFirst({ where: eq(chats.id, id) });
    if (!chat) return reply.code(404).send({ error: 'Chat not found' });

    // Security: validate sender is a participant — server-side, not client-trusted
    if (chat.userA !== userId && chat.userB !== userId) {
      return reply.code(403).send({ error: 'Not a participant in this chat' });
    }

    if (chat.deletedAt || new Date(chat.expiresAt) <= new Date()) {
      return reply.code(410).send({ error: 'This chat has ended.' });
    }

    const msgId = uuidv4();
    const sentAt = new Date().toISOString();

    await db.insert(messages).values({
      id: msgId,
      chatId: id,
      senderId: userId,
      content,
      sentAt,
    });

    const payload = {
      id: msgId,
      chat_id: id,
      sender: 'him',  // from the recipient's perspective
      content,
      sent_at: sentAt,
    };

    // Broadcast to socket room if Socket.io is initialised
    const io = (app as any).io;
    if (io) {
      io.to(`chat:${id}`).emit('message:receive', payload);
    }

    return reply.code(201).send({
      ...payload,
      sender: 'you',  // from the sender's perspective
    });
  });
}
