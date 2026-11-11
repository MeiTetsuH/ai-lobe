import fs from 'node:fs';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '..');

describe('private Vercel deployment configuration', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('covers tsconfig path-aliased and canvas-runtime workspace packages in vercel.json installCommand', () => {
    const vercelConfig = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'vercel.json'), 'utf8'),
    ) as { installCommand: string };
    const tsconfig = JSON.parse(fs.readFileSync(path.join(repoRoot, 'tsconfig.json'), 'utf8')) as {
      compilerOptions?: { paths?: Record<string, string[]> };
    };
    const canvasPluginSource = fs.readFileSync(
      path.join(repoRoot, 'plugins/vite/canvasRuntime.ts'),
      'utf8',
    );

    const manifests = new Map<string, { dependencies: string[]; dir: string; name: string }>();
    const registerManifest = (manifestPath: string) => {
      if (!fs.existsSync(manifestPath)) return;
      const pkg = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
        name?: string;
      };
      if (!pkg.name) return;
      manifests.set(pkg.name, {
        dependencies: [
          ...Object.keys(pkg.dependencies ?? {}),
          ...Object.keys(pkg.devDependencies ?? {}),
        ],
        dir: path.relative(repoRoot, path.dirname(manifestPath)).replaceAll('\\', '/'),
        name: pkg.name,
      });
    };

    registerManifest(path.join(repoRoot, 'package.json'));
    for (const group of ['packages', 'apps']) {
      for (const entry of fs.readdirSync(path.join(repoRoot, group), { withFileTypes: true })) {
        if (entry.isDirectory()) {
          registerManifest(path.join(repoRoot, group, entry.name, 'package.json'));
        }
      }
    }

    const roots = [...vercelConfig.installCommand.matchAll(/--filter\s+([^\s.]+)\.\.\./g)].map(
      (match) => match[1],
    );
    const closure = new Set<string>();
    const queue = [...roots];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (closure.has(current)) continue;
      const manifest = manifests.get(current);
      if (!manifest) continue;
      closure.add(current);
      for (const dep of manifest.dependencies) {
        if (manifests.has(dep) && !closure.has(dep)) queue.push(dep);
      }
    }

    const requiredDirs = new Set<string>();
    for (const targets of Object.values(tsconfig.compilerOptions?.paths ?? {})) {
      for (const target of targets) {
        const match = /^\.\/(packages\/[^/]+)\//.exec(target);
        if (match) requiredDirs.add(match[1]);
      }
    }
    for (const match of canvasPluginSource.matchAll(/packages\/([^/'"]+)/g)) {
      requiredDirs.add(`packages/${match[1]}`);
    }

    const byDir = new Map([...manifests.values()].map((item) => [item.dir, item.name]));
    const missingPackages = [...requiredDirs]
      .map((dir) => byDir.get(dir))
      .filter((name): name is string => Boolean(name) && !closure.has(name));

    expect(missingPackages).toEqual([]);
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
