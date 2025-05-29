/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable experimental features if needed
  experimental: {
    // instrumentationHook: true, // For background jobs
  },
  
  // Disable strict mode in development to avoid double renders
  reactStrictMode: false,
  
  // Configure image domains if needed
  images: {
    domains: [],
  },

  // Environment variables
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_TYPE: process.env.DATABASE_TYPE || 'sqlite3',
    CRAWL_INTERVAL_MINUTES: process.env.CRAWL_INTERVAL_MINUTES || '60',
    MAX_PAGES_TO_CRAWL: process.env.MAX_PAGES_TO_CRAWL || '10',
    REQUEST_DELAY_MS: process.env.REQUEST_DELAY_MS || '2000',
  },

  // Webpack configuration for database drivers
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'better-sqlite3': 'commonjs better-sqlite3',
        'oracledb': 'commonjs oracledb',
        'pg-query-stream': 'commonjs pg-query-stream',
        'mysql': 'commonjs mysql',
        'mysql2': 'commonjs mysql2',
        'tedious': 'commonjs tedious',
        'sqlite3': 'commonjs sqlite3',
        'pg-native': 'commonjs pg-native',
      });
    }
    return config;
  },
};

export default nextConfig;