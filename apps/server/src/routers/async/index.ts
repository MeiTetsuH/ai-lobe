import { asyncRouter as router, publicProcedure } from '@/libs/trpc/async';

import { fileRouter } from './file';
import { imageRouter } from './image';
import { linearRouter } from './linear';
import { ragEvalRouter } from './ragEval';

export const asyncRouter = router({
  file: fileRouter,
  healthcheck: publicProcedure.query(() => "i'm live!"),
  image: imageRouter,
  linear: linearRouter,
  ragEval: ragEvalRouter,
});

export type AsyncRouter = typeof asyncRouter;

export type { UnifiedAsyncCaller } from './caller';
export { createAsyncCaller, createAsyncServerClient } from './caller';
