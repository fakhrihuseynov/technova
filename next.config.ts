import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output — copies only the needed files into .next/standalone,
  // making Docker images dramatically smaller (~100 MB vs ~1 GB).
  output: "standalone",
  // Pin the file-tracing root to this project directory to avoid confusion
  // when multiple lockfiles exist in parent directories.
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.ticketmaster.com",
      },
      {
        protocol: "https",
        hostname: "**.ticketweb.com",
      },
      {
        protocol: "https",
        hostname: "s1.ticketm.net",
      },
    ],
  },
};

export default nextConfig;
