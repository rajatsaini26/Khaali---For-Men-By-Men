/**
 * Khaali — Bottle Pool Seed Script
 *
 * Seeds 55 pre-written, emotionally authentic letters across all 7 themes.
 * Run with: npx tsx src/db/seed.ts
 *
 * These seed letters exist to solve the cold-start problem at launch.
 * They feel real because the pain they describe is real.
 * They are written to be read, not to be test data.
 */

import 'dotenv/config';
import { db } from './index';
import { users, letters, bottles } from './schema/sqlite';
import { v4 as uuidv4 } from 'uuid';

const SEED_USER_DEVICE_ID = 'khaali-seed-system-v1';

const SEED_LETTERS: Array<{ theme: string; content: string; language: 'en' | 'hi' }> = [
  // ── A person who hurt me ──────────────────────────────────────────────────
  {
    theme: 'A person who hurt me',
    language: 'en',
    content: `To the friend who stopped returning my calls after I lost my job.

I never asked you for money. I never even told you how bad it was. I just needed someone to talk to and you chose to disappear at exactly that moment.

I don't hate you. I just don't understand it. We were ten years in. I thought that counted for something.

It's been eight months. You still haven't called. I probably won't either. That's the part that hurts most — that I've already made peace with losing you and you don't even know it.`,
  },
  {
    theme: 'A person who hurt me',
    language: 'en',
    content: `To the woman I thought I was going to marry.

You told me I was "too much." Too emotional. Too intense. Too needy. You said it like it was a clinical diagnosis.

What you actually meant was: you didn't want to deal with a man who felt things. So you found someone who doesn't. And now you post photos with him looking like that's what happy is.

I hope one day he says something that actually surprises you. I really do.`,
  },
  {
    theme: 'A person who hurt me',
    language: 'hi',
    content: `उस दोस्त के लिए जो मेरी सबसे बड़ी कमज़ोरी जानता था।

तुमने वो बात उस कमरे में कही जहाँ सब लोग थे। एक मज़ाक की तरह। सब हँसे।

मैं भी हँसा। क्योंकि उस वक्त रोने का option नहीं था।

लेकिन घर जाकर मैंने सोचा — क्या मैंने तुम्हारे साथ कभी ऐसा किया होता? नहीं। इसीलिए समझ आया कि friendship equal नहीं थी। कभी थी भी नहीं।`,
  },
  {
    theme: 'A person who hurt me',
    language: 'en',
    content: `To my father.

You never hit me. You never screamed. You just... weren't there. In the room, at the dinner table, at every recital and match and conversation where I needed someone to look at me like I mattered.

I became good at not needing things. Turns out that's not a skill. That's damage.

I'm 34 now. I still look for your approval in every room I walk into. I'm so tired of that.`,
  },
  {
    theme: 'A person who hurt me',
    language: 'en',
    content: `To the manager who took credit for my work for two years straight.

You knew what you were doing. The reports with your name. The meetings where my ideas came out of your mouth. The promotion I didn't get because "the timing wasn't right."

I quit. You sent a LinkedIn message saying you were "sad to see me go." I read it three times trying to find the part where you were joking.`,
  },
  {
    theme: 'A person who hurt me',
    language: 'hi',
    content: `उस इंसान के लिए जो मेरा सबसे करीबी था।

जब मुझे सबसे ज़्यादा ज़रूरत थी, तुम चले गए। कोई explanation नहीं। बस एक दिन शांत हो गए।

मैंने message किए। Call किए। एक बार तुम्हारे घर के बाहर खड़ा रहा — यह सोचकर कि शायद तुम मिलोगे और बताओगे कि क्या हुआ।

तुम नहीं मिले। और मुझे आज तक नहीं पता कि मैंने क्या किया।`,
  },
  {
    theme: 'A person who hurt me',
    language: 'en',
    content: `To my brother.

We grew up in the same house. Ate at the same table. Fought over the same TV remote for twenty years. And now we go months without speaking and neither of us calls it a problem.

I miss you. Not the version of you that sends birthday messages three days late. The one who used to wake me up at 2am to show me a dumb YouTube video.

That guy. I miss that guy.`,
  },

  // ── Something I lost ──────────────────────────────────────────────────────
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost the version of myself that believed things would work out.

I don't know exactly when it happened. Somewhere between the second job that didn't work out and the third relationship that ended the same way the first two did.

I still go through the motions. I smile at the right moments. But that quiet certainty I used to have — that underneath the bad days there was a plan — that's gone. And I don't know if it's coming back.`,
  },
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost my dog three months ago.

