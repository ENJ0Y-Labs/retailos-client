import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://retailos-server.onrender.com/:path*",
      },
    ];
  },
};

export default nextConfig;
