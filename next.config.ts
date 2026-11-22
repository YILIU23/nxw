import type { NextConfig } from 'next';

const config: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  outputFileTracingExcludes: { '*': ['./.data/**', './uploads/**', './backups/**', './.env*', './.local-admin.txt', './.taste-skill/**'] },
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }] }];
  },
};
export default config;
