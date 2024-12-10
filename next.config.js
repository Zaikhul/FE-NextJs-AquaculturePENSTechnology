// const withImages = require("next-images");
// const removeImports = require("next-remove-imports")();
// const withTM = require("next-transpile-modules")([]);
// const withPWA = require("next-pwa")({
//   dest: "public",
//   disable: false,
// });

// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
//   i18n: {
//     locales: ["id", "en"],
//     defaultLocale: "id",
//     localeDetection: false,
//   },
//   images: {
//     domains: [
//       "192.168.0.109",
//       "localhost",
//       "pascasarjana-s3.s3.ap-southeast-1.amazonaws.com",
//     ],
//     disableStaticImages: true,
//   },
//   distDir: "build",
// };

// // Menggabungkan semua plugin
// module.exports = withPWA(withTM(withImages(removeImports(nextConfig))));


/** @type {import('next').NextConfig} */
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",

  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 24 * 60 * 60 // 24 hours
        }
      }
    }
  ]
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: [
      "192.168.0.109",
      "localhost",
      "pascasarjana-s3.s3.ap-southeast-1.amazonaws.com",
    ],
  },
  distDir: "build",
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  webpack: (config, { dev, isServer }) => {
    // Optimize production builds
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        mergeDuplicateChunks: true,
        minimize: true,
        splitChunks: {
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000,
        }
      }
    }
    return config
  },
};

module.exports = withPWA(nextConfig);
