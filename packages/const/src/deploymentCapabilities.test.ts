import { describe, expect, it } from 'vitest';

import { isGenerationTypeEnabled } from './deploymentCapabilities';

describe('deployment generation capabilities', () => {
  it('keeps chat, image, and music shortcuts while excluding video creation', () => {
    expect(['chat', 'image', 'music', 'video'].filter(isGenerationTypeEnabled)).toEqual([
      'chat',
      'image',
      'music',
    ]);
  });
});
