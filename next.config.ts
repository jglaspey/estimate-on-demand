import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during builds to prevent deployment failures
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Enable TypeScript checking but don't fail on type errors during builds
    ignoreBuildErrors: false,
  },
  experimental: {
    // Enable optimizations
    optimizePackageImports: ['@anthropic-ai/sdk', '@mistralai/mistralai'],
  },
};

export default nextConfig;
