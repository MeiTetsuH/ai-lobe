'use client';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

import { Flexbox } from '@lobehub/ui';
import { Spin } from '@lobehub/ui/base-ui';
import { Fragment, memo, useCallback, useState } from 'react';

import AsyncError from '@/components/AsyncError';
import { Document, Page, pdfjs } from '@/libs/pdfjs';
import { lambdaQuery } from '@/libs/trpc/client';

import HighlightLayer from './HighlightLayer';
import { styles } from './style';
import { useFetchPDFUrl } from './useFetchPDFUrl';
import useResizeObserver from './useResizeObserver';

const options = {
  cMapUrl: `https://registry.npmmirror.com/pdfjs-dist/${pdfjs.version}/files/cmaps/`,
  standardFontDataUrl: `https://registry.npmmirror.com/pdfjs-dist/${pdfjs.version}/files/standard_fonts/`,
};

const maxWidth = 1200;

export interface PDFViewerProps {
  fileId: string;
  url: string | null;
}

const PDFViewer = memo<PDFViewerProps>(({ url, fileId }) => {
  const readablePDF = useFetchPDFUrl(url);
  const [numPages, setNumPages] = useState<number>(0);
  const [containerRef, setContainerRef] = useState<HTMLElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>();
  const [isLoaded, setIsLoaded] = useState(false);

  const onResize = useCallback<ResizeObserverCallback>((entries) => {
    const [entry] = entries;

    if (entry) {
      setContainerWidth(entry.contentRect.width);
    }
  }, []);

  useResizeObserver(containerRef, onResize);

  const onDocumentLoadSuccess = (document: unknown) => {
    setNumPages((document as { numPages: number }).numPages);
    setIsLoaded(true);
  };

  const { data } = lambdaQuery.chunk.getChunksByFileId.useInfiniteQuery(
    { id: fileId },
    { getNextPageParam: (lastPage) => lastPage.nextCursor },
  );

  const dataSource = data?.pages.flatMap((page) => page.items) || [];

  if (readablePDF.error && !readablePDF.url)
    return (
      <AsyncError
        error={readablePDF.error}
        retrying={readablePDF.isValidating}
        onRetry={() => {
          void readablePDF.mutate();
        }}
      />
    );

  if (readablePDF.isLoading)
    return (
      <Flexbox align={'center'} justify={'center'} padding={24}>
        <Spin size="large" />
      </Flexbox>
    );

  return (
    <Flexbox className={styles.container}>
      <Flexbox
        align={'center'}
        className={styles.documentContainer}
        justify={isLoaded ? undefined : 'center'}
        padding={24}
        ref={setContainerRef}
      >
        <Document
          className={styles.document}
          file={readablePDF.url}
          loading={<Spin size="large" />}
          options={options}
          onLoadSuccess={onDocumentLoadSuccess}
        >
          {Array.from({ length: numPages }, (_, index) => {
            const width = containerWidth ? Math.min(containerWidth, maxWidth) : maxWidth;

            return (
              <Fragment key={`page_${index + 1}`}>
                <Page className={styles.page} pageNumber={index + 1} width={width}>
                  <HighlightLayer dataSource={dataSource} pageNumber={index + 1} width={width} />
                </Page>
              </Fragment>
            );
          })}
        </Document>
      </Flexbox>
    </Flexbox>
  );
});

export default PDFViewer;
