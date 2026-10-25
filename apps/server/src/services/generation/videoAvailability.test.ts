import { describe, expect, it, vi } from 'vitest';

import { assertVideoGenerationEnabled } from './videoAvailability';

describe('video generation deployment boundary', () => {
  it('rejects before any generation work can run', () => {
    const createTask = vi.fn();
    expect(() => {
      assertVideoGenerationEnabled();
      createTask();
    }).toThrow('Video generation is disabled on this deployment.');
    expect(createTask).not.toHaveBeenCalled();
  });
});
