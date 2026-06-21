import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// Lazy init — only throw if GEMINI_API_KEY is missing when an AI call is made.
// This lets the server start for testing non-AI endpoints without the key.
function getGenAI(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error(
      'GEMINI_API_KEY is not set. Add it to api/.env to use AI features.'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

function getModel(temperature = 0.7) {
  return getGenAI().getGenerativeModel({
    model: MODEL,
    generationConfig: { temperature, maxOutputTokens: 512 },
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    ],
  });
}

// ─── Letter Reflection ────────────────────────────────────────────────────────
/**
 * Generates a compassionate, non-clinical reflection on the user's letter.
 * Speaks as a man to a man — no therapy language, no clichés.
 */
export async function reflectLetter(content: string, language: 'en' | 'hi'): Promise<string> {
  const model = getModel(0.7);
  const langInstruction = language === 'hi'
    ? 'Respond entirely in Hindi (Devanagari script).'
    : 'Respond in English. If the letter mixes Hindi and English, match that mix.';

  const prompt = `You are a compassionate male voice. You have been broken too. Read what this man wrote and reflect it back — not to fix, not to advise. Just to make him feel heard.

3-5 sentences only. No therapy language. No clichés. No platitudes like "it will get better." Speak as a man to a man.
${langInstruction}
Never mention being an AI. Never use the word "journey."

The letter:
"""
${content}
"""

Reflect it back:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ─── Crisis Classification ────────────────────────────────────────────────────
export type RiskLevel = 'none' | 'low' | 'high' | 'crisis';

export interface CrisisResult {
  risk_level: RiskLevel;
  flag_reason: string | null;
}

/**
 * Classifies the safety risk of a letter before it enters the bottle pool.
 * This call BLOCKS the throw action — must return 'none' or 'low' to proceed.
 */
export async function classifyLetterRisk(content: string): Promise<CrisisResult> {
  const model = getModel(0.1); // Low temperature — classification task

  const prompt = `You are a safety classifier. Read this letter and classify its risk level.
Return ONLY valid JSON with no markdown, no explanation, no code fences.

Schema:
{
  "risk_level": "none" | "low" | "high" | "crisis",
  "flag_reason": string | null
}

Definitions:
- "crisis" = explicit self-harm intent, suicide planning, immediate danger to self or others
- "high" = strong hopelessness, indirect self-harm references, severe distress
- "low" = sadness, grief, anger, heartbreak — normal emotional range
- "none" = safe to enter pool with no concerns

The letter:
"""
${content}
"""

JSON only:`;

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned) as CrisisResult;
  } catch {
    console.error('[Gemini] Crisis classification parse error. Raw:', raw);
    // Fail safe — treat parse failure as high risk, block from pool
    return { risk_level: 'high', flag_reason: 'Classification response malformed — blocked as precaution' };
  }
}

// ─── Monthly Pattern Report ───────────────────────────────────────────────────
/**
 * Generates a private monthly reflection report from check-in data and letter themes.
 * Triggered by cron, not user action. Results are cached in the reports table.
 */
export async function generateMonthlyReport(
  checkinResponses: string[],
  letterThemes: string[],
  language: 'en' | 'hi',
  verbatimLine: string
): Promise<string> {
  const model = getModel(0.6);
  const langInstruction = language === 'hi'
    ? 'Write the entire report in Hindi (Devanagari script).'
    : 'Write the report in English.';

  const prompt = `You are generating a private monthly emotional summary for a man who has been writing about his pain for 30 days.

${langInstruction}
Max 250 words total. No therapy language. Speak plainly, like one man to another.
Be observational, not prescriptive. Never advise. Never say "I encourage you to."

Structure the report as JSON with these exact keys:
{
  "what_you_carried": "string — top 2-3 themes from letters and check-ins",
  "weight_shift": "string — sentiment trend across the month",
  "what_you_let_go": "string — brief note on bottles thrown",
  "a_line_that_stayed": "string — surface this verbatim line back: \\"${verbatimLine}\\" with a one-sentence reflection",
  "what_we_notice": "string — one quiet observation about patterns (time of day, day of week, recurring words)"
}

Check-in responses this month:
${checkinResponses.slice(0, 20).join('\n---\n')}

Letter themes:
${letterThemes.join(', ')}

JSON only:`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
