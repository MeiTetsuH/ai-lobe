// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { evalMemoryFixtureSchema } from './evalMemory.schema';

const preference = (title: string, directive: string) => ({
  details: directive,
  memoryCategory: 'health',
  memoryType: 'preference',
  sourceIds: [],
  summary: title,
  tags: ['food'],
  title,
  withPreference: {
    appContext: null,
    conclusionDirectives: directive,
    extractedLabels: [],
    extractedScopes: [],
    originContext: null,
    scorePriority: 1,
    suggestions: [],
    type: 'health',
  },
});

const preferences = (count: number) =>
  Array.from({ length: count }, (_, index) => preference(`p${index}`, `d${index}`));

const parseError = (fixture: unknown): string => {
  const result = evalMemoryFixtureSchema.safeParse(fixture);
  expect(result.success).toBe(false);
  return result.success ? '' : result.error.message;
};

describe('evalMemoryFixtureSchema', () => {
  it('accepts a fixture within the budget', () => {
    const result = evalMemoryFixtureSchema.safeParse({
      persona: { narrative: 'User is allergic to shellfish.', tagline: 'Food restrictions' },
      preferences: preferences(1),
      seededAt: '2024-05-01T12:00:00.000Z',
    });

    expect(result.success).toBe(true);
  });

  /**
   * Regression: zod 4.6.6 stopped running refinements once an earlier check
   * fails, so a single layer longer than its own `.max()` short-circuited the
   * object and reported a bare "too big" message for that field. The aggregate
   * budget is the documented limit, so it must be what callers are told.
   */
  it('reports the entry budget when one layer alone exceeds it', () => {
    expect(parseError({ preferences: preferences(51) })).toContain('50 entries');
  });

  it('counts every layer, and reports the budget before per-layer validation', () => {
    const message = parseError({
      contexts: preferences(30),
      preferences: preferences(30),
    });

    // 30 + 30 exceeds the budget even though neither layer exceeds its own
    // `.max()`, and the budget is reported instead of the per-item errors the
    // preference-shaped `contexts` entries would otherwise produce.
    expect(message).toContain('50 entries');
  });

  it('reports the character budget for an oversized fixture within the entry count', () => {
    const message = parseError({
      persona: { narrative: 'x'.repeat(50_000), tagline: 'y'.repeat(2000) },
      preferences: [preference('big', 'z'.repeat(150_000))],
    });

    expect(message).toContain('200000 characters');
  });

  it('still rejects fixtures that reference account source messages', () => {
    const [entry] = preferences(1);
    const message = parseError({ preferences: [{ ...entry, sourceIds: ['msg_1'] }] });

    expect(message).toContain('cannot reference account source messages');
  });
});
