/** @type {import('next').NextConfig} */
const apiBackendOrigin = process.env.API_BACKEND_ORIGIN?.replace(/\/+$/, "");
const proofspaceBackendOrigin = process.env.PROOFSPACE_BACKEND_ORIGIN?.replace(/\/+$/, "");

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  async rewrites() {
    const rules = [
      {
        source: "/v3/3rd/:path*",
        destination: "/api/wps-demo/:path*",
      },
      {
        source: "/proofspace/v3/3rd/:path*",
        destination: "/api/wps-demo/:path*",
      },
    ];
    if (apiBackendOrigin) {
      rules.push({
        source: "/api/v1/:path*",
        destination: `${apiBackendOrigin}/api/v1/:path*`,
      });
    }
    if (proofspaceBackendOrigin) {
      rules.push({
        source: "/proofspace-api/:path*",
        destination: `${proofspaceBackendOrigin}/:path*`,
      });
    }
    return rules;
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
