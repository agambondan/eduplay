/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['framer-motion'],
  experimental: {
    turbo: {
      root: __dirname,
    },
  },
};

module.exports = withPWA(nextConfig);
