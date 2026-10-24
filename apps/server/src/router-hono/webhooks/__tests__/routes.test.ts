import { describe, expect, it, vi } from 'vitest';

import app from '../index';

/**
 * These endpoints used to be Next.js route segments, where the directory layout
 * *was* the URL. Now the paths are hand-written strings in the app index and a
 * typo silently 404s a provider callback instead of failing the build, so pin
 * the full mount table.
 *
 * Handlers are mocked out: importing them for real drags in model-runtime and
 * the db clients, which is far more than a routing assertion needs.
 */
vi.mock('../handlers/memoryExtraction', () => ({ memoryExtractionWebhook: vi.fn() }));
vi.mock('../handlers/memoryUserMemoryChatTopicCancel', () => ({
  memoryUserMemoryChatTopicCancel: vi.fn(),
}));
vi.mock('../handlers/memoryUserMemoryPersonaUpdateWriting', () => ({
  memoryUserMemoryPersonaUpdateWriting: vi.fn(),
}));

describe('webhooks hono routes', () => {
  it('serves only the retained memory pipeline webhooks on Vercel Hobby', () => {
    const paths = app.routes.filter((route) => route.method === 'POST').map((route) => route.path);

    expect([...new Set(paths)].sort()).toEqual([
      '/api/webhooks/memory-extraction',
      '/api/webhooks/memory-user-memory/persona/update-writing',
      '/api/webhooks/memory-user-memory/pipelines/extract/chat-topic/cancel',
    ]);
  });

  it('omits unused GitHub App GET redirect routes', () => {
    const paths = app.routes.filter((route) => route.method === 'GET').map((route) => route.path);

    expect(paths).toEqual([]);
  });
});
