import type { NextConfig } from "next";

const apiOrigin = (process.env.RETAILOS_API_ORIGIN || "https://retailos-server.onrender.com").replace(/\/$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: apiOrigin + "/:path*",
      },
    ];
  },
};

export default nextConfig;