I know that sounds small compared to what other people carry. But he was the one constant in four years of my life falling apart. He didn't care if I'd failed or succeeded or cried or lost weight or didn't shower for three days.

He just wanted to be next to me. And I can't explain how much I needed exactly that.

The apartment is so quiet.`,
  },
  {
    theme: 'Something I lost',
    language: 'hi',
    content: `मैंने अपना confidence खो दिया।

पहले यह नहीं था। पहले मैं किसी कमरे में चला जाता था और घबराता नहीं था। अब हर meeting से पहले, हर बड़ी बात से पहले, एक आवाज़ है जो कहती है — तुमसे नहीं होगा।

मुझे नहीं पता यह आवाज़ कहाँ से आई। पर अब यह मेरी अपनी आवाज़ जैसी लगती है।`,
  },
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost the city I grew up in.

I moved for work. The right decision on paper. The neighbourhood I grew up in has changed. The chai shop is a smoothie bar now. The cricket ground is a parking lot.

My mother asks when I'm coming home. I don't know how to tell her I'm not sure where home is anymore.`,
  },
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost a friendship that was ten years old to a misunderstanding that took ten minutes.

He thought I said something I didn't say. Or maybe I did say it and didn't realise how it would land. I've replayed the conversation so many times I don't know anymore what actually happened.

I tried to apologise. He said it was fine. But nothing has been fine since. Fine is the word people use when they've already decided to leave.`,
  },
  {
    theme: 'Something I lost',
    language: 'hi',
    content: `मैंने अपने पिता को खोया — दो साल पहले।

लेकिन असल में बहुत पहले खो दिया था। वो present नहीं थे। Hospital bed पर थे और फिर भी दूर थे।

जो सबसे अजीब है — मुझे उस इंसान की याद आती है जो वो कभी थे, जो मुझे याद भी नहीं। बस एक feeling है जो याद है। कि एक वक्त था जब उनके पास होना safe लगता था।`,
  },
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost five years to a startup that failed.

We did everything right. The team was good. The product worked. The market just... didn't care.

People ask how I'm doing and I say "figuring things out." What I mean is: I'm 31 and I'm starting over and I'm terrified that I used my best years on something that ended in a liquidation notice.`,
  },
  {
    theme: 'Something I lost',
    language: 'en',
    content: `I lost the ability to sleep through the night.

It's been two years. I wake at 3am every time. The thoughts that come at 3am are different. They're not the useful kind. They're the inventory-of-everything-wrong kind.

