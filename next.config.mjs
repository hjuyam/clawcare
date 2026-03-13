/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Playwright E2E uses 127.0.0.1 as baseURL; allow dev-origin access to Next's /_next assets.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
