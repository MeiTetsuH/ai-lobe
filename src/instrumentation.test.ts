import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  database: {},
  ensureRunning: vi.fn().mockResolvedValue(undefined),
  getServerDB: vi.fn(),
  resumeJobs: vi.fn().mockResolvedValue(undefined),
  telemetry: vi.fn(),
}));

vi.mock('@/server/services/gateway', () => ({
  GatewayService: class {
    ensureRunning = mocks.ensureRunning;
  },
}));
vi.mock('@lobechat/database', () => ({ getServerDB: mocks.getServerDB }));
vi.mock('@/business/server/agent-transfer/jobRunner', () => ({
  resumePendingAgentTransferJobs: mocks.resumeJobs,
}));
vi.mock('./libs/debug-file-logger', () => ({}));
vi.mock('./instrumentation.node', () => {
  mocks.telemetry();
  return {};
});

describe('instrumentation startup boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.getServerDB.mockResolvedValue(mocks.database);
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_RUNTIME', 'nodejs');
    vi.stubEnv('DATABASE_URL', 'private-test-value');
    vi.stubEnv('LOBE_VERCEL_BUILD', '0');
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('ENABLE_BOT_IN_DEV', undefined);
    vi.stubEnv('ENABLE_TELEMETRY', undefined);
    vi.stubEnv('ENABLE_TELEMETRY_IN_DEV', undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(['production', undefined])(
    'never starts persistent jobs in a Vercel build with runtime target %s',
    async (runtimeTarget) => {
      vi.stubEnv('LOBE_VERCEL_BUILD', '1');
      vi.stubEnv('VERCEL_ENV', runtimeTarget);
      const { register } = await import('./instrumentation');
      await register();

      expect(mocks.ensureRunning).not.toHaveBeenCalled();
      expect(mocks.getServerDB).not.toHaveBeenCalled();
      expect(mocks.resumeJobs).not.toHaveBeenCalled();
    },
  );

  it('retains the runtime Vercel guard for a non-Vercel build', async () => {
    vi.stubEnv('VERCEL_ENV', 'production');
    const { register } = await import('./instrumentation');
    await register();

    expect(mocks.ensureRunning).not.toHaveBeenCalled();
    expect(mocks.resumeJobs).not.toHaveBeenCalled();
  });

  it('starts persistent jobs in a production Docker process', async () => {
    const { register } = await import('./instrumentation');
    await register();

    expect(mocks.ensureRunning).toHaveBeenCalledOnce();
    await vi.waitFor(() => expect(mocks.resumeJobs).toHaveBeenCalledWith(mocks.database));
  });

  it.each([undefined, '1'])('keeps development bots opt-in: %s', async (optIn) => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ENABLE_BOT_IN_DEV', optIn);
    const { register } = await import('./instrumentation');
    await register();

    expect(mocks.ensureRunning).toHaveBeenCalledTimes(optIn ? 1 : 0);
    await vi.waitFor(() => expect(mocks.resumeJobs).toHaveBeenCalledWith(mocks.database));
  });

  it('retains enabled telemetry in Vercel instrumentation', async () => {
    vi.stubEnv('LOBE_VERCEL_BUILD', '1');
    vi.stubEnv('VERCEL_ENV', 'production');
    vi.stubEnv('ENABLE_TELEMETRY', '1');
    const { register } = await import('./instrumentation');
    await register();

    expect(mocks.telemetry).toHaveBeenCalledOnce();
    expect(mocks.ensureRunning).not.toHaveBeenCalled();
    expect(mocks.resumeJobs).not.toHaveBeenCalled();
  });
});
