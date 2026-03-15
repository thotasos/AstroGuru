import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3001/api/:path*' },
    ];
  },
  transpilePackages: ['@parashari/core'],
};

export default nextConfig;
