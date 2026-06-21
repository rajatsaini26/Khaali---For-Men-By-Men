import { FastifyInstance } from 'fastify';
import { db } from '../../db/index';
import { checkins, streaks, users } from '../../db/schema/sqlite';
import { eq, and, desc } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// 30-question rotating bank — matches the roadmap spec exactly
const QUESTION_BANK_EN = [
  "What are you not saying to someone right now?",
  "What did you pretend was fine today?",
  "Who do you miss that you'll never admit to?",
  "What's the one thing that keeps coming back?",
  "If no one could judge you, what would you say?",
  "What did you lose that no one knows about?",
  "What does being a man cost you?",
  "What would younger you think of where you are?",
  "What are you most ashamed of right now?",
  "What do you wish someone would just ask you?",
  "What's the anger you haven't let yourself feel yet?",
  "Who did you need today that wasn't there?",
  "What are you holding on to that's holding you back?",
  "What would you say to him — the one who hurt you?",
  "What truth are you most afraid of?",
  "What have you stopped expecting?",
  "What do you do when it gets loud inside your head?",
  "What's the version of yourself you've given up on?",
  "What did today take from you?",
  "Who are you when no one's watching?",
  "What hasn't healed yet?",
  "What do you want but can't ask for?",
  "What's the thing you keep almost saying?",
  "When was the last time you felt like yourself?",
  "What are you carrying that isn't yours?",
  "What would you forgive yourself for, if you could?",
  "What's the silence you're most tired of?",
  "What do you miss about the man you were?",
  "What are you protecting yourself from feeling?",
  "If this weight had a name, what would it be?",
];

const QUESTION_BANK_HI = [
  "अभी किससे क्या नहीं कह रहे?",
  "आज क्या ठीक नहीं था जो ठीक बताया?",
  "किसकी याद आती है जो कभी नहीं मानोगे?",
  "वो एक चीज़ क्या है जो वापस आती रहती है?",
  "अगर कोई judge न करे, तो क्या कहते?",
  "क्या खोया जो किसी को नहीं पता?",
  "मर्द होने की क्या कीमत है?",
  "छोटे वाले तुम, अभी के तुम्हें देखकर क्या सोचते?",
  "अभी सबसे ज़्यादा किस बात की शर्म है?",
  "क्या चाहते हो कोई बस पूछ ले?",
  "वो गुस्सा क्या है जो महसूस ही नहीं करने दिया खुद को?",
  "आज किसकी ज़रूरत थी जो था नहीं?",
  "किसे पकड़े हो जो तुम्हें रोक रहा है?",
  "उससे क्या कहते — जिसने दर्द दिया?",
  "किस सच से सबसे ज़्यादा डर लगता है?",
  "क्या उम्मीद करना बंद कर दिया?",
  "जब अंदर शोर होता है तो क्या करते हो?",
  "खुद का वो रूप जो अब छोड़ दिया — कौन सा था?",
  "आज ने क्या ले लिया तुमसे?",
  "जब कोई नहीं देखता तो कौन होते हो?",
  "क्या है जो अभी तक नहीं भरा?",
  "क्या चाहते हो लेकिन माँग नहीं सकते?",
  "वो बात क्या है जो बस निकलते-निकलते रह जाती है?",
  "आखिरी बार खुद जैसा कब लगा था?",
  "कौन सा बोझ है जो तुम्हारा है ही नहीं?",
  "अगर हो सकता तो खुद को किस बात के लिए माफ करते?",
  "किस चुप्पी से सबसे ज़्यादा थक गए हो?",
  "जो तुम थे उसमें क्या miss करते हो?",
  "किस एहसास से खुद को बचा रहे हो?",
  "इस बोझ का नाम होता तो क्या होता?",
];

const CheckinSchema = z.object({
  response: z.string().min(1),
  voice_memo_local_ref: z.string().optional(),
});

function getTodayQuestion(language: 'en' | 'hi', dayOffset = 0): string {
  const bank = language === 'hi' ? QUESTION_BANK_HI : QUESTION_BANK_EN;
  // Rotate based on day of year + offset
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  return bank[(dayOfYear + dayOffset) % bank.length];
}

export async function checkinRoutes(app: FastifyInstance) {
  app.addHook('onRequest', (app as any).authenticate);

  /**
   * GET /checkin/today
   * Returns today's question and current streak.
   */
  app.get('/today', async (request, reply) => {
    const userId = (request.user as any).userId;

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const streak = await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) });

    const language = (user?.language ?? 'en') as 'en' | 'hi';
    const question = getTodayQuestion(language);

    // Check if already answered today
    const today = new Date().toISOString().split('T')[0];
    const alreadyAnswered = streak?.lastCheckinDate === today;

    return reply.send({
      question,
      already_answered: alreadyAnswered,
      current_streak: streak?.currentStreak ?? 0,
      longest_streak: streak?.longestStreak ?? 0,
    });
  });

  /**
   * POST /checkin
   * Submit today's check-in response. Updates streak.
   */
  app.post('/', async (request, reply) => {
    const userId = (request.user as any).userId;
    const parsed = CheckinSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues });

    const { response, voice_memo_local_ref } = parsed.data;

    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const streak = await db.query.streaks.findFirst({ where: eq(streaks.userId, userId) });
    const language = (user?.language ?? 'en') as 'en' | 'hi';

    const today = new Date().toISOString().split('T')[0];

    // Block duplicate check-ins for today
    if (streak?.lastCheckinDate === today) {
      return reply.code(409).send({ error: 'Already checked in today.' });
    }

    const question = getTodayQuestion(language);

    // Create check-in record
    await db.insert(checkins).values({
      id: uuidv4(),
      userId,
      question,
      response,
      voiceMemoLocalRef: voice_memo_local_ref,
    });

    // Update streak
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const isConsecutive = streak?.lastCheckinDate === yesterday;
    const newCurrent = isConsecutive ? (streak?.currentStreak ?? 0) + 1 : 1;
    const newLongest = Math.max(newCurrent, streak?.longestStreak ?? 0);

    await db.update(streaks)
      .set({
        currentStreak: newCurrent,
        longestStreak: newLongest,
        lastCheckinDate: today,
      })
      .where(eq(streaks.userId, userId));

    return reply.send({
      message_en: 'Saved. No one else will read this.',
      message_hi: 'Save हो गया। कोई और नहीं पढ़ेगा।',
      current_streak: newCurrent,
      longest_streak: newLongest,
    });
  });
}
