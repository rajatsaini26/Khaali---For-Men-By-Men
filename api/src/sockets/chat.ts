import { Server, Socket } from 'socket.io';
import { db } from '../db/index';
import { chats, messages } from '../db/schema/sqlite';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

/**
 * Registers Socket.io chat room handlers.
 *
 * Protocol:
 *   Client → server:  chat:join   { chat_id, user_id }
 *   Client → server:  message:send { chat_id, content, sender_id }
 *   Server → client:  message:receive { id, chat_id, sender, content, sent_at }
 *   Server → client:  chat:expired { chat_id }
 *   Server → client:  chat:error   { message }
 */
export function registerChatSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    let joinedChatId: string | null = null;
    let joinedUserId: string | null = null;

    // ─── Join a chat room ──────────────────────────────────────────────────────
    socket.on('chat:join', async ({ chat_id, user_id }: { chat_id: string; user_id: string }) => {
      try {
        const chat = await db.query.chats.findFirst({ where: eq(chats.id, chat_id) });

        if (!chat) {
          socket.emit('chat:error', { message: 'Chat not found' });
          return;
        }

        // Security: validate user is a participant — never trust client-sent role
        if (chat.userA !== user_id && chat.userB !== user_id) {
          socket.emit('chat:error', { message: 'Not a participant in this chat' });
          return;
        }

        if (chat.deletedAt || new Date(chat.expiresAt) <= new Date()) {
          socket.emit('chat:expired', { chat_id });
          return;
        }

        joinedChatId = chat_id;
        joinedUserId = user_id;

        // Leave previous room if any before joining new one
        if (joinedChatId) socket.leave(`chat:${joinedChatId}`);
        socket.join(`chat:${chat_id}`);

        // Confirm join with time remaining
        const msLeft = new Date(chat.expiresAt).getTime() - Date.now();
        const daysLeft = Math.ceil(msLeft / 86400000);
        socket.emit('chat:joined', { chat_id, days_left: daysLeft, expires_at: chat.expiresAt });

      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to join chat' });
      }
    });

    // ─── Send a message ────────────────────────────────────────────────────────
    socket.on('message:send', async ({
      chat_id,
      content,
      sender_id,
    }: {
      chat_id: string;
      content: string;
      sender_id: string;
    }) => {
      try {
        if (!content?.trim() || content.length > 2000) {
          socket.emit('chat:error', { message: 'Invalid message content' });
          return;
        }

        const chat = await db.query.chats.findFirst({ where: eq(chats.id, chat_id) });
        if (!chat) {
          socket.emit('chat:error', { message: 'Chat not found' });
          return;
        }

        // Security: re-validate sender is participant on every message
        if (chat.userA !== sender_id && chat.userB !== sender_id) {
          socket.emit('chat:error', { message: 'Not authorised to send in this chat' });
          return;
        }

        if (chat.deletedAt || new Date(chat.expiresAt) <= new Date()) {
          socket.emit('chat:expired', { chat_id });
          return;
        }

        const msgId = uuidv4();
        const sentAt = new Date().toISOString();

        await db.insert(messages).values({
          id: msgId,
          chatId: chat_id,
          senderId: sender_id,
          content: content.trim(),
          sentAt,
        });

        // Broadcast to all in room — label as 'him' (recipient perspective)
        // The sender gets 'you' via their own optimistic update on the client
        io.to(`chat:${chat_id}`).emit('message:receive', {
          id: msgId,
          chat_id,
          sender: 'him',
          content: content.trim(),
          sent_at: sentAt,
        });

      } catch (err) {
        socket.emit('chat:error', { message: 'Failed to send message' });
      }
    });

    // ─── Disconnect cleanup ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (joinedChatId) {
        socket.leave(`chat:${joinedChatId}`);
      }
    });
  });
}
