// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { asyncRouter } from '../index';

describe('asyncRouter', () => {
  it('should expose only the async procedures required by this deployment', () => {
    expect(Object.keys(asyncRouter._def.procedures).sort()).toEqual([
      'file.embeddingChunks',
      'file.parseFileToChunks',
      'healthcheck',
      'image.createImage',
      'ragEval.runRecordEvaluation',
    ]);
  });
});