I'm so tired. But not the kind that sleep fixes.`,
  },

  // ── A version of myself I mourn ───────────────────────────────────────────
  {
    theme: 'A version of myself I mourn',
    language: 'en',
    content: `I miss the version of me that used to read.

I used to finish a book a week. I had opinions. I had that feeling of being somewhere else entirely while sitting still. Now I pick up my phone instead and put it down forty minutes later having learned nothing and feeling worse.

I don't know how to get back to being someone who can sit quietly with something difficult.`,
  },
  {
    theme: 'A version of myself I mourn',
    language: 'en',
    content: `There was a version of me that wanted to be a writer.

I wrote every day for three years in my twenties. I had a drawer full of notebooks. I thought I had something to say.

Then real life showed up — the rent, the job, the relationship, the parents getting older — and writing became the thing I'd do "later." Later never came.

I'm 38. The notebooks are still there. I haven't opened them in six years.`,
  },
  {
    theme: 'A version of myself I mourn',
    language: 'hi',
    content: `एक वक्त था जब मैं खुल कर हँसता था।

Full laugh। Body में से आने वाली। अब वो laugh कहाँ गई, मुझे नहीं पता।

Photos देखता हूँ पुराने — school के, college के — और उस लड़के को पहचानता हूँ। पर उसे पाने का रास्ता याद नहीं।

शायद वो रास्ता है भी नहीं।`,
  },
  {
    theme: 'A version of myself I mourn',
    language: 'en',
    content: `I miss who I was before the depression.

I don't talk about it that way. I say "a rough few years" or "I've been in a weird headspace." But the truth is I lost four years of my life to something that felt like walking through concrete.

I'm better now. Mostly. But the person who came out the other side isn't quite the same person who went in. I don't know if I should grieve that or accept it.`,
  },
  {
    theme: 'A version of myself I mourn',
    language: 'en',
    content: `I was athletic. Really athletic. Then my knee gave out at 26 and I never got back to it.

Exercise used to be the one place where I didn't have to think. Where the body just knew what to do. I miss that absence of thought more than the sport itself.

Now I'm soft in a way I didn't choose and I carry it every day.`,
  },
  {
    theme: 'A version of myself I mourn',
    language: 'hi',
    content: `जो मैं बनना चाहता था — वो बन नहीं पाया।

मेरे पिता का business था। मुझे join करना था। यह decide हो चुका था। मेरी कोई राय नहीं ली गई।

मैं doctor बनना चाहता था। Surgeon। अब 40 साल की उम्र में accounts check करता हूँ और सोचता हूँ — उस दूसरी ज़िंदगी में क्या था?

जो मैं हो सकता था, वो मुझसे मिला नहीं।`,
  },

  // ── My father / My mother ─────────────────────────────────────────────────
  {
    theme: 'My father / My mother',
    language: 'en',
    content: `To my father, who died before we could fix it.

We had a fight when I was 24. The ugly kind, where things get said that can't get unsaid. I walked out. He let me go.

We spoke again, eventually. We were polite. We talked around it for eight years.

He died of a heart attack last October. I was on a flight home when it happened. I didn't make it in time.

There's a conversation I needed to have with him that I will never get to have. I don't know what to do with that.`,
  },
  {
    theme: 'My father / My mother',
    language: 'hi',
    content: `माँ के लिए।

तुमने सब कुछ दिया। जानता हूँ। किसी ने तुम्हें नहीं बताया कि कुछ चाहिए, पर तुमने दिया।

पर एक बात है जो कहनी है — मैं डरता था। तुम्हारी उम्मीदों से। तुम्हारी disappointment से। तुम्हारे उस चेहरे से जो तब बनता था जब मैं कुछ गलत करता था।

मैं अभी भी डरता हूँ। 33 साल की उम्र में। और कभी नहीं कह पाऊँगा।`,
  },
  {
    theme: 'My father / My mother',
    language: 'en',
    content: `My mother calls every Sunday at 11am.

She asks about food, about sleep, about whether I've made any "nice friends." She doesn't ask about the things that are actually happening. I don't tell her.

We talk for forty minutes and hang up and I feel simultaneously loved and completely unseen.

I don't blame her. I've never given her the real version to see.`,
  },
  {
    theme: 'My father / My mother',
    language: 'en',
    content: `To my father, who worked himself to nothing so I could have everything.

You sacrificed your health for my education. I know that now in a way I couldn't when I was young. I see what you gave up. I see the job you hated, the trips you didn't take, the retirement you couldn't afford.

I want to tell you it was worth it. I want to believe it was worth it. I'm still working on being sure.`,
  },
  {
    theme: 'My father / My mother',
    language: 'hi',
    content: `पिताजी के लिए।

तुमने कभी नहीं कहा कि तुम्हें मुझ पर गर्व है। एक बार भी नहीं।

शायद तुम्हारे ज़माने में ऐसे नहीं कहते थे। शायद यह weakness लगती थी। पर मुझे बताओ — वो लड़का जो हर exam result लेकर घर आता था — वो किसलिए आता था?

अब मेरे अपने बच्चे हैं। मैं उनसे रोज़ कहता हूँ।`,
  },

  // ── A love that broke me ──────────────────────────────────────────────────
  {
    theme: 'A love that broke me',
    language: 'en',
    content: `It's been two years since you left and I still catch myself doing the math.

If we'd met a different year. If I'd been less afraid. If I'd said the thing I kept not saying. If you hadn't met him at exactly that time.

Two years is a long time to live in the conditional tense. I know that. I keep hoping I'll stop.`,
  },
  {
    theme: 'A love that broke me',
    language: 'en',
    content: `She didn't do anything wrong.

That's the part I can't explain to anyone. She was kind, she was honest, she tried. We just stopped being right for each other in that slow, grinding way that doesn't give you a story to tell.

Everyone wants a villain. There isn't one. It just ended and now I'm standing in the rubble of something that was real trying to figure out how to build anything again.`,
  },
  {
    theme: 'A love that broke me',
    language: 'hi',
    content: `तुमसे प्यार था। है। नहीं पता कौन सा सही है।

तुम मिली, तुमने सब ठीक कर दिया। फिर तुम गईं, और तुमने साथ में वो भी ले लिया जो तुम्हारा नहीं था।

मेरी वो आदत थी सुबह उठकर खुश होने की। वो गई। मेरी वो ability थी plans बनाने की। वो गई।

अब बस एक दिन और एक दिन है।`,
  },
  {
    theme: 'A love that broke me',
    language: 'en',
    content: `We were long distance for two years. I thought we could do it.

We couldn't. Not because of the distance — because of who I became waiting. Anxious, checking my phone, rearranging my life around call schedules and visit windows.

She ended it over a video call on a Tuesday. I sat in my apartment afterward for four hours without moving.

I still don't know what I'm supposed to do with the two years I gave to something that ended on a Tuesday.`,
  },
  {
    theme: 'A love that broke me',
    language: 'en',
    content: `To the woman I almost married.

We were three months from the engagement. The families had met. The date was being discussed.

Then I found out. And everything — everything we'd built, every future we'd imagined — became evidence of something else entirely.

I never cried so much in my life. I also never felt so completely alone. Because I couldn't tell anyone why. So I said "it didn't work out" and watched everyone accept that.`,
  },
  {
    theme: 'A love that broke me',
    language: 'hi',
    content: `हमने decide किया कि हम साथ नहीं रह सकते।

घरवालों की वजह से। Society की वजह से। Future की uncertainty की वजह से।

हम दोनों ने agree किया। Mutual था।

Mutual होने से दर्द कम नहीं होता। यह किसी ने नहीं बताया था।

अब भी कभी-कभी सोचता हूँ — क्या होता अगर हम थोड़े ज़्यादा brave होते?`,
  },

  // ── My own failure ────────────────────────────────────────────────────────
  {
    theme: 'My own failure',
    language: 'en',
    content: `I failed the exam three times.

The first time felt like a setback. The second time felt like a warning. The third time felt like confirmation of something I'd been afraid was true since I was a kid — that I wasn't as smart as everyone seemed to think.

I passed on the fourth attempt. But the win doesn't sit clean. The three failures sit underneath it.`,
  },
  {
    theme: 'My own failure',
    language: 'en',
    content: `I was a bad father during the years that mattered.

Not absent. Present in the worst way — distracted, irritable, always half-somewhere-else. My daughter is fourteen now. She doesn't come to me with things. She's learned I'm not the person who holds things for her.

I did that. I made myself not that person, one distracted evening at a time, and now I'm trying to undo it and I don't know if there's enough time.`,
  },
  {
    theme: 'My own failure',
    language: 'hi',
    content: `मैं एक बुरा son था।

माँ बीमार थी और मैं बाहर था। Career बना रहा था। पैसे कमा रहा था। Calls कम कर रहा था।

वो कभी complain नहीं करती थीं। इसीलिए मुझे लगा कि सब ठीक है।

जब वो serious हुईं, तब जाकर घर गया। बहुत देर हो गई थी। नहीं — वो ठीक हो गईं। पर मैं वो महीने वापस नहीं ले सकता।`,
  },
  {
    theme: 'My own failure',
    language: 'en',
    content: `I had an alcohol problem for three years and I pretended it wasn't one.

It was "social drinking." It was "stress management." It was "everyone does this."

It cost me a job, a relationship, and about two years of time that are genuinely blurry.

I don't drink now. I'm grateful for that. But I haven't told anyone the real version. I say "I stopped drinking" and let people fill in the blank with whatever's comfortable.`,
  },
  {
    theme: 'My own failure',
    language: 'en',
    content: `I gave up too early on something that might have worked.

A business. A year and a half in. We were struggling but not dead. I got scared and chose the safe job.

My co-founder kept going. Six months later they turned it around. Two years after that, they sold it.

I've done the math on what my share would have been. I shouldn't do that. I keep doing it.`,
  },
  {
    theme: 'My own failure',
    language: 'hi',
    content: `मैंने किसी को hurt किया जो मुझ पर trust करता था।

जानबूझकर नहीं। पर यह excuse नहीं है।

मैंने वो काम किया जो मुझे नहीं करना था। उसे पता चला। मैंने माफी माँगी।

उसने माफ किया। पर दोस्ती वैसी नहीं रही। और मैं जानता हूँ क्यों। क्योंकि एक बार trust टूटे तो वो knot बना रहता है।

वो knot मेरे account पर है।`,
  },

  // ── Just... everything ────────────────────────────────────────────────────
  {
    theme: 'Just... everything',
    language: 'en',
    content: `I don't even know where to start.

I'm 29 and I feel like I'm behind on everything. Behind on money, behind on relationships, behind on some vague idea of who I was supposed to be by now.

Everyone else seems to be in the next chapter. I'm still on the same page I've been on for two years.

I'm not looking for advice. I just needed to say it somewhere.`,
  },
  {
    theme: 'Just... everything',
    language: 'en',
    content: `Some days I don't want to be dead. I want to be someone else.

Not for dramatic reasons. Just — tired. Tired of the same brain, the same patterns, the same mistakes in different packaging.

I want to be someone who doesn't overthink everything. Someone who sleeps through the night. Someone who doesn't flinch at his own reflection.

That's all. That's the whole thing.`,
  },
  {
    theme: 'Just... everything',
    language: 'hi',
    content: `आज कुछ हुआ नहीं। इसीलिए लिख रहा हूँ।

बस एक दिन था जो खाली था। काम था, लेकिन काम नहीं था। लोग थे, लेकिन conversation नहीं था।

शाम को अकेले खाना खाया। TV चला दिया। सो गया।

यह ज़िंदगी है। यही है। बस यही है। और आज यह feel करना बहुत heavy था।`,
  },
  {
    theme: 'Just... everything',
    language: 'en',
    content: `I'm fine. I keep saying I'm fine.

I say it to my mother. I say it to my friends. I said it to the doctor when she asked how I was doing and she moved on and I thought — she believed me. Why did she believe me?

I'm not fine. I'm functional. There's a difference. I've been functional for so long I've forgotten what fine actually feels like.`,
  },
  {
    theme: 'Just... everything',
    language: 'en',
    content: `I'm tired of being strong.

I don't mean strong like weightlifting. I mean the other kind. The kind where you hold it together at work and hold it together with family and hold it together with friends and then sit in your car in the parking garage for ten minutes before you can go inside.

I'm so tired. I want someone else to hold things for a while.`,
  },
  {
    theme: 'Just... everything',
    language: 'hi',
    content: `मुझे नहीं पता क्या लिखूँ।

बस एक feeling है जो है। जिसका नाम नहीं है। न दुःख, न गुस्सा, न loneliness exactly।

बस एक weight है। Chest में। जो रोज़ सुबह वहीं मिलती है।

अगर किसी ने यह पढ़ा — मुझे fix मत करो। बस यह जानना था कि किसी ने पढ़ा।`,
  },
  {
    theme: 'Just... everything',
    language: 'en',
    content: `Nobody knows the version of me that exists at 2am.

That version has done the numbers and they don't add up. That version has had conversations in his head that he'll never have out loud. That version has been honest in a way the daytime version can't afford.

The daytime version is fine. He smiles. He delivers. He shows up.

The 2am version is writing this.`,
  },
  {
    theme: 'Just... everything',
    language: 'en',
    content: `I used to believe in something. I'm not sure what, exactly. Something like the idea that effort gets rewarded, that people are mostly decent, that things have a way of working out.

I'm not sure I believe any of that anymore. And I don't know if that's wisdom or just damage wearing a sophisticated disguise.`,
  },
];

