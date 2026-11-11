import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../index';

const memoryHandler = vi.hoisted(() => vi.fn());
const memoryPaths = [
  '/api/webhooks/memory-extraction',
  '/api/webhooks/memory-user-memory/consolidation',
  '/api/webhooks/memory-user-memory/persona/update-writing',
  '/api/webhooks/memory-user-memory/pipelines/extract/chat-topic/cancel',
];

/**
 * These endpoints used to be Next.js route segments, where the directory layout
 * *was* the URL. Now the paths are hand-written strings in the app index and a
 * typo silently 404s a provider callback instead of failing the build, so pin
 * the full mount table.
 *
 * Handlers are mocked out: importing them for real drags in model-runtime and
 * the db clients, which is far more than a routing assertion needs.
 */
vi.mock('../handlers/memoryExtraction', () => ({ memoryExtractionWebhook: memoryHandler }));
vi.mock('../handlers/memoryUserMemoryChatTopicCancel', () => ({
  memoryUserMemoryChatTopicCancel: memoryHandler,
}));
vi.mock('../handlers/memoryUserMemoryConsolidation', () => ({
  memoryUserMemoryConsolidation: memoryHandler,
}));
vi.mock('../handlers/memoryUserMemoryPersonaUpdateWriting', () => ({
  memoryUserMemoryPersonaUpdateWriting: memoryHandler,
}));

describe('webhooks hono routes', () => {
  beforeEach(() => {
    memoryHandler.mockReset();
    memoryHandler.mockImplementation((c) => c.json({ executed: true }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects memory requests before execution when authentication is unconfigured', async () => {
    for (const value of [undefined, '', ' ,invalid,x-empty=']) {
      vi.stubEnv('MEMORY_USER_MEMORY_WEBHOOK_HEADERS', value);

      for (const path of memoryPaths) {
        const response = await app.request(path, { method: 'POST' });

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
          error:
            'Memory webhook authentication is not configured. Set MEMORY_USER_MEMORY_WEBHOOK_HEADERS.',
        });
      }
    }

    expect(memoryHandler).not.toHaveBeenCalled();
  });

  it('requires every configured memory authentication header before execution', async () => {
    vi.stubEnv('MEMORY_USER_MEMORY_WEBHOOK_HEADERS', 'x-memory-secret=secret,x-scheduler=trusted');

    for (const headers of [{}, { 'x-memory-secret': 'wrong' }, { 'x-memory-secret': 'secret' }]) {
      for (const path of memoryPaths) {
        const response = await app.request(path, { headers, method: 'POST' });

        expect(response.status).toBe(403);
      }
    }

    expect(memoryHandler).not.toHaveBeenCalled();
  });

  it('executes memory requests with all configured authentication headers', async () => {
    vi.stubEnv('MEMORY_USER_MEMORY_WEBHOOK_HEADERS', 'x-memory-secret=secret,x-scheduler=trusted');

    for (const path of memoryPaths) {
      const response = await app.request(path, {
        headers: { 'X-Memory-Secret': 'secret', 'x-scheduler': 'trusted' },
        method: 'POST',
      });

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ executed: true });
    }

    expect(memoryHandler).toHaveBeenCalledTimes(memoryPaths.length);
  });

  it('serves only the retained memory pipeline webhooks on Vercel Hobby', () => {
    const paths = app.routes.filter((route) => route.method === 'POST').map((route) => route.path);

    expect([...new Set(paths)].sort()).toEqual([
      '/api/webhooks/memory-extraction',
      '/api/webhooks/memory-user-memory/consolidation',
      '/api/webhooks/memory-user-memory/persona/update-writing',
      '/api/webhooks/memory-user-memory/pipelines/extract/chat-topic/cancel',
    ]);
  });

  it('omits unused GitHub App and Linear GET redirect routes', () => {
    const paths = app.routes.filter((route) => route.method === 'GET').map((route) => route.path);

    expect(paths).toEqual([]);
  });
});
