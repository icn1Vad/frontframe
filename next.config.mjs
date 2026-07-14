/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
