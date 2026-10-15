import { useClientDataSWR } from '@/libs/swr';
import { fileService } from '@/services/file';

import { fileIdFromProxyUrl } from '../Image/Tools/exportImage';

/** PDF.js must fetch storage directly so its cross-origin request retains Origin. */
export const useFetchPDFUrl = (url: string | null) => {
  const fileId = url ? fileIdFromProxyUrl(url) : undefined;
  const { data, error, isLoading, isValidating, mutate } = useClientDataSWR<string, Error>(
    fileId ? ['file:pdfReadableUrl', fileId, url] : null,
    () => fileService.getReadableUrl(fileId!),
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    },
  );

  return {
    error,
    isLoading,
    isValidating,
    mutate,
    // Never let a pending or rejected authenticated lookup fall back to the redirect.
    url: fileId ? (data ?? null) : url,
  };
};
