import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('TRPC routes', () => {
  it('should keep only the trpc routes used by this deployment', () => {
    const enabledRouteDirs = readdirSync(__dirname, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isDirectory() && existsSync(path.join(__dirname, entry.name, '[trpc]', 'route.ts')),
      )
      .map((entry) => entry.name)
      .sort();

    expect(enabledRouteDirs).toEqual(['async', 'lambda', 'mobile', 'tools']);
  });
});
