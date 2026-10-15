// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createOpenAICompatibleRuntime } from '../../core/openaiCompatibleFactory';
import { LobeOpenAI } from './index';

const payload = {
  dimensions: 1024,
  input: ['Embedding routing regression'],
  model: 'google/gemini-embedding-2',
};

const createRuntime = () => {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ data: [{ embedding: [0.1, 0.2], index: 0 }] }));
  const runtime = new LobeOpenAI({
    apiKey: 'test-key',
    baseURL: 'https://relay.example.test/v1',
    fetch,
  });

  return { fetch, runtime };
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('OpenAI-compatible embedding provider routing', () => {
  it('keeps the original wire payload when routing is not configured', async () => {
    vi.stubEnv('OPENAI_EMBEDDING_PROVIDER_ONLY', undefined);
    const { fetch, runtime } = createRuntime();

    await expect(runtime.embeddings(payload)).resolves.toEqual([[0.1, 0.2]]);

    expect(fetch.mock.calls[0][0].toString()).toBe('https://relay.example.test/v1/embeddings');
    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      ...payload,
      encoding_format: 'float',
    });
  });

  it('restricts providers without changing the model or embedding dimensions', async () => {
    vi.stubEnv('OPENAI_EMBEDDING_PROVIDER_ONLY', ' google-ai-studio , openai ');
    const { fetch, runtime } = createRuntime();

    await runtime.embeddings(payload);

    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      ...payload,
      encoding_format: 'float',
      provider: { allow_fallbacks: false, only: ['google-ai-studio', 'openai'] },
    });
  });

  it('does not add OpenAI routing to another provider using the shared factory', async () => {
    vi.stubEnv('OPENAI_EMBEDDING_PROVIDER_ONLY', 'google-ai-studio');
    const { fetch } = createRuntime();
    const OtherProvider = createOpenAICompatibleRuntime({ provider: 'other-provider' });
    const runtime = new OtherProvider({
      apiKey: 'test-key',
      baseURL: 'https://other.example.test/v1',
      fetch,
    });

    await runtime.embeddings(payload);

    expect(JSON.parse(fetch.mock.calls[0][1]?.body as string)).toEqual({
      ...payload,
      encoding_format: 'float',
    });
  });

  it.each(['', '   ', ',', 'google-ai-studio,', 'google ai studio', '["google-ai-studio"]'])(
    'rejects invalid configured routing %j before making a request',
    async (value) => {
      vi.stubEnv('OPENAI_EMBEDDING_PROVIDER_ONLY', value);
      const { fetch, runtime } = createRuntime();

      await expect(runtime.embeddings(payload)).rejects.toBeDefined();
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
