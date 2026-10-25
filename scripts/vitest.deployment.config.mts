import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'node',
    include: [
      'apps/server/src/services/generation/videoAvailability.test.ts',
      'packages/const/src/deploymentCapabilities.test.ts',
      'packages/builtin-tools/src/featureGates.test.ts',
      'packages/mecha/src/toolSet/manifestPool.test.ts',
    ],
    maxWorkers: 2,
  },
});
