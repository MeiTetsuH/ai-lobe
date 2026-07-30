// @vitest-environment node
import { EvalEvaluationStatus } from '@lobechat/types';
import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_RAG_EVAL_MODEL } from '@/const/settings';
import {
  EvalDatasetRecordModel,
  EvalEvaluationModel,
  EvaluationRecordModel,
} from '@/database/models/ragEval';

import { ragEvalRouter } from '../ragEval';

const mocks = vi.hoisted(() => ({
  chat: vi.fn(),
  evalRecordFindById: vi.fn(),
  evalRecordUpdate: vi.fn(),
  evaluationUpdate: vi.fn(),
  initModelRuntimeFromDB: vi.fn(),
}));

vi.mock('@/database/models/chunk', () => ({
  ChunkModel: vi.fn(() => ({})),
}));
vi.mock('@/database/models/embedding', () => ({
  EmbeddingModel: vi.fn(() => ({})),
}));
vi.mock('@/database/models/file', () => ({
  FileModel: vi.fn(() => ({})),
}));
vi.mock('@/database/models/ragEval', () => ({
  EvalDatasetRecordModel: vi.fn(() => ({ findById: vi.fn() })),
  EvalEvaluationModel: vi.fn(() => ({ update: mocks.evaluationUpdate })),
  EvaluationRecordModel: vi.fn(() => ({
    findById: mocks.evalRecordFindById,
    update: mocks.evalRecordUpdate,
  })),
}));
vi.mock('@/server/modules/ModelRuntime', () => ({
  initModelRuntimeFromDB: mocks.initModelRuntimeFromDB,
}));
vi.mock('@/server/services/chunk', () => ({
  ChunkService: vi.fn(() => ({})),
}));

vi.mock('@/libs/trpc/async', async () => {
  const init = await vi.importActual<{ asyncTrpc: any }>('@/libs/trpc/async/init');
  const { asyncTrpc } = init;
  return {
    asyncAuthedProcedure: asyncTrpc.procedure,
    asyncRouter: asyncTrpc.router,
    createAsyncCallerFactory: asyncTrpc.createCallerFactory,
    publicProcedure: asyncTrpc.procedure,
  };
});

describe('ragEvalRouter.runRecordEvaluation', () => {
  const userId = 'user_test';
  const serverDB = {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue([{ workspaceId: 'workspace-1' }]),
        })),
      })),
    })),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.evalRecordFindById.mockResolvedValue(null);
  });

  it('resolves workspaceId from the evaluation record before reading scoped models', async () => {
    const caller = ragEvalRouter.createCaller({ serverDB, userId } as any);

    await expect(caller.runRecordEvaluation({ evalRecordId: 'eval-record-1' })).rejects.toThrow(
      TRPCError,
    );

    expect(EvaluationRecordModel).toHaveBeenCalledWith(serverDB, userId, 'workspace-1');
    expect(EvalEvaluationModel).toHaveBeenCalledWith(serverDB, userId, 'workspace-1');
    expect(EvalDatasetRecordModel).toHaveBeenCalledWith(serverDB, userId, 'workspace-1');
  });

  it('uses Terra for answers even when a pending record contains another model', async () => {
    mocks.evalRecordFindById.mockResolvedValue({
      context: ['retrieved context'],
      datasetRecordId: 'dataset-record-1',
      embeddingModel: 'text-embedding-3-small',
      evaluationId: 'evaluation-1',
      id: 'eval-record-1',
      languageModel: 'another-model',
      question: 'What is LobeHub?',
      questionEmbeddingId: 'embedding-1',
      status: EvalEvaluationStatus.Pending,
    });
    mocks.chat.mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        choices: [{ message: { content: 'A Terra answer' } }],
      }),
    });
    mocks.initModelRuntimeFromDB.mockResolvedValue({ chat: mocks.chat });

    const caller = ragEvalRouter.createCaller({ serverDB, userId } as any);

    await expect(caller.runRecordEvaluation({ evalRecordId: 'eval-record-1' })).resolves.toEqual({
      success: true,
    });

    expect(mocks.chat).toHaveBeenCalledWith(
      expect.objectContaining({ model: DEFAULT_RAG_EVAL_MODEL }),
      expect.anything(),
    );
    expect(mocks.evalRecordUpdate).toHaveBeenCalledWith(
      'eval-record-1',
      expect.objectContaining({
        answer: 'A Terra answer',
        languageModel: DEFAULT_RAG_EVAL_MODEL,
        status: EvalEvaluationStatus.Success,
      }),
    );
  });
});
