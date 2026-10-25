import { describe, expect, it } from 'vitest';

import { isGenerationTypeEnabled } from './deploymentCapabilities';

describe('deployment generation capabilities', () => {
  it('keeps chat and image shortcuts while excluding video creation', () => {
    expect(['chat', 'image', 'video'].filter(isGenerationTypeEnabled)).toEqual(['chat', 'image']);
  });
});
