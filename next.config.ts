import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  async rewrites() {
    const apiUrl =
      process.env.SERVER_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://tbkk.surazense.com";
    return [
      {
        source: "/api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
