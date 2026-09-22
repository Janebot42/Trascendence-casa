import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  experimental: {
    // Avoid generating editor-specific agent instruction files during dev.
    agentRules: false,
  },
  ...(process.env.NODE_ENV === 'development' ? {
    async rewrites() {
      return [{
        source: '/api/:path*',
        destination: 'http://127.0.0.1:3000/:path*',
      }];
    },
  } : {}),
};

export default nextConfig;
