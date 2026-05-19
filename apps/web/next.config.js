/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig = {
  reactStrictMode: true,
  // Force webpack for now because next-pwa needs it
  webpack: (config) => {
    return config;
  },
};

module.exports = withPWA(nextConfig);
