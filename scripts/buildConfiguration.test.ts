import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

describe('build configuration', () => {
  it('builds the mobile SPA before copying SPA assets', () => {
    const packageJson = JSON.parse(
      readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'),
    );
    const buildRaw = packageJson.scripts['build:raw'];

    expect(buildRaw).toContain('bun run build:spa:mobile');
    expect(buildRaw.indexOf('bun run build:spa:mobile')).toBeLessThan(
      buildRaw.indexOf('bun run build:spa:copy'),
    );
  });
});