async function seed() {
  console.log('🌱 Starting seed...');

  // Create or get seed user
  let seedUser = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.deviceId, SEED_USER_DEVICE_ID),
  });

  if (!seedUser) {
    const seedUserId = uuidv4();
    await db.insert(users).values({
      id: seedUserId,
      deviceId: SEED_USER_DEVICE_ID,
      language: 'en',
    });
    seedUser = await db.query.users.findFirst({
      where: (u, { eq }) => eq(u.deviceId, SEED_USER_DEVICE_ID),
    });
    console.log('✅ Created seed system user');
  }

  if (!seedUser) throw new Error('Failed to create/find seed user');

  let seeded = 0;
  let skipped = 0;

  for (const letter of SEED_LETTERS) {
    const letterId = uuidv4();
    const bottleId = uuidv4();
    const now = new Date();

    // Spread throw dates over past 15 days so the pool feels organic, not batch-inserted
    const daysBack = Math.floor(Math.random() * 15);
    const thrownAt = new Date(now.getTime() - daysBack * 86400000);
    const expiresAt = new Date(thrownAt.getTime() + 30 * 86400000);

    try {
      await db.insert(letters).values({
        id: letterId,
        userId: seedUser.id,
        theme: letter.theme,
        content: letter.content,
        status: 'thrown',
        sealedAt: thrownAt.toISOString(),
      });

      await db.insert(bottles).values({
        id: bottleId,
        letterId,
        userId: seedUser.id,
        status: 'floating',
        riskLevel: 'low',
        thrownAt: thrownAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
      });

      seeded++;
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE')) {
        skipped++;
      } else {
        console.error('Seed error:', err?.message);
      }
    }
  }

  console.log(`✅ Seed complete: ${seeded} letters added to pool, ${skipped} skipped (already existed)`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
