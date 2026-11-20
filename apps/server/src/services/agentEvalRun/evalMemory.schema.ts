import {
  ActivityMemoryItemSchema,
  AddIdentityActionSchema,
  ContextMemoryItemSchema,
  ExperienceMemoryItemSchema,
  PreferenceMemoryItemSchema,
} from '@lobechat/memory-user-memory/schemas';
import type { EvalMemoryFixture } from '@lobechat/types';
import { z } from 'zod';

const MAX_ENTRIES = 50;
const MAX_CHARACTERS = 200_000;
const BUDGET_MESSAGE = `Memory fixture exceeds ${MAX_ENTRIES} entries or ${MAX_CHARACTERS} characters`;

/** Total array entries across every memory layer, plus the serialized size. */
const exceedsBudget = (fixture: unknown): boolean => {
  if (!fixture || typeof fixture !== 'object') return false;

  const count = Object.values(fixture).reduce<number>(
    (total, value) => total + (Array.isArray(value) ? value.length : 0),
    0,
  );

  return count > MAX_ENTRIES || JSON.stringify(fixture).length > MAX_CHARACTERS;
};

const nativeEvalMemoryFixtureSchema = z
  .object({
    activities: z.array(ActivityMemoryItemSchema.strict()).max(50).optional(),
    contexts: z.array(ContextMemoryItemSchema.strict()).max(50).optional(),
    experiences: z.array(ExperienceMemoryItemSchema.strict()).max(50).optional(),
    identities: z.array(AddIdentityActionSchema).max(50).optional(),
    persona: z
      .object({ narrative: z.string().max(50_000), tagline: z.string().max(2000).optional() })
      .strict()
      .optional(),
    preferences: z.array(PreferenceMemoryItemSchema.strict()).max(50).optional(),
    seededAt: z.string().datetime({ offset: true }).optional(),
  })
  .strict()
  .superRefine((fixture, ctx) => {
    if (exceedsBudget(fixture)) {
      ctx.addIssue({ code: 'custom', message: BUDGET_MESSAGE });
    }
    // Account message references cannot be rebound to a new namespace.
    const checkSources = (value: unknown, path: (string | number)[]) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => checkSources(item, [...path, index]));
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          if (
            (key === 'sourceId' || key === 'sourceIds') &&
            item != null &&
            (Array.isArray(item) ? item.length > 0 : item !== '')
          ) {
            ctx.addIssue({
              code: 'custom',
              message: 'Memory fixtures cannot reference account source messages',
              path: [...path, key],
            });
          }
          checkSources(item, [...path, key]);
        }
      }
    };
    checkSources(fixture, []);
  });

/**
 * Keep the shared transport type independent of the Memory schema package
 * (which itself imports @lobechat/types), and validate every nested native
 * input here. The transform's output is the precise native schema type used
 * by the seed service; invalid transport input never reaches execution.
 */
export const evalMemoryFixtureSchema = z.custom<EvalMemoryFixture>().transform((fixture, ctx) => {
  // zod stopped running refinements once an earlier check fails (4.6.6). A layer
  // array longer than its own `.max()` therefore short-circuits the object and
  // the aggregate budget refinement never runs, leaving callers with a bare
  // "too big" message for one field instead of the documented budget. Check the
  // budget before the native parse so that message is always the one reported.
  if (exceedsBudget(fixture)) {
    ctx.addIssue({ code: 'custom', message: BUDGET_MESSAGE });
    return z.NEVER;
  }

  const result = nativeEvalMemoryFixtureSchema.safeParse(fixture);
  if (!result.success) {
    for (const issue of result.error.issues) {
      ctx.addIssue({ code: 'custom', message: issue.message, path: issue.path });
    }
    return z.NEVER;
  }
  return result.data;
});
