import withImages from "next-images";
import createRemoveImports from "next-remove-imports";
import withPWA from "next-pwa";

const removeImports = createRemoveImports();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@ant-design/icons-svg'],
  i18n: {
    locales: ["id", "en"],
    defaultLocale: "id",
    localeDetection: false,
  },
  images: {
    domains: [
      "192.168.0.109",
      "localhost",
      "pascasarjana-s3.s3.ap-southeast-1.amazonaws.com",
    ],
    disableStaticImages: true,
  },
  distDir: "build",
  staticPageGenerationTimeout: 120,
  experimental: {
    workerThreads: false,
    cpus: 1
  },
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

const withPWAConfig = withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
});

export default withPWAConfig(withImages(removeImports(nextConfig)));