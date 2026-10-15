import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fileService } from '@/services/file';

import { useFetchPDFUrl } from './useFetchPDFUrl';

vi.mock('@/services/file', () => ({ fileService: { getReadableUrl: vi.fn() } }));

const wrapper = ({ children }: PropsWithChildren) =>
  createElement(SWRConfig, { value: { provider: () => new Map() } }, children);

describe('useFetchPDFUrl', () => {
  beforeEach(() => {
    vi.mocked(fileService.getReadableUrl).mockReset();
  });
  afterEach(() => vi.restoreAllMocks());

  it('waits for the authenticated storage URL instead of giving PDF.js a redirect', async () => {
    vi.mocked(fileService.getReadableUrl).mockResolvedValue(
      'https://storage.test/report.pdf?sig=1',
    );
    const { result } = renderHook(() => useFetchPDFUrl('/f/file_report'), { wrapper });

    expect(result.current.url).toBeNull();
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.url).toBe('https://storage.test/report.pdf?sig=1'));
    expect(fileService.getReadableUrl).toHaveBeenCalledWith('file_report');
  });

  it('resolves absolute application proxy URLs', async () => {
    vi.mocked(fileService.getReadableUrl).mockResolvedValue(
      'https://storage.test/report.pdf?sig=2',
    );
    const { result } = renderHook(
      () => useFetchPDFUrl('https://app.test/f/file_report?preview=1'),
      { wrapper },
    );

    await waitFor(() => expect(result.current.url).toBe('https://storage.test/report.pdf?sig=2'));
  });

  it.each([
    null,
    'blob:local/pdf',
    'data:application/pdf;base64,JVBER',
    'https://storage.test/a.pdf',
  ])('keeps non-proxy source %s without an authenticated lookup', (url) => {
    const { result } = renderHook(() => useFetchPDFUrl(url), { wrapper });
    expect(result.current.url).toBe(url);
    expect(result.current.isLoading).toBe(false);
    expect(fileService.getReadableUrl).not.toHaveBeenCalled();
  });

  it('surfaces access failures without falling back to the public proxy and allows retry', async () => {
    const error = new Error('Access denied');
    vi.mocked(fileService.getReadableUrl).mockRejectedValueOnce(error);
    const { result } = renderHook(() => useFetchPDFUrl('/f/file_private'), { wrapper });

    await waitFor(() => expect(result.current.error).toBe(error));
    expect(result.current.url).toBeNull();
    expect(result.current.isLoading).toBe(false);

    vi.mocked(fileService.getReadableUrl).mockResolvedValueOnce('https://storage.test/private.pdf');
    await act(async () => {
      await result.current.mutate();
    });
    expect(result.current.url).toBe('https://storage.test/private.pdf');
    expect(result.current.error).toBeUndefined();
  });

  it('does not show a previous PDF or accept a stale lookup after navigation', async () => {
    let resolveFirst!: (url: string) => void;
    vi.mocked(fileService.getReadableUrl)
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValueOnce('https://storage.test/new.pdf');
    const { result, rerender } = renderHook(({ url }) => useFetchPDFUrl(url), {
      initialProps: { url: '/f/file_old' },
      wrapper,
    });

    rerender({ url: '/f/file_new' });
    expect(result.current.url).toBeNull();
    await waitFor(() => expect(result.current.url).toBe('https://storage.test/new.pdf'));
    await act(async () => {
      resolveFirst('https://storage.test/old.pdf');
    });
    expect(result.current.url).toBe('https://storage.test/new.pdf');
  });
});
