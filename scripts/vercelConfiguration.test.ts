import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('private Vercel deployment configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it.each([
    ['production', '1'],
    ['preview', '1'],
    [undefined, '0'],
  ])('inlines only the build target for %s', async (target, expected) => {
    vi.stubEnv('VERCEL_ENV', target);
    vi.stubEnv('DATABASE_URL', 'private-test-value');
    const { default: config } = await import('../next.config');

    expect(config.env).toEqual({ LOBE_VERCEL_BUILD: expected });
  });

  it('keeps application responses out of search indexes', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const { default: config } = await import('../next.config');
    const rules = await config.headers!();
    const globalRules = rules.filter((rule) => rule.source === '/:path*');

    expect(globalRules.at(-1)?.headers).toContainEqual({
      key: 'x-robots-tag',
      value: 'noindex, nofollow',
    });
  });

  it('keeps CDN assets out of functions without excluding runtime source', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const { default: config } = await import('../next.config');
    const patterns = config.outputFileTracingExcludes?.['*'] ?? [];
    const excluded = (file: string) => patterns.some((pattern) => path.matchesGlob(file, pattern));

    for (const surface of ['_spa', '_spa-auth', '_spa-share', '_spa-workbench']) {
      expect(excluded(`public/${surface}/assets/entry.js`)).toBe(true);
    }
    for (const surface of ['desktop', 'mobile', 'auth', 'share', 'workbench']) {
      expect(excluded(`dist/${surface}/assets/entry.js`)).toBe(true);
    }
    expect(
      excluded('node_modules/.pnpm/ffmpeg-static@5.3.0/node_modules/ffmpeg-static/ffmpeg'),
    ).toBe(true);
    expect(excluded('apps/server/src/services/file/index.ts')).toBe(false);
    expect(excluded('src/app/spa-share/shareHtmlTemplate.ts')).toBe(false);
  });
});
