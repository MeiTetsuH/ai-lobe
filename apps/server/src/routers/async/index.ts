import { asyncRouter as router, publicProcedure } from '@/libs/trpc/async';

import { dataExportRouter } from './dataExport';
import { fileRouter } from './file';
import { imageRouter } from './image';
import { linearRouter } from './linear';
import { musicRouter } from './music';
import { ragEvalRouter } from './ragEval';

export const asyncRouter = router({
  dataExport: dataExportRouter,
  file: fileRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
  image: imageRouter,
  linear: linearRouter,
  music: musicRouter,
  ragEval: ragEvalRouter,
});

export type AsyncRouter = typeof asyncRouter;

export type { UnifiedAsyncCaller } from './caller';
export { createAsyncCaller, createAsyncServerClient } from './caller';
