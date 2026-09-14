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
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: '/games-assets/:all*(svg|jpg|jpeg|png|webp|glb|gltf|ogg|mp3|woff2|json)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

module.exports = withPWA(nextConfig);
