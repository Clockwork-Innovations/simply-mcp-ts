import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable caching in development to prevent stale code issues
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark simply-mcp dependencies as external to prevent bundling
      config.externals = [
        ...(config.externals || []),
        'esbuild',
        '@esbuild/linux-x64',
        '@esbuild/darwin-arm64',
        '@esbuild/darwin-x64',
        '@esbuild/win32-x64',
        // Add a rule to handle dynamic imports better
        ({ context, request }: any, callback: any) => {
          // Let dynamic imports through without bundling them
          if (request && request.startsWith('.')) {
            // Allow relative imports but don't bundle ones from dist
            if (request.includes('/dist/')) {
              return callback(null, `commonjs ${request}`);
            }
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
