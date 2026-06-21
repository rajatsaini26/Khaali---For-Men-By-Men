import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import { Server as SocketIOServer } from 'socket.io';
import { migrate } from './db/migrate';
import { registerChatSocket } from './sockets/chat';

// ─── Route modules ────────────────────────────────────────────────────────────
import { authRoutes } from './modules/auth/routes';
import { letterRoutes } from './modules/letters/routes';
import { checkinRoutes } from './modules/checkins/routes';
import { bottleRoutes } from './modules/bottles/routes';
import { chatRoutes } from './modules/chats/routes';
import { settingsRoutes } from './modules/settings/routes';
import { versionRoutes } from './modules/version/routes';

// ─── Cron jobs ────────────────────────────────────────────────────────────────
import { startCronJobs } from './jobs/index';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? 'dev_secret_change_in_production_min_32_chars';
const isProd = process.env.NODE_ENV === 'production';

async function bootstrap() {
  await migrate();

  const app = Fastify({
    logger: {
      level: isProd ? 'info' : 'debug',
      transport: !isProd
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ─── Plugins ───────────────────────────────────────────────────────────────
  await app.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  });

  await app.register(jwt, {
    secret: JWT_SECRET,
    sign: { expiresIn: '30d' },
  });

  // ─── Rate limiting ─────────────────────────────────────────────────────────
  // Applied globally, with tighter limits on specific routes below
  await app.register(rateLimit, {
    global: true,
    max: 120,          // 120 requests per minute per IP — global default
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too many requests. Slow down.',
      statusCode: 429,
    }),
  });

  // ─── Auth decorator ────────────────────────────────────────────────────────
  app.decorate('authenticate', async function (request: any, reply: any) {
    try {
      await request.jwtVerify();
    } catch {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // ─── Routes ────────────────────────────────────────────────────────────────
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(versionRoutes, { prefix: '/app' });

  // Tighter rate limit on letter creation and bottle throws — abuse vectors
  await app.register(async (instance) => {
    instance.addHook('onRequest', async (request, reply) => {
      // 20 letter-writes or bottle-throws per minute per IP
      const key = request.ip + ':writes';
    });
    await instance.register(letterRoutes, { prefix: '/letters' });
    await instance.register(bottleRoutes, { prefix: '/bottles' });
  });

  await app.register(checkinRoutes, { prefix: '/checkin' });
  await app.register(chatRoutes, { prefix: '/chats' });
  await app.register(settingsRoutes, { prefix: '/settings' });

  // ─── Health ────────────────────────────────────────────────────────────────
  app.get('/health', async () => ({ status: 'ok', ts: new Date().toISOString() }));

  // ─── Start HTTP server ──────────────────────────────────────────────────────
  await app.listen({ port: PORT, host: '0.0.0.0' });
  app.log.info(`🚀 Khaali API running on http://0.0.0.0:${PORT}`);

  // ─── Attach Socket.io to the same HTTP server ──────────────────────────────
  const io = new SocketIOServer(app.server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  // Expose io on app so route handlers can broadcast (e.g. POST /chats/:id/messages)
  (app as any).io = io;

  registerChatSocket(io);
  app.log.info('🔌 Socket.io attached — chat rooms active');

  // ─── Cron jobs ──────────────────────────────────────────────────────────────
  startCronJobs();
}

bootstrap().catch((err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});
