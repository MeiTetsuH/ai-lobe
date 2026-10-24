import { defineConfig } from './src/libs/next/config/define-config';

const isVercel = !!process.env.VERCEL_ENV;

const vercelConfig = {
  // Vercel serverless optimization: exclude musl binaries from all routes
  // Vercel uses Amazon Linux (glibc), not Alpine Linux (musl)
  // This saves ~16MB (sharp-musl) per serverless function
  outputFileTracingExcludes: {
    '*': [
      'node_modules/.pnpm/@img+sharp-libvips-*musl*',
      // Exclude SPA/desktop/mobile build artifacts from serverless functions
      'public/_spa/**',
      'public/_spa-auth/**',
      'public/_spa-share/**',
      'public/_spa-workbench/**',
      'dist/desktop/**',
      'dist/mobile/**',
      'dist/auth/**',
      'dist/share/**',
      'dist/workbench/**',
      'apps/desktop/**',
      'packages/database/migrations/**',
    ],
  },
};
const nextConfig = defineConfig({
  ...(isVercel ? vercelConfig : {}),
  // Inline only this non-secret target flag so Docker startup imports can be
  // removed from Vercel instrumentation without changing runtime env semantics.
  env: { LOBE_VERCEL_BUILD: isVercel ? '1' : '0' },
  headers: [
    {
      headers: [{ key: 'x-robots-tag', value: 'noindex, nofollow' }],
      source: '/:path*',
    },
  ],
});

export default nextConfig;
