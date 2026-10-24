import { describe, expect, it } from 'vitest';

import { asyncRouter } from '../index';

describe('asyncRouter', () => {
  it('exposes the retained async sub-routers without unused video or document routers', () => {
    const keys = Object.keys(asyncRouter._def.record);

    expect(keys).toContain('file');
    expect(keys).toContain('healthcheck');
    expect(keys).toContain('image');
    expect(keys).toContain('ragEval');
    expect(keys).not.toContain('document');
    expect(keys).not.toContain('video');
  });
});
