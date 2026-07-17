/** @type {import('next').NextConfig} */
const apiBackendOrigin = process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    if (!apiBackendOrigin) return [];
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiBackendOrigin}/api/v1/:path*`,
      },
      {
        source: "/business/:path*",
        destination: `${apiBackendOrigin}/business/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/classification-task",
        destination: "/classification-tasks",
        permanent: true,
      },
      {
        source: "/review-task",
        destination: "/review-tasks",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
