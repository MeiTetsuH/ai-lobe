import { existsSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('TRPC routes', () => {
  it('should keep only the trpc routes used by this deployment', () => {
    const enabledRouteDirs = ['lambda', 'mobile', 'tools'];

    for (const dir of enabledRouteDirs) {
      const routePath = path.join(__dirname, dir, '[trpc]', 'route.ts');
      expect(existsSync(routePath)).toBe(true);
    }

    expect(existsSync(path.join(__dirname, 'async', '[trpc]', 'route.ts'))).toBe(false);
  });
});
