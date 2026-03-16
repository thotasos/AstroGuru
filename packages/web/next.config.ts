import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:5199/api/:path*' },
    ];
  },
  transpilePackages: ['@parashari/core'],
};

export default nextConfig;
