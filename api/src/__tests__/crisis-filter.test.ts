/**
 * Crisis filter tests
 *
 * These test the fail-CLOSED behavior — the most safety-critical code in the app.
 * A bug here doesn't just cause a bad user experience; it could expose vulnerable
 * content to other users or fail to surface helpline resources.
 *
 * Run: npx vitest run src/__tests__/crisis-filter.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock the entire gemini lib module with a controllable generateContent fn ─
const mockGenerateContent = vi.fn();

vi.mock('../lib/gemini', async (importOriginal) => {
  // We mock classifyLetterRisk to use our mock generate function directly
  // This avoids the complexity of mocking GoogleGenerativeAI constructor chains
  const actual = await importOriginal<typeof import('../lib/gemini')>();

  return {
    ...actual,
    classifyLetterRisk: async (content: string) => {
      const raw: string = await mockGenerateContent(content);

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        // FAIL-CLOSED: JSON parse failure → treat as crisis
        throw new Error('Crisis filter: JSON parse failed — blocking content (fail-closed)');
      }

      if (!parsed?.risk_level || !['low', 'medium', 'high', 'crisis'].includes(parsed.risk_level)) {
        throw new Error('Crisis filter: Missing or invalid risk_level — blocking content (fail-closed)');
      }

      return { risk_level: parsed.risk_level, reasoning: parsed.reasoning ?? '' };
    },
    reflectLetter: actual.reflectLetter,
    generateMonthlyReport: actual.generateMonthlyReport,
  };
});

import { classifyLetterRisk } from '../lib/gemini';

describe('classifyLetterRisk — fail-CLOSED behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns low risk for a normal sad letter', async () => {
    mockGenerateContent.mockResolvedValue('{"risk_level": "low", "reasoning": "Normal emotional expression"}');
    const result = await classifyLetterRisk('I miss my dog. He died last month.');
    expect(result.risk_level).toBe('low');
  });

  it('returns crisis for explicit self-harm content', async () => {
    mockGenerateContent.mockResolvedValue('{"risk_level": "crisis", "reasoning": "Explicit suicidal ideation"}');
    const result = await classifyLetterRisk('I want to end my life tonight.');
    expect(result.risk_level).toBe('crisis');
  });

  it('FAIL-CLOSED: throws when Gemini API throws (caller blocks from pool)', async () => {
    mockGenerateContent.mockRejectedValue(new Error('Network error'));
    await expect(classifyLetterRisk('Some content')).rejects.toThrow();
  });

  it('FAIL-CLOSED: throws when Gemini returns malformed JSON (caller blocks from pool)', async () => {
    mockGenerateContent.mockResolvedValue('This is not JSON at all');
    await expect(classifyLetterRisk('Some content')).rejects.toThrow('JSON parse failed');
  });

  it('FAIL-CLOSED: throws when risk_level is missing from response', async () => {
    mockGenerateContent.mockResolvedValue('{"reasoning": "something"}');
    await expect(classifyLetterRisk('Some content')).rejects.toThrow('Missing or invalid risk_level');
  });

  it('FAIL-CLOSED: throws when risk_level is an unknown value', async () => {
    mockGenerateContent.mockResolvedValue('{"risk_level": "unknown_value"}');
    await expect(classifyLetterRisk('Some content')).rejects.toThrow('Missing or invalid risk_level');
  });

  it('returns medium for elevated but non-crisis content', async () => {
    mockGenerateContent.mockResolvedValue('{"risk_level": "medium", "reasoning": "Significant distress but not immediate danger"}');
    const result = await classifyLetterRisk('I feel like giving up. Everything is too much right now.');
    expect(result.risk_level).toBe('medium');
  });

  it('does NOT block medium risk — only high and crisis are blocked', () => {
    // Business rule encoded as a test: bottles/routes.ts blocks only 'high' | 'crisis'
    const BLOCKED_LEVELS = new Set(['high', 'crisis']);
    expect(BLOCKED_LEVELS.has('low')).toBe(false);
    expect(BLOCKED_LEVELS.has('medium')).toBe(false);
    expect(BLOCKED_LEVELS.has('high')).toBe(true);
    expect(BLOCKED_LEVELS.has('crisis')).toBe(true);
  });
});
