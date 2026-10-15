import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fileService } from '@/services/file';

import { useBlobFileLoader } from './useBlobFileLoader';
import { useTextFileLoader } from './useTextFileLoader';

vi.mock('@/services/file', () => ({ fileService: { getReadableUrl: vi.fn() } }));

const loadedText = async (
  state: ReturnType<typeof useTextFileLoader> | ReturnType<typeof useBlobFileLoader>,
) => ('fileData' in state ? state.fileData : state.blob?.text());

describe.each([
  ['text', useTextFileLoader],
  ['blob', useBlobFileLoader],
] as const)('%s private file preview', (_name, useLoader) => {
  beforeEach(() => {
    vi.mocked(fileService.getReadableUrl).mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(['/f/file_private', 'https://app.test/f/file_private?preview=1'])(
    'reads %s directly from its authorized storage URL',
    async (url) => {
      const signedUrl = 'https://storage.test/private?sig=1';
      vi.mocked(fileService.getReadableUrl).mockResolvedValue(signedUrl);
      const fetchMock = vi.fn(async (request: string) => {
        if (request !== signedUrl) throw new TypeError('Cross-origin redirect blocked by CORS');
        return new Response('private file content');
      });
      vi.stubGlobal('fetch', fetchMock);
      const { result } = renderHook(() => useLoader(url));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBeNull();
      expect(await loadedText(result.current)).toBe('private file content');
      expect(fileService.getReadableUrl).toHaveBeenCalledWith('file_private');
    },
  );

  it('reports an authorization failure without falling back to the proxy', async () => {
    const error = new Error('Access denied');
    vi.mocked(fileService.getReadableUrl).mockRejectedValue(error);
    const fetchMock = vi.fn().mockResolvedValue(new Response('must not read'));
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useLoader('/f/file_private'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(error);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('does not fetch an obsolete signed URL after switching files', async () => {
    let resolveOld!: (url: string) => void;
    vi.mocked(fileService.getReadableUrl)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce('https://storage.test/new');
    const fetchMock = vi.fn().mockResolvedValue(new Response('new content'));
    vi.stubGlobal('fetch', fetchMock);
    const { result, rerender } = renderHook(({ url }) => useLoader(url), {
      initialProps: { url: '/f/file_old' },
    });

    rerender({ url: '/f/file_new' });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => resolveOld('https://storage.test/old'));

    expect(await loadedText(result.current)).toBe('new content');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://storage.test/new');
  });

  it.each(['blob:local/file', 'data:text/plain,content', 'https://storage.test/direct'])(
    'keeps direct source %s without an authorization lookup',
    async (url) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('direct content')));
      const { result } = renderHook(() => useLoader(url));

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(await loadedText(result.current)).toBe('direct content');
      expect(fileService.getReadableUrl).not.toHaveBeenCalled();
    },
  );
});
